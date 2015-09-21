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

	CreateNewTripViewFromDrive = Backbone.View.extend({
		template: _.template($('#drive-upload-template').html()),
		initialize: function(){
			this.$el.html(this.template(this.model))
			//ui presents: authorizing spinner
			var CLIENT_ID = '1070366409195-dkfapucfumbav3larfvb7uvji6q06ut3.apps.googleusercontent.com'
			var SCOPES = ['https://www.googleapis.com/auth/drive.readonly']
		
			function retrieveAllFiles(callback) {
				var retrievePageOfFiles = function(request, result) {
					request.execute(function(resp) {
						console.log(resp)
						result = result.concat(resp.items)
						var nextPageToken = resp.nextPageToken
						if (nextPageToken) {
							request = gapi.client.drive.files.list({
								'pageToken': nextPageToken
							})
							retrievePageOfFiles(request, result)
						} else {
							callback(result)
						}
					})
				}
				var initialRequest = gapi.client.drive.files.list()
				retrievePageOfFiles(initialRequest, [])
			}

			var handleAuthResult = function(authResult) {
				console.log(authResult)
				if (!authResult.error) {
					// Access token has been successfully retrieved, requests can be sent to the API
					this.$el.find('.pad').html('successfully auth\'d. Loading drive API...')
					gapi.client.load('drive', 'v2', function(){
						retrieveAllFiles(function(fileArray){
							this.$el.find('.pad').html('<pre>'+fileArray.join('\n')+'</pre>')
						}.bind(this))
					}.bind(this))
				} else {
					// No access token could be retrieved, force the authorization flow.
					gapi.auth.authorize({
						'client_id': CLIENT_ID,
						'scope': SCOPES,
						'immediate': false
					},handleAuthResult)
				}
			}.bind(this)

			gapiLoaded.done(function(){
				gapi.auth.authorize({
					'client_id': CLIENT_ID,
					'scope': SCOPES,
					'immediate': true
				},handleAuthResult)
			}.bind(this))
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

