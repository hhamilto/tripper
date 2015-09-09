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



requestDirections = function(queryString, callback){
	request('https://maps.googleapis.com/maps/api/directions/json?'+queryString, function(err, response, body){
		var directions = JSON.parse(body) //yolo the err
		if(directions.status== 'OK')
			callback(directions)
		else
			requestDirectionsThrottled(queryString).done(callback)
	})
}

//that stupid limit is NOT 10 per second. 
timeSpacer = 100
nextAvailableRequestTime = 0
requestDirectionsThrottled = function(queryString){
	var dfd = deferred()
	if(nextAvailableRequestTime<Date.now()){
		nextAvailableRequestTime = Date.now()+timeSpacer
		requestDirections(queryString, dfd.resolve)
	} else {
		nextAvailableRequestTime = nextAvailableRequestTime+timeSpacer//let em pile up
		setTimeout(function(){
			requestDirections(queryString, dfd.resolve)
		}, nextAvailableRequestTime-Date.now())
	}
	return dfd.promise
}

directionCache = {}
requestDirectionsMemod = function(queryString){
	if(directionCache[queryString]) return directionCache[queryString]
	directionCache[queryString] = requestDirectionsThrottled(queryString)
	return directionCache[queryString]
}

app.get('/directions', function(req,res){
	requestDirectionsMemod(req.query.queryStringForDirections).done(function(directions){
		res.send(JSON.stringify(directions))
	})
})


module.exports = {
	initialize: function(){
		app.listen(3000)
	}
}

