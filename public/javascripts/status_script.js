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
    var brokers = ["fdaq00_broker_0"];
    
    for(i in readers){
	var reader = readers[i];
	$.getJSON("/status/get_reader_status?reader="+reader, function(data){
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

    
    for(i in controllers){
    	var controller = controllers[i];
    	$.getJSON("/status/get_controller_status?controller="+controller, (function(c){ return function(data) {
			atts = ['checkin', 'host'];
			for (var i in atts){
				att = atts[i];
				console.log(c+"_"+att);
				document.getElementById(c+"_"+att).innerHTML = data[att];
			}
		};
	}(controller)));
	
	for(i in brokers){
		var broker = brokers[i];
		$.getJSON("/status/get_broker_status?broker="+broker, (function(b){return function(data){
			for(var i in data){
				doc = data[i];
				var idstart = b + '_' + doc['detector'] + '_';
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

    for(i in readers){
	var reader = readers[i];
	$.getJSON("/status/get_reader_history?limit=1000&reader="+reader, function(data){
	    // Can't do anything if no data
	    if(Object.keys(data).length==0)
		return;
	    var host = Object.keys(data)[0];
	    document.last_time_charts[host] = data[host]['rates'][data[host]['rates'].length-1];
	    var series = [
		{"type": "area", "name": "transfer rate", "data": data[host]['rates']},
		{"type": "area", "name": "buffered data", "data": data[host]['buffs']}
	    ];

	    var div = host+"_chartdiv";
	    document.charts[host] = Highcharts.chart(
		div, {
		    chart: {
			zoomType: 'x',
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
