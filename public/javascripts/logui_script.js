function NewMessage(){
    $.ajax({
        url:'logui/new_log_message',
        type:'post',
        data:{"entry": $("#log_entry_box").val()},//$('#new_message').serialize(),
        success:function(){
	    UpdateLogTable("#log_table");
	    $("#log_entry_box").val("");
        }
    });    
}


function DateToString(date){
    if(isNaN(date.getFullYear()))
	return "none";
    return (date.getFullYear().toString()+"-"+(date.getMonth()+1).toString()+"-"+date.getDay().toString()+" at " + date.getHours().toString() + ":"+date.getMinutes().toString()+":"+date.getSeconds().toString());
}
    
function InitializeTable(DOM){
    var STATUS=["<span style='font-weight:bold;color:black'>DEBUG</span>",
		"<span style='font-weight:bold;color:blue'>MESSAGE</span>",
		"<span style='font-weight:bold;color:orange'>WARNING</span>",
		"<span style='font-weight:bold;color:red'>ERROR</span>",
		"<span style='font-weight:bold;color:red'>FATAL</span>",
		"<span style='font-weight:bold;color:green'>USER</span>"];

    // Get the window height minus padding (80px)
    var vh = $(window).height() - $("#newentry").outerHeight(true) - 50;
    $(DOM).tabulator({
	height: vh, // set height of table (in CSS or here), this enables the Virtual DOM and improves render speed dramatically (can be any valid css height value)
	layout:"fitDataFill", //fit columns to width of table (optional)
	pagination: "local",
	columns:[ //Define Table Columns
            {title:"Time", field:"time", width: 200},
            {title:"User", field:"user", align:"left", width: 200,
	     headerFilter: "input", headerFilterPlaceholder: "filter users"},
            {title:"Message", field:"message", headerFilter: "input",
	     headerFilterPlaceholder: "filter messages"},	    
            {title:"Priority", field:"priority", width: 100,
	     formatter:function(cell, formatterParams){
		 //cell - the cell component
		 //formatterParams - parameters set for the column
		 return STATUS[cell.getValue()];
	    }},
	],
	//rowClick:function(e, row){ //trigger an alert message when the row is clicked
        //    alert("Row " + row.getData().id + " Clicked!!!!");
	//},
    });
}

function UpdateLogTable(DOM){

    // TIL, you can send a list via a GET
    var get_me = "";
    var checkboxes = {
	"cb_message": 1,
	"cb_open_warning": 2, 
	"cb_closed_warning": 12,
	"cb_open_error": 3, 
	"cb_closed_error": 13, 
	"cb_debug": 0,
	"cb_fatal": 4, 
	"cb_user_message": 5, 	
    }
    for(var key in checkboxes){
	if (checkboxes.hasOwnProperty(key)) {           
            if($("#"+key).is(":checked")){
		get_me+="&get_priorities="+checkboxes[key].toString();
	    }
	}
    }
    console.log(get_me);
    $.getJSON('logui/getMessages?limit=500'+get_me, function(data){
	$(DOM).tabulator("setData", data);
    });

}
