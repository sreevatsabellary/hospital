// server.js

// BASE SETUP
// =============================================================================

// call the packages we need
var express    = require('express');        // call express
var request = require("request");
var app        = express();                 // define our app using express
var bodyParser = require('body-parser');
var mysql = require('mysql')
var connection = mysql.createConnection({
 host: 'localhost',
 user: 'root',
 password: 'root',
 database: 'hospital'
})

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 80;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:80/api)
router.get('/patient', function(req, res) {
    var patient_id = parseInt(req.query.id);
    var patient_lat = parseFloat(req.query.lat);
    var patient_lng = parseFloat(req.query.lng);

    //connection.connect();
    //connection.query('INSERT into user_location values ('.concat(), function (err, rows, fields) {
    //  if (err) throw err
    //      console.log('The solution is: ', rows[0].solution)

/*
    var options = {
		method: 'GET',
  		url: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
  		qs: 
		{
         //location: '13.030855,77.565334',
			location: patient_lat+','+patient_lng,
			type: 'hospital',
			keyword: 'hospital',
			rankby: 'distance',
			key: 'AIzaSyDo74Briag9bYDAWovUvyzz2C1-LWI2rzU' 
		},
		headers: 
		{ 
			'postman-token': '31c20cb7-a086-641c-0a5a-1db1c12858cc',
			'cache-control': 'no-cache' 
		} 
     };
*/

/*
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        if (!error && response.statusCode == 200){
          var data = JSON.parse(body);
          try{
          	    var hospitalInfo = {name:data.results[0].name, user_lat: patient_lat, user_lng: patient_lng, hospital_lat:data.results[0].geometry.location.lat, hospital_lng:data.results[0].geometry.location.lng};
          	    res.json({ status: 200, message: hospitalInfo });
          }catch(err) {
    		res.json({ status: 500, message: "ERROR" });
		  }
          
        }else{
          res.json({ status: 500, message: "ERROR" });
        }
    });
*/
	
	var queryString = "SELECT id AS ambulance_id, lat, lng, ( 6371 * acos( cos( radians("+patient_lat+") ) * cos( radians( lat ) ) * cos( radians( lng ) - radians("+patient_lng+") ) + sin( radians("+patient_lat+") ) * sin( radians( lat ) ) ) ) AS distance FROM ambulance_locations ORDER BY distance LIMIT 0 , 20";
	connection.query(queryString, function(err, result, fields){
    	if (err) {
    		res.json({ status: 500, message: "ERROR", error: err.code});
    		return;
    	}
    	if (result.length > 0) {
	    	res.json({ status: 200, message: "Success", ambulance_id: result[0].ambulance_id, ambulance_lat: result[0].lat, ambulance_lng: result[0].lng});
    	}else{
    		res.json({ status: 500, message: "NO_AMBULANCE_FOUND"});
    	}
    	/*console.log(result);
    	console.log(result.length);
    	console.log(result[0]);
    	console.log(typeof result);*/
    })
});


router.get('/ambulance', function(req, res) {
    var ambulance_id = parseInt(req.query.id);
    var ambulance_lat = parseFloat(req.query.lat);
    var ambulance_lng = parseFloat(req.query.lng);

    var queryData = {
    	id : ambulance_id,
    	name : 'ambulance',
    	lat : ambulance_lat,
    	lng : ambulance_lng
    };

    //var queryString = 'INSERT INTO ambulance_locations VALUES ('+ambulance_id+',\''+'ambulance'+'\''+','+ambulance_lat+','+ambulance_lng+')  ON DUPLICATE KEY UPDATE lat=VALUES(lat),lng=VALUES(lng)';
    var queryString = 'INSERT INTO ambulance_locations SET ?  ON DUPLICATE KEY UPDATE lat='+queryData.lat+', lng = '+queryData.lng;

    //connection.connect();
    var query = connection.query(queryString, queryData, function(err, result){
    	if (err) {
    		res.json({ status: 500, message: "ERROR", error: err.code});
    		//console.log(err);
    		return;
    	}
    	res.json({ status: 200, message: "Success"});
    })
    //console.log(query.sql);
    //connection.end();
});


// more routes for our API will happen here

// REGISTER OUR ROUTES -------------------------------
// all of our routes will be prefixed with /api
app.use('/', router);

// START THE SERVER
// =============================================================================
app.listen(port);
console.log('Magic happens on port ' + port);