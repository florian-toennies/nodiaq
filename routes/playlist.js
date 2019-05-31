var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '/xenonnt';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('playlist', { title: 'Playlist', user:req.user });
});

router.get('/modes', ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get("options");
    var q = url.parse(req.url, true).query;
    var detector = q.detector;
    console.log(detector);
    collection.find({"detector": detector},
		    {"sort": {"name": 1}},
		    function(e, docs){
			var ret = [];
			for(var i=0; i<docs.length; i++){
			    var rs = docs[i]["name"];
			    var rd = "";
			    if(typeof docs[i]['description'] != 'undefined')
				rd = docs[i]['description'];
			    ret.push([rs, rd]);
			}
			return res.send(JSON.stringify(ret));
		    });
});

router.get("/get_playlist", ensureAuthenticated, function(req, res){
    var db = req.db;
    var collection = db.get("command_queue");

    var q = url.parse(req.url, true).query;
    var limit = q.new_limit;
    
    // Fetch n entries that have not been processed
    collection.find({"command": "start", "$or": [
	{"status": {"$exists": false}},
	{"status": "queued"}]}, {"sort": {"_id": -1}, "limit": limit},
		    function(e, docs){
			var ret = [];
			if(typeof docs != "undefined")
			    ret = docs.reverse();
			
			collection.find({"command": "start", "$and": [
			    {"status": {"$exists": true}},
			    {"status": {"$ne": "queued"}}
			]},					
					{"sort": {"_id": -1}, "limit": 2},
					function(e, docs){
					    for(i in docs)
						ret.unshift(docs[i])
					    return res.send(JSON.stringify(ret));
					});
		    });
});

router.get("/stop_daq", ensureAuthenticated, function(req, res){

    var q = url.parse(req.url, true).query;
    var det = q.detector;
    
    var idoc = {
	"command": "stop",
	"detector": det,
	"user": "web_user"
    };

    var db = req.db;
    var collection = db.get("command_queue");
    collection.insert(idoc);
    console.log("STOPPED");
    return res.redirect("/playlist");
});

router.post("/new_run", ensureAuthenticated, (req, res) => {
    var db = req.db;
    var collection = db.get("command_queue");

    how_many = 1;
    if(typeof req.body.how_many != "undefined")
	how_many = req.body.how_many;

    for(var i=0; i<how_many; i+=1){
	var idoc = {
	    "mode": req.body.run_mode,
	    "command": "start",
	    "detector": req.body.detector,
	    "user": req.body.user,
	    "stop_after": req.body.stop_after,
	    "status": "queued"
	}
	if(typeof req.body.comment !== 'undefined' && req.body.comment !== "")
		idoc['comment'] = req.body.comment;
	
	collection.insert(idoc);
    }
    return res.redirect("/playlist");
});

module.exports = router;
