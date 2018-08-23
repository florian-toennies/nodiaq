var express = require("express");
var url = require("url");
var router = express.Router();

router.get('/', function(req, res) {
    res.render('playlist', { title: 'Playlist' });
});



module.exports = router;
