var express = require('express');
var url = require('url');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
    res.render('index', { title: 'Express' });
});

router.get('/arm', function(req,res){

    // Get argument if there is one
    var q = url.parse(req.url, true).query;
    var mode = q.mode;
    if (typeof mode == 'undefined')
	mode = "test";
    console.log("THIS MODE");
    console.log(mode);
    var db = req.db;
    var collection = db.get('control');
    console.log("ARM");

    var idoc = {
	mode: mode,
	command: 'arm',
	host: 'fdaq00',
	user: 'web'
    };

    collection.insert(idoc);
    return res.redirect('/status');
});

router.get('/start', function(req, res){
    var db = req.db;
    var collection = db.get('control');
    var idoc = {
	command: 'start',
	host: 'fdaq00',
	user: 'web'
    };
    collection.insert(idoc);
    return res.redirect('/status');
});

router.get('/stop', function(req, res){
    var db = req.db;
    var collection = db.get('control');
    var idoc = {
	command: 'stop',
	host: 'fdaq00',
	user: 'web'
    };
    collection.insert(idoc);
    return res.redirect('/status');
});

router.get('/log', function(req, res){
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
			    var rd = {
				"_id": docs[i]['_id'],
				"time": oid.getTimestamp(),
				"user": docs[i]['user'],
				"priority": docs[i]['priority'],
				"message": docs[i]['message']
			    };
			    ret.push(rd);
			}			 
			return res.send(JSON.stringify(ret));
			});
});
			       
    

router.get('/status_update', function(req, res){
    var db = req.db;
    var statuses = {
	0: "Idle",
	1: "Arming",
	2: "Armed",
	3: "Running",
	4: "Error"
    };
    var collection = db.get('status');
    var clients = {
	fdaq00: { status: 'none', rate: 0, buffer_length: 0}
    };
    for (var client in clients){
	docs = collection.find({"host": client},
			       { "sort": {"_id": -1}, "limit" : 1 },
			       function(e,docs){
				   
				   if(docs.length>0){				   
				       clients[client]['status'] = statuses[docs[0].status];
				       clients[client]['rate'] = docs[0].rate;
				       clients[client]['buffer_length'] = docs[0].buffer_length;
				       clients[client]['run_mode'] = docs[0].run_mode;
				   }
				   return res.send(JSON.stringify(clients));
			       });
    }

    //    res.render('index', { clients: clients });
});

router.get('/modes', function(req,res){
    var db = req.db;
    var collection = db.get("options");
    var spromise = collection.distinct("name");
    spromise.then(function(doc){
	return res.send(JSON.stringify(doc));
    });
});
    
router.get('/status', function(req, res) {
    var clients = {
	fdaq00: { status: 'none', rate: 0, buffer_length: 0}
    };
    res.render('index', { clients: clients});
//    res.render('index', { clients: clients });
});

router.get('/helloworld', function(req, res){
    res.render('helloworld', {title: 'Hello, World!'});
});

module.exports = router;
