'use strict'

angular.module('TripView', ['ngRoute'])
.config(['$routeProvider', function($routeProvider) {
	$routeProvider.when('/trips/:tripId', {
		templateUrl: '/templates/view-trip.html',
		controller: 'TripController'
	})
}])
.controller('TripController', ['$scope','$routeParams', function($scope, $routeParams) {
	this.trip = {}
	$.ajax({
		url: '/trips/'+$routeParams.tripId,
		dataType: 'json'
	}).done(function(trip){
		this.trip = trip
		$scope.$digest()
	}.bind(this))
}])