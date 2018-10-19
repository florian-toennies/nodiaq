function CheckMongoQuery(){
	var query = $("#mongoquery").val();
	if(query === "")
		query = "{}";
	try{
		JSON.parse(query);
	}
	catch(e){
		alert("Your mongo query is not valid JSON!");
		console.log(e);
		return;
	}
console.log(document.datatable_div);
	document.datatable_options['ajax']['data'] = {"conditions": JSON.parse(query)};
	console.log(document.datatable_options);
	$(document.datatable_div).DataTable().destroy()
  	$(document.datatable_div).DataTable(document.datatable_options);
}
function InitializeRunsTable(divname){
    var table_options = {                                                                   
        processing : true,
        serverSide : true,
        //pageResize: true,
        //paging: true,
        //lengthChange: true,
        
        order: [[0, "desc"]],
        iDisplayLength: 25,
        ajax : {
            url: '/runtable/getDatatable',
            beforeSend: function ( jqXHR,  settings) {
                      console.log(jqXHR);
            },
            data: {}
            
        },
        columns : [
        	{ data : "number", "render": function(data, type, row){
        		return "<button style='padding:3px;padding-left:5px;padding-right:5px;background-color:#ef476f;color:#eee' class='btn btn-defailt btn-xs' onclick='ShowDetail(" + data + ");'>show</button>"} },
            { data : "number" , searchable: true},
            { data : "detector" },
            { data : "mode", searchable: true },
            { data : "source", searchable: true },
            { data : "user"},
            { data : "start", format: 'DD.MM.YYYY HH:mm', type: 'datetime'},
            { data : "end", "defaultContent": "<i>Not set</i>"},
            { data : "tags", "defaultContent": "",
	      searchable: true,
	      "render": function(data, type, row){
		  ret = "";	  
		  if(typeof(data) != "undefined"){
		      for(var i=0; i<data.length; i+=1){
			  ret+=data[i]["name"];
			  if(i!=data.length-1)
			      ret+=", ";
		      }
		  }
		  return ret;
	      }
	    },
            { data : "comments", "defaultContent": "",
	      "render": function(data, type, row){
		  if(typeof(data) != "undefined" && data.length>0)
		      return data[0]["comment"]; return "";}}
        ],
	columnDefs: [
	 { className: "not-selectable", "targets": [ 0 ] },
	    {
		targets: [6, 7],
		render: function(data){
		    return moment(data).format('DD.MM.YYYY HH:mm');
		}
	    }
	]
    };
    var table = $(divname).DataTable(table_options);
    document.datatable_options = table_options;
    document.datatable_div = divname;
   
    $(divname + ' tbody').on( 'click', 'td', function () {
    	console.log($(this));
    	if(!$(this).hasClass("not-selectable")){
	        $(this).parent().toggleClass('selected');
    	    $("#addtagrow").slideDown();
	    }

        } );
 	
 	
    $('#add_comment_button').click( function () {
	var comment = $("#commentinput").val();
	if(typeof comment ==="undefined")
	    console.log("No comment!");
        else{
	    var runs = [];
	    for(var i=0; i<table.rows('.selected')[0].length; i++)
			runs.push(table.rows('.selected').data()[i]['number']);
		console.log("RUNS");
		console.log(runs);
	    if(runs.length>0)
	    console.log("Adding comment!")
	    console.log(comment);
	    console.log(runs);
			$.ajax({
		    	type: "POST",
		    	url: "/runsui/addcomment",
		    	data: {"runs": runs, "comment": comment, "user": "web user"},		   
		    	success: function(){ console.log("Redraw"); table.draw();},
		    	error:   function(jqXHR, textStatus, errorThrown) {
				alert("Error, status = " + textStatus + ", " +
			    	  "error thrown: " + errorThrown
			     );
		    	}
			});
		}
	});

    $('#add_tag_button').click( function () {
	var tag = $("#taginput").val();
	if(typeof tag ==="undefined")
	    console.log("No tag!")
        else{
	    runs = [];
	    for(var i=0; i<table.rows('.selected')[0].length; i++)
		runs.push(table.rows('.selected').data()[i]['number']);
	    if(runs.length>0)
		$.ajax({
		    type: "POST",
		    url: "/runsui/addtags",
		    data: {"runs": runs, "tag": tag, "user": "web user"},		   
		    success: function(){ console.log("Redraw"); table.draw();},
		    error:   function(jqXHR, textStatus, errorThrown) {
			alert("Error, status = " + textStatus + ", " +
			      "error thrown: " + errorThrown
			     );
		    }
		});
	    
	}
    
    });
    
    $('#add_tag_detail_button').click( function () {
	var tag = $("#newtag").val();
	if(typeof tag ==="undefined")
	    console.log("No tag!")
        else{
	    	var runs = [];
			runs.push($("#detail_Number").html());
	    	if(runs.length>0 && typeof runs[0] !== "undefined")
				$.ajax({
		    		type: "POST",
		    		url: "/runsui/addtags",
		    		data: {"runs": runs, "tag": tag, "user": "web user"},		   
		    success: function(){ $("#newtag").val(""); ShowDetail(runs[0])},
		    error:   function(jqXHR, textStatus, errorThrown) {
			alert("Error, status = " + textStatus + ", " +
			      "error thrown: " + errorThrown
			     );
		    }
		});
	}
    
    });
    
    $('#add_comment_detail_button').click( function () {
	var comment = $("#newcomment").val();
	if(typeof comment ==="undefined")
	    console.log("No comment!")
        else{
	    	var runs = [];
			runs.push($("#detail_Number").html());
	    	if(runs.length>0 && typeof runs[0] !== "undefined")
				$.ajax({
		    		type: "POST",
		    		url: "/runsui/addcomment",
		    		data: {"runs": runs, "comment": comment, "user": "web user"},		   
		    		success: function(){ console.log("ADDED COMMENT"); $("#newcomment").val(""); ShowDetail(runs[0])},
		    		error:   function(jqXHR, textStatus, errorThrown) {
			alert("Error, status = " + textStatus + ", " +
			      "error thrown: " + errorThrown
			     );
		    }
		});
	}
    
    });
}
function RemoveTag(run, user, tag){
	console.log("Remove tag!");
	console.log(run, user, tag);
	// Remove ALL tags with a given text string
	if(typeof run === 'undefined' || typeof user === 'undefined' || typeof tag === 'undefined')
		return;
	$.ajax({
		type: "POST",
		url: "/runsui/removetag",
		data: {"run": run, "user": user, "tag": tag},
		success: function(){ ShowDetail(run);},
		error: function(jqXHR, textStatus, errorThrown){
			alert("Error, status = " +textStatus + ", " + "error thrown: " + errorThrown);
		}
	});
}

function ShowDetail(run){
	//var namefield =  [['Number', 'number'], ['Detectors', 'detectors'], ['Start', 'start']End', 'User', 'Mode', 'Source'];
	$.getJSON("/runsui/get_run_doc?run="+run, function(data){
			console.log(window['user']);
		// Set base data
		document.getElementById("detail_Number").innerHTML = data['number'];
		$("#detail_Detectors").html(data['detector']);
		$("#detail_Start").html(moment(data['start']).format('DD.MM.YYYY HH:mm'));
		$("#detail_End").html(moment(data['end']).format('DD.MM.YYYY HH:mm'));
		$("#detail_User").html(data['user']);
		$("#detail_Mode").html(data['mode']);
		$("#detail_Source").html(data['source']);

		var tag_html = "";
		for(var i in data['tags']){
			var row = data['tags'][i];
			tag_html += "<tr><td>" + row['name'] + "</td><td>" + row['user'] + "</td><td>";
			tag_html += moment(row['date']).format("DD.MM.YYYY HH:mm") + "</td>";
			if(row['user'] === window['user']){
				tag_html += "<td><button onclick='RemoveTag("+data['number']+", "+'"'+row['user']+'"'+", "+'"'+row['name']+'"';
				tag_html += ")' class='btn btn-warning'>Remove tag</button></td></tr>";
			}
			else
				tag_html += "<td></td></tr>";
		}
		$("#detail_Tags").html(tag_html);
		var comment_html = "";
		for(var i in data['comments']){
			var row = data['comments'][i];
			comment_html += "<tr><td>" + row['user'] + "</td><td>" + row['comment'] + "</td><td>";
			comment_html += moment(row['date']).format("DD.MM.YYYY HH:mm") + "</td></tr>";
		}
		$("#detail_Comments").html(comment_html);
		$("#detail_JSON").JSONView(data);
		$("#runsModal").modal();
	});
	
}
