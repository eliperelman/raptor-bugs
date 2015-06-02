var pg = require('pg');

module.exports = new pg.Client(process.env.DATABASE_URL);