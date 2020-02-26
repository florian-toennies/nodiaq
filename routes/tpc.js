var express = require("express");
var url = require("url");
var router = express.Router();
var gp = '';


var mongo = require('mongodb');
var monk = require('monk');


var dax_cstr = process.env.DAQ_URI;
//console.log("DAX DB");
//console.log(dax_cstr);




// just for testing
router.get('/ut',
    function(req, res) {
        var show_state = req.show_state;
        var db = req.db
        
        
        show_state("db", "inside router /tpc/ut");
        
        res.send("<br/>db state: " + db["_state"]);
    }
)


/* GET TPC page. */
router.get('/', function(req, res) {
    res.render('tpclive', { title: 'TPC live Datarate' });
});



router.get('/test', function(req,res){
    show_state = req.show_state;
    
    
    var runs_db = req.runs_db;
    var users_db = req.users_db;
    
    
    show_state("db", "in router tpc/test");
    show_state("runs_db", "in router tpc/test");
    show_state("users_db ", "in router tpc/test");
    
    //res.json(db);
    res.send("state of db: " + db["_state"] );
});


router.get('/updates',function(req,res){
    //res.json()
    
    var db = req.db;
    var collection = db.get('status');
    
    
    var oid_min = ObjectId(0);
    var full_query = []
    
    
    full_query.push({"$match":{"host":{$regex:"reader[0-2]_reader_0", $options:"$i" }}});     // keep match at 0th position
    full_query.push({"$sort": {"_id":-1}});              // keep sort at 1st position
    full_query.push({"$limit": 15});                     // keep limit at 2nd position
            // keep group at 3rd position
    full_query.push({"$group": {_id: "$host", lastid:{"$last": "$_id"}, channels:{"$last":"$channels"}}});
    
    
    // append time filter if parameter unixtime is given in url
    var int_unixtime = parseInt(req.query.unixtime);
    if(!isNaN(int_unixtime)){
        
        if(int_unixtime > 0){
        
            
            str_unixtime_min = (int_unixtime-1).toString(16) + "0000000000000000";
            str_unixtime_max = (int_unixtime+1).toString(16) + "0000000000000000";
            
            var oid_min = ObjectId(str_unixtime_min);
            var oid_max = ObjectId(str_unixtime_max);
            
            full_query[0] = {
                "$match": {
                    "_id":{
                        "$gt": oid_min,
                        "$lt": oid_max
                    },
                    "host":{
                        $regex: "reader[0-2]_reader_0", $options:"$i"
                    }
                },
            };
        };
    };
    
    collection.aggregate(
        full_query,
        function(e,docs){
            res.json(docs);
        }
        
    );
    
    
});


router.get('/get_limits',function(req,res){
    var db = req.db;
    var collection = db.get('status');
    
    json_filter = {"limit":1, "sort":{"_id": -1}}
    
    var full_query = [];
    
    full_query.push({
        "$match":{
            "host": {$regex:"reader[0-2]_reader_0", $options:"$i" },
            "channels":{$exists: true, $ne: {}},
        }
    });
    
    full_query.push({
       "$project":{
            _id: 1,
            unixtime : {
                $divide:[{
                    $subtract: [{
                        $toDate: "$_id"},
                        new Date("1970-01-01")
                    ]},
                1000
            ]},
        }
    });
    
    full_query.push({
        $group: {
            _id: null,
            // for whatever reason they are inverted
            first: { $last: "$$ROOT" },
            last: { $first: "$$ROOT" },
        }
    });
            //last: {"$last": "$_id"},
        //}
    //});
    
    full_query.push({$limit: 2});
    
    
    
    
    
    collection.aggregate(
        full_query,
        function(e,docs){
            res.json(docs);
        }
        
    );
    
    
});




router.get('/get_history',function(req,res){
    var db = req.db;
    var collection = db.get('status');
    
    // initialize used variables
    var json_pmts = [];
    var int_time_start = 1581601938;
    var int_time_end   = 1581602315;
    //var int_time_start = 1581601940;
    //var int_time_end   = 1581601951;
    var int_time_averaging_window = 10;
    
    // get all the time specifics
    var tmp = parseInt(req.query.int_time_start);
    if(!isNaN(tmp) && tmp > 0){
        var int_time_start = tmp
    }
    var str_time_start = (int_time_start).toString(16) + "0000000000000000";
    var oid_time_start = ObjectId(str_time_start);
    
    var tmp = parseInt(req.query.int_time_end);
    if(!isNaN(tmp) && tmp > 0){
        var int_time_end = tmp
    }
    var str_time_end = (int_time_end+1).toString(16) + "0000000000000000";
    var oid_time_end = ObjectId(str_time_end);
    
    
    var tmp = parseInt(req.query.int_time_averaging_window);
    if(!isNaN(tmp) && tmp > 0){
        var int_time_averaging_window = tmp
    }
    
    //console.log(
        //"\nint_time_start: " + int_time_start +
        //"\nint_time_end: " + int_time_end +
        //"\nint_time_averaging_window: " + int_time_averaging_window
    //)
    
    // get all pmt ids that are required
    var tmp_json_pmts = req.query.str_pmts.split(",");
    // check which entry is a number
    for(var i = 0; i < tmp_json_pmts.length; i = i+1){
        tmp = parseInt(tmp_json_pmts[i]);
        // keep value if its numeric and at learst zero
        if(!isNaN(tmp) && tmp >= 0){
            json_pmts.push(tmp);
        }
    }
    
    
    
    var oid_min = ObjectId(0);
    
    
    var json_project_pmts = {};
    var json_zero_pmts    = {};
    for(var i = 0; i < json_pmts.length;i += 1){
        var str_channel_pmt  = "channels."+String(json_pmts[i]);
        var str_channel_pmt2 = "$" + str_channel_pmt
        json_project_pmts[String(json_pmts[i])] = 1;
        json_zero_pmts[str_channel_pmt] = {$ifNull: [ str_channel_pmt2, -1 ] };
    
    }
    
    
    
    var mongo_pipeline = [];
    // roughly filter data to relevant hosts and timeframe
    mongo_pipeline.push(
    {"$match":{
        "_id":{"$gt": oid_time_start,"$lt": oid_time_end},
        "host":{$regex:"reader[0-2]_reader_0", $options:"$i" }}
    });
    
    // create time in seconds and kick out unnecesarry pmts
    mongo_pipeline.push({
        '$project': {
            time:{
                '$divide':[
                    {'$subtract': [ {"$toDate":"$_id"}, new Date(int_time_start*1000) ]},
                    1000
                ]
            },
            "_id": 0,
            channels: json_project_pmts,
        },
    },{
        '$group':{
            _id: "$time",
            channels: {"$mergeObjects": "$channels"}
        }
    });
    
    // complicateed setup to generate propper json to check if a rate is not set
    // set it to -1 so max one step later does not ignore thos timebins
    $project =  {
        timebin:{
            '$trunc': [
                {'$divide': [
                    "$_id",
                    int_time_averaging_window
                ]}
            ],
        }
    }
    for(var key in json_zero_pmts){
        value = json_zero_pmts[key];
        $project[key] = value;
    }
    
    
    
    // merge into timebins
    mongo_pipeline.push({
        $project
    })
    
    if(true){
        mongo_pipeline.push({
            '$group':{
                _id: {
                    '$add':[
                        {'$multiply': [
                            "$timebin",
                            int_time_averaging_window
                        ]},
                        int_time_start
                    ]
                },
                channels: {"$max": "$channels"},
            }
        })
    };
    // and sort by id again
    mongo_pipeline.push({
        '$sort': {
            "_id": 1,
        }
    });
    
    //console.log(mongo_pipeline);
    //res.json(mongo_pipeline);
    
    collection.aggregate(
        mongo_pipeline,
        function(e,docs){
            res.json(docs);
        }
    );
    
});




router.get('/update_map',function(req,res){
    var db = req.db;
    var collection = db.get('cable_map');
    
    collection.find({},{},function(e,docs){
        res.json(docs);
    })
});

router.get('/update/:reader',function(req,res){
    var db = req.db;
    var collection = db.get('status');
    
    collection.find({host: "reader"+req.params.reader+"_reader_0"},{limit:1, sort:{_id:-1}},function(e,docs){
        res.json(docs);
    })
});

module.exports = router
