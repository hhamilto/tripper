Backbone.$ = $
usDfd = $.ajax({
	url: 'us.json',
	method: 'GET',
	dataType: 'json'
})


$(document).ready(function(){

	var IndexView = Backbone.View.extend({
		template: _.template($('#index-template').html()),
		initialize: function(){
			_.bindAll(this)
			this.$el.html(this.template())
			this.render()
		},
		render: function(){
		}
	})

	var pictureListView = new Pictures.PictureListView
	var mapView = new Pictures.MapView({pictureListView:pictureListView})
	var indexView = new IndexView()

	var AppRouter = Backbone.Router.extend({
		routes: {
			":trip": "trip",
			"*catchall": "trips",
		},
		trip: function(tripName) {
			$('#js-pics').children().detach()
			$('#js-pics').append(pictureListView.el)
			$('#js-map').children().detach()
			$('#js-map').append(mapView.el)
			pictureListView.render()
			mapView.render()
		},
		trips: function() {
			$('#app-container').children().detach()
			$('#app-container').append(indexView.el)
			indexView.render()
		}
	})
	appRouter = new AppRouter
	Backbone.history.start()
})