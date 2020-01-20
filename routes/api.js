var express = require("express");
var url = require("url");
var bcrypt = require('bcrypt-nodejs');
var router = express.Router();

var last_api_call = {};
const MAX_STORED_CALLS = 20;
const MAX_TIME_FOR_CALLS = 10000; // ms

function checkKey(req, res, next) {
  var q = url.parse(req.url, true).query;
  var user = q.user;
  var key = q.key;
  if (typeof(user) == 'undefined' || typeof(key) == 'undefined') {
    return res.send(JSON.stringify({}));
  }
  var collection = req.users_db.get("users");
  var query = {"api_username" : user};
  var options = {"projection" : {"api_key" : 1}};
  collection.find(query, options, function(e, docs) {
    if (e) {
      return res.send(JSON.stringify({'message' : e.message}));
    }
    if (docs.length == 0 || typeof(docs[0].api_key) == 'undefined')
      return res.send(JSON.stringify({'message' : 'Access denied'}));
    bcrypt.compare(key, docs[0]['api_key'], function(err, ret) {
      if (err) return res.send(JSON.stringify({'message' : err}));
      if (ret == true) {
        if (typeof(last_api_call[user]) == 'undefined') {
          last_api_call[user] = [];
        }
        if (last_api_call[user].length == MAX_STORED_CALLS) {
          var now = new Date();
          last_api_call[user].push(now);
          var then = last_api_call[user].shift();
          if (Math.abs(now - then) < MAX_TIME_FOR_CALLS) {
            return res.send(JSON.stringify({'message' : 'Too many calls'}));
          } else {
            return next();
          }
        } else {
          last_api_call[user].push(new Date());
          return next();
        }
      }
      return res.send(JSON.stringify({'message' : 'Access denied'}));
    });
}

router.get("/helloworld", checkKey, function(req, res) {
  var today = new Date();
  return res.send(JSON.stringify({'message' :
    'Hello to you too. The current time is ' + today.toUTCString()}));
});

router.get("/getstatus/:host", checkKey, function(req, res) {
  var q = url.parse(req.url, true).query;
  var host = req.params.host;
  var time_sec = 0;
  var collection = req.db.get('status');
  try {
    time_sec = parseInt(q.time_seconds);
  } catch(error){
  }
  var query = {"host" : host};
  var options = {'sort' : {'_id' : -1}};
  if (time_sec > 0) {
    var now = Math.floor(new Date().getTime()/1000 - time_sec);
    var oid = ObjectId(now.toString(16) + "0000000000000000");
    query['_id'] = {'$gte' : oid};
  } else {
    options['limit'] = 1;
  }

  collection.find(query, options, function(err, docs) {
    if (err) {
      return res.send(JSON.stringify({'message' : err.message}));
    }
    return res.send(JSON.stringify(docs));
  });
  return res.send(JSON.stringify({'message' : 'Query returned no documents'}));
});

router.get("/geterrors", checkKey, function(req, res) {
  var q = url.parse(req.url, true).query;
  var min_level = 2;
  var collection = req.db.get('log');
  try{
    min_level = parseInt(q.level);
  } catch(error){
  }
  var query = {'priority' : {'$gte' : min_level, '$lt' : 5}};
  var options = {'sort' : {'_id' : -1}, 'limit' : 1};
  collection.find(query, options, function(err, docs) {
    if (err) {
      return res.send(JSON.stringify({'message' : err.message}));
    }
    return res.send(JSON.stringify(docs);
  });
});

function GetControlDoc(collection, detector, callback) {
  var query = {'detector' : detector};
  collection.find(query, function(err, docs) {
    if (err) {
      callback(err.msg, null);
    }
    if (docs.length == 0) {
      callback("No control doc for detector " + detector, null);
    }
    callback(null, docs[0]);
  }
}

router.get("/getcommand/:detector", checkKey, function(req, res) {
  var detector = req.params.detector;
  var collection = req.db.get("detector_control");
  GetControlDoc(collection, detector, function(err, doc) {
    if (err) {
      return res.send(JSON.stringify({'message' : err}));
    }
    return res.send(JSON.stringify(doc));
  });
});

router.get("/detector_status/:detector", checkKey, function(req, res) {
  var detector = req.params.detector;
  var timeout = 30;
  var now = Math.floor(new Date().getTime()/1000) - timeout;
  var oid = ObjectId(now.toString(16) + "0000000000000000");
  var query = {'detector' : detector, '_id' : {'$gte' : oid}};
  var options = {'sort' : {'_id' : -1}, 'limit' : 1};
  var collection = req.db.get("aggregate_status");
  collection.find(query, options, function(err, docs) {
    if (err) {
      return res.send(JSON.stringify({'message' : err.message}));
    }
    if (docs.length == 0) {
      return res.send({'message' : 'No status update within the last 30 seconds'});
    }
    return res.send(JSON.stringify(docs));
  });
});

router.post("/setcommand/:detector", checkKey, function(req, res) {
  var data = req.body.data;
  var detector = req.params.detector;
  GetControlDoc(detector, function(err, doc) {
    if (err) {
      return res.send(JSON.stringify({'message' : err}));
    }
    if (doc.remote == "false") {
      return res.send(JSON.stringify({'message' :
        "Detector must be in remote mode to control via the API"}));
    }
    if ((doc.active == "true" && data.active == "true") || 
        (doc.active == "false" && data.active == "false")) {
      
    }
    if (detector == "tpc" && (doc.link_nv != "false" || doc.link_mv != "false")) {
      return res.send(JSON.stringify({'message' :
        'All detectors must be unlinked to start TPC'}));
    }
    if (detector == "neutron_veto" && doc.link_nv != "false") {
      return res.send(JSON.stringify({'message' :
        'NV must be unlinked to control via API'}));
    }
    if (detector == "muon_veto" && doc.link_mv != "false") {
      return res.send(JSON.stringify({'message' :
        'MV must be unlinked to control via API'}));
    }
  });
});

module.exports = router;
