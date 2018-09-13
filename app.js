var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require("body-parser");

// Authentication handler
var passport = require("passport");

// General MongoDB Access via monk
var mongo = require('mongodb');
var ObjectID = require('mongodb').ObjectID;
var monk = require('monk');
mongo_pw = process.env.MONGO_PASSWORD
var db = monk('web:'+mongo_pw+'@localhost:27017/dax', {authSource: 'dax'});
var runs_db = monk('web:'+mongo_pw+'@localhost:27017/run', {authSource: 'dax'});

// For Runs DB Datatable
var runs_mongo = require("./runs_mongo");

// For email confirmations
var nodemailer = require("nodemailer");
var transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: process.env.DAQ_CONFIRMATION_ACCOUNT,
      pass: process.env.DAQ_CONFIRMATION_PASSWORD
  }
});


// Define detectors
var detectors = {
    "det_0": ["fdaq00_reader_0",
	    "fdaq00_reader_1"]
};

// Routers for all the sub-sites
var indexRouter = require('./routes/index');
var optionsRouter = require('./routes/options');
var playlistRouter = require('./routes/playlist');
var hostsRouter = require('./routes/hosts');
var runsRouter = require('./routes/runsui');
var userRouter = require('./routes/users');
var logRouter = require('./routes/logui');
var helpRouter = require('./routes/help');
var statusRouter = require('./routes/status');
var authRouter = require('./routes/auth');

// Using express!
var app = express();

// For parsing POST data from request body
app.use(bodyParser.urlencoded({extended: true}));

// Auth middleware
var session = require('express-session');
app.use(session({secret: process.env.EXPRESS_SESSION}));
var passport = require('passport');
var GitHubStrategy = require('passport-github2').Strategy;
var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_SECRET_KEY;
app.use(passport.initialize());
app.use(passport.session());    

passport.serializeUser(function(user, done) { 
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "http://10.4.73.169:3000/auth/github/callback",
    scope: ['user:email', 'user:name', 'user:login', 'user:id', 'user:avatar_url'],
  },
  function(accessToken, refreshToken, profile, done) {
      // asynchronous verification, for effect...
      process.nextTick(function () {
	  // To keep the example simple, the user's GitHub profile is returned to
	  // represent the logged-in user.  In a typical application, you would want
	  // to associate the GitHub account with a user record in your database,
	  // and return that user instead.
	  var collection = runs_db.get("users");
	  collection.find({"github": profile._json.login},
			  function(e, docs){

			      if(docs.length==0)
				  return done(null, false, "Couldn't find user in DB");
			      var doc = docs[0];
			      ret_profile = {};
			      extra_fields = ['skype', 'github_id', 'cell', 'favorite_color', 'email',
					      'last_name', 'first_name', 'institute', 'position',
					      'percent_xenon', 'start_date', 'lngs'];
			      for(i in extra_fields){
				  if(typeof(doc[extra_fields[i]])=='undefined')
				      ret_profile[extra_fields[i]] = "not set";
				  else
				      ret_profile[extra_fields[i]] = doc[extra_fields[i]];
			      }
			      ret_profile['github_info'] = profile;
			      // Save a couple things from the github profile
			      collection.update({"github": profile._json.login},
						{"$set": { "picture_url": profile._json.avatar_url,
							   "github_home": profile._json.profileUrl}
						});
			      ret_profile['picture_url'] = profile._json.avatar_url;
			      ret_profile['github_home'] = profile._json.profileUrl;
			      return done(null, ret_profile);
			  });
      });
  }));
// End auth

// Aliases for paths to node_modules (you might want to just copy .mins to static folder)
app.use('/bs', express.static(__dirname + '/node_modules/bootstrap3/dist/'));
app.use('/jq', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/je', express.static(__dirname + '/node_modules/jsoneditor/dist/'));


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

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
    req.ObjectID = ObjectID;
    req.detectors = detectors;
    next();
});

// This is the route for the automatic runs datatable api function
app.get('/runtable/getDatatable', runs_mongo.getDataForDataTable)

app.use('/', indexRouter);
app.use('/options', optionsRouter);
app.use('/hosts', hostsRouter);
app.use('/playlist', playlistRouter);
app.use('/runsui', runsRouter);
app.use('/logui', logRouter);
app.use('/help', helpRouter);
app.use('/users', userRouter);
app.use('/status', statusRouter);
app.use('/auth', authRouter);

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
