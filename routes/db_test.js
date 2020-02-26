var express = require('express');
var url = require('url');
var http = require('https');
var router = express.Router();
var gp="";



function show_state(db_or_coll, desc = false){
    var state = eval(db_or_coll)["_state"];
    var colour = "\33[93m";
    if(state == "open"){
        colour = "\33[92m";
    } else if(state == "closed"){
        colour = "\33[91m";
    }
    if(desc != false){
        console.log(desc);
    }
    
    console.log(colour + db_or_coll + ":\n\t" + state + "\33[0m");
    
}


// just for testing
router.get('/',
    function(req, res) {
        var db = req.db
        
        show_state("db", "inside router /tpc/ut");
        var collection = db.get("users");
        show_state("collection", "inside router /tpc/ut");
        
        
        var username = req.query.user;
        var full_query = [{$match:{"email": username}}];
        console.log("\33[93mquery:\33[0m");
        console.log(full_query);
            
        
        
        collection.aggregate(
            full_query,
            function(e,docs){
                res.json(docs);
            }
            
        );
    
    }
)

module.exports = router;
