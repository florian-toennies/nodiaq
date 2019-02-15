var passport = require('passport');
var monk = require('monk');
var runs_cstr = process.env.RUNS_MONGO_USER + ":" + process.env.RUNS_MONGO_PASSWORD + '@' +
    process.env.RUNS_MONGO_HOST+':'+process.env.RUNS_MONGO_PORT+'/'+
    process.env.RUNS_MONGO_DB;
var runs_db = monk(runs_cstr, {authSource: process.env.RUNS_MONGO_DB});


passport.serializeUser(function(user, done) {
    done(null, user);
});
passport.deserializeUser(function(obj, done) {
    done(null, obj);
});


function isEmpty(obj) {
    for(var key in obj) {
        if(obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

// GithubStrategy
var GitHubStrategy = require('passport-github2').Strategy;
var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_CLIENT_SECRET = process.env.GITHUB_SECRET_KEY;
function PopulateProfile(mongo_doc, github_profile, ldap_profile){

    var ret_profile = {};
    var extra_fields = ['skype', 'github_id', 'cell',
                        'favorite_color', 'email', 'lngs_ldap_uid',
                        'last_name', 'first_name', 'institute', 'position',
                        'percent_xenon', 'start_date', 'LNGS', 'github',
                        'picture_url', 'github_home', 'api_username'];
    for(var i in extra_fields){
        if(typeof mongo_doc[extra_fields[i]]==='undefined')
            ret_profile[extra_fields[i]] = "not set";
        else
            ret_profile[extra_fields[i]] = mongo_doc[extra_fields[i]];
    }
    if(!(isEmpty(github_profile))){
	ret_profile['github_info'] = github_profile;
        // This field has a bunch of funny characters that serialize poorly
        ret_profile['github_info']['_raw'] = '';
        ret_profile['picture_url'] = github_profile._json.avatar_url;
        ret_profile['github_home'] = github_profile._json.html_url;

    }
    if(!(isEmpty(ldap_profile)))
	ret_profile['ldap_info'] = ldap_profile;
    // display API key set or not                                              
    if(typeof mongo_doc['api_username'] !== 'undefined')
        ret_profile['api_key'] = "SET";
    
    return ret_profile;
}

passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "https://xenon1t-daq.lngs.infn.it/xenonnt/auth/github/callback",
    scope: ['user:email', 'user:name', 'user:login', 'user:id', 'user:avatar_url'],
  },
  function(accessToken, refreshToken, profile, done) {

      // asynchronous verification 
      process.nextTick(function () {
	  var collection = runs_db.get("users");
          collection.find({"github": profile._json.login},
			  function(e, docs){

                              if(docs.length===0){
                                  console.log("Couldn't find user in run DB");
                                  console.log(profile._json.login);
                                  return done(null, false, "Couldn't find user in DB");
                              }
                              var doc = docs[0];
                              var ret_profile = PopulateProfile(doc, profile, {});
			      // Save a couple things from the github profile                           
                              collection.update({"github": profile._json.login},
                                                {"$set": { "picture_url": profile._json.avatar_url,
                                                           "github_home": profile.html_url}
                                                });
			      
			      return done(null, ret_profile);
			  });
      });
  }));


var LdapStrategy = require('passport-ldapauth').Strategy;
var OPTS = {
  server: {
    url: 'ldaps://lngsldap.lngs.infn.it',
    bindDn: '',
    bindCredentials: '',
    searchBase: 'ou=xenon,ou=accounts,dc=lngs,dc=infn,dc=it',
      searchFilter: '(uid={{username}})' //'(uid=%(user)s)'                                              
  },
    usernameField: 'user',
    passwordField: 'password'
};
passport.use(new LdapStrategy(OPTS,
             function(user, done) {

                 // Need to verify uid matches
                 var collection = runs_db.get("users");
                 collection.find({"lngs_ldap_uid": user.uid},
                                 function(e, docs){
                                     if(docs.length===0){
					 console.log("No user " + user.uid + " in DB");
					 return done(null, false, "Couldn't find user in DB");
				     }
				     var doc = docs[0];
				     var ret_profile = PopulateProfile(doc, {}, user);
				     // Save a couple things from the github profile 
				     collection.update({"lngs_ldap_uid": user.uid},
                                                {"$set": { 
						    "lngs_ldap_email": user.mail,
                                                    "lngs_ldap_cn": user.cn
						}
                                                });
				     return done(null, ret_profile);
                                 }); // end mongo query                 
             }));


//For testing it's pretty useful to have local auth as well. We'll use email/pw and ensure the email is in our DB
/*var auth = require('passport-local-authenticate');
var LocalStrategy = require('passport-local').Strategy;
passport.use(new LocalStrategy({
                usernameField: 'email',
        },
	function(username, password, done) {
        var collection = runs_db.get("users");
        collection.find({"email": username},
        function(e, docs){ 
                if(docs.length===0){
                        console.log("Password auth failed, no user");
                        console.log(username);
                        return done(null, false, "Couldn't find user in DB");
                }
	// For now we're using a general password since this is just a workaround                
                auth.hash(process.env.GENERAL_PASSWORD, function(err, hashed) {                          
                        auth.verify(password, hashed, function(err, verified) {                          
                                if(verified){                                                            
                                        var doc = docs[0];                                               
                                        var ret_profile = {};                                            
                                        var extra_fields = [                                             
                                            'skype', 'github_id', 'cell',                                
                                            'favorite_color', 'email',                                   
                                            'last_name', 'first_name', 'institute', 'position',          
                                            'percent_xenon', 'start_date', 'LNGS', 'github',             
                                            'picture_url', 'github_home', 'api_username'];               
                                        for(var i in extra_fields){                                      
                                                if(typeof doc[extra_fields[i]]==='undefined')            
                                                ret_profile[extra_fields[i]] = "not set";                
                                                else                                                     
                                                    ret_profile[extra_fields[i]] = doc[extra_fields[i]];
                                        }                                                                
                                        ret_profile['github_info'] = {};                                 
                                        if(typeof doc['api_username'] !== 'undefined')                   
                                                ret_profile['api_key'] = "SET";                          
                                console.log("Login success");                                            
                                return done(null, ret_profile);                                          
                                }                                                                        
                                return done(null, false);                                                
                        });                                                                              
                });                                                                                      
                                                                                                         
    });                                                                                                  
  }                                                                                                      
));                                                                                                      
*/
