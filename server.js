express = require('express')
_ = require('lodash')
fs = require('fs')

app = express()

app.use(express.static(__dirname + '/public'))

app.get('/pics', function(req,res){
	fs.readdir(__dirname + '/public/pics', function(err,files){
		if(err){
			res.send(err)
			res.done()
		}
		res.json(_.map(files, function(filename){
			return {
					filename:filename,
					id: filename.replace(/\./g,'')
				}
			}))
	})
})


module.exports = {
	initialize: function(){
		app.listen(3000)
	}
}

