'use strict'

angular.module('CreateTripView', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
	$routeProvider.when('/create-trip', {
		templateUrl: '/templates/create-trip.html',
		controller: 'CreateTripController'
	})
}]).controller('CreateTripController', [function() {
	this.trip = {}
	this.saveTrip = function(){
		_.defaults(this.trip,{destination:"Anywhere"})
		console.log(this.files)
		$.ajax({
			url: '/trips',
			method: 'PUT',
			contentType:'application/json',
			data: JSON.stringify(this.trip)
		}).done(function(trip){
			//looked at ajax file upload at: http://blog.teamtreehouse.com/uploading-files-ajax
			var formData = new FormData()
			_.each(this.files,function(file){
				if (!file.type.match('image.*')) return
				// Add the file to the request.
				formData.append('photos', file, file.name)
			})
			var xhr = new XMLHttpRequest()
			xhr.open('PUT', '/trips/'+trip.id+'/photos', true)
			if(xhr.upload){
				var $progress = this.$el.find('progress')
				xhr.upload.addEventListener('progress', function(progress){
					$progress.attr('max',progress.total)
					$progress.attr('value',progress.loaded)
				})
			}
			xhr.onload = function () {
				if (xhr.status === 200) {
					appRouter.navigate('trips/'+trip.id, true)
				} else {
					alert('An error occurred!')
				}
			}
			xhr.send(formData)
		}.bind(this))
	}
}]).directive("fileread", [function () {// from here: 
    return {
        scope: {
            fileread: "="
        },
        link: function (scope, element, attributes) {
            element.bind("change", function (changeEvent) {
                scope.$apply(function () {
                    scope.fileread = changeEvent.target.files;
                    // or all selected files:
                    // scope.fileread = changeEvent.target.files;
                })
            })
        }
    }
}])