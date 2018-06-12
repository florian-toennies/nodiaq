function PopulateModeList(div){
    $.getJSON("/options/options_list", function(data){
	var html = "";
	for(var i=0; i<data.length; i+=1){
	    html+="<option value='"+data[i]+"'>"+data[i]+"</option>";
	}
	document.getElementById(div).innerHTML = html;
    });
}

function FetchMode(select_div){
    mode = $('#'+select_div).val();
    $.getJSON('/options/options_json?name='+mode,
	      function(data){
		  document.jsoneditor.set(data);
	      });
};

function SubmitMode(){
    console.log(document.jsoneditor.get());
    $.post("/options/set_run_mode",
	   {"doc": (JSON.stringify(document.jsoneditor.get()))});
    location.reload(true);
};

function RemoveMode(select_div){
    $.get("/options/remove_run_mode?name="+$("#"+select_div).val());
    location.reload(true);
}
