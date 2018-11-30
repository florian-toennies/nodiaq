function GetStatus(i){
    STATUSES = [
	"<span style='color:blue'><strong>Idle</strong></span>",
	"<span style='color:cyan'><strong>Arming</strong></span>",
	"<span style='color:cyan'><strong>Armed</strong></span>",
	"<span style='color:green'><strong>Running</strong></span>",
	"<span style='color:red'><strong>Error</strong></span>",
	"<span style='color:red'><strong>Timeout</strong></span>", 
	"<span style='color:yellow'><strong>Undecided</strong></span>"
    ];
    return STATUSES[i];
}

function UpdateStatusPage(){
    var readers = ["fdaq00_reader_0", "fdaq00_reader_1"];
    var controllers = ['fdaq00_controller_0'];
    var brokers = []; //["fdaq00_broker_0"];
    
    for(i in readers){
	var reader = readers[i];
	$.getJSON("status/get_reader_status?reader="+reader, function(data){
	    var rd = data['host'];
	    document.getElementById(rd+"_status").innerHTML = GetStatus(data['status']);
	    document.getElementById(rd+"_rate").innerHTML	= data['rate'].toFixed(2) + " MB/s";
	    document.getElementById(rd+"_buffer").innerHTML	= data['buffer_length'].toFixed(2) + " MB";
	    document.getElementById(rd+"_mode").innerHTML	= data['run_mode'];
	    document.getElementById(rd+"_run").innerHTML	= data['current_run_id'];
	    document.getElementById(rd+"_check-in").innerHTML	= data['checkin'];

	    if(document.last_time_charts[rd] != data['ts']){
		document.last_time_charts[rd] = data['ts'];
		UpdateChart(rd, data['ts'], data['rate'], data['buffer_length']);
	    }
	});
    }

	// Fill command panel
	var recent = 0;
	var command_length = 20;
	if(typeof document.local_command_queue === "undefined")
		document.local_command_queue = [];
	if(document.local_command_queue.length !== 0){
		// Fetch all ID's newer than the first ID that hasn't been fully acknowledged
		recent = document.local_command_queue[0]['_id'];
		for(var k in document.local_command_queue){
			if('acknowledged' in document.local_command_queue[k] && 'host' in document.local_command_queue[k] &&
				document.local_command_queue[k]['acknowledged'].length !== document.local_command_queue[k]['host'].length)
				recent = document.local_command_queue[k]['_id'];
		}

	}

	$.getJSON("status/get_command_queue?limit=20&id="+recent, function(data){
		var fillHTML="";
		for(var i in data){
		    doc = data[i];
		    var timestamp = parseInt(doc['_id'].substr(0,8), 16)*1000
		    var date = new Date(timestamp);
		    //document.local_command_queue.push(doc);
		    fillHTML += '<div class="panel panel-default" id="'+doc['_id']+'"><div class="panel-heading panel-hover" data-toggle="collapse" href="#collapse'+doc['_id'];
		    fillHTML += '" style="padding:5px;border-bottom:1px solid #ccc"><div class="panel-title"><span data-toggle="collapse" style="color:black" ';
		    fillHTML += 'href="#collapse'+doc['_id']+'">';
		    fillHTML += moment(date).utc().format('DD. MMM. HH:mm') + ' UTC: ';
		    var tcol = "green";
		    if(doc['command'] === 'stop')
			tcol = 'red';
		    else if(doc['command'] === 'arm')
			tcol = 'orange';
		    fillHTML += '<strong style="color:'+tcol+'">' + doc['command'] + '</strong> for detector <strong>' + doc['detector'] + '</strong> from <strong>' + doc['user'] + '</strong>';
		    
		    // See which hosts responded
		    var col = "green";
		    var nhosts =  '-';
		    var nack = '-';
		    if('host' in doc && 'acknowledged' in doc){
			if(doc['host'].length > doc['acknowledged'].length)
			    col = 'red';
			nhosts = doc['host'].length.toString();
			nack = doc['acknowledged'].length.toString();
		    }
		    else if('host' in doc && doc['host'].length>0 && doc['host'][0]!== null)
			nhosts = doc['host'].length.toString();
		    fillHTML += "<strong style='color:"+col+"'>("+nack+"/"+nhosts+")</strong>";
		    fillHTML += '</span></div></div>';
    		    fillHTML += '<div id="collapse'+doc['_id']+'" class="panel-collapse collapse"><div class="panel-body" style="background-color:#ccc;font-size:.75em">';
    		    fillHTML += JSON.stringify(doc, undefined, 4);;
    		    fillHTML += '</div><div class="panel-footer">';
		    //    		fillHTML += 'Panel Footer';
		    fillHTML += '</div></div></div></div>';
		    
		    try{
			$("#"+document.local_command_queue[document.local_command_queue.length-1]).remove();
			document.local_command_queue.splice(document.local_command_queue.length-1, 1);
		    }
		    catch(E){
			//
		    }
		}
		console.log(data);
		$("#command_panel").prepend(fillHTML);
		
		if(document.local_command_queue.length === 0)
			document.local_command_queue = data;
		else{
			for(var j in data)
				document.local_command_queue.unshift(data[j]);
		}
		
		while(document.local_command_queue.length > command_length){
			$("#"+document.local_command_queue[document.local_command_queue.length-1]['_id']).remove();
			document.local_command_queue.splice(document.local_command_queue.length-1, 1);
		}
		
	});
    
    for(i in controllers){
    	var controller = controllers[i];
    	$.getJSON("status/get_controller_status?controller="+controller, (function(c){ return function(data) {
console.log("BOOOOO");
console.log(data);
	    atts = ['checkin', 'host'];
	    list_atts = ['type', 'run_number', 'pulser_freq'];
	    bool_atts = ['s_in', 'muon_veto', 'neutron_veto', 'led_trigger'];
	    for (var i in atts){
		att = atts[i];
		console.log(c+"_"+att);
		document.getElementById(c+"_"+att).innerHTML = data[att];
	    }
	   var html = "";
	   for(var i in data['active']){
	       html += "<li><strong>"+data['active'][i]['type']+': </strong> ';
	       for(var j in bool_atts){
		   if(data['active'][i][bool_atts[j]]==0)
		       html += '<i data-toggle="tooltip" title="'+bool_atts[j]+' inactive" style="color:red" class="fas fa-times-circle"></i>';
		   else if(data['active'][i][bool_atts[j]] == 1)
		       html += '<i data-toggle="tooltip" title="'+bool_atts[j]+' active" style="color:green" class="fas fa-check-circle"></i>';
		   else
		       html += " ? ";
	       }
	       html += "<strong>(" + data['active'][i]['pulser_freq'] + "Hz)</strong></li>";
	   }
	    document.getElementById(c+"_devices").innerHTML=html;
	};}(controller)));
	
	for(i in brokers){
		var broker = brokers[i];
		console.log(broker);
		$.getJSON("status/get_broker_status?broker="+broker, (function(b){return function(data){
			console.log(data);
			for(var i in data){
			    doc = data[i];
			    console.log(doc);
			    var idstart = b + '_' + doc['detector'] + '_';
			    console.log(idstart);
			    atts = ['active', 'comment', 'detector', 'hosts', 'crate_controller', 'diagnosis', 'mode', 'number', 'started_at', 'status', 'stop_after', 'user'];
			    //state ishas
			    document.getElementById(idstart+"detector").innerHTML = "<strong>"+doc['detector']+"</strong>";
			    if(doc['diagnosis'] == 'goal')
			  	document.getElementById(idstart+"state").innerHTML="<strong style='color:green'>Goal</strong>";
			    else if(doc['diagnosis'] == 'processing')
			  	document.getElementById(idstart+"state").innerHTML="<strong style='color:blue'>Processing</strong>";
			    else if(doc['diagnosis'] == 'error')
			  	document.getElementById(idstart+"state").innerHTML="<strong style='color:red'>Error</strong>";
			    var endstring = "&nbsp;&nbsp;<strong>(</strong>" + GetStatus(doc['status']);
			    endstring += '/';
			    if(doc['active'] == 'true')
			  	endstring += "<strong>Active)</strong>";
			    else
			  	endstring += "<strong>Inactive)</strong>";
			    document.getElementById(idstart+"ishas").innerHTML = endstring;
			    
			    var atts = ["mode", "user", "run", 'stop_after'];
			    for(var i in atts){
				var att = atts[i];
				var a = doc[att];
				if(typeof doc[att] === 'undefined')
				    a = "";
				var endstring = "";
				if(att==="mode") endstring = " min";
				document.getElementById(idstart+att).innerHTML = a + endstring;
			    }
			    document.getElementById(idstart+"started").innerHTML = moment(doc['started_at']).format('DD. MMM. hh:mm');
			    if(typeof doc['crate_controller'] !== 'undefined')
				document.getElementById(idstart+"crate_controller").innerHTML = doc['crate_controller'];
			    if(typeof doc['hosts'] !== 'undefined'){
				var html = "";
				for(var j in doc['hosts']){
					html += "<p style='margin-top:1px;margin-bottom:1px'>"+doc["hosts"][j]+"</p>";
				}
			  document.getElementById(idstart+"readers").innerHTML = html;
			}

		  }

		};
		}(broker)));
	}


    }
    
    setTimeout(UpdateStatusPage, 5000);	   
}

function UpdateChart(host, ts, rate, buff){
    if(host in (document.charts) && document.charts[host] != null){
	var tss = (new Date(ts)).getTime();
	document.charts[host].series[0].addPoint([tss, rate], true, true);    
	document.charts[host].series[1].addPoint([tss, buff], true, true);
    }
}
function DrawInitialCharts(){
    document.charts = {};
    document.last_time_charts = {};
    var readers = ["fdaq00_reader_0", "fdaq00_reader_1"];
	var colors = {"rate": "#1c0877", "buff": "#df3470", "third": "#3dd89f"}
    for(i in readers){
	var reader = readers[i];
	$.getJSON("status/get_reader_history?limit=1000&reader="+reader, function(data){
	    // Can't do anything if no data
	    if(Object.keys(data).length==0)
		return;
	    var host = Object.keys(data)[0];
	    document.last_time_charts[host] = data[host]['rates'][data[host]['rates'].length-1];
	    var series = [
		{"type": "area", "name": "transfer rate", "data": data[host]['rates'], 'color': colors['rate']},
		{"type": "area", "name": "buffered data", "data": data[host]['buffs'], 'color': colors['buff']}
	    ];

	    var div = host+"_chartdiv";
	    document.charts[host] = Highcharts.chart(
		div, {
		    chart: {
			zoomType: 'x',
		    },
		    plotOptions: {
            	series: {
               	 	fillOpacity: 0.3,
               	 	lineWidth: 1
            	}	
        	},
		    credits: {
			enabled: false,
		    },
		    title: {
			text: '',
		    },
		    xAxis: {
			type: 'datetime',
		    },
		    yAxis: {
			title: {
			    text: "MB/s",
			},
			min: 0,
		    },
		    legend: {
			enabled: false,
		    },
		    series: series,
		});
	});
    }


}
