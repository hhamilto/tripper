'use strict';

angular.module('Tripper', [
  'ngRoute',
  'TripListView',
]).
config(['$routeProvider', function($routeProvider) {
  $routeProvider.otherwise({redirectTo: '/trip-list'});
}]);