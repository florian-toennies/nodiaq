var express = require('express');
var url = require('url');
var router = express.Router();
var gp="/xenonnt";

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}  
function GetNextRunIdentifier(req, res, callback){
    var db = req.runs_db;
    var collection = db.get('run');
    collection.find(
	{},  { "sort": {"_id": -1}, "limit" : 1 },
	function(e, docs){
	    var run_identifier = 0;
	    if(docs.length>0)
		run_identifier = parseInt(docs[0]['run_identifier']) + 1;
	    callback(run_identifier.toString());
	}
    );
};

/*function InsertRunDoc(req, res, host, callback){
    var db = req.runs_db;
    var collection = db.get('run');
    
   // Get most recent run doc and get it's number (we'll increment)
    collection.find(
	{},  { "sort": {"_id": -1}, "limit" : 1 },
	function(e, docs){
	    var run_identifier = 0;
	    if(docs.length>0)
		run_identifier = parseInt(docs[0]['run_identifier']) + 1;
	    // Nested callback time. Now we want the current run mode
	    // Gotta fail if we can't find it
	    var daxdb = req.db;
	    var daxcoll = daxdb.get('status');
	    daxcoll.find(
		{"host": host}, { "sort": {"_id": -1}, "limit" : 1 },
		function(e, sdoc){
		    run_mode = sdoc[0]['run_mode'];

		    // OK now that we have the run mode have to query the
		    // options collection to pull that mode and place into
		    // the run doc
		    var options_coll = daxdb.get('options');
		    options_coll.find(
			{"name": run_mode},
			function(e, odoc){
			    		    
			    run_doc = {
				"run_identifier": run_identifier,
				"user": "web",
				"start": new Date(),
				"readout": odoc[0]
			    }
			    collection.insert(run_doc);
			    callback(req, res, run_identifier);
			});
		});
	});
}
*/

/* GET home page. */
router.get('/', ensureAuthenticated, function(req, res) {
    res.render('index', { title: 'Express', user: req.user });
});

/*router.get('/arm', ensureAuthenticated, function(req,res){
    // Arm the DAQ with a specific settings doc
    
    // Get argument if there is one
    var q = url.parse(req.url, true).query;
    var mode = q.mode;
    var det = q.detector;
    var adet = req.detectors[det];
    
    if (typeof mode == 'undefined')
	mode = "test";

    GetNextRunIdentifier(req, res, 
	function(run_identifier){
    
	    var db = req.db;
	    var collection = db.get('control');
	    
	    var idoc = {
		mode: mode,
		command: 'arm',
		host: adet, //'fdaq00_reader_0',
		user: 'web',
		options_override: {
		    run_identifier: run_identifier.toString(),
		    mongo_collection: "run_" + run_identifier + "_daq_out"
		}
	    };    
	    collection.insert(idoc);
	    return res.redirect(gp+'/status');
	}
    );
});

router.get('/start', ensureAuthenticated, function(req, res){
    // Start an armed DAQ. This requires creation of a
    // unique run identifier and will insert a run document
    // into the runs database
    
    var q = url.parse(req.url, true).query;
    var det = q.detector;
    var adet = req.detectors[det];

    host = 'fdaq00_reader_0';
    InsertRunDoc(req, res, host, function(req, res, run_identifier){
	var db = req.db;
	var collection = db.get('control');
	var idoc = {
	    run_identifier: run_identifier,
	    command: 'start',
	    host: adet, //host,
	    user: 'web'
	};
	collection.insert(idoc);
	return res.redirect(gp+'/status');
    });
});

router.get('/stop', ensureAuthenticated, function(req, res){

    // First get most recent status to see if DAQ running
    var daxdb = req.db;
    var daxcoll = daxdb.get('status');
    //host = "fdaq00_reader_0";

    var q = url.parse(req.url, true).query;
    var det = q.detector;
    var adet = req.detectors[det];

    daxcoll.find(
	{"host": host}, { "sort": {"_id": -1}, "limit" : 1 },
	function(e, sdoc){
	    s = sdoc[0]['status'];

	    // If running update run doc
	    if(s==3){
		var rdb = req.runs_db;
		var rcoll = rdb.get("run");
		rcoll.update({"run_identifier": parseInt(sdoc[0]['current_run_id'])},
			     {"$set": {"stop": new Date()}});
	    }
	    
	    var db = req.db;
	    var collection = db.get('control');
	    var idoc = {
		command: 'stop',
		host: adet, //'fdaq00_reader_0',
		user: 'web'
	    };
	    collection.insert(idoc);
	    return res.redirect(gp+'/status');
	});
});
*/
router.get('/log', ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get('log');
    var q = url.parse(req.url, true).query;
    var limit = q.limit;
    if (typeof limit == 'undefined')
	limit = 10; //sure, why not
    collection.find({},  { "sort": {"_id": -1}, "limit" : parseInt(limit) },
		    function(e,docs){
			var ret = [];
			for(var i in docs){			    
			    var oid = new req.ObjectID(docs[i]['_id']);
			    var rd = {"time": oid.getTimestamp()};
			    for(var key in docs[i]){
				rd[key] = docs[i][key];
			    }			    
			    ret.push(rd);
			}			 
			return res.send(JSON.stringify(ret));
			});
});

/*
router.get('/runs', ensureAuthenticated, function(req, res){
    var db = req.runs_db;
    var collection = db.get("run");
    var q = url.parse(req.url, true).query;
    var limit = q.limit;
    if(typeof limit == 'undefined')
	limit=5;
    collection.find({}, {"sort": {"_id": -1}, "limit": parseInt(limit)},
		    function(e, docs){
			return res.send(JSON.stringify(docs));
		    });
});
		   
router.get('/detector_history', ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get('aggregate_status');

    // Get limit from GET
    var q = url.parse(req.url, true).query;
    var limit = q.limit;
    var detector = q.detector;

    if(typeof(limit) == 'undefined')
	limit = 1;
    if(typeof(detector) == 'undefined')
	return res.send(JSON.stringify({}));

    collection.find({'detector': detector}, {'sort': {'_id': -1}, 'limit': parseInt(limit)},
		    function(e, docs){
			ret = { "rates": [], "buffs": []};
			for(i in docs){
			    var oid = new req.ObjectID(docs[i]['_id']);
			    var dt = Date.parse(oid.getTimestamp());
			    ret['rates'].unshift([dt, docs[i]['rate']]);
			    ret['buffs'].unshift([dt, docs[i]['buff']]);
			}
			return res.send(JSON.stringify(ret));
		    });
});
    
router.get('/status_history', ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get('status');
    var clients = ['fdaq00_reader_0', 'fdaq00_reader_1'];

    // Get limit from GET options
    var q = url.parse(req.url, true).query;
    var limit = q.limit;

    if(typeof limit == 'undefined')
	limit=1;
    
    // Only works with 1 client now
    collection.find({'host': {"$in": clients}},//"fdaq00_reader_0"},
		    {'sort': {'_id': -1}, 'limit': parseInt(limit)},
		    function(e, docs){			
			ret = {"fdaq00_reader_0": [],
			       "fdaq00_reader_1": []};
			for(var i = docs.length-1; i>=0; i-=1){
			    var oid = new req.ObjectID(docs[i]['_id']);
			    var dt = Date.parse(oid.getTimestamp());
			    rate = docs[i]["rate"];
			    if(typeof rate == "undefined")
				rate = 0.;
			    ret[docs[i]['host']].push([dt, rate]);
			}
			return res.send(JSON.stringify(ret));
		    });
});
*/
router.get('/status_update', ensureAuthenticated, function(req, res){
    var db = req.db;
    var statuses = {
	0: "Idle",
	1: "Arming",
	2: "Armed",
	3: "Running",
	4: "Error"
    };
    var q = url.parse(req.url, true).query;
    var limit = q.client;

    var collection = db.get('status');
    //var clients = {
    //    fdaq00_reader_0: { status: 'none', rate: 0, buffer_length: 0},
    //    fdaq00_reader_1: { status: 'none', rate: 0, buffer_length: 0},
    //};
    //for (var client in clients){
	docs = collection.find({"host": client},
			       { "sort": {"_id": -1}, "limit" : 1 },
			       function(e,docs){

				   if(docs.length>0){
				       var oid = new req.ObjectID(docs[0]['_id']);
				       var dt = Date.parse(oid.getTimestamp());
				       for(var key in docs[0]){
					   clients[client]['status'] = statuses[docs[0].status];
					   clients[client][key] = docs[0][key];
				       }
				       // Overwrite status with human readable
				       clients[client]['status'] = statuses[docs[0].status];
				       clients[client]['timestamp'] = dt;
				   }
				   return res.send(JSON.stringify(clients));
			       });
    //}

    //    res.render('index', { clients: clients });
});

/*
router.get('/modes', ensureAuthenticated, function(req,res){
    var db = req.db;
    var collection = db.get("options");
    var spromise = collection.distinct("name");
    spromise.then(function(doc){
	return res.send(JSON.stringify(doc));
    });
});

router.get("/detectors", ensureAuthenticated, function(req, res){
    var dets = req.detectors;    
    return res.send(JSON.stringify(Object.keys(dets)));
});
*/  

/*
router.get('/helloworld', ensureAuthenticated, function(req, res){
    res.render('helloworld', {title: 'Hello, World!'});
});
*/

router.get('/account', ensureAuthenticated, function(req, res){
    res.render('account', { user: req.user });
});

router.get('/account/request_api_key', ensureAuthenticated, function(req, res){
	// Remove diacritics from last name since annoying to figure out URL syntax
	const last_name = req.user.last_name;
	var api_username = last_name.normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
	
	// Generate API key
	var apikey = require("apikeygen").apikey;
	var key = apikey();

	// Hash it
	const bcrypt = require('bcrypt-nodejs');
	const saltRounds = 10;
	var salt = bcrypt.genSaltSync(saltRounds);
	var hash = bcrypt.hashSync(key, salt);
		
	var db = req.runs_db;
   	var collection = db.get("users");
   	collection.update({"first_name": req.user.first_name,
	       "last_name": req.user.last_name},
	      {"$set": {"api_username": api_username,
	      "api_key": hash}});
	req.user.api_key = key;
	req.user.api_username = api_username;
	return res.redirect(gp+"/account");
});

router.post('/updateContactInfo', ensureAuthenticated, (req, res) => {
    var db = req.runs_db;
    var collection = db.get("users");
    var idoc = {};
    if(req.body.email != ""){
	idoc['email'] = req.body.email;
	req.user.email = req.body.email;
    }
    if(req.body.skype != ""){
        idoc["skype"] = req.body.skype;
	req.user.skype = req.body.skype;
    }
    if(req.body.cell != ""){	
        idoc["cell"] = req.body.cell;
	req.user.cell = req.body.cell;
    }
    if(req.body.favorite_color != ""){
        idoc["favorite_color"] = req.body.favorite_color;
	req.user.favorite_color = req.body.favorite_color;
    }
    collection.update({"first_name": req.user.first_name,
		       "last_name": req.user.last_name},
		      {"$set": idoc});
    console.log(req.user);
    console.log(idoc);    
    return(res.redirect(gp+'/account'));
}); 

router.get('/login', function(req, res){
    res.render('login', { user: req.user });
});

router.get('/logout', function(req, res){
    req.logout();
    res.redirect(gp);
});


router.get("/verify", function(req, res){
    var db = req.runs_db;
    var collection = db.get("users");
    var q = url.parse(req.url, true).query;
    var code = q.code;    
    collection.find({"github_hash": code},
		    function(e, docs){
			if(docs.length == 1){
			    collection.update({'_id': docs[0]['_id']},
					      {"$set": {"github": docs[0]['github_temp']},
					       "$unset": {"github_temp": 1, "github_hash": 1}});
			    return res.render("confirmationLander",
					      {message: "Account linked, you can now login"});
			}
			else
			    res.render("confirmationLander",
				       {message: "Couldn't find an account to link"});
		    });

});

router.get("/verify_ldap", function(req, res){
    var db = req.runs_db;
    var collection = db.get("users");
    var q = url.parse(req.url, true).query;
    var code = q.code;
    collection.find({"ldap_hash": code},
                    function(e, docs){
                        if(docs.length == 1){
                            collection.update({'_id': docs[0]['_id']},
                                              {"$set": {"lngs_ldap_uid": docs[0]['ldap_temp']},
                                               "$unset": {"ldap_temp": 1, "ldap_hash": 1}});
                            return res.render("confirmationLander",
                                              {message: "Account linked, you can now login"});
                        }
                        else
                            res.render("confirmationLander",
                                       {message: "Couldn't find an account to link"});
                    });

});

function SendConfirmationMail(req, random_hash, link, callback){
    // send mail
    var transporter = req.transporter;
    var mailOptions = {
        from: process.env.DAQ_CONFIRMATION_ACCOUNT,
        to: req.body.email,
        subject: 'XENONnT Account Confirmation',
        html: '<p>Please click <a href="https://xenon1t-daq.lngs.infn.it/xenonnt/'+link+'?code='+random_hash+'">here</a> to verify your email.</p><p>If you did not request this email please delete.</p>'
    };
    
    transporter.sendMail(mailOptions, function(error, info){
	if (error) {
            console.log(error);
	    callback(false);
	}
	callback(true);
    });
}

router.post("/linkLDAP", (req, res) => {
    var db = req.runs_db;
    var collection = db.get("users");
    if(req.body.lngs_id != "" && req.body.email != ""){
	collection.find({"email": req.body.email},
			function(e, docs){
			    if(docs.length != 1)
				return res.render("confirmationLander",
						  {message: "You don't seem to be in our database"});
			    else{
				// Synchronous
                                const cryptoRandomString = require('crypto-random-string');
                                const random_hash = cryptoRandomString(128);
                                collection.update({"email": req.body.email},
                                                  {"$set": {"ldap_temp": req.body.lngs_id,
                                                            "ldap_hash": random_hash}});
				// Send Mail
				SendConfirmationMail(req, random_hash, 'verify_ldap', function(success){
				    if(success)
					return res.render("confirmationLander",
                                                          {message: "Check your email"});
				    else
					return res.render("confirmationLander",
							  {message: "Failed to send email confirmation"});
				});
			    }
			});
	}
    else
        return res.render("confirmationLander", 
			  {message: "You must provide a valid email and LDAP ID"});
});

router.post("/linkGithub", (req, res) => {
    var db = req.runs_db;
    var collection = db.get("users");
    if(req.body.github != "" && req.body.email != ""){
	// set github ID to github_temp and send mail
	collection.find({"email": req.body.email},
			function(e, docs){
			    if(docs.length!=1){
				return (res.render("confirmationLander",
						   {message:"You don't seem to be in our database"}));
			    //else if(typeof(docs[0]['github']) != "undefined"){
			    //return (res.render("confirmationLander",
			    //{message: "That account already has a github ID"}));
			    }
			    else{
				// Synchronous
				const cryptoRandomString = require('crypto-random-string');
				const random_hash = cryptoRandomString(128);
				collection.update({"email": req.body.email},
						  {"$set": {"github_temp": req.body.github,
							    "github_hash": random_hash}});
				// Send Mail
                                SendConfirmationMail(req, random_hash, 'verify', function(success){
                                    if(success)
					return res.render("confirmationLander",
							  {message: "Check your email"});
                                    else
					return res.render("confirmationLander",
							  {message: "Failed to send email confirmation"});
				});
			    }
			});			
    }
    else
	return res.render("confirmationLander", 
			  {message: "You must provide a valid email and GitHub account ID"});
});


module.exports = router;
