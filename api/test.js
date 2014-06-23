var supertest = require('supertest');
var mongojs = require('mongojs');
var should = require('should');
var url = require('url');

TEST_DB_NAME = 'do_not_name_a_real_db_this_name';

var makeRequest = function() {
  app = require('./app')({
    secret: 'TEST',
    db: TEST_DB_NAME,
  });
  return supertest(app);
};

var prepareDatabase = function(data, done) {
  var db = mongojs.connect(TEST_DB_NAME, ['properties', 'saleEvents']);
  db.dropDatabase();
  db.saleEvents.insert(data.saleEvents, function() {
    db.close();
    done();
  });
}

describe('retrieving a basic list of sales', function() {

  before(function(done) {
    myData = {
      saleEvents: [
        {"_id" : 0, "date" : "2014-06-04", "price" : 595000, "source" : "sfgate", "sourceId" : 488757, "propertyId" : 100},
        {"_id" : 1, "date" : "2014-06-04", "price" : 1110000, "source" : "sfgate", "sourceId" : 488768, "propertyId" : 101},
        {"_id" : 2, "date" : "2014-06-04", "price" : 370000, "source" : "sfgate", "sourceId" : 488704, "propertyId" : 102},
        {"_id" : 3, "date" : "2014-06-04", "price" : 1336500, "source" : "sfgate", "sourceId" : 488775, "propertyId" : 103},
        {"_id" : 4, "date" : "2014-06-04", "price" : 681000, "source" : "sfgate", "sourceId" : 488708, "propertyId" : 104},
        {"_id" : 5, "date" : "2014-06-04", "price" : 530000, "source" : "sfgate", "sourceId" : 488712, "propertyId" : 105},
        {"_id" : 6, "date" : "2014-06-04", "price" : 771000, "source" : "sfgate", "sourceId" : 488789, "propertyId" : 106},
        {"_id" : 7, "date" : "2014-06-04", "price" : 550000, "source" : "sfgate", "sourceId" : 488755, "propertyId" : 107},
        {"_id" : 8, "date" : "2014-06-04", "price" : 700000, "source" : "sfgate", "sourceId" : 488766, "propertyId" : 108},
        {"_id" : 9, "date" : "2014-06-04", "price" : 722000, "source" : "sfgate", "sourceId" : 488761, "propertyId" : 109}
      ]
    };
    prepareDatabase(myData, done);
  });

  beforeEach(function() {
    request = makeRequest();
  });

  it('retrieves the collection of sales', function(done) {
    request.get('/api/TEST/sales')
      .expect(200)
      .expect(function(res) {
        res.body.results.length.should.equal(myData.saleEvents.length);
      })
      .end(done);
  });

  it('limits the number of results', function(done) {
    request.get('/api/TEST/sales?limit=2')
      .expect(200)
      .expect(function(res) {
        res.body.results.length.should.equal(2);
      })
      .end(done);
  });

  it('fails on negative limit', function(done) {
    request.get('/api/TEST/sales?limit=-2')
      .expect(400)
      .end(done);
  });

  it('fails with incorrect API key', function(done) {
    request.get('/api/FOO/sales')
      .expect(401, done);
  });

});

var linearDateData = {
  saleEvents: [
    {"_id" : 0, "date" : "2014-06-04", "price" : 595000, "source" : "sfgate", "sourceId" : 488757, "propertyId" : 100},
    {"_id" : 1, "date" : "2014-06-03", "price" : 1110000, "source" : "sfgate", "sourceId" : 488768, "propertyId" : 101},
    {"_id" : 2, "date" : "2014-06-02", "price" : 370000, "source" : "sfgate", "sourceId" : 488704, "propertyId" : 102},
    {"_id" : 3, "date" : "2014-06-01", "price" : 1336500, "source" : "sfgate", "sourceId" : 488775, "propertyId" : 103},
    {"_id" : 4, "date" : "2014-05-31", "price" : 681000, "source" : "sfgate", "sourceId" : 488708, "propertyId" : 104},
    {"_id" : 5, "date" : "2014-05-30", "price" : 530000, "source" : "sfgate", "sourceId" : 488712, "propertyId" : 105},
    {"_id" : 6, "date" : "2014-05-29", "price" : 771000, "source" : "sfgate", "sourceId" : 488789, "propertyId" : 106},
    {"_id" : 7, "date" : "2014-05-28", "price" : 550000, "source" : "sfgate", "sourceId" : 488755, "propertyId" : 107},
    {"_id" : 8, "date" : "2014-05-27", "price" : 700000, "source" : "sfgate", "sourceId" : 488766, "propertyId" : 108},
    {"_id" : 9, "date" : "2014-05-26", "price" : 722000, "source" : "sfgate", "sourceId" : 488761, "propertyId" : 109}
  ]
};

describe('retrieving sales by date', function() {

  before(function(done) {
    prepareDatabase(linearDateData, done);
  });

  beforeEach(function() {
    request = makeRequest();
  });

  it('fails on malformed start date', function(done) {
    request.get('/api/TEST/sales?startDate=abcd')
      .expect(400)
      .end(done);
  });

  it('fails on malformed end date', function(done) {
    request.get('/api/TEST/sales?endDate=x-y-z')
      .expect(400)
      .end(done);
  });

  it('fails on invalid date interval', function(done) {
    request.get('/api/TEST/sales?startDate=2014-06-05&endDate=2014-06-04')
      .expect(400)
      .end(done);
  });

  it('respects the startDate parameter', function(done) {
    request.get('/api/TEST/sales?startDate=2014-06-03')
      .expect(200)
      .expect(function(res) {
        res.body.results.length.should.equal(2);
        res.body.results[0].date.should.equal('2014-06-04');
        res.body.results[1].date.should.equal('2014-06-03');
      })
      .end(done);
  });

  it('respects the endDate parameter', function(done) {
    request.get('/api/TEST/sales?endDate=2014-05-27')
      .expect(200)
      .expect(function(res) {
        res.body.results.length.should.equal(2);
        res.body.results[0].date.should.equal('2014-05-27');
        res.body.results[1].date.should.equal('2014-05-26');
      })
      .end(done);
  });

  it('respects a date interval', function(done) {
    request.get('/api/TEST/sales?startDate=2014-05-29&endDate=2014-06-01')
      .expect(200)
      .expect(function(res) {
        res.body.results.length.should.equal(4);
        res.body.results[0].date.should.equal('2014-06-01');
        res.body.results[1].date.should.equal('2014-05-31');
        res.body.results[2].date.should.equal('2014-05-30');
        res.body.results[3].date.should.equal('2014-05-29');
      })
      .end(done);
  });

});

describe('sales pagination', function() {

  before(function(done) {
    prepareDatabase(linearDateData, done);
  });

  beforeEach(function() {
    request = makeRequest();
  });

  it('fails on non-integer offset', function(done) {
    request.get('/api/TEST/sales?offset=a')
      .expect(400)
      .end(done);
  });

  it('fails on negative offset', function(done) {
    request.get('/api/TEST/sales?offset=-2')
      .expect(400)
      .end(done);
  });

  it('has correct first-page next, prev, and count', function(done) {
    request.get('/api/TEST/sales?limit=3')
      .expect(200)
      .expect(function(res) {
        res.body.results.length.should.equal(3);
        res.body.results[0].id.should.equal(0);
        res.body.results[1].id.should.equal(1);
        res.body.results[2].id.should.equal(2);
        res.body.count.should.equal(linearDateData.saleEvents.length);

        res.body.next.should.be.ok;
        var next = url.parse(res.body.next, true);
        next.query.offset.should.equal('3');
        next.query.limit.should.equal('3');
        res.body.should.have.property('previous');
        (res.body.previous === null).should.be.true;
      })
      .end(done);
  });

  it('has correct second-page next, prev, and count', function(done) {
    request.get('/api/TEST/sales?limit=3&offset=3')
      .expect(200)
      .expect(function(res) {
        res.body.results.length.should.equal(3);
        res.body.results[0].id.should.equal(3);
        res.body.results[1].id.should.equal(4);
        res.body.results[2].id.should.equal(5);
        res.body.count.should.equal(linearDateData.saleEvents.length);

        res.body.next.should.be.ok;
        res.body.previous.should.be.ok;
        var next = url.parse(res.body.next, true);
        var previous = url.parse(res.body.previous, true);
        next.query.offset.should.equal('6');
        next.query.limit.should.equal('3');
        previous.query.should.not.have.property('offset');
        next.query.limit.should.equal('3');
      })
      .end(done);
  });

  it('has correct final page next, prev, and count', function(done) {
    request.get('/api/TEST/sales?limit=3&offset=8')
      .expect(200)
      .expect(function(res) {
        res.body.results.length.should.equal(2);
        res.body.results[0].id.should.equal(8);
        res.body.results[1].id.should.equal(9);
        res.body.count.should.equal(linearDateData.saleEvents.length);

        res.body.should.have.property('next');
        (res.body.next === null).should.be.true;

        res.body.previous.should.be.ok;
        var previous = url.parse(res.body.previous, true);
        previous.query.offset.should.equal('5');
        previous.query.limit.should.equal('3');
      })
      .end(done);
  });

});
