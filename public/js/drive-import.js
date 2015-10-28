

CreateNewTripViewFromDrive = Backbone.View.extend({
	template: _.template($('#drive-upload-template').html()),
	events: {
		"click button.js-relogin": "reauthorize",
		"click .js-your-drive-tab": "yourDriveActivated",
		"click .js-shared-drive-tab": "sharedDriveActivated",
	},
	CLIENT_ID: '1070366409195-dkfapucfumbav3larfvb7uvji6q06ut3.apps.googleusercontent.com',
	SCOPES: ['https://www.googleapis.com/auth/drive.readonly'],
	
	initialize: function(){
		_.bindAll(this)
		this.$el.html(this.template(this.model))
		//ui presents: authorizing spinner
		this.$folderSpan = this.$el.find('.js-import-folder')
		gapiLoaded.done(function(){
			gapi.auth.authorize({
				'client_id': this.CLIENT_ID,
				'scope': this.SCOPES,
				'login_hint': 'hhamilto@mtu.edu',
				'immediate': true,
			},this.handleAuthResult)
		}.bind(this))
	},
	authSuccess: function(){
		// Access token has been successfully retrieved, requests can be sent to the API
		this.$el.find('.js-authorizing').addClass('hidden')
		this.$el.find('js-loading-drive').removeClass('hidden')
		
		gapi.client.load('drive', 'v2', function(){
			this.$el.find('.js-loading-drive').addClass('hidden')
			this.$el.find('.js-choose-folder').removeClass('hidden')
			this.yourDriveFilePickerView = new YourDriveFilePickerView
		//	this.sharedDriveFilePickerView = new SharedDriveFilePickerView
			this.$el.find('.js-folder-picker-container')
			.append(this.yourDriveFilePickerView.el)
		//	.append(this.sharedDriveFilePickerView.el)
		}.bind(this))
	},
	handleAuthResult: function(authResult) {
		console.log(authResult)
		if (!authResult.error) {
			this.authSuccess()
		} else {
			// No access token could be retrieved, force the authorization flow.
			gapi.auth.authorize({
				'client_id': this.CLIENT_ID,
				'scope': this.SCOPES,
				'immediate': false
			},this.handleAuthResult)
		}
	},
	reauthorize: function(){
		gapi.auth.authorize({
			'client_id': this.CLIENT_ID,
			'scope': this.SCOPES,
			'immediate': false,
			'approval_prompt' : 'force'
		},this.handleAuthResult)
	}
})

var File = Backbone.Model.extend({
	parent: null,
	googleFileId: null,
	fetchingFileList: false,
	iconLink:'',
	title:'',
	getFileList: function() {
		this.set('fetchingFileList',true)
		var options = {
			folderId: this.get('googleFileId'),
			q: 'trashed=false'
		}
		var retrievePageOfFiles = function(request) {
			request.execute(function(resp) {
				var fileArray = []
				var countDown = Latch(resp.items.length, function(){
					this.trigger('filesLoaded', fileArray)
				}.bind(this))
				_.each(resp.items, function(file,i){
					gapi.client.drive.files.get({
						fileId: file.id
					}).execute(function(fileInfo){
						var file = new File({
							googleFileId: fileInfo.id,
							parent: this,
							iconLink: fileInfo.iconLink,
							title: fileInfo.title
						})
						fileArray[i] = file
						countDown()
					}.bind(this))
				}.bind(this))

				var nextPageToken = resp.nextPageToken
				if (nextPageToken) {
					request = gapi.client.drive.children.list(_.defaults({
						'pageToken': nextPageToken
					}, options))
					retrievePageOfFiles(request)
				} else {
					this.set('fetchingFileList', false)
					this.trigger('filesDoneLoading')
				}
			}.bind(this))
		}.bind(this)
		var initialRequest = gapi.client.drive.children.list(options)
		retrievePageOfFiles(initialRequest)
	}
})

var YourDriveFilePickerView = Backbone.View.extend({
	template: _.template($('#drive-folder-picker-template').html()),
	upTemplate: _.template($('#drive-up-folder-template').html()),
	attributes: {
		role:"tabpanel",
		class:"tab-pane active",
		id: "drive-files-owned"
	},
	initialize: function(options){
		_.bindAll(this)
		this.$el.html(this.template())
		this.model = new File({
			googleFileId:'root'
		})
		this.loadFilesFromModel()
	},
	loadFilesFromModel: function(){
		this.model.on('filesLoaded', this.appendFiles)
		/*var filesDoneLoadingHander = function(){
			this.model.off('filesLoaded', this.appendFiles)
			this.model.off('filesDoneLoading', filesDoneLoadingHander)
		}.bind(this)
		this.model.on('filesDoneLoading',filesDoneLoadingHander)*/
		this.model.getFileList()

	},
	appendFiles: function(fileArray){
		console.log('yo')
		var $ol = this.$el.find('ol')
		$ol.empty()
		if(this.model.get('parent')){
			var $up = this.$el.find('ol').append(this.upTemplate()).children(':last')
			$up.on('click', function(e){
				e.preventDefault()
				this.trigger('selected', this.model.get('parent'))
				this.model = this.model.get('parent')
				this.loadFilesFromModel()
			}.bind(this))
		}

		var before = Date.now()
		$ol.hide()
		_.each(fileArray, function(file){

			var driveItemView = new DriveItemView({
				model: file,
				parentView:this
			})
			driveItemView.on('open', function(folder){
				this.trigger('selected', folder)
				$ol.empty()
				this.model = file
				this.loadFilesFromModel()
			}.bind(this))
			$ol.append(driveItemView.el)
		}.bind(this))
		$ol.show()
		console.log('lol', Date.now() - before)
	}
})

var SharedDriveFilePickerView = Backbone.View.extend({
	template: _.template($('#drive-folder-picker-template').html()),
	upTemplate: _.template($('#drive-up-folder-template').html()),
	attributes: {
		role:"tabpanel",
		class:"tab-pane",
		id: "drive-files-shared"
	},
	initialize: function(){
		_.bindAll(this)
		this.$el.html(this.template())

		this.retrieveShared(this.populateFromFileArray)
	},
	retrieveShared: function(options, callback) {
		if(typeof options == 'function'){
			callback = options
			options = {}
		}
		_.defaults(options,{
			'q': 'sharedWithMe AND trashed=false'
		})
		var retrievePageOfFiles = function(request, result) {
			request.execute(function(resp) {
				console.log('shared req-resp: items.length: '+resp.items.length)
				result = result.concat(resp.items)
				var nextPageToken = resp.nextPageToken
				if (nextPageToken) {
					request = gapi.client.drive.files.list(_.defaults({
						'pageToken': nextPageToken
					}, options))
					retrievePageOfFiles(request, result)
				} else {
					callback(result, {
						folderId: 'sharedWithMe',
						htmlRepresentation: "Shared with me"
					})
				}
			}.bind(this))
		}.bind(this)
		var initialRequest = gapi.client.drive.files.list(options)
		retrievePageOfFiles(initialRequest, [])
	}
})

var DriveItemView = Backbone.View.extend({
	template: _.template($('#drive-item-template').html()),
	tagName: 'li',
	events: {
		"click a": "open"
	},
	initialize: function(options){
		this.$el.html(this.template(this.model.attributes))
	},
	open: function(e){
		e.preventDefault()
		this.trigger('open', this.model)
	}
})