var request = require('request');
var url = require('url');
var cheerio = require('cheerio');
var winston = require('winston');
var async = require('async');
var _ = require("underscore");

function PageScraper(options) {

  this.options = options;
  this.callback = options.callback || function () {};
  this.pageNumbers = options.pageNumbers || [];
  this.maxConcurrency = options.maxConcurrency || 4;

  this.RECORDS_PER_PAGE = 25;
  this.SESSION_FORM_OPTIONS = {
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
}

PageScraper.prototype.readPage = function(error, response, rawHtml) {
  if (error) {
    throw new Error('Failed to fetch first page: ' + error);
  }
  if (response.statusCode !== 200) {
    throw new Error('Expected 200 when getting first page but got ' +
                    response.statusCode);
  }
  return new SalesPage(rawHtml);
}

PageScraper.prototype.getFirstPage = function(callback) {
  var self = this;

  winston.info('fetching first page...');
  request(this.SESSION_FORM_OPTIONS, function(error, response, rawHtml) {
    winston.info('reading first page');
    page = self.readPage(error, response, rawHtml);
    callback && callback(page);
  });
}

PageScraper.prototype.getPage = function(pageNumber, callback) {
  var self = this;
  var callback = callback || self.callback
  winston.info('fetching page ' + pageNumber + '.');
  desiredPage = this.linkTemplate.replace(/cpipage=\d+/,
                                            'cpipage=' + pageNumber);
  var generalPageOptions = {
    url: 'http://b2.caspio.com/' + desiredPage,
    Cookie: 'cbParamList=; AppKey=92721000j2d3c7i6g4c7a4c5i9e2'
  }
  request(generalPageOptions, function(error, response, rawHtml) {
    winston.info('reading page ' + pageNumber + '.');
    var page = self.readPage(error, response, rawHtml);
    page.number = pageNumber;
    callback(page);
  });
}

PageScraper.prototype.run = function() {
  var self = this;

  // We must always fetch the first page to learn the URL format
  this.getFirstPage(function(page) {
    var pageTasks = [];
    var maxPage;
    var indexOfOne = self.pageNumbers.indexOf(1);
    page.number = 1;
    if (indexOfOne !== -1 || !self.pageNumbers.length) {
      self.callback(page);
    }
    if (indexOfOne !== -1) {
      self.pageNumbers.splice(indexOfOne, 1);
      if (self.pageNumbers.length === 0) {
        return;
      }
    }
    self.linkTemplate = page.linkTemplate;

    maxPage = Math.ceil(page.recordCount/self.RECORDS_PER_PAGE);
    self.pageNumbers = self.pageNumbers.length ? self.pageNumbers : _.range(2, maxPage + 1);
    // Now launch em
    function makePageFunction(pageNumber, callback) {
      winston.info('creating page ' + pageNumber + ' task.');
      var pageFunction = function(callback) {
        self.getPage(pageNumber, function(page) {
          // alert the user with the page and async
          self.callback(page);
          callback(null, page);
        });
      };
      callback(null, pageFunction);
    }
    function launchPageFunctions(err, pageFunctions) {
      async.parallelLimit(pageFunctions, self.maxConcurrency,
                          function(err, results) {
                            if (err) {
                              console.log(err);
                            }
                          });
    }
    async.map(self.pageNumbers, makePageFunction, launchPageFunctions);
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
  this.parseRecordCount();
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
    this.parseHiddenData(cells[this.OUTPUT_KEYS.length], sale);
    this.parseRecordId(cells[this.OUTPUT_KEYS.length + 1], sale);
    this.sales.push(sale);
  }
}

SalesPage.prototype.parseLinks = function() {
  var link = this.$('table.cbResultSetNavigationCell tr td a')[0];
  this.linkTemplate = link.attribs.href;
}

SalesPage.prototype.parseHiddenData = function(hiddenCell, sale) {
  var INPUT_FIELDS = ['Bedrooms', 'Square feet', 'Lot size'];
  var OUTPUT_FIELDS = ['bedrooms', 'squareFeet', 'lotSize'];
  var IGNORE_FIELDS = ['Sales price', 'Address', 'Sales date'];
  var hidden = this.$(hiddenCell);
  for (var i=0; i<OUTPUT_FIELDS.length; i++) {
    sale[OUTPUT_FIELDS[i]] = null;
  }
  if (!hidden) {
    winston.warn('Failed to find hidden data for ' + sale['address']);
    return;
  }
  hiddenDivs = hidden.find('div[id^=icon] font');
  if (!hiddenDivs || hiddenDivs.length != 1) {
    winston.warn('Found ' + hiddenDivs.length + ' hidden divs for ' +
                 sale['address'] + ' but only expected 1');
  }
  var kvs = this.$(hiddenDivs[0]).html().split('<br>');
  for (var i=0; i<kvs.length; i++) {
    var kv = kvs[i].trim();
    if (kv.indexOf(':') === -1) {
      winston.warn('Found hidden data without colon: ' + kv);
      continue;
    }
    var parts = kv.split(':');
    if (parts.length !== 2) {
      winston.warn('Found hidden data too many parts: ' + kv);
    }
    var key = parts[0].trim();
    var value = parts[1].trim();
    if (IGNORE_FIELDS.indexOf(key) !== -1) {
      continue;
    }
    if (INPUT_FIELDS.indexOf(key) === -1) {
      winston.warn('Found unexpected hidden data field: ' + kv);
      continue;
    }
    sale[OUTPUT_FIELDS[INPUT_FIELDS.indexOf(key)]] = value;
  }
}

SalesPage.prototype.parseRecordId = function(detailCell, sale) {
  var detail = this.$(detailCell);
  sale['recordId'] = null;
  if (!detail) {
    winston.warn('Failed to find detail cell for ' + sale['address']);
    return;
  }
  var detailLink = this.$(detail).find('a');
  if (!detailLink || detailLink.length != 1) {
    winston.warn('Found ' + detailLink.length + ' detail links for ' +
                 sale['address'] + ' but only expected 1');
  }
  detailLink = detailLink[0].attribs.href;
  detailQuery = url.parse(detailLink, true).query;
  if (!detailQuery.hasOwnProperty('RecordID')) {
    winston.warn('Detail link does not contain a RecordID');
    return;
  }
  sale['recordId'] = detailQuery['RecordID'];
}

SalesPage.prototype.parseRecordCount = function() {
  var regex = /<td colspan="3">Records \d+-\d+ of (\d+)<\/td>/;
  var match = regex.exec(this.rawHtml);
  this.recordCount = parseInt(match[1]);
}

exports.PageScraper = PageScraper;
