var express = require('express');
var path = require('path');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var routes = require('./routes');
var config = require('./config.json');
var app = express();

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/', routes);

/**
 * Catch 404 and forward to error handler
 */
app.use((request, response, next) => {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

/**
 * Error handler
 */
app.use((err, request, response, next) => {
  console.log(err.stack);
  response
    .status(err.status || 500)
    .json({
      title: 'Raptor Alerts: Error',
      message: err.message,
      error: err
    });
});

module.exports = app;