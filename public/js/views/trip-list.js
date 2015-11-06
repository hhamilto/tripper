'use strict'

angular.module('TripListView', ['ngRoute'])
.config(['$routeProvider', function($routeProvider) {
	$routeProvider.when('/trip-list', {
		templateUrl: '/templates/trip-list.html',
		controller: 'TripListController'
	})
}])
.controller('TripListController', ['$scope',function($scope) {
	this.trips = []
	$.ajax({
		url: '/trips',
		dataType: 'json'
	}).done(function(trips){
		this.trips = trips
		$scope.$digest()
	}.bind(this))
}])