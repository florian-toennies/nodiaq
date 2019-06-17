var mongoose = require('mongoose');
var DataTable = require('mongoose-datatable');
var runsModel;
var dbURI = "mongodb://" + process.env.RUNS_MONGO_USER + ":" + process.env.RUNS_MONGO_PASSWORD + '@' +
 			process.env.RUNS_MONGO_HOST;
var runsdb = mongoose.connection;

var runs;
var runsTableSchema;

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
    runsModel.dataTable(request.query,  {"conditions": conditions},
			function (err, data) {
	response.send(data);
    });
};
