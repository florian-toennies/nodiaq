var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require("body-parser");
var gp="";

// General MongoDB Access via monk
var mongo = require('mongodb');
var ObjectID = mongo.ObjectID;
var monk = require('monk');

console.log("");
console.log("NOW: " + new Date());
console.log("");

var runs_cstr = process.env.RUNS_URI;
//console.log("Runs DB " + runs_cstr);
var runs_db = monk(runs_cstr, {authSource : process.env.RUNS_MONGO_AUTH_DB});

// In case different
var users_cstr = process.env.USERS_URI;
//console.log("Users DB " + users_cstr);
var users_db = monk(users_cstr, {authSource: process.env.USERS_MONGO_AUTH_DB});

var dax_cstr = process.env.DAQ_URI;
//console.log("DAX DB " + dax_cstr);
var db = monk(dax_cstr, {authSource: process.env.DAQ_MONGO_AUTH_DB});

// For Runs DB Datatable
var runs_mongo = require("./runs_mongo");

// For email confirmations
var nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      //type : 'OAuth2',
      //clientID : process.env.DAQ_CONFIRMATION_OAUTH_ID,
      //clientSecret : process.env.DAQ_CONFIRMATION_OAUTH_SECRET,
      user: process.env.DAQ_CONFIRMATION_ACCOUNT,
      pass: process.env.DAQ_CONFIRMATION_PASSWORD
  }
});


// Routers for all the sub-sites
var indexRouter = require('./routes/index');
var optionsRouter = require('./routes/options');
var hostsRouter = require('./routes/hosts');
var runsRouter = require('./routes/runsui');
var userRouter = require('./routes/users');
var logRouter = require('./routes/logui');
var helpRouter = require('./routes/help');
var statusRouter = require('./routes/status');
var authRouter = require('./routes/auth');
var controlRouter = require('./routes/control');
var scopeRouter = require('./routes/scope');
var monitorRouter = require('./routes/monitor');
var shiftRouter = require('./routes/shifts');
var adminRouter = require('./routes/admin');
var equipmentRouter = require('./routes/equipment');
var apiRouter = require('./routes/api');

// Using express!
var app = express();

// For parsing POST data from request body
app.use(bodyParser.urlencoded({extended: true}));

// LONG STUFF TRY TO SPLIT OUT?
// Session caching
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
var dax_cstr = process.env.DAQ_MONGO_USER + ":" + process.env.DAQ_MONGO_PASSWORD + "@" + 
    process.env.DAQ_MONGO_HOST + ":" + process.env.DAQ_MONGO_PORT + "/" +
    process.env.DAQ_MONGO_AUTH_DB;
var store = new MongoDBStore({
  uri: 'mongodb://' + dax_cstr,
  collection: 'mySessions'
});

store.on('connected', function() {
  store.client; // The underlying MongoClient object from the MongoDB driver
});

// Catch errors
var assert = require("assert");
store.on('error', function(error) {
  assert.ifError(error);
  assert.ok(false);
});

app.use(session({
  secret: process.env.EXPRESS_SESSION,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  },
  store: store,
  // Boilerplate options, see:
  // * https://www.npmjs.com/package/express-session#resave
  // * https://www.npmjs.com/package/express-session#saveuninitialized
  resave: true,
  saveUninitialized: false
}));

// Passport Auth
var passport = require("passport");
require("./config/passport");
app.use(passport.initialize());
app.use(passport.session());


// End auth
// End long stuff
//require("./mongo_session_cache.js")
//require("./passport_session.js")


// Aliases for paths to node_modules (you might want to just copy .mins to static folder)
app.use('/bs', express.static(__dirname + '/node_modules/bootstrap3/dist/'));
app.use('/jq', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/je', express.static(__dirname + '/node_modules/jsoneditor/dist/'));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Favicon
var favicon = require('serve-favicon');
app.use(favicon(path.join(__dirname, 'public', 'images', 'favicon.ico')));

// Make our db accessible to our router
app.use(function(req,res,next){
    req.db = db;
    req.transporter = transporter;
    req.runs_db = runs_db;
    req.users_db = users_db;
    req.monitor_db = db;
    req.ObjectID = ObjectID;
    next();
});

// This is the route for the automatic runs datatable api function
app.get('/runtable/getDatatable', runs_mongo.getDataForDataTable);

app.use('/', indexRouter);
app.use('/options', optionsRouter);
app.use('/hosts', hostsRouter);
app.use('/runsui', runsRouter);
app.use('/logui', logRouter);
app.use('/help', helpRouter);
app.use('/users', userRouter);
app.use('/status', statusRouter);
app.use('/auth', authRouter);
app.use('/control', controlRouter);
app.use('/scope', scopeRouter);
app.use('/monitor', monitorRouter);
app.use('/shifts', shiftRouter);
app.use('/equipment', equipmentRouter);
app.use('/admin', adminRouter);
app.use('/api', apiRouter);


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// Make user object accessible to templates
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
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
