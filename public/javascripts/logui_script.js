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
    var vh = $(window).height() - $("#newentry").outerHeight(true) - 20;
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

    $.getJSON('logui/getMessages?limit=500', function(data){
	$(DOM).tabulator("setData", data);
    });

}
