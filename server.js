express = require('express')
bodyParser = require('body-parser')
_ = require('lodash')
request = require('request')

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


app.put('/pics/:id/location', function(req,res){
	var pic = getPicById(req.params.id)
	pic.location = req.body
	fs.writeFile('./picData.json', JSON.stringify(picData))
	res.sendStatus(200)
})

app.get('/directions', function(req,res){
	var queryForDirections  = req.query.queryStringForDirections
	request('https://maps.googleapis.com/maps/api/directions/json?'+queryForDirections).pipe(res)
})


module.exports = {
	initialize: function(){
		app.listen(3000)
	}
}

