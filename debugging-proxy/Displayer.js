function pad(string, length, padStr) {
	length = length || 2;
	padStr = padStr || " ";
	while (string.length < length) {
		string = string + padStr;
	}
	return string;
}

function formatByte(byte) {
	var str = "0" + byte.toString(16);
	str = str.substring(str.length - 2);
	return str;
}

var colors = {
	black: 0, red: 1, green: 2, yellow: 3, blue: 4, magenta: 5, cyan: 6, white: 7
};

function style(str, style) {
	var startCodes = [];
	var endCodes = [];
	for (var key in style) {
		if (key === 'color' || key === 'background') {
			var base = (key === 'color' ? 30 : 40);
			var styleParts = style[key].split(" ");
			var color = styleParts[styleParts.length - 1];
			var isBright = false;
			if (styleParts[0] === 'bright') {
				isBright = true;
			}
			startCodes.push("\x1B[" + (base + colors[color]) + (isBright ? ";1m" : "m"));
			endCodes.push("\x1B[" + (base + 9) + (isBright ? ";22m" : "m"))
		}
		// maybe add some of the other ansi styles in future.
	}
	return startCodes.join("") + str + endCodes.reverse().join("");
}

function Displayer() {
	this.lineBytes = [];
	this.lineTxt = [];
	this.lineLength = 20;
	this.lastPrefix = " ";
}
Displayer.prototype.writeByte = function(linePrefix, byte) {
	this.lastPrefix = linePrefix;
	this.lineBytes.push(formatByte(byte));

	if (byte <= 0x1f || (byte >= 0x80 && byte <= 0x9f)) {
		this.lineTxt.push(style(".", {color: "yellow"}));
	} else {
		this.lineTxt.push(new Buffer([byte]).toString('utf8'));
	}

	if (this.lineBytes.length >= this.lineLength) {
		this.flush(linePrefix);
	}
};

Displayer.prototype.flush = function(linePrefix) {
	if (this.lineBytes.length === 0) return;
	linePrefix = linePrefix || this.lastPrefix;
	var byteDisplay = pad(this.lineBytes.join(" "), this.lineLength * 3, " ");
	console.log(" " + linePrefix + " "
			+ style(byteDisplay, {color: 'white', background: 'cyan'})
			+ " : "
			+ this.lineTxt.join(""));
	this.lineBytes.length = 0;
	this.lineTxt.length = 0;
};

Displayer.prototype.writeBuffer = function(linePrefix, buffer) {
	for (var i = 0; i < buffer.length; ++i) {
		this.writeByte(linePrefix, buffer[i]);
	}
	this.flush(linePrefix);
};

Displayer.prototype.in = function(buffer) {
	this.writeBuffer(style("<", {color: 'blue'}), buffer);
};
Displayer.prototype.out = function(buffer) {
	this.writeBuffer(style(">", {color: 'magenta'}), buffer);
};

module.exports = Displayer;
