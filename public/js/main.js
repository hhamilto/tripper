Backbone.$ = $
$(document).ready(function(){

	var PicsView = Backbone.View.extend({
		template: _.template($('#pics-list-template').html()),
		initialize: function(){
			$.ajax({
				url:'pics',
				method: 'GET',
				dataType: 'json',
			}).done(function(files){
				console.log( files)
				this.$el.html(this.template({files:files}))
			}.bind(this))

		}
	})


	var picsView = new PicsView

	var appRouter = new Backbone.Router
	appRouter.route('/*', '/', function(){
		$('#js-app-container').children().detach().append(picsView.el)
		$('#js-app-container').append(picsView.el)
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