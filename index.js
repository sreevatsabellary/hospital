// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var request = require("request");
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var mysql = require('mysql')
//var connection = mysql.createConnection({
//  host: 'localhost',
//  user: 'root',
//  password: 'santhu21'
//})

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 80;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:80/api)
router.get('/', function(req, res) {
    var id = req.query.id;
    var lat = req.query.lat;
    var lng = req.query.lng;

    //connection.connect();
    //connection.query('INSERT into user_location values ('.concat(), function (err, rows, fields) {
    //  if (err) throw err
    //      console.log('The solution is: ', rows[0].solution)


    var options = { method: 'GET',
      url: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
      qs: 
       { 
         //location: '13.030855,77.565334',
         location: lat+','+lng,
         type: 'hospital',
         keyword: 'hospital',
         rankby: 'distance',
         key: 'AIzaSyDo74Briag9bYDAWovUvyzz2C1-LWI2rzU' },
      headers: 
       { 'postman-token': '31c20cb7-a086-641c-0a5a-1db1c12858cc',
         'cache-control': 'no-cache' } };


    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        if (!error && response.statusCode == 200){
          var data = JSON.parse(body);
          try{
          	    var hospitalInfo = {name:data.results[0].name, user_lat: lat, user_lng: lng, hospital_lat:data.results[0].geometry.location.lat, hospital_lng:data.results[0].geometry.location.lng};
          	    res.json({ message: hospitalInfo });
          }catch(err) {
    		res.json({ message: "ERROR" });
		  }
          
        }else{
          res.json({ message: "ERROR" });
        }
      //connection.end()
    });


    
});

// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/api', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);