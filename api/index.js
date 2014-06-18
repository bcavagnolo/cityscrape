#!/usr/bin/env node
var winston = require('winston');

DEFAULT_PORT = 3000;
DEFAULT_DB = 'cityscrape';
DEFAULT_SECRET = 'TEST';

var opts = require("nomnom")
  .option('database', {
    abbr: 'd',
    help: 'database URL (e.g., ' + DEFAULT_DB + ').',
    default: DEFAULT_DB
  })
  .option('port', {
    abbr: 'p',
    help: 'port to run on (default is ' + DEFAULT_PORT + ')',
    default: DEFAULT_PORT
  })
  .option('secret', {
    abbr: 's',
    help: 'authentication secret (default is ' + DEFAULT_SECRET + '.',
    default: DEFAULT_SECRET
  })
  .parse();

require('./app')({
  db: opts.database,
  secret: opts.secret
}).listen(opts.port);

winston.info('Listening on port ' + opts.port);
