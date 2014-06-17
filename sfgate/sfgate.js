#!/usr/bin/env node
var PageScraper = require('./salesPage').PageScraper;
var winston = require('winston');
var async = require('async');
var _ = require("underscore");

// scraped pages go into the pageQueue. These are broken up into individual
// sales events, transformed, and pushed into the salesQueue.
var pageQueue = async.queue(transformPage);

function transformPage(page, callback) {
  winston.info('transforming page ' + page.number + '.');
  var INTEGER_FIELDS = ['bedrooms', 'squareFeet', 'lotSize', 'recordId'];
  var saleEvent;
  var property;
  for (var i=0; i<page.sales.length; i++) {
    sale = page.sales[i];
    saleEvent = new Object();
    property = new Object();

    saleEvent.date = d=new Date(sale.date).toISOString().split('T')[0]
    saleEvent.price = parseFloat(sale.price.replace(/[\$,]/g, ''));
    saleEvent.source = 'sfgate';
    saleEvent.sourceId = parseInt(sale.recordId);

    property.address = sale.address;
    property.city = sale.city;
    property.postalCode = sale.zipcode;
    property.bedrooms = parseInt(sale.bedrooms);
    property.residentialArea = parseInt(sale.squareFeet);
    property.parcelArea = parseInt(sale.lotSize);

    salesQueue.push({property: property, saleEvent: saleEvent, page: page});
  }
  callback && callback();
}

// sales are taken from the sales queue and stored in the database.
var salesQueue = async.queue(storeSale);
function storeSale(sale, callback) {
  winston.info('storing sale ' + sale.saleEvent.sourceId + ' from page ' +
               sale.page.number + '.');
  callback && callback();
}

function parsePageNumbers(rawPageNumbers) {
  if (!rawPageNumbers) {
    return null;
  } else if (rawPageNumbers.match(/\d+\-\d+/)) {
    var parts = rawPageNumbers.split('-');
    var start = parseInt(parts[0]);
    var end = parseInt(parts[1]);
    if (start >= end) {
      throw {
        name: 'InvalidArgument',
        message: 'start must be less than end'
      }
    }
    return _.range(start, end);
  } else if (rawPageNumbers.match(/\d+/)) {
    return [parseInt(rawPageNumbers)];
  } else {
    throw {
      name: 'InvalidArgument',
      message: 'failed to parse page number range: ' + rawPageNumbers
    }
  }
}

if (require.main === module) {
  var opts = require("nomnom")
    .option('quiet', {
      abbr: 'q',
      flag: true,
      help: 'Do not spit out logging info to console'
    })
    .option('html', {
      abbr: 'H',
      flag: true,
      help: 'Dump scraped HTML instead of json'
    })
    .option('pages', {
      abbr: 'p',
      type: 'string',
      help: 'Page numbers to fetch. Default is all. You can specify a single ' +
        'page (e.g., 2) or a range of pages (e.g., 1-4).'
    })
    .option('concurrency', {
      abbr: 'c',
      help: 'maximum concurrency to use. Default is the browser-like 4.',
      default: 4,
      callback: function(c) {
        if (c != parseInt(c)) {
          return "concurrencty must be an integer";
        }
      }
    })
    .parse();
  winston.cli();
  if (opts.quiet) {
      winston.remove(winston.transports.Console);
  }

  var pageNumbers = parsePageNumbers(opts.pages);
  var pageHandler = function(page) {
    if (opts.html) {
      var html = require("html");
      htmlPage = html.prettyPrint(page.rawHtml, {indent_size: 2});
      console.log(htmlPage);
    } else {
      pageQueue.push(page);
    }
  }

  var scraperOptions = {
    callback: pageHandler,
    pageNumbers: pageNumbers,
    maxConcurrency: opts.concurrency
  }
  var scraper = new PageScraper(scraperOptions);
  scraper.run();
}
