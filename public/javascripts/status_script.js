function GetStatus(i){
    STATUSES = [
	"<span style='color:blue'><strong>Idle</strong></span>",
	"<span style='color:cyan'><strong>Arming</strong></span>",
	"<span style='color:cyan'><strong>Armed</strong></span>",
	"<span style='color:green'><strong>Running</strong></span>",
	"<span style='color:red'><strong>Error</strong></span>",
    ];
    return STATUSES[i];
}

function UpdateStatusPage(){
    var readers = ["fdaq00_reader_0", "fdaq00_reader_1"];
    var detectors = ["tpc"];
    for(i in readers){
	var reader = readers[i];
	$.getJSON("/status/get_reader_status?reader="+reader, function(data){
	    console.log(data);
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
    for(i in detectors){
	var detector = detectors[i];
	$.getJSON("/status/get_detector_status?detector="+detector, function(data){
	    document.getElementById(detector+"_status").innerHTML = GetStatus(data['status']);
	    document.getElementById(detector+"_checkin").innerHTML = data['checkin'];
	});
    }
    setTimeout(UpdateStatusPage, 5000);	   
}

function UpdateChart(host, ts, rate, buff){
    console.log("UPDATE");
    console.log(document.charts);
    if(host in (document.charts) && document.charts[host] != null){
	console.log("REALLY");
	console.log(ts);
	console.log(rate);
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
	    console.log(div);
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
