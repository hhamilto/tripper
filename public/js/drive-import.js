CreateNewTripViewFromDrive = Backbone.View.extend({
	template: _.template($('#drive-upload-template').html()),
	events: {
		"click button.js-relogin": "reauthorize",
		"click .your-drve-tab": "yourDriveActivated",
		"click .shared-drive-tab": "sharedDriveActivated",
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
	sharedDriveFolder: {
		id: 'shared',
		htmlRepresentation: 'Your Google Drive'
	},
	yourDriveFolder: {
		id: 'root',
		htmlRepresentation: 'Shared with you'
	},
	yourDriveActivated: function(){
		this.$folderSpan.html('')
	},
	sharedDriveActivated: function(){
		this.$folderSpan
	},
	retrieveChildren: function(options, callback) {
		var retrievePageOfFiles = function(request, result) {
			request.execute(function(resp) {
				result = result.concat(resp.items)
				var nextPageToken = resp.nextPageToken
				if (nextPageToken) {
					request = gapi.client.drive.children.list(_.defaults({
						'pageToken': nextPageToken
					}, options))
					retrievePageOfFiles(request, result)
				} else {
					callback(result)
				}
			}.bind(this))
		}.bind(this)
		var initialRequest = gapi.client.drive.children.list(options)
		retrievePageOfFiles(initialRequest, [])
	},
	retrieveShared: function(options, callback) {
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
					callback(result)
				}
			}.bind(this))
		}.bind(this)
		var initialRequest = gapi.client.drive.files.list(options)
		retrievePageOfFiles(initialRequest, [])
	},
	upTemplate: _.template($('#drive-up-folder-template').html()),
	handleAuthResult: function(authResult) {
		console.log(authResult)
		if (!authResult.error) {
			// Access token has been successfully retrieved, requests can be sent to the API
			this.$el.find('.js-authorizing').addClass('hidden')
			this.$el.find('.js-loading-drive').removeClass('hidden')
			var populateFileList = function(tabClass){
				var lastFileArray
				var populateFromFileArray = function(fileArray){
					lastFileArray = fileArray
					this.$el.find('.js-loading-drive').addClass('hidden')
					this.$el.find('.js-choose-folder').removeClass('hidden')
					console.log(fileArray)
					_.each(fileArray, function(file){
						var driveItemView = new DriveItemView({fileId:file.id})
						driveItemView.on('open', function(openedFile, htmlRepresentation){
							//htmlRepresentation is slurped off the li
							this.$folderSpan.html(htmlRepresentation)
							this.$folderSpan.data
							this.$el.find(tabClass).empty()
							var $up = this.$el.find(tabClass).append(this.upTemplate(file)).children(':last')
							$up.on('click', function(e){
								e.preventDefault()
								this.$el.find(tabClass).empty()
								populateFromFileArray(lastFileArray)
							}.bind(this))
							this.retrieveChildren({
								folderId: openedFile.id,
								q: 'trashed=false'
							},populateFileList(tabClass))
						}.bind(this))
						this.$el.find(tabClass).append(driveItemView.el)
					}.bind(this))
				}.bind(this)
				return populateFromFileArray
			}.bind(this)
			gapi.client.load('drive', 'v2', function(){
				this.retrieveChildren({
					folderId: 'root',
					q: 'trashed=false'
				},populateFileList('.js-drive-files-owned'))
				this.retrieveShared({
				},populateFileList('.js-drive-files-shared'))
			}.bind(this))
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

var count = 0

var DriveItemView = Backbone.View.extend({
	template: _.template($('#drive-item-template').html()),
	tagName: 'li',
	events: {
		"click a": "open"
	},
	initialize: function(options){
		_.bindAll(this)
		if(!options.model)
			gapi.client.drive.files.get({
				fileId: options.fileId
			}).execute(function(fileInfo){
				this.model = fileInfo
				this.render()
			}.bind(this))
		else
			this.render()
		if(options.shared)
			count++
	},
	render: function(){
		this.$el.html(this.template(this.model))
	},
	open: function(e){
		e.preventDefault()
		this.trigger('open', this.model, this.$el.find('a').html())
	}
})