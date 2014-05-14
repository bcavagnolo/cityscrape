var request = require('request');
var url = require('url');

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

getSessionId();
