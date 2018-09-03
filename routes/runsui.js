var express = require("express");
var url = require("url");
var router = express.Router();

router.get('/', function(req, res) {
    res.render('runsui', { title: 'Runs UI' });
});

router.post('/addtags', function(req, res){
    var db = req.runs_db;
    var collection = db.get("run");

    var runs = req.body.runs;
    var tag = req.body.tag;
    var user = req.body.user;

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
