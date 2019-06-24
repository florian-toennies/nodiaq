var mongoose = require('mongoose');
var DataTable = require('mongoose-datatable');
var runsModel;
var dbURI = "mongodb://" + process.env.RUNS_MONGO_USER + ":" + process.env.RUNS_MONGO_PASSWORD + '@' +
 			process.env.RUNS_MONGO_HOST;
var runsdb = mongoose.connection;
var runs;
var runsTableSchema;
var xenon1tRunsSchema;
var xenon1t_runs_collection = 'runs_new';

DataTable.configure({ verbose: false, debug : false });
mongoose.plugin(DataTable.init);
mongoose.connect(dbURI, {dbName: process.env.RUNS_MONGO_DB});//'xenonnt'});

console.log(dbURI);
console.log("HERE");

runsdb.on('error', console.error.bind(console, 'connection error:'));
runsdb.once('open', function callback ()
	{
	    console.log('Connection has succesfully opened');
	    var Schema = mongoose.Schema;
	    runsTableSchema = new Schema(
		{
		    number : Number,
		    detector: [String],
		    start : Date,
		    end : Date,
		    user: String,
		    mode: String,
		    source: String,
		    bootstrax: [{state: String, host: String, time: Date, started_processing: Date}],
		    tags: [ {user: String, date: Date, text: String} ],
		    comments: [{user: String, date: Date, text: String}],
		},
		{ collection: process.env.RUNS_MONGO_COLLECTION});
	    
	    // Legacy support for accessing XENON1T runs
	    xenon1tRunsSchema = new Schema(
		{
		    number: Number,
		    detector: [String],
		    start: Date,
		    end: Date,
		    user: String,
		    mode: String,
		    source: String,
		    tags: [ {user: String, date: Date, text: String} ],
                    comments: [{user: String, date: Date, text: String}],
                },
		{ collection: xenon1t_runs_collection });
	    runs_1t = mongoose.model('runs_new', xenon1tRunsSchema);
	    runsModel1T = require('mongoose').model('runs_new');

	    runs = mongoose.model('runs', runsTableSchema);
	    runsModel = require('mongoose').model('runs');
	});

exports.getDataForDataTable = function getData (request, response) {
    //"type.typeName" : "Trolley"
    //console.log("Get Request for Data Table made with data: ", request.query);
    //console.log(request.query['date_min']);
    //console.log(request.query['date_max']);
    //console.log(request.query['conditions']);
    var conditions = {};
    var detector = 'xenonnt';
    if(typeof request.query['detector'] !== 'undefined')
	detector = request.query['detector'];
    if(typeof request.query['conditions'] !== 'undefined')
	conditions = JSON.parse(request.query['conditions']);

    // Date filtering
    if(request.query['date_min'] !== undefined){
	if(request.query['date_min'] !== '' && 
	   request.query['date_max'] == '' && 
	   !('start' in Object.keys(conditions)))
	    conditions['start'] = {"$gt": new Date(request.query['date_min'])};
	else if(request.query['date_min'] !== '' &&
		request.query['date_max'] !== '' &&
		!('start' in Object.keys(conditions)))
	    conditions['start'] = {"$gt": new Date(request.query['date_min']),
				   "$lt": new Date(request.query['date_max'])};
	else if(request.query['date_min'] == '' &&
		request.query['date_max'] !== '' &&
		!('start' in Object.keys(conditions)))
	    conditions['start'] = {"$lt": new Date(request.query['date_max'])};
    }
    //console.log(conditions);
    if(detector == 'xenonnt')
	runsModel.dataTable(request.query,  {"conditions": conditions},
			    function (err, data) {
				response.send(data);
			    });
    else
	runsModel1T.dataTable(request.query,  {"conditions": conditions},
                            function (err, data) {
                                response.send(data);
                            });
    
};
