express = require('express')
bodyParser = require('body-parser')
_ = require('lodash')
Promise = require('bluebird')
request = Promise.promisify(require('request'))
MongoClient = Promise.promisifyAll(require('mongodb').MongoClient)
busboy = require('connect-busboy')

path = require('path')
util = require('util')
fs = require('fs')
childProcess = require('child_process')

app = express()

app.use(busboy())
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.text())
app.use(bodyParser.json())


var url = 'mongodb://hurricanesarina.tk:27017/test';

var mongoConnection = MongoClient.connectAsync(url)

app.get('/trips/:tripId/pics', function(req,res){
	persistence.Pictures.get({
		tripId: req.params.tripId
	}).done(function(pics){
		res.json(pics)
	})
})

//that stupid limit is NOT 10 per second. 
timeSpacer = 100
currentGateKey = Promise.resolve()
getGateKey = function(){
	var toReturn = currentGateKey
	currentGateKey = currentGateKey.delay(timeSpacer)
	return toReturn
}

var maxTries = 10
requestDirections = function(queryString, tryNumber){
	getGateKey().then(request('https://maps.googleapis.com/maps/api/directions/json?'+queryString).spread(function(response, body){
		var directions = JSON.parse(body) //yolo the err
		if(directions.status== 'OK')
			return directions
		else{
			if(++tryNumber>maxTries) throw new Error("Maximum number of tries exceeded for directions API")
			return requestDirections(queryString, tryNumber)
		}
	}))
}

directionCache = {}
requestDirectionsMemod = function(queryString){
	if(directionCache[queryString]) return directionCache[queryString]
	directionCache[queryString] = requestDirectionsThrottled(queryString, 0)
	return directionCache[queryString]
}

app.get('/directions', function(req,res){
	requestDirectionsMemod(req.query.queryStringForDirections).done(function(directions){
		res.send(JSON.stringify(directions))
	})
})

app.put('/trips/:tripId/pics/:id', function(req,res){
	var pic = persistence.Pictures.set(req.body).done(function(picture){
		res.sendStatus(200)
	})
})

app.get('/trips', function(req,res){
	var cursor = mongoConnection.collection('trips').find()
	var trips = []
	cursor.each(function(err, trip){
		if(err) throw err
		if (trip!= null) {
			trips.push(trip)
		} else {
			res.json(trips)
		}
	})
})

app.put('/trips', function(req,res){
	persistence.Trips.create(req.body).done(function(tripId){
		res.json({id:tripId})
	})
})

app.put('/trips/:id/photos', function(req,res){
	if (req.busboy) {
		req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
			//reject bad mimetypes... XXX
			var filePath = path.join(__dirname, 'public','pics',filename)
			persistence.Pictures.create({
				url: 'pics/'+filename,
				tripid: req.params.id
			}).done(function(id){

			})
			file.pipe(fs.createWriteStream(filePath))
		})
		req.busboy.on('finish', function() {
			childProcess.exec(path.join(__dirname, 'fixImages.sh'), function(){
				res.json({sucess:'sucess'})
			})
		})
		req.pipe(req.busboy)
	}
})

module.exports = {
	initialize: function(){
		MongoClient.connect(url, function(err,db){
			mongoConnection = db
			app.listen(3000)
		})
	}
}

