var express = require("express");
var url = require("url");
var router = express.Router();
var fs = require('fs');
var gp = '/xenonnt';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('scope', { title: 'Scope', user: req.user });
});

router.get('/available_runs', ensureAuthenticated, function(req, res){
    var fspath = '/data/xenon/raw/xenonnt';
    fs.readdir(fspath, function(err, items) {
	return res.send(JSON.stringify(items));
    });
});



module.exports = router;
