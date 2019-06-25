function PopulateAvailableRuns(divname){
    $.getJSON('scope/available_runs', function(data){
	console.log(data);
	html = "";
	for(var i in data){
	    // for now
	    if(parseInt(data[i]) > 10895 && parseInt(data[i]) < 22000)
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

    document.chart = new Dygraph(

	// containing div
	document.getElementById("chartdiv"),

	dat
    );
	

  
}
