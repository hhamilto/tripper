express = require('express')

fs = require('fs')

app = express()

app.use(express.static(__dirname + '/public'))

app.get('/pics', function(req,res){
	fs.readdir(__dirname + '/public/pics', function(err,files){
		if(err){
			res.send(err)
			res.done()
		}
		res.json(files)
	})
})


module.exports = {
	initialize: function(){
		app.listen(3000)
	}
}

