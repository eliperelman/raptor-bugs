var Datastore = require('nedb');
var path = require('path');

var db = new Datastore({
  filename: path.resolve(__dirname, '../alerts.db'),
  autoload: true
});

module.exports = db;