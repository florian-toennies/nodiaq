var express = require("express");
var url = require("url");
var router = express.Router();

router.get('/', function(req, res) {
    res.render('options', { title: 'Options' });
});

router.get("/options_list", function(req, res){
    var db = req.db;
    var collection = db.get('options');
    collection.find({}, {"sort": {"name": 1}},
		    function(e, docs){
			retlist = [];
			for(var i in docs)
			    retlist.push(docs[i]['name']);
			return res.send(JSON.stringify(retlist));
		    });
});

router.get("/options_json", function(req, res){
    var query = url.parse(req.url, true).query;
    var name = query.name;
    if(typeof name == "undefined")
	return res.send(JSON.stringify({"ERROR": "No name provided"}));

    var db = req.db;
    var collection = db.get('options');
    collection.findOne({"name": name}, {},
		       function(e, doc){
			   try{
			       return res.send(JSON.stringify(doc));
			   }
			   catch(error){
			       return res.send(JSON.stringify({"ERROR":
							       "couldn't find that doc"}));
			   }
		       });
});

router.post("/set_run_mode", function(req, res){
    doc = JSON.parse(req.body.doc);
    console.log(doc);
    delete doc._id;
    var db = req.db;
    var collection = db.get('options');

    collection.remove({name: doc['name']}, {}, function(err, result){
	collection.insert(doc, {}, function(){
	    return res.render("options", {title: "Options"});
	});
    });
});

router.get("/remove_run_mode", function(req, res){
    var query = url.parse(req.url, true).query;
    var name = query.name;
    var db = req.db;
    var collection = db.get('options');
    collection.remove({'name': name}, {},
		      function(e){
			  return res.render("options", {"title": "Options"});
		      });
});


module.exports = router;
