Backbone.$ = $
usDfd = $.ajax({
	url: 'us.json',
	method: 'GET',
	dataType: 'json'
})


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
		initialize: function(){
			this.$el.html(this.template(this.model))
		}
	})

	var CreateNewTripView = Backbone.View.extend({
		template: _.template($('#create-trip-template').html()),
		initialize: function(){
			this.$el.html(this.template(this.model))
		}
	})

	var CreateNewTripViewFromZip = Backbone.View.extend({
		template: _.template($('#zip-upload-template').html()),
		initialize: function(){
			this.$el.html(this.template(this.model))
		}
	})

	//lazy view creation
	getView = _.memoize(function(viewName){
		if(viewName == 'tripListView')
			return new TripListView
		else if (viewName == 'pictureListView')
			return new Pictures.PictureListView
		else if (viewName == 'mapView')
			return new Pictures.MapView({pictureListView:getView('pictureListView')})
		else if (viewName == 'createNewTripView')
			return new CreateNewTripView
		else if (viewName == 'createNewTripViewFromZip')
			return new CreateNewTripViewFromZip
		else
			alert('Unrecognized view name: '+ viewName)
	})

	var AppRouter = Backbone.Router.extend({
		routes: {
			"trips/:trip":                      "trip",
			"create-new-trip(/:method)": "createNewTrip",
			"*catchall":                  "trips",
		},
		trip: function(tripName) {
			var pictureListView = getView('pictureListView')
			var mapView = getView('mapView')
			$('#js-pics').children().detach()
			$('#js-pics').append(pictureListView.el)
			$('#js-map').children().detach()
			$('#js-map').append(mapView.el)
			pictureListView.render()
			mapView.render()
		},
		trips: function() {
			var tripListView = getView('tripListView')
			$('#app-container').children().detach()
			$('#app-container').append(tripListView.el)
			tripListView.render()
		},
		createNewTrip: function(method){
			if(method == 'drive'){

			}else if(method == 'zip'){
				var createNewTripViewFromZip = getView('createNewTripViewFromZip')
				$('#app-container').children().detach()
				$('#app-container').append(createNewTripViewFromZip.el)
			}else{
				var createNewTripView = getView('createNewTripView')
				$('#app-container').children().detach()
				$('#app-container').append(createNewTripView.el)
			}
		}
	})
	appRouter = new AppRouter
	Backbone.history.start()
})