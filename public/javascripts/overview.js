var prefix = 'xenonnt/';

function GetStatus(i){
    var STATUSES = [
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

function GetOptionsFiles(callback){
    var tpc_boards = "xenon1t_board_definitions";
    var tpc_cc = "xenon1t_cc_definition";
    var tpc_cable_map = "xenon1t_cable_map";
    var n_maps = 3;

    document.cabling_json_data = {};

    $.getJSON(prefix+"options/options_json?name="+tpc_boards, function(data){
	document.cabling_json_data['tpc_boards'] = data;
	if(Object.keys(document.cabling_json_data).length == n_maps)
	    ParseOptions(callback);	
    });
    $.getJSON(prefix+"options/options_json?name="+tpc_cc,function(data){
	document.cabling_json_data['tpc_cc'] = data;
	if(Object.keys(document.cabling_json_data).length == n_maps)
            ParseOptions(callback);
    });
    $.getJSON(prefix+"options/options_json?name="+tpc_cable_map,function(data){
	document.cabling_json_data['tpc_cable_map'] = data;
	if(Object.keys(document.cabling_json_data).length == n_maps)
            ParseOptions(callback);
    });
}

function ParseOptions(callback){
    // Puts option files into node list format and returns
    var tpc_boards = document.cabling_json_data['tpc_boards']['boards'];
    var tpc_readers = {};
    var node_list = [];
    var key = 0;
    
    // Add TPC parent
    document.detector_keys = {"tpc": 0};
    var dispatcher_parent = 0;
    node_list.push({
	"key": key,
	"name": "TPC",
	"type": 'detector',
	//'rate': '0',
	//'mode': 'none',
	'status': 0,
	//'number': 0
    });
    key += 1;
    
    // First pass through board list to get readers
    for(var i in tpc_boards){	
	var k = Object.keys(tpc_readers);
	var in_list = false;
	for(var j in k){
	    if(k[j] == tpc_boards[i]['host']){
		in_list = true;
		break;
	    }
	}
	if(in_list)
	    continue;
	var type = "reader";
	if(tpc_boards[i]['type'] != 'V1724')
	    type = 'crate_controller';
	node_list.push({
	    "key": key,
	    "parent": dispatcher_parent,
	    "name": tpc_boards[i]['host'],
	    "type": type,
	    //"rate": "0",
	    "check-in": "-1",
	    "status": "none",
	    "buffer": "0"
	});
	tpc_readers[tpc_boards[i]['host']] = key;
	key+=1;
    }
    document.reader_keys = tpc_readers;
    //console.log(tpc_boards);
    // Second pass through board list to get digitizers
    var boards = {};
    for(var i in tpc_boards){
	node_list.push({
	    "key": key,
	    "parent": tpc_readers[tpc_boards[i]['host']],
	    "name": tpc_boards[i]['board'].toString(),
	    "type": tpc_boards[i]['type'],
	    //"rate": 0,
	});
	boards[tpc_boards[i]['board'].toString()] = key;
	key += 1;
    }
    document.board_key_list = boards;

    //Now render tree
    document.tree_node_list = node_list;
    callback();
}

function DrawTree(){
    var $ = go.GraphObject.make;  // for conciseness in defining templates
    myDiagram =
        $(go.Diagram, "graph_canvas",  // must be the ID or reference to div
          {
            "toolManager.hoverDelay": 100,  // 100 milliseconds instead of the default 850
              allowCopy: false,
              layout:  // create a TreeLayout for the family tree
              $(go.TreeLayout,
                { angle: 90, nodeSpacing: 20, 
		  layerSpacing: 40, 
		  layerStyle: go.TreeLayout.LayerUniform,
		  alignment: go.TreeLayout.AlignmentBusBranching,
		})
          });

    // On click we want to plot the rate history of our object
    myDiagram.addDiagramListener(
	"ObjectSingleClicked",
	function(e){
	    var dat = document.goDiagram.model.findNodeDataForKey(e.subject.part.data.key);
	    PlotThingOnDiv(dat['type'], dat['name']);	    
	});
    var bluegrad = '#151675';
    var pinkgrad = '#f64870';
    var greengrad = '#00d5a0';
    
      // Set up a Part as a legend, and place it directly on the diagram
    /*myDiagram.add(
        $(go.Part, "Table",
          { position: new go.Point(50, -100), selectable: false },
          $(go.TextBlock, "Key",
            { row: 0, font: "700 14px Droid Serif, sans-serif" }),  // end row 0
          $(go.Panel, "Horizontal",
            { row: 1, alignment: go.Spot.Left },
            $(go.Shape, "Rectangle",
              { desiredSize: new go.Size(30, 30), fill: bluegrad, margin: 5 }),
            $(go.TextBlock, "Readers",
              { font: "700 13px Droid Serif, sans-serif" })
          ),  // end row 1
          $(go.Panel, "Horizontal",
            { row: 2, alignment: go.Spot.Left },
            $(go.Shape, "Rectangle",
              { desiredSize: new go.Size(30, 30), fill: pinkgrad, margin: 5 }),
            $(go.TextBlock, "Digitizers",
              { font: "700 13px Droid Serif, sans-serif" })
          ),  // end row 2
	  $(go.Panel, "Horizontal",
            { row: 3, alignment: go.Spot.Left },
            $(go.Shape, "Rectangle",
              { desiredSize: new go.Size(30, 30), fill: greengrad, margin: 5 }),
            $(go.TextBlock, "Crate Controller",
              { font: "700 13px Droid Serif, sans-serif" })
          )  // end row 3 
         ));
    */

    // get tooltip text from the object's data
      function tooltipTextConverter(obj) {
        var str = "";
        str += "Type: " + obj.type;          
        return str;
      }

    // define tooltips for nodes
      var tooltiptemplate =
        $("ToolTip",
          { "Border.fill": "whitesmoke", "Border.stroke": "black" },
          $(go.TextBlock,
            {
              font: "bold 8pt Helvetica, bold Arial, sans-serif",
              wrap: go.TextBlock.WrapFit,
              margin: 5
            },
            new go.Binding("text", "", tooltipTextConverter))
        );

    // define Converters to be used for Bindings
      function typeBrushConverter(node) {
          if (node['type'] === "reader" || node['type'] === "crate_controller" || 
	      node['type'] === 'detector') {
	      if(node['status'] === 0)
		  return '#aaaaaa';
	      if(node['status'] === 1 || node['status'] === 2)
		  return 'orange';
	      if(node['status'] === 3)
		  return greengrad;
	      return 'red';
	  }
          if (node['type'] === "V1724") return bluegrad;
	  if (node['type'] === "V2718") return '#888888';
          return "orange";
      }
    function rateConverter(node){
	if(node['type'] === 'reader' || node['type'] === 'V1724' ||
	  node['type'] === 'detector') return node['rate'];
	return null;//'';
    }
    // replace the default Node template in the nodeTemplateMap
      myDiagram.nodeTemplate =
        $(go.Node, "Auto",
          { deletable: false, toolTip: tooltiptemplate },
          new go.Binding("text", "name"),
          $(go.Shape, "Rectangle",
            {
              fill: "lightgray",
              stroke: null, strokeWidth: 0,
              stretch: go.GraphObject.Fill,
              alignment: go.Spot.Center
            },
            new go.Binding("fill", "", typeBrushConverter)),
	  $(go.Panel, "Table",
            $(go.TextBlock,
              {
		  font: "700 12px Droid Serif, sans-serif",
		  textAlign: "center",
		  stroke: 'white',
		  margin: 5, maxSize: new go.Size(160, NaN),
		  row: 0, column: 0
              },
              new go.Binding("text", "name")),
	    $(go.TextBlock,
              {
		  font: "700 12px Droid Serif, sans-serif",
		  textAlign: "left",
		  stroke: 'white',
		  margin: 5, 
		  maxSize: new go.Size(160, NaN),
		  row: 1, column: 0,
		  visible: false,
              },
              new go.Binding("text", "", rateConverter),
	      new go.Binding("visible", "", function(data){
		  if(typeof(data['rate'])!='undefined') return true; return false;}),	
	    ),
	    $(go.TextBlock,
              {
                  font: "700 12px Droid Serif, sans-serif",
                  textAlign: "left",
                  stroke: 'white',
                  margin: 5,
                  maxSize: new go.Size(160, NaN),
                  row: 2, column: 0,
                  visible: false,
              },
              new go.Binding("text", "mode"),
              new go.Binding("visible", "", function(data){
                  if(typeof(data['mode'])!='undefined') return true; return false;}),
            ),
	    $(go.TextBlock,
              {
                  font: "700 12px Droid Serif, sans-serif",
                  textAlign: "left",
                  stroke: 'white',
                  margin: 5,
                  maxSize: new go.Size(160, NaN),
                  row: 3, column: 0,
                  visible: false,
              },
              new go.Binding("text", "number", function(number){ return "Run "+number.toString();}),
              new go.Binding("visible", "", function(data){
                  if(typeof(data['number'])==typeof(int) && data['number'] >= 0) return true; return false;}),
            
	   )),

        );

      // define the Link template
      myDiagram.linkTemplate =
        $(go.Link,  // the whole link panel
          { routing: go.Link.Orthogonal, corner: 5, selectable: false },
          $(go.Shape, { strokeWidth: 3, stroke: '#424242' }));  // the gray link shape
    // create the model for the family tree
    myDiagram.model = new go.TreeModel(document.tree_node_list);
    
    document.getElementById('zoom_to_fit').addEventListener('click', function() {
	myDiagram.zoomToFit();
    });

    document.goDiagram = myDiagram;
    //document.getElementById('centerRoot').addEventListener('click', function() {
    //myDiagram.scale = 1;
    //myDiagram.scrollToRect(myDiagram.findNodeForKey(0).actualBounds);
    //});
}

function UpdateFromReaders(){
    var readers = ["reader0_reader_0", "reader1_reader_1", 'reader2_reader_2',
                   'reader3_reader_3', 'reader4_reader_4', 'reader6_reader_6',
                   'reader7_reader_7'];
    var controllers = ['reader0_controller_0'];
    for(i in readers){
        var reader = readers[i];
        $.getJSON(prefix+"status/get_reader_status?reader="+reader, function(data){
	    var rd = data['host'];

	    // Get key for this node
	    var key = document.reader_keys[rd];
	    var dat = document.goDiagram.model.findNodeDataForKey(key);
	    document.goDiagram.model.setDataProperty(dat, "rate", data['rate'].toFixed(2) + " MB/s");
	    document.goDiagram.model.setDataProperty(dat, "status", (data['status']));
	    document.goDiagram.model.setDataProperty(dat, "buffer", data['buffer_length'].toFixed(2) + " MB/s");
	    Object.keys(data['boards']).forEach(function(digi) {				
		var key = document.board_key_list[digi.toString()];		
		var dat = document.goDiagram.model.findNodeDataForKey(key);
		document.goDiagram.model.setDataProperty(dat, "rate", 
							 data['boards'][digi].toFixed(2) + " MB/s");
	    });
        });
    }
    for(i in controllers){
        var controller = controllers[i];
	$.getJSON(prefix+"status/get_controller_status?controller="+controller, function(data){
	    var rd = data['host'];

            // Get key for this node                                                                    
            var key = document.reader_keys[rd];
            var dat = document.goDiagram.model.findNodeDataForKey(key);
            //document.goDiagram.model.setDataProperty(dat, "rate", data['rate'].toFixed(2) + " MB/s");
            document.goDiagram.model.setDataProperty(dat, "status", (data['status']));
            //document.goDiagram.model.setDataProperty(dat, "buffer", data['buffer_length'].toFixed(2) + " MB/s");
	});
    }
    UpdateDetectors(function(){setTimeout(UpdateFromReaders, 5000)});
}

function UpdateDetectors(callback){
    $.getJSON(gp+"/status/get_broker_status", function(data){
	for(var i in data){
            var doc = data[i];
            var det = doc['detector'];
	    console.log(doc);

	    var key = document.detector_keys[det];
	    if(typeof(key) === 'undefined')
		continue;
            var dat = document.goDiagram.model.findNodeDataForKey(key);
	    console.log(dat);
            document.goDiagram.model.setDataProperty(dat, "rate",
                                                     doc['rate'].toFixed(2) + " MB/s");
	    document.goDiagram.model.setDataProperty(dat, 'status', doc['status']);
	    document.goDiagram.model.setDataProperty(dat, 'mode',doc['mode']);
	    document.goDiagram.model.setDataProperty(dat, 'number',doc['number']);	    
		
	}
	callback();
    });
}
/*
function doUpdate(){
    
    document.d3_graph.updateReaderText("reader0_reader_0", "balls");
    setTimeout(doUpdate, 1000);
}


function DrawMap(){
    var objects = [];
    var config = [];
    var digitizer_radius = 15;
    var reader_radius = 110;
    var dispatcher_radius = 110;
    var digitizer_distance = 50;
    var reader_distance = 20;
    var colors = {
	"V1724": d3.color("#f64870"),
	"reader": d3.color("#151675"),
	"channel": d3.color("#f2f1f0"),
	"dispatcher": d3.color("#00d5a0"),
	"V2718": d3.color("#3d3c38")
    };
    var nodes = [];
    var reader_links = [];
    var digi_links = [];
    var readers = [];
    var current_id = 0;
    var tpc_boards = document.cabling_json_data['tpc_boards'];
    // First pass: get readers
    for(var i=0; i<tpc_boards['boards'].length; i+=1){
	var breakout = false;
	for(var j=0; j<readers.length; j+=1){
	    if(readers[j] == tpc_boards['boards'][i]['host'])
		breakout = true;
	}
	if(breakout)
	    continue;
	readers.push(tpc_boards['boards'][i]['host']);
	nodes.push({
	    "id": current_id,
	    "name": tpc_boards['boards'][i]['host'],
	    "text": tpc_boards['boards'][i]['host'],
	    "color": colors['reader'],
	    "type": 'reader',
	    "detector": "TPC",
	    "radius": reader_radius,
	});
	current_id +=1;
    }

    // Already need canvas dimensions
    var canvas = document.getElementById("d3_canvas");
    var width = Math.max(800, window.innerWidth-30);
    var height = Math.max(600, window.innerHeight-30);
    canvas.width=width;
    canvas.height=height; //,width=1300,height=600;    

    // Set Initial position for nodes
    var host_positions = [];
    for(var i=0; i<nodes.length; i+=1){
	var phi = i*((2*3.14159)/nodes.length);
	//var ri = Math.max(width/2, height/2, Math.sqrt(Math.pow(width/2, 2) + Math.pow(height/2,2)));
	var ri = .3*Math.sqrt(Math.pow(width/2, 2) + Math.pow(height/2,2));
	var rx = ri*Math.sin(phi);
	var ry = ri*Math.cos(phi);
	nodes[i]['x'] = rx;
	nodes[i]['y'] = ry;
	host_positions[nodes[i]['name']] = {
	    'x': rx*1.4,
	    'y': ry*1.4
	}
    }

    var last_reader = current_id-1;
    // Second pass: get boards
    for(var i=0; i<tpc_boards['boards'].length; i+=1){
	nodes.push({
	    "id": current_id,
	    "name": tpc_boards['boards'][i]['board'].toString(),
	    "text": tpc_boards['boards'][i]['board'].toString(),
	    "type": tpc_boards['boards'][i]['type'],
	    "color": colors[tpc_boards['boards'][i]['type']],
	    "reader": tpc_boards['boards'][i]['host'],
	    "radius": digitizer_radius,
	    'x': host_positions[tpc_boards['boards'][i]['host']]['x'],
	    'y': host_positions[tpc_boards['boards'][i]['host']]['y'],
	});
	current_id += 1;
    }
    last_digitizer = current_id-1;
    // Third pass: get channels

    // Dispatcher: do canvas first to fix position
    nodes.push({
        "id": current_id,
        "name": "Dispatcher",
	"text": "Dispatcher",
        "type": "dispatcher",
        "color": colors["dispatcher"],        
        "radius": dispatcher_radius,
	"fx": canvas.width/2,
	"fy": canvas.height/2
    });
    var dispatcher_id = current_id;
    current_id+=1;
    // Fourth pass: define links
    for(var i=0; i<=last_reader; i+=1){
	var reader = nodes[i]['name'];
	reader_links.push({"source": i, "target": dispatcher_id, "distance": reader_distance})
	for(var j=last_reader+1; j<=last_digitizer; j+=1){
	    var host = nodes[j]['reader'];
	    if(host == reader)
		digi_links.push({"source": j, "target": i, "distance": digitizer_distance})
	}
    }

    var s = new relation;
    document.d3_graph =  s;
    s.setNodes(nodes);
    s.setReaderLinks(reader_links, reader_distance);    
    s.setDigiLinks(digi_links, digitizer_distance);
    s.setCanvas(canvas);
    s.setSize(width, height);
    console.log($("#d3_canvas").width());
    console.log($("#d3_canvas").height());
    //s.setRadius(12);
    //var link_length = Math.max($("#d3_canvas").innerWidth()/8,
    //$("#d3_canvas").innerHeight()/8,
    //150);
    //s.setLinkLength(link_length);
    s.setCharge(-.5);
    console.log(s);
    s.init();
    s.run();
    console.log("RUN");


//    doUpdate();
    /*
    function initColor(r)
    {
	r[0].color="#007FFF",r[1].color="#A142FF",r[2].color="#FF85C2",r[3].color="#FFA142",r[4].color="#FF4242";
	for(var o=5;o<r.length;o++){
	    var t=d3.color(r[o%4+1].color);
	    r[o].color=t.brighter(1.5).toString()
	}
    }
    function initRadius(r){
	r[0].radius=18,r[1].radius=14,r[2].radius=14,r[3].radius=14,r[4].radius=14;
	for(var o=5;o<r.length;o++)
	    r[o].radius=10
    }
    var canvas=document.querySelector("canvas"),width=1300,height=600;
    d3.csv("./nodes.csv",function(r,o){
	for(var t=(o.length,4),i=[],e=1;e<=t;e++)
	    i.push({source:0,target:e});
	for(var e=t+1;e<o.length;e++)
	    i.push({source:e%t+1,target:e});
	initColor(o),initRadius(o);
	var s=new relation;
	s.setNodes(o),s.setLinks(i),s.setCanvas(canvas),s.setSize(width,height),s.setRadius(12),s.setLinkLength(90),s.setCharge(-60),s.init(),s.run()
    })
*/
//}
var gp='/xenonnt';
function UpdateOverviewPage(){

    var statuses = [
	"<strong style='color:blue'>Idle</strong>",
	"<strong style='color:cyan'>Arming</strong>",
        "<strong style='color:cyan'>Armed</strong>",
        "<strong style='color:green'>Running</strong>",
        "<strong style='color:red'>Error</strong>",
	"<strong style='color:black'>(unknown)</strong>"
    ];
    
    var detectors = ['tpc', 'muon_veto', 'neutron_veto'];
    var hrdetectors = {"tpc": "TPC  ", "muon_veto": "Muon Veto  ", "neutron_veto": "Neutron Veto  "};

   /* for(var i=0; i<detectors.length; i+=1){
	var detector = detectors[i];
	document.getElementById("det_name_"+detector).innerHTML = hrdetectors[i];
	$.getJSON("/status/get_detector_status?detector="+detector, (function(det){
	    return function(data){
		// Set status
		var status;
		if(typeof(data['status'])=="undefined" || data['status'] == -1)
		    status = statuses[5];
		else
		    status = statuses[data['status']];
		document.getElementById("status_"+det).innerHTML = status;
		
		// Set attributes
		var atts = ["number", "mode", "rate", "buff", "readers", "time"];
		for(j in atts){
		    if(typeof(data[atts[j]])!="undefined"){
			if(atts[j]=="time")
			    document.getElementById(det+"_"+atts[j]).innerHTML =
			    	moment(data[atts[j]]).format('DD. MMM. hh:mm');
			else if(atts[j] == "rate")
			    document.getElementById(det+"_"+atts[j]).innerHTML = data[atts[j]].toFixed(2) + " MB/s";
			else if(atts[j] == "buff")
				document.getElementById(det+"_"+atts[j]).innerHTML = data[atts[j]].toFixed(2) + " MB";
		 	else
		 		document.getElementById(det+"_"+atts[j]).innerHTML = data[atts[j]];
		    }
		    else
				document.getElementById(det+"_"+atts[j]).innerHTML = '-';
		}

		// Update charts if needed
		var ts = new Date(data['time']).getTime();
		if(typeof(document.last_time_charts) != "undefined" &&
		   det in document.last_time_charts &&
		   !isNaN(ts) && document.last_time_charts[det] != ts){
		    document.last_time_charts[det] = ts;
		    UpdateOverviewChart(det, ts, data['rate'], data['buff']);
		}
	    }
	}(detector)));
    }*/
   $.getJSON(gp+"/status/get_broker_status", function(data){
   		for(var i in data){
   			var doc = data[i];
   			var det = doc['detector'];
   			document.getElementById("det_name_"+det).innerHTML = hrdetectors[det];
   			
   			// Set Status
   			var status;
			if(typeof doc['status'] === "undefined" || doc['status'] === -1)
		    	status = statuses[5];
			else
		    	status = statuses[doc['status']];
			document.getElementById("status_"+det).innerHTML = status;
			
			// Set attributes
			var atts = ["number", "mode", "rate", "buff", "readers", "time"];
			for(j in atts){
		    	if( typeof doc[atts[j]] !== "undefined"){
					if(atts[j]==="time")
			    		document.getElementById(det+"_"+atts[j]).innerHTML =
			    			moment(doc[atts[j]]).format('DD. MMM. hh:mm');
					else if(atts[j] === "rate")
			    		document.getElementById(det+"_"+atts[j]).innerHTML = doc[atts[j]].toFixed(2) + " MB/s";
					else if(atts[j] === "buff")
						document.getElementById(det+"_"+atts[j]).innerHTML = doc[atts[j]].toFixed(2) + " MB";
		 			else
		 				document.getElementById(det+"_"+atts[j]).innerHTML = doc[atts[j]];
		   		 }
		   		 else
					document.getElementById(det+"_"+atts[j]).innerHTML = '-';
			}
			
			// Update charts if needed
			var ts = new Date(doc['update_time']).getTime();
			console.log(doc);
			console.log(document.last_time_charts[det]);
			if(typeof document.last_time_charts !== "undefined" &&
		   			det in document.last_time_charts &&
		   			!isNaN(ts) && document.last_time_charts[det] !== ts){
					    document.last_time_charts[det] = ts;
		    			UpdateOverviewChart(det, ts, doc['rate'], doc['buff']);
   			}
   			
   		} // End for
    	setTimeout(UpdateOverviewPage, 5000);
	});

}

function UpdateOverviewChart(detector, ts, rate, buff){
    if(detector in (document.charts) && document.charts[detector] != null){
	//var tss = (new Date(ts)).getTime();
	document.charts[detector].series[0].addPoint([ts, rate], true, true);
	document.charts[detector].series[1].addPoint([ts, buff], true, true);
    }
}

function DrawOverviewCharts(){
    document.charts = {};
    document.last_time_charts = {};
    var detectors = ["tpc", "muon_veto", "neutron_veto"];
	var colors = {"tpc": "#1c0877", "muon_veto": "#df3470", "neutron_veto": "#3dd89f"}
    for(i in detectors){
	var detector = detectors[i];
	$.getJSON(gp+"/detector_history?limit=1000&detector="+detector, (function(det){
	    return function(data){
		console.log(data);
		// No data no chart
		if(Object.keys(data).length==0)
		    return;
		if(typeof(data['rates'][0])=='undefined' || data['rates'][0].length != 2) 
		    return;
		document.last_time_charts[det] = data['rates'][data['rates'].length-1][0];
		var series = [
		    {"type": "area", "name": "transfer rate", "data": data['rates'], "color": colors[det]},
		    {"type": "area", "name": "buffered data", "data": data['buffs'], "color": "#222222"}
		];
		var div = det+"_chartdiv";
		document.charts[det] = Highcharts.chart(
		    div, {
			chart: {
			    zoomType: 'x',
			    marginLeft: 44,
			    marginTop: 20,
			    marginBottom: 30,
			    marginRight:10
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
			series: series
		    });	    
	    };
	}(detector)));
    }
}
