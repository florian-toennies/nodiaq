function PopulateRunsList(callback){
    var detectors = ['tpc', 'muon_veto', 'neutron_veto'];
    var fetched = 0;
    for(var i in detectors){
    	var detector = detectors[i];
    	$.getJSON("/control/modes?detector="+detector, (function(d){ return function(data){
    		var html = "";
    		for(var j=0; j<data.length; j+=1)
	    		html+="<option value='"+data[j][0]+"'><strong>"+data[j][0]+":</strong> "+data[j][1]+"</option>";
			var sdiv = d + "_mode";
			document.getElementById(sdiv).innerHTML = html;
			fetched+=1;
			console.log("DET");
			console.log(detector);
			console.log(fetched);
			if(fetched === 3){
				console.log("CALLING PULLS");
				callback();
			}

    	}}(detector)));
	}
}

function PullServerData(callback){

	$.getJSON("/control/get_control_docs", function(data){
		var found = 0;
		for(var i in data){
			var doc = data[i];
			var detector = doc['detector'];
			if(detector !== 'tpc' && detector !== 'muon_veto' && detector !== 'neutron_veto'){
				console.log("Weird doc!")
				console.log(doc);
				continue;
			}
			found += 1;
			console.log(found);
			var atts = ["stop_after", "mode", "user", "comment"];
			for(var j in atts){
				var att = atts[j];
				console.log(att);
				if(att === 'mode'){
					$("#"+detector+"_mode option").filter(function() {
						console.log(this);
    					return this.value === doc['mode']
  					}).prop('selected', true);
				}
				else
					$("#"+detector+"_"+att).val(doc[att]);
			}
			if(detector === "tpc"){
				if(doc['link_mv'] === 'true')
					$("#link_mv").bootstrapToggle('on');
				else
					$("#link_mv").bootstrapToggle('off');
				if(doc['link_nv'] === 'true')
					$("#link_nv").bootstrapToggle('on');
				else
					$("#link_nv").bootstrapToggle('off');
			}
			
			if(doc['active'] === "true")
				$("#"+detector+"_active").bootstrapToggle('on');
			else
				$("#"+detector+"_active").bootstrapToggle('off');
			
			
			
			console.log(doc);
		}
		if(found !== 3)
			alert("Didn't find data for all detectors! Must be you have a clean slate.")
		document.page_ready = true;
		callback;
	});

}

function PostServerData(){
	var dets = ['tpc', 'muon_veto', 'neutron_veto'];
	post = [];
	var failed = false;
	for(var i in dets){
		var detector = dets[i];
		var thisdet = {"detector": detector};
		thisdet['active'] = $("#"+detector+"_active").is(":checked");
		
		var atts = ["stop_after", "mode", "user", "comment"];
		for(var j in atts){
			var att = atts[j];
			thisdet[att] = $("#"+detector+"_"+att).val();
			if(thisdet['active'] && thisdet[att] === null || typeof thisdet[att] === "undefined" && (att!=="comment" && att!=="stop_after")){
				alert("You need to provide a value for "+att+" for the "+detector+", or disable that detector.");
				failed = true;
			}
		}
		thisdet['active'] = $("#"+detector+"_active").is(":checked");
		if(detector === "tpc"){
			thisdet['link_mv'] = $("#link_mv").is(":checked");
			thisdet['link_nv'] = $("#link_nv").is(":checked");
		}
		post.push(thisdet);
	}
	if(!failed){
		$.ajax({
		    type: "POST",
	   		url: "/control/set_control_docs",
	  		data: {"data": post},		   
	    	success: function(){
		   		location.reload();
		   	},
		   	error:   function(jqXHR, textStatus, errorThrown) {
			alert("Error, status = " + textStatus + ", " +
			   	  "error thrown: " + errorThrown
			 	);
		    }
		});
	}
}