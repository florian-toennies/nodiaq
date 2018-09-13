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
