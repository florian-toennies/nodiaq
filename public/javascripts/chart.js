function UpdateChart(ts, rate){
    if(document.ratechart != null)
	document.ratechart.series[0].addPoint([ts, rate], true, true);
}
function DrawChart(div){
    //{fdaq00: {x:[] y:[]}}
    ///status_history
    $.getJSON("/status_history?limit=500", function(data){
	console.log(data);
	thedata = [];
	for(var entry in data["fdaq00"]){
	    thedata.push([parseInt(data["fdaq00"][entry][0]), parseFloat(data["fdaq00"][entry][1])]);
	}
	if(thedata.length!=0)
	    document.last_time_chart = thedata[0][0];
	console.log(thedata);
	document.ratechart = Highcharts.chart(div, {
	    chart: {
		zoomType: 'x'
	    },
	    credits: {enabled: false},
	    title: {
		text: '',
		//text: 'USD to EUR exchange rate over time'
	    },
	    //subtitle: {
	    //text: document.ontouchstart === undefined ?
	    //'Click and drag in the plot area to zoom in' : 'Pinch the chart to zoom in'
	    //},
	    xAxis: {
		type: 'datetime'
	    },
	    yAxis: {
		title: {
		    text: 'Rate [MB/s]'
		},
		min: 0.,
	    },
	    legend: {
		enabled: false
	    },
	    plotOptions: {
		area: {
		    fillColor: {
			linearGradient: {
			    x1: 0,
			    y1: 0,
			    x2: 0,
			    y2: 1
			},
			stops: [
			    [0, Highcharts.getOptions().colors[0]],
			    [1, Highcharts.Color(Highcharts.getOptions().colors[0]).setOpacity(0).get('rgba')]
			]
		    },
		    marker: {
			radius: 2
		    },
		    lineWidth: 1,
		    states: {
			hover: {
			    lineWidth: 1
			}
		    },
		    threshold: null
		}
	    },

	    series: [{
		type: 'area',
		name: 'DAQ rate',
		data: thedata
	    }]
	});
    });
}
