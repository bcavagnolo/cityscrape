#!/usr/bin/env node

var request = require('request');
var url = require('url');
var cheerio = require('cheerio');
var $;

sessionFormOptions = {
  url: 'http://b2.caspio.com/dp.asp',
  method: 'POST',
  form: {
    AppKey: '92721000j2d3c7i6g4c7a4c5i9e2',
    ComparisonType1_1: null,
    MatchNull1_1: 'N',
    Value1_1: null,
    ComparisonType2_1: null,
    MatchNull2_1: 'N',
    Value2_1: null,
    ComparisonType3_1: null,
    MatchNull3_1: 'N',
    Value3_1: null,
    ComparisonType4_1: 'LIKE',
    MatchNull4_1: 'N',
    Value4_1: null,
    FieldName1: 'County',
    Operator1: 'OR',
    NumCriteriaDetails1: 1,
    FieldName2: 'City',
    Operator2: 'OR',
    NumCriteriaDetails2: 1,
    FieldName3: 'Zip',
    Operator3: 'OR',
    NumCriteriaDetails3: 1,
    FieldName4: 'Price_Range',
    Operator4: 'OR',
    NumCriteriaDetails4: 1,
    FieldName5: 'HTML+Block+1',
    Operator5: null,
    NumCriteriaDetails5: 1,
    PageID: 2,
    GlobalOperator: 'AND',
    NumCriteria: 5,
    Search: 1,
    PrevPageID: 1,
    pathname: 'http://www.sfgate.com/webdb/homesales/'
  }
}

function _parseSessionId(rawUrl) {
  parsedUrl = url.parse(rawUrl, true);
  if(!parsedUrl.query.hasOwnProperty('appSession')) {
    throw new Error('session URL does not have an appSession');
  }
  return parsedUrl.query['appSession'];
}

function getSessionId(success) {
  console.log('fetching session id...');
  request(sessionFormOptions, function (error, response, body) {
    if (error) {
      throw new Error('Failed to get new session' + error);
    }
    if (response.statusCode !== 302) {
      throw new Error('Expected 302 when getting session but got ' +
                      response.statusCode);
    }
    if (!response.headers.hasOwnProperty('location')) {
      throw new Error('Session response has no location.');
    }
    sessionId = _parseSessionId(response.headers['location']);
    if (success) {
      success(sessionId);
    } else {
      console.log('got session id ' + sessionId);
    }
  });
}

function htmlifyDataPage(rawPage) {
  var headerPattern = 'document.write(';
  var header = rawPage.substring(0, headerPattern.length);
  var end = rawPage.length - 2; // truncate the ); on the end

  if(header !== headerPattern) {
    throw new Error('Failed to find header in raw data page');
  }
  rawPage = rawPage.substring(headerPattern.length, end);
  rawPage = rawPage.replace(/\\"/g, '"')
    .replace(/\\n/g, '')
    .replace(/scr"\+"ipt/g, 'script');
  return rawPage;
}

var EXPECTED_HEADER = ['County', 'Address', 'City', 'ZIP', 'Sale date',
                       'Sale price'];
var OUTPUT_KEYS = ['county', 'address', 'city', 'zipcode', 'date', 'price'];

function checkHeader(row) {
  var expectedHeader = EXPECTED_HEADER.join();
  var actualHeader = '';
  var header = $(row).find('td a');
  for (var i=0; i<header.length; i++) {
    if (i !== 0) {
      actualHeader += ',';
    }
    actualHeader += $(header[i]).html();
  }
  if (expectedHeader !== actualHeader) {
    throw new Error('Got unexpected headers from data page: ' + header);
  }
}

function parseSales(rows, success) {
  checkHeader(rows[0]);
  dataRows = rows.slice(1);
  console.log('found ' + dataRows.length + ' data rows');
  sales = [];
  for (var i=0; i<dataRows.length; i++) {
    row = dataRows[i];
    cells = $(row).find('td');
    if (cells.length < OUTPUT_KEYS.length) {
      throw new Error('Expected at least ' + OUTPUT_KEYS.length +
                      ' data cells. Found ' + cells.length + '.');
    }
    sale = {};
    for (var j=0; j<OUTPUT_KEYS.length; j++) {
      sale[OUTPUT_KEYS[j]] = $(cells[j]).html();
    }
    sales.push(sale);
  }
  if (success) {
    success(sales);
  } else {
    console.log(sales);
  }
}

function scrapePropertySales(rawPage, success) {
  htmlPage = htmlifyDataPage(rawPage);
  $ = cheerio.load(htmlPage);
  var rows = $('table[name="cbTable"] tr');
  parseSales(rows, success);
}

function getDataPage(success) {

  getSessionId(function (sessionId) {

    var dataPageOptions = {
      // NB: all of the query variables are in the url here because the service
      // wants this non-standard &?appSession thing that node seems to munge
      // up.
      url: 'http://b2.caspio.com/dp.asp?AppKey=92721000j2d3c7i6g4c7a4c5i9e2' +
        '&js=true&cbb=914&pathname=http://www.sfgate.com/webdb/homesales/&?' +
        'appSession=' + sessionId
    }

    console.log('getting data page...');
    request(dataPageOptions, function (error, response, body) {
      if (error) {
        throw new Error('Failed to get data page: ' + error);
      }
      if (response.statusCode !== 200) {
        throw new Error('Expected 200 when getting data page but got ' +
                        response.statusCode);
      }
      scrapePropertySales(body, success);
    });
  });
}

if (require.main === module)
  getDataPage();
