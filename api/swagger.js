var express = require('express');

module.exports = function() {

  var app = express();

  var addVersions = function(o) {
    o.apiVersion = '0.1';
    o.swaggerVersion = '1.2';
    return o;
  };

  var resourceListing = addVersions({
    apis: [
      {
        path: '/sales',
        description: 'Retrieve property sales.'
      },
    ],
    info: {
      title: 'Cityscrape API',
      description: 'Welcome to the cityscrape API, a collection of scraped city data.'
    }
  });

  var homeSales = addVersions({
    basePath: 'cityscrape',
    resourcePath: '/sales',
    produces: [
      'application/json'
    ],
    apis: [
      {
        path: '/api/{apiKey}/sales',
        operations: [
          {
            method: 'GET',
            notes: 'The home sales are gathered from http://www.sfgate.com/webdb/homesales.',
            summary: 'Retrieve a list of home sales',
            type: 'Order',
            nickname: 'getSales',
            parameters: [
              {
                name: 'apiKey',
                description: 'your API key',
                required: true,
                type: 'string',
                paramType: 'path'
              },
              {
                name: 'limit',
                description: 'maximum number of sales to retrieve',
                type: 'string',
                paramType: 'query'
              }
            ],
            responseMessages: [
              {
                code: 400,
                message: 'Invalid argument (e.g., bad limit)'
              }
            ]
          }
        ]
      }
    ],
    models: {
      sale: {
        id: 'sale',
        properties: {
          id: {
            type: 'string',
          },
          price: {
            type: 'float',
            description: 'sale price in US dollars'
          },
          date: {
            type: 'string',
            format: 'date'
          }
        }
      }
    }
  });

  var apis = {
    sales: homeSales
  };

  app.get('/', function(req, res, next) {
    res.send(resourceListing);
  });

  app.param('apiSpec', function(req, res, next, apiSpec) {
    req.apiSpec = apiSpec;
    return next();
  });

  app.get('/:apiSpec', function(req, res, next) {
    res.send(apis[req.apiSpec]);
  });

  return app;
};