var config = require('../config.json');
var db = require('../db');
var bugzilla = require('../bugzilla');

const ONE_DAY = 1000 * 60 * 60 * 24;
const BZ_PRODUCT = 'Firefox OS';
const BZ_KEYWORDS = ['perf', 'regression'];
const BZ_OPERATING_SYSTEM = 'Gonk (Firefox OS)';
const BZ_PLATFORM = 'ARM';
const BZ_SEVERITY = 'major';
const BZ_VERSION = 'unspecified';
const BZ_CC_LIST = config.cc;

var Regression = function(props, appKey) {
  var app = config.apps[appKey];
  var regression = this;

  Object
    .keys(props)
    .forEach(key => regression[key] = props[key]);

  this.appIndex = app[0];
  this.appName = app[1];
  this.component = app[2];
  this.keywords = BZ_KEYWORDS;
  this.op_sys = BZ_OPERATING_SYSTEM;
  this.platform = BZ_PLATFORM;
  this.product = BZ_PRODUCT;
  this.severity = BZ_SEVERITY;
  this.version = BZ_VERSION;
  this.time = this.push_timestamp * 1000;
  this.timeDate = new Date(this.time);
  this.from = this.time - ONE_DAY;
  this.to = this.time + ONE_DAY;
};

Regression.prototype.hasImproved = function() {
  return this.newavg < this.oldavg;
};

Regression.prototype.remember = function() {
  var regression = this;

  return new Promise((resolve, reject) => {
    db.connect(err => {
      if (err) {
        return reject(err);
      }

      db.query('insert into pg_regressions (timestamp, appName, device, branch, memory) values ($1, $2, $3, $4, $5)', [
        regression.push_timestamp,
        regression.appName,
        regression.device,
        regression.branch,
        regression.memory
      ], function(err, result) {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      })
    });
  });
};

Regression.prototype.hasReported = function() {
  var regression = this;

  return new Promise((resolve, reject) => {
    db.connect(err => {
      if (err) {
        return reject(err);
      }

      client.query(`select * from pg_regressions where timestamp='${regression.push_timestamp}' and appName='${regression.appName}' and device='${regression.device}' and branch='${regression.branch}' and memory=${regression.memory}`, (err, result) => {
        if (err || result.rows[0]) {
          reject(err);
        } else {
          db.end();
          resolve();
        }
      });
    });
  });
};

Regression.prototype.report = function() {
  var nowString = new Date().toDateString();

  if (!this.url) {
    this.url = `http://raptor.mozilla.org/#/dashboard/script/mark.js?device=${this.device}&branch=${this.branch}&memory=${this.memory}&suite=coldlaunch&to=${this.to}&from=${this.from}&panelId=${this.appIndex}&fullscreen`;
  }

  if (!this.summary) {
    this.summary = `Performance regression in ${this.appName}`;
  }

  console.log(this.summary);

  if (!this.description) {
    this.description = `On ${nowString}, Raptor detected a possible regression in ${this.appName}:

Device: ${this.device}
Memory: ${this.memory}
Branch: ${this.branch}
Time: ${this.timeDate}

---

Old Average: ${this.oldavg.toFixed(3)}ms
New Average: ${this.newavg.toFixed(3)}ms
Regression: ${(this.newavg - this.oldavg).toFixed(2)}ms

Confidence level of this being legitimate regression: ${this.confidence.toFixed(2)}

---

Gaia revision: ${this.gaia_revision}
Previous Gaia revision: ${this.prev_gaia_revision}

Gecko revision: ${this.gecko_revision}
Previous Gecko revision: ${this.prev_gecko_revision}

---

Raptor URL: ${this.url}`;
  }

  var bug = Regression.prototype.toBug.call(this);

  return new Promise((resolve, reject) => {
    bugzilla.createBug(bug, (err, id) => {
      if (err || !id) {
        reject(err);
      } else {
        resolve(id);
      }
    });
  })
};

Regression.prototype.toBug = function() {
  return {
    summary: this.summary,
    description: this.description,
    product: BZ_PRODUCT,
    component: this.component,
    keywords: BZ_KEYWORDS,
    op_sys: BZ_OPERATING_SYSTEM,
    platform: BZ_PLATFORM,
    severity: BZ_SEVERITY,
    version: BZ_VERSION,
    cc: BZ_CC_LIST
  };
};

Regression.reportMetaBug = function(meta) {
  var date = new Date().toDateString();
  var url = `http://raptor.mozilla.org/#/dashboard/script/mark.js?device=${meta.device}&branch=${meta.branch}&memory=${meta.memory}&suite=coldlaunch&to=${meta.to}&from=${meta.from}`;

  return Regression.prototype.report.call({
    component: meta.component,
    keywords: BZ_KEYWORDS,
    op_sys: BZ_OPERATING_SYSTEM,
    platform: BZ_PLATFORM,
    product: BZ_PRODUCT,
    severity: BZ_SEVERITY,
    version: BZ_VERSION,
    summary: 'Performance regression in multiple applications',
    description: `On ${date}, Raptor detected possible regressions in multiple applications. This could point to an issue in the System or the platform.

---

Device: ${meta.device}
Memory: ${meta.memory}
Branch: ${meta.branch}
Time: ${meta.timeDate}

---

Regressing applications:

${meta.apps}
---

Gaia revision: ${meta.gaia_revision}
Previous Gaia revision: ${meta.prev_gaia_revision}

Gecko revision: ${meta.gecko_revision}
Previous Gecko revision: ${meta.prev_gecko_revision}

---

Raptor URL: ${url}`
  });
};

module.exports = Regression;