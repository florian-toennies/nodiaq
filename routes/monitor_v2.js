var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('monitor', { title: 'Monitor', user: req.user });
});

router.get('/available_runs', ensureAuthenticated, function(req, res){
    var db = req.monitor_db;
    db.listCollections().toArray(function(err, collInfos) {
        collInfos = collInfos.sort(function(a, b){
            return parseInt(a['name'].substr(0, 6)) - parseInt(b['name'].substr(0, 6));
        });
	    return res.send(JSON.stringify(collInfos));
    });
});

router.get('/get_run_data', ensureAuthenticated, function(req, res){
    var db = req.monitor_db;
    var q = url.parse(req.url, true).query;
    var coll = q.coll;

    db.collection(coll).find({}).sort({'chunk': 1}).toArray(function(err, arr){
	 return res.send(JSON.stringify(arr));
    });
});

router.get('/get_pmt_locs', ensureAuthenticated, function(req, res){
  var db = req.monitor_db;
  var coll = db.get('cable_map');
  var q = url.parse(req.url, true).query;
  var detector = typeof detector === 'undefined' ? 'tpc' : q.detector;
  coll.find({detector : detector}, {projection:{pmt:1,coords:1,array:1}}, function(e, docs) {
    if (e) {return res.send(JSON.stringify({'message' : e.message}));}
    if (docs.length == 0){
      return res.send(JSON.stringify({'message' : 'No channels found'}));
    }
    return res.send(JSON.stringify(docs));
  });
});

router.get('/get_rate', ensureAuthenticated, function(req, res){
  var db = req.monitor_db;
  var coll_status = db.get('status');
  var coll_runs = req.runs_db.get('run');
  var q = url.parse(req.url, true).query;
  var run = q.run;
  if (typeof run === 'undefined') return res.send(JSON.stringify({'message' : 'No run selected'}));
  run = parseInt(run);
  var t_old = typeof t_max === 'undefined' ? 10 : parseInt(q.t_old);
  var then = ObjectId(Math.floor(nownow/1000-t_old).toString(16)+'0'.repeat(16));
  var t_new = typeof t_new === 'undefined' ? 0 : parseInt(q.t_new);
  var now = ObjectId(Math.floor(nownow/1000-t_new).toString(16)+'0'.repeat(16));
  var detector = typeof q.detector === 'undefined' ? 'tpc' : q.detector;
  var hosts = {
    tpc : /reader[0-2]_reader_0/,
    muon_veto : /reader5_reader_0/,
    neutron_veto : /reader6_reader_0/
  };
  var query = {
    host : hosts[detector],
    _id : {'$gt' : then, '$lt' : now}
  };
  coll.aggregate([
    {'$match' : query},
    {'$project' : {'channel' : {'$objectToArray' : '$channels'}, '_id' : 0}},
    {'$unwind' : {'path' : '$channel'}},
    {'$group' : {'_id' : '$channel.k', 'rate' : {'$avg' : '$channel.v'}}},
  ], {}, function(e, docs) {
      if (e) return res.send(JSON.stringify({'message' : e.message}));
      return res.send(JSON.stringify(docs));
  });
});
module.exports = router;
