var bz = require('bz');

var client = bz.createClient({
  url: process.env.BZ_URL,
  username: process.env.BZ_USERNAME,
  password: process.env.BZ_PASSWORD,
  timeout: 30 * 1000
});

module.exports = client;