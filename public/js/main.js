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

			      // The Browser API key obtained from the Google Developers Console.
		      var developerKey = 'lE82uEQJ8wgowGa8HWN3Q-R_ ';

		      // The Client ID obtained from the Google Developers Console. Replace with your own Client ID.
		      var clientId = "1070366409195-dkfapucfumbav3larfvb7uvji6q06ut3.apps.googleusercontent.com "

		      // Scope to use to access user's photos.
		      var scope = ['https://www.googleapis.com/auth/photos'];

		      var pickerApiLoaded = false;
		      var oauthToken;

		      // Use the API Loader script to load google.picker and gapi.auth.
		      gapiLoaded.done(function onApiLoad() {
		        gapi.load('auth', {'callback': onAuthApiLoad});
		        gapi.load('picker', {'callback': onPickerApiLoad});
		      })

		      function onAuthApiLoad() {
		        window.gapi.auth.authorize(
		            {
		              'client_id': clientId,
		              'scope': scope,
		              'immediate': false
		            },
		            handleAuthResult);
		      }

		      function onPickerApiLoad() {
		        pickerApiLoaded = true;
		        createPicker();
		      }

		      function handleAuthResult(authResult) {
		        if (authResult && !authResult.error) {
		          oauthToken = authResult.access_token;
		          createPicker();
		        }
		      }

		      // Create and render a Picker object for picking user Photos.
		      function createPicker() {
		        if (pickerApiLoaded && oauthToken) {
		          var picker = new google.picker.PickerBuilder().
		              addView(google.picker.ViewId.PHOTOS).
		              setOAuthToken(oauthToken).
		              setDeveloperKey(developerKey).
		              setCallback(pickerCallback).
		              build();
		          picker.setVisible(true);
		        }
		      }

		      // A simple callback implementation.
		      function pickerCallback(data) {
		        var url = 'nothing';
		        if (data[google.picker.Response.ACTION] == google.picker.Action.PICKED) {
		          var doc = data[google.picker.Response.DOCUMENTS][0];
		          url = doc[google.picker.Document.URL];
		        }
		        var message = 'You picked: ' + url;
		        document.getElementById('result').innerHTML = message;
		      }



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

