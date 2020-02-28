// NOTE: some of the filesystem access stuff will have to be reconfigured in the
// final distribution. Consider this beta-level. Assumes you can mount your
// raw data storage and have local filesystem access to it.

var express = require("express");
var url = require("url");
var router = express.Router();
var fs = require('fs');
var lz4 = require('lz4');
var gp = '';

var runs_fs_base = '/live_data/xenonnt';

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
      if (err) return res.send(JSON.stringify({message : err.message}));
      items = items.sort(function(a,b) {return parseInt(b)-parseInt(a);});
      return res.send(JSON.stringify(items));
    });
});

function ReadFragments(path, thechannel, max_fragments){
    // Get strax data (up to max_fragments) for a given module and channel 
    // at a given path
    file_buffer = fs.readFileSync(path);
    console.log("Reading frament at " + path);
    var uncompressed = new Buffer(file_buffer.length*3); // it can't do 3x compression, right?
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
	console.log("Reading chunk at " + chunk_name);
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
    console.log("Searching path ", full_path);
    items = fs.readdirSync(full_path);
    var sorted_files = items.filter(function (file) {
	return file.length === 6 ? true : false;
    }).sort(function (a, b) {
	return a < b ? -1 : 1;
    });

    if(sorted_files.length === 0)
	callback([]);

    last_chunk_called = parseInt(sorted_files[sorted_files.length - 1]);

    var pulses =  await PullData(reader, channel, full_path, ret_pulses, n_pulses, 
				 last_file_called, last_chunk_called);
    callback(pulses);

}

router.get('/_get_pulses', ensureAuthenticated, function(req, res){

    // Get pulses from fspath. 
    var db = req.db;
    var options_coll = db.get('options');
    var board_map_coll = db.get('board_map');
    var cable_map_coll = db.get('cable_map');
    var fspath = runs_fs_base;
    var q = url.parse(req.url, true).query;
    var run = q.run;
    var channel = parseInt(q.channel);
    if(typeof channel === 'undefined' || !(channel > 0))
	channel = 0;
    if(typeof run === 'undefined')
	return JSON.stringify({"error": "no run provided"});

    cable_map_coll.find({'pmt' : channel}, function(e, docs) {
      if (e)
        return res.send(JSON.stringify({'error' : e.message}));
      if (docs.length == 0)
        return res.send(JSON.stringify({"error" : "Channel not found"}));
      var board = docs[0]["board"];
      var adc_channel = docs[0]["adc_channel"];
      board_map_coll.find({"board" : board}, function(ee, docss) {
        if (ee)
          return res.send(JSON.stringify({'error' : ee.message}));
        if (docss.length == 0)
          return res.send(JSON.stringify({"error" : "Board not found"}));
        var reader = docss[0]["host"];

	console.log("Getting channel waveforms at " + fspath);
	GetChannelWaveforms(run, reader, adc_channel, fspath, function(pulses){
	  return res.send(JSON.stringify(pulses));
	});
      }); // board_map callback
    }); // cable_map callback
});

router.get("/available_chunks", ensureAuthenticated, function(req, res) {
  var q = url.parse(req.url, true).query;
  var run = q.run;
  if (typeof run === 'undefined') return res.send(JSON.stringify({message : 'Undefined input'}));
  var fspath = runs_fs_base + '/' + run;
    fs.readdir(fspath, function(err, items) {
      if (err) return res.send(JSON.stringify({message : err.message}));
      items = items.filter(function(fn) {return fn.length == 6;}) // no pre/post
                   .sort(function(a,b) {return parseInt(b)-parseInt(a);});
      return res.send(JSON.stringify(items));
    });
});

function GetReader(channel, cable_map_coll, board_map_coll, callback) {
  cable_map_coll.find({'pmt' : parseInt(channel)}, function(e, docs) {
    if (e)
      callback(-1);
    if (docs.length == 0)
      callback(-2);
    var board = docs[0]["adc"];
    board_map_coll.find({"board" : board}, function(ee, docss) {
      if (ee)
        callback(-1);
      if (docss.length == 0)
        callback(-2);
      var reader_id = docss[0]["host"][6]; // reader[i]
      callback(parseInt(reader_id));
      callback(reader_id);
      callback(parseInt(reader_id));
    }); // board_map
  }); // cable_map
}

router.get('/available_threads', ensureAuthenticated, function(req, res) {
  var db = req.db;
  var q = url.parse(req.url, true).query;
  var run = q.run;
  try{
    var channel = q.channel;
  }catch(error){
    return res.send(JSON.stringify({error : 'Invalid channel'}));
  }
  var channel = q.channel;
  var chunk = q.chunk;
  var board_map_coll = db.get('board_map');
  var cable_map_coll = db.get('cable_map');
  if (typeof run === 'undefined' || typeof channel === 'undefined' || typeof chunk === 'undefined')
    return res.send(JSON.stringify({message : 'Undefined input'}));
  var fspath=runs_fs_base + '/' + run + '/' + chunk;
  GetReader(channel, cable_map_coll, board_map_coll, function(reader_id) {
    if (typeof reader_id === 'string' || reader_id == -1 || reader_id == -2)
      return res.send(JSON.stringify({message : reader_id.toString()}));
    fs.readdir(fspath, function(err, files) {
      if (err) return res.send(JSON.stringify({message : err.message}));
      var threads = files.filter(function(fn) {return fn[6] == reader_id;})
                         .map(function(fn){return fn.slice(17);});
      return res.send(JSON.stringify(threads));
    }); // readdir
  }); // GetReader
});

router.get('/get_pulses', ensureAuthenticated, function(req, res) {
  var db = req.db;
  var q = url.parse(req.url, true).query;
  var run = q.run;
  var chunk = q.chunk;
  var thread = q.thread;
  var channel = q.channel;
  if (typeof run === 'undefined' || typeof chunk === 'undefined' || typeof thread === 'undefiend' || typeof channel === 'undefined')
    return res.send(JSON.stringify({message : 'Undefined input'}));
  channel = parseInt(channel);
  GetReader(channel, db.get('cable_map'), db.get('board_map'), function(reader) {
    if (reader == -1 || reader == -2)
      return res.send(JSON.stringify({message : 'Invalid input'}));
    var filepath = runs_fs_base + '/' + run + '/' + chunk + '/reader' + reader + '_reader_0_' + thread;
    fs.readFile(filepath, function(err, data) {
      if (err)
        return res.send(JSON.stringify({message : err.message}));
      var decompressed = Buffer.alloc(data.length*3);
      try{
        lz4.decodeBlock(data, decompressed);
      }catch(error){
        return res.send(JSON.stringify({message : "Caught error: " + error.message}));
      }
      var retpulses = [];
      var idx = 0;
      const strax_header_size=31;
      while (idx < decompressed.length) {
        var frag_idx = 0;
        var frag_channel = decompressed.readInt16LE(idx+frag_idx);
        console.log("This frag is channel " + decompressed.readInt16LE(idx+frag_idx));
        console.log("This frag is channel " + decompressed.readInt16BE(idx+frag_idx));
        frag_idx += 2;
        var frag_dt = decompressed.readInt16LE(idx+frag_idx);
        frag_idx += 2;
        var frag_time_msb = decompressed.readInt32LE(idx+frag_idx);
        frag_idx += 4;
        var frag_time_lsb = decompressed.readInt32LE(idx+frag_idx);
        frag_idx += 4;
        //var frag_time = decompressed.readBigInt64LE(idx+frag_idx);
        //frag_idx += 8; // node version too old
        // can't bitshift because js is 32-bit trash
        var frag_time = parseInt(frag_time_msb.toString(16) + frag_time_lsb.toString(16), 16);
        var frag_length = decompressed.readInt32LE(idx+frag_idx);
        console.log("This frag is " + frag_length + " samples long");
        frag_idx += 4;
        frag_idx += 4; // skip area
        var pulse_length = decompressed.readInt32LE(idx+frag_idx);
        frag_idx += 4;
        var frag_i = decompressed.readInt16LE(idx+frag_idx);
        frag_idx += 2;
        frag_idx += 4; // skip baseline
        frag_idx += 1; // skip reduction
      if (err)
        return res.send(JSON.stringify({message : err.message}));
      data = lz4.decode(data);
        var frag_time = parseInt(frag_time_msb.toString(16) + frag_time_lsb.toString(16), 16);
        var frag_length = decompressed.readInt32LE(idx+frag_idx);
        console.log("This frag is " + frag_length + " samples long");
        frag_idx += 4;
        frag_idx += 4; // skip area
        var pulse_length = decompressed.readInt32LE(idx+frag_idx);
        frag_idx += 4;
        var frag_i = decompressed.readInt16LE(idx+frag_idx);
        frag_idx += 2;
        frag_idx += 4; // skip baseline
        frag_idx += 1; // skip reduction
        if (frag_channel != channel) {
          idx += strax_header_size;
          idx += frag_length*2;
          continue;
        }
        wf = [];
        for (; frag_idx < strax_header_size + frag_length*2; frag_idx += 2)
          wf.push(decompressed.readInt16LE(idx+frag_idx));
        retpulses.push({time: frag_time, pulse_length: pulse_length, frag_i: frag_i,
                        sample: wf, channel: channel});
        idx += frag_idx;
      } // while in chunk
      return res.send(JSON.stringify(retpulses));
    }); // fs.readfile
  }); // getreader
});

module.exports = router;
