
EventEmitter = {
	eventHash: {},
	on: function(event, func){
		(this.eventHash[event] = this.eventHash[event] || []).push(func)
	},
	emit: function(event){
		var args = Array.prototype.slice.call(arguments, 1)
		!(this.eventHash[event] = this.eventHash[event] || []).forEach(function(fun){
			fun.apply(null, args)
		})
	}
}

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

	_.defaults(ImageData, EventEmitter)
	ImageDataDfd = $.Deferred()
	return ImageDataDfd
})()
