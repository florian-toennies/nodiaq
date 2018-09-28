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
    var hrdetectors = ["TPC  ", "Muon Veto  ", "Neutron Veto  "];

    for(var i=0; i<detectors.length; i+=1){
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
    }
    setTimeout(UpdateOverviewPage, 5000);
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
	$.getJSON("/detector_history?limit=1000&detector="+detector, (function(det){
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
