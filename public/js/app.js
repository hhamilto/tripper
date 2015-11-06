'use strict';

angular.module('Tripper', [
  'ngRoute',
  'TripListView',
  'CreateTripView',
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/trip-list'});
}]);