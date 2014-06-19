var supertest = require('supertest');
var data = require('./testdata');
var mongojs = require('mongojs');
var should = require('should');

TEST_DB_NAME = 'do_not_name_a_real_db_this_name';

describe('retrieve sales from cityscrape rest api server', function() {

  before(function(done) {
    var db = mongojs.connect(TEST_DB_NAME, ['properties', 'saleEvents']);
    db.dropDatabase();
    db.saleEvents.insert(data.saleEvents, function() {
      db.close();
      done();
    });
  });

  beforeEach(function() {
    app = require('./app')({
      secret: 'TEST',
      db: TEST_DB_NAME,
    });
    request = supertest(app);
  });

  it('retrieves the collection of sales', function(done) {
    request.get('/api/TEST/sales')
      .expect(200)
      .expect(function(res) {
        res.body.length.should.equal(data.saleEvents.length);
      })
      .end(done);
  });

  it('limits the number of results', function(done) {
    request.get('/api/TEST/sales?limit=2')
      .expect(200)
      .expect(function(res) {
        res.body.length.should.equal(2);
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
