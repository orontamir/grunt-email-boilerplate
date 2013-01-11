/*
 * grunt custom server with ejs support
 * Based on grunt-contrib-server
 * http://gruntjs.com/
 *
 *
 * Copyright (c) 2013-2013 "Cowboy" Ben Alman, Marco "DWJ" Solazzi, contributors
 * Licensed under the MIT license.
 */
/*jshint node:true */
'use strict';

module.exports = function(grunt) {

	// Nodejs libs.
	var path = require('path');

	// External libs.
	var connect = require('connect');
	var ejs = require('ejs');
	var url = require('url');
	var fs = require('fs');

	var _ = grunt.utils._;

	grunt.registerMultiTask('server', 'Start a static web server.', function() {
		// Merge task-specific options with these defaults.
		var options = _.defaults(this.data || {}, {
			port: 8000,
			hostname: 'localhost',
			base: '.',
			keepalive: false,
			//don't use render middleware by default
			render: false
		});

		// Connect requires the base path to be absolute.
		var base = path.resolve( grunt.template.process(options.base) );

		// Sweet, sweet middleware.
		var middleware = [];
		var renderTask;

		/*var req_render = function (options) {
			var o = _.defaults(options || {}, {
				root: base
			});
			return function (req, res, next) {
				//only process html requests
				if (/\.html$/.test(req.url)) {
					res.render(path.basename(req.url), o);
				} else {
					next();
				}
			};
		};*/

		if (options.render) {

			if (typeof options.render === 'string') {
				//if a string resolve toa specific target
				renderTask = grunt.config(options.render);
			} else {
				//else look for a render task in config with the same target
				renderTask = grunt.config('render.' + this.target);
			}

			if (_.isObject(renderTask)) {
				//enqueue dynamic template rendering
				middleware.push(function (options) {
					var o = _.defaults(options, { root: base });
					return function (req, res, next) {

						var file;

						//only process html requests
						if (!/\.html$/.test(req.url)) {
							return next();
						}
						//ensure it's a proper path
						o.root = grunt.template.process(o.root);
						file = path.join(o.root, url.parse(req.url).pathname);
						fs.readFile(file, 'utf8', function(err, str){
							if (err) { return next(err); }
							try {
								str = ejs.render(str, _.extend({filename: file}, o));
								res.setHeader('Content-Type', 'text/html');
								res.setHeader('Content-Length', Buffer.byteLength(str));
								res.end(str);
							} catch (err) {
								next(err);
							}
						});
					};
				}(renderTask.options || {}));
			}

		}

		middleware.push(
			// Serve static files.
			connect.static(base),
			// Make empty directories browsable. (overkill?)
			connect.directory(base)
		);

		// If --debug was specified, enable logging.
		if (grunt.option('debug')) {
			connect.logger.format('grunt', ('[D] server :method :url :status ' +
				':res[content-length] - :response-time ms').magenta);
			middleware.unshift(connect.logger('grunt'));
		}

		// Start server.
		grunt.log.writeln('Starting static web server on ' + options.hostname + ':' + options.port + '.');
		connect.apply(null, middleware).listen(options.port, options.hostname);

		// So many people expect this task to keep alive that I'm adding an option
		// for it. Running the task explicitly as grunt:keepalive will override any
		// value stored in the config. Have fun, people.
		if (this.flags.keepalive || options.keepalive) {
			// This is now an async task. Since we don't store a handle to the "done"
			// function, this task will never, ever, ever terminate. Have fun!
			this.async();
			grunt.log.write('Waiting forever...');
		}
	});

};