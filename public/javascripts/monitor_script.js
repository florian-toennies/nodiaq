function PopulateAvailableRuns(divname){
    $.getJSON('monitor/available_runs', function(data){
	console.log(data);
	html = "";
	for(var i in data)
	    html += "<option value="+data[i]['name']+">"+data[i]['name']+"</option>";
	document.getElementById(divname).innerHTML = html;
    });

    for(var i=0; i<260; i+=10){
	var val = i.toString() + ' - ' + (i+9).toString();
	$("#channel_select").append('<option value="'+i.toString()+'" >'+val+'</option>');
    }

}


function PlotRun(){
    run_name = $("#run_select").val();
    channel_min = $("#channel_select").val();
    channel_max = parseInt(channel_min) + 9;
    console.log(run_name);
    if(typeof(document.chart) != 'undefined')
	document.chart.destroy;
    $.getJSON("monitor/get_run_data?coll="+run_name, function(data){
	// Create storage struct
	var store = [];
	console.log("Create store");
	for(var i = parseInt(channel_min); i< channel_max; i+=1){
	    store.push({
		"type": 'line',
		"name": "Channel "+i.toString(),
		"data": []
	    });
	}
	console.log("Loop data");
	console.log(data);
	for(var i in data){
	    if(data[i]['data'] == undefined) //metadata
		continue;
console.log(i);
	    var chunk_length = 5;
	    for(var j = parseInt(channel_min); 
		j<parseInt(channel_max); j+=1){
		store[j-parseInt(channel_min)]['data'].push(
		    [(data[i]['chunk']-5)*chunk_length, 
		     data[i]['data'][0]['triggers'][j]]);
	    }
	}

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
        //      marker: false
         //   },
        },
        credits: {
            enabled: false,
        },
        title: {
            text: '',
        },
        xAxis: {
            title: {
		text: "time in run",
	    },
        },
        yAxis: {
            title: {
                text: "pulses/s",
            },
            min: 0,
        },
        legend: {
            enabled: true,
        },
        series: store,
    };
	console.log(chart_opts);
document.chart = Highcharts.chart('chartdiv', chart_opts);
    });
}