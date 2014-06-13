#!/usr/bin/env node
var PageScraper = require('./salesPage').PageScraper;
var winston = require('winston');
var async = require('async');

function transformPage(page, success) {
  var INTEGER_FIELDS = ['bedrooms', 'squareFeet', 'lotSize', 'recordId'];
  for (var i=0; i<page.sales.length; i++) {
    sale = page.sales[i];
    sale['date'] = new Date(sale['date']);
    sale['price'] = parseFloat(sale['price'].replace(/[\$,]/g, ''));
    for (var j=0; j<INTEGER_FIELDS.length; j++) {
      var f = INTEGER_FIELDS[j];
      sale[f] = parseInt(sale[f]);
    }
  }
  success && success(page);
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
    .option('page', {
      abbr: 'p',
      help: 'Page number to fetch. Default is 1, the first page.',
      default: 1,
      callback: function(page) {
        if (page != parseInt(page))
          return "page must be an integer";
      }
    })
    .parse();
  winston.cli();
  if (opts.quiet) {
      winston.remove(winston.transports.Console);
  }

  var pageQueue = async.queue(transformPage);
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
    pageNumber: opts.page
  }
  var scraper = new PageScraper(scraperOptions);
  scraper.run();
}
