function UpdateMonitorPage(){
    var hosts = ['reader0', 'reader1', 'reader2', 'eb0', 'eb1', 'eb2'];
    for(i in hosts){
	var host = hosts[i];
	$.getJSON("hosts/get_host_status?host="+host, (function(h){
	    return function(data){
		console.log(data);
		// Set attributes
		atts = [['cpu_percent', 'CPU %'], ['cpu_count', 'Num CPUs'],
			    ['cpu_count_logical', 'Num cores']] 
		for(j in atts){
		    if(typeof(data[atts[j][0]])!="undefined"){
			//if(atts[j]=="time")
			 //   document.getElementById(det+"_"+atts[j]).innerHTML =
			  //  moment(data[atts[j]]).format('DD. MMM. HH:mm');			
			document.getElementById(h+"_"+atts[j][0]).innerHTML = data[atts[j][0]];
		    }
		    else
			document.getElementById(h+"_"+atts[j][0]).innerHTML = '-';
		}
		document.getElementById(h+"_mem_total").innerHTML = (data['virtual_memory']['total']/1e9).toFixed(2) + " GB";
		document.getElementById(h+"_mem_used").innerHTML = (data['virtual_memory']['used']/1e9).toFixed(2) + " GB ("+(data['virtual_memory']['percent']).toFixed(1)+"%)";
		document.getElementById(h+"_swap").innerHTML = (data['swap_memory']['total']/1e9).toFixed(2) + " GB";
		var html = "";
		for(j in data['disk']){
		    console.log(j);
		    html += "<div class='col-12' style='font-size:14px'><strong>";
		    html += j + " (" + data['disk'][j]['device'] + ")</strong></div>";		    
		    html += "<div class='col-4' style='font-size:12px'><strong>Total: </strong></div>";
		    html += "<div class='col-8' style='font-size:12px'>";
		    html += (data['disk'][j]['total']/1e9).toFixed(2) + " GB</div>";
		    html += "<div class='col-4' style='font-size:12px'><strong>Used: </strong></div>";
		    html += "<div class='col-8' style='font-size:12px'>";
		    html += (data['disk'][j]['used']/1e9).toFixed(2) + " GB (";
		    html += (data['disk'][j]['percent']).toFixed(1) + "%)</div>";
		}
		document.getElementById(h+"_disk_row").innerHTML = html;

		// Update charts
		var timestamp = data['_id'].toString().substring(0,8);
		//var ts = new Date( parseInt( timestamp, 16 ) * 1000 );
		var ts = parseInt(timestamp, 16) * 1000;
		console.log(ts);
		console.log(document.last_time_charts[h]);
		if(typeof(document.last_time_charts) != "undefined" &&
		   h in document.last_time_charts &&
		   !isNaN(ts) && document.last_time_charts[h] != ts){
		    document.last_time_charts[h] = ts;
		    UpdateHostOverview(h, ts, data);
		}
	    }
	}(host)));
    }
    setTimeout(UpdateMonitorPage, 5000);
}

function UpdateHostOverview(h, ts, data){
    // Update CPU
    if(h in document.charts && document.charts[h] != null){
	for(i in document.charts[h].series){
	    if(document.charts[h].series[i]['name'] == 'CPU%')
		document.charts[h].series[i].addPoint([ts, data['cpu_percent']], true, true);
	    else if(document.charts[h].series[i]['name'] == "Memory%")
		document.charts[h].series[i].addPoint([ts, data['virtual_memory']['percent']], true, true);
	    else if(document.charts[h].series[i]['name'] == "Swap%")
		document.charts[h].series[i].addPoint([ts, data['swap_memory']['percent']], true, true);
	    else{
		var name = document.charts[h].series[i]['name'];
		var a = name.substring(6, name.length-1);
		document.charts[h].series[i].addPoint([ts, data['disk'][a]['percent']], true, true);
	    }
	}
    }
}


function DrawMonitorCharts(){
    document.charts = {};
    document.last_time_charts = {};

    var hosts = ["reader0", 'reader2', 'reader3', 'reader4', 'reader6', 'reader7', 'eb0', 'eb1'];

    for(i in hosts){
	var host = hosts[i];
	$.getJSON("hosts/get_host_history?limit=1000&host="+host, (function(h){
	    return function(data){
		console.log(data);

		// Can update style here
		for(var i in data){
		    data[i]['type'] = 'line';
		}
		
		var div = h + "_chart";
		document.last_time_charts[host] = data[0]['data'][data[0]['data'].length-1][0];
		document.charts[host] = Highcharts.chart(
		    div, {
			chart: {
			    zoomType: 'x',
			    //marginLeft: 50,
			    //marginTop: 20,
			    //marginBottom: 30,
			   // marginRight: 10
			},
			credits: {
			    enabled: false
			},
			title: {
			    text: "",
			},
			xAxis: {
			    type: "datetime",
			},
			yAxis: {
			    title: {
				text: "%",
			    },
			    min: 0,
			},
			plotOptions:{
			    series: {
				lineWidth: 1
			    },
			},
			legend: {
			    enabled: true,
			    align: "right",
			    layout: "vertical"
			},
			series: data
		    });	    			    
	    }
	}(host)));
    }
}
