function PopulateAvailableRuns(divname){
    $.getJSON('scope/available_runs', function(data){
        if (typeof data.message != 'undefined') {
            alert(data.message);
            return;
        }
        var html = "";
        if (data.length == 0) {
            alert("No runs available");
            return;
        }
	for(var i in data.reverse()){
	    html += "<option value="+data[i]+">"+data[i]+"</option>";
	}
	document.getElementById(divname).innerHTML = html;
    });
}

function FillTargets() {
    var run = $("#run_select").val();
    $.getJSON('scope/available_targets?run=' + run, function(data) {
        if (typeof data.message != 'undefined') {
            alert(data.message);
            return;
        }
        var html = "";
        if (data.length == 0) {
            alert("No data types available");
            return;
        }
        for (var i in data) {
            html += "<option value=" + data[i] + ">" + data[i] + "</option>";
        }
        $("#target_select").html(html);
    });
}

function DisableChannelInput() {
  var target = $("#target_select").val();
  if (target.search(/records/) != -1 || target === 'veto_regions' || target === 'lone_hits')
    $("#channel_select").attr("disabled", false);
  else
    $("#channel_select").attr("disabled", true);
}

function GetData(){
    alert("Congratulations on getting this far, but this isn't quite ready yet");
    return;

    var run = $("#run_select").val();
    var target = $("#target_select").val();
    var max_n = $("#num_select").val();
    var channel = $("#channel_select").val();
    var chunk=$("#chunk_select").val();
    var thread=$("#thread_select").val();

    if (max_n > 1000) {
        alert("You can't ask for that many entries");
        return;
    }

    var url = "/get_data";
    var query = "?run_id="+run+"&target="+target+"&max_n="+max_n+"&channel="+channel;

    $.getJSON(url+query, function(data){
        if (typeof data.error != 'undefined') {
            alert("Microstrax sent an error: " + data.error);
            return;
        }
        if (data.length == 0) {
          alert("No data with those selections");
          return;
        }
        document.data = data;
        document.index=0;
        var tab_head_html = "<tr><th>Index</th><th>Time (strax)</th><th>Time (human-readable)</th>";
        for (var key in data[0]) {
            if (key === 'data' || key === 'time') continue;
            tab_head_html += "<th>"+key.charAt(0).toUpperCase()+key.slice(1)+"</th>";
        }
        tab_head_html += "</tr>";
        $("#scopetab_head").html(tab_head_html);

	    var table_html = "";
	    for(var i in data){
            var frag = data[i];
            var ts = frag['time'];
            var d = new Date(ts*1e-6);
            var ns = ts % 1000;
            var us = (Math.floor((ts % 1000000)/1000)).toFixed(0);
            var human_time = d.getUTCFullYear() + '-';
            human_time += d.getUTCMonth().padStart(2, '0') + '-';
            human_time += d.getUTCDate().padStart(2, '0') + ' ';
            human_time += d.getUTCHours().padStart(2, '0') + ':';
            human_time += d.getUTCMinutes().padStart(2, '0') + ':';
            human_time += d.getUTCSeconds().padStart(2, '0') + '.';
            human_time += d.getUTCMilliseconds().padStart(3, '0') + ' ';
            human_time += us.padStart(3, '0') + ' ';
            human_time += ns.padStart(3, '0');
            var row_html = "<tr id='"+i.toString()+"_row'><td>" + i.toString() + "</td>";
            row_html += "<td>" + ts + "</td><td>" + human_time + "</td><td>";
            for (var key in frag) {
                if (key === 'time' || key === 'data') continue;
	            row_html += "<td>" + frag[key].toString() + "</td>";
            }
            row_html += "</tr>";
            table_html += row_html;
	    } // var i in data
	    document.getElementById("scopetab_body").innerHTML=table_html;

	    if(document.chart != null)
	        document.chart.destroy();
	    DrawChart();
    }); // getJSON
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
    var dat = [];
    for(var i in document.data[document.index]['data'])
	    dat.push([parseInt(i), parseInt(document.data[document.index]['data'][i])]);
    //console.log(dat);

    for(var i =0; i<document.data.length; i+=1){
	    if(i != document.index){
	        $("#"+i.toString()+"_row").css('background-color', 'white');
	        $("#"+i.toString()+"_row").css('color', 'black');
	    }else{
	        $("#"+i.toString()+"_row").css('background-color', '#ef476f');
	        $("#"+i.toString()+"_row").css('color', 'white');
	    }
    }

    document.chart = new Dygraph(

	// containing div
	document.getElementById("chartdiv"),

	dat,

	{
	    "xlabel": "Sample in pulse [units of dt]",
	    "ylabel": "Amplitude [depends]",
	    "yLabelWidth": 18,
	    "labels": ["Sample", "Amplitude"],
	}
    );
	

  
}
