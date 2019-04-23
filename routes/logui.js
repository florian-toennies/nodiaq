var express = require("express");
var url = require("url");
var router = express.Router();

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect('/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    
    // I'm not sure if this is a nasty trick or intended usage
    var q = url.parse(req.url, true).query;
    
    res.render('logui', { title: 'Help', user:req.user });
});


router.get('/getMessages', ensureAuthenticated, function(req, res){
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
                            var rd = {"time": oid.getTimestamp()};
                            for(var key in docs[i]){
                                rd[key] = docs[i][key];
                            }
                            ret.push(rd);
                        }
                        return res.send(JSON.stringify(ret));
                        });
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
