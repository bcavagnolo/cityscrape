var express = require('express');
var mongojs = require('mongojs');
var compression = require('compression');
var morgan  = require('morgan');

var HttpError = function(message, options) {
  Error.call(this);
  this.status = options.status || 500;
  this.message = message || '';
}
HttpError.prototype.__proto__ = Error.prototype;

module.exports = function(config) {

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

  app.get('/', function(req, res) {
    res.send('Welcome to the cityscrape API.');
  });

  app.get('/api/:apiKey/sales', function(req, res, next) {
    var operators = [
      {$project: {date: 1, price: 1, id: "$_id", _id: 0}},
      {$sort: {date: -1}},
      {$limit: 50}
    ];
    db.saleEvents.aggregate(operators, function(err, sales) {
      if (err) {
        return next(err);
      }
      res.send(sales);
    });
  });

  app.use(function (err, req, res, next) {
    err.status = err.status || 500;
    res.writeHead(err.status, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({message: err.message}));
  });

  return app;
}
