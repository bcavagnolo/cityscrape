var express = require('express');
var mongojs = require('mongojs');
var compression = require('compression');
var morgan  = require('morgan');
var winston = require('winston');
var swagger = require('./swagger')();
var moment = require('moment');

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

  // handle limit parameter
  app.use(function(req, res, next) {
    if (!req.query.hasOwnProperty('limit')) {
      req.query.limit = DEFAULTS.LIMIT;
      return next();
    }
    req.query.limit = parseInt(req.query.limit);
    if (req.query.limit === NaN || req.query.limit < 0) {
      return next(new HttpError('limit must be a positive integer',
                                {status: 400}));
    }
    next();
  });

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

  app.get('/api/:apiKey/sales', function(req, res, next) {
    var operators = [
      {$project: {date: 1, price: 1, id: "$_id", _id: 0}}
    ];

    if (req.query.startDate && req.query.endDate) {
      operators.push({$match: {date: {$gte: req.query.startDate, $lte: req.query.endDate}}});
    } else if (req.query.startDate) {
      operators.push({$match: {date: {$gte: req.query.startDate}}});
    } else if (req.query.endDate) {
      operators.push({$match: {date: {$lte: req.query.endDate}}});
    }

    operators.push({$sort: {date: -1}});
    operators.push({$limit: req.query.limit});

    db.saleEvents.aggregate(operators, function(err, sales) {
      if (err) {
        return next(err);
      }
      res.send(sales);
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
