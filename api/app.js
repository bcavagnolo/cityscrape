var express = require('express');
var mongojs = require('mongojs');
var compression = require('compression');
var morgan  = require('morgan');
var winston = require('winston');
var swagger = require('./swagger')();
var moment = require('moment');
var url = require('url');

var HttpError = function(message, options) {
  Error.call(this);
  this.status = options.status || 500;
  this.message = message || '';
}
HttpError.prototype.__proto__ = Error.prototype;

module.exports = function(config) {

  var DEFAULTS = {
    LIMIT: 50
  };
  var DATE_FORMAT = 'YYYY-MM-DD';

  var app = express();
  var db = mongojs.connect(config.db, ['properties', 'saleEvents']);

  app.use(morgan());
  app.use(compression());

  app.param('apiKey', function(req, res, next, apiKey) {
    if (apiKey != config.secret) {
      return next(new HttpError('Not Authorized', {status: 401}));
    }
    return next();
  });

  var nonNegativeIntParser = function(paramName, defaultValue) {
    defaultValue = defaultValue || 0;

    return function(req, res, next) {
      if (!req.query.hasOwnProperty(paramName)) {
        req.query[paramName] = defaultValue;
        return next();
      }
      req.query[paramName] = parseInt(req.query[paramName]);
      if (isNaN(req.query[paramName]) || req.query[paramName] < 0) {
        return next(new HttpError(paramName + ' must be a positive integer',
                                  {status: 400}));
      }
      next();
    };
  };

  // handle limit parameter
  app.use(nonNegativeIntParser('limit', DEFAULTS.LIMIT));

  // handle offset parameter
  app.use(nonNegativeIntParser('offset'));

  // handle date parameters
  var parseDate = function(paramName, req, res, next) {
    var date = req.query[paramName];
    if (date && !moment(date, [DATE_FORMAT]).isValid()) {
      return next(new HttpError(paramName + ' ' + req.query.startDate +
                                ' should be of the the format ' + DATE_FORMAT,
                                {status: 400}));
    }
    return next();
  };

  app.use(function(req, res, next) {
    return parseDate('startDate', req, res, next);
  });

  app.use(function(req, res, next) {
    return parseDate('endDate', req, res, next);
  });

  app.use(function(req, res, next) {
    if (req.query.startDate && req.query.endDate &&
        req.query.startDate > req.query.endDate) {
      return next(new HttpError('startDate must be less than or equal to endDate',
                                {status: 400}));
    }
    next();
  });

  app.get('/', function(req, res) {
    res.send('Welcome to the cityscrape API.');
  });

  var clone = function(obj) {
    if (null == obj || "object" != typeof obj) {
      return obj;
    }
    var copy = obj.constructor();
    for (var attr in obj) {
      if (obj.hasOwnProperty(attr)) {
        copy[attr] = obj[attr];
      }
    }
    return copy;
  }

  var getUrlParts = function(req) {
    var parts = url.parse(req.originalUrl, true);
    parts.query.offset = parseInt(parts.query.offset) || 0;
    parts.query.limit = parseInt(parts.query.limit) || DEFAULTS.LIMIT;

    return {
      protocol: req.protocol,
      host: req.get('host'),
      pathname: parts.pathname,
      query: clone(parts.query)
    };
  };

  var calculateNextLink = function(req, count) {
    var parts = getUrlParts(req);
    var remaining = count - parts.query.offset;
    if (remaining <= parts.query.limit) {
      return null;
    }
    parts.query.offset += parts.query.limit;
    return url.format(parts);
  };

  var calculatePreviousLink = function(req) {
    var parts = getUrlParts(req);
    if (!parts.query.offset) {
      return null;
    }
    parts.query.offset -= parts.query.limit;
    if (parts.query.offset <= 0) {
      delete parts.query.offset;
    }
    return url.format(parts);
  };

  app.get('/api/:apiKey/sales', function(req, res, next) {
    var operators = [];

    if (req.query.startDate && req.query.endDate) {
      operators.push({$match: {date: {$gte: req.query.startDate, $lte: req.query.endDate}}});
    } else if (req.query.startDate) {
      operators.push({$match: {date: {$gte: req.query.startDate}}});
    } else if (req.query.endDate) {
      operators.push({$match: {date: {$lte: req.query.endDate}}});
    }
    operators.push({$group: {_id: null, count: {$sum: 1}}});

    // first get the record count
    db.saleEvents.aggregate(operators, function(err, count) {
      if (err) {
        return next(err);
      }

      // ...then get the data
      operators.pop();
      operators.push({$project: {date: 1, price: 1, id: "$_id", _id: 0}});
      operators.push({$sort: {date: -1}});
      operators.push({$skip: req.query.offset});
      operators.push({$limit: req.query.limit});

      var count = count[0].count;
      var next = calculateNextLink(req, count);
      var previous = calculatePreviousLink(req);

      db.saleEvents.aggregate(operators, function(err, sales) {
        if (err) {
          return next(err);
        }
        res.send({
          count: count,
          next: next,
          previous: previous,
          results: sales
        });
      });
    });
  });

  app.use('/api-docs', swagger);

  app.use(function (err, req, res, next) {
    err.status = err.status || 500;
    res.writeHead(err.status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({message: err.message}));
    if (err.status === 500) {
      winston.error('500 Failure: ', err.stack);
    }
  });

  return app;
}
