function InitializeRunsTable(divname){
    var table = $(divname).DataTable({                                                                   
        processing : true,
        serverSide : true,
        //pageResize: true,
        //paging: true,
        //lengthChange: true,
        order: [[0, "desc"]],
        iDisplayLength: 25,
        ajax : {
            url: '/runtable/getDatatable'
        },
        columns : [
            { data : "number" , searchable: true},
            { data : "detector" },
            { data : "mode", searchable: true },
            { data : "source", searchable: true },
            { data : "user"},
            { data : "start", format: 'DD.MM.YYYY hh:mm', type: 'datetime'},
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
	    {
		targets: [5, 6],
		render: function(data){
		    return moment(data).format('DD.MM.YYYY hh:mm');
		}
	    }
	]
    });
    
    $(divname + ' tbody').on( 'click', 'tr', function () {
        $(this).toggleClass('selected');
    } );
 
    $('#add_tag_button').click( function () {
	tag = $("#taginput").val();
	if(typeof(tag)=="undefined")
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
}
