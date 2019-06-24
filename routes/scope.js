// NOTE: some of the filesystem access stuff will have to be reconfigured in the
// final distribution. Consider this beta-level. Assumes you can mount your
// raw data storage and have local filesystem access to it.

var express = require("express");
var url = require("url");
var router = express.Router();
var fs = require('fs');
var gp = '/xenonnt';

var runs_fs_base = '/data/xenon/raw/xenonnt';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('scope', { title: 'Scope', user: req.user });
});

router.get('/available_runs', ensureAuthenticated, function(req, res){
    var fspath = runs_fs_base;
    fs.readdir(fspath, function(err, items) {
	return res.send(JSON.stringify(items));
    });
});

router.get('/get_pulses', ensureAuthenticated, function(req, res){

    // 

};


module.exports = router;
