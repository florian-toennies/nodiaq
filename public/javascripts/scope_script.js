function PopulateAvailableRuns(divname){
    $.getJSON('scope/available_runs', function(data){
	console.log(data);
	html = "";
	for(var i in data)
	    html += "<option value="+data[i]+">"+data[i]+"</option>";
	document.getElementById(divname).innerHTML = html;
    });
}
