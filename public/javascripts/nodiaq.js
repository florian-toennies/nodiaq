var gp = "/xenonnt";

function FYouButton(buttonid){
    $("#"+buttonid).mouseover(function(){
        var t = ($(window).height()-80)*Math.random() + 80;
        var l = ($(window).width()-40)*Math.random();
        console.log(t);
        $("#"+buttonid).css({'z-index': 10, //'height': '31px',
                             'top': t, 'left': l, 'position':'absolute'});

        var rand = Math.random() * 30;
        if(rand<1){
            var ahahah = document.getElementById("ahahah");
            ahahah.pause();
            ahahah.currentTime = 0;
            ahahah.play();
        }

    });
}


function CheckForErrors(){
	$.getJSON(gp+"/status/get_broker_status", function(data){
		console.log(data);
		var detectors = ["tpc", "muon_veto", "neutron_veto"];
		var detector_names = ["TPC", "Muon Veto", "Neutron Veto"];
		var error = 0;
		for(var i in detectors){
			var det = detectors[i];
			for(var j in data){
				if(data[j]['detector'] !== det)
					continue;
				// We report an error state for any detector with diagnosis 'error'
				if(data[j]['diagnosis'] === 'error')
					error+=1;
			}
		}
		if(error>0){
			$("#errorIcon").addClass("has-badge");
			$("#errorIcon").attr("data-count", error);
		}
		else{
			$("#errorIcon").removeClass("has-badge");
		}
	});
	$.getJSON(gp+"/logui/areThereErrors", function(data){
			if(data['error_docs']>0){
			    if(!($("#errorbar").hasClass("active")))
				$("#errorbar").addClass("active");
			    document.flashDatButton=true;

			    // Disable start run button if there are errors
			    if(document.getElementById("submit_changes")!=null &&
			       !($("#submit_changes").hasClass("FYOU"))){
				FYouButton('submit_changes');
				$("#submit_changes").addClass("FYOU");
			    }
			}
			else{
			    if($("#errorbar").hasClass("active"))
				$("#errorbar").removeClass('active');
			    document.flashDatButton=false;
			    
			    // Re-enable button that would let you start a run
			    if($("#submit_changes").hasClass("FYOU")){
				$("#submit_changes").unbind("mouseover");
				$("#submit_changes").removeClass("FYOU");
			    }
			}
	    setTimeout(CheckForErrors, 5000);
	});
}
function DrawActiveLink(page){
    var pages = [
	"#lindex", "#lplaylist", "#lstatus", "#lhosts", "#loptions", "#lruns",
	"#llog", "#lusers", "#lhelp", "#laccount", "#lcontrol", "#lshifts", "#lmonitor"
    ];
    for(var i in pages){
    	console.log(pages[i]);
		if(pages[i] !== page)
	    	$(pages[i]).removeClass("active");
		else
	    	$(pages[i]).addClass("active");
    }
}


function hexToRgb(hex) {                                                                        
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
function SetNavbar(fc){
    console.log(fc);
    var hcol = hexToRgb(fc);
    console.log(hcol);
    if(hcol!=null){
      complement = "#eeeeee";
      if((hcol['r']+hcol['g']+hcol['b'])/3 > 128)
         complement="#333333";
    $("#sidebar").css("cssText", "background-color: " + fc +
		 "!important;color:"+complement+" !important");
		$(".colored").css("cssText", "background-color: " + fc +
			 "!important;color:"+complement+" !important");
			 $(".anticolored").css("cssText", "background-color: " + complement +
			 "!important");
	//$("#navbar > .navbar-brand").css("cssText", "color: "+ complement+ "!important");
	//$(".nav-item > a").css("cssText", "color:"+complement+"!important");
    }
}
