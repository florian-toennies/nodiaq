function PopulateModeList(div){
    $.getJSON("options/options_list", function(data){
		var html = "";
		console.log(data);
		var detectors = ['tpc', 'muon_veto', 'neutron_veto', 'include'];
		var detector_names = ["TPC", "Muon Veto", "Neutron Veto", 'Includes'];
		for(var j in detectors){
			var detector = detectors[j];
		  	html+="<optgroup label='"+detector_names[j]+"'>";
			if(typeof data[detector] === 'undefined')
				continue;
			for(var i=0; i<data[detector].length; i+=1)
		    	html+="<option value='"+data[detector][i]+"'>"+data[detector][i]+"</option>";
		}
		document.getElementById(div).innerHTML = html;
		console.log(div);
		$("#"+div).prop('disabled', false);
		$('#'+div).selectpicker();
		
    });
}

function FetchMode(select_div){
    mode = $('#'+select_div).val();
    console.log(mode);
    console.log("FETCH");
    $.getJSON('options/options_json?name='+mode,
	      function(data){
		  document.jsoneditor.set(data);
	      });
};

function SubmitMode(){
    console.log(document.jsoneditor.get());
    $.post("options/set_run_mode",
	   {"doc": (JSON.stringify(document.jsoneditor.get()))});
    location.reload(true);
};

function RemoveMode(select_div){
    $.get("options/remove_run_mode?name="+$("#"+select_div).val());
    location.reload(true);
}
