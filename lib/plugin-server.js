'use strict';

var pluginPoints = require('./plugin-points');

module.exports = function (gulp, gutil) {
	var validPluginPoints = pluginPoints.getPoints();

	function validateAndCollectPluginPoints(points) {
		var pluginPoints = [];
		var error = false;
		points.forEach(function(point){
			var pluginPoint = point.trim();
			if (validPluginPoints.indexOf(pluginPoint) > -1) {
				pluginPoints.push(point.trim());
			} else {
				gutil.log(gutil.colors.red(pluginPoint + ' is not a valid plugin point'));
				error = true;
			}
		});

		if (error) {
			process.exit(1);
		}

		return { 'pluginPoints': pluginPoints };
	}

	function getPluginPoints() {
		var points = gutil.env['points'];
		if (typeof points !== 'undefined') {
			return validateAndCollectPluginPoints(points.split(','));
		}

		//validated server.conf.json plugin points
		var pluginPoints = server.pluginPoints();
		if (typeof pluginPoints !== 'undefined') {
			return validateAndCollectPluginPoints(pluginPoints);
		}

		return undefined;
	}

	function pluginPoint(pointName) {
		return {
			name: pointName
		};
	}

	var server;
	var error = false;
	try {
		server = require('../lib/server.js')(gulp, gutil);
		if (server.serverUrl() === undefined) {
			gutil.log(gutil.colors.red('A server URL is required in your configuration. ' +
			'Please use template.server.conf.json to create server.conf.json.'));
			error = true;
		}
		if (server.pluginToken() === undefined) {
			gutil.log(gutil.colors.red('A plugin token is required in your configuration. ' +
			'Please use template.server.conf.json to create server.conf.json.'));
			error = true;
		}
	} catch (err) {
		gutil.log(gutil.colors.red(err.message));
		error = true;
	}

	if (error) {
		process.exit(1);
	}

	return {
		getPluginPoints: function() {
			return getPluginPoints();
		},
		getServer: function() {
			return server;
		},
		getPluginPointChoices: function() {
			var pluginPointChoices = [];

        	validPluginPoints.forEach(function(point) {
        		pluginPointChoices.push(pluginPoint(point));
        	});

        	return pluginPointChoices;
		}
	};
};