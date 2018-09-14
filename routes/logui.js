var express = require("express");
var url = require("url");
var router = express.Router();

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect('/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('logui', { title: 'Help', user:req.user });
});

router.post('/new_log_message', (req, res) => {
    var db = req.db;
    var collection = db.get("log");
    var idoc = {
	"user": req.user.last_name,
	"message": req.body.entry,
	"priority": 5,
	"time": new Date()
    }
    collection.insert(idoc);
    return res.redirect("/logui");
});
module.exports = router;
