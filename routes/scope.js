// NOTE: some of the filesystem access stuff will have to be reconfigured in the
// final distribution. Consider this beta-level. Assumes you can mount your
// raw data storage and have local filesystem access to it.

var express = require("express");
var http = require("http");
var url = require("url");
var { URL } = require("url");
var router = express.Router();
var gp = '';
const BA = "https://xenon1t-daq.lngs.infn.it";

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
    if (err) return res.json({message : err.message});
    return res.json(docs);
  }); // collection.find
});

router.get("/available_targets", ensureAuthenticated, function(req, res) {
    var q = url.parse(req.url, true).query;
    var run = q.run;
    if (typeof run === 'undefined') return res.json({message : 'Invalid run'});
    var collection = req.runs_db.get(process.env.RUNS_MONGO_COLLECTION);
    try {
      var query = {number : parseInt(run)};
    }catch(err){
      return res.json({message : err.message});
    }
    var options = { data : 1};
    collection.findOne(query, options, function(err, doc) {
      if (err) return res.json({message : err.message});
      if (typeof doc.data === 'undefined')
        return res.json({message : 'No run found'});
      var ret = [];
      for (var i in doc['data']) {
        var datadoc = doc['data'][i];
        if (datadoc['host'].search(/eb[0-5]\.xenon\.local/) != -1)
          ret.push(datadoc['type']);
      }
      return res.json(ret);
    });
});

router.get("/get_data", ensureAuthenticated, function(req, res) {
  try{
    var sp = new URL(req.url, BA).searchParams;
  }catch(err){
    return res.json({message : err.message});
  };
  var run = sp.get('run_id');
  var target = sp.get('target');
  var max_n = sp.get('max_n');
  var channel = sp.get('channel');
  if (typeof run === 'undefined' || typeof target === 'undefined' || typeof max_n === 'undefined')
    return res.json({message : "Invalid input"});
  try {
    run = parseInt(run);
    max_n = parseInt(max_n);
    channel = parseInt(channel);
  }catch(err){
    return res.json({message : 'Invalid input: ' + err.message});
  }
  var url = "http://eb2:8000/get_data?";
  url += "run_id=" + run + "&target=" + target + "&max_n=" + max_n;
  if (target.search(/records/) != -1 || target === 'veto_regions' || target === 'lone_hits')
    url += "&selection_str=channel==" + channel;
  http.get(url, (resp) => {
    let data = "";
    resp.on('data', (chunk) => {
      data += chunk;
    }).on('end', () => {
      return res.send(data);
    }).on('error', (err) => {
      return res.json({message : err.message});
    });
  });
});

module.exports = router;
