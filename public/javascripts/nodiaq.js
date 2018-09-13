function DrawActiveLink(page){
    pages = [
	"#lindex", "#lplaylist", "#lstatus", "#lhosts", "#loptions", "#lruns",
	"#llog", "#lusers", "#lhelp"
    ];
    for(i in pages){
	if(pages[i] != page)
	    $(pages[i]).removeClass("active_sidebar_link");
	else
	    $(pages[i]).addClass("active_sidebar_link");
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
        //$("#navbar").css("cssText", "background_color:"+ fc+" !important");
        complement = "#eeeeee";
        if((hcol['r']+hcol['g']+hcol['b'])/3 > 128)
            complement="#333333";
        $("#navbar").css("cssText", "background-color: " + fc +
			 "!important;border-bottom: 1px solid #888888");
	$("#navbar > .navbar-brand").css("cssText", "color: "+ complement+ "!important");
	$(".nav-item > a").css("cssText", "color:"+complement+"!important");
    }
}
