var express = require("express");
var url = require("url");
var router = express.Router();

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect('/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('runsui', { title: 'Runs UI', user: req.user });
});

router.post('/addtags', ensureAuthenticated, function(req, res){
    var db = req.runs_db;
    var collection = db.get("run");

    var runs = req.body.runs;
    var tag = req.body.tag;
    var user = req.user.last_name;

    // Convert runs to int
    runsint = [];
    for(var i=0; i<runs.length; i+=1)
	runsint.push(parseInt(runs[i]));
    console.log(runsint);
    // Update many
    collection.update({"number": {"$in": runsint}},
		      {"$push": {"tags": {"date": new Date(), "user": user,
					  "name": tag}}},
		      {multi:true}, function(){
			  return res.sendStatus(200);
		      });

});

module.exports = router;
