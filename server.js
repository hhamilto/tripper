const express = require('express')
const bodyParser = require('body-parser')
const _ = require('lodash')
const Promise = require('bluebird')
const request = Promise.promisify(require('request'))
const mongodb = Promise.promisifyAll(require('mongodb'))
const MongoClient = mongodb.MongoClient
const busboy = require('connect-busboy')

const path = require('path')
const util = require('util')
const fs = require('fs')
const childProcess = require('child_process')

app = express()

app.use(busboy())
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.text())
app.use(bodyParser.json())


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
	db.collection('trips').find().toArray().then(function(trips){
		res.json(trips)
	})
})

app.get('/trips/:id', function(req,res){
	db.collection('trips').find({_id: new mongodb.ObjectId(req.params.id)}).limit(1).next().then(function(trip){
		res.json(trip)
	})
})

app.put('/trips', function(req,res){
	db.collection('trips').insertOneAsync(req.body).then(function(result) {
		res.json({id:result.insertedId})
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
		var databaseUrl = 'mongodb://hurricanesarina.tk:27017/tripper';
		MongoClient.connectAsync(databaseUrl).done(function(createdDb){
			db = createdDb
			app.listen(3000)
		})
	}
}

