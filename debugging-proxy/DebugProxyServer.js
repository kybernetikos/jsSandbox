var net = require('net');
var Displayer = require('./Displayer');
var log = new Displayer();

function DebugProxyServer(remoteServer, remotePort, proxyPort) {
	this.remoteServer = remoteServer;
	this.remotePort = remotePort;
	this.proxyPort = proxyPort;
}

DebugProxyServer.prototype.start = function() {
	var remotePort = this.remotePort;
	var remoteServer = this.remoteServer;
	var proxyPort = this.proxyPort;

	this.proxy = net.createServer(function(incoming) {
		console.log('Incoming connection from ' + incoming.remoteAddress);

		incoming.on('end', function() {
			console.log('Incoming connection disconnected.');
		});

		incoming.on('data', function(data) {
			console.log(" ");
			log.in(data);
		});

		var outgoing = new net.Socket();
		outgoing.on('connect', function() {
			console.log('Outbound connection to '+ remoteServer + " : " + remotePort + " established.");
		});

		outgoing.on('data', function(data) {
			console.log(" ");
			log.out(data);
		});

		outgoing.connect(remotePort, remoteServer);
		outgoing.pipe(incoming);
		incoming.pipe(outgoing);
	});

	this.proxy.listen(proxyPort, function() {
		console.log('Proxy listening on port ' + proxyPort + '.\n');
	});
};


if (require.main !== module) {
	module.exports = DebugProxyServer;
} else {
	var args = process.argv.slice(2);

	var remoteHost = "adami.caplin.com";
	var remotePort = "15002";
	var proxyPort = "8124"

	if (args.length > 0) {
		remoteHost = args[0];
	}
	if (args.length > 1) {
		remotePort = args[1];
	}
	if (args.length > 2) {
		proxyPort = args[2];
	}

	var proxyServer = new DebugProxyServer(remoteHost, remotePort, proxyPort);
	proxyServer.start();
}