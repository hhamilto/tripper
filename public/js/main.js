Backbone.$ = $
usDfd = $.ajax({
	url: 'us.json',
	method: 'GET',
	dataType: 'json'
})

gapiLoaded = $.Deferred()

googleClientAuthCallback = function(){
	gapiLoaded.resolve()
}


$(document).ready(function(){

	var TripListView = Backbone.View.extend({
		template: _.template($('#trip-list-template').html()),
		initialize: function(){
			_.bindAll(this)
			this.$el.html(this.template())
			$.ajax({
				method: 'GET',
				url: '/trips',
				dataType: 'json'
			}).done(function(trips){
				var tripListViewUL = this.$el.find('ul')
				tripListViewUL.hide()
				this.tripViews = _.map(trips, function(trip){
					var tripView = new TripListItemView({model:trip})
					tripListViewUL.append(tripView.el)
				})
				tripListViewUL.show()
			}.bind(this))
		},
		render: function(){
		},
	})

	var TripListItemView = Backbone.View.extend({
		template: _.template($('#trip-list-item-template').html()),
		tagName: 'li',
		initialize: function(){
			this.$el.html(this.template(this.model))
		}
	})

	var TripView = Backbone.View.extend({
		template: _.template($('#trip-view-template').html()),
		initialize: function(options){
			this.tripId = options.tripId
			this.$el.html(this.template(this.model))
			this.pictureListView = new Pictures.PictureListView({tripId:this.tripId})
			this.mapView = new Pictures.MapView({
				pictureListView: this.pictureListView,
				tripId: this.tripId
			})
			this.$el.find('.js-map').children().detach()
			this.$el.find('.js-map').append(this.mapView.el)
			this.$el.find('.js-pics').children().detach()
			this.$el.find('.js-pics').append(this.pictureListView.el)
		},
		render: function(){
			this.pictureListView.render()
			this.mapView.render()
		}
	})

	var CreateNewTripView = Backbone.View.extend({
		template: _.template($('#create-trip-template').html()),
		initialize: function(){
			this.$el.html(this.template(this.model))
		}
	})

	var CreateNewTripViewFromUpload = Backbone.View.extend({
		template: _.template($('#photo-upload-template').html()),
		events: {
			"click button.js-upload": "createNewTrip"
		},
		initialize: function(){
			this.$el.html(this.template(this.model))
		},
		createNewTrip: function(e){
			e.preventDefault()
			this.$el.find('.js-progress-bar').removeClass('hidden')
			this.$el.find('button.js-upload').attr('disabled','')
			$.ajax({
				url: '/trips',
				method: 'PUT',
				contentType:'application/json',
				data: JSON.stringify({name:this.$el.find('input.js-name').val()||'New Trip'})
			}).done(function(trip){
				//looked at ajax file upload at: http://blog.teamtreehouse.com/uploading-files-ajax
				var files = this.$el.find('input.js-upload').get(0).files
				var formData = new FormData()
				_.each(files,function(file){
					if (!file.type.match('image.*')) return
					// Add the file to the request.
					formData.append('photos', file, file.name)
				})
				var xhr = new XMLHttpRequest()
				xhr.open('PUT', '/trips/'+trip.id+'/photos', true)
				if(xhr.upload){
					var $progress = this.$el.find('progress')
					xhr.upload.addEventListener('progress', function(progress){
						$progress.attr('max',progress.total)
						$progress.attr('value',progress.loaded)
					})
				}
				xhr.onload = function () {
					if (xhr.status === 200) {
						appRouter.navigate('trips/'+trip.id, true)
					} else {
						alert('An error occurred!')
					}
				}
				xhr.send(formData)
			}.bind(this))
		},
		render: function(){
			this.$el.find('button.js-upload').removeAttr('disabled')
		}
	})

	//lazy view creation with memoization
	getView = _.memoize(function(viewName, arg){
		if(viewName == 'tripListView')
			return new TripListView
		else if (viewName.search('tripView-.*') >-1)
			return new TripView(arg)
		else if (viewName == 'createNewTripView')
			return new CreateNewTripView
		else if (viewName == 'createNewTripViewFromUpload')
			return new CreateNewTripViewFromUpload
		else if (viewName == 'createNewTripViewFromDrive')
			return new CreateNewTripViewFromDrive
		else
			alert('Unrecognized view name: '+ viewName)
	})

	var AppRouter = Backbone.Router.extend({
		routes: {
			"trips/:trip":               "trip",
			"create-new-trip(/:method)": "createNewTrip",
			"*catchall":                 "trips",
		},
		trip: function(tripId) {
			//memod on first arg only...
			var tripView = getView('tripView-'+tripId,{
				tripId:tripId
			})
			$('#app-container').children().detach()
			$('#app-container').append(tripView.el)
			tripView.render()
			window.document.title = "Trip"
		},
		trips: function() {
			var tripListView = getView('tripListView')
			$('#app-container').children().detach()
			$('#app-container').append(tripListView.el)
			tripListView.render()
			window.document.title = "Trips"
		},
		createNewTrip: function(method){
			window.document.title = "Create new trip"
			if(method == 'drive'){
				var createNewTripViewFromDrive = getView('createNewTripViewFromDrive')
				$('#app-container').children().detach()
				$('#app-container').append(createNewTripViewFromDrive.el)
				createNewTripViewFromDrive.render()
			}else if(method == 'upload'){
				var createNewTripViewFromUpload = getView('createNewTripViewFromUpload')
				$('#app-container').children().detach()
				$('#app-container').append(createNewTripViewFromUpload.el)
				createNewTripViewFromUpload.render()
			}else{
				var createNewTripView = getView('createNewTripView')
				$('#app-container').children().detach()
				$('#app-container').append(createNewTripView.el)
				createNewTripView.render()
			}
		}
	})
	appRouter = new AppRouter
	Backbone.history.start()
})

