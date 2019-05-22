var express = require("express");
var url = require("url");
var router = express.Router();

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect('/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    // Get our user's institute
    res.render('shifts', { title: 'Shifts', user:req.user });
});

router.get('/get_shifts', ensureAuthenticated, function(req, res){
    // FullCalendar will call this function to populate itself
    // The arguments are fixed as 'start' and 'end', which are ISO dates
    var db = req.users_db;
    var collection = db.get("shifts");

    var q = url.parse(req.url, true).query;
    var start = new Date(q.start);
    var end = new Date(q.end);

    collection.find({"start": {"$gt": start, "$lt": end}},
		    function(e, docs){
			var ret = [];
			for(var i = 0; i<docs.length; i+=1){
			    doc = docs[i];
			    ret.push({
				"start": doc['start'].toISOString().substr(0, 19),
				"end": doc['end'].toISOString().substr(0, 19),
				"title": doc['type'] + ': ' + doc['shifter'] + 
				    '(' + doc['institute'] + ')',
				"type": doc['type'],
				"available": doc['available'],
				"institute": doc['institute'],
				"shifter": doc['shifter']
			    })
			}
			return res.send(ret); //JSON.stringify(ret));
		    });
    
});

router.get("/total_shift_aggregates", ensureAuthenticated, function(req, res){
    
    var db = req.users_db;
    var collection = db.get("shifts");
    collection.aggregate([
	{"$match": {"institute": {"$ne": "none"}}}, 
	{$group: { "_id": { "institute": "$institute", "yr": {"$year": "$start"}}, 
		   "count": {"$sum": 1}}}, 
	{$group: {"_id": "$_id.institute", "total": {"$sum": "$count"}, 
		  "years": {$push: {"year": "$_id.yr", "count": "$count"}}}},
        {$sort: {"total": -1}}], 
			 function(err, result){
			     res.send(result);
			 });
    
});

function getNextDayOfWeek(date, dayOfWeek) {
    // day of week 0 (Mon) to 6 (Sun)
    var resultDate = new Date(date.getTime());
    resultDate.setDate(date.getDate() + (7 + dayOfWeek - date.getDay()) % 7);
    return resultDate;
}
router.post('/add_shifts', ensureAuthenticated, function(req, res){
    var db = req.users_db;
    var collection = db.get('shifts');
    
    // Get form data
    var start = new Date(Date.UTC(parseInt(req.body.start_date.substr(0, 4)), 
				  parseInt(req.body.start_date.substr(5, 2))-1,
				  parseInt(req.body.start_date.substr(8, 2))));
    var end = new Date(Date.UTC(parseInt(req.body.end_date.substr(0, 4)),
                                  parseInt(req.body.end_date.substr(5, 2))-1,
                                  parseInt(req.body.end_date.substr(8, 2))))

    console.log(req.body.start_date);
    console.log(start);
    console.log(end);
    var weekday = req.body.shift_change_day;
    var shift_type = req.body.shift_type;
    var credit_multiplier = req.body.credit_multiplier;

    start = getNextDayOfWeek(start, weekday);
    var docs = [];
    while(start < end){
	var end_of_shift = new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(),
				    0, 0, 0));
	end_of_shift.setDate(start.getDate() + 7);
	end_of_shift.setHours(23, 59, 59, 0);

	var idoc = {
	    "start": new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate(),
                                       0, 0, 0)),
	    "end": end_of_shift,
	    "type": shift_type,
	    "available": true,
	    "credit_multiplier": credit_multiplier,
	    "institute": "none",
	    "shifter": "none",
	    "comment": ""
	}
	docs.push(idoc);
	start.setTime(end_of_shift.getTime());
    }
    collection.insert(docs);
    return res.sendStatus(200);    
});
router.post('/remove_shifts', ensureAuthenticated, function(req, res){
    var db = req.users_db;
    var collection = db.get("shifts");
    
    var start = new Date(req.body.start_date);
    var end = new Date(req.body.end_date);
    var type = req.body.shift_type;

    query = {"start": {"$gte": start, "$lte": end}};
    if(type != "all")
	query['type'] = type;
    collection.remove(query, {multi: true});
    return res.sendStatus(200);
});

router.post('/modify_shift', ensureAuthenticated, function(req, res){

    var db = req.users_db;
    var collection = db.get("shifts");

    var start = new Date(req.body.start_date);
    var end = new Date(req.body.end_date);
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() + 1);
    var doc = {
	'start': start,
	'end': end,
	'shifter': req.body.shifter,
	'shift_type': req.body.shift_type,
	'institute': req.body.institute,
	'comment': req.body.comment,
	'remove': req.body.remove
    }
    
    console.log(doc);
    // Update the shift with this user
    if(doc['remove'] == 'false'){
	console.log("ADD NEW");
	collection.update(
	    { "start": { "$gt": doc['start']}, 
	      "end": { "$lt": doc['end']},
	      "available": true,
	      "type": doc['shift_type']
	    },
	    {
		"$set": {
		    "shifter": doc['shifter'],
		    "institute": doc['institute'],
		    "comment": doc['comment'],
		    "available": false
		}
	    }, {multi: false}, function(){ return res.sendStatus(200);});
    }
    // Remove the user from the shift
    else
	collection.update(
	        { "start": { "$gt": doc['start']},
		  "end": { "$lt": doc['end']},
		  "available": false,
		  "type":doc['shift_type'],
		  "shifter": doc['shifter']
		},
            {
                "$set": {
                    "shifter": "none",
                    "institute": "none",
                    "comment": '',
                    "available": true
                }
            }, {multi: false}, function(){ return res.sendStatus(200);})
    

});

module.exports = router;
