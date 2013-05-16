var VLQ = (function() {
	var encoding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
	var reverseEncoding = [];
	for (var i = encoding.length; i >= 0; --i) {
		reverseEncoding[encoding.charCodeAt(i)] = i;
	}

	// Converts a value 0 to 63 into the equivalent base64 character.
	// Returns the empty string if digit is not in the
	// right range.
	function encodeDigit(digit) {
		return encoding.charAt(digit);
	}

	// Converts the character code of a base64 digit
	// into its value.
	// Returns undefined if given an invalid character code.
	function decodeCharCode(digit) {
		return reverseEncoding[digit];
	}

	// Converts a VLQ encoded string into an array
	// of integers.
	function decode(vlqString) {
		var length = vlqString.length, position = 0, result = [],
				digit, sign, startingPosition;

		while (position < length) {
			value = 0;
			// startingPosition is the index into the string
			// that the encoding of the current integer starts
			startingPosition = position;
			do {
				if (position >= length) {
					// we've gone off the end of the string.
					throw new Error("decode: Not a valid VLQ string: '"+vlqString+"'.");
				}
				digit = decodeCharCode(vlqString.charCodeAt(position));
				if (digit === undefined) {
					throw new Error("decode: Invalid character "+vlqString.charCodeAt(position)+" at position "+position+" in string "+vlqString+" - not a base64 character.");
				}

				// set the next five bits of value
				value = value | ((digit & 31) << (position - startingPosition) * 5);

				++position;
			} while (digit & 32);

			// The rightmost bit represents the sign (+ve/-ve).
			sign = value & 1;
			value = value >> 1;

			result.push(sign ? -value : value);
		}
		return result;
	}

	// Encodes a number into a VLQ string.
	function encodeValue(value) {
		var result = "", sign, current;

		if (value === 0) {
			// have to do something special to cope with -0
			sign = (1 / value) === -Infinity ? 1 : 0;
		} else {
			sign = value < 0 ? 1 : 0;
		}

		// negative numbers have their rightmost bit set.
		value = (Math.abs(value) << 1) | sign;

		// while there are bits remaining to encode:
		do {
			// get the lowest five bits remaining
			current = value & 31;
			// shift the bits remaining right by 5.
			value = value >> 5;
			// if there are more bits to write, set the 6th bit.
			if (value != 0) {
				current = current | 32;
			}
			// encode the current set of bits into a base64
			// character and append it to the result so far.
			result += encodeDigit(current);
		} while (value != 0);

		return result;
	}

	// Encodes an array of integers into a VLQ string.
	function encode(array) {
		var result = [];
		for (var i = array.length - 1; i >= 0; --i) {
			result[i] = encodeValue(array[i]);
		}
		return result.join("");
	}

	function DeltaCodec() {
		this.mostRecentEncodeValue = [];
		this.mostRecentDecodeValue = [];
	}
	DeltaCodec.prototype.encode = function(array) {
		var last = array.length - 1,
				toEncode = array.slice();
		for (var i = last; i >= 0; --i) {
			toEncode[i] = toEncode[i] - (this.mostRecentEncodeValue[i] || 0);
			this.mostRecentEncodeValue[i] = array[i];
		}
		return encode(toEncode);
	};
	DeltaCodec.prototype.decode = function(vlqString) {
		var data = decode(vlqString);
		for (var i = data.length - 1; i >= 0; --i) {
			data[i] = (this.mostRecentDecodeValue[i] || 0) + data[i];
			this.mostRecentDecodeValue[i] = data[i];
		}
		return data;
	};
	DeltaCodec.prototype.reset = function() {
		this.mostRecentDecodeValue = [];
		this.mostRecentEncodeValue = [];
	};
	DeltaCodec.prototype.resetColumn = function(columnNumber) {
		this.mostRecentDecodeValue[columnNumber] = undefined;
		this.mostRecentEncodeValue[columnNumber] = undefined;
	};

	return {
		decode: decode,
		encode: encode,
		DeltaCodec: DeltaCodec
	};
})();

if (typeof module !== "undefined") {
	module.exports = VLQ;
}