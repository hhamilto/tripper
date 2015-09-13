_ = require('lodash')
deferred = require('deferred')
async = require('async')

conf = require('./conf.json')

availableMigrations = fs.readdirSync(__dirname+'/migrations')

dropAndCreateSql = fs.readFileSync(__dirname+'/dropAndCreate.sql').toString()
createMigrationTableSql = fs.readFileSync(__dirname+'/createMigrationTable.sql').toString()

var migrationConn = mysql.createConnection(_.defaults({
	multipleStatements: true
},conf.database))

module.exports.runMigrations = function(){
	var dfd = deferred()
	createMigrationTableIfNotExist().done(function(){
		migrationConn.query('SELECT fileName FROM Migrations', function(err, rows){
			if(err) throw err
			var appliedMigrations = _.map(rows,'fileName')
			var unappliedMigrations = _.difference(availableMigrations, appliedMigrations)
			async.each(unappliedMigrations, function(migrationFileName, cb){
				fs.readFile(__dirname+'/migrations/'+migrationFileName, function(err, sqlContent){
					if(err) cb(err)
					else migrationConn.query(sqlContent.toString(), function(err){
						if(err) cb(err)
						else migrationConn.query('INSERT INTO Migrations (fileName) VALUES (?)', migrationFileName, function(err){
							if(err) cb(err)
							else cb()
						})
					})
				})
			}, function(err){
				if(err)dfd.reject(err)
				else dfd.resolve(err)
			})
		})
	})
	return dfd.promise
}

createMigrationTableIfNotExist = function(){
	var dfd = deferred()
	migrationConn.query('SHOW TABLES', function(err, results) {
		if (err) throw err
		if(_.filter(results, {Tables_in_Tripper: 'Migrations'}).length == 0){
			migrationConn.query(createMigrationTableSql, function(err, results) {
				if (err) dfd.reject(err)
				else dfd.resolve()
			})
		}else{
			dfd.resolve()
		}
	})
	return dfd.promise
}

module.exports.dropAndCreate = function(){
	var dfd = deferred()
	migrationConn.query(dropAndCreateSql, function(err, results) {
		if (err) dfd.reject(err)
		else dfd.resolve()
	})
	return dfd.promise
}

