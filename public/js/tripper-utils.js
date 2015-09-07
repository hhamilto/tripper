

ImageData = (function(){
	var pics
	$.ajax({
		url:'/pics/',
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
		setLocationForPic: _.throttle(function(model, locationString){
			var localModel = _.find(pics, {id:model.id})//lets make sure we are using ours.
			if(localModel != model ) alert("I am complaining about a problem. Look at the code.")
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
						url: 'pics/'+model.id+'/location',
						method: 'PUT',
						contentType: 'application/json',
						data: JSON.stringify(newLocation)
					})
					model.location = newLocation
					this.emit('locationUpdated', model)
				} else {
					'ZERO_RESULTS' != status && alert('Geocode was not successful for the following reason: ' + status);
				}
			}.bind(this))
		},500),
		getLocationFor: function(model){
			var index = _.findIndex(pics, {id:model.id})//lets make sure we are using ours.
			while(model = pics[index--])
				if(model.location) return model.location
		}
	}
	
	_.extend(ImageData, Backbone.Events)
	ImageDataDfd = $.Deferred()
	return ImageDataDfd
})()


SVGDrawingUtil = (function(){
	return {
		getFeatureCollections: function(features,viewedCoords){
			var travelRoutePlaces = { "type": "FeatureCollection", "features": 
				_.dropRightWhile(features, function(feature){
					return feature.geometry.coordinates != viewedCoords
				})
			}
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
		}
	}
})()