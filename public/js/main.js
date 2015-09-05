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
				this.picInView = this.picViews[0]

				$(window).on('scroll', function(){
					var scrollTop = $(window).scrollTop()
					var windowHeight = $(window).height()

					_.each(this.picViews, function(picView){
						picView.render()
						if(picView.topOffset < ( scrollTop + 1/2 * windowHeight) &&
						       picView.topOffset + picView.height > ( scrollTop + 1/2 * windowHeight) )
							picView.select(), this.emit('viewing', picView), this.picInView = picView
						else
							picView.unselect()
					}.bind(this))
				}.bind(this))
			}.bind(this))
		},

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
		initialize: function(options){
			_.bindAll(this)
			this.picsView = options.picsView
			this.picsView.on('viewing', this.render)
			this.$el.attr('style','height:100%')
			this.generateLocationFeatures()
			this.svg = svg = d3.select(this.$el.append('<svg></svg>').find('svg').get(0))

			svg.append("path")
			  .attr("class", "borders land")
			svg.append("path")
			  .attr("class", "borders states")
			svg.append("path")
			  .attr("class", "city")
			svg.append("path")
			  .attr("class", "travelRoute")
			
			ImageData.done(function(ImageData){
				this.ImageData = ImageData
				ImageData.on('locationUpdated', function(model){
					var locationFeature = _.find(this.locations.features, function(feature){
						return feature.properties.id == model.id
					})
					if(!locationFeature){
						this.generateLocationFeatures().done(this.renderRoute)
					}else{
						locationFeature.geometry.coordinates = model.location.coordinates
						this.renderRoute()
					}
				}.bind(this))
				this.generateLocationFeatures().done(this.renderRoute)
			}.bind(this))
			this.render()
			$(window).on('resize', this.render)
		},
		generateLocationFeatures: function(){
			this.locations = { "type": "FeatureCollection", "features": []}
			return ImageData.done(function(ImageData){
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
				.scale(width*1.3)
				.translate([width / 2, height / 2])
			var path = this.path = d3.geo.path()
				.projection(projection)
			var svg = this.svg
			svg.attr("width", width)
			  .attr("height", height)
			usDfd.done(function(us){
				svg.select("path.land")
				  .datum(topojson.feature(us, us.objects.land))
				  .attr("d", path)
				svg.select("path.states")
				  .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b }))
				  .attr("d", path)

				this.renderRoute()

				this.renderFlowControl.inProgress = false
				if(this.renderFlowControl.requested){
					this.render()
				}
			}.bind(this))
		},
		renderRoute: function(renderRoute){
			//ex: { "type": "Point", "coordinates": [100.0, 0.0] }
			if(!this.ImageData) return 
			var viewedCoords = this.ImageData.getLocationFor(this.picsView.picInView.model).coordinates
			console.log("Rendering locations:", this.locations)
			var travelRoutePlaces = { "type": "FeatureCollection", "features": 
				_.dropRightWhile(this.locations.features, function(feature){
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
			//_.takeWhile(array

			var svg = this.svg
			var path = this.path
			svg.select("path.city")
			  .datum(travelRoutePlaces)
			  .attr("d", path)

			if(this.locations.features.length >= 2){
				console.log("Rendering route:", travelRouteLine)
				svg.select("path.travelRoute")
				  .datum(travelRouteLine)
				  .attr("d", path)
			}


		}
	})



	var picsView = new PicsView
	var mapView = new MapView({picsView:picsView})

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