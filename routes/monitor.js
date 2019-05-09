var express = require("express");
var url = require("url");
var router = express.Router();


function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('monitor', { title: 'Monitor', user: req.user });
});

router.get('/available_runs', ensureAuthenticated, function(req, res){
    var db = req.monitor_db;
    db.listCollections().toArray(function(err, collInfos) {	
	return res.send(JSON.stringify(collInfos));
    });
});

router.get('/get_run_data', ensureAuthenticated, function(req, res){
    var db = req.monitor_db;
    var q = url.parse(req.url, true).query;
    var coll = q.coll;

    db.collection(coll).find({}).sort({'chunk': 1}).toArray(function(err, arr){
	 return res.send(JSON.stringify(arr));
    });
});

module.exports = router;
