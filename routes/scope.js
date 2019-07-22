// NOTE: some of the filesystem access stuff will have to be reconfigured in the
// final distribution. Consider this beta-level. Assumes you can mount your
// raw data storage and have local filesystem access to it.

var express = require("express");
var url = require("url");
var router = express.Router();
var fs = require('fs');
var lz4 = require('lz4');
var gp = '';

var runs_fs_base = '/data/xenon/raw/xenonnt';

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    return res.redirect(gp+'/login');
}

router.get('/', ensureAuthenticated, function(req, res) {
    res.render('scope', { title: 'Scope', user: req.user });
});

router.get('/available_runs', ensureAuthenticated, function(req, res){
    var fspath = runs_fs_base;
    fs.readdir(fspath, function(err, items) {
	return res.send(JSON.stringify(items));
    });
});

function ReadFragments(path, thechannel, max_fragments){
    // Get strax data (up to max_fragments) for a given module and channel 
    // at a given path
    file_buffer = fs.readFileSync(path);
    var uncompressed = new Buffer(file_buffer.length*3); // it can't do 5x compression, right?
    var uncompressedSize = lz4.decodeBlock(file_buffer, uncompressed);
    var data = uncompressed.slice(0, uncompressedSize);
    var i = 0;
    var pulses = [];
    return new Promise( resolve => {
	while(i+141 < data.length && pulses.length<max_fragments && i>=0){

	    // Get header data for first fragment in pulse
	    var channel = data.slice(i, i+2).readInt16LE();	    
	    var time = parseInt(data.slice(i+4, i+12).reverse().toString('hex', 0, 8), 16);
	    var frag_length = data.slice(i+12, i+16).readInt32LE();
	    var pulse_length = data.slice(i+20, i+24).readInt32LE();
	    
	    var samples = [];
	    for(var j=0; j<frag_length; j+=1){
		if(samples.length > pulse_length)
		    break;
		samples.push(data.slice(i+31+2*j, i+31+2*j+2).readInt16LE());
	    }

	    // Now get further fragments if they exist
	    i += frag_length*2 + 31;
	    
	    while(samples.length < pulse_length){
		
		for(var j=0; j<frag_length; j+=1){
		    if(samples.length > pulse_length)
			break;
		    samples.push(data.slice(i+31+j*2, i+31+j*2+2).readInt16LE());
		}
		i+= frag_length*2+31;
		
	    }

	    if(channel === thechannel)
		pulses.push({"channel": channel, "time": time, "pulse_length": pulse_length, 
			     "sample": samples});
	    
	}
	resolve(pulses);
    });
}




// This construct is probably unreasonably complex, but it has worked before.
// We declare a recursive function returning a promise, whose result is awaited
// by an async wrapper function, whose callback actually returns our JSON, the 
// invocation of which is nested within the callback of a database query.
// Don't lie. You love it.
function PullData(reader, channel, full_path, ret_pulses, n_pulses,
		  last_file_called, last_chunk_called){
    // General logic: for this chunk list all sub-files available from out reader in 
    // alphabetical order. Keep track of most recent files read. Try to pull n_pulses 
    // pulses from the current file and add them to ret_pulses. If you can't, call this
    // function again on the previous file in chunk. If at first file of chunk iterate 
    // chunk number once down. If already at chunk zero just return what you've got.

    // Get all the sub-files in full_path that start with 'reader' and sort by name
    // Chunk names have to be of length 6
    var s = "000000" + last_chunk_called;
    var chunk_name = s.substr(s.length-6);

    return new Promise( resolve => {
	var items = fs.readdirSync(full_path + "/" + chunk_name);
	
	var sorted_files = items.filter(function (file) {
	    return file.substr(0, reader.length) === reader ? true : false;
        }).sort(function (a, b) {
	    return a < b ? -1 : 1;
        });
	
	var index = -1;
	if(last_file_called === "")
	    index = sorted_files.length - 1;
	else{
	    for(var i in sorted_files){
		if(sorted_files[i] == last_file_called){		    
		    index = i-1;
		    break;
		}
	    }
	    if(index === 0 && last_chunk_called > 0)
		resolve(PullData(reader, channel, full_path, ret_pulses, n_pulses,
				"", last_chunk_called - 1));
	    else if(index === 0 && last_chunk_called === 0){
		console.log("NO MORE DATA");
		resolve(ret_pulses); // no more data
	    }
	}
	
	if(index === -1) // unknown failure. return what you have
	    resolve(ret_pulses);
	
	// Otherwise just read the file. This is actually the hard part tbh. 
	ReadFragments(full_path + "/" + chunk_name + "/" + sorted_files[index],
		      channel, n_pulses - ret_pulses.length).then(
			  result => {
			      ret_pulses = ret_pulses.concat(result);
			      if(ret_pulses.length >= n_pulses){		
				  resolve(ret_pulses);
			      }
			      else{
				  resolve(PullData(reader, channel, full_path, ret_pulses, n_pulses, 
						  sorted_files[index], last_chunk_called));
			      }
			  });
    }); // end promise
 
}

async function GetChannelWaveforms(run, reader, channel, fspath, callback){
    // This is a wrapper to allow me to await the PullData function. It also
    // does some initial filesystem searching to get the most recent chunk

    var ret_pulses = [];
    var last_file_called = "";
    var last_chunk_called = -1;
    var n_pulses = 50;

    // Go into the filesystem and get the largest chunk present. For simplicity we ignore
    // pre and post chunks by only taking chunks with file name length 6.
    var full_path = fspath + '/' + run;
    items = fs.readdirSync(full_path);
    var sorted_files = items.filter(function (file) {
	return file.length === 6 ? true : false;
    }).sort(function (a, b) {
	return a < b ? -1 : 1;
    });

    if(sorted_files.length === 0)
	callback([]);

    var last_chunk_called = parseInt(sorted_files[sorted_files.length - 1]);

    var pulses =  await PullData(reader, channel, full_path, ret_pulses, n_pulses, 
				 last_file_called, last_chunk_called);
    callback(pulses);

}

router.get('/get_pulses', ensureAuthenticated, function(req, res){

    // Get pulses from fspath. 
    var db = req.db;
    var options_coll = db.get('options');
    var fspath = runs_fs_base;
    var q = url.parse(req.url, true).query;
    var run = q.run;
    var channel = parseInt(q.channel);
    if(typeof channel === 'undefined' || !(channel > 0))
	channel = 0;
    if(typeof run === 'undefined')
	return JSON.stringify({"error": "no run provided"});

    // Get reader who reads out this channel
    // NOTE: I have hardcoded the options names to get here... probably bad 
    // but what else you gonna do? Just change name when you inevitably stumble
    // on this.
    options_coll.find({"name": {"$in": ['xenon1t_channel_map', 'xenon1t_board_definitions_tpc']}},
		      {"sort": {"name": -1}}, // this is to make channel_map first!
		      function(e, docs){			  
			  if(docs.length !== 2)
			      return JSON.stringify({"error": e});
			  if(Object.keys(docs[0]).indexOf('channels') < 0 || 
			     Object.keys(docs[1]).indexOf('boards') < 0){
			      return JSON.stringify({"error": "malformed doc(s)"});
			  }
			  
			  // Get the reader, module, and m_channel from doc
			  var module = -1;
			  var m_channel = -1;
			  for(var mod in docs[0]['channels']){
			      for(var i=0; i<docs[0]['channels'][mod].length; i+=1){
				  if(docs[0]['channels'][mod][i] == parseInt(channel)){
				      module = parseInt(mod);
				      m_channel = parseInt(i);
				      break;
				  }
			      }
			      if(module >= 0 && channel >= 0)
				  break;
			  }
			  
			  // Fail if we didn't find mod/channel
			  if(module <0 || channel <0)
			      return JSON.stringify({"error": "failed to find channel in map"});

			  // Now get the reader for this module
			  var reader = "";
			  for(var i in docs[1]['boards']){
			      if(parseInt(docs[1]['boards'][i]['board']) === module){
				  reader = docs[1]['boards'][i]['host'];
				  break;
			      }
			  }
			  if(reader === "")
			      return JSON.stringify({"error": "failed to find reader with that board"});

			  GetChannelWaveforms(run, reader, channel, fspath, function(pulses){
			      return res.send(JSON.stringify(pulses));
			  });
	
		      });
});


module.exports = router;
