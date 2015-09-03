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
			var picInfos
			this.$el.attr('id','js-pic-list')
			$.ajax({
				url:'pics',
				method: 'GET',
				dataType: 'json',
			}).done(function(files){
				this.picViews = _.map(files, function(file){
					var picView = new PicView({model:file})
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
			$.ajax({
				url: 'pics/'+this.model.id+'/location',
				method: 'PUT',
				data: $(e.target).val()
			})
		}
	})






	var MapView = Backbone.View.extend({
		template: _.template($('#map-template').html()),
		render: function(){
			this.$el.attr('style','height:100%')
			var width=this.$el.width(), height = this.$el.height()
			var projection = d3.geo.albersUsa()
				.scale(1280)
				.translate([width / 2, height / 2])

			var path = d3.geo.path()
				.projection(projection)

			var svg = d3.select(this.$el.append('<svg></svg>').find('svg').get(0))
			  .attr("width", width)
			  .attr("height", height)
			usDfd.done(function(us){
				console.log(us)	
				svg.append("g")
				  .attr("class", "counties")
				/*
				.selectAll("path")
				  
				.enter()

				.append("path")
				  .attr("class", function(d) { return quantize(rateById.get(d.id)); })
				  .attr("d", path)*/

				svg.append("path")
				  .datum(topojson.mesh(us, us.objects.states, function(a, b) { return a !== b }))
				  .attr("class", "states")
				  .attr("d", path)

				svg.append("path")
				  .datum(topojson.feature(us, us.objects.land))
				  .attr("class", "states")
				  .attr("d", path)
			})
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