var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var bodyParser = require("body-parser");


// General MongoDB Access via monk
var mongo = require('mongodb');
var ObjectID = mongo.ObjectID;
var monk = require('monk');
var runs_cstr = process.env.RUNS_MONGO_USER + ":" + process.env.RUNS_MONGO_PASSWORD + '@' +
 			process.env.RUNS_MONGO_HOST+':'+process.env.RUNS_MONGO_PORT+'/'+process.env.RUNS_MONGO_DB;
console.log(runs_cstr);
var runs_db = monk(runs_cstr, {authSource: process.env.RUNS_MONGO_DB});
var dax_cstr = process.env.DAQ_MONGO_USER + ":" + process.env.DAQ_MONGO_PASSWORD + "@" + 
			process.env.DAQ_MONGO_HOST + ":" + process.env.DAQ_MONGO_PORT + "/" + process.env.DAQ_MONGO_DB;
var db = monk(dax_cstr, {authSource: process.env.DAQ_MONGO_DB});
console.log(dax_cstr);


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

// LONG STUFF TRY TO SPLIT OUT?
// Session caching
var session = require('express-session');
var MongoDBStore = require('connect-mongodb-session')(session);
var dax_cstr = process.env.DAQ_MONGO_USER + ":" + process.env.DAQ_MONGO_PASSWORD + "@" + 
			process.env.DAQ_MONGO_HOST + ":" + process.env.DAQ_MONGO_PORT + "/" + process.env.DAQ_MONGO_DB;
			
var store = new MongoDBStore({
  uri: 'mongodb://' + dax_cstr,
  collection: 'mySessions'
});
 
store.on('connected', function() {
  store.client; // The underlying MongoClient object from the MongoDB driver
});

// Catch errors
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
// Passport github strategy
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
    callbackURL: "https://daq-page.appspot.com/auth/github/callback",
    scope: ['user:email', 'user:name', 'user:login', 'user:id', 'user:avatar_url'],
  },
  function(accessToken, refreshToken, profile, done) {
      // asynchronous verification, for effect...
      process.nextTick(function () {
      	
	  var collection = runs_db.get("users");
	  collection.find({"github": profile._json.login},
			  function(e, docs){

			      console.log("MongoP");
			      console.log(e);
			      
			      if(docs.length===0){
				  console.log("Couldn't find user in run DB");
				  console.log(profile._json.login);
				  return done(null, false, "Couldn't find user in DB");
			      }
			      var doc = docs[0];
			      var ret_profile = {};
			      var extra_fields = ['skype', 'github_id', 'cell', 'favorite_color', 'email',
					      'last_name', 'first_name', 'institute', 'position',
					      'percent_xenon', 'start_date', 'lngs', 'github',
					      'picture_url', 'github_home'];
			      for(var i in extra_fields){
				  if(typeof doc[extra_fields[i]]==='undefined')
				      ret_profile[extra_fields[i]] = "not set";
				  else
				      ret_profile[extra_fields[i]] = doc[extra_fields[i]];
			      }
			      ret_profile['github_info'] = profile;
			      // Save a couple things from the github profile
			      collection.update({"github": profile._json.login},
						{"$set": { "picture_url": profile._json.avatar_url,
							   "github_home": profile.html_url}
						});
			      ret_profile['picture_url'] = profile._json.avatar_url;
			      ret_profile['github_home'] = profile._json.html_url;
			      console.log("Login success");
			      return done(null, ret_profile);
			  });
      });
  }));
 
//For testing it's pretty useful to have local auth as well. We'll use email/pw and ensure the email is in our DB
var auth = require('passport-local-authenticate');
var LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy({
		usernameField: 'email',
	},
  function(username, password, done) {
  	var collection = runs_db.get("users");
  	collection.find({"email": username},
  	function(e, docs){     
			  
		
		if(docs.length===0){
			console.log("Password auth failed, no user");
			console.log(username);
			return done(null, false, "Couldn't find user in DB");
		}
		
		// For now we're using a general password since this is just a workaround
		auth.hash(process.env.GENERAL_PASSWORD, function(err, hashed) {
			auth.verify(password, hashed, function(err, verified) {
				if(verified){
					var doc = docs[0];
					var ret_profile = {};
					var extra_fields = ['skype', 'github_id', 'cell', 'favorite_color', 'email',
					      'last_name', 'first_name', 'institute', 'position',
					      'percent_xenon', 'start_date', 'lngs', 'github',
					      'picture_url', 'github_home'];
					for(var i in extra_fields){
		  				if(typeof doc[extra_fields[i]]==='undefined')
		      				ret_profile[extra_fields[i]] = "not set";
						else
			  				ret_profile[extra_fields[i]] = doc[extra_fields[i]];
					}
					ret_profile['github_info'] = {};
	    			console.log("Login success");
	    			return done(null, ret_profile);
  				}
  				return done(null, false);
	  		});
  		});

    });
  }
));


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
app.get('/runtable/getDatatable', runs_mongo.getDataForDataTable);

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
