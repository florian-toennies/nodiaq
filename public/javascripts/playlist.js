function PopulateRunsList(select_div, radio_name){
    var detector = $('input[name='+radio_name+']:checked', '#new_run_form').val();
    $.getJSON("/playlist/modes?detector="+detector, function(data){
	var html = "";
	for(var i=0; i<data.length; i+=1){
	    html+="<option value='"+data[i][0]+"'><strong>"+data[i][0]+":</strong> "+data[i][1]+"</option>";
	}
	document.getElementById(select_div).innerHTML = html;
    });
}

function PopulatePlaylist(playlist_div){
    $.getJSON("/playlist/get_playlist?limit_new=10",
	      function(data){
		  html = "";
		  for(var i in data){
		      html += AddRunHTML(data[i]);
		  }
		  document.getElementById(playlist_div).innerHTML=html;
	      });
}

function UTCDate(d){
    return (d.getUTCDay().toString() + "." + d.getUTCMonth().toString() +
	    "." + d.getUTCFullYear().toString() + ", "+d.getUTCHours().toString() +
	    ":"+d.getUTCMinutes().toString());
}
function AddRunHTML(doc){
    html = "<div style='width:100%;height:50px;margin:-1;padding:0;border:1px solid #aaaaaa;";
    if(doc['status'] =='queued')
	html+="background-color:rgba(89, 146, 194, .2);";
    else if(doc['status'] == 'processed')
	html+="background-color:#fafafa;";
    html+="'><div class='row'>";

    ids = doc['_id'].toString();
    timestamp = parseInt(ids.substring(0, 8), 16);
    d = new Date(timestamp*1000);
    console.log(UTCDate(d));
    rt = "infinite";
    if(typeof doc['stop_after'] != "undefined")
	td = (doc['stop_after']).toString()+" minutes";
    html += "<div class='col-4 col-sm-4'><strong>Mode: " + doc['mode'] + "</strong></div>";
    html+="<div class='col-4 col-sm-4'><strong>Detector: "+doc['detector']+"</strong></div>";
    html+="<div class='col-4 col-sm-4'><strong>User: "+doc['user']+"</strong></div>";
    html += "<div class='col-4 col-sm-4'><strong>Date: " + UTCDate(d) + "</strong></div>";
    html += "<div class='col-4 col-sm-4'><strong>Runtime: " + rt + "</strong></div>";
    html += "<div class='col-4 col-sm-4'><strong>Status: " + doc['status'] + "</strong></div>";
    html+="</div></div>";
    return html;
}
