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

const conf = {
	"picture-directory": path.join(__dirname,'pictures')
}

app = express()

app.use(busboy())
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.text())
app.use(bodyParser.json())

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

app.get('/trips/:id/photos', function(req,res){
	
	db.collection('photos').find({
		tripId: new mongodb.ObjectId(req.params.id)
	}).toArray().then(function(photos){
		res.json(photos)
	})
})

app.put('/trips/:id/photos', function(req,res){
	if (req.busboy) {
		const fileConversionList = []
		req.busboy.on('file', function(fieldname, file, filename, encoding, mimetype) {
			if(! /.*\.jpe?g$/i.test(filename)){
				file.resume()
				return
			}
			if(! /^image\/jpeg/.test(mimetype)){
				file.resume()
				return
			}
			db.collection('photos').insertOneAsync({
				tripId: new mongodb.ObjectId(req.params.id)
			}).then(function(result) {
				var pictureId = result.insertedId.toString();
				var filePath = path.join(conf["picture-directory"],pictureId)
				fileConversionList.push(conf["picture-directory"]+' '+pictureId+" 400")
				file.pipe(fs.createWriteStream(filePath))
			})
		})
		req.busboy.on('finish', function() {
			var fixProc = childProcess.exec(path.join(__dirname, 'fixImages.sh'), function(err, stdout){
				res.end()//mostly to set a content/type so firefox doesn't try to aprase html
			})
			fixProc.stdin.write(fileConversionList.join('\n')+'\n')
			fixProc.stdin.end()
		})
		req.pipe(req.busboy)
	}else{
		res.sendStatus(500)
	}
})

const pictureSizes = ['400']
app.get('/trips/:tripId/photos/:photoId', function(req,res){
	var filePath
	if(_.contains(pictureSizes,req.query.size))
		filePath = path.join(conf["picture-directory"],req.query.size+'_'+req.params.photoId)
	else
		filePath = path.join(conf["picture-directory"],req.params.photoId)
	res.sendFile(filePath)
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

