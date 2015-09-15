express = require('express')
bodyParser = require('body-parser')
_ = require('lodash')
request = require('request')
deferred = require('deferred')
persistence = require('./persistence')
busboy = require('connect-busboy')


path = require('path')
util = require('util')
fs = require('fs')

app = express()

app.use(busboy())
app.use(express.static(__dirname + '/public'))
app.use(bodyParser.text())
app.use(bodyParser.json())

app.get('/trip/:tripId/pics', function(req,res){
	persistence.Pictures.get({
		tripId: req.params.tripId
	}).done(function(pics){
		res.json(pics)
	})
})

requestDirections = function(queryString, callback, tryNumber){
	request('https://maps.googleapis.com/maps/api/directions/json?'+queryString, function(err, response, body){
		var directions = JSON.parse(body) //yolo the err
		if(directions.status== 'OK')
			callback(directions)
		else
			console.log(directions.status), requestDirectionsThrottled(queryString, tryNumber++).done(callback)
	})
}

//that stupid limit is NOT 10 per second. 
timeSpacer = 100
nextAvailableRequestTime = 0
requestDirectionsThrottled = function(queryString, tryNumber){
	var dfd = deferred()
	if(tryNumber > 10){
		return dfd.promise
	}
	if(nextAvailableRequestTime<Date.now()){
		nextAvailableRequestTime = Date.now()+timeSpacer
		requestDirections(queryString, dfd.resolve, tryNumber)
	} else {
		nextAvailableRequestTime = nextAvailableRequestTime+timeSpacer//let em pile up
		setTimeout(function(){
			requestDirections(queryString, dfd.resolve, tryNumber)
		}, nextAvailableRequestTime-Date.now())
	}
	return dfd.promise
}

directionCache = {}
requestDirectionsMemod = function(queryString){
	if(directionCache[queryString]) return directionCache[queryString]
	directionCache[queryString] = requestDirectionsThrottled(queryString, 0)
	return directionCache[queryString]
}

app.get('/directions', function(req,res){
	res.sendStatus(500)//lol
	requestDirectionsMemod(req.query.queryStringForDirections).done(function(directions){
		res.send(JSON.stringify(directions))
	})
})

app.put('/trip/:tripId/pics/:id/location', function(req,res){
	var pic = persistence.Pictures.get({id:req.params.id})
	pic.location = req.body
	//XXX issss broken
	res.sendStatus(200)
})

app['delete']('/trip/:tripId/pics/:id/location', function(req,res){
	var pic = persistence.Pictures.delete({id:req.params.id})
	//XXX issss broken
	res.sendStatus(200)
})

app.get('/trips', function(req,res){
	persistence.Trips.get().done(function(trips){
		res.json(trips)
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
			var saveTo = path.join(__dirname, 'public','pics',filename)
			persistence.Pictures.create({
				url: 'pics/'+filename,
				tripid: req.params.id
			}).done(function(id){
				console.log('picId: '+ id)
			})
			file.pipe(fs.createWriteStream(saveTo))
		})
		req.busboy.on('finish', function() {
			res.end()
		})
		req.pipe(req.busboy)
	}
})

module.exports = {
	initialize: function(){
		persistence.initialize().done(function(){
			app.listen(3000)
		})


	}
}

