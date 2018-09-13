var mongoose = require('mongoose');
var DataTable = require('mongoose-datatable');
var RunsModel;
mongo_pw = process.env.MONGO_PASSWORD
var dbURI = 'mongodb://web:'+mongo_pw+'@localhost:27017/dax';
var runsdb = mongoose.connection;

var runs;
var runsTableSchema;

DataTable.configure({ verbose: true, debug : true });
mongoose.plugin(DataTable.init);
mongoose.connect(dbURI, {dbName: 'run'});

runsdb.on('error', console.error.bind(console, 'connection error:'));
runsdb.once('open', function callback ()
	{
	    console.log('Connection has succesfully opened');
	    var Schema = mongoose.Schema;
	    runsTableSchema = new Schema(
		{
		    number : String,
		    detector: [String],
		    start : Date,
		    end : Date,
		    user: String,
		    mode: String,
		    source: String,
		    tags: [ {user: String, date: Date, text: String} ],
		    comments: [{user: String, date: Date, text: String}],
		},
		{ collection: "run"});
	    runs = mongoose.model('runs', runsTableSchema);
	    runsModel = require('mongoose').model('runs');
	});

exports.getDataForDataTable = function getData (request, response) {
    //"type.typeName" : "Trolley"
    //console.log("Get Request for Data Table made with data: ", request.query);
    runsModel.dataTable(request.query, function (err, data) {
	response.send(data);
    });
};
