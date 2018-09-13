var express = require("express");
var url = require("url");
var router = express.Router();

function ensureAuthenticated(req, res, next) {                                                  
    if (req.isAuthenticated()) { return next(); }                                               
    return res.redirect('/login');                                                              
} 

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('users', { title: 'User Directory', user: req.user });
});

router.post('/getDirectory', ensureAuthenticated, function(req, res){
    var db = req.runs_db;
    var collection = db.get("users");
    collection.find({}, {"sort": {"last_name": -1}},
		    function(e, docs){
			return res.send(JSON.stringify({"data": docs}));
		    });
});

module.exports = router;
