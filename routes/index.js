var Regression = require('../regression');
var config = require('../config.json');
var express = require('express');
var fs = require('fs');
var path = require('path');
var util = require('util');
var router = express.Router();

var groupRegressions = (data) => {
  if (!data) {
    return Promise.reject(new Error('No data received'));
  }
  var device = data.device;
  var branch = data.branch;
  var memory = data.memory;
  var results = data.results;
  var groups = {};
  var promises = [];

  Object
    .keys(results)
    .forEach(key => {
      var regressionsForApp = results[key];

      if (!regressionsForApp) {
        return;
      }

      regressionsForApp.forEach(base => {
        base.device = device;
        base.branch = branch;
        base.memory = memory;
        var regression = new Regression(base, key);

        if (regression.hasImproved()) {
          return;
        }

        var promise = regression
          .hasReported()
          .then(reported => {
            if (reported) {
              return;
            }

            if (!groups[regression.time]) {
              groups[regression.time] = [];
            }

            groups[regression.time].push(regression);
            return regression.remember();
          });

        promises.push(promise);
      });
    });

  return Promise
    .all(promises)
    .then(() => groups);
};

var reportSingle = regression => regression.report();

var reportGroup = (group) => {
  var first = group[0];

  first.component = 'Performance';
  first.apps = group.reduce((accumulator, regression) => {
    var value = (regression.newavg - regression.oldavg).toFixed(2);
    return accumulator + regression.appName + ': ' + value + 'ms\n';
  }, '');

  return Regression.reportMetaBug(first);
};

var reportRegressions = (groups) => {
  var keys = Object.keys(groups);

  if (!keys.length) {
    return Promise.resolve();
  }

  var promises = keys.map(key => {
    var group = groups[key];

    if (group.length === 1) {
      return reportSingle(group[0]);
    }

    return reportGroup(group);
  });

  console.log(promises.length);
  console.log(promises);

  return Promise.all(promises);
};

router.post('/', (request, response) => {
  groupRegressions(request.body)
    .then(reportRegressions)
    .then(() => response.json({ success: true }))
    .catch(err => {
      console.log(err.stack);
      response.status(500).json(err);
    });
});

module.exports = router;