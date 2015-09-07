Backbone.$ = $
usDfd = $.ajax({
	url: 'us.json',
	method: 'GET',
	dataType: 'json'
})

$(document).ready(function(){

	var PicsView = Backbone.View.extend({
		template: _.template($('#pics-list-template').html()),
		initialize: function(){
			_.bindAll(this)
			this.$el.attr('id','js-pic-list')
		},
		render: function(){
			ImageData.done(function(ImageData){
				var picInfos = ImageData.getPicInfos()

				// throw them all in this thing, 
				//so that they all render at once, instead of repainting, etc between every one.
				var shadowContainer = $('<div></div>') 
				this.picViews = _.map(picInfos, function(picInfo){
					var picView = new PicView({model:picInfo})
					picView.$el.appendTo(shadowContainer)
					return picView
				}.bind(this))
				this.$el.append(shadowContainer)
				this.picInView = this.picViews[0]

				this.windowHeight = $(window).height()
				$(window).on('resize', _.throttle(function(){
					this.windowHeight = $(window).height()
				}, 300))
				$(window).on('scroll', this.updatePicInView)
			}.bind(this))
		},
		updatePicInView: function(){
			var scrollTop = $(window).scrollTop()
			_.each(this.picViews, function(picView){
				if(picView.topOffset == -1) picView.updateOffset()
				if(picView.topOffset < ( scrollTop + 1/2 * this.windowHeight) &&
				       picView.topOffset + picView.height > ( scrollTop + 1/2 * this.windowHeight) )
					this.trigger('viewing', picView), this.picInView = picView
			}.bind(this))
		},
	})

	var PicView = Backbone.View.extend({
		template: _.template($('#pic-item-template').html()),
		events: {
			'input input': 'locationChanged'
		},
		height: -1,
		topOffset: -1,
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
		updateOffset: function(){
			this.topOffset = this.$el.offset().top
			this.height = this.$el.height()
		},
		locationChanged: function(e){
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
			this.renderFlowControl.render = this.render
			this.picsView = options.picsView
			this.$el.attr('style','height:100%')
			this.generateLocationFeatures()
			this.$el.html(this.template())

			this.svg = svg = d3.select(this.$el.find('svg').get(0))
			
			ImageData.done(function(ImageData){
				this.ImageData = ImageData
				ImageData.on('locationUpdated', function(model){
					var locationFeature = _.find(this.locations.features, function(feature){
						return feature.properties.id == model.id
					})
					if(!locationFeature){
						this.generateLocationFeatures().done(_.partial(this.renderRoute,true))
					}else{
						locationFeature.geometry.coordinates = model.location.coordinates
						this.renderRoute(true)
					}
				}.bind(this))
				this.generateLocationFeatures().done(this.renderRoute)
			}.bind(this))
			this.picsView.on('viewing', function(){
				this.renderRoute()
			}.bind(this))
			this.render()
			$(window).on('resize', _.throttle(this.render, 300))
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
			render: null,
			inProgress: false,
			requested: false,
			requestEntrance: function(){
				if(this.inProgress){
					this.requested = true
					return false
				}
				return true
			},
			exit: function(){
				this.inProgress = false
				if(this.requested){
					this.render()
				}
			}
		},
		render: function(force){
			console.log('hello')
			if(!this.renderFlowControl.requestEntrance()) return
			//do we have to rerender
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
				this.renderRoute(true)
				this.renderFlowControl.exit()
			}.bind(this))
		},
		renderRoute: function(force){
			//ex: { "type": "Point", "coordinates": [100.0, 0.0] }
			if(!this.ImageData || !this.picsView.picInView || !this.picsView.picInView.model || !this.path) return 

			if(!force && this.oldPicInView == this.picsView.picInView) return
			this.oldPicInView = this.picsView.picInView

			var viewedLocation = this.ImageData.getLocationFor(this.picsView.picInView.model)
			if(!viewedLocation) return
			var viewedCoords = viewedLocation.coordinates
			
			var featureCollections = SVGDrawingUtil.getFeatureCollections(this.locations.features, viewedCoords)

			var svg = this.svg
			var path = this.path
			path.pointRadius(4.5)
			svg.select("path.city")
			  .datum(featureCollections.travelRoutePlaces)
			  .attr("d", path)

			path.pointRadius(7)
			svg.select("path.current-place")
			  .datum(featureCollections.travelRouteCurrentPlace)
			  .attr("d", path)

			if(this.locations.features.length >= 2){
				svg.select("path.travel-route")
				  .datum(featureCollections.travelRouteLine)
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
		picsView.render()
		mapView.render()
		setTimeout(picsView.updatePicInView,10)
	})
	Backbone.history.start()
	appRouter.navigate('/', {trigger: true})
})