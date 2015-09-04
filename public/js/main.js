Backbone.$ = $
usDfd = $.ajax({
	url: 'us.json',
	method: 'GET',
	dataType: 'json'
})


var geocoderDfd = $.Deferred()
initGeocoderCallback = function(){
	geocoderDfd.resolve(new google.maps.Geocoder())
}

$(document).ready(function(){

	var PicsView = Backbone.View.extend({
		template: _.template($('#pics-list-template').html()),
		initialize: function(){
			var picInfos
			this.$el.attr('id','js-pic-list')
			ImageData.done(function(ImageData){
				var picInfos = ImageData.getPicInfos()
				this.picViews = _.map(picInfos, function(picInfo){
					var picView = new PicView({model:picInfo})
					picView.$el.appendTo(this.$el)
					return picView
				}.bind(this))

				$(window).on('scroll', function(){
					var scrollTop = $(window).scrollTop()
					var windowHeight = $(window).height()

					_.each(this.picViews, function(picView){
						picView.render()
						if(picView.topOffset < ( scrollTop + 1/2 * windowHeight) &&
						       picView.topOffset + picView.height > ( scrollTop + 1/2 * windowHeight) )
							picView.select()
						else
							picView.unselect()
					})

				}.bind(this))

			}.bind(this))

		}
	})

	var PicView = Backbone.View.extend({
		template: _.template($('#pic-item-template').html()),
		events: {
			'input input': 'locationChanged'
		},
		initialize: function(options){
			_.bindAll(this)
			this.$el.html(this.template(this.model))
			this.$el.attr('id', this.model.id)		
		},
		select: function(){
			this.$el.attr('style','width:100%; background-color:red')
		},
		unselect: function(){
			this.$el.attr('style','')
		},
		render: function(){
			this.topOffset = this.$el.offset().top
			this.height = this.$el.height()
		},
		locationChanged: function(e){
			console.log(this.model)
			var newLocation = $(e.target).val()
			ImageData.done(function(ImageData){
				ImageData.setLocationForPic(this.model, newLocation)
			}.bind(this))		
		},
	})





	var MapView = Backbone.View.extend({
		template: _.template($('#map-template').html()),
		initialize: function(){
			this.$el.attr('style','height:100%')
			this.generateLocationFeatures()
			this.svg = d3.select(this.$el.append('<svg></svg>').find('svg').get(0))
			ImageData.done(function(ImageData){
				ImageData.on('locationUpdated', function(model){
					var locationFeature = _.find(this.locations.features, function(feature){
						return feature.properties.id == model.id
					})
					if(!locationFeature){
						this.generateLocationFeatures()
					}else{
						locationFeature.coordinates = model.location.coordinates
					}
					this.renderRoute()
				}.bind(this))
			}.bind(this))
			this.render()
		},
		generateLocationFeatures: function(){
			this.locations = { "type": "FeatureCollection", "features": []}
			ImageData.done(function(ImageData){
				this.locations.features = _.compact(_.map(ImageData.getPicInfos(), function(picInfo){
					if(!picInfo.location) return
					return { "type": "Feature",
						"geometry": {"type": "Point", "coordinates": picInfo.location.coordinates },
						"properties": {"id": picInfo.id}
					}
				}))
			}.bind(this))
								
		},
		renderFlowControl: {
			inProgress: false,
			requested: false
		},
		render: function(){
			if(this.renderFlowControl.inProgress){
				this.renderFlowControl.requested = true
				return
			}
			this.renderFlowControl.inProgress = true
			this.renderFlowControl.requested = false
			var width=this.$el.width(), height = this.$el.height()
			var projection = this.projection = d3.geo.albersUsa()
				.scale(1280)
				.translate([width / 2, height / 2])
			var path = this.path = d3.geo.path()
				.projection(projection)
			var svg = this.svg
			svg.selectAll('*').remove()
			svg.attr("width", width)
			  .attr("height", height)
			usDfd.done(function(us){
				svg.append("path")
				  .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b }))
				  .attr("class", "states")
				  .attr("d", path)

				svg.append("path")
				  .datum(topojson.feature(us, us.objects.land))
				  .attr("class", "states")
				  .attr("d", path)

				svg.append("path")
				  .attr("class", "city")

				this.renderFlowControl.inProgress = false
				if(this.renderFlowControl.requested){
					this.render()
				}
			}.bind(this))
			this.renderRoute()
		},
		renderRoute: function(renderRoute){
			//ex: { "type": "Point", "coordinates": [100.0, 0.0] }
			console.log("Rendering route", this.locations)
			var svg = this.svg
			var path = this.path
			svg.select("path.city")
				  .datum(this.locations)
				  .attr("class", "city")
				  .attr("d", path)

		}
	})



	var picsView = new PicsView
	var mapView = new MapView

	var appRouter = new Backbone.Router
	appRouter.route('/*', '/', function(){
		$('#js-pics').children().detach()
		$('#js-pics').append(picsView.el)
		$('#js-map').children().detach()
		$('#js-map').append(mapView.el)
		mapView.render()
	})
	Backbone.history.start()
	appRouter.navigate('/', {trigger: true})
	// Instantiate the router
	/*
		var navView = new NavigatorView({model:tables})
		$('body').prepend(navView.el)
		var $appContainer = $('#js-app-container')
		_.each(tables, function(table){
			var tableView = new EntityListView({
				tableName: table
			})
			appRouter.route(table, table, function(){
				$appContainer.children().detach()
				$appContainer.append(tableView.el)
			})
		})
		Backbone.history.start()
		appRouter.navigate(tables[3], {trigger: true})
	})*/
})