var pg = require('pg');

var query = function(query, values) {
  return new Promise((resolve, reject) => {
    pg.connect(process.env.DATABASE_URL, (err, client, done) => {
      if (err) {
        done();
        return reject(err);
      }

      var args = [query];

      if (values) {
        args.push(values);
      }

      args.push((err, result) => {
        done();

        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });

      client.query.apply(client, args);
    });
  });
};

module.exports = query;