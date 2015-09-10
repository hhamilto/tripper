Backbone.$ = $
usDfd = $.ajax({
	url: 'us.json',
	method: 'GET',
	dataType: 'json'
})


$(document).ready(function(){

	var PictureListView = Backbone.View.extend({
		template: _.template($('#pics-list-template').html()),
		initialize: function(){
			_.bindAll(this)
			this.$el.attr('id','js-pic-list')
			var idCounter = 0

			ImageData.done(function(ImageData){
				ImageData.on('locationUpdated', this.render)
			}.bind(this))
		},
		render: function(){
			if(this.picViews){
				_.each(this.picViews, function(picview){
					picView.render()
				})
				return
			}
			ImageData.done(function(ImageData){
				var picInfos = ImageData.getPicInfos()
				// throw them all in this thing, 
				//so that they all render at once, instead of repainting, etc between every one.
				var shadowContainer = $('<div></div>') 
				var latch = Latch(picInfos.length+1, function(){
					this.updatePicInView()
				}.bind(this))
				var picviewsAttached = $.Deferred()
				this.picViews = _.map(picInfos, function(picInfo){
					var picView = new PicView({model:picInfo,attached:picviewsAttached})
					picView.$el.appendTo(shadowContainer)
					picView.loaded.done(latch)
					return picView
				}.bind(this))
				this.$el.append(shadowContainer)
				picviewsAttached.resolve()
				latch()//we need the _.map to finish, in the case where the pic views are all loaded

				$(window).on('resize', _.throttle(function(){
					this.windowHeight = $(window).height()
				}, 300))
				$(window).on('scroll', this.updatePicInView)
			}.bind(this))
		},
		updatePicInView: function(){
			if(!this.windowHeight) this.windowHeight = $(window).height()
			var scrollTop = $(window).scrollTop()
			_.each(this.picViews, function(picView){
				if(picView.topOffset == -1) picView.updateOffset()
				if(picView.topOffset < ( scrollTop + 1/2 * this.windowHeight) &&
				       picView.topOffset + picView.height > ( scrollTop + 1/2 * this.windowHeight) )
					 this.picInView = picView, this.trigger('viewing', picView)
			}.bind(this))
		},
	})

	var PicView = Backbone.View.extend({
		template: _.template($('#pic-item-template').html()),
		attributes:{
			'class':'picture-view'
		},
		events: {
			'input input': 'locationChanged'
		},
		height: -1,
		topOffset: -1,
		initialize: function(options){
			_.bindAll(this)
			this.render()
			this.attached = options.attached
			this.loaded = $.Deferred()
			var $img = this.$el.find('img')
			if( $img.get(0).complete )
				this.loaded.resolve()
			else
				$img.on('load', this.loaded.resolve)
			$.when(this.loaded,this.attached).done(this.updateOffset)
			this.$el.attr('id', this.model.id)
		},
		render: function(){
			this.$el.html(this.template(this.model))
			ImageData.done(function(ImageData){
				this.$el.find('.js-location').val(ImageData.getLocationFor(this.model).text)
			}.bind(this))
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
			this.pictureListView = options.pictureListView
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
			this.pictureListView.on('viewing', function(){

				this.renderRoute()
			}.bind(this))
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
			if(!this.ImageData || !this.pictureListView.picInView || !this.pictureListView.picInView.model || !this.path) return 

			if(!force && this.oldPicInView == this.pictureListView.picInView) return
			this.oldPicInView = this.pictureListView.picInView

			var viewedLocation = this.ImageData.getLocationFor(this.pictureListView.picInView.model)
			if(!viewedLocation) return

			var viewedCoords = viewedLocation.coordinates
			var features = SVGDrawingUtil.getViewedFeatures(this.locations.features, viewedCoords)
			var featureCollections = SVGDrawingUtil.getFeatureCollections(features)
			if(featureCollections.travelRoutePlaces.features.length == 0) return

			this.path.pointRadius(4.5)
			this.svg.select("path.city")
			  .datum(featureCollections.travelRoutePlaces)
			  .attr("d", this.path)

			this.path.pointRadius(7)
			this.svg.select("path.current-place")
			  .datum(featureCollections.travelRouteCurrentPlace)
			  .attr("d", this.path)
			this.updateRouteLineKey = Math.random()//use in case we scroll quickly and don't get the route callback in the order we request them
			SVGDrawingUtil.updateRouteLine(features, this.updateRouteLine, this.updateRouteLineKey)
		},
		updateRouteLine: function(key, featureCollection){
			if(this.updateRouteLineKey != key) return

			this.svg.select("path.travel-route")
			  .datum(featureCollection)
			  .attr("d", this.path)
		}
	})

	var pictureListView = new PictureListView
	var mapView = new MapView({pictureListView:pictureListView})

	var appRouter = new Backbone.Router
	appRouter.route('/*', '/', function(){
		$('#js-pics').children().detach()
		$('#js-pics').append(pictureListView.el)
		$('#js-map').children().detach()
		$('#js-map').append(mapView.el)
		pictureListView.render()
		mapView.render()
	})
	Backbone.history.start()
	appRouter.navigate('/', {trigger: true})
})