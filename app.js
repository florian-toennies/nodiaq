var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var mongo = require('mongodb');
var ObjectID = require('mongodb').ObjectID;
var monk = require('monk');
mongo_pw = process.env.MONGO_PASSWORD
var db = monk('daq:'+mongo_pw+'@localhost:27017/dax', {authSource: 'admin'});

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

function start(){
    console.log("start");
};
function stop(){
    console.log("stop");
};

// Aliases for paths to node_modules
app.use('/bs', express.static(__dirname + '/node_modules/bootstrap3/dist/'));
app.use('/jq', express.static(__dirname + '/node_modules/jquery/dist/'));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    req.ObjectID = ObjectID;
    next();
});

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
