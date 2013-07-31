var utils = require('./util');
var extend = utils.extend, implement = utils.implement, fulfills = utils.fulfills,
		assign = utils.assign, statics = utils.statics, properties = utils.properties;

var http = require('http'), express = require('express'), fs = require('fs'), path = require('path');

function Server(port) {
	this.port = port || 9090;
	this.expressServer = null;
}

properties(Server, {
	start: function() {
		var app = this.expressServer = express.createServer();

		app.get(/.*\/modules\/.*\.js/, this.handleModuleRequest.bind(this));
		app.use(express.static(__dirname+"/../web"));

		app.listen(this.port);
	},

	handleModuleRequest: function(request, response) {
		response.setHeader('Content-Type', 'text/javascript');
		var baseFile = path.resolve('./web' + request.url);
		var parts = request.url.split("/");
		var moduleId = parts.slice(parts.indexOf("modules") + 1).join("/").replace(/\.js$/, "");
		fs.readFile(baseFile, 'utf8', function(err, filecontent) {
			response.end("defineModule("+JSON.stringify(moduleId)+", function(require, module, exports) {\n\n"+filecontent+"\n\n});");
		} );
	}
});

module.exports = Server;
