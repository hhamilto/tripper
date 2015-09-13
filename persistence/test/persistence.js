persistence = require('../index.js')

util = require('util')
persistence.initialize().done(function(){
	persistence.Clients.create({name:'bob', address: 'poopville'}).done(function(){
		persistence.Clients.remove({name:'sue', address: 'nipples'}).done(function(){
			persistence.Clients.create({name:'sue', address: 'nipples'}).done(function(){
				persistence.Clients.get({name:'sue', address: 'nipples'}).done(function(clientList){
					console.log(clientList)
				})
			})
		})

	})

})