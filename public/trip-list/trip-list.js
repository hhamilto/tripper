'use strict';

angular.module('TripListView', ['ngRoute'])

.config(['$routeProvider', function($routeProvider) {
  $routeProvider.when('/trip-list', {
    templateUrl: 'trip-list/trip-list.html',
    controller: 'TripListController'
  });
}])

.controller('TripListController', [function() {

}]);