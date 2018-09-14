var express = require("express");
var url = require("url");
var router = express.Router();

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect('/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('hosts', { title: 'Hosts', user: req.user });
});



module.exports = router;
