express = require('express')
bodyParser = require('body-parser')
_ = require('lodash')
request = require('request')
deferred = require('deferred')

util = require('util')
fs = require('fs')

//would like to put persistence in own module...
picData = JSON.parse(fs.readFileSync('./picData.json'))
getPicById = function(id){
	if(picData[id]){
		return picData[id]
	}else{
		return picData[id] = {}
	}
}

app = express()

app.use(express.static(__dirname + '/public'))
app.use(bodyParser.text())
app.use(bodyParser.json())

app.get('/pics', function(req,res){
	fs.readdir(__dirname + '/public/pics', function(err,files){
		if(err){
			res.send(err)
			res.done()
		}
		res.json(_.map(files, function(filename){
			var picid = filename.replace(/\./g,'')
			var pic = getPicById(picid)
			return _.defaults({
					filename:filename,
					id: picid
				}, pic)
			}))
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
		dfd.reject('Exceeded maximum tries')
		return dfd.promise
	}
	if(nextAvailableRequestTime<Date.now()){
		console.log("Requesting now")
		nextAvailableRequestTime = Date.now()+timeSpacer
		requestDirections(queryString, dfd.resolve, tryNumber)
	} else {
		console.log("Waiting")
		nextAvailableRequestTime = nextAvailableRequestTime+timeSpacer//let em pile up
		setTimeout(function(){
			requestDirections(queryString, dfd.resolve, tryNumber)
		}, nextAvailableRequestTime-Date.now())
	}
	return dfd.promise
}

directionCache = {}
requestDirectionsMemod = function(queryString){
	console.log("gotit2")
	if(directionCache[queryString]) return directionCache[queryString]
	console.log("foo")
	directionCache[queryString] = requestDirectionsThrottled(queryString, 0)
	return directionCache[queryString]
}

app.get('/directions', function(req,res){
	console.log("gotit")
	requestDirectionsMemod(req.query.queryStringForDirections).done(function(directions){
		console.log('sentit')
		res.send(JSON.stringify(directions))
	})
})

app.put('/pics/:id/location', function(req,res){
	var pic = getPicById(req.params.id)
	pic.location = req.body
	fs.writeFile('./picData.json', JSON.stringify(picData))
	res.sendStatus(200)
})

app['delete']('/pics/:id/location', function(req,res){
	var pic = getPicById(req.params.id)
	delete pic.location
	fs.writeFile('./picData.json', JSON.stringify(picData))
	res.sendStatus(200)
})


module.exports = {
	initialize: function(){
		app.listen(3000)
	}
}

