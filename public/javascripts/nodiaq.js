function DrawActiveLink(page){
    var pages = [
	"#lindex", "#lplaylist", "#lstatus", "#lhosts", "#loptions", "#lruns",
	"#llog", "#lusers", "#lhelp", "#laccount", "#lcontrol"
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
