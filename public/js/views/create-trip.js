'use strict'

angular.module('CreateTripView', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
	$routeProvider.when('/create-trip', {
		templateUrl: '/templates/create-trip.html',
		controller: 'CreateTripController'
	})
}]).controller('CreateTripController', ['$scope',function($scope) {
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
				this.uploadProgress = {}
				xhr.upload.addEventListener('progress', function(progress){
					this.uploadProgress = progress
					console.log(progress)
				}.bind(this))
			}
			xhr.onload = function () {
				window.location.href = '#/'
			}
			xhr.overrideMimeType('text/plain')//don't parse xml
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