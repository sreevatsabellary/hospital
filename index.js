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
 user: 'ambulance',
 password: 'ambulance',
 database: 'hospital'
})

var admin = require("firebase-admin");

admin.initializeApp({
  credential: admin.credential.cert("h.json"),
  databaseURL: "https://hospital-d31c0.firebaseio.com"
});

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || 80;        // set our port

// ROUTES FOR OUR API
// =============================================================================
var router = express.Router();              // get an instance of the express Router

// test route to make sure everything is working (accessed at GET http://localhost:80/)
router.get('/patient', function(req, res) {
    var patient_id = req.query.id;
    var patient_lat = parseFloat(req.query.lat);
    var patient_lng = parseFloat(req.query.lng);

    //connection.connect();
    //connection.query('INSERT into user_location values ('.concat(), function (err, rows, fields) {
    //  if (err) throw err
    //      console.log('The solution is: ', rows[0].solution)


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
			key: 'AIzaSyBWmPBRRNJDtbXAOesnPkDhokFbdoa9o1w' 
		},
		headers: 
		{ 
			'postman-token': '31c20cb7-a086-641c-0a5a-1db1c12858cc',
			'cache-control': 'no-cache' 
		} 
     };



    request(options, function (error, response, body) {
        if (error){
            res.json({ status: 500, message: "ERROR", error: error });
            return;
        }

        if (response.statusCode == 200){
          var data = JSON.parse(body);
          try{
                if(data.results.length <= 0){
                    res.json({ status: 500, message: "NO_HOSPITAL_FOUND"});
                    return;
                }
          	    var hospitalInfo = {name:data.results[0].name, hospital_lat:data.results[0].geometry.location.lat, hospital_lng:data.results[0].geometry.location.lng};
          	    //res.json({ status: 200, message: hospitalInfo });
                var queryString = "SELECT id AS ambulance_id, lat, lng, ( 6371 * acos( cos( radians("+patient_lat+") ) * cos( radians( lat ) ) * cos( radians( lng ) - radians("+patient_lng+") ) + sin( radians("+patient_lat+") ) * sin( radians( lat ) ) ) ) AS distance FROM ambulance_locations ORDER BY distance LIMIT 0 , 20";
                connection.query(queryString, function(err, result, fields){
                    if (err) {
                        res.json({ status: 500, message: "ERROR", error: err.code});
                        return;
                    }
                    console.log('query result length: '+result.length+', result: '+result);
                    if (result.length <= 0) {
                        res.json({ status: 500, message: "NO_AMBULANCE_FOUND"});
                        return;
                    }
                    var tokenQueryString = "SELECT token from firebase_tokens where ambulance_id= \'"+result[0].ambulance_id+"\'";
                    connection.query(tokenQueryString, function(tokenErr, tokenResult, tokenFields){
                        if(tokenErr){
                            res.json({ status: 500, message: "ERROR", error: tokenErr.code});
                            return;
                        }
                        if (tokenResult.length <= 0) {
                            console.log('result length:'+tokenResult.length);
                            res.json({ status: 500, message: "GCM_AMBULANCE_NOT_REGISTERED"});
                            return;
                        }

                        console.log('result:'+tokenResult);
                        var registrationToken = tokenResult[0].token;
                        var payload = {
                          data: {
                            patient_id: patient_id.toString(),
                            patient_lat: patient_lat.toString(),
                            patient_lng: patient_lng.toString(),
                            hospital_name: hospitalInfo.name.toString(),
                            hospital_lat: hospitalInfo.hospital_lat.toString(),
                            hospital_lng: hospitalInfo.hospital_lng.toString(),
                            ambulance_id: result[0].ambulance_id.toString(),
                            ambulance_lat: result[0].lat.toString(),
                            ambulance_lng: result[0].lng.toString()
                          }
                        };
                        var options = {
                          priority: "high",
                          timeToLive: 60 * 3
                        };
                        admin.messaging().sendToDevice(registrationToken, payload, options)
                          .then(function(admin_response) {
                            // See the MessagingDevicesResponse reference documentation for
                            // the contents of response.
                            if(admin_response.successCount >= 1){
                                console.log('FCM message sent to ambulance');
                                res.json({ status: 200, message: "Success", response: payload.data});
                            }else{
                                res.json({status: 500, message: "FCM_FAILED"});
                            }
                            console.log("Successfully sent message:", admin_response);
                          })
                          .catch(function(admin_error) {
                            console.log("Error sending message:", admin_error);
                            res.json({status: 500, message: "FCM_FAILED", error:admin_error});
                          });
                    });
                    //var registrationToken = "e0OvqyBhNBI:APA91bFCQHQ7Xre2QMl5wOTo8Trx83NcJvo-M1H7HtXOGhZWmCK5zfui29_QvxVa1JpIBz6M7GKzfeinRLBH1TaED1D1gBONPf8p0fgO0Jgz4HUq7sv6fpf0b9R19wiUmTXotvssuyXg";
                    /*console.log(result);
                    console.log(result.length);
                    console.log(result[0]);
                    console.log(typeof result);*/
                });
          }catch(err) {
    		res.json({ status: 500, message: "ERROR", error: err });
		  }
          
        }else{
          res.json({ status: 500, message: "ERROR", error: response.statusCode });
        }
    });
});

router.post('/ambulance/registertoken', function(req, res) {
	var ambulance_id = req.body.id;
	var ambulance_token = req.body.token;
	console.log(req.body);
    var queryData = {
    	ambulance_id : ambulance_id,
    	token : ambulance_token
    };

    var queryString = 'INSERT INTO firebase_tokens SET ?  ON DUPLICATE KEY UPDATE ambulance_id=\''+queryData.ambulance_id+'\', token = \''+queryData.token+'\'';
    var query = connection.query(queryString, queryData, function(err, result){
    	if (err) {
    		res.json({ status: 500, message: "ERROR", error: err.code});
    		console.log(err);
    		return;
    	}
    	res.json({ status: 200, message: "TOKEN_UPDATED"});
    })
    console.log(query.sql)

});


router.get('/ambulance', function(req, res) {
    var ambulance_id = req.query.id;
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
        console.log(query.sql);
    	res.json({ status: 200, message: "AMBULANCE_LOCATION_UPDATED"});
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
