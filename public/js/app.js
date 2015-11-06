'use strict';

angular.module('Tripper', [
  'ngRoute',
  'TripListView',
  'CreateTripView',
  'TripView',
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/trip-list'});
}]);