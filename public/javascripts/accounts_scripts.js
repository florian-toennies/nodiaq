function FillAPIInfo(userdoc){
	console.log(userdoc);
	if(typeof userdoc['api_key'] === 'undefined' || typeof userdoc['api_username'] === 'undefined'){
		$("#request_api_button").show();
	}
	else{
		document.getElementById("api_key").innerHTML = userdoc['api_key'];
		document.getElementById("api_username").innerHTML = userdoc['api_username'];
	}
}

function ReqXenonGroup(group){

    $.getJSON("account/request_github_access?group=" + group, function(data){
	console.log(data);
    });
}
