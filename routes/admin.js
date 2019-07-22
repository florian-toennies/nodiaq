var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { 
	for(var i in req.user.groups){
	    if(req.user.groups[i] == 'admin')
		return next(); 
	}
    }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('admin', { title: 'Admin', user: req.user });
});



module.exports = router;
