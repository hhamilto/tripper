

ImageData = _.memoize(function(tripId){
	ImageDataDfd = $.Deferred()
	var pics
	$.ajax({
		url: '/trips/'+tripId+'/pics',
		method: 'GET',
		dataType: 'json',
	}).done(function(picsFromServer){
		pics = picsFromServer
		ImageDataDfd.resolve(ImageData)
	})
	var ImageData = {
		getPicInfos: function(){
			return pics
		},
		getCoordinatesFor: function(model){
			// this could use some
			if(!model.locationText)
				return undefined
			return [model.longitude, model.latitude]
		},
		setLocationForPic: _.throttle(function(model, locationString){
			var localModel = _.find(pics, {id:model.id})//lets make sure we are using ours.
			if(localModel != model ) alert("I am complaining about a problem. Look at the code.")
			if(locationString == ''){
				//user wants to clear out a location
				delete model.locationText
				delete model.longitude
				delete model.latitude
				$.ajax({
					url: 'trips/'+tripId+'/pics/'+model.id+'/location',
					method: 'DELETE'
				})
				this.trigger('locationUpdated', model)
			}
			$.ajax({
				url: "https://maps.googleapis.com/maps/api/geocode/json?address=" + encodeURIComponent(locationString),
				method: 'GET',
				dataType: 'json'
			}).done(function(resp){
				var status = resp.status
				if (status === 'OK') {
					var googleCoords = resp.results[0].geometry.location
					var location = [googleCoords.lng, googleCoords.lat]
					var newLocation = {
						text: locationString,
						coordinates: location
					}
					$.ajax({
						url: 'trips/'+tripId+'/pics/'+model.id+'/location',
						method: 'PUT',
						contentType: 'application/json',
						data: JSON.stringify(newLocation)
					})
					model.location = newLocation
					this.trigger('locationUpdated', model)
				} else {
					'ZERO_RESULTS' != status && alert('Geocode was not successful for the following reason: ' + status);
				}
			}.bind(this))
		},500),
		getLocationFor: function(model){
			var index = _.findIndex(pics, {id:model.id})//lets make sure we are using ours.
			while(model = pics[index--])
				if(model.locationText) return model//haha, this is a location now... :(
		}
	}

	_.extend(ImageData, Backbone.Events)
	return ImageDataDfd
})


SVGDrawingUtil = (function(){
	var distance = function(p1,p2){
		//2d distance
		var d1 = p1[0]-p2[0]
		var d2 = p1[1]-p2[1]
		return Math.sqrt(d1*d1+d2*d2)
	}

	var getDirections = _.memoize(function(queryString){
		return $.ajax({
			url: '/directions/',
			data: {
				queryStringForDirections: queryString},
			method: 'GET',
			dataType: 'json'
		}).then(function(directions){
			console.log(directions)
			var routePoints = polyline.decode(directions.routes[0].overview_polyline.points)
			routePoints = _.reduce(routePoints, function(routePoints, routePoint){
				if(distance(_.last(routePoints),routePoint) > .3)
					routePoints.push(routePoint)
				return routePoints 
			},[_.first(routePoints)])
			return routePoints
		})
	})
	return {
		getViewedFeatures: function(features, viewedCoords){
			return _.dropRightWhile(features, function(feature){
				return feature.geometry.coordinates != viewedCoords
			})
		},
		getFeatureCollections: function(features){
			var travelRoutePlaces = { "type": "FeatureCollection", "features": features }
			var travelRouteLine = { "type": "FeatureCollection", "features": [
				{ "type": "Feature",
						"geometry": {"type": "LineString", "coordinates": 
							_.map(travelRoutePlaces.features, function(feature){
								return feature.geometry.coordinates
							})
						 },
				}
			]}
			var travelRouteCurrentPlace = { "type": "FeatureCollection", "features": [
				_.last(travelRoutePlaces.features)
			]}
			return {
				travelRoutePlaces:travelRoutePlaces,
				travelRouteLine: travelRouteLine,
				travelRouteCurrentPlace: travelRouteCurrentPlace
			}
		},
		updateRouteLine: function(features, updateRouteLine, updateRouteLineKey){
			var coordinates = _.map(features,function(feature){
				return feature.geometry.coordinates
			})
			var startAndEndPairs = _.zip(_.map(_.range(coordinates.length-1), _.propertyOf(coordinates)),
			                             _.map(_.range(1,coordinates.length), _.propertyOf(coordinates)))
			var deferreds = _.map(startAndEndPairs, function(coordinatePair){
				return getDirections('origin='+encodeURIComponent(coordinatePair[0][1]+','+coordinatePair[0][0])
				       +'&destination='+encodeURIComponent(coordinatePair[1][1]+','+coordinatePair[1][0])).done()
			})
			$.when.apply($,deferreds).done(function(){
				var travelRouteLine = { "type": "FeatureCollection", "features": [
					{ "type": "Feature",
							"geometry": {"type": "LineString", "coordinates": 
								_.map(_.flatten(arguments), function(coordinates){
									return [coordinates[1],coordinates[0]]
								})
							 },
					}
				]}
				updateRouteLine(updateRouteLineKey, travelRouteLine)
			})
		}
	}
})()


var Latch = function(i,done){
	return function(){
		if(!--i) done()
	}
}