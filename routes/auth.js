var express = require("express");
var url = require("url");
var passport = require("passport");
var router = express.Router(); 
var gp='/xenonnt';

// GET /auth/github
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  The first step in GitHub authentication will involve redirecting
//   the user to github.com.  After authorization, GitHub will redirect the user
//   back to this application at /auth/github/callback
router.get('/github',
	passport.authenticate('github', { scope: [ 'user:email' ] }),
	   function(req, res){	       
	    // The request will be redirected to GitHub for authentication, so this
	    // function will not be called.
	});

router.post('/password', 
  passport.authenticate('local', { failureRedirect: gp+'/login' }),
  function(req, res) {
    res.redirect(gp);
 });
// GET /auth/github/callback
//   Use passport.authenticate() as route middleware to authenticate the
//   request.  If authentication fails, the user will be redirected back to the
//   login page.  Otherwise, the primary route function will be called,
//   which, in this example, will redirect the user to the home page.
router.get('/github/callback',
	passport.authenticate('github', { failureRedirect: gp+'/login' }),
	   function(req, res) {	   
	       res.redirect(gp);
	   });


/*router.get("/github/callback", function(req, res, next){
    console.log("Github authenticate");
    passport.authenticate('github', { failureRedirect: gp+'/login' }, 
			  function(err, user, info) {
			      console.log("Calling DB");
			      var db = req.runs_db;
			      var collection = db.get('users');
			      collection.find({"github_id": req.user.name},
					      function(e, docs){
						  console.log("DB returned");
						  if(docs.length == 0)
						      return res.redirect(
							  gp+"/login",
							  {"message": "User not found"});
						  req.logIn(user, function(err) {
						      if (err) { return next(err); }
						      return res.redirect(gp+'/');
						  });
					      });
			      //return(res.redirect('/login'));
			  });
});
*/
module.exports = router;
