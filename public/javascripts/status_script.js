var CHECKIN_TIMEOUT=30;
document.ceph_chart = null;
document.last_time_charts = {};

function GetStatus(i, checkin){
    var STATUSES = [
        "<span style='color:blue'><strong>Idle</strong></span>",
	"<span style='color:cyan'><strong>Arming</strong></span>",
        "<span style='color:cyan'><strong>Armed</strong></span>",
        "<span style='color:green'><strong>Running</strong></span>",
        "<span style='color:red'><strong>Error</strong></span>",
        "<span style='color:red'><strong>Timeout</strong></span>",
        "<span style='color:yellow'><strong>Undecided</strong></span>"
    ];
    if(checkin < CHECKIN_TIMEOUT)
	return STATUSES[i];
    STATUSES = [
	"<span style='color:red'><strong>Idle</strong></span>",
	"<span style='color:red'><strong>Arming</strong></span>",
	"<span style='color:red'><strong>Armed</strong></span>",
	"<span style='color:red'><strong>Running</strong></span>",
	"<span style='color:red'><strong>Error</strong></span>",
	"<span style='color:red'><strong>Timeout</strong></span>",
	"<span style='color:red'><strong>Undecided</strong></span>"
    ];
    return STATUSES[i];    
}
function FYouButton(buttonid){
    $("#"+buttonid).mouseover(function(){
	var t = $(window).height()*Math.random();
	var l = $(window).width()*Math.random();
	$("#"+buttonid).css({'z-index': 10, 'height': '31px', 
			     'top': t, 'left': l, 'position':'absolute'});
    });
}

function RedrawRatePlot(){
    var history = $("#menu_history_s").val();
    var resolution = $("#menu_resolution_s").val();
    var variable = $("#menu_variable_s").val();

    var readers = ["reader0_reader_0", 'reader1_reader_0', 'reader2_reader_0', "reader5_reader_0", "reader4_reader_0"];
    var controllers = ['reader0_controller_0', "reader5_controller_0", "reader4_controller_0"];
    document.reader_data = {};
    var colors = {"rate": "#1c0877", "buff": "#df3470", "third": "#3dd89f"}
    DrawProgressRate(0);
    var limit = (new Date()).getTime() - parseInt(history)*1000;
    for(i in readers){
	var reader = readers[i];
	$.getJSON("status/get_reader_history?limit="+limit+"&res="+resolution+"&reader="+reader, 
		  function(data){
		      for (var key in data) {
			  // check if the property/key is defined in the object itself, not in parent
			  if (!data.hasOwnProperty(key)) 
			      continue;		
			  document.reader_data[key] = data[key];
		      }
		      if(Object.keys(document.reader_data).length == readers.length){
			  DrawProgressRate(100);
			  DrawInitialRatePlot();
		      }
		      else
			  DrawProgressRate(readers.length);
		  });
    }
    
}
function DrawProgressRate(prog){
    var rate_chart = 'rate_chart';
    if(prog === 0){
	document.getElementById(rate_chart).innerHTML = '<br><br><br><div class="progress"><div id="PBAR" class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div></div><p class="text-center"><strong>Polling data for chart</strong></p>';
    }
    else if(prog===100)
	document.getElementById(rate_chart).innerHTML = "";
    else{
	prog = Math.floor(100*(Object.keys(document.reader_data).length/prog));
	$('#PBAR').css('width', prog+'%').attr('aria-valuenow', prog);  
    }
}

function DrawInitialRatePlot(){
    
    // Convert data dict to highcharts format
    var series = [];
    for(var key in document.reader_data){
	if(!document.reader_data.hasOwnProperty(key))
	    continue;
	var rates = {};
	if($("#menu_variable_s").val() == "rate")
	    rates = {"type": "line", 
		     "name": key+" rate", 
		     "data": document.reader_data[key]['rates']};
	else if($("#menu_variable_s").val() == "buff")
	    rates = {"type": "area", 
		      "name": key+" buffer", 
		      "data": document.reader_data[key]['buffs']};
	series.push(rates);

    }
    //{"type": "area", "name": "transfer rate", "data": data[host]['rates'], 'color': colors['rate']},
    //{"type": "area", "name": "buffered data", "data": data[host]['buffs'], 'color': colors['buff']}
    

    var chart_opts = {
        chart: {
            zoomType: 'xy',
//            margin: [5, 5, 20, 80],
        },
        plotOptions: {
            series: {
                fillOpacity: 0.3,
		lineWidth: 1
	    },
	    //line: {
	//	marker: false
	 //   },
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
            enabled: true,
	},
	series: series,
    };
    var div = 'rate_chart';
    document.RatePlot = Highcharts.chart(div, chart_opts);

}

function DrawInitialStatus(){
    return;
    var readers = ["reader0_reader_0", 'reader1_reader_0', 'reader2_reader_0', "reader4_reader_0", "reader5_reader_0"];
    html = "<h5 style='width:100%;background-color:#151675;color:white;padding:3px;padding-left:5px;'>Readout Node Status</h5>";
    for(var i in readers){
	html += "<div id='"+readers[i]+"_statdiv' style='width:100%;'><strong>"+readers[i]+" </strong>";
        html += "<span id='"+readers[i]+"_status'></span>&nbsp;";
	html += "<span id='"+readers[i]+"_rate'></span> (Buff: ";
	html += "<span id='"+readers[i]+"_buffer'></span>)&nbsp;&nbsp;(";
	html += "<span id='"+readers[i]+"_check-in'></span>)</div>";
    }
    document.last_time_charts = {};
    document.getElementById("reader_panel").innerHTML = html;
}

function UpdateStatusPage(){
    var readers = ["reader0_reader_0", 'reader1_reader_0', 'reader2_reader_0', 'reader4_reader_0', 'reader5_reader_0'];
    var controllers = ['reader0_controller_0', 'reader4_controller_0', 'reader5_controller_0'];
    var brokers = []; //["fdaq00_broker_0"]; 

    UpdateCommandPanel();
    UpdateCrateControllers(controllers);
    UpdateFromReaders(readers);
    UpdateCeph();
    setTimeout(UpdateStatusPage, 5000);
}

/*function MakeCephGauge(){

    document.ceph_chart = Highcharts.chart('ceph_chartdiv', Highcharts.merge(
	{
	    chart: { type: 'solidgauge'},
	    title: null,
	    pane: {
		center: ['50%', '90%'],
		size: '140%',
		startAngle: -90,
		endAngle: 90,
		background: {
		    backgroundColor:
		    Highcharts.defaultOptions.legend.backgroundColor || '#EEE',
		    innerRadius: '60%',
		    outerRadius: '100%',
		    shape: 'arc'
		}
	    },	    
	    tooltip: {
		enabled: false
	    },	    
	    // the value axis
	    yAxis: {
		stops: [
		    [0.1, '#55BF3B'], // green
		    [0.5, '#DDDF0D'], // yellow
		    [0.9, '#DF5353'] // red
		],
		lineWidth: 0,
		minorTickInterval: null,
		tickAmount: 2,
		title: {y: -70},
		labels: {y: 16}
	    },
	    plotOptions: {
		solidgauge: {
		    dataLabels: {
			y: 5,
			borderWidth: 0,
			useHTML: true
		    }
		}
	    }	    	    
	}, {
	yAxis: {
	    min: 0,
	    max: 100,
	    title: {
		text: 'Buffer Capacity'
	    }
	},
	credits: {
	    enabled: false
	},

	series: [{
	    name: 'Storage Used',
	    data: [0.],
	    dataLabels: {
	    format:
	    '<div style="text-align:center">' +
		'<span style="font-size:15px">{y:.2f}</span><br/>' +
		'<span style="font-size:8px;opacity:0.4">%</span>' +
		'</div>'
	    },
	    tooltip: {
		valueSuffix: ' %'
	    }
	}]

    }));
}
*/
function UpdateCeph(){
    $.getJSON("hosts/get_host_status?host=ceph",
	      function(data){
		  //if(document.ceph_chart == null){
		   //   MakeCephGauge();
		 // }
		  document.getElementById("ceph_filltext").innerHTML = 
		      ((data['ceph_size']-data['ceph_free'])/1e12).toFixed(2) + "/" +
		      + (data['ceph_size']/1e12).toFixed(2) + "TB";
		  document.getElementById('ceph_status').innerHTML = data['health'];
		  if(data['health'] == 'HEALTH_OK')
		      $("#ceph_status").css("color", "green");
		  else
		      $("#ceph_status").css("color", "red");
		  
		  //document.ceph_chart.series[0].addPoint(
		  //[100*(data['ceph_size']-data['ceph_available'])/data['ceph_size']], true, true);

		  var osds = data['osds'];		  
		  osds = osds.sort((a, b) => parseFloat(a.id) - parseFloat(b.id));
		  tot_html = "";
		  if(document.getElementById('osd_div').innerHTML == ""){
		      for(var i in osds){
			  var html = "<div class='col-xs-12 col-sm-6' style='height:30px'>"; 
			  html += "<strong style='float:left'>OSD " +
			      osds[i]['id'] + "&nbsp; </strong>";
			  html += "<span style='font-size:10px'>Rd: ";
			  html += "<span id='osd_"+i+"_rd'></span> (";
			  html += "<span id='osd_"+i+"_rd_bytes'></span>)";
			  html += "&nbsp;Wrt: <span id='osd_"+i+"_wr'></span> (";
			  html += "<span id='osd_"+i+"_wr_bytes'></span>/s)</span>";
			  
			  html += '<div class="progress" style="height:5px;" id="osd_' + i + '_progress">';
			  html += '<div id="osd_' + i + '_capacity" class="progress-bar" role="progressbar" style="width:0%"></div></div></div>';
			  tot_html += html;
		      }
		      document.getElementById('osd_div').innerHTML = tot_html;
		  }
		  UpdateOSDs(data);
	      });
}

function ToHumanBytes(number){
    if(number > 1e12)
	return (number/1e12).toFixed(2) + " TB";
    if(number > 1e9)
	return (number/1e9).toFixed(2) + " GB";
    if(number > 1e6)
	return (number/1e6).toFixed(2) + " MB";
    if(number > 1e3)
	return (number/1e3).toFixed(2) + " kB";
    return number + " B";
}

function UpdateOSDs(data){
    for(var i in data['osds']){
	var j = data['osds'][i]['id'];
	$("#osd_" + j + "_rd").text(data['osds'][i]['rd ops']);
	$("#osd_" + j + "_rd_bytes").text(ToHumanBytes(data['osds'][i]['rd data']));
	$("#osd_" + j + "_wr").text(data['osds'][i]['wr ops']);
	$("#osd_" + j + "_wr_bytes").text(ToHumanBytes(data['osds'][i]['wr data']));
	$("#osd_" + j + "_capacity").width(parseInt(100*data['osds'][i]['used'] /
						    (data['osds'][i]['used'] +
						     data['osds'][i]['avail']))+"%");
	console.log("OSD");
	console.log(data['osds'][i]);
	$("#osd_" + j + "_progress").prop('title', ToHumanBytes(data['osds'][i]['used']) + " used of " + ToHumanBytes(data['osds'][i]['used'] + data['osds'][i]['avail']));
    }

}

function UpdateFromReaders(readers){

    for(i in readers){
        var reader = readers[i];
        $.getJSON("status/get_reader_status?reader="+reader, function(data){
            var rd = data['host'];
	    if(data['checkin'] > CHECKIN_TIMEOUT)
		$("#"+rd+"_statdiv").css('color', 'red');
	    else
		$("#"+rd+"_statdiv").css('color', 'black');
            document.getElementById(rd+"_status").innerHTML = GetStatus(data['status'], data['checkin']);
            document.getElementById(rd+"_rate").innerHTML   = data['rate'].toFixed(2);// + " MB/s";
//            document.getElementById(rd+"_buffer").innerHTML = data['buffer_length'].toFixed(2) + " MB";
            //document.getElementById(rd+"_mode").innerHTML   = data['run_mode'];
            //document.getElementById(rd+"_run").innerHTML    = data['current_run_id'];
            document.getElementById(rd+"_check-in").innerHTML   = data['checkin'];

            if(document.last_time_charts[rd] == undefined ||
	       document.last_time_charts[rd] != data['ts']){
                document.last_time_charts[rd] = data['ts'];
		
		// Chart auto update
		var update_name = "";
		var val = null;
		if($("#menu_variable_s").val() == "rate"){
		    update_name = data['host'] + " rate";
		    val = data['rate'];
		}
		else if($("#menu_variable_s").val() == "buff"){
		    update_name = data['host'] + " buff";
		    val = data['buffer_length'];
		}
		// Trick to only update drawing once per seven readers (careful it doesn't bite you)
		var update = false;
		if(data['host'] == 'reader0_reader_0') 
		    update=true;
		UpdateMultiChart(data['ts'], val, update_name, update);
	    }
        });
    }
}

function UpdateCrateControllers(controllers){

    for(i in controllers){
        var controller = controllers[i];
        $.getJSON("status/get_controller_status?controller="+controller, 
		  (function(c){ return function(data) {
		      atts = ['checkin', 'status'];
		      //list_atts = ['type', 'run_number', 'pulser_freq'];
	              bool_atts = ['s_in', 'muon_veto', 'neutron_veto', 'led_trigger'];
		      for (var i in atts){
			  att = atts[i];

			  if(att!='status')
			      document.getElementById(c+"_"+att).innerHTML = data[att];
			  else{		
			      document.getElementById(c+"_"+att).innerHTML = GetStatus(data[att], data['checkin']);
			  }
		      }
		      var html = "";
		      for(var i in data['active']){
			  html += "<strong>"+data['active'][i]['type']+': </strong> ';
			  for(var j in bool_atts){
			      if(data['active'][i][bool_atts[j]]==0)
				  html += '<i data-toggle="tooltip" title="'+bool_atts[j]+' inactive" style="color:red" class="fas fa-times-circle"></i> ';
			      else if(data['active'][i][bool_atts[j]] == 1)
				  html += '<i data-toggle="tooltip" title="'+bool_atts[j]+' active" style="color:green" class="fas fa-check-circle"></i> ';
			      else
				  html += " ? ";
			  }
			  html += "<strong>(" + data['active'][i]['pulser_freq'] + "Hz)</strong>";
		      }
		      if(html=="") html="no devices active";
		      document.getElementById(c+"_devices").innerHTML=html;
		  };}(controller)));
    }
}

function UpdateCommandPanel(){
    // Fill command panel                                                                            
    var recent = 0;
    var command_length = 20;
    if(typeof document.local_command_queue === "undefined")
        document.local_command_queue = [];    
    if(document.local_command_queue.length !== 0){
        // Fetch all ID's newer than the first ID that hasn't been fully acknowledged   
        recent = document.local_command_queue[0]['_id'];
        /*for(var k in document.local_command_queue){
            if('acknowledged' in document.local_command_queue[k] && 'host' in 
	       document.local_command_queue[k] &&
               document.local_command_queue[k]['acknowledged'].length !== 
	       document.local_command_queue[k]['host'].length)
		recent = document.local_command_queue[k]['_id'];
        }*/
    }
    $.getJSON("status/get_command_queue?limit=20&id="+recent, function(data){
        var fillHTML="";

        for(var i in data){	    
            doc = data[i];
            var timestamp = parseInt(doc['_id'].substr(0,8), 16)*1000
            var date = new Date(timestamp);
            //document.local_command_queue.push(doc);                                        

	    // If this element exists then remove it cause it means
	    // we might have an update so want to overwrite
	    if(document.getElementById(doc['_id']) != null){
		$("#"+doc['_id']).remove();
	    }
    
            fillHTML += '<div class="command_panel_entry panel panel-default" id="'+doc['_id']+'"><div class="panel-heading panel-hover" data-toggle="collapse" href="#collapse'+doc['_id'];
            fillHTML += '" style="padding:5px;border-bottom:0px solid #ccc"><div class="panel-title"><span data-toggle="collapse" style="color:black" ';
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
            //                  fillHTML += 'Panel Footer';                                      
            fillHTML += '</div></div></div></div>';
	    
            //try{
	    //	$("#"+document.local_command_queue[document.local_command_queue.length-1]).remove();
            //    document.local_command_queue.splice(document.local_command_queue.length-1, 1);
            //}
            //catch(E){
                //                                                                               
            //}
	}
	
        $("#command_panel").prepend(fillHTML);
	
        //if(document.local_command_queue.length === 0)
        //document.local_command_queue = data;
        //else{
        for(var j=data.length-1; j>=0; j-=1)// in data)
            document.local_command_queue.unshift(data[j]);
	//}
	
        while(document.local_command_queue.length > command_length){
            $("#"+document.local_command_queue[document.local_command_queue.length-1]['_id']).remove();
            document.local_command_queue.splice(document.local_command_queue.length-1, 1);
        }
	
    });
    
}



function UpdateStatusPageOld(){
    var readers = ["reader0_reader_0", 'reader1_reader_0', 'reader2_reader_0', 'reader4_reader_0', 'reader5_reader_0'];
    var controllers = ['reader0_controller_0', 'reader4_controller_0', 'reader5_controller_0'];
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
		    fillHTML += '" style="padding:5px;border-bottom:0px solid #ccc"><div class="panel-title"><span data-toggle="collapse" style="color:black" ';
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
	    atts = ['checkin', 'host', 'status'];
	    list_atts = ['type', 'run_number', 'pulser_freq'];
	    bool_atts = ['s_in', 'muon_veto', 'neutron_veto', 'led_trigger'];
	    for (var i in atts){
		att = atts[i];

		if(att!='status')
		    document.getElementById(c+"_"+att).innerHTML = data[att];
		else
		    document.getElementById(c+"_"+att).innerHTML = GetStatus[data[att]];
	    }
	   var html = "";
	   for(var i in data['active']){
	       html += "<li><strong>"+data['active'][i]['type']+': </strong> ';
	       for(var j in bool_atts){
		   if(data['active'][i][bool_atts[j]]==0)
		       html += '<i data-toggle="tooltip" title="'+bool_atts[j]+' inactive" style="color:red" class="fas fa-times-circle"></i> ';
		   else if(data['active'][i][bool_atts[j]] == 1)
		       html += '<i data-toggle="tooltip" title="'+bool_atts[j]+' active" style="color:green" class="fas fa-check-circle"></i> ';
		   else
		       html += " ? ";
	       }
	       html += "<strong>(" + data['active'][i]['pulser_freq'] + "Hz)</strong></li>";
	   }
	    if(html=="") html="no devices active";
	    document.getElementById(c+"_devices").innerHTML=html;
	};}(controller)));
	
	for(i in brokers){
		var broker = brokers[i];

		$.getJSON("status/get_broker_status?broker="+broker, (function(b){return function(data){

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

function UpdateMultiChart(ts, val, host, update){
    var tss = (new Date(ts)).getTime();
    if(typeof(document.RatePlot)=='undefined')
	return;
    for(var i in document.RatePlot.series){
	if(document.RatePlot.series[i].name == host)
	    document.RatePlot.series[i].addPoint([tss, val], true, update);
    }
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
    var readers = ["reader0_reader_0", 'reader1_reader_0', 'reader2_reader_0', 'reader4_reader_0', 'reader5_reader_0'];
    var controllers = ['reader0_controller_0', 'reader4_controller_0', 'reader5_controller_0'];

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
			margin: [5, 5, 20, 80],
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
