var Datastore = require('nedb');
var path = require('path');

var db = new Datastore({
  filename: './alerts.db',
  autoload: true,
  inMemoryOnly: false
});

module.exports = db;
