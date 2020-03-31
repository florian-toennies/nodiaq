// NOTE: some of the filesystem access stuff will have to be reconfigured in the
// final distribution. Consider this beta-level. Assumes you can mount your
// raw data storage and have local filesystem access to it.

var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('scope', { title: 'Scope', user: req.user });
});

router.get('/available_runs', ensureAuthenticated, function(req, res){
  var collection = req.runs_db.get(process.env.RUNS_MONGO_COLLECTION);
  var query = {'data.host' : /eb[0-5]\.xenon\.local/};
  var options = {};
  collection.distinct('number', query, options, function(err, docs) {
    if (err) return res.send(JSON.stringify({message : err.message}));
    return res.send(JSON.stringify(docs));
  }); // collection.find
});

router.get("/available_targets", ensureAuthenticated, function(req, res) {
    var q = url.parse(req.url, true).query;
    var run = q.run;
    if (typeof run === 'undefined') return res.send(JSON.stringify({message : 'Invalid run'}));
    var collection = req.runs_db.get(process.env.RUNS_MONGO_COLLECTION);
    try {
      var query = {number : parseInt(run)};
    }catch(err){
      return res.send(JSON.stringify({message : err.message}));
    }
    var options = { data : 1
        //projection : {data : 1}
    };
    collection.findOne(query, options, function(err, doc) {
      if (err) return res.send(JSON.stringify({message : err.message}));
      if (typeof doc.data === 'undefined')
        return res.send(JSON.stringify({message : 'No run found'}));
      var ret = [];
      for (var i in doc['data']) {
        var datadoc = doc['data'][i];
        if (datadoc['host'] == 'rucio-catalog' || datadoc['type'] == 'live')
          continue;
        ret.push(datadoc['type']);
      }
      return res.send(JSON.stringify(ret));
    });
});

router.get("/available_chunks", ensureAuthenticated, function(req, res) {
  var q = url.parse(req.url, true).query;
  var run = q.run;
  if (typeof run === 'undefined') return res.send(JSON.stringify({message : 'Undefined input'}));
  var fspath = runs_fs_base + '/' + run;
    fs.readdir(fspath, function(err, items) {
      if (err) return res.send(JSON.stringify({message : err.message}));
      items = items.filter(function(fn) {return fn.length == 6;}) // no pre/post
                   .sort(function(a,b) {return parseInt(b)-parseInt(a);});
      return res.send(JSON.stringify(items));
    });
});

module.exports = router;
