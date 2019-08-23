function PopulateAvailableRuns(divname){
    $.getJSON('scope/available_runs', function(data){
	html = "";
	for(var i in data){
	    // for now	   
	    html += "<option value="+data[i]+">"+data[i]+"</option>";
	}
	document.getElementById(divname).innerHTML = html;
    });
}

function GetData(){

    var run = $("#run_select").val();
    var channel = $("#channel_select").val();

    $.getJSON('scope/get_pulses?run='+run+'&channel='+channel.toString(), function(data){
	document.data = data;
console.log(data);
	document.index=0;

	table_html = "";
	for(var i in data){

	    var minutes = (Math.floor(data[i]['time'] / (1e9*60))).toFixed(0);
	    var seconds = (Math.floor((data[i]['time']/1e9) % 60)).toFixed(0);
	    var millis = (data[i]['time']/1e6 - 
			  ((minutes*60*1000)+seconds*1000)).toFixed(0);
	    var human_time = minutes.padStart(2, '0') + ":" + 
		seconds.padStart(2, '0') + ":"+millis.padStart(3, '0')+
		" into run";
	    table_html += "<tr id='"+i.toString()+"_row'><td>" + i.toString() + "</td><td>" +
		data[i]['channel'] + "</td><td>" + data[i]['time'] + 
		"</td><td>" + human_time + "</td><td>" + data[i]['pulse_length'] + "</td></tr>";
	}
	document.getElementById("pulse_table").innerHTML=table_html;

	if(document.chart != null)
	    document.chart.destroy();
	DrawChart();
    });
}

function Next(){
    if(document.index + 1 < document.data.length)
	document.index += 1;
    document.chart.destroy();
    DrawChart();
}

function Prev(){
    if(document.index > 0)
	document.index -= 1;
    document.chart.destroy();
    DrawChart();
}

function DrawChart(){
    dat = [];
    for(var i in document.data[document.index]['sample'])
	dat.push([parseInt(i), parseInt(document.data[document.index]['sample'][i])]);
    console.log(dat);
    document.getElementById("channel_id").innerHTML = document.data[document.index]['channel'];
    document.getElementById("time_id").innerHTML = document.data[document.index]['time'];
    document.getElementById("length_id").innerHTML = document.data[document.index]['pulse_length'];

    for(var i =0; i<50; i+=1){
	if(i != document.index){
	    $("#"+i.toString()+"_row").css('background-color', 'white');
	    $("#"+i.toString()+"_row").css('color', 'black');
	}
	else{
	    $("#"+i.toString()+"_row").css('background-color', '#ef476f');
	    $("#"+i.toString()+"_row").css('color', 'white');
	}
    }

    document.chart = new Dygraph(

	// containing div
	document.getElementById("chartdiv"),

	dat,

	{
	    "xlabel": "Sample in pulse [10ns]",
	    "ylabel": "Voltage [ADC Units]",
	    "yLabelWidth": 18,
	    "labels": ["Sample", "Voltage"],
	}
    );
	

  
}
