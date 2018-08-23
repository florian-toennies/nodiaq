var express = require('express');
var url = require('url');
var router = express.Router();

router.get('/', function(req, res) {
    var clients = {
	fdaq00_reader_0: { status: 'none', rate: 0, buffer_length: 0},
	fdaq00_reader_1: { status: 'none', rate: 0, buffer_length: 0}
    };
    res.render('status', { clients: clients});
    //    res.render('index', { clients: clients });
});

router.get('/get_reader_status', function(req, res){
    var db=req.db;
    var collection = db.get('status');

    var q = url.parse(req.url, true).query;
    var host = q.reader;
    
    collection.find(
	{'host': host}, {'sort': {'_id': -1}, 'limit': 1},
	function(e, sdoc){
	    if(sdoc.length == 0)
		return res.send(JSON.stringify({}));
	    var rdoc = sdoc[0];
	    console.log(rdoc);
	    // Basically return sdoc but we want to add time
	    // since client time may vary we assume server time
	    // is correct
	    var now = new Date();
	    var timestamp = rdoc['_id'].toString().substring(0,8);
	    var indate = Date.parse( parseInt( timestamp, 16 ) * 1000 )
	    rdoc['checkin'] = parseInt((now-indate)/1000);
	    rdoc['ts'] = indate;
	    return res.send(JSON.stringify(rdoc));
	});
});

router.get('/get_reader_history', function(req,res){
    var db = req.db;
    var collection = db.get('status');

    var q = url.parse(req.url, true).query;
    var reader = q.reader;
    var limit  = q.limit;

    if(typeof limit == 'undefined')
	limit = 100;
    if(typeof reader == 'undefined')
	return res.send(JSON.stringify({}));

    collection.find({"host": reader},
		    {"sort": {"_id": -1}, "limit": parseInt(limit)},
		    function(e, docs){
			rates = [];
			buffs = [];
			var host = null;
			for(var i = docs.length-1; i>=0; i-=1){
			    var oid = new req.ObjectID(docs[i]['_id']);
			    var dt = Date.parse(oid.getTimestamp());
			    if(host == null)
				host = docs[i]['host'];			    
			    rates.push([dt, docs[i]['rate']])
			    buffs.push([dt, docs[i]['buffer_length']]);
			}
			if(host==null){
			    return res.send(JSON.stringify({}));
			}
			var ret = {};
			ret[host] = {"rates": rates, "buffs": buffs};
			return res.send(JSON.stringify(ret));
		    });
});
				

module.exports = router;
