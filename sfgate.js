#!/usr/bin/env node

var request = require('request');
var url = require('url');
var cheerio = require('cheerio');
var winston = require('winston');
var $;

sessionFormOptions = {
  url: 'http://b2.caspio.com/dp.asp',
  method: 'POST',
  form: {
    AppKey: '92721000j2d3c7i6g4c7a4c5i9e2',
    ComparisonType1_1: '=',
    MatchNull1_1: 'N',
    Value1_1: '',
    ComparisonType2_1: '=',
    MatchNull2_1: 'N',
    Value2_1: '',
    ComparisonType3_1: '=',
    MatchNull3_1: 'N',
    Value3_1: '',
    ComparisonType4_1: 'LIKE',
    MatchNull4_1: 'N',
    Value4_1: '',
    FieldName1: 'County',
    Operator1: 'OR',
    NumCriteriaDetails1: '1',
    FieldName2: 'City',
    Operator2: 'OR',
    NumCriteriaDetails2: '1',
    FieldName3: 'Zip',
    Operator3: 'OR',
    NumCriteriaDetails3: '1',
    FieldName4: 'Price_Range',
    Operator4: 'OR',
    NumCriteriaDetails4: '1',
    FieldName5: 'HTML Block 1',
    Operator5: '',
    NumCriteriaDetails5: '1',
    PageID: '2',
    GlobalOperator: 'AND',
    NumCriteria: '5',
    Search: '1',
    PrevPageID: '1'
  },
  headers: {
    Cookie: 'cbParamList=; AppKey=92721000j2d3c7i6g4c7a4c5i9e2',
    Origin: 'http://b2.caspio.com',
    Referer: 'http://b2.caspio.com/dp.asp?AppKey=92721000j2d3c7i6g4c7a4c5i9e2',
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}

function handlePage(error, response, rawHtml, success) {
  if (error) {
    throw new Error('Failed to fetch first page: ' + error);
  }
  if (response.statusCode !== 200) {
    throw new Error('Expected 200 when getting first page but got ' +
                    response.statusCode);
  }
  success && success(new SalesPage(rawHtml));
}

function getFirstPage(success) {
  winston.info('fetching first page...');
  request(sessionFormOptions, function(error, response, rawHtml) {
    handlePage(error, response, rawHtml, success);
  });
}

function getPage(pageNumber, success) {
  getFirstPage(function(page) {
    if (pageNumber === 1) {
      success && success(page);
      return;
    }
    desiredPage = page.linkTemplate.replace(/cpipage=\d+/,
                                            'cpipage=' + pageNumber);
    var generalPageOptions = {
      url: 'http://b2.caspio.com/' + desiredPage,
      Cookie: 'cbParamList=; AppKey=92721000j2d3c7i6g4c7a4c5i9e2'
    }
    request(generalPageOptions, function(error, response, rawHtml) {
      handlePage(error, response, rawHtml, success);
    });
  });
}

function SalesPage(rawHtml) {

  this.EXPECTED_HEADER = ['County', 'Address', 'City', 'ZIP', 'Sale date',
                          'Sale price'];
  this.OUTPUT_KEYS = ['county', 'address', 'city', 'zipcode', 'date', 'price'];

  this.rawHtml = rawHtml;
  this.$ = cheerio.load(this.rawHtml);
  this.rows = this.$('table[name="cbTable"] tr');
  this.header = this.rows[0];
  this.checkHeader();
  this.dataRows = this.rows.slice(1);
  this.parseSales();
  this.parseLinks();
}

SalesPage.prototype.checkHeader = function() {
  var expectedHeader = this.EXPECTED_HEADER.join();
  var actualHeader = '';
  var header = this.$(this.header).find('td a');
  for (var i=0; i<header.length; i++) {
    if (i !== 0) {
      actualHeader += ',';
    }
    actualHeader += this.$(header[i]).html();
  }
  if (expectedHeader !== actualHeader) {
    throw new Error('Got unexpected headers from data page: ' + header);
  }
}

SalesPage.prototype.parseSales = function() {
  winston.info('found ' + this.dataRows.length + ' data rows');
  this.sales = [];
  for (var i=0; i<this.dataRows.length; i++) {
    row = this.dataRows[i];
    cells = this.$(row).find('td');
    if (cells.length < this.OUTPUT_KEYS.length) {
      throw new Error('Expected at least ' + this.OUTPUT_KEYS.length +
                      ' data cells. Found ' + cells.length + '.');
    }
    sale = {};
    for (var j=0; j<this.OUTPUT_KEYS.length; j++) {
      sale[this.OUTPUT_KEYS[j]] = this.$(cells[j]).html();
    }
    this.sales.push(sale);
  }

  winston.info('found sales.');
}

SalesPage.prototype.parseLinks = function() {
  var link = this.$('table.cbResultSetNavigationCell tr td a')[0];
  this.linkTemplate = link.attribs.href;
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
  if (opts.html) {
    var html = require("html");
    getPage(opts.page, function (page) {
      htmlPage = html.prettyPrint(page.rawHtml, {indent_size: 2});
      console.log(htmlPage);
    });
  } else {
    getPage(opts.page, function (page) {
      console.log(page.sales);
    });
  }
}