var express = require("express");
var url = require("url");
var router = express.Router();

router.get('/', function(req, res) {
    res.render('help', { title: 'Help', user: req.user });
});



module.exports = router;
