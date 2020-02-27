var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('monitor', { title: 'Monitor', user: req.user });
});


router.get('/get_limits', ensureAuthenticated, function(req, res){
    var db = req.monitor_db;
    console.log(db)
    
    var collection = runs_db.get("status");
    console.log(collection)
    
    res.send("bla")
});





module.exports = router;
