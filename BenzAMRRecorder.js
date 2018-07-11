(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.BenzAMRRecorder = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * @module audio-buffer-remix
 */
'use strict';

var isAudioBuffer = require('is-audio-buffer');
var AudioBuffer = require('audio-buffer');
var isPlainObj = require('is-plain-obj');

module.exports = remix;

remix.speakerMap = {
  1: {
    2: [0, 0],
    4: [0, 0, null, null],
    6: [null, null, 0, null, null]
  },
  2: {
    1: [function (dest, source) {
      var left = source.getChannelData(0);
      var right = source.getChannelData(1);
      for (var i = 0, l = dest.length; i < l; i++) {
        dest[i] = .5 * (left[i] + right[i]);
      }
    }],
    4: [0, 1, null, null],
    6: [0, 1, null, null, null, null]
  },
  4: {
    1: [function (dest, source) {
      var left = source.getChannelData(0);
      var right = source.getChannelData(1);
      var sleft = source.getChannelData(2);
      var sright = source.getChannelData(3);
      for (var i = 0, l = dest.length; i < l; i++) {
        dest[i] = .25 * (left[i] + right[i] + sleft[i] + sright[i]);
      }
    }],
    2: [function (dest, source) {
      var left = source.getChannelData(0);
      var sleft = source.getChannelData(2);
      for (var i = 0, l = dest.length; i < l; i++) {
        dest[i] = .5 * (left[i] + sleft[i]);
      }
    }, function (dest, source) {
      var right = source.getChannelData(1);
      var sright = source.getChannelData(3);
      for (var i = 0, l = dest.length; i < l; i++) {
        dest[i] = .5 * (right[i] + sright[i]);
      }
    }],
    6: [0, 1, null, null, 2, 3]
  },
  6: {
    1: [function (dest, source) {
      var left = source.getChannelData(0);
      var right = source.getChannelData(1);
      var center = source.getChannelData(2);
      var sleft = source.getChannelData(4);
      var sright = source.getChannelData(5);
      for (var i = 0, l = dest.length; i < l; i++) {
        dest[i] = 0.7071 * (left[i] + right[i]) + center[i] + 0.5 * (sleft[i] + sright[i]);
      }
    }],
    2: [function (dest, source) {
      var left = source.getChannelData(0);
      var center = source.getChannelData(2);
      var sleft = source.getChannelData(4);
      for (var i = 0, l = dest.length; i < l; i++) {
        dest[i] = left[i] + 0.7071 * (center[i] + sleft[i]);
      }
    }, function (dest, source) {
      var right = source.getChannelData(1);
      var center = source.getChannelData(2);
      var sright = source.getChannelData(5);
      for (var i = 0, l = dest.length; i < l; i++) {
        dest[i] = right[i] + 0.7071 * (center[i] + sright[i]);
      }
    }],
    4: [function (dest, source) {
      var left = source.getChannelData(0);
      var center = source.getChannelData(2);
      for (var i = 0, l = dest.length; i < l; i++) {
        dest[i] = left[i] + 0.7071 * center[i];
      }
    }, function (dest, source) {
      var right = source.getChannelData(1);
      var center = source.getChannelData(2);
      for (var i = 0, l = dest.length; i < l; i++) {
        dest[i] = right[i] + 0.7071 * center[i];
      }
    }, 4, 5]
  }
};

remix.discreteMap = Array(32).fill(0).map(function (v, i) {
  return i;
});

function remix(source, channels, options) {
  if (!isAudioBuffer(source)) throw Error('Pass AudioBuffer as the first param');
  var inputChannels = source.numberOfChannels;

  //shortcut same number
  if (channels === inputChannels) return source;

  if (!options) options = {};else if (typeof options === 'string') options = { interpretation: options };

  var interpretation = options.interpretation || 'speaker';

  //obtain map
  var map = void 0;
  if (typeof channels === 'number') {
    if (interpretation == 'discrete') {
      map = remix.discreteMap.slice(0, channels);
    } else {
      var inputMap = remix.speakerMap[inputChannels];
      if (inputMap) {
        map = inputMap[channels];
      }
      //if match is not found - do discrete interpretation
      if (!map) {
        map = remix.discreteMap.slice(0, channels);
      }
    }
  } else if (isPlainObj(channels)) {
    var arrMap = [];
    for (var i in channels) {
      arrMap[i] = channels[i];
    }
    map = arrMap;
    channels = map.length;
  } else if (Array.isArray(channels)) {
    map = channels;
    channels = channels.length;
  } else {
    throw Error('Target number of channels should be a number or map');
  }

  //source is buffer list - do per-buffer mapping
  if (source.map) {
    return source.map(mapBuffer);
  }
  //otherwise map once
  else {
      return mapBuffer(source);
    }

  function mapBuffer(source) {
    var dest = new AudioBuffer(channels, source.length, { context: options.context });
    for (var c = 0; c < channels; c++) {
      var outputData = dest.getChannelData(c);
      var mapper = map[c];
      if (mapper == null) continue;
      if (typeof mapper == 'number') {
        if (mapper >= source.numberOfChannels) continue;
        var inputData = source.getChannelData(mapper);
        outputData.set(inputData);
      } else if (typeof mapper == 'function') {
        mapper(outputData, source);
      }
    }
    return dest;
  }

  return dest;
}

},{"audio-buffer":2,"is-audio-buffer":8,"is-plain-obj":11}],2:[function(require,module,exports){
/**
 * AudioBuffer class
 *
 * @module audio-buffer/buffer
 */
'use strict';

var isBuffer = require('is-buffer');
var b2ab = require('buffer-to-arraybuffer');
var isBrowser = require('is-browser');
var isAudioBuffer = require('is-audio-buffer');
var context = require('audio-context');
var isPlainObj = require('is-plain-obj');

module.exports = AudioBuffer;

/**
 * @constructor
 *
 * @param {∀} data Any collection-like object
 */
function AudioBuffer(channels, data, sampleRate, options) {
	//enforce class
	if (!(this instanceof AudioBuffer)) return new AudioBuffer(channels, data, sampleRate, options);

	//detect last argument
	var c = arguments.length;
	while (!arguments[c] && c) {
		c--;
	}var lastArg = arguments[c];

	//figure out options
	var ctx,
	    isWAA,
	    floatArray,
	    isForcedType = false;
	if (lastArg && typeof lastArg != 'number') {
		ctx = lastArg.context || context && context();
		isWAA = lastArg.isWAA != null ? lastArg.isWAA : !!(isBrowser && ctx.createBuffer);
		floatArray = lastArg.floatArray || Float32Array;
		if (lastArg.floatArray) isForcedType = true;
	} else {
		ctx = context && context();
		isWAA = !!ctx;
		floatArray = Float32Array;
	}

	//if one argument only - it is surely data or length
	//having new AudioBuffer(2) does not make sense as 2 being number of channels
	if (data == null || isPlainObj(data)) {
		data = channels || 1;
		channels = null;
	}
	//audioCtx.createBuffer() - complacent arguments
	else {
			if (typeof sampleRate == 'number') this.sampleRate = sampleRate;else if (isBrowser) this.sampleRate = ctx.sampleRate;
			if (channels != null) this.numberOfChannels = channels;
		}

	//if AudioBuffer(channels?, number, rate?) = create new array
	//this is the default WAA-compatible case
	if (typeof data === 'number') {
		this.length = data;
		this.data = [];
		for (var c = 0; c < this.numberOfChannels; c++) {
			this.data[c] = new floatArray(data);
		}
	}
	//if other audio buffer passed - create fast clone of it
	//if WAA AudioBuffer - get buffer’s data (it is bounded)
	else if (isAudioBuffer(data)) {
			this.length = data.length;
			if (channels == null) this.numberOfChannels = data.numberOfChannels;
			if (sampleRate == null) this.sampleRate = data.sampleRate;

			this.data = [];

			//copy channel's data
			for (var c = 0, l = this.numberOfChannels; c < l; c++) {
				this.data[c] = data.getChannelData(c).slice();
			}
		}
		//TypedArray, Buffer, DataView etc, or ArrayBuffer
		//NOTE: node 4.x+ detects Buffer as ArrayBuffer view
		else if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer || isBuffer(data)) {
				if (isBuffer(data)) {
					data = b2ab(data);
				}
				//convert non-float array to floatArray
				if (!(data instanceof Float32Array) && !(data instanceof Float64Array)) {
					data = new floatArray(data.buffer || data);
				}

				this.length = Math.floor(data.length / this.numberOfChannels);
				this.data = [];
				for (var c = 0; c < this.numberOfChannels; c++) {
					this.data[c] = data.subarray(c * this.length, (c + 1) * this.length);
				}
			}
			//if array - parse channeled data
			else if (Array.isArray(data)) {
					//if separated data passed already - send sub-arrays to channels
					if (data[0] instanceof Object) {
						if (channels == null) this.numberOfChannels = data.length;
						this.length = data[0].length;
						this.data = [];
						for (var c = 0; c < this.numberOfChannels; c++) {
							this.data[c] = !isForcedType && (data[c] instanceof Float32Array || data[c] instanceof Float64Array) ? data[c] : new floatArray(data[c]);
						}
					}
					//plain array passed - split array equipartially
					else {
							this.length = Math.floor(data.length / this.numberOfChannels);
							this.data = [];
							for (var c = 0; c < this.numberOfChannels; c++) {
								this.data[c] = new floatArray(data.slice(c * this.length, (c + 1) * this.length));
							}
						}
				}
				//if ndarray, typedarray or other data-holder passed - redirect plain databuffer
				else if (data && (data.data || data.buffer)) {
						return new AudioBuffer(this.numberOfChannels, data.data || data.buffer, this.sampleRate);
					}
					//if other - unable to parse arguments
					else {
							throw Error('Failed to create buffer: check provided arguments');
						}

	//for browser - return WAA buffer, no sub-buffering allowed
	if (isWAA) {
		//create WAA buffer
		var audioBuffer = ctx.createBuffer(this.numberOfChannels, this.length, this.sampleRate);

		//fill channels
		for (var c = 0; c < this.numberOfChannels; c++) {
			audioBuffer.getChannelData(c).set(this.getChannelData(c));
		}

		return audioBuffer;
	}

	this.duration = this.length / this.sampleRate;
}

/**
 * Default params
 */
AudioBuffer.prototype.numberOfChannels = 2;
AudioBuffer.prototype.sampleRate = context.sampleRate || 44100;

/**
 * Return data associated with the channel.
 *
 * @return {Array} Array containing the data
 */
AudioBuffer.prototype.getChannelData = function (channel) {
	//FIXME: ponder on this, whether we really need that rigorous check, it may affect performance
	if (channel >= this.numberOfChannels || channel < 0 || channel == null) throw Error('Cannot getChannelData: channel number (' + channel + ') exceeds number of channels (' + this.numberOfChannels + ')');

	return this.data[channel];
};

/**
 * Place data to the destination buffer, starting from the position
 */
AudioBuffer.prototype.copyFromChannel = function (destination, channelNumber, startInChannel) {
	if (startInChannel == null) startInChannel = 0;
	var data = this.data[channelNumber];
	for (var i = startInChannel, j = 0; i < this.length && j < destination.length; i++, j++) {
		destination[j] = data[i];
	}
};

/**
 * Place data from the source to the channel, starting (in self) from the position
 * Clone of WAAudioBuffer
 */
AudioBuffer.prototype.copyToChannel = function (source, channelNumber, startInChannel) {
	var data = this.data[channelNumber];

	if (!startInChannel) startInChannel = 0;

	for (var i = startInChannel, j = 0; i < this.length && j < source.length; i++, j++) {
		data[i] = source[j];
	}
};

},{"audio-context":3,"buffer-to-arraybuffer":5,"is-audio-buffer":8,"is-browser":9,"is-buffer":10,"is-plain-obj":11}],3:[function(require,module,exports){
'use strict';

var cache = {};

module.exports = function getContext(options) {
	if (typeof window === 'undefined') return null;

	var OfflineContext = window.OfflineAudioContext || window.webkitOfflineAudioContext;
	var Context = window.AudioContext || window.webkitAudioContext;

	if (!Context) return null;

	if (typeof options === 'number') {
		options = { sampleRate: options };
	}

	var sampleRate = options && options.sampleRate;

	if (options && options.offline) {
		if (!OfflineContext) return null;

		return new OfflineContext(options.channels || 2, options.length, sampleRate || 44100);
	}

	//cache by sampleRate, rather strong guess
	var ctx = cache[sampleRate];

	if (ctx) return ctx;

	//several versions of firefox have issues with the
	//constructor argument
	//see: https://bugzilla.mozilla.org/show_bug.cgi?id=1361475
	try {
		ctx = new Context(options);
	} catch (err) {
		ctx = new Context();
	}
	cache[ctx.sampleRate] = cache[sampleRate] = ctx;

	return ctx;
};

},{}],4:[function(require,module,exports){
'use strict';

exports.byteLength = byteLength;
exports.toByteArray = toByteArray;
exports.fromByteArray = fromByteArray;

var lookup = [];
var revLookup = [];
var Arr = typeof Uint8Array !== 'undefined' ? Uint8Array : Array;

var code = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
for (var i = 0, len = code.length; i < len; ++i) {
  lookup[i] = code[i];
  revLookup[code.charCodeAt(i)] = i;
}

revLookup['-'.charCodeAt(0)] = 62;
revLookup['_'.charCodeAt(0)] = 63;

function placeHoldersCount(b64) {
  var len = b64.length;
  if (len % 4 > 0) {
    throw new Error('Invalid string. Length must be a multiple of 4');
  }

  // the number of equal signs (place holders)
  // if there are two placeholders, than the two characters before it
  // represent one byte
  // if there is only one, then the three characters before it represent 2 bytes
  // this is just a cheap hack to not do indexOf twice
  return b64[len - 2] === '=' ? 2 : b64[len - 1] === '=' ? 1 : 0;
}

function byteLength(b64) {
  // base64 is 4/3 + up to two characters of the original data
  return b64.length * 3 / 4 - placeHoldersCount(b64);
}

function toByteArray(b64) {
  var i, l, tmp, placeHolders, arr;
  var len = b64.length;
  placeHolders = placeHoldersCount(b64);

  arr = new Arr(len * 3 / 4 - placeHolders);

  // if there are placeholders, only get up to the last complete 4 chars
  l = placeHolders > 0 ? len - 4 : len;

  var L = 0;

  for (i = 0; i < l; i += 4) {
    tmp = revLookup[b64.charCodeAt(i)] << 18 | revLookup[b64.charCodeAt(i + 1)] << 12 | revLookup[b64.charCodeAt(i + 2)] << 6 | revLookup[b64.charCodeAt(i + 3)];
    arr[L++] = tmp >> 16 & 0xFF;
    arr[L++] = tmp >> 8 & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  if (placeHolders === 2) {
    tmp = revLookup[b64.charCodeAt(i)] << 2 | revLookup[b64.charCodeAt(i + 1)] >> 4;
    arr[L++] = tmp & 0xFF;
  } else if (placeHolders === 1) {
    tmp = revLookup[b64.charCodeAt(i)] << 10 | revLookup[b64.charCodeAt(i + 1)] << 4 | revLookup[b64.charCodeAt(i + 2)] >> 2;
    arr[L++] = tmp >> 8 & 0xFF;
    arr[L++] = tmp & 0xFF;
  }

  return arr;
}

function tripletToBase64(num) {
  return lookup[num >> 18 & 0x3F] + lookup[num >> 12 & 0x3F] + lookup[num >> 6 & 0x3F] + lookup[num & 0x3F];
}

function encodeChunk(uint8, start, end) {
  var tmp;
  var output = [];
  for (var i = start; i < end; i += 3) {
    tmp = (uint8[i] << 16) + (uint8[i + 1] << 8) + uint8[i + 2];
    output.push(tripletToBase64(tmp));
  }
  return output.join('');
}

function fromByteArray(uint8) {
  var tmp;
  var len = uint8.length;
  var extraBytes = len % 3; // if we have 1 byte left, pad 2 bytes
  var output = '';
  var parts = [];
  var maxChunkLength = 16383; // must be multiple of 3

  // go through the array every three bytes, we'll deal with trailing stuff later
  for (var i = 0, len2 = len - extraBytes; i < len2; i += maxChunkLength) {
    parts.push(encodeChunk(uint8, i, i + maxChunkLength > len2 ? len2 : i + maxChunkLength));
  }

  // pad the end with zeros, but make sure to not forget the extra bytes
  if (extraBytes === 1) {
    tmp = uint8[len - 1];
    output += lookup[tmp >> 2];
    output += lookup[tmp << 4 & 0x3F];
    output += '==';
  } else if (extraBytes === 2) {
    tmp = (uint8[len - 2] << 8) + uint8[len - 1];
    output += lookup[tmp >> 10];
    output += lookup[tmp >> 4 & 0x3F];
    output += lookup[tmp << 2 & 0x3F];
    output += '=';
  }

  parts.push(output);

  return parts.join('');
}

},{}],5:[function(require,module,exports){
(function (Buffer){
'use strict';

(function (root) {
  var isArrayBufferSupported = new Buffer(0).buffer instanceof ArrayBuffer;

  var bufferToArrayBuffer = isArrayBufferSupported ? bufferToArrayBufferSlice : bufferToArrayBufferCycle;

  function bufferToArrayBufferSlice(buffer) {
    return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  }

  function bufferToArrayBufferCycle(buffer) {
    var ab = new ArrayBuffer(buffer.length);
    var view = new Uint8Array(ab);
    for (var i = 0; i < buffer.length; ++i) {
      view[i] = buffer[i];
    }
    return ab;
  }

  if (typeof exports !== 'undefined') {
    if (typeof module !== 'undefined' && module.exports) {
      exports = module.exports = bufferToArrayBuffer;
    }
    exports.bufferToArrayBuffer = bufferToArrayBuffer;
  } else if (typeof define === 'function' && define.amd) {
    define([], function () {
      return bufferToArrayBuffer;
    });
  } else {
    root.bufferToArrayBuffer = bufferToArrayBuffer;
  }
})(undefined);

}).call(this,require("buffer").Buffer)

},{"buffer":6}],6:[function(require,module,exports){
/*!
 * The buffer module from node.js, for the browser.
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */
/* eslint-disable no-proto */

'use strict';

var base64 = require('base64-js');
var ieee754 = require('ieee754');

exports.Buffer = Buffer;
exports.SlowBuffer = SlowBuffer;
exports.INSPECT_MAX_BYTES = 50;

var K_MAX_LENGTH = 0x7fffffff;
exports.kMaxLength = K_MAX_LENGTH;

/**
 * If `Buffer.TYPED_ARRAY_SUPPORT`:
 *   === true    Use Uint8Array implementation (fastest)
 *   === false   Print warning and recommend using `buffer` v4.x which has an Object
 *               implementation (most compatible, even IE6)
 *
 * Browsers that support typed arrays are IE 10+, Firefox 4+, Chrome 7+, Safari 5.1+,
 * Opera 11.6+, iOS 4.2+.
 *
 * We report that the browser does not support typed arrays if the are not subclassable
 * using __proto__. Firefox 4-29 lacks support for adding new properties to `Uint8Array`
 * (See: https://bugzilla.mozilla.org/show_bug.cgi?id=695438). IE 10 lacks support
 * for __proto__ and has a buggy typed array implementation.
 */
Buffer.TYPED_ARRAY_SUPPORT = typedArraySupport();

if (!Buffer.TYPED_ARRAY_SUPPORT && typeof console !== 'undefined' && typeof console.error === 'function') {
  console.error('This browser lacks typed array (Uint8Array) support which is required by ' + '`buffer` v5.x. Use `buffer` v4.x if you require old browser support.');
}

function typedArraySupport() {
  // Can typed array instances can be augmented?
  try {
    var arr = new Uint8Array(1);
    arr.__proto__ = { __proto__: Uint8Array.prototype, foo: function foo() {
        return 42;
      } };
    return arr.foo() === 42;
  } catch (e) {
    return false;
  }
}

function createBuffer(length) {
  if (length > K_MAX_LENGTH) {
    throw new RangeError('Invalid typed array length');
  }
  // Return an augmented `Uint8Array` instance
  var buf = new Uint8Array(length);
  buf.__proto__ = Buffer.prototype;
  return buf;
}

/**
 * The Buffer constructor returns instances of `Uint8Array` that have their
 * prototype changed to `Buffer.prototype`. Furthermore, `Buffer` is a subclass of
 * `Uint8Array`, so the returned instances will have all the node `Buffer` methods
 * and the `Uint8Array` methods. Square bracket notation works as expected -- it
 * returns a single octet.
 *
 * The `Uint8Array` prototype remains unmodified.
 */

function Buffer(arg, encodingOrOffset, length) {
  // Common case.
  if (typeof arg === 'number') {
    if (typeof encodingOrOffset === 'string') {
      throw new Error('If encoding is specified then the first argument must be a string');
    }
    return allocUnsafe(arg);
  }
  return from(arg, encodingOrOffset, length);
}

// Fix subarray() in ES2016. See: https://github.com/feross/buffer/pull/97
if (typeof Symbol !== 'undefined' && Symbol.species && Buffer[Symbol.species] === Buffer) {
  Object.defineProperty(Buffer, Symbol.species, {
    value: null,
    configurable: true,
    enumerable: false,
    writable: false
  });
}

Buffer.poolSize = 8192; // not used by this implementation

function from(value, encodingOrOffset, length) {
  if (typeof value === 'number') {
    throw new TypeError('"value" argument must not be a number');
  }

  if (isArrayBuffer(value)) {
    return fromArrayBuffer(value, encodingOrOffset, length);
  }

  if (typeof value === 'string') {
    return fromString(value, encodingOrOffset);
  }

  return fromObject(value);
}

/**
 * Functionally equivalent to Buffer(arg, encoding) but throws a TypeError
 * if value is a number.
 * Buffer.from(str[, encoding])
 * Buffer.from(array)
 * Buffer.from(buffer)
 * Buffer.from(arrayBuffer[, byteOffset[, length]])
 **/
Buffer.from = function (value, encodingOrOffset, length) {
  return from(value, encodingOrOffset, length);
};

// Note: Change prototype *after* Buffer.from is defined to workaround Chrome bug:
// https://github.com/feross/buffer/pull/148
Buffer.prototype.__proto__ = Uint8Array.prototype;
Buffer.__proto__ = Uint8Array;

function assertSize(size) {
  if (typeof size !== 'number') {
    throw new TypeError('"size" argument must be a number');
  } else if (size < 0) {
    throw new RangeError('"size" argument must not be negative');
  }
}

function alloc(size, fill, encoding) {
  assertSize(size);
  if (size <= 0) {
    return createBuffer(size);
  }
  if (fill !== undefined) {
    // Only pay attention to encoding if it's a string. This
    // prevents accidentally sending in a number that would
    // be interpretted as a start offset.
    return typeof encoding === 'string' ? createBuffer(size).fill(fill, encoding) : createBuffer(size).fill(fill);
  }
  return createBuffer(size);
}

/**
 * Creates a new filled Buffer instance.
 * alloc(size[, fill[, encoding]])
 **/
Buffer.alloc = function (size, fill, encoding) {
  return alloc(size, fill, encoding);
};

function allocUnsafe(size) {
  assertSize(size);
  return createBuffer(size < 0 ? 0 : checked(size) | 0);
}

/**
 * Equivalent to Buffer(num), by default creates a non-zero-filled Buffer instance.
 * */
Buffer.allocUnsafe = function (size) {
  return allocUnsafe(size);
};
/**
 * Equivalent to SlowBuffer(num), by default creates a non-zero-filled Buffer instance.
 */
Buffer.allocUnsafeSlow = function (size) {
  return allocUnsafe(size);
};

function fromString(string, encoding) {
  if (typeof encoding !== 'string' || encoding === '') {
    encoding = 'utf8';
  }

  if (!Buffer.isEncoding(encoding)) {
    throw new TypeError('"encoding" must be a valid string encoding');
  }

  var length = byteLength(string, encoding) | 0;
  var buf = createBuffer(length);

  var actual = buf.write(string, encoding);

  if (actual !== length) {
    // Writing a hex string, for example, that contains invalid characters will
    // cause everything after the first invalid character to be ignored. (e.g.
    // 'abxxcd' will be treated as 'ab')
    buf = buf.slice(0, actual);
  }

  return buf;
}

function fromArrayLike(array) {
  var length = array.length < 0 ? 0 : checked(array.length) | 0;
  var buf = createBuffer(length);
  for (var i = 0; i < length; i += 1) {
    buf[i] = array[i] & 255;
  }
  return buf;
}

function fromArrayBuffer(array, byteOffset, length) {
  if (byteOffset < 0 || array.byteLength < byteOffset) {
    throw new RangeError('\'offset\' is out of bounds');
  }

  if (array.byteLength < byteOffset + (length || 0)) {
    throw new RangeError('\'length\' is out of bounds');
  }

  var buf;
  if (byteOffset === undefined && length === undefined) {
    buf = new Uint8Array(array);
  } else if (length === undefined) {
    buf = new Uint8Array(array, byteOffset);
  } else {
    buf = new Uint8Array(array, byteOffset, length);
  }

  // Return an augmented `Uint8Array` instance
  buf.__proto__ = Buffer.prototype;
  return buf;
}

function fromObject(obj) {
  if (Buffer.isBuffer(obj)) {
    var len = checked(obj.length) | 0;
    var buf = createBuffer(len);

    if (buf.length === 0) {
      return buf;
    }

    obj.copy(buf, 0, 0, len);
    return buf;
  }

  if (obj) {
    if (isArrayBufferView(obj) || 'length' in obj) {
      if (typeof obj.length !== 'number' || numberIsNaN(obj.length)) {
        return createBuffer(0);
      }
      return fromArrayLike(obj);
    }

    if (obj.type === 'Buffer' && Array.isArray(obj.data)) {
      return fromArrayLike(obj.data);
    }
  }

  throw new TypeError('First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.');
}

function checked(length) {
  // Note: cannot use `length < K_MAX_LENGTH` here because that fails when
  // length is NaN (which is otherwise coerced to zero.)
  if (length >= K_MAX_LENGTH) {
    throw new RangeError('Attempt to allocate Buffer larger than maximum ' + 'size: 0x' + K_MAX_LENGTH.toString(16) + ' bytes');
  }
  return length | 0;
}

function SlowBuffer(length) {
  if (+length != length) {
    // eslint-disable-line eqeqeq
    length = 0;
  }
  return Buffer.alloc(+length);
}

Buffer.isBuffer = function isBuffer(b) {
  return b != null && b._isBuffer === true;
};

Buffer.compare = function compare(a, b) {
  if (!Buffer.isBuffer(a) || !Buffer.isBuffer(b)) {
    throw new TypeError('Arguments must be Buffers');
  }

  if (a === b) return 0;

  var x = a.length;
  var y = b.length;

  for (var i = 0, len = Math.min(x, y); i < len; ++i) {
    if (a[i] !== b[i]) {
      x = a[i];
      y = b[i];
      break;
    }
  }

  if (x < y) return -1;
  if (y < x) return 1;
  return 0;
};

Buffer.isEncoding = function isEncoding(encoding) {
  switch (String(encoding).toLowerCase()) {
    case 'hex':
    case 'utf8':
    case 'utf-8':
    case 'ascii':
    case 'latin1':
    case 'binary':
    case 'base64':
    case 'ucs2':
    case 'ucs-2':
    case 'utf16le':
    case 'utf-16le':
      return true;
    default:
      return false;
  }
};

Buffer.concat = function concat(list, length) {
  if (!Array.isArray(list)) {
    throw new TypeError('"list" argument must be an Array of Buffers');
  }

  if (list.length === 0) {
    return Buffer.alloc(0);
  }

  var i;
  if (length === undefined) {
    length = 0;
    for (i = 0; i < list.length; ++i) {
      length += list[i].length;
    }
  }

  var buffer = Buffer.allocUnsafe(length);
  var pos = 0;
  for (i = 0; i < list.length; ++i) {
    var buf = list[i];
    if (!Buffer.isBuffer(buf)) {
      throw new TypeError('"list" argument must be an Array of Buffers');
    }
    buf.copy(buffer, pos);
    pos += buf.length;
  }
  return buffer;
};

function byteLength(string, encoding) {
  if (Buffer.isBuffer(string)) {
    return string.length;
  }
  if (isArrayBufferView(string) || isArrayBuffer(string)) {
    return string.byteLength;
  }
  if (typeof string !== 'string') {
    string = '' + string;
  }

  var len = string.length;
  if (len === 0) return 0;

  // Use a for loop to avoid recursion
  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'ascii':
      case 'latin1':
      case 'binary':
        return len;
      case 'utf8':
      case 'utf-8':
      case undefined:
        return utf8ToBytes(string).length;
      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return len * 2;
      case 'hex':
        return len >>> 1;
      case 'base64':
        return base64ToBytes(string).length;
      default:
        if (loweredCase) return utf8ToBytes(string).length; // assume utf8
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
}
Buffer.byteLength = byteLength;

function slowToString(encoding, start, end) {
  var loweredCase = false;

  // No need to verify that "this.length <= MAX_UINT32" since it's a read-only
  // property of a typed array.

  // This behaves neither like String nor Uint8Array in that we set start/end
  // to their upper/lower bounds if the value passed is out of range.
  // undefined is handled specially as per ECMA-262 6th Edition,
  // Section 13.3.3.7 Runtime Semantics: KeyedBindingInitialization.
  if (start === undefined || start < 0) {
    start = 0;
  }
  // Return early if start > this.length. Done here to prevent potential uint32
  // coercion fail below.
  if (start > this.length) {
    return '';
  }

  if (end === undefined || end > this.length) {
    end = this.length;
  }

  if (end <= 0) {
    return '';
  }

  // Force coersion to uint32. This will also coerce falsey/NaN values to 0.
  end >>>= 0;
  start >>>= 0;

  if (end <= start) {
    return '';
  }

  if (!encoding) encoding = 'utf8';

  while (true) {
    switch (encoding) {
      case 'hex':
        return hexSlice(this, start, end);

      case 'utf8':
      case 'utf-8':
        return utf8Slice(this, start, end);

      case 'ascii':
        return asciiSlice(this, start, end);

      case 'latin1':
      case 'binary':
        return latin1Slice(this, start, end);

      case 'base64':
        return base64Slice(this, start, end);

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return utf16leSlice(this, start, end);

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding);
        encoding = (encoding + '').toLowerCase();
        loweredCase = true;
    }
  }
}

// This property is used by `Buffer.isBuffer` (and the `is-buffer` npm package)
// to detect a Buffer instance. It's not possible to use `instanceof Buffer`
// reliably in a browserify context because there could be multiple different
// copies of the 'buffer' package in use. This method works even for Buffer
// instances that were created from another copy of the `buffer` package.
// See: https://github.com/feross/buffer/issues/154
Buffer.prototype._isBuffer = true;

function swap(b, n, m) {
  var i = b[n];
  b[n] = b[m];
  b[m] = i;
}

Buffer.prototype.swap16 = function swap16() {
  var len = this.length;
  if (len % 2 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 16-bits');
  }
  for (var i = 0; i < len; i += 2) {
    swap(this, i, i + 1);
  }
  return this;
};

Buffer.prototype.swap32 = function swap32() {
  var len = this.length;
  if (len % 4 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 32-bits');
  }
  for (var i = 0; i < len; i += 4) {
    swap(this, i, i + 3);
    swap(this, i + 1, i + 2);
  }
  return this;
};

Buffer.prototype.swap64 = function swap64() {
  var len = this.length;
  if (len % 8 !== 0) {
    throw new RangeError('Buffer size must be a multiple of 64-bits');
  }
  for (var i = 0; i < len; i += 8) {
    swap(this, i, i + 7);
    swap(this, i + 1, i + 6);
    swap(this, i + 2, i + 5);
    swap(this, i + 3, i + 4);
  }
  return this;
};

Buffer.prototype.toString = function toString() {
  var length = this.length;
  if (length === 0) return '';
  if (arguments.length === 0) return utf8Slice(this, 0, length);
  return slowToString.apply(this, arguments);
};

Buffer.prototype.equals = function equals(b) {
  if (!Buffer.isBuffer(b)) throw new TypeError('Argument must be a Buffer');
  if (this === b) return true;
  return Buffer.compare(this, b) === 0;
};

Buffer.prototype.inspect = function inspect() {
  var str = '';
  var max = exports.INSPECT_MAX_BYTES;
  if (this.length > 0) {
    str = this.toString('hex', 0, max).match(/.{2}/g).join(' ');
    if (this.length > max) str += ' ... ';
  }
  return '<Buffer ' + str + '>';
};

Buffer.prototype.compare = function compare(target, start, end, thisStart, thisEnd) {
  if (!Buffer.isBuffer(target)) {
    throw new TypeError('Argument must be a Buffer');
  }

  if (start === undefined) {
    start = 0;
  }
  if (end === undefined) {
    end = target ? target.length : 0;
  }
  if (thisStart === undefined) {
    thisStart = 0;
  }
  if (thisEnd === undefined) {
    thisEnd = this.length;
  }

  if (start < 0 || end > target.length || thisStart < 0 || thisEnd > this.length) {
    throw new RangeError('out of range index');
  }

  if (thisStart >= thisEnd && start >= end) {
    return 0;
  }
  if (thisStart >= thisEnd) {
    return -1;
  }
  if (start >= end) {
    return 1;
  }

  start >>>= 0;
  end >>>= 0;
  thisStart >>>= 0;
  thisEnd >>>= 0;

  if (this === target) return 0;

  var x = thisEnd - thisStart;
  var y = end - start;
  var len = Math.min(x, y);

  var thisCopy = this.slice(thisStart, thisEnd);
  var targetCopy = target.slice(start, end);

  for (var i = 0; i < len; ++i) {
    if (thisCopy[i] !== targetCopy[i]) {
      x = thisCopy[i];
      y = targetCopy[i];
      break;
    }
  }

  if (x < y) return -1;
  if (y < x) return 1;
  return 0;
};

// Finds either the first index of `val` in `buffer` at offset >= `byteOffset`,
// OR the last index of `val` in `buffer` at offset <= `byteOffset`.
//
// Arguments:
// - buffer - a Buffer to search
// - val - a string, Buffer, or number
// - byteOffset - an index into `buffer`; will be clamped to an int32
// - encoding - an optional encoding, relevant is val is a string
// - dir - true for indexOf, false for lastIndexOf
function bidirectionalIndexOf(buffer, val, byteOffset, encoding, dir) {
  // Empty buffer means no match
  if (buffer.length === 0) return -1;

  // Normalize byteOffset
  if (typeof byteOffset === 'string') {
    encoding = byteOffset;
    byteOffset = 0;
  } else if (byteOffset > 0x7fffffff) {
    byteOffset = 0x7fffffff;
  } else if (byteOffset < -0x80000000) {
    byteOffset = -0x80000000;
  }
  byteOffset = +byteOffset; // Coerce to Number.
  if (numberIsNaN(byteOffset)) {
    // byteOffset: it it's undefined, null, NaN, "foo", etc, search whole buffer
    byteOffset = dir ? 0 : buffer.length - 1;
  }

  // Normalize byteOffset: negative offsets start from the end of the buffer
  if (byteOffset < 0) byteOffset = buffer.length + byteOffset;
  if (byteOffset >= buffer.length) {
    if (dir) return -1;else byteOffset = buffer.length - 1;
  } else if (byteOffset < 0) {
    if (dir) byteOffset = 0;else return -1;
  }

  // Normalize val
  if (typeof val === 'string') {
    val = Buffer.from(val, encoding);
  }

  // Finally, search either indexOf (if dir is true) or lastIndexOf
  if (Buffer.isBuffer(val)) {
    // Special case: looking for empty string/buffer always fails
    if (val.length === 0) {
      return -1;
    }
    return arrayIndexOf(buffer, val, byteOffset, encoding, dir);
  } else if (typeof val === 'number') {
    val = val & 0xFF; // Search for a byte value [0-255]
    if (typeof Uint8Array.prototype.indexOf === 'function') {
      if (dir) {
        return Uint8Array.prototype.indexOf.call(buffer, val, byteOffset);
      } else {
        return Uint8Array.prototype.lastIndexOf.call(buffer, val, byteOffset);
      }
    }
    return arrayIndexOf(buffer, [val], byteOffset, encoding, dir);
  }

  throw new TypeError('val must be string, number or Buffer');
}

function arrayIndexOf(arr, val, byteOffset, encoding, dir) {
  var indexSize = 1;
  var arrLength = arr.length;
  var valLength = val.length;

  if (encoding !== undefined) {
    encoding = String(encoding).toLowerCase();
    if (encoding === 'ucs2' || encoding === 'ucs-2' || encoding === 'utf16le' || encoding === 'utf-16le') {
      if (arr.length < 2 || val.length < 2) {
        return -1;
      }
      indexSize = 2;
      arrLength /= 2;
      valLength /= 2;
      byteOffset /= 2;
    }
  }

  function read(buf, i) {
    if (indexSize === 1) {
      return buf[i];
    } else {
      return buf.readUInt16BE(i * indexSize);
    }
  }

  var i;
  if (dir) {
    var foundIndex = -1;
    for (i = byteOffset; i < arrLength; i++) {
      if (read(arr, i) === read(val, foundIndex === -1 ? 0 : i - foundIndex)) {
        if (foundIndex === -1) foundIndex = i;
        if (i - foundIndex + 1 === valLength) return foundIndex * indexSize;
      } else {
        if (foundIndex !== -1) i -= i - foundIndex;
        foundIndex = -1;
      }
    }
  } else {
    if (byteOffset + valLength > arrLength) byteOffset = arrLength - valLength;
    for (i = byteOffset; i >= 0; i--) {
      var found = true;
      for (var j = 0; j < valLength; j++) {
        if (read(arr, i + j) !== read(val, j)) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
  }

  return -1;
}

Buffer.prototype.includes = function includes(val, byteOffset, encoding) {
  return this.indexOf(val, byteOffset, encoding) !== -1;
};

Buffer.prototype.indexOf = function indexOf(val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, true);
};

Buffer.prototype.lastIndexOf = function lastIndexOf(val, byteOffset, encoding) {
  return bidirectionalIndexOf(this, val, byteOffset, encoding, false);
};

function hexWrite(buf, string, offset, length) {
  offset = Number(offset) || 0;
  var remaining = buf.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = Number(length);
    if (length > remaining) {
      length = remaining;
    }
  }

  // must be an even number of digits
  var strLen = string.length;
  if (strLen % 2 !== 0) throw new TypeError('Invalid hex string');

  if (length > strLen / 2) {
    length = strLen / 2;
  }
  for (var i = 0; i < length; ++i) {
    var parsed = parseInt(string.substr(i * 2, 2), 16);
    if (numberIsNaN(parsed)) return i;
    buf[offset + i] = parsed;
  }
  return i;
}

function utf8Write(buf, string, offset, length) {
  return blitBuffer(utf8ToBytes(string, buf.length - offset), buf, offset, length);
}

function asciiWrite(buf, string, offset, length) {
  return blitBuffer(asciiToBytes(string), buf, offset, length);
}

function latin1Write(buf, string, offset, length) {
  return asciiWrite(buf, string, offset, length);
}

function base64Write(buf, string, offset, length) {
  return blitBuffer(base64ToBytes(string), buf, offset, length);
}

function ucs2Write(buf, string, offset, length) {
  return blitBuffer(utf16leToBytes(string, buf.length - offset), buf, offset, length);
}

Buffer.prototype.write = function write(string, offset, length, encoding) {
  // Buffer#write(string)
  if (offset === undefined) {
    encoding = 'utf8';
    length = this.length;
    offset = 0;
    // Buffer#write(string, encoding)
  } else if (length === undefined && typeof offset === 'string') {
    encoding = offset;
    length = this.length;
    offset = 0;
    // Buffer#write(string, offset[, length][, encoding])
  } else if (isFinite(offset)) {
    offset = offset >>> 0;
    if (isFinite(length)) {
      length = length >>> 0;
      if (encoding === undefined) encoding = 'utf8';
    } else {
      encoding = length;
      length = undefined;
    }
  } else {
    throw new Error('Buffer.write(string, encoding, offset[, length]) is no longer supported');
  }

  var remaining = this.length - offset;
  if (length === undefined || length > remaining) length = remaining;

  if (string.length > 0 && (length < 0 || offset < 0) || offset > this.length) {
    throw new RangeError('Attempt to write outside buffer bounds');
  }

  if (!encoding) encoding = 'utf8';

  var loweredCase = false;
  for (;;) {
    switch (encoding) {
      case 'hex':
        return hexWrite(this, string, offset, length);

      case 'utf8':
      case 'utf-8':
        return utf8Write(this, string, offset, length);

      case 'ascii':
        return asciiWrite(this, string, offset, length);

      case 'latin1':
      case 'binary':
        return latin1Write(this, string, offset, length);

      case 'base64':
        // Warning: maxLength not taken into account in base64Write
        return base64Write(this, string, offset, length);

      case 'ucs2':
      case 'ucs-2':
      case 'utf16le':
      case 'utf-16le':
        return ucs2Write(this, string, offset, length);

      default:
        if (loweredCase) throw new TypeError('Unknown encoding: ' + encoding);
        encoding = ('' + encoding).toLowerCase();
        loweredCase = true;
    }
  }
};

Buffer.prototype.toJSON = function toJSON() {
  return {
    type: 'Buffer',
    data: Array.prototype.slice.call(this._arr || this, 0)
  };
};

function base64Slice(buf, start, end) {
  if (start === 0 && end === buf.length) {
    return base64.fromByteArray(buf);
  } else {
    return base64.fromByteArray(buf.slice(start, end));
  }
}

function utf8Slice(buf, start, end) {
  end = Math.min(buf.length, end);
  var res = [];

  var i = start;
  while (i < end) {
    var firstByte = buf[i];
    var codePoint = null;
    var bytesPerSequence = firstByte > 0xEF ? 4 : firstByte > 0xDF ? 3 : firstByte > 0xBF ? 2 : 1;

    if (i + bytesPerSequence <= end) {
      var secondByte, thirdByte, fourthByte, tempCodePoint;

      switch (bytesPerSequence) {
        case 1:
          if (firstByte < 0x80) {
            codePoint = firstByte;
          }
          break;
        case 2:
          secondByte = buf[i + 1];
          if ((secondByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0x1F) << 0x6 | secondByte & 0x3F;
            if (tempCodePoint > 0x7F) {
              codePoint = tempCodePoint;
            }
          }
          break;
        case 3:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0xC | (secondByte & 0x3F) << 0x6 | thirdByte & 0x3F;
            if (tempCodePoint > 0x7FF && (tempCodePoint < 0xD800 || tempCodePoint > 0xDFFF)) {
              codePoint = tempCodePoint;
            }
          }
          break;
        case 4:
          secondByte = buf[i + 1];
          thirdByte = buf[i + 2];
          fourthByte = buf[i + 3];
          if ((secondByte & 0xC0) === 0x80 && (thirdByte & 0xC0) === 0x80 && (fourthByte & 0xC0) === 0x80) {
            tempCodePoint = (firstByte & 0xF) << 0x12 | (secondByte & 0x3F) << 0xC | (thirdByte & 0x3F) << 0x6 | fourthByte & 0x3F;
            if (tempCodePoint > 0xFFFF && tempCodePoint < 0x110000) {
              codePoint = tempCodePoint;
            }
          }
      }
    }

    if (codePoint === null) {
      // we did not generate a valid codePoint so insert a
      // replacement char (U+FFFD) and advance only 1 byte
      codePoint = 0xFFFD;
      bytesPerSequence = 1;
    } else if (codePoint > 0xFFFF) {
      // encode to utf16 (surrogate pair dance)
      codePoint -= 0x10000;
      res.push(codePoint >>> 10 & 0x3FF | 0xD800);
      codePoint = 0xDC00 | codePoint & 0x3FF;
    }

    res.push(codePoint);
    i += bytesPerSequence;
  }

  return decodeCodePointsArray(res);
}

// Based on http://stackoverflow.com/a/22747272/680742, the browser with
// the lowest limit is Chrome, with 0x10000 args.
// We go 1 magnitude less, for safety
var MAX_ARGUMENTS_LENGTH = 0x1000;

function decodeCodePointsArray(codePoints) {
  var len = codePoints.length;
  if (len <= MAX_ARGUMENTS_LENGTH) {
    return String.fromCharCode.apply(String, codePoints); // avoid extra slice()
  }

  // Decode in chunks to avoid "call stack size exceeded".
  var res = '';
  var i = 0;
  while (i < len) {
    res += String.fromCharCode.apply(String, codePoints.slice(i, i += MAX_ARGUMENTS_LENGTH));
  }
  return res;
}

function asciiSlice(buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i] & 0x7F);
  }
  return ret;
}

function latin1Slice(buf, start, end) {
  var ret = '';
  end = Math.min(buf.length, end);

  for (var i = start; i < end; ++i) {
    ret += String.fromCharCode(buf[i]);
  }
  return ret;
}

function hexSlice(buf, start, end) {
  var len = buf.length;

  if (!start || start < 0) start = 0;
  if (!end || end < 0 || end > len) end = len;

  var out = '';
  for (var i = start; i < end; ++i) {
    out += toHex(buf[i]);
  }
  return out;
}

function utf16leSlice(buf, start, end) {
  var bytes = buf.slice(start, end);
  var res = '';
  for (var i = 0; i < bytes.length; i += 2) {
    res += String.fromCharCode(bytes[i] + bytes[i + 1] * 256);
  }
  return res;
}

Buffer.prototype.slice = function slice(start, end) {
  var len = this.length;
  start = ~~start;
  end = end === undefined ? len : ~~end;

  if (start < 0) {
    start += len;
    if (start < 0) start = 0;
  } else if (start > len) {
    start = len;
  }

  if (end < 0) {
    end += len;
    if (end < 0) end = 0;
  } else if (end > len) {
    end = len;
  }

  if (end < start) end = start;

  var newBuf = this.subarray(start, end);
  // Return an augmented `Uint8Array` instance
  newBuf.__proto__ = Buffer.prototype;
  return newBuf;
};

/*
 * Need to make sure that buffer isn't trying to write out of bounds.
 */
function checkOffset(offset, ext, length) {
  if (offset % 1 !== 0 || offset < 0) throw new RangeError('offset is not uint');
  if (offset + ext > length) throw new RangeError('Trying to access beyond buffer length');
}

Buffer.prototype.readUIntLE = function readUIntLE(offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }

  return val;
};

Buffer.prototype.readUIntBE = function readUIntBE(offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    checkOffset(offset, byteLength, this.length);
  }

  var val = this[offset + --byteLength];
  var mul = 1;
  while (byteLength > 0 && (mul *= 0x100)) {
    val += this[offset + --byteLength] * mul;
  }

  return val;
};

Buffer.prototype.readUInt8 = function readUInt8(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 1, this.length);
  return this[offset];
};

Buffer.prototype.readUInt16LE = function readUInt16LE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] | this[offset + 1] << 8;
};

Buffer.prototype.readUInt16BE = function readUInt16BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  return this[offset] << 8 | this[offset + 1];
};

Buffer.prototype.readUInt32LE = function readUInt32LE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return (this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16) + this[offset + 3] * 0x1000000;
};

Buffer.prototype.readUInt32BE = function readUInt32BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return this[offset] * 0x1000000 + (this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3]);
};

Buffer.prototype.readIntLE = function readIntLE(offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var val = this[offset];
  var mul = 1;
  var i = 0;
  while (++i < byteLength && (mul *= 0x100)) {
    val += this[offset + i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val;
};

Buffer.prototype.readIntBE = function readIntBE(offset, byteLength, noAssert) {
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) checkOffset(offset, byteLength, this.length);

  var i = byteLength;
  var mul = 1;
  var val = this[offset + --i];
  while (i > 0 && (mul *= 0x100)) {
    val += this[offset + --i] * mul;
  }
  mul *= 0x80;

  if (val >= mul) val -= Math.pow(2, 8 * byteLength);

  return val;
};

Buffer.prototype.readInt8 = function readInt8(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 1, this.length);
  if (!(this[offset] & 0x80)) return this[offset];
  return (0xff - this[offset] + 1) * -1;
};

Buffer.prototype.readInt16LE = function readInt16LE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset] | this[offset + 1] << 8;
  return val & 0x8000 ? val | 0xFFFF0000 : val;
};

Buffer.prototype.readInt16BE = function readInt16BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 2, this.length);
  var val = this[offset + 1] | this[offset] << 8;
  return val & 0x8000 ? val | 0xFFFF0000 : val;
};

Buffer.prototype.readInt32LE = function readInt32LE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return this[offset] | this[offset + 1] << 8 | this[offset + 2] << 16 | this[offset + 3] << 24;
};

Buffer.prototype.readInt32BE = function readInt32BE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);

  return this[offset] << 24 | this[offset + 1] << 16 | this[offset + 2] << 8 | this[offset + 3];
};

Buffer.prototype.readFloatLE = function readFloatLE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);
  return ieee754.read(this, offset, true, 23, 4);
};

Buffer.prototype.readFloatBE = function readFloatBE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 4, this.length);
  return ieee754.read(this, offset, false, 23, 4);
};

Buffer.prototype.readDoubleLE = function readDoubleLE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 8, this.length);
  return ieee754.read(this, offset, true, 52, 8);
};

Buffer.prototype.readDoubleBE = function readDoubleBE(offset, noAssert) {
  offset = offset >>> 0;
  if (!noAssert) checkOffset(offset, 8, this.length);
  return ieee754.read(this, offset, false, 52, 8);
};

function checkInt(buf, value, offset, ext, max, min) {
  if (!Buffer.isBuffer(buf)) throw new TypeError('"buffer" argument must be a Buffer instance');
  if (value > max || value < min) throw new RangeError('"value" argument is out of bounds');
  if (offset + ext > buf.length) throw new RangeError('Index out of range');
}

Buffer.prototype.writeUIntLE = function writeUIntLE(value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var mul = 1;
  var i = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    this[offset + i] = value / mul & 0xFF;
  }

  return offset + byteLength;
};

Buffer.prototype.writeUIntBE = function writeUIntBE(value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  byteLength = byteLength >>> 0;
  if (!noAssert) {
    var maxBytes = Math.pow(2, 8 * byteLength) - 1;
    checkInt(this, value, offset, byteLength, maxBytes, 0);
  }

  var i = byteLength - 1;
  var mul = 1;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    this[offset + i] = value / mul & 0xFF;
  }

  return offset + byteLength;
};

Buffer.prototype.writeUInt8 = function writeUInt8(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0xff, 0);
  this[offset] = value & 0xff;
  return offset + 1;
};

Buffer.prototype.writeUInt16LE = function writeUInt16LE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  this[offset] = value & 0xff;
  this[offset + 1] = value >>> 8;
  return offset + 2;
};

Buffer.prototype.writeUInt16BE = function writeUInt16BE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0xffff, 0);
  this[offset] = value >>> 8;
  this[offset + 1] = value & 0xff;
  return offset + 2;
};

Buffer.prototype.writeUInt32LE = function writeUInt32LE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  this[offset + 3] = value >>> 24;
  this[offset + 2] = value >>> 16;
  this[offset + 1] = value >>> 8;
  this[offset] = value & 0xff;
  return offset + 4;
};

Buffer.prototype.writeUInt32BE = function writeUInt32BE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0xffffffff, 0);
  this[offset] = value >>> 24;
  this[offset + 1] = value >>> 16;
  this[offset + 2] = value >>> 8;
  this[offset + 3] = value & 0xff;
  return offset + 4;
};

Buffer.prototype.writeIntLE = function writeIntLE(value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = 0;
  var mul = 1;
  var sub = 0;
  this[offset] = value & 0xFF;
  while (++i < byteLength && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i - 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = (value / mul >> 0) - sub & 0xFF;
  }

  return offset + byteLength;
};

Buffer.prototype.writeIntBE = function writeIntBE(value, offset, byteLength, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    var limit = Math.pow(2, 8 * byteLength - 1);

    checkInt(this, value, offset, byteLength, limit - 1, -limit);
  }

  var i = byteLength - 1;
  var mul = 1;
  var sub = 0;
  this[offset + i] = value & 0xFF;
  while (--i >= 0 && (mul *= 0x100)) {
    if (value < 0 && sub === 0 && this[offset + i + 1] !== 0) {
      sub = 1;
    }
    this[offset + i] = (value / mul >> 0) - sub & 0xFF;
  }

  return offset + byteLength;
};

Buffer.prototype.writeInt8 = function writeInt8(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 1, 0x7f, -0x80);
  if (value < 0) value = 0xff + value + 1;
  this[offset] = value & 0xff;
  return offset + 1;
};

Buffer.prototype.writeInt16LE = function writeInt16LE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  this[offset] = value & 0xff;
  this[offset + 1] = value >>> 8;
  return offset + 2;
};

Buffer.prototype.writeInt16BE = function writeInt16BE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 2, 0x7fff, -0x8000);
  this[offset] = value >>> 8;
  this[offset + 1] = value & 0xff;
  return offset + 2;
};

Buffer.prototype.writeInt32LE = function writeInt32LE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  this[offset] = value & 0xff;
  this[offset + 1] = value >>> 8;
  this[offset + 2] = value >>> 16;
  this[offset + 3] = value >>> 24;
  return offset + 4;
};

Buffer.prototype.writeInt32BE = function writeInt32BE(value, offset, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) checkInt(this, value, offset, 4, 0x7fffffff, -0x80000000);
  if (value < 0) value = 0xffffffff + value + 1;
  this[offset] = value >>> 24;
  this[offset + 1] = value >>> 16;
  this[offset + 2] = value >>> 8;
  this[offset + 3] = value & 0xff;
  return offset + 4;
};

function checkIEEE754(buf, value, offset, ext, max, min) {
  if (offset + ext > buf.length) throw new RangeError('Index out of range');
  if (offset < 0) throw new RangeError('Index out of range');
}

function writeFloat(buf, value, offset, littleEndian, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 4, 3.4028234663852886e+38, -3.4028234663852886e+38);
  }
  ieee754.write(buf, value, offset, littleEndian, 23, 4);
  return offset + 4;
}

Buffer.prototype.writeFloatLE = function writeFloatLE(value, offset, noAssert) {
  return writeFloat(this, value, offset, true, noAssert);
};

Buffer.prototype.writeFloatBE = function writeFloatBE(value, offset, noAssert) {
  return writeFloat(this, value, offset, false, noAssert);
};

function writeDouble(buf, value, offset, littleEndian, noAssert) {
  value = +value;
  offset = offset >>> 0;
  if (!noAssert) {
    checkIEEE754(buf, value, offset, 8, 1.7976931348623157E+308, -1.7976931348623157E+308);
  }
  ieee754.write(buf, value, offset, littleEndian, 52, 8);
  return offset + 8;
}

Buffer.prototype.writeDoubleLE = function writeDoubleLE(value, offset, noAssert) {
  return writeDouble(this, value, offset, true, noAssert);
};

Buffer.prototype.writeDoubleBE = function writeDoubleBE(value, offset, noAssert) {
  return writeDouble(this, value, offset, false, noAssert);
};

// copy(targetBuffer, targetStart=0, sourceStart=0, sourceEnd=buffer.length)
Buffer.prototype.copy = function copy(target, targetStart, start, end) {
  if (!start) start = 0;
  if (!end && end !== 0) end = this.length;
  if (targetStart >= target.length) targetStart = target.length;
  if (!targetStart) targetStart = 0;
  if (end > 0 && end < start) end = start;

  // Copy 0 bytes; we're done
  if (end === start) return 0;
  if (target.length === 0 || this.length === 0) return 0;

  // Fatal error conditions
  if (targetStart < 0) {
    throw new RangeError('targetStart out of bounds');
  }
  if (start < 0 || start >= this.length) throw new RangeError('sourceStart out of bounds');
  if (end < 0) throw new RangeError('sourceEnd out of bounds');

  // Are we oob?
  if (end > this.length) end = this.length;
  if (target.length - targetStart < end - start) {
    end = target.length - targetStart + start;
  }

  var len = end - start;
  var i;

  if (this === target && start < targetStart && targetStart < end) {
    // descending copy from end
    for (i = len - 1; i >= 0; --i) {
      target[i + targetStart] = this[i + start];
    }
  } else if (len < 1000) {
    // ascending copy from start
    for (i = 0; i < len; ++i) {
      target[i + targetStart] = this[i + start];
    }
  } else {
    Uint8Array.prototype.set.call(target, this.subarray(start, start + len), targetStart);
  }

  return len;
};

// Usage:
//    buffer.fill(number[, offset[, end]])
//    buffer.fill(buffer[, offset[, end]])
//    buffer.fill(string[, offset[, end]][, encoding])
Buffer.prototype.fill = function fill(val, start, end, encoding) {
  // Handle string cases:
  if (typeof val === 'string') {
    if (typeof start === 'string') {
      encoding = start;
      start = 0;
      end = this.length;
    } else if (typeof end === 'string') {
      encoding = end;
      end = this.length;
    }
    if (val.length === 1) {
      var code = val.charCodeAt(0);
      if (code < 256) {
        val = code;
      }
    }
    if (encoding !== undefined && typeof encoding !== 'string') {
      throw new TypeError('encoding must be a string');
    }
    if (typeof encoding === 'string' && !Buffer.isEncoding(encoding)) {
      throw new TypeError('Unknown encoding: ' + encoding);
    }
  } else if (typeof val === 'number') {
    val = val & 255;
  }

  // Invalid ranges are not set to a default, so can range check early.
  if (start < 0 || this.length < start || this.length < end) {
    throw new RangeError('Out of range index');
  }

  if (end <= start) {
    return this;
  }

  start = start >>> 0;
  end = end === undefined ? this.length : end >>> 0;

  if (!val) val = 0;

  var i;
  if (typeof val === 'number') {
    for (i = start; i < end; ++i) {
      this[i] = val;
    }
  } else {
    var bytes = Buffer.isBuffer(val) ? val : new Buffer(val, encoding);
    var len = bytes.length;
    for (i = 0; i < end - start; ++i) {
      this[i + start] = bytes[i % len];
    }
  }

  return this;
};

// HELPER FUNCTIONS
// ================

var INVALID_BASE64_RE = /[^+/0-9A-Za-z-_]/g;

function base64clean(str) {
  // Node strips out invalid characters like \n and \t from the string, base64-js does not
  str = str.trim().replace(INVALID_BASE64_RE, '');
  // Node converts strings with length < 2 to ''
  if (str.length < 2) return '';
  // Node allows for non-padded base64 strings (missing trailing ===), base64-js does not
  while (str.length % 4 !== 0) {
    str = str + '=';
  }
  return str;
}

function toHex(n) {
  if (n < 16) return '0' + n.toString(16);
  return n.toString(16);
}

function utf8ToBytes(string, units) {
  units = units || Infinity;
  var codePoint;
  var length = string.length;
  var leadSurrogate = null;
  var bytes = [];

  for (var i = 0; i < length; ++i) {
    codePoint = string.charCodeAt(i);

    // is surrogate component
    if (codePoint > 0xD7FF && codePoint < 0xE000) {
      // last char was a lead
      if (!leadSurrogate) {
        // no lead yet
        if (codePoint > 0xDBFF) {
          // unexpected trail
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue;
        } else if (i + 1 === length) {
          // unpaired lead
          if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
          continue;
        }

        // valid lead
        leadSurrogate = codePoint;

        continue;
      }

      // 2 leads in a row
      if (codePoint < 0xDC00) {
        if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
        leadSurrogate = codePoint;
        continue;
      }

      // valid surrogate pair
      codePoint = (leadSurrogate - 0xD800 << 10 | codePoint - 0xDC00) + 0x10000;
    } else if (leadSurrogate) {
      // valid bmp char, but last char was a lead
      if ((units -= 3) > -1) bytes.push(0xEF, 0xBF, 0xBD);
    }

    leadSurrogate = null;

    // encode utf8
    if (codePoint < 0x80) {
      if ((units -= 1) < 0) break;
      bytes.push(codePoint);
    } else if (codePoint < 0x800) {
      if ((units -= 2) < 0) break;
      bytes.push(codePoint >> 0x6 | 0xC0, codePoint & 0x3F | 0x80);
    } else if (codePoint < 0x10000) {
      if ((units -= 3) < 0) break;
      bytes.push(codePoint >> 0xC | 0xE0, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
    } else if (codePoint < 0x110000) {
      if ((units -= 4) < 0) break;
      bytes.push(codePoint >> 0x12 | 0xF0, codePoint >> 0xC & 0x3F | 0x80, codePoint >> 0x6 & 0x3F | 0x80, codePoint & 0x3F | 0x80);
    } else {
      throw new Error('Invalid code point');
    }
  }

  return bytes;
}

function asciiToBytes(str) {
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    // Node's code seems to be doing this and not & 0x7F..
    byteArray.push(str.charCodeAt(i) & 0xFF);
  }
  return byteArray;
}

function utf16leToBytes(str, units) {
  var c, hi, lo;
  var byteArray = [];
  for (var i = 0; i < str.length; ++i) {
    if ((units -= 2) < 0) break;

    c = str.charCodeAt(i);
    hi = c >> 8;
    lo = c % 256;
    byteArray.push(lo);
    byteArray.push(hi);
  }

  return byteArray;
}

function base64ToBytes(str) {
  return base64.toByteArray(base64clean(str));
}

function blitBuffer(src, dst, offset, length) {
  for (var i = 0; i < length; ++i) {
    if (i + offset >= dst.length || i >= src.length) break;
    dst[i + offset] = src[i];
  }
  return i;
}

// ArrayBuffers from another context (i.e. an iframe) do not pass the `instanceof` check
// but they should be treated as valid. See: https://github.com/feross/buffer/issues/166
function isArrayBuffer(obj) {
  return obj instanceof ArrayBuffer || obj != null && obj.constructor != null && obj.constructor.name === 'ArrayBuffer' && typeof obj.byteLength === 'number';
}

// Node 0.10 supports `ArrayBuffer` but lacks `ArrayBuffer.isView`
function isArrayBufferView(obj) {
  return typeof ArrayBuffer.isView === 'function' && ArrayBuffer.isView(obj);
}

function numberIsNaN(obj) {
  return obj !== obj; // eslint-disable-line no-self-compare
}

},{"base64-js":4,"ieee754":7}],7:[function(require,module,exports){
"use strict";

exports.read = function (buffer, offset, isLE, mLen, nBytes) {
  var e, m;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var nBits = -7;
  var i = isLE ? nBytes - 1 : 0;
  var d = isLE ? -1 : 1;
  var s = buffer[offset + i];

  i += d;

  e = s & (1 << -nBits) - 1;
  s >>= -nBits;
  nBits += eLen;
  for (; nBits > 0; e = e * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  m = e & (1 << -nBits) - 1;
  e >>= -nBits;
  nBits += mLen;
  for (; nBits > 0; m = m * 256 + buffer[offset + i], i += d, nBits -= 8) {}

  if (e === 0) {
    e = 1 - eBias;
  } else if (e === eMax) {
    return m ? NaN : (s ? -1 : 1) * Infinity;
  } else {
    m = m + Math.pow(2, mLen);
    e = e - eBias;
  }
  return (s ? -1 : 1) * m * Math.pow(2, e - mLen);
};

exports.write = function (buffer, value, offset, isLE, mLen, nBytes) {
  var e, m, c;
  var eLen = nBytes * 8 - mLen - 1;
  var eMax = (1 << eLen) - 1;
  var eBias = eMax >> 1;
  var rt = mLen === 23 ? Math.pow(2, -24) - Math.pow(2, -77) : 0;
  var i = isLE ? 0 : nBytes - 1;
  var d = isLE ? 1 : -1;
  var s = value < 0 || value === 0 && 1 / value < 0 ? 1 : 0;

  value = Math.abs(value);

  if (isNaN(value) || value === Infinity) {
    m = isNaN(value) ? 1 : 0;
    e = eMax;
  } else {
    e = Math.floor(Math.log(value) / Math.LN2);
    if (value * (c = Math.pow(2, -e)) < 1) {
      e--;
      c *= 2;
    }
    if (e + eBias >= 1) {
      value += rt / c;
    } else {
      value += rt * Math.pow(2, 1 - eBias);
    }
    if (value * c >= 2) {
      e++;
      c /= 2;
    }

    if (e + eBias >= eMax) {
      m = 0;
      e = eMax;
    } else if (e + eBias >= 1) {
      m = (value * c - 1) * Math.pow(2, mLen);
      e = e + eBias;
    } else {
      m = value * Math.pow(2, eBias - 1) * Math.pow(2, mLen);
      e = 0;
    }
  }

  for (; mLen >= 8; buffer[offset + i] = m & 0xff, i += d, m /= 256, mLen -= 8) {}

  e = e << mLen | m;
  eLen += mLen;
  for (; eLen > 0; buffer[offset + i] = e & 0xff, i += d, e /= 256, eLen -= 8) {}

  buffer[offset + i - d] |= s * 128;
};

},{}],8:[function(require,module,exports){
/**
 * @module  is-audio-buffer
 */
'use strict';

module.exports = function isAudioBuffer(buffer) {
	//the guess is duck-typing
	return buffer != null && typeof buffer.length === 'number' && typeof buffer.sampleRate === 'number' //swims like AudioBuffer
	&& typeof buffer.getChannelData === 'function' //quacks like AudioBuffer
	// && buffer.copyToChannel
	// && buffer.copyFromChannel
	&& typeof buffer.duration === 'number';
};

},{}],9:[function(require,module,exports){
"use strict";

module.exports = true;

},{}],10:[function(require,module,exports){
'use strict';

/*!
 * Determine if an object is a Buffer
 *
 * @author   Feross Aboukhadijeh <https://feross.org>
 * @license  MIT
 */

// The _isBuffer check is for Safari 5-7 support, because it's missing
// Object.prototype.constructor. Remove this eventually
module.exports = function (obj) {
  return obj != null && (isBuffer(obj) || isSlowBuffer(obj) || !!obj._isBuffer);
};

function isBuffer(obj) {
  return !!obj.constructor && typeof obj.constructor.isBuffer === 'function' && obj.constructor.isBuffer(obj);
}

// For Node v0.10 support. Remove this eventually.
function isSlowBuffer(obj) {
  return typeof obj.readFloatLE === 'function' && typeof obj.slice === 'function' && isBuffer(obj.slice(0, 0));
}

},{}],11:[function(require,module,exports){
'use strict';

var toString = Object.prototype.toString;

module.exports = function (x) {
	var prototype;
	return toString.call(x) === '[object Object]' && (prototype = Object.getPrototypeOf(x), prototype === null || prototype === Object.getPrototypeOf({}));
};

},{}],12:[function(require,module,exports){
'use strict';

var WORKER_PATH = './recorderWorker.js';

var Recorder = function Recorder(source, cfg) {
  var config = cfg || {};
  var bufferLen = config.bufferLen || 4096;
  this.context = source.context;
  this.node = (this.context.createScriptProcessor || this.context.createJavaScriptNode).call(this.context, bufferLen, 2, 2);
  var worker = new Worker((window.URL || window.webkitURL).createObjectURL(new Blob(['(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module \'"+o+"\'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){\nvar recLength = 0,\n  recBuffersL = [],\n  recBuffersR = [],\n  sampleRate;\n\n\nself.onmessage = function(e) {\n  switch(e.data.command){\n    case \'init\':\n      init(e.data.config);\n      break;\n    case \'record\':\n      record(e.data.buffer);\n      break;\n    case \'exportWAV\':\n      exportWAV(e.data.type);\n      break;\n    case \'getBuffer\':\n      getBuffer();\n      break;\n    case \'clear\':\n      clear();\n      break;\n  }\n};\n\nfunction init(config){\n  sampleRate = config.sampleRate;\n}\n\nfunction record(inputBuffer){\n  recBuffersL.push(inputBuffer[0]);\n  recBuffersR.push(inputBuffer[1]);\n  recLength += inputBuffer[0].length;\n}\n\nfunction exportWAV(type){\n  var bufferL = mergeBuffers(recBuffersL, recLength);\n  var bufferR = mergeBuffers(recBuffersR, recLength);\n  var interleaved = interleave(bufferL, bufferR);\n  var dataview = encodeWAV(interleaved);\n  var audioBlob = new Blob([dataview], { type: type });\n\n  self.postMessage(audioBlob);\n}\n\nfunction getBuffer() {\n  var buffers = [];\n  buffers.push( mergeBuffers(recBuffersL, recLength) );\n  buffers.push( mergeBuffers(recBuffersR, recLength) );\n  self.postMessage(buffers);\n}\n\nfunction clear(){\n  recLength = 0;\n  recBuffersL = [];\n  recBuffersR = [];\n}\n\nfunction mergeBuffers(recBuffers, recLength){\n  var result = new Float32Array(recLength);\n  var offset = 0;\n  for (var i = 0; i < recBuffers.length; i++){\n    result.set(recBuffers[i], offset);\n    offset += recBuffers[i].length;\n  }\n  return result;\n}\n\nfunction interleave(inputL, inputR){\n  var length = inputL.length + inputR.length;\n  var result = new Float32Array(length);\n\n  var index = 0,\n    inputIndex = 0;\n\n  while (index < length){\n    result[index++] = inputL[inputIndex];\n    result[index++] = inputR[inputIndex];\n    inputIndex++;\n  }\n  return result;\n}\n\nfunction floatTo16BitPCM(output, offset, input){\n  for (var i = 0; i < input.length; i++, offset+=2){\n    var s = Math.max(-1, Math.min(1, input[i]));\n    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);\n  }\n}\n\nfunction writeString(view, offset, string){\n  for (var i = 0; i < string.length; i++){\n    view.setUint8(offset + i, string.charCodeAt(i));\n  }\n}\n\nfunction encodeWAV(samples){\n  var buffer = new ArrayBuffer(44 + samples.length * 2);\n  var view = new DataView(buffer);\n\n  /* RIFF identifier */\n  writeString(view, 0, \'RIFF\');\n  /* RIFF chunk length */\n  view.setUint32(4, 36 + samples.length * 2, true);\n  /* RIFF type */\n  writeString(view, 8, \'WAVE\');\n  /* format chunk identifier */\n  writeString(view, 12, \'fmt \');\n  /* format chunk length */\n  view.setUint32(16, 16, true);\n  /* sample format (raw) */\n  view.setUint16(20, 1, true);\n  /* channel count */\n  view.setUint16(22, 2, true);\n  /* sample rate */\n  view.setUint32(24, sampleRate, true);\n  /* byte rate (sample rate * block align) */\n  view.setUint32(28, sampleRate * 4, true);\n  /* block align (channel count * bytes per sample) */\n  view.setUint16(32, 4, true);\n  /* bits per sample */\n  view.setUint16(34, 16, true);\n  /* data chunk identifier */\n  writeString(view, 36, \'data\');\n  /* data chunk length */\n  view.setUint32(40, samples.length * 2, true);\n\n  floatTo16BitPCM(view, 44, samples);\n\n  return view;\n}\n\n},{}]},{},[1]);\n'], { type: "text/javascript" })));
  worker.onmessage = function (e) {
    var blob = e.data;
    currCallback(blob);
  };

  worker.postMessage({
    command: 'init',
    config: {
      sampleRate: this.context.sampleRate
    }
  });
  var recording = false,
      currCallback;

  this.node.onaudioprocess = function (e) {
    if (!recording) return;
    worker.postMessage({
      command: 'record',
      buffer: [e.inputBuffer.getChannelData(0), e.inputBuffer.getChannelData(1)]
    });
  };

  this.configure = function (cfg) {
    for (var prop in cfg) {
      if (cfg.hasOwnProperty(prop)) {
        config[prop] = cfg[prop];
      }
    }
  };

  this.record = function () {
    recording = true;
  };

  this.stop = function () {
    recording = false;
  };

  this.clear = function () {
    worker.postMessage({ command: 'clear' });
  };

  this.getBuffer = function (cb) {
    currCallback = cb || config.callback;
    worker.postMessage({ command: 'getBuffer' });
  };

  this.exportWAV = function (cb, type) {
    currCallback = cb || config.callback;
    type = type || config.type || 'audio/wav';
    if (!currCallback) throw new Error('Callback not set');
    worker.postMessage({
      command: 'exportWAV',
      type: type
    });
  };

  source.connect(this.node);
  this.node.connect(this.context.destination); //this should not be necessary
};

Recorder.forceDownload = function (blob, filename) {
  var url = (window.URL || window.webkitURL).createObjectURL(blob);
  var link = window.document.createElement('a');
  link.href = url;
  link.download = filename || 'output.wav';
  var click = document.createEvent("Event");
  click.initEvent("click", true, true);
  link.dispatchEvent(click);
};

module.exports = Recorder;

},{}],13:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /**
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @file AMR 录音、转换、播放器
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @author BenzLeung(https://github.com/BenzLeung)
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * @date 2017/11/12
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * Created by JetBrains PhpStorm.
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      *
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * 每位工程师都有保持代码优雅的义务
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      * each engineer has a duty to keep the code elegant
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      */

var _audioContext = require('./audioContext');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WORKER_PATH = './amrWorker.min.js';

var BenzAMRRecorder = function () {
    function BenzAMRRecorder() {
        var _this = this;

        _classCallCheck(this, BenzAMRRecorder);

        this._isInit = false;
        this._isInitRecorder = false;
        this._samples = new Float32Array(0);
        this._rawData = new Uint8Array(0);
        this._blob = null;
        this._onEnded = null;
        this._onPlay = null;
        this._onStop = null;
        this._onStartRecord = null;
        this._onCancelRecord = null;
        this._onFinishRecord = null;
        this._isPlaying = false;
        this._amrResolves = {};
        this._amrSeq = 1;

        this._playEmpty = function () {
            (0, _audioContext.playPcm)(new Float32Array(10), 24000);
        };

        this._onEndCallback = function () {
            _this._isPlaying = false;
            if (_this._onStop) {
                _this._onStop();
            }
            if (_this._onEnded) {
                _this._onEnded();
            }
        };

        this._amrWorker = new Worker((window.URL || window.webkitURL).createObjectURL(new Blob(['(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module \'"+o+"\'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){\nvar AMR=function(){var AMR={toWAV:function(amr){var decoded=this._decode(amr);if(!decoded){return null}var raw=new Uint8Array(decoded.buffer,decoded.byteOffset,decoded.byteLength);var out=new Uint8Array(raw.length+this.WAV_HEADER_SIZE);var offset=0;var write_int16=function(value){var a=new Uint8Array(2);new Int16Array(a.buffer)[0]=value;out.set(a,offset);offset+=2};var write_int32=function(value){var a=new Uint8Array(4);new Int32Array(a.buffer)[0]=value;out.set(a,offset);offset+=4};var write_string=function(value){var d=new TextEncoder("utf-8").encode(value);out.set(d,offset);offset+=d.length};write_string("RIFF");write_int32(4+8+16+8+raw.length);write_string("WAVEfmt ");write_int32(16);var bits_per_sample=16;var sample_rate=8e3;var channels=1;var bytes_per_frame=bits_per_sample/8*channels;var bytes_per_sec=bytes_per_frame*sample_rate;write_int16(1);write_int16(1);write_int32(sample_rate);write_int32(bytes_per_sec);write_int16(bytes_per_frame);write_int16(bits_per_sample);write_string("data");write_int32(raw.length);out.set(raw,offset);return out},decode:function(amr){var raw=this._decode(amr);if(!raw){return null}var out=new Float32Array(raw.length);for(var i=0;i<out.length;i++){out[i]=raw[i]/32768}return out},_decode:function(amr){if(String.fromCharCode.apply(null,amr.subarray(0,this.AMR_HEADER.length))!==this.AMR_HEADER){return null}var decoder=this.Decoder_Interface_init();if(!decoder){return null}var out=new Int16Array(Math.floor(amr.length/6*this.PCM_BUFFER_COUNT));var buf=Module._malloc(this.AMR_BUFFER_COUNT);var decodeInBuffer=new Uint8Array(Module.HEAPU8.buffer,buf,this.AMR_BUFFER_COUNT);buf=Module._malloc(this.PCM_BUFFER_COUNT*2);var decodeOutBuffer=new Int16Array(Module.HEAPU8.buffer,buf,this.PCM_BUFFER_COUNT);var inOffset=6;var outOffset=0;while(inOffset+1<amr.length&&outOffset+1<out.length){var size=this.SIZES[amr[inOffset]>>3&15];if(inOffset+size+1>amr.length){break}decodeInBuffer.set(amr.subarray(inOffset,inOffset+size+1));this.Decoder_Interface_Decode(decoder,decodeInBuffer.byteOffset,decodeOutBuffer.byteOffset,0);if(outOffset+this.PCM_BUFFER_COUNT>out.length){var newOut=new Int16Array(out.length*2);newOut.set(out.subarray(0,outOffset));out=newOut}out.set(decodeOutBuffer,outOffset);outOffset+=this.PCM_BUFFER_COUNT;inOffset+=size+1}Module._free(decodeInBuffer.byteOffset);Module._free(decodeOutBuffer.byteOffset);this.Decoder_Interface_exit(decoder);return out.subarray(0,outOffset)},encode:function(pcm,pcmSampleRate,mode){if(pcmSampleRate<8e3){console.error("pcmSampleRate should not be less than 8000.");return null}if(typeof mode==="undefined"){mode=this.Mode.MR795}var encoder=this.Encoder_Interface_init();if(!encoder){return null}var buf=Module._malloc(this.PCM_BUFFER_COUNT*2);var encodeInBuffer=new Int16Array(Module.HEAPU8.buffer,buf,this.PCM_BUFFER_COUNT);buf=Module._malloc(this.AMR_BUFFER_COUNT);var encodeOutBuffer=new Uint8Array(Module.HEAPU8.buffer,buf,this.AMR_BUFFER_COUNT);var ratio=pcmSampleRate/8e3;var inLength=Math.floor(pcm.length/ratio);var inData=new Int16Array(inLength);for(var i=0;i<inLength;i++){inData[i]=pcm[Math.floor(i*ratio)]*(32768-1)}var blockSize=this.SIZES[mode]+1;var out=new Uint8Array(Math.ceil(inLength/this.PCM_BUFFER_COUNT*blockSize)+this.AMR_HEADER.length);out.set(new TextEncoder("utf-8").encode(this.AMR_HEADER));var inOffset=0;var outOffset=this.AMR_HEADER.length;while(inOffset+this.PCM_BUFFER_COUNT<inData.length&&outOffset+blockSize<out.length){encodeInBuffer.set(inData.subarray(inOffset,inOffset+this.PCM_BUFFER_COUNT));var n=this.Encoder_Interface_Encode(encoder,mode,encodeInBuffer.byteOffset,encodeOutBuffer.byteOffset,0);if(n!=blockSize){console.error([n,blockSize]);break}out.set(encodeOutBuffer.subarray(0,n),outOffset);inOffset+=this.PCM_BUFFER_COUNT;outOffset+=n}Module._free(encodeInBuffer.byteOffset);Module._free(encodeOutBuffer.byteOffset);this.Encoder_Interface_exit(encoder);return out.subarray(0,outOffset)},Decoder_Interface_init:function(){console.warn("Decoder_Interface_init not initialized.");return 0},Decoder_Interface_exit:function(state){console.warn("Decoder_Interface_exit not initialized.")},Decoder_Interface_Decode:function(state,inBuffer,outBuffer,bfi){console.warn("Decoder_Interface_Decode not initialized.")},Encoder_Interface_init:function(dtx){console.warn("Encoder_Interface_init not initialized.");return 0},Encoder_Interface_exit:function(state){console.warn("Encoder_Interface_exit not initialized.")},Encoder_Interface_Encode:function(state,mode,speech,out,forceSpeech){console.warn("Encoder_Interface_Encode not initialized.")},Mode:{MR475:0,MR515:1,MR59:2,MR67:3,MR74:4,MR795:5,MR102:6,MR122:7,MRDTX:8},SIZES:[12,13,15,17,19,20,26,31,5,6,5,5,0,0,0,0],AMR_BUFFER_COUNT:32,PCM_BUFFER_COUNT:160,AMR_HEADER:"#!AMR\\n",WAV_HEADER_SIZE:44};var Module={canvas:{},print:function(text){console.log(text)},_main:function(){AMR.Decoder_Interface_init=Module._Decoder_Interface_init;AMR.Decoder_Interface_exit=Module._Decoder_Interface_exit;AMR.Decoder_Interface_Decode=Module._Decoder_Interface_Decode;AMR.Encoder_Interface_init=Module._Encoder_Interface_init;AMR.Encoder_Interface_exit=Module._Encoder_Interface_exit;AMR.Encoder_Interface_Encode=Module._Encoder_Interface_Encode;return 0}};var Module;if(!Module)Module=(typeof Module!=="undefined"?Module:null)||{};var moduleOverrides={};for(var key in Module){if(Module.hasOwnProperty(key)){moduleOverrides[key]=Module[key]}}var ENVIRONMENT_IS_WEB=typeof window==="object";var ENVIRONMENT_IS_WORKER=typeof importScripts==="function";var ENVIRONMENT_IS_NODE=false;var ENVIRONMENT_IS_SHELL=!ENVIRONMENT_IS_WEB&&!ENVIRONMENT_IS_NODE&&!ENVIRONMENT_IS_WORKER;if(ENVIRONMENT_IS_SHELL){if(!Module["print"])Module["print"]=print;if(typeof printErr!="undefined")Module["printErr"]=printErr;if(typeof read!="undefined"){Module["read"]=read}else{Module["read"]=function read(){throw"no read() available (jsc?)"}}Module["readBinary"]=function readBinary(f){if(typeof readbuffer==="function"){return new Uint8Array(readbuffer(f))}var data=read(f,"binary");assert(typeof data==="object");return data};if(typeof scriptArgs!="undefined"){Module["arguments"]=scriptArgs}else if(typeof arguments!="undefined"){Module["arguments"]=arguments}}else if(ENVIRONMENT_IS_WEB||ENVIRONMENT_IS_WORKER){Module["read"]=function read(url){var xhr=new XMLHttpRequest;xhr.open("GET",url,false);xhr.send(null);return xhr.responseText};if(typeof arguments!="undefined"){Module["arguments"]=arguments}if(typeof console!=="undefined"){if(!Module["print"])Module["print"]=function print(x){console.log(x)};if(!Module["printErr"])Module["printErr"]=function printErr(x){console.log(x)}}else{var TRY_USE_DUMP=false;if(!Module["print"])Module["print"]=TRY_USE_DUMP&&typeof dump!=="undefined"?function(x){dump(x)}:function(x){}}if(ENVIRONMENT_IS_WORKER){Module["load"]=importScripts}if(typeof Module["setWindowTitle"]==="undefined"){Module["setWindowTitle"]=function(title){document.title=title}}}else{throw"Unknown runtime environment. Where are we?"}function globalEval(x){eval.call(null,x)}if(!Module["load"]&&Module["read"]){Module["load"]=function load(f){globalEval(Module["read"](f))}}if(!Module["print"]){Module["print"]=function(){}}if(!Module["printErr"]){Module["printErr"]=Module["print"]}if(!Module["arguments"]){Module["arguments"]=[]}if(!Module["thisProgram"]){Module["thisProgram"]="./this.program"}Module.print=Module["print"];Module.printErr=Module["printErr"];Module["preRun"]=[];Module["postRun"]=[];for(var key in moduleOverrides){if(moduleOverrides.hasOwnProperty(key)){Module[key]=moduleOverrides[key]}}var Runtime={setTempRet0:function(value){tempRet0=value},getTempRet0:function(){return tempRet0},stackSave:function(){return STACKTOP},stackRestore:function(stackTop){STACKTOP=stackTop},getNativeTypeSize:function(type){switch(type){case"i1":case"i8":return 1;case"i16":return 2;case"i32":return 4;case"i64":return 8;case"float":return 4;case"double":return 8;default:{if(type[type.length-1]==="*"){return Runtime.QUANTUM_SIZE}else if(type[0]==="i"){var bits=parseInt(type.substr(1));assert(bits%8===0);return bits/8}else{return 0}}}},getNativeFieldSize:function(type){return Math.max(Runtime.getNativeTypeSize(type),Runtime.QUANTUM_SIZE)},STACK_ALIGN:16,prepVararg:function(ptr,type){if(type==="double"||type==="i64"){if(ptr&7){assert((ptr&7)===4);ptr+=4}}else{assert((ptr&3)===0)}return ptr},getAlignSize:function(type,size,vararg){if(!vararg&&(type=="i64"||type=="double"))return 8;if(!type)return Math.min(size,8);return Math.min(size||(type?Runtime.getNativeFieldSize(type):0),Runtime.QUANTUM_SIZE)},dynCall:function(sig,ptr,args){if(args&&args.length){if(!args.splice)args=Array.prototype.slice.call(args);args.splice(0,0,ptr);return Module["dynCall_"+sig].apply(null,args)}else{return Module["dynCall_"+sig].call(null,ptr)}},functionPointers:[],addFunction:function(func){for(var i=0;i<Runtime.functionPointers.length;i++){if(!Runtime.functionPointers[i]){Runtime.functionPointers[i]=func;return 2*(1+i)}}throw"Finished up all reserved function pointers. Use a higher value for RESERVED_FUNCTION_POINTERS."},removeFunction:function(index){Runtime.functionPointers[(index-2)/2]=null},warnOnce:function(text){if(!Runtime.warnOnce.shown)Runtime.warnOnce.shown={};if(!Runtime.warnOnce.shown[text]){Runtime.warnOnce.shown[text]=1;Module.printErr(text)}},funcWrappers:{},getFuncWrapper:function(func,sig){assert(sig);if(!Runtime.funcWrappers[sig]){Runtime.funcWrappers[sig]={}}var sigCache=Runtime.funcWrappers[sig];if(!sigCache[func]){sigCache[func]=function dynCall_wrapper(){return Runtime.dynCall(sig,func,arguments)}}return sigCache[func]},getCompilerSetting:function(name){throw"You must build with -s RETAIN_COMPILER_SETTINGS=1 for Runtime.getCompilerSetting or emscripten_get_compiler_setting to work"},stackAlloc:function(size){var ret=STACKTOP;STACKTOP=STACKTOP+size|0;STACKTOP=STACKTOP+15&-16;return ret},staticAlloc:function(size){var ret=STATICTOP;STATICTOP=STATICTOP+size|0;STATICTOP=STATICTOP+15&-16;return ret},dynamicAlloc:function(size){var ret=DYNAMICTOP;DYNAMICTOP=DYNAMICTOP+size|0;DYNAMICTOP=DYNAMICTOP+15&-16;if(DYNAMICTOP>=TOTAL_MEMORY){var success=enlargeMemory();if(!success){DYNAMICTOP=ret;return 0}}return ret},alignMemory:function(size,quantum){var ret=size=Math.ceil(size/(quantum?quantum:16))*(quantum?quantum:16);return ret},makeBigInt:function(low,high,unsigned){var ret=unsigned?+(low>>>0)+ +(high>>>0)*+4294967296:+(low>>>0)+ +(high|0)*+4294967296;return ret},GLOBAL_BASE:8,QUANTUM_SIZE:4,__dummy__:0};Module["Runtime"]=Runtime;var __THREW__=0;var ABORT=false;var EXITSTATUS=0;var undef=0;var tempValue,tempInt,tempBigInt,tempInt2,tempBigInt2,tempPair,tempBigIntI,tempBigIntR,tempBigIntS,tempBigIntP,tempBigIntD,tempDouble,tempFloat;var tempI64,tempI64b;var tempRet0,tempRet1,tempRet2,tempRet3,tempRet4,tempRet5,tempRet6,tempRet7,tempRet8,tempRet9;function assert(condition,text){if(!condition){abort("Assertion failed: "+text)}}var globalScope=this;function getCFunc(ident){var func=Module["_"+ident];if(!func){try{func=eval("_"+ident)}catch(e){}}assert(func,"Cannot call unknown function "+ident+" (perhaps LLVM optimizations or closure removed it?)");return func}var cwrap,ccall;(function(){var JSfuncs={stackSave:function(){Runtime.stackSave()},stackRestore:function(){Runtime.stackRestore()},arrayToC:function(arr){var ret=Runtime.stackAlloc(arr.length);writeArrayToMemory(arr,ret);return ret},stringToC:function(str){var ret=0;if(str!==null&&str!==undefined&&str!==0){ret=Runtime.stackAlloc((str.length<<2)+1);writeStringToMemory(str,ret)}return ret}};var toC={string:JSfuncs["stringToC"],array:JSfuncs["arrayToC"]};ccall=function ccallFunc(ident,returnType,argTypes,args,opts){var func=getCFunc(ident);var cArgs=[];var stack=0;if(args){for(var i=0;i<args.length;i++){var converter=toC[argTypes[i]];if(converter){if(stack===0)stack=Runtime.stackSave();cArgs[i]=converter(args[i])}else{cArgs[i]=args[i]}}}var ret=func.apply(null,cArgs);if(returnType==="string")ret=Pointer_stringify(ret);if(stack!==0){if(opts&&opts.async){EmterpreterAsync.asyncFinalizers.push(function(){Runtime.stackRestore(stack)});return}Runtime.stackRestore(stack)}return ret};var sourceRegex=/^function\\s*\\(([^)]*)\\)\\s*{\\s*([^*]*?)[\\s;]*(?:return\\s*(.*?)[;\\s]*)?}$/;function parseJSFunc(jsfunc){var parsed=jsfunc.toString().match(sourceRegex).slice(1);return{arguments:parsed[0],body:parsed[1],returnValue:parsed[2]}}var JSsource={};for(var fun in JSfuncs){if(JSfuncs.hasOwnProperty(fun)){JSsource[fun]=parseJSFunc(JSfuncs[fun])}}cwrap=function cwrap(ident,returnType,argTypes){argTypes=argTypes||[];var cfunc=getCFunc(ident);var numericArgs=argTypes.every(function(type){return type==="number"});var numericRet=returnType!=="string";if(numericRet&&numericArgs){return cfunc}var argNames=argTypes.map(function(x,i){return"$"+i});var funcstr="(function("+argNames.join(",")+") {";var nargs=argTypes.length;if(!numericArgs){funcstr+="var stack = "+JSsource["stackSave"].body+";";for(var i=0;i<nargs;i++){var arg=argNames[i],type=argTypes[i];if(type==="number")continue;var convertCode=JSsource[type+"ToC"];funcstr+="var "+convertCode.arguments+" = "+arg+";";funcstr+=convertCode.body+";";funcstr+=arg+"="+convertCode.returnValue+";"}}var cfuncname=parseJSFunc(function(){return cfunc}).returnValue;funcstr+="var ret = "+cfuncname+"("+argNames.join(",")+");";if(!numericRet){var strgfy=parseJSFunc(function(){return Pointer_stringify}).returnValue;funcstr+="ret = "+strgfy+"(ret);"}if(!numericArgs){funcstr+=JSsource["stackRestore"].body.replace("()","(stack)")+";"}funcstr+="return ret})";return eval(funcstr)}})();Module["ccall"]=ccall;Module["cwrap"]=cwrap;function setValue(ptr,value,type,noSafe){type=type||"i8";if(type.charAt(type.length-1)==="*")type="i32";switch(type){case"i1":HEAP8[ptr>>0]=value;break;case"i8":HEAP8[ptr>>0]=value;break;case"i16":HEAP16[ptr>>1]=value;break;case"i32":HEAP32[ptr>>2]=value;break;case"i64":tempI64=[value>>>0,(tempDouble=value,+Math_abs(tempDouble)>=+1?tempDouble>+0?(Math_min(+Math_floor(tempDouble/+4294967296),+4294967295)|0)>>>0:~~+Math_ceil((tempDouble-+(~~tempDouble>>>0))/+4294967296)>>>0:0)],HEAP32[ptr>>2]=tempI64[0],HEAP32[ptr+4>>2]=tempI64[1];break;case"float":HEAPF32[ptr>>2]=value;break;case"double":HEAPF64[ptr>>3]=value;break;default:abort("invalid type for setValue: "+type)}}Module["setValue"]=setValue;function getValue(ptr,type,noSafe){type=type||"i8";if(type.charAt(type.length-1)==="*")type="i32";switch(type){case"i1":return HEAP8[ptr>>0];case"i8":return HEAP8[ptr>>0];case"i16":return HEAP16[ptr>>1];case"i32":return HEAP32[ptr>>2];case"i64":return HEAP32[ptr>>2];case"float":return HEAPF32[ptr>>2];case"double":return HEAPF64[ptr>>3];default:abort("invalid type for setValue: "+type)}return null}Module["getValue"]=getValue;var ALLOC_NORMAL=0;var ALLOC_STACK=1;var ALLOC_STATIC=2;var ALLOC_DYNAMIC=3;var ALLOC_NONE=4;Module["ALLOC_NORMAL"]=ALLOC_NORMAL;Module["ALLOC_STACK"]=ALLOC_STACK;Module["ALLOC_STATIC"]=ALLOC_STATIC;Module["ALLOC_DYNAMIC"]=ALLOC_DYNAMIC;Module["ALLOC_NONE"]=ALLOC_NONE;function allocate(slab,types,allocator,ptr){var zeroinit,size;if(typeof slab==="number"){zeroinit=true;size=slab}else{zeroinit=false;size=slab.length}var singleType=typeof types==="string"?types:null;var ret;if(allocator==ALLOC_NONE){ret=ptr}else{ret=[_malloc,Runtime.stackAlloc,Runtime.staticAlloc,Runtime.dynamicAlloc][allocator===undefined?ALLOC_STATIC:allocator](Math.max(size,singleType?1:types.length))}if(zeroinit){var ptr=ret,stop;assert((ret&3)==0);stop=ret+(size&~3);for(;ptr<stop;ptr+=4){HEAP32[ptr>>2]=0}stop=ret+size;while(ptr<stop){HEAP8[ptr++>>0]=0}return ret}if(singleType==="i8"){if(slab.subarray||slab.slice){HEAPU8.set(slab,ret)}else{HEAPU8.set(new Uint8Array(slab),ret)}return ret}var i=0,type,typeSize,previousType;while(i<size){var curr=slab[i];if(typeof curr==="function"){curr=Runtime.getFunctionIndex(curr)}type=singleType||types[i];if(type===0){i++;continue}if(type=="i64")type="i32";setValue(ret+i,curr,type);if(previousType!==type){typeSize=Runtime.getNativeTypeSize(type);previousType=type}i+=typeSize}return ret}Module["allocate"]=allocate;function getMemory(size){if(!staticSealed)return Runtime.staticAlloc(size);if(typeof _sbrk!=="undefined"&&!_sbrk.called||!runtimeInitialized)return Runtime.dynamicAlloc(size);return _malloc(size)}Module["getMemory"]=getMemory;function Pointer_stringify(ptr,length){if(length===0||!ptr)return"";var hasUtf=0;var t;var i=0;while(1){t=HEAPU8[ptr+i>>0];hasUtf|=t;if(t==0&&!length)break;i++;if(length&&i==length)break}if(!length)length=i;var ret="";if(hasUtf<128){var MAX_CHUNK=1024;var curr;while(length>0){curr=String.fromCharCode.apply(String,HEAPU8.subarray(ptr,ptr+Math.min(length,MAX_CHUNK)));ret=ret?ret+curr:curr;ptr+=MAX_CHUNK;length-=MAX_CHUNK}return ret}return Module["UTF8ToString"](ptr)}Module["Pointer_stringify"]=Pointer_stringify;function AsciiToString(ptr){var str="";while(1){var ch=HEAP8[ptr++>>0];if(!ch)return str;str+=String.fromCharCode(ch)}}Module["AsciiToString"]=AsciiToString;function stringToAscii(str,outPtr){return writeAsciiToMemory(str,outPtr,false)}Module["stringToAscii"]=stringToAscii;function UTF8ArrayToString(u8Array,idx){var u0,u1,u2,u3,u4,u5;var str="";while(1){u0=u8Array[idx++];if(!u0)return str;if(!(u0&128)){str+=String.fromCharCode(u0);continue}u1=u8Array[idx++]&63;if((u0&224)==192){str+=String.fromCharCode((u0&31)<<6|u1);continue}u2=u8Array[idx++]&63;if((u0&240)==224){u0=(u0&15)<<12|u1<<6|u2}else{u3=u8Array[idx++]&63;if((u0&248)==240){u0=(u0&7)<<18|u1<<12|u2<<6|u3}else{u4=u8Array[idx++]&63;if((u0&252)==248){u0=(u0&3)<<24|u1<<18|u2<<12|u3<<6|u4}else{u5=u8Array[idx++]&63;u0=(u0&1)<<30|u1<<24|u2<<18|u3<<12|u4<<6|u5}}}if(u0<65536){str+=String.fromCharCode(u0)}else{var ch=u0-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}}}Module["UTF8ArrayToString"]=UTF8ArrayToString;function UTF8ToString(ptr){return UTF8ArrayToString(HEAPU8,ptr)}Module["UTF8ToString"]=UTF8ToString;function stringToUTF8Array(str,outU8Array,outIdx,maxBytesToWrite){if(!(maxBytesToWrite>0))return 0;var startIdx=outIdx;var endIdx=outIdx+maxBytesToWrite-1;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127){if(outIdx>=endIdx)break;outU8Array[outIdx++]=u}else if(u<=2047){if(outIdx+1>=endIdx)break;outU8Array[outIdx++]=192|u>>6;outU8Array[outIdx++]=128|u&63}else if(u<=65535){if(outIdx+2>=endIdx)break;outU8Array[outIdx++]=224|u>>12;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else if(u<=2097151){if(outIdx+3>=endIdx)break;outU8Array[outIdx++]=240|u>>18;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else if(u<=67108863){if(outIdx+4>=endIdx)break;outU8Array[outIdx++]=248|u>>24;outU8Array[outIdx++]=128|u>>18&63;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}else{if(outIdx+5>=endIdx)break;outU8Array[outIdx++]=252|u>>30;outU8Array[outIdx++]=128|u>>24&63;outU8Array[outIdx++]=128|u>>18&63;outU8Array[outIdx++]=128|u>>12&63;outU8Array[outIdx++]=128|u>>6&63;outU8Array[outIdx++]=128|u&63}}outU8Array[outIdx]=0;return outIdx-startIdx}Module["stringToUTF8Array"]=stringToUTF8Array;function stringToUTF8(str,outPtr,maxBytesToWrite){return stringToUTF8Array(str,HEAPU8,outPtr,maxBytesToWrite)}Module["stringToUTF8"]=stringToUTF8;function lengthBytesUTF8(str){var len=0;for(var i=0;i<str.length;++i){var u=str.charCodeAt(i);if(u>=55296&&u<=57343)u=65536+((u&1023)<<10)|str.charCodeAt(++i)&1023;if(u<=127){++len}else if(u<=2047){len+=2}else if(u<=65535){len+=3}else if(u<=2097151){len+=4}else if(u<=67108863){len+=5}else{len+=6}}return len}Module["lengthBytesUTF8"]=lengthBytesUTF8;function UTF16ToString(ptr){var i=0;var str="";while(1){var codeUnit=HEAP16[ptr+i*2>>1];if(codeUnit==0)return str;++i;str+=String.fromCharCode(codeUnit)}}Module["UTF16ToString"]=UTF16ToString;function stringToUTF16(str,outPtr,maxBytesToWrite){if(maxBytesToWrite===undefined){maxBytesToWrite=2147483647}if(maxBytesToWrite<2)return 0;maxBytesToWrite-=2;var startPtr=outPtr;var numCharsToWrite=maxBytesToWrite<str.length*2?maxBytesToWrite/2:str.length;for(var i=0;i<numCharsToWrite;++i){var codeUnit=str.charCodeAt(i);HEAP16[outPtr>>1]=codeUnit;outPtr+=2}HEAP16[outPtr>>1]=0;return outPtr-startPtr}Module["stringToUTF16"]=stringToUTF16;function lengthBytesUTF16(str){return str.length*2}Module["lengthBytesUTF16"]=lengthBytesUTF16;function UTF32ToString(ptr){var i=0;var str="";while(1){var utf32=HEAP32[ptr+i*4>>2];if(utf32==0)return str;++i;if(utf32>=65536){var ch=utf32-65536;str+=String.fromCharCode(55296|ch>>10,56320|ch&1023)}else{str+=String.fromCharCode(utf32)}}}Module["UTF32ToString"]=UTF32ToString;function stringToUTF32(str,outPtr,maxBytesToWrite){if(maxBytesToWrite===undefined){maxBytesToWrite=2147483647}if(maxBytesToWrite<4)return 0;var startPtr=outPtr;var endPtr=startPtr+maxBytesToWrite-4;for(var i=0;i<str.length;++i){var codeUnit=str.charCodeAt(i);if(codeUnit>=55296&&codeUnit<=57343){var trailSurrogate=str.charCodeAt(++i);codeUnit=65536+((codeUnit&1023)<<10)|trailSurrogate&1023}HEAP32[outPtr>>2]=codeUnit;outPtr+=4;if(outPtr+4>endPtr)break}HEAP32[outPtr>>2]=0;return outPtr-startPtr}Module["stringToUTF32"]=stringToUTF32;function lengthBytesUTF32(str){var len=0;for(var i=0;i<str.length;++i){var codeUnit=str.charCodeAt(i);if(codeUnit>=55296&&codeUnit<=57343)++i;len+=4}return len}Module["lengthBytesUTF32"]=lengthBytesUTF32;function demangle(func){var hasLibcxxabi=!!Module["___cxa_demangle"];if(hasLibcxxabi){try{var buf=_malloc(func.length);writeStringToMemory(func.substr(1),buf);var status=_malloc(4);var ret=Module["___cxa_demangle"](buf,0,0,status);if(getValue(status,"i32")===0&&ret){return Pointer_stringify(ret)}}catch(e){}finally{if(buf)_free(buf);if(status)_free(status);if(ret)_free(ret)}}var i=3;var basicTypes={v:"void",b:"bool",c:"char",s:"short",i:"int",l:"long",f:"float",d:"double",w:"wchar_t",a:"signed char",h:"unsigned char",t:"unsigned short",j:"unsigned int",m:"unsigned long",x:"long long",y:"unsigned long long",z:"..."};var subs=[];var first=true;function dump(x){if(x)Module.print(x);Module.print(func);var pre="";for(var a=0;a<i;a++)pre+=" ";Module.print(pre+"^")}function parseNested(){i++;if(func[i]==="K")i++;var parts=[];while(func[i]!=="E"){if(func[i]==="S"){i++;var next=func.indexOf("_",i);var num=func.substring(i,next)||0;parts.push(subs[num]||"?");i=next+1;continue}if(func[i]==="C"){parts.push(parts[parts.length-1]);i+=2;continue}var size=parseInt(func.substr(i));var pre=size.toString().length;if(!size||!pre){i--;break}var curr=func.substr(i+pre,size);parts.push(curr);subs.push(curr);i+=pre+size}i++;return parts}function parse(rawList,limit,allowVoid){limit=limit||Infinity;var ret="",list=[];function flushList(){return"("+list.join(", ")+")"}var name;if(func[i]==="N"){name=parseNested().join("::");limit--;if(limit===0)return rawList?[name]:name}else{if(func[i]==="K"||first&&func[i]==="L")i++;var size=parseInt(func.substr(i));if(size){var pre=size.toString().length;name=func.substr(i+pre,size);i+=pre+size}}first=false;if(func[i]==="I"){i++;var iList=parse(true);var iRet=parse(true,1,true);ret+=iRet[0]+" "+name+"<"+iList.join(", ")+">"}else{ret=name}paramLoop:while(i<func.length&&limit-- >0){var c=func[i++];if(c in basicTypes){list.push(basicTypes[c])}else{switch(c){case"P":list.push(parse(true,1,true)[0]+"*");break;case"R":list.push(parse(true,1,true)[0]+"&");break;case"L":{i++;var end=func.indexOf("E",i);var size=end-i;list.push(func.substr(i,size));i+=size+2;break};case"A":{var size=parseInt(func.substr(i));i+=size.toString().length;if(func[i]!=="_")throw"?";i++;list.push(parse(true,1,true)[0]+" ["+size+"]");break};case"E":break paramLoop;default:ret+="?"+c;break paramLoop}}}if(!allowVoid&&list.length===1&&list[0]==="void")list=[];if(rawList){if(ret){list.push(ret+"?")}return list}else{return ret+flushList()}}var parsed=func;try{if(func=="Object._main"||func=="_main"){return"main()"}if(typeof func==="number")func=Pointer_stringify(func);if(func[0]!=="_")return func;if(func[1]!=="_")return func;if(func[2]!=="Z")return func;switch(func[3]){case"n":return"operator new()";case"d":return"operator delete()"}parsed=parse()}catch(e){parsed+="?"}if(parsed.indexOf("?")>=0&&!hasLibcxxabi){Runtime.warnOnce("warning: a problem occurred in builtin C++ name demangling; build with  -s DEMANGLE_SUPPORT=1  to link in libcxxabi demangling")}return parsed}function demangleAll(text){return text.replace(/__Z[\\w\\d_]+/g,function(x){var y=demangle(x);return x===y?x:x+" ["+y+"]"})}function jsStackTrace(){var err=new Error;if(!err.stack){try{throw new Error(0)}catch(e){err=e}if(!err.stack){return"(no stack trace available)"}}return err.stack.toString()}function stackTrace(){return demangleAll(jsStackTrace())}Module["stackTrace"]=stackTrace;var PAGE_SIZE=4096;function alignMemoryPage(x){if(x%4096>0){x+=4096-x%4096}return x}var HEAP;var HEAP8,HEAPU8,HEAP16,HEAPU16,HEAP32,HEAPU32,HEAPF32,HEAPF64;var STATIC_BASE=0,STATICTOP=0,staticSealed=false;var STACK_BASE=0,STACKTOP=0,STACK_MAX=0;var DYNAMIC_BASE=0,DYNAMICTOP=0;function enlargeMemory(){abort("Cannot enlarge memory arrays. Either (1) compile with -s TOTAL_MEMORY=X with X higher than the current value "+TOTAL_MEMORY+", (2) compile with ALLOW_MEMORY_GROWTH which adjusts the size at runtime but prevents some optimizations, or (3) set Module.TOTAL_MEMORY before the program runs.")}var TOTAL_STACK=Module["TOTAL_STACK"]||65536;var TOTAL_MEMORY=Module["TOTAL_MEMORY"]||524288;var totalMemory=64*1024;while(totalMemory<TOTAL_MEMORY||totalMemory<2*TOTAL_STACK){if(totalMemory<16*1024*1024){totalMemory*=2}else{totalMemory+=16*1024*1024}}if(totalMemory!==TOTAL_MEMORY){Module.printErr("increasing TOTAL_MEMORY to "+totalMemory+" to be compliant with the asm.js spec (and given that TOTAL_STACK="+TOTAL_STACK+")");TOTAL_MEMORY=totalMemory}assert(typeof Int32Array!=="undefined"&&typeof Float64Array!=="undefined"&&!!new Int32Array(1)["subarray"]&&!!new Int32Array(1)["set"],"JS engine does not provide full typed array support");var buffer;buffer=new ArrayBuffer(TOTAL_MEMORY);HEAP8=new Int8Array(buffer);HEAP16=new Int16Array(buffer);HEAP32=new Int32Array(buffer);HEAPU8=new Uint8Array(buffer);HEAPU16=new Uint16Array(buffer);HEAPU32=new Uint32Array(buffer);HEAPF32=new Float32Array(buffer);HEAPF64=new Float64Array(buffer);HEAP32[0]=255;assert(HEAPU8[0]===255&&HEAPU8[3]===0,"Typed arrays 2 must be run on a little-endian system");Module["HEAP"]=HEAP;Module["buffer"]=buffer;Module["HEAP8"]=HEAP8;Module["HEAP16"]=HEAP16;Module["HEAP32"]=HEAP32;Module["HEAPU8"]=HEAPU8;Module["HEAPU16"]=HEAPU16;Module["HEAPU32"]=HEAPU32;Module["HEAPF32"]=HEAPF32;Module["HEAPF64"]=HEAPF64;function callRuntimeCallbacks(callbacks){while(callbacks.length>0){var callback=callbacks.shift();if(typeof callback=="function"){callback();continue}var func=callback.func;if(typeof func==="number"){if(callback.arg===undefined){Runtime.dynCall("v",func)}else{Runtime.dynCall("vi",func,[callback.arg])}}else{func(callback.arg===undefined?null:callback.arg)}}}var __ATPRERUN__=[];var __ATINIT__=[];var __ATMAIN__=[];var __ATEXIT__=[];var __ATPOSTRUN__=[];var runtimeInitialized=false;var runtimeExited=false;function preRun(){if(Module["preRun"]){if(typeof Module["preRun"]=="function")Module["preRun"]=[Module["preRun"]];while(Module["preRun"].length){addOnPreRun(Module["preRun"].shift())}}callRuntimeCallbacks(__ATPRERUN__)}function ensureInitRuntime(){if(runtimeInitialized)return;runtimeInitialized=true;callRuntimeCallbacks(__ATINIT__)}function preMain(){callRuntimeCallbacks(__ATMAIN__)}function exitRuntime(){callRuntimeCallbacks(__ATEXIT__);runtimeExited=true}function postRun(){if(Module["postRun"]){if(typeof Module["postRun"]=="function")Module["postRun"]=[Module["postRun"]];while(Module["postRun"].length){addOnPostRun(Module["postRun"].shift())}}callRuntimeCallbacks(__ATPOSTRUN__)}function addOnPreRun(cb){__ATPRERUN__.unshift(cb)}Module["addOnPreRun"]=addOnPreRun;function addOnInit(cb){__ATINIT__.unshift(cb)}Module["addOnInit"]=addOnInit;function addOnPreMain(cb){__ATMAIN__.unshift(cb)}Module["addOnPreMain"]=addOnPreMain;function addOnExit(cb){__ATEXIT__.unshift(cb)}Module["addOnExit"]=addOnExit;function addOnPostRun(cb){__ATPOSTRUN__.unshift(cb)}Module["addOnPostRun"]=addOnPostRun;function intArrayFromString(stringy,dontAddNull,length){var len=length>0?length:lengthBytesUTF8(stringy)+1;var u8array=new Array(len);var numBytesWritten=stringToUTF8Array(stringy,u8array,0,u8array.length);if(dontAddNull)u8array.length=numBytesWritten;return u8array}Module["intArrayFromString"]=intArrayFromString;function intArrayToString(array){var ret=[];for(var i=0;i<array.length;i++){var chr=array[i];if(chr>255){chr&=255}ret.push(String.fromCharCode(chr))}return ret.join("")}Module["intArrayToString"]=intArrayToString;function writeStringToMemory(string,buffer,dontAddNull){var array=intArrayFromString(string,dontAddNull);var i=0;while(i<array.length){var chr=array[i];HEAP8[buffer+i>>0]=chr;i=i+1}}Module["writeStringToMemory"]=writeStringToMemory;function writeArrayToMemory(array,buffer){for(var i=0;i<array.length;i++){HEAP8[buffer++>>0]=array[i]}}Module["writeArrayToMemory"]=writeArrayToMemory;function writeAsciiToMemory(str,buffer,dontAddNull){for(var i=0;i<str.length;++i){HEAP8[buffer++>>0]=str.charCodeAt(i)}if(!dontAddNull)HEAP8[buffer>>0]=0}Module["writeAsciiToMemory"]=writeAsciiToMemory;function unSign(value,bits,ignore){if(value>=0){return value}return bits<=32?2*Math.abs(1<<bits-1)+value:Math.pow(2,bits)+value}function reSign(value,bits,ignore){if(value<=0){return value}var half=bits<=32?Math.abs(1<<bits-1):Math.pow(2,bits-1);if(value>=half&&(bits<=32||value>half)){value=-2*half+value}return value}if(!Math["imul"]||Math["imul"](4294967295,5)!==-5)Math["imul"]=function imul(a,b){var ah=a>>>16;var al=a&65535;var bh=b>>>16;var bl=b&65535;return al*bl+(ah*bl+al*bh<<16)|0};Math.imul=Math["imul"];if(!Math["clz32"])Math["clz32"]=function(x){x=x>>>0;for(var i=0;i<32;i++){if(x&1<<31-i)return i}return 32};Math.clz32=Math["clz32"];var Math_abs=Math.abs;var Math_cos=Math.cos;var Math_sin=Math.sin;var Math_tan=Math.tan;var Math_acos=Math.acos;var Math_asin=Math.asin;var Math_atan=Math.atan;var Math_atan2=Math.atan2;var Math_exp=Math.exp;var Math_log=Math.log;var Math_sqrt=Math.sqrt;var Math_ceil=Math.ceil;var Math_floor=Math.floor;var Math_pow=Math.pow;var Math_imul=Math.imul;var Math_fround=Math.fround;var Math_min=Math.min;var Math_clz32=Math.clz32;var runDependencies=0;var runDependencyWatcher=null;var dependenciesFulfilled=null;function getUniqueRunDependency(id){return id}function addRunDependency(id){runDependencies++;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}}Module["addRunDependency"]=addRunDependency;function removeRunDependency(id){runDependencies--;if(Module["monitorRunDependencies"]){Module["monitorRunDependencies"](runDependencies)}if(runDependencies==0){if(runDependencyWatcher!==null){clearInterval(runDependencyWatcher);runDependencyWatcher=null}if(dependenciesFulfilled){var callback=dependenciesFulfilled;dependenciesFulfilled=null;callback()}}}Module["removeRunDependency"]=removeRunDependency;Module["preloadedImages"]={};Module["preloadedAudios"]={};var memoryInitializer=null;var ASM_CONSTS=[];STATIC_BASE=8;STATICTOP=STATIC_BASE+31776;__ATINIT__.push();allocate([154,14,0,0,188,14,0,0,226,14,0,0,8,15,0,0,46,15,0,0,84,15,0,0,130,15,0,0,208,15,0,0,66,16,0,0,108,16,0,0,42,17,0,0,248,17,0,0,228,18,0,0,240,19,0,0,24,21,0,0,86,22,0,0,238,23,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,12,0,13,0,15,0,17,0,19,0,20,0,26,0,31,0,5,0,6,0,5,0,5,0,0,0,0,0,0,0,0,0,1,252,146,252,36,253,182,253,72,254,218,254,108,255,0,0,0,0,32,78,32,78,32,78,32,78,32,78,80,70,0,64,0,32,0,0,0,0,255,127,112,125,112,125,112,125,112,125,112,125,153,89,255,127,112,125,112,125,102,102,102,38,153,25,153,25,154,89,185,62,232,43,188,30,132,21,16,15,139,10,97,7,42,5,157,3,0,96,0,72,0,54,128,40,96,30,200,22,22,17,209,12,157,9,54,7,102,70,184,38,75,21,182,11,113,6,139,3,243,1,18,1,151,0,83,0,154,89,185,62,232,43,188,30,132,21,16,15,139,10,97,7,42,5,157,3,44,3,128,0,30,2,140,0,57,11,111,4,218,8,74,13,19,8,51,2,133,49,135,2,36,16,6,7,225,21,165,20,9,30,118,1,151,14,185,1,160,42,78,10,31,46,190,9,10,80,29,3,98,20,163,2,68,26,162,32,162,20,160,6,208,5,172,1,250,22,196,1,212,20,232,15,255,13,244,4,165,9,133,3,22,62,237,3,134,58,199,12,91,40,250,18,51,14,229,7,36,10,67,3,72,48,28,19,174,47,168,6,120,52,68,6,158,35,37,9,128,15,2,6,103,21,208,38,211,14,161,1,79,5,158,1,56,14,33,6,59,31,213,13,141,44,133,2,104,33,123,2,216,15,97,5,224,64,236,23,156,44,188,2,215,7,95,2,127,48,42,6,111,43,46,18,112,53,172,6,214,46,205,4,60,31,129,28,175,51,83,22,124,9,135,4,25,8,149,7,74,24,233,23,218,13,12,7,221,34,10,7,231,33,44,6,111,54,248,13,1,52,93,24,254,23,106,4,106,23,198,6,61,55,54,18,7,44,249,12,194,47,15,6,107,54,199,11,217,19,224,40,228,36,50,26,153,6,171,2,156,5,26,5,44,28,93,15,242,15,153,10,113,30,192,2,222,58,34,3,155,24,92,20,241,16,237,20,20,26,29,2,174,23,114,2,83,53,116,14,234,44,104,9,28,63,204,2,145,47,239,2,129,31,225,44,170,24,208,8,114,17,240,1,125,28,11,2,229,39,249,14,202,32,221,11,211,32,198,3,148,55,88,7,255,33,33,21,11,64,255,18,252,28,187,7,201,23,206,4,155,36,46,17,222,56,35,13,247,52,57,11,107,51,185,5,158,21,142,6,82,51,179,57,170,28,88,2,38,5,36,2,156,16,211,13,60,39,60,9,91,41,110,2,32,51,157,2,46,55,198,13,175,19,56,38,234,59,107,2,43,12,78,2,58,64,197,11,182,60,72,16,177,60,75,6,45,60,204,4,151,62,83,36,110,29,112,19,198,7,189,4,183,44,133,4,224,48,143,21,3,37,84,10,36,30,242,7,224,51,191,8,139,62,229,19,130,31,105,26,99,39,133,5,138,19,43,9,235,48,87,23,22,59,83,11,88,71,241,8,211,61,223,9,137,63,14,40,59,57,55,44,5,7,81,1,43,12,141,1,182,13,112,11,240,17,110,10,95,29,116,2,151,44,144,2,58,23,131,9,144,25,199,28,46,32,61,3,160,15,95,3,48,39,188,9,185,62,223,13,28,71,30,4,215,23,174,5,252,22,220,30,64,73,140,13,72,7,32,2,238,35,171,2,103,45,64,16,242,17,108,6,86,12,133,4,81,62,0,10,61,48,149,14,12,68,140,20,218,23,212,7,101,11,206,6,83,64,137,20,147,65,144,6,53,67,223,6,165,18,159,12,218,28,147,23,6,56,28,39,195,15,186,1,98,16,202,1,254,35,194,8,3,29,121,16,60,50,33,3,178,43,57,3,104,49,36,8,156,50,154,25,33,37,228,3,229,25,217,3,41,41,198,9,185,59,142,19,58,49,7,8,124,60,117,6,66,63,9,27,151,55,158,22,66,10,60,3,239,21,150,6,95,53,146,22,84,14,18,6,49,44,73,10,42,38,179,5,179,54,125,18,25,62,147,24,134,24,78,7,230,30,237,8,82,66,219,17,192,64,9,15,144,59,7,9,151,62,172,12,123,56,144,69,71,46,203,10,189,7,127,5,120,5,108,3,239,16,219,13,39,17,114,16,29,21,168,2,53,68,13,3,101,25,254,19,155,31,253,29,187,28,26,3,141,32,158,4,193,58,88,12,80,58,223,11,197,79,112,3,209,56,84,3,49,48,116,57,248,26,128,7,129,16,165,3,26,32,63,4,163,41,244,15,98,39,181,17,175,10,72,3,177,80,57,4,71,65,78,23,1,62,226,17,119,42,14,10,189,14,142,4,183,56,204,15,219,80,67,10,115,59,174,10,170,59,138,8,113,24,154,12,69,51,24,76,28,28,162,3,158,9,82,6,163,17,20,12,28,54,181,16,220,40,65,3,187,67,42,3,251,65,241,8,186,60,25,32,35,53,148,6,125,12,42,7,76,62,4,11,196,61,207,20,110,66,134,9,148,65,46,5,55,61,220,31,206,45,108,33,178,14,5,8,91,37,37,5,249,52,134,26,195,47,144,7,244,31,222,13,231,51,242,6,171,63,199,25,163,63,78,30,73,33,247,9,57,28,85,10,93,71,65,29,245,65,200,8,218,69,68,11,113,67,0,13,201,36,194,78,34,43,128,32,6,5,108,2,151,5,71,2,105,23,241,8,138,15,42,14,24,20,240,2,97,52,62,3,177,21,44,11,244,45,20,23,241,41,48,2,70,21,52,2,9,52,192,11,170,46,99,14,175,77,30,3,97,38,216,2,95,53,44,34,223,28,237,11,211,9,10,3,162,23,65,3,69,25,210,19,113,32,159,9,253,23,73,7,204,59,238,4,72,56,195,17,95,53,163,17,65,12,167,11,175,9,235,4,240,58,39,18,22,60,47,10,156,56,88,9,174,48,233,9,115,29,133,11,109,50,28,47,92,21,172,2,69,12,210,2,217,19,250,4,188,49,104,16,198,59,169,2,139,30,80,2,134,25,229,7,94,64,33,34,52,52,114,3,21,21,131,3,64,57,130,8,149,57,131,16,190,55,18,5,105,54,237,7,117,60,58,29,199,61,220,17,217,9,221,7,198,19,12,7,39,20,182,25,218,27,13,14,168,42,75,6,209,45,172,6,7,66,127,13,140,63,240,25,90,36,239,3,153,36,58,8,238,74,173,19,153,48,173,16,47,62,52,5,253,59,184,13,122,46,61,55,229,62,198,26,218,7,225,2,195,14,93,3,190,44,64,11,236,13,212,13,97,35,217,4,103,48,128,3,98,33,21,18,41,45,144,22,193,31,77,2,26,32,76,2,40,73,171,14,173,50,77,12,113,61,246,2,250,64,242,2,118,59,130,43,255,61,160,8,65,18,98,2,234,39,166,2,153,59,50,16,97,22,255,12,185,32,134,6,150,77,17,9,90,60,135,21,230,54,105,21,96,22,72,11,156,29,66,5,48,56,205,20,108,63,110,15,14,59,160,14,202,59,155,5,5,57,230,15,13,48,80,61,193,29,163,6,122,8,116,3,107,17,215,17,174,70,234,12,198,49,47,3,78,58,139,3,168,58,185,16,158,60,176,32,74,70,63,4,54,9,97,3,153,63,203,14,63,61,244,17,228,63,254,5,200,64,162,8,193,65,225,37,57,62,161,17,205,12,61,4,171,37,139,8,197,46,180,23,239,35,110,17,251,34,93,6,49,40,246,11,97,64,35,20,106,60,154,27,110,53,239,9,153,20,229,8,106,65,69,24,15,65,80,13,80,79,35,13,0,73,193,7,92,55,67,50,50,59,87,61,121,17,252,3,145,6,118,3,215,16,205,16,248,34,73,14,5,23,123,4,127,45,172,5,14,62,179,8,230,17,244,25,17,27,181,4,76,24,31,3,127,48,81,13,96,62,37,15,147,77,61,8,217,37,93,8,150,57,126,34,144,56,39,10,25,7,214,4,91,30,45,3,135,74,58,17,178,21,16,8,103,14,28,11,27,68,208,8,57,65,134,17,71,63,12,21,92,31,203,10,77,13,71,8,18,68,101,21,130,53,226,10,167,77,160,10,138,35,40,15,252,70,225,18,184,67,175,47,252,19,228,3,71,19,220,3,160,38,9,12,126,23,251,20,9,62,131,6,213,32,159,4,239,58,62,9,65,77,90,27,187,46,26,6,111,28,104,4,219,65,252,5,146,61,5,21,116,57,17,8,137,78,107,8,6,67,53,32,247,69,174,24,91,21,224,5,4,16,14,10,13,68,154,26,41,22,72,11,252,64,54,13,15,35,39,7,191,78,129,18,94,76,126,28,2,26,221,10,208,44,249,12,197,75,190,19,190,73,114,18,55,64,69,9,206,79,34,17,89,44,158,103,73,45,252,11,50,11,30,6,244,19,46,4,142,37,51,19,75,19,208,13,117,29,110,3,237,80,83,3,26,27,43,17,159,65,53,30,153,39,251,3,117,38,196,3,134,60,115,15,99,60,102,13,175,73,214,3,152,78,195,3,236,65,87,50,254,55,104,16,199,25,196,4,6,36,46,3,46,66,14,20,29,22,34,19,112,21,6,7,34,79,122,15,109,66,34,24,9,70,41,23,149,36,92,13,50,29,179,7,81,76,57,20,59,74,190,11,70,64,204,14,198,62,63,9,216,33,183,10,229,36,246,102,104,42,7,5,227,13,241,3,230,21,38,14,253,75,136,21,165,48,29,3,154,80,143,3,67,60,250,11,141,66,35,40,195,73,73,10,73,15,244,4,63,76,43,13,132,70,110,20,91,75,142,6,52,76,100,12,152,70,2,42,241,64,189,26,62,12,250,8,117,42,133,9,220,60,1,27,53,49,53,13,108,43,225,12,122,65,120,9,165,73,59,26,19,67,159,38,199,49,45,10,233,34,68,12,89,74,84,30,171,71,40,15,251,79,98,14,146,76,52,13,244,50,173,75,30,41,84,90,1,0,3,0,0,0,1,0,2,0,4,0,82,120,26,113,81,106,240,99,241,93,78,88,2,83,7,78,89,73,242,68,51,115,174,103,80,93,251,83,149,75,6,68,56,61,25,55,150,49,161,44,205,76,21,46,166,27,151,16,244,9,249,5,149,3,38,2,74,1,198,0,249,79,26,80,59,80,92,80,125,80,164,80,197,80,236,80,13,81,52,81,85,81,124,81,157,81,196,81,236,81,19,82,58,82,97,82,137,82,176,82,215,82,255,82,38,83,84,83,123,83,169,83,208,83,254,83,38,84,84,84,129,84,175,84,221,84,11,85,57,85,103,85,149,85,201,85,247,85,43,86,89,86,142,86,194,86,247,86,43,87,95,87,148,87,200,87,3,88,56,88,115,88,174,88,233,88,36,89,95,89,154,89,219,89,22,90,88,90,153,90,212,90,28,91,94,91,159,91,231,91,48,92,113,92,192,92,8,93,80,93,159,93,237,93,60,94,138,94,224,94,46,95,131,95,217,95,52,96,138,96,229,96,72,97,163,97,6,98,104,98,209,98,51,99,156,99,11,100,123,100,234,100,96,101,214,101,76,102,201,102,76,103,207,103,82,104,220,104,108,105,252,105,147,106,48,107,205,107,113,108,27,109,204,109,125,110,59,111,249,111,197,112,150,113,111,114,84,115,64,116,50,117,50,118,63,119,88,120,225,122,255,127,255,127,255,127,255,127,255,127,255,127,255,127,225,122,88,120,63,119,50,118,50,117,64,116,84,115,111,114,150,113,197,112,249,111,59,111,125,110,204,109,27,109,113,108,205,107,48,107,147,106,252,105,108,105,220,104,82,104,207,103,76,103,201,102,76,102,214,101,96,101,234,100,123,100,11,100,156,99,51,99,209,98,104,98,6,98,163,97,72,97,229,96,138,96,52,96,217,95,131,95,46,95,224,94,138,94,60,94,237,93,159,93,80,93,8,93,192,92,113,92,48,92,231,91,159,91,94,91,28,91,212,90,153,90,88,90,22,90,219,89,154,89,95,89,36,89,233,88,174,88,115,88,56,88,3,88,200,87,148,87,95,87,43,87,247,86,194,86,142,86,89,86,43,86,247,85,201,85,149,85,103,85,57,85,11,85,221,84,175,84,129,84,84,84,38,84,254,83,208,83,169,83,123,83,84,83,38,83,255,82,215,82,176,82,137,82,97,82,58,82,19,82,236,81,196,81,157,81,124,81,85,81,52,81,13,81,236,80,197,80,164,80,125,80,92,80,59,80,26,80,249,79,210,79,177,79,145,79,112,79,13,0,14,0,16,0,18,0,20,0,21,0,27,0,32,0,6,0,7,0,6,0,6,0,0,0,0,0,0,0,1,0,13,0,14,0,16,0,18,0,19,0,21,0,26,0,31,0,6,0,6,0,6,0,6,0,0,0,0,0,0,0,1,0,79,115,156,110,74,97,126,77,72,54,9,31,195,10,153,251,125,242,48,239,127,240,173,244,231,249,176,254,22,2,202,3,255,3,55,3,4,2,220,0,0,0,125,255,62,255,41,255,0,0,216,127,107,127,182,126,187,125,123,124,248,122,53,121,53,119,250,116,137,114,128,46,128,67,0,120,0,101,128,94,64,113,64,95,192,28,64,76,192,57,84,0,1,0,254,255,2,0,5,0,10,0,5,0,9,0,20,0,84,0,1,0,254,255,2,0,5,0,10,0,5,0,9,0,20,0,84,0,1,0,254,255,2,0,3,0,6,0,5,0,9,0,20,0,84,0,1,0,254,255,2,0,3,0,6,0,5,0,9,0,20,0,84,0,1,0,254,255,2,0,3,0,6,0,5,0,9,0,20,0,84,0,1,0,254,255,2,0,3,0,6,0,10,0,19,0,20,0,84,0,1,0,254,255,2,0,3,0,6,0,5,0,9,0,20,0,94,0,0,0,253,255,3,0,3,0,6,0,5,0,9,0,18,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,17,0,19,0,19,0,19,0,19,0,23,0,39,0,57,0,5,0,8,0,8,0,7,0,8,0,7,0,2,0,8,0,4,0,7,0,2,0,4,0,7,0,2,0,8,0,4,0,7,0,2,0,8,0,8,0,7,0,8,0,7,0,2,0,6,0,4,0,7,0,2,0,6,0,4,0,7,0,2,0,6,0,4,0,7,0,2,0,6,0,8,0,9,0,9,0,8,0,9,0,2,0,6,0,4,0,9,0,2,0,6,0,8,0,9,0,2,0,6,0,4,0,9,0,2,0,6,0,8,0,9,0,9,0,8,0,11,0,3,0,7,0,4,0,11,0,3,0,7,0,8,0,11,0,3,0,7,0,4,0,11,0,3,0,7,0,8,0,9,0,9,0,8,0,13,0,4,0,7,0,5,0,13,0,4,0,7,0,8,0,13,0,4,0,7,0,5,0,13,0,4,0,7,0,9,0,9,0,9,0,8,0,13,0,4,0,4,0,5,0,6,0,13,0,4,0,4,0,5,0,8,0,13,0,4,0,4,0,5,0,6,0,13,0,4,0,4,0,5,0,8,0,9,0,9,0,8,0,1,0,1,0,1,0,1,0,10,0,10,0,7,0,7,0,5,0,1,0,1,0,1,0,1,0,10,0,10,0,7,0,7,0,8,0,1,0,1,0,1,0,1,0,10,0,10,0,7,0,7,0,5,0,1,0,1,0,1,0,1,0,10,0,10,0,7,0,7,0,7,0,8,0,9,0,8,0,6,0,9,0,4,0,4,0,4,0,4,0,4,0,4,0,3,0,3,0,3,0,3,0,3,0,5,0,6,0,4,0,4,0,4,0,4,0,4,0,4,0,3,0,3,0,3,0,3,0,3,0,5,0,9,0,4,0,4,0,4,0,4,0,4,0,4,0,3,0,3,0,3,0,3,0,3,0,5,0,6,0,4,0,4,0,4,0,4,0,4,0,4,0,3,0,3,0,3,0,3,0,3,0,5,0,3,0,8,0,9,0,9,0,6,0,95,0,103,0,118,0,134,0,148,0,159,0,204,0,244,0,39,0,43,0,38,0,37,0,0,0,0,0,0,0,0,0,0,0,1,0,2,0,3,0,4,0,5,0,6,0,7,0,8,0,9,0,10,0,11,0,12,0,13,0,14,0,15,0,23,0,24,0,25,0,26,0,27,0,28,0,48,0,49,0,61,0,62,0,82,0,83,0,47,0,46,0,45,0,44,0,81,0,80,0,79,0,78,0,17,0,18,0,20,0,22,0,77,0,76,0,75,0,74,0,29,0,30,0,43,0,42,0,41,0,40,0,38,0,39,0,16,0,19,0,21,0,50,0,51,0,59,0,60,0,63,0,64,0,72,0,73,0,84,0,85,0,93,0,94,0,32,0,33,0,35,0,36,0,53,0,54,0,56,0,57,0,66,0,67,0,69,0,70,0,87,0,88,0,90,0,91,0,34,0,55,0,68,0,89,0,37,0,58,0,71,0,92,0,31,0,52,0,65,0,86,0,7,0,6,0,5,0,4,0,3,0,2,0,1,0,0,0,15,0,14,0,13,0,12,0,11,0,10,0,9,0,8,0,23,0,24,0,25,0,26,0,27,0,46,0,65,0,84,0,45,0,44,0,43,0,64,0,63,0,62,0,83,0,82,0,81,0,102,0,101,0,100,0,42,0,61,0,80,0,99,0,28,0,47,0,66,0,85,0,18,0,41,0,60,0,79,0,98,0,29,0,48,0,67,0,17,0,20,0,22,0,40,0,59,0,78,0,97,0,21,0,30,0,49,0,68,0,86,0,19,0,16,0,87,0,39,0,38,0,58,0,57,0,77,0,35,0,54,0,73,0,92,0,76,0,96,0,95,0,36,0,55,0,74,0,93,0,32,0,51,0,33,0,52,0,70,0,71,0,89,0,90,0,31,0,50,0,69,0,88,0,37,0,56,0,75,0,94,0,34,0,53,0,72,0,91,0,0,0,1,0,4,0,5,0,3,0,6,0,7,0,2,0,13,0,15,0,8,0,9,0,11,0,12,0,14,0,10,0,16,0,28,0,74,0,29,0,75,0,27,0,73,0,26,0,72,0,30,0,76,0,51,0,97,0,50,0,71,0,96,0,117,0,31,0,77,0,52,0,98,0,49,0,70,0,95,0,116,0,53,0,99,0,32,0,78,0,33,0,79,0,48,0,69,0,94,0,115,0,47,0,68,0,93,0,114,0,46,0,67,0,92,0,113,0,19,0,21,0,23,0,22,0,18,0,17,0,20,0,24,0,111,0,43,0,89,0,110,0,64,0,65,0,44,0,90,0,25,0,45,0,66,0,91,0,112,0,54,0,100,0,40,0,61,0,86,0,107,0,39,0,60,0,85,0,106,0,36,0,57,0,82,0,103,0,35,0,56,0,81,0,102,0,34,0,55,0,80,0,101,0,42,0,63,0,88,0,109,0,41,0,62,0,87,0,108,0,38,0,59,0,84,0,105,0,37,0,58,0,83,0,104,0,0,0,1,0,4,0,3,0,5,0,6,0,13,0,7,0,2,0,8,0,9,0,11,0,15,0,12,0,14,0,10,0,28,0,82,0,29,0,83,0,27,0,81,0,26,0,80,0,30,0,84,0,16,0,55,0,109,0,56,0,110,0,31,0,85,0,57,0,111,0,48,0,73,0,102,0,127,0,32,0,86,0,51,0,76,0,105,0,130,0,52,0,77,0,106,0,131,0,58,0,112,0,33,0,87,0,19,0,23,0,53,0,78,0,107,0,132,0,21,0,22,0,18,0,17,0,20,0,24,0,25,0,50,0,75,0,104,0,129,0,47,0,72,0,101,0,126,0,54,0,79,0,108,0,133,0,46,0,71,0,100,0,125,0,128,0,103,0,74,0,49,0,45,0,70,0,99,0,124,0,42,0,67,0,96,0,121,0,39,0,64,0,93,0,118,0,38,0,63,0,92,0,117,0,35,0,60,0,89,0,114,0,34,0,59,0,88,0,113,0,44,0,69,0,98,0,123,0,43,0,68,0,97,0,122,0,41,0,66,0,95,0,120,0,40,0,65,0,94,0,119,0,37,0,62,0,91,0,116,0,36,0,61,0,90,0,115,0,0,0,1,0,2,0,3,0,4,0,5,0,6,0,7,0,8,0,9,0,10,0,11,0,12,0,13,0,14,0,15,0,16,0,26,0,87,0,27,0,88,0,28,0,89,0,29,0,90,0,30,0,91,0,51,0,80,0,112,0,141,0,52,0,81,0,113,0,142,0,54,0,83,0,115,0,144,0,55,0,84,0,116,0,145,0,58,0,119,0,59,0,120,0,21,0,22,0,23,0,17,0,18,0,19,0,31,0,60,0,92,0,121,0,56,0,85,0,117,0,146,0,20,0,24,0,25,0,50,0,79,0,111,0,140,0,57,0,86,0,118,0,147,0,49,0,78,0,110,0,139,0,48,0,77,0,53,0,82,0,114,0,143,0,109,0,138,0,47,0,76,0,108,0,137,0,32,0,33,0,61,0,62,0,93,0,94,0,122,0,123,0,41,0,42,0,43,0,44,0,45,0,46,0,70,0,71,0,72,0,73,0,74,0,75,0,102,0,103,0,104,0,105,0,106,0,107,0,131,0,132,0,133,0,134,0,135,0,136,0,34,0,63,0,95,0,124,0,35,0,64,0,96,0,125,0,36,0,65,0,97,0,126,0,37,0,66,0,98,0,127,0,38,0,67,0,99,0,128,0,39,0,68,0,100,0,129,0,40,0,69,0,101,0,130,0,8,0,7,0,6,0,5,0,4,0,3,0,2,0,14,0,16,0,9,0,10,0,12,0,13,0,15,0,11,0,17,0,20,0,22,0,24,0,23,0,19,0,18,0,21,0,56,0,88,0,122,0,154,0,57,0,89,0,123,0,155,0,58,0,90,0,124,0,156,0,52,0,84,0,118,0,150,0,53,0,85,0,119,0,151,0,27,0,93,0,28,0,94,0,29,0,95,0,30,0,96,0,31,0,97,0,61,0,127,0,62,0,128,0,63,0,129,0,59,0,91,0,125,0,157,0,32,0,98,0,64,0,130,0,1,0,0,0,25,0,26,0,33,0,99,0,34,0,100,0,65,0,131,0,66,0,132,0,54,0,86,0,120,0,152,0,60,0,92,0,126,0,158,0,55,0,87,0,121,0,153,0,117,0,116,0,115,0,46,0,78,0,112,0,144,0,43,0,75,0,109,0,141,0,40,0,72,0,106,0,138,0,36,0,68,0,102,0,134,0,114,0,149,0,148,0,147,0,146,0,83,0,82,0,81,0,80,0,51,0,50,0,49,0,48,0,47,0,45,0,44,0,42,0,39,0,35,0,79,0,77,0,76,0,74,0,71,0,67,0,113,0,111,0,110,0,108,0,105,0,101,0,145,0,143,0,142,0,140,0,137,0,133,0,41,0,73,0,107,0,139,0,37,0,69,0,103,0,135,0,38,0,70,0,104,0,136,0,7,0,6,0,5,0,4,0,3,0,2,0,1,0,0,0,16,0,15,0,14,0,13,0,12,0,11,0,10,0,9,0,8,0,26,0,27,0,28,0,29,0,30,0,31,0,115,0,116,0,117,0,118,0,119,0,120,0,72,0,73,0,161,0,162,0,65,0,68,0,69,0,108,0,111,0,112,0,154,0,157,0,158,0,197,0,200,0,201,0,32,0,33,0,121,0,122,0,74,0,75,0,163,0,164,0,66,0,109,0,155,0,198,0,19,0,23,0,21,0,22,0,18,0,17,0,20,0,24,0,25,0,37,0,36,0,35,0,34,0,80,0,79,0,78,0,77,0,126,0,125,0,124,0,123,0,169,0,168,0,167,0,166,0,70,0,67,0,71,0,113,0,110,0,114,0,159,0,156,0,160,0,202,0,199,0,203,0,76,0,165,0,81,0,82,0,92,0,91,0,93,0,83,0,95,0,85,0,84,0,94,0,101,0,102,0,96,0,104,0,86,0,103,0,87,0,97,0,127,0,128,0,138,0,137,0,139,0,129,0,141,0,131,0,130,0,140,0,147,0,148,0,142,0,150,0,132,0,149,0,133,0,143,0,170,0,171,0,181,0,180,0,182,0,172,0,184,0,174,0,173,0,183,0,190,0,191,0,185,0,193,0,175,0,192,0,176,0,186,0,38,0,39,0,49,0,48,0,50,0,40,0,52,0,42,0,41,0,51,0,58,0,59,0,53,0,61,0,43,0,60,0,44,0,54,0,194,0,179,0,189,0,196,0,177,0,195,0,178,0,187,0,188,0,151,0,136,0,146,0,153,0,134,0,152,0,135,0,144,0,145,0,105,0,90,0,100,0,107,0,88,0,106,0,89,0,98,0,99,0,62,0,47,0,57,0,64,0,45,0,63,0,46,0,55,0,56,0,0,0,1,0,2,0,3,0,4,0,5,0,6,0,7,0,8,0,9,0,10,0,11,0,12,0,13,0,14,0,23,0,15,0,16,0,17,0,18,0,19,0,20,0,21,0,22,0,24,0,25,0,26,0,27,0,28,0,38,0,141,0,39,0,142,0,40,0,143,0,41,0,144,0,42,0,145,0,43,0,146,0,44,0,147,0,45,0,148,0,46,0,149,0,47,0,97,0,150,0,200,0,48,0,98,0,151,0,201,0,49,0,99,0,152,0,202,0,86,0,136,0,189,0,239,0,87,0,137,0,190,0,240,0,88,0,138,0,191,0,241,0,91,0,194,0,92,0,195,0,93,0,196,0,94,0,197,0,95,0,198,0,29,0,30,0,31,0,32,0,33,0,34,0,35,0,50,0,100,0,153,0,203,0,89,0,139,0,192,0,242,0,51,0,101,0,154,0,204,0,55,0,105,0,158,0,208,0,90,0,140,0,193,0,243,0,59,0,109,0,162,0,212,0,63,0,113,0,166,0,216,0,67,0,117,0,170,0,220,0,36,0,37,0,54,0,53,0,52,0,58,0,57,0,56,0,62,0,61,0,60,0,66,0,65,0,64,0,70,0,69,0,68,0,104,0,103,0,102,0,108,0,107,0,106,0,112,0,111,0,110,0,116,0,115,0,114,0,120,0,119,0,118,0,157,0,156,0,155,0,161,0,160,0,159,0,165,0,164,0,163,0,169,0,168,0,167,0,173,0,172,0,171,0,207,0,206,0,205,0,211,0,210,0,209,0,215,0,214,0,213,0,219,0,218,0,217,0,223,0,222,0,221,0,73,0,72,0,71,0,76,0,75,0,74,0,79,0,78,0,77,0,82,0,81,0,80,0,85,0,84,0,83,0,123,0,122,0,121,0,126,0,125,0,124,0,129,0,128,0,127,0,132,0,131,0,130,0,135,0,134,0,133,0,176,0,175,0,174,0,179,0,178,0,177,0,182,0,181,0,180,0,185,0,184,0,183,0,188,0,187,0,186,0,226,0,225,0,224,0,229,0,228,0,227,0,232,0,231,0,230,0,235,0,234,0,233,0,238,0,237,0,236,0,96,0,199,0,0,0,2,0,0,0,3,0,0,0,2,0,0,0,3,0,1,0,3,0,2,0,4,0,1,0,4,0,1,0,4,0,0,0,205,12,156,25,0,32,102,38,205,44,0,48,51,51,102,54,154,57,205,60,0,64,51,67,102,70,154,73,205,76,159,0,64,241,53,167,206,0,190,242,52,176,12,1,67,244,88,185,93,1,201,245,133,194,163,1,215,246,223,200,226,1,166,247,189,205,42,2,116,248,147,210,125,2,66,249,109,215,221,2,18,250,77,220,74,3,222,250,30,225,201,3,174,251,0,230,90,4,124,252,216,234,1,5,74,253,179,239,193,5,25,254,141,244,158,6,231,254,104,249,156,7,181,255,67,254,193,8,133,0,33,3,17,10,83,1,252,7,147,11,33,2,213,12,80,13,240,2,178,17,79,15,190,3,140,22,155,17,141,4,104,27,63,20,91,5,67,32,72,23,41,6,29,37,199,26,248,6,249,41,203,30,199,7,212,46,105,35,149,8,175,51,185,40,100,9,138,56,222,48,113,10,224,62,135,63,244,11,253,71,150,82,120,13,27,81,93,107,252,14,57,90,93,107,252,14,57,90,0,0,1,0,3,0,2,0,6,0,4,0,5,0,7,0,0,0,1,0,3,0,2,0,5,0,6,0,4,0,7,0,248,127,211,127,76,127,108,126,51,125,163,123,188,121,127,119,239,116,12,114,217,110,89,107,141,103,121,99,31,95,130,90,166,85,141,80,60,75,182,69,0,64,28,58,15,52,223,45,141,39,32,33,156,26,6,20,97,13,178,6,0,0,78,249,159,242,250,235,100,229,224,222,115,216,33,210,241,203,228,197,0,192,74,186,196,180,115,175,90,170,126,165,225,160,135,156,115,152,167,148,39,145,244,141,17,139,129,136,68,134,93,132,205,130,148,129,180,128,45,128,8,128,255,127,46,124,174,120,118,117,125,114,186,111,41,109,194,106,131,104,102,102,105,100,137,98,194,96,19,95,122,93,245,91,130,90,33,89,207,87,139,86,85,85,44,84,15,83,252,81,244,80,246,79,1,79,20,78,48,77,83,76,126,75,175,74,231,73,37,73,104,72,178,71,0,71,84,70,173,69,10,69,107,68,209,67,59,67,168,66,25,66,142,65,6,65,130,64,0,64,0,0,175,5,50,11,140,16,192,21,207,26,188,31,136,36,53,41,196,45,55,50,143,54,206,58,245,62,4,67,252,70,223,74,174,78,105,82,17,86,167,89,44,93,159,96,3,100,87,103,155,106,209,109,250,112,20,116,33,119,34,122,23,125,255,127,255,127,217,127,98,127,157,126,138,125,42,124,125,122,133,120,66,118,182,115,227,112,202,109,110,106,208,102,242,98,215,94,130,90,246,85,52,81,64,76,29,71,206,65,87,60,186,54,252,48,31,43,40,37,26,31,249,24,200,18,140,12,72,6,0,0,184,249,116,243,56,237,7,231,230,224,216,218,225,212,4,207,70,201,169,195,50,190,227,184,192,179,204,174,10,170,126,165,41,161,14,157,48,153,146,149,54,146,29,143,74,140,190,137,123,135,131,133,214,131,118,130,99,129,158,128,39,128,0,128,249,150,148,221,53,235,27,241,93,244,116,246,223,247,237,248,184,249,86,250,214,250,61,251,148,251,221,251,26,252,78,252,123,252,163,252,197,252,227,252,252,252,18,253,38,253,55,253,69,253,81,253,91,253,100,253,106,253,111,253,114,253,116,253,116,253,114,253,111,253,106,253,100,253,91,253,81,253,69,253,55,253,38,253,18,253,252,252,227,252,197,252,163,252,123,252,78,252,26,252,221,251,148,251,61,251,214,250,86,250,184,249,237,248,223,247,116,246,93,244,27,241,53,235,148,221,249,150,48,117,144,101,8,82,152,58,64,31,0,0,192,224,104,197,248,173,112,154,153,104,33,3,201,9,85,253,154,250,70,2,92,2,6,251,183,13,250,232,182,17,13,254,108,248,195,11,62,236,238,21,58,248,219,251,77,250,90,17,68,253,41,235,1,18,196,1,179,253,232,242,137,11,243,4,68,251,226,245,195,6,86,14,133,238,49,252,39,17,23,246,181,3,173,250,45,252,102,22,66,118,247,14,60,240,156,11,232,251,22,252,173,9,29,244,255,10,73,247,217,6,181,249,178,6,17,249,7,6,16,252,173,1,87,255,216,1,16,251,128,8,110,245,219,9,171,249,88,1,58,3,7,250,188,6,135,249,165,6,241,247,84,10,12,244,81,11,70,248,45,2,12,3,167,250,74,3,143,2,98,57,254,44,244,4,55,245,217,233,90,29,221,255,9,245,32,244,215,18,136,11,24,223,201,14,175,5,131,8,67,222,115,31,201,247,82,250,9,3,84,4,175,246,206,8,149,254,94,253,201,247,158,23,207,233,48,4,51,12,62,236,192,20,231,246,112,241,12,27,207,240,163,2,17,249,29,0,161,39,66,118,247,14,60,240,156,11,232,251,22,252,173,9,29,244,255,10,73,247,217,6,181,249,178,6,17,249,7,6,16,252,173,1,87,255,216,1,16,251,128,8,110,245,219,9,171,249,88,1,58,3,7,250,188,6,135,249,165,6,241,247,84,10,12,244,81,11,70,248,45,2,12,3,167,250,74,3,143,2,0,64,103,65,213,66,76,68,203,69,82,71,226,72,122,74,28,76,199,77,123,79,56,81,255,82,209,84,172,86,146,88,130,90,126,92,132,94,150,96,180,98,221,100,18,103,84,105,162,107,254,109,102,112,221,114,96,117,242,119,147,122,66,125,255,127,3,115,186,110,119,98,225,79,109,57,245,33,71,12,184,250,206,238,23,233,38,233,191,237,33,245,96,253,187,4,232,9,58,12,175,11,211,8,146,4,0,0,23,252,140,249,180,248,126,249,133,251,48,254,218,0,244,2,36,4,75,4,136,3,38,2,135,0,11,255,254,253,134,253,166,253,61,254,25,255,0,0,191,0,52,1,84,1,40,1,198,0,78,0,220,255,136,255,93,255,91,255,124,255,177,255,237,255,34,0,73,0,91,0,89,0,70,0,38,0,0,0,254,254,194,254,73,254,134,253,112,253,251,252,57,253,10,254,244,254,63,255,254,255,125,0,122,0,217,255,247,255,105,0,129,0,27,1,116,1,63,2,235,254,188,254,59,255,25,254,67,254,150,254,220,254,229,255,177,0,31,2,86,1,5,2,4,2,130,0,27,0,152,255,136,255,116,255,182,255,200,255,204,253,81,252,16,250,59,252,210,252,242,253,190,254,254,255,159,0,145,2,200,254,228,254,126,254,171,253,19,254,242,253,94,254,27,255,105,0,193,1,211,253,154,252,205,251,105,252,74,252,16,253,59,253,196,254,62,0,230,1,198,254,65,255,53,255,182,254,96,255,153,255,205,255,131,0,82,1,3,2,10,6,224,8,194,14,112,21,60,27,190,32,63,39,221,43,222,49,146,53,84,37,17,42,27,49,236,51,45,56,131,45,92,41,39,38,145,33,84,25,6,0,82,0,125,255,154,0,200,255,33,253,183,0,191,255,247,254,9,0,46,255,151,254,113,0,206,2,25,7,242,3,190,4,37,6,89,3,53,5,228,8,59,3,32,6,141,7,205,2,197,7,158,8,70,3,148,4,31,7,209,2,232,3,106,8,30,1,220,1,229,5,9,255,237,253,230,0,147,0,174,255,57,2,26,0,79,255,80,252,229,255,239,254,180,2,92,255,248,254,73,255,224,0,22,3,15,4,131,3,178,3,89,2,229,1,3,3,126,4,12,2,165,2,135,3,116,255,119,1,10,3,154,1,164,2,173,1,45,1,18,2,241,3,207,2,134,2,38,0,226,0,111,1,40,0,145,0,211,255,7,254,34,1,121,0,135,255,46,1,127,0,166,0,132,255,129,254,68,252,154,254,57,254,47,252,203,2,110,3,126,3,210,3,155,3,211,0,221,1,16,1,64,0,188,0,178,255,17,0,113,255,191,255,38,0,131,2,74,2,109,2,122,255,86,254,117,253,91,1,33,2,4,11,164,4,166,10,138,9,142,0,176,255,199,6,27,1,130,0,205,1,250,254,113,254,135,251,101,254,155,0,174,1,73,1,119,1,11,3,53,0,30,255,117,255,127,255,20,255,146,6,29,1,232,2,47,5,226,2,185,2,128,6,56,1,153,1,10,1,69,1,208,2,135,0,1,0,221,0,197,1,8,0,203,0,145,0,43,1,128,2,248,2,29,0,212,1,126,2,103,0,173,1,123,1,164,1,186,3,164,3,46,5,186,4,234,4,192,2,244,3,128,4,90,255,68,254,246,254,196,254,126,255,136,254,191,0,127,4,112,7,16,255,225,253,20,251,144,255,12,1,183,4,70,0,38,4,47,6,22,1,80,5,38,6,254,254,240,254,0,253,19,0,51,2,192,8,253,255,247,254,135,0,217,254,177,253,124,254,140,0,98,1,50,255,252,254,8,254,229,252,79,254,50,253,217,250,109,0,75,1,194,3,83,254,169,255,140,2,216,254,170,1,251,3,17,255,7,3,83,3,233,1,54,5,49,4,178,254,180,254,25,0,31,2,182,4,15,7,70,1,61,0,215,2,66,2,81,3,125,5,48,255,235,254,73,1,104,255,64,0,157,2,78,254,90,253,41,253,58,254,185,255,251,0,93,2,224,1,254,0,30,254,11,0,228,3,223,254,139,1,230,1,210,2,25,4,160,5,226,255,196,254,238,252,150,255,141,255,149,253,93,3,194,5,132,5,31,4,86,5,160,4,44,3,213,4,157,3,42,0,5,255,192,253,86,1,141,0,58,254,88,255,176,255,79,5,170,254,112,253,29,249,100,0,53,3,213,2,222,3,235,2,32,3,76,1,184,1,56,2,151,2,123,1,84,3,112,0,165,0,143,254,85,2,142,3,26,1,248,255,66,3,1,5,160,254,60,2,183,2,206,1,198,8,14,7,89,1,190,0,94,5,160,1,147,3,118,8,168,0,174,255,24,1,252,253,66,254,72,3,47,0,21,2,44,0,150,254,57,253,137,251,22,0,193,0,192,5,171,255,233,0,21,7,194,255,67,2,224,5,38,2,176,3,213,6,211,2,138,2,124,4,204,3,116,3,115,5,87,254,131,2,0,0,232,3,184,3,74,4,249,0,166,5,160,2,178,254,169,255,124,8,214,253,90,7,112,10,140,0,34,7,61,7,152,3,213,6,30,10,52,4,141,7,246,7,119,255,69,254,237,249,245,4,150,4,212,1,19,254,134,255,241,5,61,254,9,4,190,4,226,1,159,6,94,4,47,3,137,2,128,1,66,254,76,253,107,0,193,254,163,253,138,255,49,255,7,254,13,2,44,254,244,255,176,10,75,0,142,7,25,5,112,3,54,9,219,8,5,5,39,6,212,7,208,255,208,254,94,251,77,254,51,254,5,255,146,254,108,254,221,253,223,254,163,253,171,253,230,253,214,252,91,255,136,255,3,0,100,1,127,2,217,4,222,5,96,0,177,0,238,2,77,254,183,253,106,251,156,254,109,0,177,255,27,254,32,1,213,7,9,0,92,4,219,2,112,3,86,8,178,3,247,254,49,6,41,4,133,4,186,4,75,3,14,254,100,253,175,1,118,1,65,1,27,255,160,5,53,8,101,5,193,1,205,1,131,4,151,255,39,0,128,254,249,254,111,1,182,0,141,254,108,253,5,3,68,255,127,4,203,3,53,5,96,6,155,5,6,3,243,4,197,4,30,254,192,252,47,250,19,255,46,255,92,3,122,3,79,6,40,4,216,1,38,4,168,4,185,0,53,4,221,3,200,253,32,252,88,249,63,254,122,252,5,248,114,255,135,254,54,254,46,255,214,253,251,251,245,255,109,4,217,8,183,254,93,253,131,252,6,255,145,2,163,4,7,2,230,5,243,6,8,2,27,2,123,5,15,2,141,5,22,5,205,253,153,252,32,251,109,255,49,254,111,3,180,255,30,9,24,11,51,2,13,10,81,9,120,2,134,7,104,11,207,2,231,7,48,7,223,253,45,253,84,4,129,0,131,255,116,3,137,5,96,6,157,3,162,255,30,6,215,6,171,254,253,5,15,6,79,2,139,1,238,254,180,255,213,3,15,11,153,0,169,11,52,7,8,4,5,10,189,10,228,5,16,11,87,7,23,3,175,4,26,2,66,255,59,254,209,5,234,254,220,253,134,4,11,255,149,7,252,7,0,4,24,6,114,6,0,2,253,0,210,1,194,255,189,254,127,4,39,254,136,254,251,1,79,254,100,5,114,8,131,3,151,7,165,5,134,0,192,2,184,1,204,1,13,2,228,255,62,254,23,1,58,5,0,0,203,3,252,0,67,254,141,253,33,252,164,254,166,253,112,250,142,1,200,2,120,6,149,255,58,1,78,255,93,0,178,8,190,8,6,2,81,3,144,2,50,254,57,253,65,254,174,0,222,255,167,4,137,255,42,0,237,3,140,254,18,1,246,2,12,4,48,9,46,7,163,2,188,6,218,5,174,1,6,5,85,8,127,255,73,254,0,0,139,254,32,3,96,8,6,0,51,6,174,9,222,1,84,2,80,8,84,254,32,253,225,5,129,1,178,0,212,3,139,0,193,1,201,4,242,253,182,252,42,252,145,0,18,6,218,4,111,2,168,5,144,2,93,1,248,3,202,5,31,0,232,254,159,1,196,254,212,2,105,6,104,1,34,4,44,2,76,254,154,254,177,4,157,254,99,4,147,7,145,1,48,6,200,8,241,253,12,252,99,1,233,0,238,0,185,8,218,253,127,252,129,253,147,254,11,254,165,7,133,1,68,7,85,6,162,0,108,4,240,4,19,255,150,4,110,5,128,253,101,254,116,0,28,255,158,6,250,8,103,6,138,8,219,8,50,2,249,4,98,10,67,1,82,1,238,6,66,2,83,4,84,3,22,0,82,2,166,3,113,255,206,2,190,1,50,0,71,0,247,255,174,254,70,253,129,250,102,0,118,255,204,252,202,254,43,254,133,251,158,1,67,0,245,254,36,4,46,3,161,5,12,6,80,5,248,4,218,6,103,7,125,6,227,7,85,8,28,7,16,7,14,9,53,7,132,2,163,255,198,1,90,3,73,1,120,255,233,1,254,254,128,255,58,255,23,253,215,255,204,255,247,254,39,252,90,1,137,0,223,1,51,249,20,253,84,253,117,251,67,249,145,254,129,252,135,251,240,252,24,254,78,252,56,252,171,255,122,254,43,253,215,0,172,254,85,255,252,3,148,3,177,7,52,2,179,0,234,2,150,2,209,3,198,6,119,3,110,2,146,3,171,3,88,3,141,4,53,1,176,2,35,3,149,3,161,0,58,2,118,0,236,255,229,254,208,252,214,255,204,0,52,251,187,254,50,254,61,252,54,255,113,255,36,252,28,254,151,254,66,253,46,252,35,254,210,254,234,252,92,251,156,255,238,252,192,251,226,251,77,252,108,249,54,255,181,252,242,252,241,251,158,250,123,252,144,253,146,255,171,255,100,1,213,0,246,255,19,254,108,1,6,3,169,1,54,3,223,1,173,255,45,2,8,2,32,252,232,249,196,253,165,253,27,253,230,255,10,254,130,253,121,252,209,0,50,1,147,0,196,254,175,253,172,253,171,255,45,255,31,255,106,252,239,253,117,0,233,0,73,254,30,253,77,4,239,2,121,2,177,5,180,6,231,5,229,6,177,5,142,3,98,4,132,4,81,3,74,5,100,3,214,1,153,252,130,251,252,248,153,252,163,252,32,252,138,255,155,0,212,0,229,251,175,252,162,253,163,251,199,248,66,245,5,252,109,250,179,248,114,1,72,255,98,254,191,3,237,1,104,0,190,3,15,4,31,2,154,0,141,2,201,0,225,4,251,1,150,0,151,2,247,1,230,0,111,2,9,3,163,2,147,2,88,0,146,255,75,3,244,0,224,0,126,1,29,2,46,1,212,2,177,1,154,2,142,4,222,2,85,1,118,255,20,0,115,254,97,251,88,254,210,255,191,254,160,254,132,255,53,5,253,3,56,4,6,1,110,1,211,2,154,3,27,1,217,253,31,0,132,253,157,253,79,253,71,253,97,254,72,252,245,252,55,255,207,250,170,253,153,254,71,252,251,250,166,0,237,1,49,1,221,0,78,3,191,2],"i8",ALLOC_NONE,Runtime.GLOBAL_BASE);allocate([98,2,72,3,168,3,6,3,45,253,212,250,19,251,155,254,255,251,148,250,184,251,160,250,147,254,120,250,167,248,160,253,250,248,65,249,94,253,223,253,107,251,65,253,166,2,18,3,148,0,133,255,184,2,8,5,132,2,94,1,246,255,158,1,102,2,15,0,137,0,88,1,45,255,210,252,24,250,205,252,121,254,94,252,180,253,47,0,177,253,126,252,115,252,183,251,93,255,8,251,113,251,99,255,72,250,11,250,123,254,6,251,92,251,144,253,159,2,213,0,198,1,124,0,238,254,243,253,39,253,16,254,104,255,192,250,122,0,135,0,167,244,179,253,118,254,64,249,185,1,206,255,196,5,136,3,19,3,60,1,236,0,72,254,165,254,217,0,157,1,113,252,107,252,121,0,57,254,92,252,202,0,164,255,47,254,137,254,232,1,134,1,218,1,108,3,217,2,60,1,233,248,224,250,99,253,87,0,194,3,176,1,51,2,7,255,222,251,250,0,29,1,81,4,117,4,171,1,184,2,242,251,128,249,210,249,76,252,90,1,160,0,203,254,240,254,166,252,158,2,112,2,226,4,80,252,104,254,102,253,162,253,192,254,128,254,20,254,230,0,65,0,78,1,206,255,240,255,240,255,78,253,139,250,255,6,180,6,119,5,174,9,15,8,124,5,221,4,191,5,146,5,130,254,243,251,254,255,173,0,114,254,121,4,211,5,232,7,9,7,4,3,250,4,226,5,149,5,199,6,209,7,55,4,194,4,249,4,126,251,197,248,207,250,216,252,147,251,184,251,61,254,247,251,70,249,65,0,66,2,172,255,60,250,126,246,14,249,3,253,170,250,18,254,38,255,174,253,93,252,81,1,20,255,50,2,53,9,102,10,146,7,209,5,252,4,106,3,189,0,102,1,118,1,17,250,23,247,214,246,57,252,9,251,209,247,140,253,92,251,250,249,125,6,19,4,34,2,53,2,37,4,220,2,192,255,188,252,78,254,76,254,160,255,203,0,54,4,192,4,100,6,139,3,254,5,218,3,70,1,197,3,77,3,142,0,172,255,197,0,214,1,75,9,34,6,109,4,214,1,190,4,139,1,96,5,176,4,101,4,18,4,92,1,225,253,46,251,136,254,41,255,75,255,225,1,101,248,171,249,46,255,18,253,95,251,134,1,29,0,113,254,27,0,52,3,212,4,243,2,183,2,211,3,153,1,82,255,173,4,11,4,144,3,76,5,54,7,32,252,99,250,228,1,51,250,92,249,208,0,100,254,180,4,152,5,241,254,128,3,120,4,96,254,241,6,154,5,96,249,172,245,52,255,3,249,241,249,9,4,136,249,233,249,23,5,27,251,203,249,57,4,99,253,185,251,190,255,86,253,64,1,167,254,147,2,49,1,45,4,244,250,220,252,237,255,157,249,245,250,29,0,109,249,15,254,71,0,225,254,249,255,156,255,18,254,62,252,19,255,84,3,89,7,204,6,63,251,149,250,227,0,108,253,46,1,117,1,96,0,63,4,233,4,206,251,123,249,160,0,229,1,28,8,6,7,90,252,36,255,40,2,172,253,156,253,237,0,80,1,184,6,111,3,131,2,117,2,178,1,243,4,10,2,97,6,15,0,244,0,71,254,195,5,205,2,184,0,27,7,54,6,173,6,220,3,5,1,169,3,45,8,41,9,240,5,91,8,66,7,70,6,191,253,189,253,77,251,68,252,135,0,24,254,48,254,51,0,174,254,139,253,164,254,45,253,122,4,25,8,162,5,144,8,186,5,143,3,92,250,220,249,26,247,120,5,198,2,17,5,55,5,121,2,160,3,154,5,146,8,34,10,118,9,156,8,89,7,214,3,194,8,62,7,124,1,24,3,121,4,193,255,229,253,158,1,4,255,60,252,198,254,19,251,85,253,244,252,193,252,242,253,19,252,126,249,145,251,88,254,181,249,60,254,213,254,244,4,24,4,130,2,123,4,85,3,88,3,93,253,176,254,139,0,220,8,63,5,138,5,29,0,0,3,29,3,56,251,167,1,52,2,218,250,198,251,245,0,234,250,212,252,61,2,238,250,175,249,134,2,56,252,66,3,211,2,225,3,116,6,235,7,65,255,207,252,176,1,150,2,60,0,198,0,114,2,229,3,50,5,112,6,171,7,9,5,195,249,163,255,211,255,192,251,37,0,172,255,117,6,47,10,33,9,41,4,248,7,73,9,115,4,22,9,70,8,91,3,101,1,230,5,152,2,203,4,75,4,223,1,80,5,144,3,105,7,218,6,227,7,144,4,117,7,248,6,143,1,34,0,0,1,175,253,208,254,227,251,35,2,158,6,127,5,135,2,157,255,171,254,212,5,111,6,166,4,38,0,124,253,44,255,139,1,78,3,222,0,64,253,3,253,52,253,44,253,84,248,12,245,106,255,35,1,174,255,209,4,179,5,239,3,116,255,101,255,153,0,183,1,41,1,32,6,7,250,102,254,132,253,0,6,199,1,19,255,208,250,117,255,252,254,19,2,42,2,100,3,13,1,240,4,94,2,23,255,115,3,207,1,230,2,88,2,136,255,183,255,165,1,212,0,73,254,198,255,36,3,250,250,39,251,216,2,38,1,22,254,50,0,177,253,119,252,26,251,42,0,81,253,147,0,231,255,17,1,84,2,201,254,189,4,89,2,14,253,81,3,72,2,173,1,95,2,75,2,166,253,90,255,205,1,228,252,201,252,9,3,100,5,142,3,219,6,119,0,137,5,204,3,37,255,144,252,196,249,231,251,14,252,182,1,55,253,157,250,78,0,0,0,65,254,101,251,144,251,217,250,219,249,200,8,231,6,29,5,178,3,47,6,152,5,126,4,226,1,180,1,43,254,172,251,106,2,65,254,58,252,64,4,28,251,21,250,142,255,176,251,40,248,189,253,210,0,101,2,241,1,73,248,99,250,130,2,11,251,168,252,243,3,146,249,95,251,39,4,237,249,96,253,180,4,100,249,166,251,111,2,45,252,210,250,3,251,27,2,109,255,126,3,182,250,127,252,78,254,120,3,219,1,172,1,153,0,128,254,82,1,44,250,1,254,103,1,50,252,165,251,42,254,105,0,218,253,165,2,87,252,135,251,109,3,124,1,252,254,210,0,149,6,156,3,232,4,239,6,166,4,71,4,139,5,119,2,21,2,115,2,43,1,165,254,101,254,234,253,135,2,118,253,29,0,173,253,134,254,169,250,27,6,122,5,97,4,185,5,65,4,130,5,136,2,208,247,190,251,250,255,55,1,62,255,155,252,129,253,193,252,160,1,118,251,56,251,69,5,33,251,83,252,21,7,111,247,61,248,197,1,149,253,169,250,68,252,186,249,76,248,29,250,105,251,223,251,176,251,135,254,89,2,201,0,84,7,57,3,118,1,82,254,213,250,29,0,139,250,31,251,205,250,17,252,32,250,192,3,135,250,39,248,197,0,157,250,99,248,20,255,203,251,123,0,166,1,103,2,245,4,34,2,206,254,246,5,136,3,170,4,252,6,153,4,142,253,140,252,10,250,199,0,254,2,224,5,215,251,94,3,197,0,246,251,19,249,137,252,224,252,145,0,87,2,146,251,249,253,114,2,75,251,122,248,244,1,114,252,239,251,141,250,60,250,225,249,55,252,245,253,74,3,34,0,2,7,134,2,94,3,73,251,160,248,22,252,178,255,247,255,96,253,20,4,247,2,80,0,168,253,115,4,251,3,57,0,208,7,142,5,191,252,134,5,97,4,78,251,94,6,236,4,51,254,140,5,220,4,1,6,207,3,253,0,229,254,68,1,153,254,87,2,61,255,106,0,76,2,62,0,181,253,11,253,133,2,205,0,51,0,177,4,246,2,71,251,161,2,122,254,144,253,45,6,173,3,105,255,255,3,223,2,4,11,21,5,178,2,210,254,12,2,157,255,124,252,204,249,91,251,60,4,251,0,238,0,222,7,0,7,242,3,221,4,97,6,205,6,53,251,252,249,72,251,147,253,200,1,147,255,40,0,191,255,20,3,219,252,69,253,186,250,185,253,136,3,64,3,223,252,20,2,82,2,180,7,128,5,71,5,103,251,168,248,190,247,251,252,56,2,180,3,9,252,55,4,236,4,169,251,226,1,126,255,242,6,20,4,12,3,45,250,245,0,144,3,196,254,139,251,107,252,232,253,94,250,214,246,239,252,246,249,60,248,45,248,1,1,141,3,199,248,135,253,71,251,254,249,130,248,226,251,70,6,191,8,40,6,201,253,36,250,248,249,1,251,195,0,89,5,207,252,37,1,195,4,243,253,118,2,173,4,94,249,135,246,208,248,209,254,219,2,235,2,111,251,5,255,13,1,74,252,181,255,148,6,98,251,59,254,237,3,193,249,73,2,122,1,229,247,197,253,85,254,239,253,121,251,109,251,229,254,51,255,204,253,228,252,222,4,205,2,229,8,159,3,27,2,58,254,47,2,184,1,51,253,180,5,79,6,250,251,28,4,74,6,111,251,118,255,79,3,226,0,39,0,156,253,29,251,150,255,39,253,117,253,200,3,22,5,54,253,132,253,191,6,97,1,45,4,154,1,226,252,100,255,75,4,194,253,150,3,190,1,226,250,244,3,210,1,128,5,55,6,253,2,149,5,100,5,221,6,157,7,164,7,74,9,42,6,255,7,100,8,148,3,98,0,249,255,101,7,138,5,93,8,92,1,125,5,43,6,152,0,110,4,9,7,245,254,154,0,115,5,114,251,213,1,30,4,138,251,107,254,207,251,195,250,40,247,211,249,148,254,101,3,170,6,118,251,37,2,14,6,55,251,116,248,126,249,51,250,71,248,249,247,65,249,118,252,158,255,151,248,233,0,212,5,124,3,108,0,181,254,64,249,110,251,92,249,220,251,188,7,254,6,210,251,51,249,139,248,245,255,3,6,37,5,192,249,94,0,241,1,165,1,187,1,59,255,214,249,163,254,30,252,169,253,229,253,116,4,59,252,117,250,127,255,195,250,175,0,65,254,137,254,31,5,7,8,141,254,118,253,205,254,207,251,93,2,109,1,247,247,143,255,174,1,140,2,146,3,199,3,12,252,206,249,237,246,225,5,224,4,47,2,6,1,26,254,111,254,65,249,62,5,10,6,50,0,56,0,176,1,182,254,119,0,164,253,19,250,200,251,214,252,178,3,103,4,31,4,136,250,89,249,80,249,10,251,64,253,219,250,39,3,29,7,119,4,200,10,70,6,123,8,96,4,153,1,106,255,109,255,148,1,191,3,135,9,119,7,141,8,118,252,115,255,158,252,120,252,114,255,54,254,211,253,60,253,113,249,194,252,105,250,209,249,206,248,190,250,194,251,188,249,240,254,147,3,84,251,4,3,32,4,130,253,46,251,151,248,12,254,175,255,202,252,247,250,179,249,33,253,139,255,17,3,168,0,190,251,109,4,154,3,184,251,22,253,104,5,31,1,221,253,217,251,160,250,103,247,76,251,128,247,222,249,35,249,25,250,63,247,253,252,55,249,75,4,62,3,204,249,212,2,219,4,250,249,181,2,37,3,102,249,16,255,129,6,92,249,252,255,100,253,101,8,48,3,18,4,206,252,207,248,22,0,4,253,5,254,193,1,129,251,151,253,33,1,181,252,196,249,16,255,242,1,22,255,111,253,16,253,224,1,142,6,193,254,31,254,193,0,213,252,171,0,137,255,176,247,54,255,176,252,181,6,116,4,164,6,67,0,239,255,66,0,244,255,102,249,187,253,152,255,240,254,204,251,94,251,203,248,136,254,140,251,98,252,92,254,198,255,253,254,112,253,146,251,215,253,252,6,203,4,199,1,129,0,206,1,185,1,16,255,240,253,72,3,2,2,130,0,181,255,90,4,111,2,153,0,216,0,44,4,52,2,250,255,236,254,95,4,215,2,190,0,188,255,192,2,50,1,119,0,248,254,73,1,61,0,156,255,156,0,108,1,123,0,183,0,48,255,85,255,133,255,220,0,191,255,206,254,194,255,146,1,17,0,108,253,86,252,246,254,0,0,129,1,235,0,20,1,29,1,64,1,12,1,176,254,56,255,44,253,17,0,172,255,125,1,224,253,173,1,238,1,7,2,139,255,32,1,48,1,73,1,131,2,157,0,189,2,252,1,176,4,113,2,28,3,96,2,230,3,165,1,236,1,120,2,180,4,12,3,190,1,132,0,233,4,76,3,35,2,193,1,61,3,146,2,29,2,214,1,108,4,234,4,150,3,127,2,35,2,51,0,167,1,23,1,9,0,136,1,83,0,94,0,30,2,31,2,229,0,109,255,58,255,129,0,194,0,71,255,161,252,215,250,210,254,30,0,171,253,139,253,237,255,114,0,124,252,199,251,210,1,97,1,53,250,219,249,15,0,113,255,84,249,245,247,17,253,196,0,172,248,237,247,126,253,254,254,225,246,66,250,62,254,204,253,184,253,70,255,152,252,98,254,243,248,36,252,155,251,226,250,42,253,151,251,28,0,169,0,241,251,160,252,50,253,10,255,228,1,36,0,23,255,207,255,9,1,67,0,33,1,211,1,178,0,31,2,42,3,28,2,84,0,26,1,160,2,191,2,49,252,247,252,129,0,31,1,86,252,29,255,187,3,83,2,175,249,223,254,68,3,137,2,201,248,41,255,82,4,206,2,14,248,195,251,138,2,184,1,203,247,239,253,139,3,63,2,37,248,176,254,158,2,204,0,171,246,76,253,104,1,137,0,148,247,100,247,247,255,24,1,246,254,119,0,39,0,193,0,78,0,197,255,136,255,226,0,49,252,166,252,243,252,185,251,149,253,99,254,61,254,182,252,64,251,215,250,211,252,141,252,160,250,177,249,118,254,84,254,31,253,167,251,219,253,234,252,144,252,49,252,57,252,126,253,39,252,138,252,7,251,175,250,39,254,220,252,135,250,129,250,160,0,247,254,105,252,237,254,8,255,6,255,50,253,132,254,97,0,153,255,137,254,27,255,97,254,63,255,121,255,213,253,116,2,105,1,119,0,216,0,67,2,108,1,135,1,209,0,122,2,10,2,102,255,108,255,14,2,133,1,170,0,33,0,105,0,11,1,64,0,124,1,33,250,24,252,226,255,143,254,210,251,58,0,135,2,223,0,16,250,221,254,109,2,51,1,5,250,156,0,250,2,148,1,19,248,141,0,222,2,243,1,199,248,118,253,50,1,0,2,69,255,152,255,197,255,182,1,134,0,26,255,156,0,70,255,195,255,252,254,240,255,10,0,199,253,253,255,91,254,215,254,67,249,247,253,166,254,178,0,174,250,197,255,212,255,157,0,158,247,51,254,42,254,163,254,134,247,255,255,143,254,135,255,213,249,139,254,124,252,9,252,163,251,177,253,155,253,240,252,207,253,122,0,181,255,63,254,252,255,85,255,133,255,140,254,192,0,168,0,180,255,124,255,252,0,149,255,84,1,210,0,136,1,253,1,16,1,181,0,147,255,145,0,218,0,119,0,96,254,249,254,229,1,9,1,75,255,248,255,226,254,226,0,12,255,38,255,69,0,222,254,98,255,191,0,255,255,192,255,176,253,166,255,213,0,160,255,255,0,179,1,178,0,176,255,143,254,238,255,223,255,176,255,214,255,159,1,140,0,34,255,119,4,139,2,137,2,73,1,255,2,44,2,249,0,235,0,180,3,157,1,186,1,23,1,141,0,83,1,100,1,45,2,42,254,86,255,99,0,237,0,199,253,224,252,96,1,53,2,26,1,217,1,214,1,76,1,57,255,78,253,252,250,107,252,63,255,86,254,224,252,158,251,230,255,141,254,22,254,63,255,125,2,83,2,7,2,74,1,152,1,141,255,79,0,12,0,221,1,87,0,153,255,136,254,102,253,165,254,235,254,221,254,2,254,31,254,169,0,41,1,195,252,30,253,51,255,85,255,192,254,228,253,72,1,27,1,165,252,66,252,186,1,254,255,44,2,174,2,130,0,56,0,103,5,244,3,243,2,171,1,100,2,229,2,116,2,41,2,173,254,228,252,134,0,21,1,135,253,195,251,254,255,10,255,144,252,245,251,185,249,216,251,30,252,38,254,142,251,24,254,98,254,229,252,73,0,50,255,248,255,117,255,183,1,204,0,80,255,190,253,23,0,131,0,243,254,11,253,65,255,245,0,147,255,174,254,112,0,60,1,120,0,106,254,138,255,99,2,76,255,70,255,123,253,115,0,83,255,34,0,250,253,23,254,105,255,61,0,185,253,180,252,220,0,118,255,87,253,4,252,135,1,239,255,170,253,191,254,157,0,217,254,129,0,155,0,98,252,149,252,37,252,29,1,241,0,173,255,131,255,131,255,108,2,85,2,176,1,92,0,137,1,78,0,153,1,61,0,119,254,29,253,99,254,20,253,83,0,54,0,105,1,27,0,196,251,130,0,175,254,74,253,227,249,41,1,62,1,237,255,175,248,36,0,51,0,195,254,237,246,10,255,231,0,172,255,254,246,241,252,40,0,77,255,71,247,94,252,38,254,50,254,14,253,170,255,224,254,142,253,149,246,57,254,193,255,171,0,181,251,186,251,230,255,113,255,87,251,57,254,106,254,131,254,163,253,46,255,160,255,205,255,188,253,36,254,236,254,241,255,85,251,134,253,77,251,143,252,134,254,35,255,99,253,72,252,82,2,178,0,109,254,92,253,251,2,71,1,89,2,34,1,172,0,44,1,203,0,157,0,200,255,176,254,100,1,24,0,28,255,216,254,253,254,227,255,70,255,7,1,160,1,14,0,159,254,117,1,244,255,40,255,1,1,96,0,174,0,57,0,10,250,152,253,70,252,13,254,15,254,104,255,179,254,125,0,105,0,200,0,179,0,159,255,181,254,32,255,253,2,185,2,248,2,0,1,45,1,59,0,199,1,171,255,204,0,32,1,254,253,240,0,251,0,147,255,0,1,161,1,222,255,99,254,101,0,174,1,128,1,156,0,225,255,246,255,206,0,170,1,77,2,145,0,143,0,71,0,40,3,138,3,77,1,93,1,218,3,170,3,77,2,75,1,20,5,56,3,187,0,253,1,38,4,141,2,123,1,210,1,182,5,169,3,145,1,18,1,19,3,93,3,9,1,2,0,97,2,41,2,28,0,49,1,158,3,84,1,106,0,130,1,241,0,245,254,109,255,225,0,78,255,234,253,91,1,246,1,125,253,131,254,141,1,30,0,117,253,35,253,77,254,142,1,105,254,42,253,28,254,8,255,235,252,110,252,74,254,36,254,14,254,122,254,75,0,217,254,60,252,178,253,162,253,150,0,135,255,207,255,101,255,178,255,167,3,38,2,133,1,38,0,191,254,127,0,168,1,59,1,227,254,143,255,27,1,3,1,146,2,203,0,66,1,230,1,135,3,249,1,236,2,161,1,99,2,167,1,43,2,0,2,239,0,173,255,190,253,237,255,173,254,37,253,93,1,13,0,90,252,137,250,142,255,152,254,107,0,180,2,182,0,90,0,37,251,254,249,241,249,43,253,200,253,121,252,173,250,243,253,251,253,171,252,163,252,20,252,88,255,78,253,189,252,63,0,119,255,212,253,221,253,144,0,226,254,207,252,229,1,63,1,109,255,104,254,14,2,246,0,165,254,78,254,41,1,228,255,222,254,41,254,170,251,251,250,52,254,153,254,36,252,230,252,67,5,19,5,178,2,11,2,192,4,44,4,70,4,245,2,57,3,116,4,240,2,238,1,228,4,85,5,171,4,130,3,9,2,29,4,20,2,176,1,178,254,40,255,199,254,249,254,96,255,52,0,40,254,101,255,127,0,136,0,132,254,44,0,83,3,154,1,94,255,23,254,123,0,1,255,228,252,101,253,66,4,149,3,21,3,237,1,117,5,173,4,46,2,202,0,205,255,138,255,170,254,67,253,83,0,108,0,214,255,71,254,61,0,95,0,31,1,0,1,229,255,89,0,12,2,19,2,95,1,227,0,80,2,33,2,185,2,155,0,92,255,51,1,126,2,18,1,23,254,206,255,242,2,240,0,90,255,132,255,140,255,189,253,68,251,193,255,190,0,217,254,240,251,240,250,147,0,136,254,79,255,143,255,73,3,217,4,27,4,156,2,2,0,37,1,39,2,48,1,184,251,71,252,8,255,120,1,18,253,59,252,87,0,4,2,237,254,252,253,177,2,135,1,133,254,125,253,108,3,82,2,122,254,11,252,123,253,61,2,149,255,200,253,79,253,198,252,255,251,229,255,184,254,53,255,93,3,237,2,36,2,233,0,132,249,237,251,195,1,108,0,108,253,148,253,174,1,236,0,21,0,116,254,122,251,137,253,92,5,18,5,199,3,65,2,101,4,101,4,77,2,198,1,189,254,159,252,45,254,153,0,44,254,69,253,220,252,3,254,120,254,50,253,52,255,221,255,165,253,187,251,201,253,94,255,7,254,20,252,154,255,94,1,219,0,224,0,167,1,252,0,139,1,79,2,96,2,107,1,22,253,160,255,117,1,172,0,171,0,39,1,202,2,83,1,233,0,77,0,107,0,21,1,157,0,153,0,13,254,156,254,11,6,49,4,64,2,238,1,220,254,173,254,8,254,176,253,121,252,184,255,149,253,31,254,198,249,163,251,201,253,2,255,231,252,5,254,204,253,221,254,20,254,236,253,246,1,48,2,130,254,171,1,88,2,230,0,29,255,221,1,251,0,75,0,29,1,74,3,45,3,220,1,226,250,203,250,186,0,121,1,181,253,107,252,131,2,125,1,94,251,215,253,155,1,82,0,153,251,204,252,82,255,228,253,164,253,119,0,31,2,205,0,132,254,145,2,141,3,55,2,112,0,214,254,138,254,114,0,167,252,5,255,56,0,159,0,145,1,89,1,222,255,116,255,145,255,161,253,41,0,102,2,99,1,142,255,179,255,218,1,66,2,56,0,170,5,156,3,74,4,140,5,229,2,144,1,246,0,22,0,76,2,57,1,135,255,71,1,63,3,216,1,142,251,160,253,88,3,40,2,39,251,208,251,126,2,88,2,154,254,254,0,179,254,209,254,122,253,227,2,102,1,74,0,202,4,135,6,197,4,81,3,193,8,88,6,215,3,124,2,49,7,197,5,237,2,128,1,94,1,7,1,87,0,128,0,146,248,83,252,112,255,192,255,58,249,1,255,32,1,225,255,172,245,42,251,110,1,235,0,149,249,188,251,192,250,208,254,227,253,205,251,164,251,123,0,102,251,4,255,208,252,76,255,8,252,21,2,53,2,233,0,25,254,82,254,68,255,78,1,99,3,212,4,22,2,171,0,202,249,185,249,123,2,118,2,108,247,54,1,156,3,156,1,202,246,184,254,188,3,17,2,177,245,135,254,118,2,22,1,214,245,61,1,31,3,43,1,154,246,133,0,84,1,31,0,148,247,68,250,131,0,125,0,96,251,22,254,117,255,46,0,24,253,191,1,123,3,52,2,67,0,61,254,134,2,92,2,215,253,83,254,148,252,140,1,162,0,190,255,25,5,147,3,223,1,67,2,64,4,26,3,194,1,22,1,54,2,68,1,223,251,102,255,148,0,79,255,15,246,168,0,46,4,80,2,209,246,214,255,51,3,89,1,216,246,61,253,209,2,250,0,129,247,39,250,203,254,122,0,178,255,183,255,120,0,173,0,252,255,6,1,249,254,251,254,81,254,192,255,107,254,36,253,207,245,116,0,173,255,63,255,11,250,80,252,35,254,43,253,4,254,51,1,170,0,172,0,64,3,161,1,64,3,174,2,31,255,177,0,126,3,50,3,30,254,123,254,255,4,15,4,129,254,201,0,162,254,40,0,218,2,123,2,226,0,14,2,247,1,206,1,82,1,142,1,23,2,202,2,40,0,230,254,202,5,191,5,61,4,219,2,25,6,48,4,141,3,181,2,139,5,2,5,121,3,111,3,129,4,216,2,162,4,72,3,30,255,106,4,181,3,177,2,18,254,38,252,236,249,128,255,200,253,47,253,55,253,230,255,61,1,12,2,70,0,135,0,107,254,159,252,26,249,116,253,82,255,223,252,117,3,5,3,103,255,165,255,75,4,239,2,6,254,131,251,85,3,134,2,241,0,14,3,7,2,27,2,61,7,164,6,77,4,172,2,31,251,50,250,48,254,188,0,131,252,127,250,224,250,171,254,121,255,182,1,81,255,18,0,87,4,208,3,63,1,208,0,106,250,24,249,83,0,202,1,238,253,24,252,51,1,129,0,184,252,241,255,227,255,156,254,113,252,100,252,133,251,14,255,137,255,240,253,127,0,123,255,7,253,3,253,190,0,173,255,197,254,127,3,10,2,231,0,34,255,102,0,193,255,84,254,60,1,187,2,123,1,70,0,25,0,204,2,58,1,148,255,251,1,106,3,54,2,238,0,108,0,173,3,7,2,195,0,169,1,196,255,85,254,1,1,139,0,153,255,138,253,190,1,78,1,114,1,156,1,48,0,84,255,78,253,229,254,45,2,187,0,226,254,158,0,227,1,140,0,14,1,168,254,137,253,156,3,67,2,140,255,132,0,142,0,210,1,188,255,192,255,230,0,111,255,210,254,226,253,221,252,112,252,250,3,225,2,251,252,247,3,118,2,41,1,220,245,95,0,189,1,80,1,182,247,235,1,254,1,191,0,27,251,161,0,254,255,188,254,86,250,135,253,56,253,151,255,182,252,2,255,101,254,100,0,128,253,222,254,242,3,251,2,118,253,57,1,145,4,218,2,140,0,249,1,6,4,254,2,4,3,31,1,43,4,55,3,239,1,237,2,49,1,67,1,92,255,206,1,78,0,143,1,170,254,150,252,69,0,85,2,240,255,108,2,109,2,81,1,118,255,68,254,247,254,218,0,84,0,62,254,185,3,154,2,34,255,221,252,29,2,92,2,103,252,160,250,244,0,116,0,183,252,45,253,118,2,76,2,140,0,151,2,38,1,112,1,167,3,22,4,113,3,247,2,210,6,184,5,148,3,116,2,180,1,195,3,25,1,1,0,137,255,74,0,30,2,213,0,1,0,201,253,45,1,241,0,4,1,179,1,222,0,140,1,168,3,189,3,84,4,191,2,254,1,250,1,40,3,222,1,89,2,182,2,192,3,108,2,204,3,229,2,212,3,88,2,66,3,205,2,255,2,172,2,131,2,204,3,167,3,126,2,245,1,149,2,208,2,83,3,151,255,136,253,209,254,139,255,83,254,130,0,21,3,186,1,246,253,68,255,192,2,117,1,9,253,42,0,46,3,11,2,237,253,143,251,117,1,66,2,86,253,77,251,57,254,29,1,117,251,215,249,182,251,44,0,81,0,174,255,200,2,107,1,221,1,246,0,186,3,110,2,68,6,86,6,253,4,123,3,129,5,91,3,156,3,124,3,6,3,17,4,179,3,118,4,40,0,222,253,181,255,32,1,152,253,150,255,71,253,230,255,87,255,96,255,133,252,29,253,233,254,128,254,251,251,162,254,245,6,28,5,22,4,48,3,44,6,253,5,192,5,154,4,225,5,52,4,192,4,131,3,122,3,136,3,52,2,142,2,152,3,180,2,253,3,88,3,19,254,132,0,177,0,249,1,71,0,195,0,228,255,97,0,200,1,95,1,92,255,88,0,183,1,22,1,216,255,94,1,115,5,181,3,234,0,161,255,219,252,40,254,38,0,93,255,111,1,158,255,233,1,11,2,1,4,154,4,188,4,138,3,63,1,34,5,46,3,205,1,133,255,225,253,220,252,191,1,20,253,188,254,127,252,153,251,31,253,11,254,235,252,55,253,203,2,9,3,215,4,154,3,157,7,147,7,88,5,97,3,218,2,112,3,246,2,132,1,153,252,198,1,17,0,5,255,131,254,214,252,209,249,239,0,247,253,58,252,232,252,3,1,134,252,178,250,254,252,183,255,166,0,93,1,44,255,67,1,184,252,211,254,217,1,179,1,89,253,48,254,216,2,95,1,100,255,57,255,155,2,176,1,29,0,4,255,159,1,224,1,37,253,133,254,145,0,47,2,240,253,137,253,122,251,97,255,189,1,17,1,123,0,127,2,117,1,130,255,32,3,56,2,84,0,94,255,208,2,200,2,194,252,232,253,71,255,222,0,152,1,196,1,245,1,3,3,127,252,181,250,189,255,186,1,232,252,130,250,54,2,90,2,167,0,186,254,253,1,74,1,161,255,142,253,38,253,168,254,132,6,193,4,11,3,199,1,36,5,60,3,72,2,207,2,148,1,225,255,245,3,21,3,89,0,107,0,123,3,37,2,103,3,45,6,149,3,159,2,98,3,199,5,9,5,86,3,135,1,44,4,98,4,44,3,78,0,206,253,89,1,51,2,173,1,153,255,161,1,19,3,134,255,75,254,155,1,20,3,111,252,95,254,90,2,242,2,30,255,240,255,151,0,248,2,68,253,118,0,152,255,242,255,152,251,48,0,28,1,137,1,122,254,93,254,129,253,140,255,114,252,50,1,60,1,243,255,183,4,216,3,53,3,157,2,85,251,75,253,140,0,43,255,140,252,96,254,57,255,210,253,152,253,245,0,108,254,104,253,6,1,56,0,151,253,44,253,171,255,21,254,192,254,112,253,198,253,193,252,127,255,240,253,30,250,193,255,145,254,127,254,154,254,191,254,4,0,51,0,146,254,42,255,63,1,255,1,146,0,159,2,239,255,221,254,146,255,208,1,117,255,16,254,54,255,220,0,200,254,137,253,108,253,183,255,113,253,204,252,106,253,115,253,248,250,167,252,82,254,71,252,65,252,248,254,207,255,44,254,184,255,131,254,162,254,205,253,63,255,105,254,55,0,104,254,221,252,11,0,203,254,137,2,188,0,58,255,0,254,205,1,177,255,54,254,218,250,249,254,122,255,245,253,135,249,77,254,17,254,3,253,57,0,165,254,98,254,178,1,139,251,14,255,104,253,167,252,34,0,188,255,61,253,174,254,163,1,163,0,226,255,250,254,57,254,235,252,106,250,47,253,238,3,152,2,13,1,25,0,107,2,4,1,183,0,96,0,56,252,178,250,124,254,135,0,75,253,67,3,200,1,154,0,81,4,191,2,57,2,107,1,89,6,46,5,217,3,236,2,36,255,219,0,76,0,48,255,81,250,130,249,49,0,149,0,60,252,84,255,16,253,176,254,113,2,209,0,6,255,190,255,7,252,186,252,254,255,61,1,136,247,51,250,118,255,123,0,172,248,205,247,247,253,85,0,57,252,146,254,73,253,143,252,103,252,13,252,5,253,75,252,132,255,0,255,160,254,108,253,178,0,207,1,98,1,48,1,48,249,177,253,230,254,79,0,55,247,175,0,99,3,243,1,118,255,76,255,75,255,235,255,13,247,39,251,52,254,248,253,253,252,195,1,246,255,204,254,15,1,191,255,4,0,214,0,233,254,77,254,213,255,164,254,98,253,35,0,191,255,45,255,38,3,23,2,85,0,41,1,57,0,239,0,210,2,237,1,225,0,149,2,72,3,35,2,228,253,136,254,14,0,93,1,213,1,209,2,75,1,162,0,224,253,16,253,194,255,246,255,142,1,168,255,212,2,189,2,237,255,235,253,162,255,89,2,136,0,185,255,87,253,21,253,90,255,168,254,5,1,206,255,161,0,204,255,229,1,81,1,117,249,50,0,190,0,163,255,22,247,25,255,62,255,174,255,161,255,173,253,102,255,128,0,126,3,245,1,76,2,201,1,167,254,206,0,122,0,110,0,137,253,29,255,199,253,3,0,152,1,239,0,141,1,226,0,59,255,254,255,128,0,235,1,1,5,136,3,36,1,215,0,26,2,50,1,3,1,253,1,91,253,233,251,13,0,65,1,89,253,180,253,154,254,44,255,210,253,243,0,134,2,223,1,230,1,86,1,122,2,20,2,107,0,34,3,75,1,136,0,144,255,114,254,249,251,226,254,186,254,63,253,32,1,16,1,19,5,120,4,154,4,92,3,89,254,121,0,127,254,108,255,217,254,210,254,190,252,205,252,16,0,232,255,55,255,36,254,43,2,91,0,11,255,38,1,218,255,133,254,62,252,59,251,89,251,18,250,239,254,117,254,122,254,11,252,123,253,61,2,205,248,250,251,249,1,212,1,232,2,179,3,97,2,237,1,79,253,108,251,140,253,121,255,254,251,195,0,155,1,196,0,46,6,123,4,63,2,81,1,41,251,247,252,120,253,114,255,83,2,57,3,199,3,223,2,74,251,54,252,175,255,170,254,23,253,13,0,184,255,119,1,198,1,19,0,127,5,153,3,145,249,84,255,93,3,50,2,160,3,1,6,39,4,228,2,88,246,72,252,8,1,82,0,10,254,59,252,202,250,123,0,99,3,212,4,22,2,171,0,240,246,52,254,12,3,107,1,90,251,151,253,252,0,195,255,82,255,34,0,243,3,20,3,227,246,247,0,167,1,153,0,240,255,157,254,6,1,193,1,216,249,207,251,224,253,141,254,153,253,207,254,27,4,37,3,175,2,16,2,6,0,74,255,167,3,107,3,234,3,41,3,199,0,1,1,126,0,76,0,184,253,142,251,87,2,44,2,175,251,145,250,201,249,249,253,47,252,211,250,108,0,91,1,46,253,49,252,109,1,101,0,111,255,169,2,249,0,103,255,0,0,178,254,198,253,159,0,156,1,29,1,176,254,151,253,71,252,58,252,119,3,177,2,29,251,84,0,71,255,114,254,176,253,177,1,20,4,141,2,85,0,73,1,216,255,105,1,79,254,63,253,210,1,62,2,102,255,142,2,80,2,34,1,89,255,72,0,93,1,175,0,162,2,41,1,209,3,208,2,211,4,180,4,245,2,232,1,112,254,243,254,26,2,116,1,186,250,149,250,86,251,165,255,238,4,108,3,7,3,188,2,169,253,218,255,82,254,46,253,184,7,94,6,223,3,96,2,111,0,20,1,30,255,160,255,77,252,124,254,245,255,249,255,209,254,237,253,185,252,82,1,198,6,174,6,125,5,245,3,252,253,169,252,123,253,210,0,80,253,96,254,1,2,230,0,202,252,131,253,134,251,192,254,72,252,110,253,74,253,183,0,142,255,145,253,50,3,162,2,65,255,52,255,219,2,123,2,51,0,197,4,115,3,64,2,70,252,81,254,58,3,86,2,170,254,13,253,124,252,105,254,154,251,158,254,50,255,0,254,221,253,214,252,155,254,148,253,66,0,3,2,183,255,102,254,152,252,79,252,92,250,53,251,191,0,239,255,224,253,25,255,252,249,224,253,123,252,138,252,134,252,242,249,19,246,205,252,54,252,175,0,198,252,46,251,6,253,169,253,234,255,122,2,213,252,37,252,122,252,189,254,203,0,26,0,129,254,21,255,243,252,113,254,238,4,138,3,92,252,137,250,156,250,144,253,93,0,87,0,98,254,229,253,77,253,37,0,121,2,254,1,125,254,36,254,206,250,143,1,66,0,7,1,105,254,207,255,177,254,95,254,17,4,73,7,245,252,191,251,96,250,22,253,166,252,64,3,187,253,9,253,141,254,95,253,6,254,40,8,208,253,134,253,101,251,15,1,241,0,14,0,74,254,12,255,115,254,207,1,178,4,23,4,162,253,227,252,98,250,205,255,189,254,225,1,32,255,184,253,241,253,238,1,113,3,170,2,79,254,206,254,22,252,42,2,147,2,222,0,171,0,96,255,159,254,169,2,6,7,29,6,172,252,99,251,97,249,176,254,102,253,114,0,187,253,12,253,24,253,61,255,119,1,241,1,47,254,220,252,182,251,154,0,26,1,125,255,206,255,65,255,49,253,67,1,220,2,6,6,46,253,205,252,132,250,105,0,6,255,185,0,78,255,10,254,26,253,65,1,254,1,87,4,189,254,201,253,58,252,127,0,228,1,82,1,96,255,52,0,174,254,220,2,87,5,18,6,142,253,222,252,96,249,226,254,182,253,164,2,73,253,169,254,142,254,22,254,39,1,101,7,138,253,194,253,10,252,176,255,133,2,187,255,250,255,194,254,148,254,14,3,170,5,14,4,199,254,35,253,141,250,120,0,60,0,221,1,248,254,183,253,133,255,199,2,221,4,121,2,165,255,157,254,8,252,3,3,246,2,5,1,253,0,81,0,38,254,162,3,167,8,184,6,216,252,181,251,123,248,208,253,242,252,169,0,220,252,206,251,68,255,142,253,201,255,125,5,74,253,52,253,86,251,108,253,98,1,73,1,254,253,201,255,225,253,110,1,9,4,158,4,110,253,65,252,179,250,201,255,72,255,93,0,163,253,226,254,106,253,148,1,193,1,59,3,226,254,162,254,17,251,116,2,50,1,227,0,240,255,147,0,145,253,186,0,155,3,98,8,94,253,134,252,186,249,69,254,28,255,83,1,143,254,234,252,103,254,231,0,86,0,189,5,64,254,187,253,219,251,82,2,194,1,79,255,132,255,86,255,65,254,159,2,135,4,124,5,36,254,101,253,25,250,179,255,118,255,204,2,79,255,140,254,131,254,195,1,166,3,147,3,6,255,80,254,202,252,16,1,60,3,190,1,26,0,19,0,225,255,186,2,156,6,120,8,122,253,47,252,124,248,77,255,39,254,12,1,133,254,23,253,77,253,11,0,127,0,9,4,24,254,107,252,199,252,61,0,67,1,135,0,147,0,111,255,82,253,173,2,18,3,146,6,6,254,176,252,239,250,35,0,90,0,222,0,233,255,166,254,98,253,199,1,79,2,7,5,53,255,175,253,194,251,140,2,96,1,181,1,39,0,63,0,55,254,73,3,241,4,57,8,248,253,142,252,208,249,184,254,57,253,141,5,172,253,170,254,186,255,209,0,173,0,136,7,89,254,170,253,103,252,165,1,93,2,218,255,254,255,11,255,129,255,128,3,177,7,111,4,133,254,250,253,213,249,173,0,118,0,241,2,201,255,131,254,204,255,217,3,253,3,241,2,254,255,221,254,133,252,241,2,224,3,167,1,8,1,131,0,60,255,127,3,226,8,239,9,133,253,192,251,61,246,239,253,42,252,14,2,4,253,194,252,220,253,76,254,60,1,87,2,93,253,84,252,22,253,199,255,236,0,245,255,55,255,175,255,226,252,16,0,77,3,22,6,31,253,39,252,68,251,44,254,17,0,34,1,233,254,184,253,68,253,183,0,54,3,193,2,247,254,20,254,93,251,165,1,152,0,212,1,122,254,166,0,244,254,39,0,14,6,76,7,133,253,58,252,221,249,59,254,20,254,142,3,228,254,253,251,181,255,75,255,123,255,60,7,67,254,144,253,106,251,164,1,111,1,207,255,123,254,44,255,87,255,195,2,49,4,184,4,229,253,58,253,87,250,83,0,93,255,228,1,20,255,225,253,157,254,82,1,151,4,46,3,10,255,203,254,66,252,94,2,248,2,60,0,166,0,248,255,93,255,206,254,57,7,3,10,21,253,255,251,9,249,93,254,66,254,209,0,50,253,202,253,234,253,6,254,181,2,89,3,49,254,71,253,198,251,69,1,175,1,50,255,241,255,248,255,5,253,33,2,151,3,238,5,157,253,241,252,223,250,0,1,201,255,208,0,91,255,164,254,106,253,65,1,168,2,162,3,186,254,83,254,73,252,228,1,190,1,58,2,59,255,72,0,183,255,141,3,175,5,205,6,205,253,31,253,74,248,132,255,96,254,206,2,34,254,108,254,198,254,240,255,190,1,100,6,217,253,231,253,18,253,198,255,126,2,214,0,55,0,71,255,241,254,124,4,21,5,188,4,29,254,97,253,16,251,117,0,29,1,31,2,52,255,121,254,145,255,1,2,2,6,86,3,142,255,66,255,46,252,109,3,83,2,208,1,4,1,4,1,201,254,236,2,235,8,168,8,251,253,79,252,133,247,186,254,60,253,122,1,212,252,77,253,24,255,208,253,175,2,129,5,36,253,78,253,188,252,153,254,133,2,130,1,247,254,62,0,90,253,145,0,108,6,184,4,213,253,36,252,47,251,178,255,14,0,114,0,185,254,154,254,23,254,136,1,165,2,185,2,55,255,20,255,140,251,181,2,193,1,178,0,13,255,0,1,79,254,99,2,105,5,152,9,156,253,123,252,72,250,205,254,239,255,243,1,197,254,101,253,2,255,0,1,172,1,183,5,26,254,90,254,224,251,143,2,114,1,18,0,154,255,71,255,236,254,243,2,42,6,55,5,24,254,165,253,118,250,182,0,163,255,102,3,183,255,54,254,164,254,67,3,94,3,189,3,230,254,179,254,22,253,35,2,71,3,172,1,17,1,167,255,13,0,172,3,172,6,16,10,94,254,196,251,34,249,212,255,154,254,3,1,15,254,125,253,208,253,99,0,45,2,193,3,91,254,2,253,107,252,39,1,70,1,184,0,175,0,15,0,142,253,20,2,110,3,189,7,69,254,0,253,5,251,221,0,156,0,12,1,39,0,149,254,7,254,183,2,4,3,116,4,94,255,53,254,112,252,197,2,188,1,146,2,25,0,47,1,200,254,244,4,130,5,179,6,215,254,2,253,212,248,249,254,148,255,46,4,106,254,243,255,127,255,57,0,182,1,174,10,138,254,25,254,189,252,48,1,184,2,164,0,104,0,21,255,5,0,75,6,108,7,119,5,27,255,186,253,211,250,149,1,192,0,49,3,169,255,74,254,111,0,4,4,175,4,225,3,68,0,81,255,90,252,9,4,93,4,195,1,222,1,200,0,8,255,79,8,136,10,250,7,189,252,213,250,173,247,225,252,76,253,210,1,212,252,248,251,43,254,146,253,32,1,152,3,67,253,183,252,210,251,101,254,0,2,8,0,122,254,165,255,24,253,226,255,19,4,137,4,202,252,132,251,124,251,218,254,210,255,110,0,101,254,138,254,90,253,214,0,19,2,156,2,106,254,92,254,86,251,231,1,232,0,47,1,194,254,91,0,40,254,123,0,208,4,141,9,46,253,72,252,41,250,30,253,93,253,52,5,225,253,162,253,45,255,161,255,158,255,228,5,219,253,254,253,87,251,217,1,211,0,73,0,224,254,144,255,123,254,25,2,52,5,234,4,201,253,13,253,247,249,71,0,229,254,120,2,86,255,31,254,19,254,169,2,234,3,49,3,156,254,181,254,147,252,163,1,194,2,90,1,241,0,222,255,186,254,121,1,158,7,91,7,41,253,205,251,167,249,23,255,225,253,116,0,244,253,218,252,183,253,183,255,222,1,217,2,224,254,99,252,137,251,173,0,191,1,204,255,68,0,27,255,162,253,193,1,17,2,5,7,177,253,149,252,173,250,183,0,112,255,68,1,153,255,60,254,102,253,111,2,232,1,152,4,18,255,1,254,20,252,70,1,40,2,202,1,136,0,108,0,193,254,114,2,63,5,91,7,22,254,122,253,62,249,70,255,63,254,216,3,30,253,180,255,86,255,218,253,243,2,0,10,16,254,2,254,77,252,210,0,182,2,204,255,84,0,190,254,57,255,66,4,89,6,200,4,136,254,165,253,140,250,87,1,74,0,120,2,81,255,10,254,224,255,204,3,52,5,222,2,52,0,217,254,167,251,41,4,150,3,160,0,137,1,107,0,115,254,190,4,89,10,205,6,136,253,79,251,157,248,49,253,235,254,97,1,117,253,144,252,134,255,45,255,209,0,58,5,206,253,54,253,221,251,48,255,132,1,159,0,192,254,195,255,217,253,37,1,68,4,163,5,120,253,159,252,27,251,207,255,113,255,49,1,111,254,29,255,183,253,49,2,20,2,159,3,139,255,69,254,92,251,251,1,180,1,36,1,177,255,233,0,54,254,159,2,1,4,92,9,135,253,182,252,11,250,204,254,226,254,128,2,139,254,147,253,105,254,162,1,253,0,25,5,197,254,187,253,143,251,60,2,173,2,231,254,61,0,188,255,141,254,223,3,77,4,218,5,19,254,85,253,174,250,209,255,164,0,192,2,0,255,198,254,244,254,119,2,181,3,28,4,138,255,164,254,191,252,68,0,156,4,56,2,152,0,117,0,34,0,89,4,110,7,191,8,167,253,65,252,86,249,113,255,23,254,224,1,180,254,113,253,194,253,54,0,97,1,168,4,50,254,116,253,228,252,150,0,37,2,112,0,195,0,145,255,253,253,167,2,84,4,111,6,210,253,19,253,63,251,247,255,16,1,85,1,203,255,247,254,233,253,233,1,75,3,18,5,136,255,30,254,248,251,120,2,31,2,152,1,179,0,50,1,242,253,100,4,184,5,196,8,95,254,238,252,230,249,32,255,128,254,84,5,135,254,53,254,231,255,129,1,233,1,126,8,180,254,117,253,195,252,32,2,41,2,61,0,22,0,143,255,167,255,104,4,189,6,244,5,40,255,139,254,139,249,161,0,60,1,140,3,91,255,34,255,189,255,82,5,151,4,21,3,73,0,4,255,1,253,226,2,164,3,104,2,106,1,246,0,130,255,19,3,94,10,211,11,77,253,174,251,114,247,203,253,180,253,12,2,178,253,45,252,22,254,249,254,141,1,214,3,191,253,187,252,79,252,234,255,179,1,207,255,66,255,138,255,139,253,168,255,216,4,233,5,132,253,229,251,5,252,221,254,189,0,3,1,255,254,42,254,139,253,145,0,177,3,126,3,186,254,148,254,186,251,31,2,4,1,118,2,54,255,189,0,47,255,101,1,99,5,43,8,199,253,205,251,87,250,54,253,17,255,151,3,92,254,63,253,172,255,147,255,142,255,103,9,99,254,239,253,103,251,226,1,112,1,131,0,70,255,184,255,125,255,93,3,231,4,196,4,157,253,110,253,195,250,227,0,135,255,119,2,80,255,23,254,38,255,233,2,151,4,189,3,191,254,108,255,88,252,159,2,198,3,216,0,84,1,253,255,113,255,213,1,56,7,133,9,39,253,63,252,109,249,43,255,2,255,65,1,1,254,74,254,247,253,130,255,213,2,135,3,172,254,83,253,248,251,60,1,224,1,20,0,23,0,167,255,217,253,97,1,27,4,253,6,224,253,11,253,172,250,42,1,231,255,180,1,156,255,120,254,249,253,211,1,242,2,54,4,46,255,114,254,202,251,108,2,146,2,118,2],"i8",ALLOC_NONE,Runtime.GLOBAL_BASE+10240);allocate([33,0,147,0,78,255,153,3,151,6,129,7,187,254,240,253,70,248,2,0,227,254,142,3,141,254,22,254,26,255,0,0,85,2,218,7,16,254,117,254,190,252,37,0,177,3,245,0,181,0,96,255,112,255,201,5,93,5,77,5,157,254,167,253,10,251,42,1,66,1,160,2,63,255,176,254,77,0,65,4,253,5,154,3,177,0,217,255,155,251,228,3,13,3,24,2,200,1,110,1,80,254,135,5,136,9,231,8,46,254,10,253,235,246,209,254,3,254,131,1,41,253,211,253,66,0,111,255,131,2,224,4,224,253,92,253,108,252,31,255,94,3,76,2,104,255,40,0,235,253,167,1,143,5,22,6,196,253,181,252,135,251,128,255,85,0,205,1,18,255,255,254,184,253,93,2,236,2,93,3,24,0,54,255,127,250,29,3,231,1,47,1,75,255,108,1,74,255,104,2,98,5,126,11,18,254,172,252,95,250,220,254,61,0,44,3,172,255,45,253,74,255,43,2,20,2,226,5,147,254,19,254,223,251,54,3,76,2,11,0,242,255,238,255,26,255,233,3,121,5,171,5,38,254,199,253,244,250,46,1,62,0,38,4,186,255,136,254,34,255,214,3,206,3,125,4,60,255,22,255,229,252,223,1,74,4,243,1,106,1,58,0,70,0,123,4,21,8,41,11,25,254,146,252,224,248,73,0,224,254,92,1,154,254,12,254,4,254,199,0,209,2,218,4,178,255,71,253,229,252,105,1,24,2,196,0,118,1,110,0,33,253,79,3,27,4,104,7,146,254,55,253,98,251,59,1,64,1,173,1,72,0,41,255,62,254,247,2,118,3,83,5,226,255,84,254,190,252,93,3,115,2,28,3,118,0,212,1,233,254,75,5,91,7,101,7,68,255,126,253,180,249,63,0,81,255,174,4,94,254,45,255,51,0,158,1,75,2,41,10,22,255,211,253,166,252,168,1,121,3,222,0,136,0,155,255,83,0,133,5,230,8,103,5,172,255,67,254,147,250,158,1,57,1,21,4,29,0,169,254,65,0,16,6,111,6,212,3,183,0,165,255,195,252,249,4,133,5,104,1,41,2,16,1,149,255,51,6,77,12,43,10,104,5,29,8,92,13,244,19,86,26,186,31,135,38,84,43,170,49,133,53,61,254,215,251,239,253,231,250,62,254,12,253,15,254,161,252,128,254,149,253,99,254,99,253,195,254,230,253,181,254,212,253,98,254,4,254,88,254,134,254,238,254,188,254,78,254,154,253,30,255,12,254,24,255,254,253,249,254,135,254,214,254,102,254,105,255,58,253,82,255,206,252,107,255,100,254,100,255,83,254,224,254,50,254,70,255,53,255,86,255,210,254,65,255,191,254,125,255,109,255,215,254,117,254,28,255,42,255,11,255,64,255,189,255,196,254,185,255,185,254,152,255,51,255,162,255,73,255,113,255,218,255,63,255,161,255,16,0,180,255,132,255,8,255,23,0,19,255,24,0,12,255,18,0,120,255,44,0,145,255,223,255,232,255,231,255,0,0,149,0,19,0,23,0,113,255,158,0,87,255,174,0,75,255,133,0,201,255,165,0,230,255,111,0,84,0,98,0,75,0,87,0,183,0,141,255,245,255,248,255,130,0,11,0,170,0,254,0,77,0,205,0,17,0,183,0,112,0,6,1,194,0,202,0,31,1,95,0,189,0,214,255,151,255,234,0,179,0,39,0,186,0,163,0,89,1,76,1,199,0,43,1,161,0,202,255,29,1,178,255,25,1,123,255,141,0,74,255,111,0,249,0,85,1,15,1,108,1,93,0,147,1,75,0,135,1,92,0,254,1,118,255,220,0,71,255,227,255,222,255,105,1,141,255,64,1,3,0,42,2,99,0,30,1,218,0,79,2,11,255,150,1,244,254,197,1,0,0,68,2,25,0,94,2,19,1,20,2,148,0,194,1,183,255,227,2,227,254,6,2,224,254,94,0,53,255,162,2,116,255,182,255,205,0,202,2,142,255,43,1,176,0,155,3,182,0,45,2,240,0,193,2,240,255,1,2,229,1,81,2,37,1,128,1,195,1,105,2,218,255,50,0,51,2,17,2,47,1,209,0,203,1,107,1,177,1,196,1,194,1,198,1,111,1,94,2,221,1,229,2,176,1,97,1,112,1,11,1,105,1,204,2,17,1,71,2,197,1,166,0,254,1,172,0,201,0,117,2,18,1,191,0,56,2,127,2,46,1,42,1,122,2,131,1,131,2,94,1,75,2,48,2,100,2,53,2,88,2,20,3,231,1,160,2,0,2,247,3,65,1,77,1,101,1,86,3,131,255,157,1,218,1,200,2,17,0,105,255,52,2,29,1,14,1,15,255,203,3,121,3,233,1,220,0,254,1,128,3,37,2,156,3,71,1,57,3,34,1,143,3,28,2,84,4,158,0,37,3,199,0,189,3,255,1,218,2,100,0,106,3,13,0,23,3,179,1,120,2,164,2,204,3,249,0,132,3,211,1,194,4,13,3,50,4,73,2,17,3,233,255,157,2,11,1,19,4,107,2,60,4,103,2,121,4,110,2,137,3,148,3,25,4,80,0,75,1,72,2,51,4,89,0,127,2,220,3,193,3,2,3,208,2,30,3,187,2,236,1,191,1,131,3,115,2,15,1,164,4,213,2,53,5,87,0,91,2,64,3,67,6,104,2,103,4,122,3,225,5,232,3,132,4,98,3,241,3,227,3,59,3,125,4,90,3,49,3,170,5,5,3,40,5,244,1,109,5,56,1,129,4,236,255,60,4,64,0,3,5,2,0,148,4,143,1,77,7,2,2,170,6,246,1,100,6,118,3,242,5,160,1,88,2,107,4,70,5,251,4,110,5,121,3,3,7,146,3,230,6,227,0,159,4,226,4,34,7,249,1,62,7,151,3,49,9,57,255,175,1,152,0,199,6,43,255,228,255,136,1,54,5,103,255,204,255,210,3,127,4,189,254,112,254,45,3,167,6,120,255,84,0,169,5,223,7,181,254,113,255,119,255,168,4,0,255,22,2,99,255,7,4,205,254,73,254,30,2,219,2,183,254,92,254,159,255,104,2,150,254,88,255,190,254,110,1,9,255,146,255,45,255,89,0,60,255,203,254,20,0,59,0,148,254,49,254,226,254,89,0,176,254,175,0,80,254,141,0,133,254,66,255,78,254,60,255,177,255,150,0,234,254,29,255,232,254,166,0,213,253,90,254,101,255,29,2,146,254,54,0,227,255,173,255,211,254,250,252,186,0,116,2,115,254,248,254,242,0,37,1,59,255,183,253,124,0,154,1,53,0,123,255,10,0,84,1,198,253,215,251,65,0,66,254,68,0,19,254,127,1,169,3,155,254,57,253,153,254,6,255,91,253,212,251,36,1,230,255,107,1,6,0,95,2,33,5,129,255,246,255,233,5,94,7,201,2,204,3,189,5,133,8,163,5,224,7,161,249,192,249,252,248,14,247,253,251,22,249,180,251,23,248,3,251,148,250,169,250,2,250,77,252,75,250,52,252,12,250,25,252,58,251,4,252,108,251,209,252,37,252,32,252,165,250,64,251,18,252,247,250,186,251,24,253,12,251,13,253,243,250,162,252,101,252,119,252,40,252,90,253,229,251,83,253,230,251,193,251,39,252,218,251,89,253,35,252,127,253,153,251,48,252,6,253,114,253,134,252,218,252,191,252,189,251,62,253,139,253,147,253,218,252,128,253,212,252,249,252,134,253,245,252,225,253,28,252,203,253,205,251,188,253,222,253,157,253,196,253,149,253,8,253,222,254,145,252,242,253,201,252,50,254,229,252,3,255,215,253,97,254,179,253,73,254,235,253,172,254,76,253,89,252,7,254,252,252,66,253,149,251,249,254,206,254,53,252,29,254,67,254,182,255,213,253,220,253,154,253,127,255,75,253,22,255,116,254,10,255,37,254,6,255,247,254,108,254,136,254,254,253,95,254,2,254,212,254,199,254,178,254,104,253,49,254,210,252,126,254,64,253,175,254,153,253,22,255,55,255,23,255,17,255,89,255,201,253,53,255,149,253,109,255,97,254,141,255,160,254,90,255,18,253,85,255,7,253,242,254,145,252,248,254,121,252,145,254,24,253,43,0,37,254,14,0,115,253,43,0,98,253,11,0,64,254,197,255,247,253,130,255,137,255,101,255,155,253,214,255,161,252,229,255,93,252,136,0,29,254,183,0,44,254,55,0,214,254,55,0,208,254,57,1,159,253,57,1,48,253,66,1,89,255,100,0,227,253,253,255,137,255,145,255,69,255,233,0,20,255,4,1,22,255,26,0,91,255,134,0,211,255,216,255,219,253,104,1,53,255,122,1,124,254,194,1,129,254,19,1,20,0,182,0,153,255,246,0,145,255,175,1,37,0,206,1,110,255,231,1,99,255,228,254,197,255,247,1,72,255,24,0,53,0,253,255,54,0,122,0,3,1,77,1,66,0,228,1,104,0,180,1,68,0,195,0,116,0,190,0,206,0,13,1,247,255,226,1,96,1,126,1,29,1,143,1,21,1,196,1,0,1,69,0,186,0,13,0,41,1,243,255,3,1,161,255,30,0,56,0,138,1,196,0,169,1,205,0,200,1,25,1,65,2,15,0,191,0,119,1,34,1,151,1,64,2,200,255,227,0,32,2,149,1,0,0,37,2,164,255,16,2,27,255,95,1,11,255,82,1,150,254,179,1,167,0,15,2,181,255,46,1,91,0,56,3,129,0,87,2,240,1,167,2,186,0,237,2,153,0,225,2,231,254,88,2,164,254,103,2,20,255,1,3,41,0,113,3,38,0,122,3,36,255,73,3,155,254,115,3,119,254,135,3,134,253,218,1,68,254,82,3,81,255,166,2,19,254,242,0,249,253,17,3,54,253,70,2,227,253,110,1,225,253,178,1,171,253,244,1,3,253,222,0,66,253,149,3,25,253,194,3,155,252,245,1,125,252,36,2,133,254,200,0,77,254,157,0,205,252,214,0,163,252,157,0,154,253,40,0,136,253,94,0,141,252,202,255,27,253,4,2,11,254,42,1,154,253,85,255,154,252,95,255,159,252,233,255,206,252,93,0,9,252,245,254,106,253,153,254,219,253,2,0,70,254,135,255,135,254,0,0,29,255,33,0,98,254,130,255,127,255,212,0,90,252,34,0,198,251,230,254,161,251,244,254,58,253,199,252,92,254,65,255,204,251,96,252,107,252,163,255,140,253,154,254,97,0,7,0,50,255,119,254,155,255,24,0,53,255,38,0,88,255,83,0,169,253,89,254,233,254,170,1,68,253,118,0,181,255,206,0,43,252,95,253,88,253,161,1,145,254,37,0,233,254,218,1,127,255,194,254,63,1,40,1,142,253,217,255,87,1,90,2,72,253,217,255,209,254,172,3,104,0,233,0,132,254,137,0,220,255,13,1,181,255,42,255,120,0,43,0,239,253,35,254,203,1,164,0,54,255,27,255,207,255,89,255,97,2,24,3,98,0,36,255,147,3,148,0,37,1,27,1,101,3,91,0,63,2,138,1,70,1,178,255,205,2,67,0,109,1,189,254,104,2,220,255,219,2,27,0,107,2,238,0,120,2,17,1,192,1,99,0,33,3,220,1,101,3,17,1,173,2,64,0,21,3,72,0,253,3,217,0,25,3,203,1,222,2,104,1,134,2,224,1,104,1,66,1,173,1,208,1,126,2,174,1,244,2,107,1,232,3,148,1,171,2,16,2,90,2,103,2,143,2,157,1,178,3,175,2,169,3,90,2,136,3,92,2,43,2,225,2,18,3,150,2,211,1,142,2,106,1,77,2,161,3,198,2,242,1,222,1,159,1,164,1,181,2,115,3,45,3,171,2,13,3,157,3,145,3,171,3,214,2,220,2,235,1,85,3,19,2,180,3,222,2,195,3,59,1,40,3,249,2,243,2,120,4,248,2,143,2,52,4,58,3,33,4,67,4,70,3,235,3,40,3,23,4,109,4,147,2,77,4,224,3,26,4,50,4,51,4,203,3,182,2,202,4,30,4,59,2,73,3,116,3,124,5,99,5,72,4,56,4,93,3,207,4,223,2,4,5,248,2,248,4,223,3,87,5,29,4,233,4,188,2,26,4,22,2,220,3,197,1,240,4,87,2,116,4,167,2,85,6,47,3,104,5,9,2,37,5,137,1,28,6,37,3,168,5,174,2,44,4,136,2,107,3,51,1,59,4,105,1,23,4,61,1,137,5,196,3,163,2,59,2,128,4,79,0,90,4,209,255,250,5,55,1,185,6,58,1,142,4,177,2,2,2,162,255,93,1,26,1,132,5,72,1,1,4,231,1,191,255,57,0,37,3,202,3,36,0,62,0,1,3,249,254,23,3,166,254,125,2,187,2,119,255,108,2,22,2,29,2,33,253,194,0,199,2,44,1,244,254,161,252,158,3,1,3,60,253,84,254,250,1,174,0,132,252,138,253,179,1,35,2,101,250,254,254,109,2,215,1,6,252,168,250,119,254,9,2,104,252,82,253,231,255,20,0,42,252,124,251,84,1,9,0,234,249,145,251,160,254,48,0,213,249,110,254,137,252,6,0,124,251,136,252,220,253,160,254,149,249,112,251,97,255,98,2,24,248,61,252,31,255,193,0,136,249,88,248,11,255,19,254,60,252,112,249,88,252,133,253,237,250,48,249,148,250,164,253,252,249,189,252,139,250,121,255,204,249,222,254,122,249,56,253,37,248,160,249,129,249,229,255,46,247,213,252,123,251,184,0,15,251,189,0,169,250,74,2,37,248,201,0,234,252,200,2,70,251,3,0,247,251,40,3,29,251,62,3,145,255,123,2,156,249,191,1,49,254,75,252,67,254,96,252,8,254,118,251,11,254,69,251,144,0,161,254,140,254,228,251,229,254,221,251,233,254,157,251,193,253,98,250,181,253,178,249,89,252,40,252,229,0,178,2,103,252,49,253,109,254,82,5,83,253,47,254,106,3,141,1,3,254,210,255,61,1,54,5,27,254,200,1,45,3,183,1,101,254,83,1,130,3,43,4,87,254,46,0,161,5,241,1,115,252,224,252,185,5,22,4,2,255,191,254,150,5,141,4,68,0,94,1,10,4,154,2,114,1,11,0,31,5,22,3,143,0,232,0,17,4,26,6,142,255,151,2,80,6,54,4,198,1,67,2,251,4,16,4,180,255,141,3,240,2,43,4,153,0,0,2,92,1,190,4,102,2,129,1,51,7,40,3,13,1,10,4,203,0,62,4,140,2,249,3,247,6,106,4,173,1,47,5,131,1,104,5,207,255,159,4,184,255,191,4,96,254,233,3,32,2,213,6,160,254,199,4,10,254,175,4,179,253,57,2,29,255,94,6,114,255,42,6,26,255,179,6,54,253,8,5,186,252,118,5,107,4,77,5,48,255,208,4,181,1,197,3,95,252,50,3,43,3,130,5,91,3,227,5,164,0,188,4,107,5,1,7,228,1,82,7,200,1,15,8,228,3,146,4,46,5,122,5,36,5,80,5,111,4,238,4,210,4,82,6,81,5,232,6,141,5,203,4,48,6,67,5,86,3,160,2,149,6,30,6,115,4,246,4,224,7,33,7,237,6,45,6,252,5,180,5,207,5,178,3,123,6,253,3,208,6,188,4,112,5,209,3,236,6,137,4,34,7,140,4,182,6,149,5,181,7,55,6,161,4,96,3,84,8,37,4,7,7,46,3,46,7,245,2,56,8,35,5,6,8,234,4,65,8,147,3,27,9,162,3,187,5,123,4,30,10,159,5,197,8,208,6,42,8,84,6,54,9,174,5,106,10,226,5,84,7,45,7,22,8,183,7,203,6,41,6,170,2,9,5,48,6,253,7,174,5,50,8,194,9,212,7,151,10,18,8,214,2,52,6,196,10,32,9,228,0,79,3,152,9,123,6,36,0,45,1,150,7,165,7,66,254,160,255,106,8,116,5,253,5,77,4,14,0,96,2,101,252,36,253,103,5,190,7,65,5,184,3,88,253,65,1,1,5,244,4,198,249,109,1,173,3,178,3,55,249,202,252,70,9,227,10,29,7,228,10,236,248,29,247,169,248,23,246,152,249,200,248,97,249,44,248,60,251,136,248,59,251,198,247,233,249,204,249,219,249,236,249,85,251,177,249,56,251,65,249,177,250,129,251,176,249,100,248,6,251,145,250,231,250,133,250,185,249,101,251,116,249,225,250,93,250,58,250,169,250,126,252,24,251,221,251,205,250,146,251,42,252,147,251,131,251,32,250,200,251,228,250,4,252,97,251,44,252,50,250,57,252,41,250,36,252,102,252,233,251,203,251,186,252,101,251,166,252,58,251,149,251,239,251,216,251,1,253,152,252,123,251,67,253,144,252,62,253,118,252,250,252,8,252,190,253,200,251,223,252,58,250,177,253,169,251,176,253,134,251,55,253,148,250,128,253,160,250,171,253,221,251,96,254,121,252,82,253,192,252,107,253,60,253,68,254,156,252,22,254,103,252,138,254,248,252,149,253,110,251,183,253,219,253,255,252,229,252,77,254,109,253,238,253,27,253,14,254,187,252,155,254,171,253,233,254,153,252,13,255,137,252,230,254,103,253,232,254,101,253,91,255,208,253,118,254,121,252,150,254,102,254,64,254,185,253,103,254,194,253,199,254,155,254,131,253,220,253,198,253,76,254,128,252,8,254,130,254,11,253,198,255,31,254,91,255,150,253,65,255,138,254,22,255,130,254,34,255,85,253,231,255,32,254,94,254,153,254,38,253,159,254,188,254,99,255,80,254,190,254,118,254,209,254,228,254,152,255,167,253,223,254,212,253,60,255,180,253,106,255,109,253,160,253,39,254,232,255,188,255,64,254,38,254,248,255,6,254,211,255,20,253,72,255,180,252,4,255,123,252,165,255,184,253,159,255,116,253,138,0,4,253,125,255,90,253,244,255,98,253,165,0,253,254,253,255,184,252,149,255,115,252,37,0,32,252,44,0,170,252,97,254,185,252,13,0,23,252,241,254,254,251,203,254,226,252,34,254,192,252,24,254,81,252,168,0,168,251,125,254,95,251,155,255,97,251,216,255,83,252,196,254,250,251,254,252,236,251,143,253,199,251,230,253,56,251,213,254,224,250,76,254,83,251,105,253,113,251,95,255,64,251,78,253,43,251,193,252,104,250,48,253,133,250,19,254,126,252,28,253,102,252,223,252,178,251,110,254,213,249,60,252,219,251,130,253,11,251,98,250,37,250,90,252,34,250,129,252,194,249,204,253,69,249,51,253,162,253,171,253,114,251,195,251,167,250,44,254,102,248,43,250,210,248,71,252,116,248,93,252,37,250,68,255,157,249,91,254,79,250,174,254,88,250,234,255,106,248,90,254,42,248,7,255,16,254,142,255,138,248,13,253,247,250,174,0,85,250,147,255,30,254,255,254,59,251,4,254,175,249,151,0,98,249,208,0,114,253,107,0,141,249,29,0,139,251,23,1,65,251,50,1,52,251,6,254,38,253,81,255,44,251,155,255,55,252,39,2,154,252,22,1,201,252,59,1,205,253,120,1,229,251,228,0,5,254,24,1,169,253,25,1,10,253,253,0,207,254,123,1,13,253,122,255,157,253,148,2,200,252,24,2,207,252,134,2,99,254,49,0,171,254,177,0,59,254,14,2,30,254,77,2,185,255,83,1,111,253,8,1,12,255,39,1,19,255,59,1,125,254,57,2,6,254,247,255,135,254,14,0,96,255,149,2,40,255,40,0,204,254,210,255,95,0,214,0,14,255,167,0,170,255,192,0,200,255,27,0,180,255,31,0,36,0,53,1,150,255,74,255,143,255,74,0,71,254,234,255,23,0,139,0,81,0,245,255,44,0,15,0,169,255,119,255,138,255,49,255,98,255,198,255,16,1,164,255,100,255,71,254,8,0,120,255,128,0,35,255,101,0,38,255,40,0,59,255,180,255,56,254,9,0,67,254,33,0,89,254,226,0,60,0,73,0,34,255,156,0,113,254,24,1,194,254,245,0,171,254,166,0,13,254,83,1,66,255,71,1,37,255,69,1,119,255,167,255,172,253,100,0,141,253,144,0,91,253,231,1,28,0,252,0,121,254,214,0,215,255,26,1,228,255,99,0,226,254,75,1,49,0,203,1,124,254,53,2,143,254,180,1,28,0,80,1,247,255,141,1,89,255,106,2,34,0,84,2,239,255,49,2,116,255,43,1,79,0,10,2,125,0,203,0,2,0,244,0,32,1,255,0,211,0,175,0,82,0,84,2,187,0,5,2,108,0,125,1,255,0,109,1,41,1,241,1,96,1,71,1,174,255,25,0,210,0,115,1,245,0,5,1,3,0,33,2,193,1,140,0,38,1,44,0,39,1,212,0,91,1,244,0,238,1,75,1,16,2,201,0,51,1,93,1,155,1,101,2,28,1,102,2,157,1,208,1,66,1,112,2,141,1,97,0,200,0,96,255,128,1,149,0,106,1,239,1,13,2,13,1,73,2,33,0,235,1,135,255,177,1,171,1,99,2,242,1,4,2,171,0,187,1,241,1,154,2,184,1,19,1,54,2,63,2,146,0,127,2,155,0,158,2,223,255,173,0,212,0,184,2,90,255,89,2,65,255,183,2,23,254,247,1,175,0,230,2,214,0,220,1,116,1,59,4,66,2,18,2,74,2,9,3,169,1,106,3,59,1,73,3,118,1,80,3,91,255,53,2,35,0,223,3,217,255,38,4,73,1,200,2,18,3,72,3,133,2,27,3,149,2,164,2,59,2,150,3,120,2,55,4,161,2,49,3,62,1,132,1,106,3,244,3,52,2,80,3,112,3,108,2,45,2,223,1,159,2,197,1,180,2,212,1,72,3,130,2,76,3,133,2,250,1,172,1,129,3,55,2,69,3,131,1,194,3,243,1,179,2,49,2,171,3,158,3,15,3,40,1,22,3,12,1,4,4,18,2,106,3,73,1,36,2,143,0,163,2,35,1,247,1,66,0,17,4,103,1,18,3,97,0,37,3,33,0,69,3,214,1,255,1,49,0,68,4,71,1,150,4,67,1,3,0,242,0,104,3,218,1,177,2,173,1,49,5,166,2,18,4,108,2,85,4,152,2,65,1,193,0,121,3,182,3,129,4,106,3,125,3,123,2,109,3,94,3,180,3,145,3,13,5,153,2,40,5,127,2,229,3,25,3,122,5,6,4,152,4,244,3,86,4,191,3,130,5,157,3,123,5,147,3,31,2,94,3,92,4,198,4,67,3,166,4,67,3,166,4,191,3,124,4,123,4,96,5,20,5,169,4,135,5,207,4,55,5,61,5,234,2,68,4,175,6,3,5,109,5,49,4,54,5,30,6,129,4,195,5,109,6,113,4,33,7,196,4,32,4,102,5,241,5,194,6,96,6,9,6,84,6,6,6,87,3,60,6,97,3,131,6,181,2,117,3,180,6,239,5,143,4,16,5,161,8,224,6,160,7,213,5,228,7,202,5,254,5,74,7,158,6,216,7,30,6,236,2,225,6,57,3,38,1,112,5,60,4,10,8,109,2,35,5,109,1,7,5,198,0,4,4,232,1,128,5,249,0,147,1,246,3,25,6,68,1,107,1,109,6,20,4,193,0,111,1,242,7,67,7,5,255,67,2,238,2,226,3,13,255,30,0,45,5,111,3,228,255,87,255,112,2,149,3,59,254,159,0,186,0,90,5,154,253,6,0,25,2,136,1,162,255,221,254,13,3,229,0,128,255,214,254,245,0,235,1,67,253,120,253,204,3,21,3,11,254,128,253,178,0,255,0,147,254,122,254,1,255,61,1,66,252,218,254,65,255,228,0,249,252,65,254,157,0,19,255,111,253,48,253,105,254,92,0,139,255,157,253,78,1,26,255,89,253,196,251,112,255,195,254,123,252,163,252,30,253,152,254,171,255,41,253,166,255,237,252,100,0,234,255,121,254,249,254,200,255,183,255,175,254,14,253,5,0,67,255,62,253,144,253,89,0,168,254,121,255,167,251,159,254,19,255,84,253,145,251,237,254,178,251,243,254,77,251,152,0,145,0,46,253,48,251,49,0,80,0,32,251,248,252,8,255,135,1,36,253,221,253,213,1,218,0,1,255,160,252,69,0,110,1,90,255,27,254,80,253,191,0,68,251,84,251,86,255,87,255,228,250,161,249,65,1,214,1,117,250,37,251,192,255,16,1,175,250,8,255,236,1,53,2,47,253,159,253,195,0,229,1,195,253,123,255,171,1,202,0,85,255,138,255,199,0,63,2,2,0,225,255,182,2,243,2,170,250,217,255,40,2,45,2,23,254,15,1,168,2,25,2,13,0,59,254,87,3,186,3,123,255,204,255,175,255,226,2,111,251,125,2,31,4,35,4,161,255,164,2,235,4,57,4,233,1,49,1,63,254,186,3,234,253,228,3,55,252,98,3,222,251,35,4,242,250,106,2,120,250,105,2,54,254,86,5,97,255,29,7,250,252,240,253,242,255,86,4,78,251,123,252,252,252,177,1,24,251,25,251,13,252,210,254,166,253,183,253,9,253,174,249,8,253,243,249,184,252,127,248,208,252,229,253,23,249,69,247,29,255,220,255,14,248,217,248,197,247,154,251,89,246,232,248,66,250,252,0,115,245,97,254,197,253,45,254,229,5,18,6,132,8,183,7,22,9,228,7,191,248,111,249,191,248,37,249,248,247,130,251,170,247,138,249,173,249,181,251,88,249,149,251,191,250,184,249,177,250,154,249,198,250,243,250,211,250,15,251,128,249,143,249,49,250,173,252,190,250,216,248,123,250,116,247,254,250,87,253,7,249,143,249,58,252,198,251,97,251,116,249,226,251,207,251,138,251,122,251,73,251,24,253,6,251,27,252,90,252,153,250,97,252,120,250,14,252,231,250,241,252,69,252,231,251,124,252,31,252,207,252,31,253,201,252,52,252,91,251,30,253,186,251,30,253,126,251,240,252,223,252,214,252,238,252,132,252,248,253,24,252,206,252,124,253,59,252,191,253,142,252,227,253,74,253,97,253,107,252,173,253,126,253,122,253,153,253,68,252,147,253,99,252,253,253,41,253,29,254,209,252,27,254,184,252,190,253,72,254,55,253,190,253,187,254,111,253,98,253,126,254,198,253,71,254,102,253,254,253,237,252,120,254,239,253,246,253,59,254,25,254,89,254,152,253,183,253,151,253,99,255,106,253,244,254,88,253,164,254,190,254,189,254,136,253,68,254,208,254,82,254,180,254,54,254,235,254,44,254,109,253,231,252,193,254,132,253,29,255,214,253,139,254,165,254,178,254,46,255,56,254,64,255,238,253,14,255,40,255,58,255,146,254,142,254,174,254,95,255,103,254,20,253,149,255,132,254,218,254,125,253,33,255,103,253,22,255,27,253,115,255,16,254,126,255,2,254,117,255,185,254,84,255,207,254,206,254,188,253,92,255,249,254,250,254,84,255,189,255,110,254,31,0,146,254,246,255,76,254,170,255,241,253,71,0,135,254,234,255,159,253,244,255,90,253,189,255,193,254,63,0,65,255,35,0,75,255,217,255,14,255,126,0,89,255,116,255,224,253,155,0,215,254,174,0,215,254,38,0,248,255,117,0,132,254,197,0,60,254,240,0,246,253,223,0,153,255,110,0,69,255,87,0,101,255,169,0,209,255,157,0,26,0,173,255,156,255,128,0,80,0,209,0,194,255,6,0,7,0,22,0,5,0,62,1,236,255,248,0,211,255,56,255,193,255,156,0,187,255,250,0,73,255,113,1,130,255,143,255,180,255,114,255,134,255,192,255,2,255,225,255,35,0,79,255,185,255,249,255,171,0,93,0,27,0,108,0,212,0,182,254,47,255,133,255,186,255,233,254,95,0,160,255,20,0,68,255,195,255,198,254,87,0,212,254,178,255,158,254,122,255,11,0,122,0,116,255,122,0,237,254,152,0,219,254,140,0,174,255,138,0,191,254,145,255,32,254,100,255,153,254,76,0,2,255,216,255,133,253,160,255,246,253,79,0,5,254,8,0,244,254,47,1,229,253,68,0,66,254,61,0,246,253,50,1,111,0,189,0,77,254,122,0,133,254,166,0,197,253,114,254,136,253,182,255,21,253,161,255,57,254,194,0,72,252,83,0,226,252,192,0,13,253,192,0,243,252,94,255,149,253,234,0,105,253,215,254,24,254,147,255,60,252,124,255,186,252,188,255,181,252,58,0,168,251,170,255,219,252,213,254,80,252,3,255,246,252,206,255,59,252,219,253,160,254,158,255,32,252,169,254,163,251,197,254,163,251,205,254,125,251,138,254,131,253,26,255,114,251,213,255,237,250,156,255,99,252,119,254,6,251,168,253,79,253,126,255,57,250,200,254,215,250,2,255,72,250,70,254,244,250,155,253,19,251,9,254,35,250,144,254,214,250,26,0,104,250,190,255,49,249,95,255,148,249,45,254,32,249,220,253,143,250,200,253,236,249,153,252,41,250,246,251,149,250,197,253,131,248,240,253,9,249,133,255,151,248,25,255,250,247,189,254,252,247,118,252,72,248,201,253,131,248,148,253,1,248,35,252,203,251,142,254,17,248,64,253,205,246,19,253,76,245,191,251,139,248,159,0,36,248,248,0,142,253,133,255,221,246,62,252,99,253,104,254,157,250,106,251,60,254,148,254,236,251,33,253,124,255,183,0,172,249,16,253,221,253,205,254,247,252,19,251,158,255,41,0,144,252,189,251,255,254,97,0,190,249,215,248,31,0,230,255,124,253,207,253,76,255,222,253,127,254,185,251,102,254,222,252,98,254,197,252,55,254,54,252,22,254,171,251,41,255,108,252,112,255,87,252,19,254,11,251,251,253,29,250,181,0,101,0,180,254,135,252,188,252,87,252,209,253,83,254,139,253,221,253,73,255,175,254,223,253,174,255,6,255,226,254,5,0,124,255,164,254,4,255,219,254,40,254,98,255,100,0,227,255,197,0,20,255,88,254,163,252,43,255,116,255,249,255,85,254,69,254,187,0,159,255,84,253,32,253,219,254,2,1,144,254,104,255,106,255,136,1,159,253,175,0,114,255,43,1,118,255,152,0,137,255,73,1,26,254,204,255,37,1,198,0,73,255,117,0,175,0,75,1,198,255,238,254,231,0,44,1,224,254,74,1,207,254,116,1,145,255,153,1,247,255,167,1,83,0,0,1,67,0,111,1,237,255,248,0,91,0,113,0,221,255,150,1,65,255,154,0,238,0,40,1,5,0,197,0,141,0,221,0,57,1,198,0,211,0,165,1,244,0,78,1,88,0,170,1,13,255,198,1,202,0,40,2,251,255,147,1,35,1,185,0,219,0,45,1,251,0,138,0,128,0,69,0,197,0,32,1,116,255,195,255,188,0,105,1,197,0,86,2,186,1,17,1,34,1,143,0,216,1,226,1,157,0,114,1,159,1,65,1,116,1,129,1,146,1,40,2,155,0,24,0,38,2,7,1,245,255,21,0,104,1,227,0,147,0,2,255,168,1,97,0,110,1,243,255,119,1,141,0,193,1,232,0,140,1,251,1,218,1,16,1,189,2,68,1,106,1,209,255,75,2,148,0,31,2,69,0,144,1,205,255,49,2,59,0,220,0,246,255,96,1,147,0,206,0,211,0,141,2,185,0,51,2,41,1,53,2,28,1,82,2,121,0,254,2,192,0,142,1,118,0,130,2,178,1,233,0,8,1,225,1,211,1,129,0,91,255,187,2,239,0,90,0,26,0,86,1,218,1,201,255,27,0,132,1,94,0,84,255,0,0,213,2,123,1,196,255,81,1,114,1,209,1,95,0,63,1,38,3,83,2,78,0,4,1,241,1,83,3,210,0,48,2,202,1,62,2,48,254,202,0,241,1,113,2,54,255,152,0,48,0,200,2,236,255,54,2,100,0,203,2,199,1,212,1,155,1,93,2,63,1,134,2,195,0,103,2,145,1,26,2,168,2,227,2,201,0,155,2,178,1,186,3,198,1,169,1,134,2,235,1,94,2,169,2,160,1,252,1,241,1,54,3,170,1,47,3,148,2,135,2,116,2,204,2,185,2,210,1,106,2,201,1,173,2,204,1,109,1,53,1,209,2,55,2,68,3,89,2,97,2,44,1,57,3,203,1,175,3,175,2,169,2,21,2,147,3,86,2,79,2,243,0,108,3,195,1,106,3,164,1,18,3,61,1,220,2,220,0,154,3,61,1,84,4,111,1,19,2,210,1,4,4,137,2,29,4,103,2,10,4,41,2,61,3,90,2,253,3,31,3,159,3,35,3,110,3,251,2,31,3,240,1,93,5,5,3,73,2,2,3,35,3,162,3,75,4,25,3,198,4,94,3,185,4,127,3,1,4,215,2,4,3,77,3,148,4,91,4,99,3,253,3,62,3,245,3,73,3,142,3,250,1,191,2,215,4,53,4,108,2,51,3,172,4,59,4,131,4,57,4,118,4,139,3,11,6,97,4,29,5,136,2,63,5,100,2,204,5,220,3,199,5,169,3,217,3,48,5,187,3,61,5,173,1,142,3,73,3,58,5,52,2,155,4,156,1,132,4,147,5,40,5,154,5,50,5,128,2,248,2,190,6,130,5,190,0,43,2,49,4,237,3,170,1,1,1,71,3,212,3,235,0,231,0,240,5,143,4,109,0,37,1,246,3,33,6,49,1,142,0,124,4,27,2,221,254,148,255,189,4,204,3,22,0,40,255,155,2,60,3,30,254,182,1,197,1,151,5,187,253,90,254,21,3,131,1,154,254,58,254,174,0,12,3,220,255,140,254,134,1,122,255,139,253,160,0,206,254,239,2,22,251,181,254,177,0,10,2,8,255,62,2,5,255,127,2,237,253,151,1,172,253,138,1,93,254,21,3,151,253,33,3,38,252,143,1,167,252,215,2,249,255,6,2,65,253,54,1,137,251,232,255,22,252,31,1,64,252,107,1,237,250,56,1,2,250,245,0,235,249,49,1,28,0,153,0,165,252,81,255,223,255,76,1,138,250,102,255,212,0,154,1,175,253,59,255,188,251,64,253,120,252,191,255,26,1,111,1,106,252,82,253,89,1,93,0,254,254,155,254,184,2,132,2,75,253,228,255,192,1,237,1,239,254,193,0,15,2,34,2,13,255,255,253,128,1,120,255,17,1,159,254,0,2,114,255,25,2,58,255,173,3,238,2,83,0,248,0,66,2,93,3,200,255,80,2,74,3,44,0,124,3,24,0,33,0,122,3,240,255,214,3,63,3,118,5,255,5,106,7,180,6,96,5,156,7,185,5,22,252,95,252,184,251,77,251,127,253,93,252,164,253,63,252,245,252,95,253,189,252,236,252,96,254,104,253,54,254,2,253,116,253,247,253,106,253,17,254,1,252,3,254,1,252,84,254,68,254,216,253,144,254,63,254,33,254,45,255,226,251,121,252,196,254,7,255,199,253,177,253,199,253,237,254,227,253,65,255,52,253,68,255,182,252,248,254,179,254,8,255,194,254,28,255,237,254,1,0,201,253,28,255,141,255,35,255,18,255,138,254,59,255,5,254,34,255,189,253,254,254,80,254,195,255,12,255,167,254,2,0,174,254,39,0,41,255,87,255,198,255,0,0,200,255,250,255,53,255,125,255,1,0,70,255,251,255,45,255,6,0,132,254,11,0,94,254,140,255,131,0,122,255,113,0,89,0,252,255,71,0,254,255,237,255,64,255,6,1,24,0,189,0,151,0,123,255,147,255,186,0,103,255,166,0,37,255,37,0,139,0,193,0,171,0,81,1,124,0,158,0,195,255,141,0,226,0,243,255,190,0,231,0,34,0,98,1,109,0,60,1,201,0,244,0,164,0,74,1,171,255,134,1,172,255,254,0,71,1,1,1,79,1,235,1,147,0,220,1,105,0,54,0,77,0,181,1,114,1,165,1,58,1,193,1,86,1,73,1,126,0,161,2,36,1,59,2,132,1,243,0,193,0,141,2,64,1,109,2,24,1,194,0,124,1,5,2,69,2,45,0,67,1,111,0,166,1,233,1,139,1,222,2,22,2,110,2,34,2,230,1,246,1,62,1,60,2,189,0,38,2,129,1,166,1,99,255,153,0,131,255,126,1,59,255,130,1,249,254,78,1,228,0,185,2,68,255,1,0,51,0,41,1,5,254,213,0,136,254,141,1,232,255,255,0,221,253,89,0,10,254,162,255,131,1,179,0,148,253,68,0,84,253,112,0,126,253,162,254,252,254,172,0,74,254,188,254,8,1,136,2,60,252,252,255,159,251,7,0,122,255,134,0,147,251,206,254,143,0,96,0,92,254,15,254,59,251,162,254,9,250,83,253,95,255,72,0,105,3,179,2,220,2,27,1,153,3,97,1,78,1,219,1,71,4,53,3,96,3,12,2,75,3,241,1,202,2,199,2,20,3,238,2,52,4,202,2,180,4,241,2,65,2,150,2,124,245,170,192,38,3,44,7,95,251,33,228,37,12,28,4,40,248,202,208,85,16,107,5,192,249,99,218,69,9,145,5,232,249,78,219,176,12,193,7,210,251,214,230,35,7,16,9,184,252,64,236,173,3,242,12,199,254,163,248,47,9,161,11,41,254,234,244,32,14,116,9,247,252,183,237,123,13,24,12,98,254,70,246,139,11,205,16,72,0,178,1,56,7,148,17,139,0,68,3,44,15,40,21,157,1,180,9,163,4,42,28,67,3,166,19,11,12,40,35,139,4,90,27,216,28,115,3,37,247,177,202,74,23,226,5,58,250,60,221,35,20,86,8,61,252,88,233,8,31,217,7,228,251,65,231,107,25,202,8,139,252,49,235,246,29,192,10,180,253,47,242,64,23,200,11,60,254,92,245,34,19,180,14,131,255,17,253,77,27,4,14,60,255,103,251,238,31,138,15,213,255,252,254,176,23,52,17,107,0,133,2,29,30,223,19,64,1,136,7,147,21,133,23,57,2,98,13,89,30,214,27,50,3,62,19,172,23,2,31,209,3,253,22,218,21,223,44,243,5,212,35,85,41,76,5,159,249,153,217,89,35,61,6,145,250,68,223,66,38,243,7,247,251,180,231,242,34,111,9,244,252,164,237,56,40,24,10,87,253,253,239,191,36,174,10,171,253,245,241,252,33,146,12,156,254,160,247,29,38,67,13,235,254,123,249,193,39,52,15,181,255,58,254,210,35,176,17,148,0,123,3,168,39,140,19,40,1,245,6,154,35,103,22,241,1,177,11,4,41,122,24,116,2,198,14,126,39,207,29,151,3,158,21,140,34,23,34,93,4,72,26,252,34,208,48,112,6,193,38,124,50,208,3,185,247,47,206,171,44,219,6,28,251,141,226,106,47,24,9,189,252,96,236,124,44,64,9,214,252,248,236,204,41,248,11,83,254,236,245,44,48,45,11,238,253,136,243,202,45,255,12,205,254,200,248,6,44,116,14,106,255,120,252,109,42,61,17,110,0,151,2,50,47,181,17,150,0,134,3,19,44,85,20,98,1,84,8,184,46,161,24,125,2,253,14,159,43,110,29,132,3,44,21,96,47,137,32,25,4,168,24,217,42,25,42,149,5,156,33,60,40,224,67,87,8,53,50,75,54,145,6,220,250,15,225,36,49,253,7,254,251,221,231,209,51,135,9,2,253,254,237,209,54,173,11,47,254,14,245,140,52,26,12,99,254,78,246,108,48,74,14,89,255,18,252,198,52,196,14,137,255,55,253,80,50,176,16,62,0,118,1,221,52,253,18,253,0,243,5,123,49,81,21,168,1,248,9,30,54,218,23,78,2,223,13,231,50,83,25,166,2,244,15,245,52,41,30,169,3,7,22,157,50,95,36,189,4,136,28,146,53,31,45,252,5,5,36,47,49,102,59,146,7,147,45,9,59,4,6,91,250,4,222,224,58,29,9,192,252,113,236,191,56,207,9,45,253,0,239,100,57,127,12,147,254,107,247,22,60,232,13,49,255,33,251,53,55,120,15,206,255,212,254,254,58,140,16,50,0,42,1,252,55,216,18,242,0,174,5,254,57,75,21,166,1,238,9,202,59,195,23,72,2,190,13,249,55,232,26,0,3,15,18,212,58,9,30,162,3,226,21,70,56,210,36,207,4,245,28,27,60,13,38,0,5,26,30,232,57,191,55,52,7,94,43,32,53,107,97,109,10,195,62,12,64,177,7,198,251,139,230,177,65,16,11,223,253,45,243,97,61,27,11,229,253,80,243,232,62,8,13,209,254,223,248,0,64,123,15,207,255,218,254,44,66,227,17,165,0,224,3,95,61,247,17,171,0,6,4,94,63,72,21,165,1,233,9,192,65,238,24,143,2,105,15,129,61,229,27,53,3,80,19,198,63,45,29,120,3,223,20,227,64,176,33,76,4,222,25,132,66,178,40,99,5,111,32,33,62,41,46,29,6,207,36,238,65,98,57,95,7,96,44,131,64,134,81,102,9,147,56,222,70,35,8,25,252,131,232,201,75,106,12,137,254,47,247,100,68,98,13,248,254,203,249,86,78,187,15,231,255,105,255,149,70,153,16,54,0,70,1,8,74,202,19,58,1,98,7,47,69,26,21,153,1,157,9,123,77,48,24,98,2,92,14,30,70,102,27,27,3,176,18,70,83,197,30,198,3,184,22,246,69,73,36,186,4,115,28,200,74,74,36,186,4,116,28,37,80,117,44,230,5,129,35,155,70,149,56,74,7,226,43,31,78,218,69,129,8,52,51,154,73,252,127,0,12,62,72,61,42,81,112,63,11,181,67,0,80,225,10,198,253,153,242,153,73,194,25,191,2,139,16,81,24,245,28,108,3,156,20,51,67,204,40,103,5,133,32,122,84,245,4,61,249,74,215,143,82,71,17,113,0,171,2,40,44,20,6,106,250,95,222,61,74,20,50,150,6,164,39,215,67,194,9,37,253,210,238,194,69,225,18,244,0,192,5,10,39,194,9,37,253,210,238,122,68,184,30,196,3,170,22,174,55,92,7,133,251,5,229,20,62,81,12,125,254,233,246,61,26,10,7,67,251,121,227,10,71,225,78,53,9,109,55,102,70,215,11,67,254,138,245,71,65,225,22,16,2,109,12,143,34,174,15,226,255,76,255,20,62,10,35,134,4,60,27,102,70,112,5,198,249,129,218,71,65,0,16,0,0,0,0,0,32,143,2,108,245,79,192,133,59,102,54,16,7,132,42,174,55,40,12,106,254,116,246,10,55,61,18,193,0,141,4,30,21,143,10,154,253,143,241,122,52,153,25,182,2,84,16,163,48,133,3,67,247,100,203,163,48,102,10,131,253,7,241,184,14,143,2,108,245,79,192,153,57,215,91,22,10,183,60,225,74,153,9,13,253,62,238,184,78,215,19,62,1,121,7,225,26,0,16,0,0,0,0,0,80,112,33,65,4,156,25,204,76,225,2,26,246,105,196,61,74,163,16,58,0,91,1,184,30,40,8,29,252,151,232,204,44,0,48,87,6,43,38,20,62,194,5,26,250,126,220,112,61,20,18,180,0,62,4,215,35,153,5,240,249,131,219,184,62,92,27,25,3,164,18,235,57,225,2,26,246,105,196,225,58,204,8,140,252,55,235,215,19,204,4,12,249,38,214,215,51,174,67,83,8,27,50,163,64,30,9,193,252,118,236,225,58,184,22,6,2,46,12,92,15,102,14,100,255,86,252,174,55,153,33,72,4,198,25,235,65,10,3,106,246,74,198,225,58,225,14,149,255,122,253,174,23,102,2,12,245,17,190,122,36,40,36,180,4,83,28,215,51,225,6,33,251,172,226,215,51,194,13,33,255,193,250,153,9,174,7,196,251,127,230,204,44,153,21,187,1,108,10,245,40,225,2,26,246,105,196,112,45,122,12,145,254,92,247,194,5,10,3,106,246,74,198,0,64,248,65,226,67,190,69,142,71,82,73,12,75,188,76,98,78,0,80,150,81,35,83,170,84,42,86,163,87,22,89,130,90,234,91,76,93,168,94,0,96,83,97,161,98,236,99,49,101,115,102,177,103,235,104,34,106,85,107,132,108,177,109,218,110,0,112,35,113,67,114,97,115,123,116,147,117,169,118,188,119,204,120,218,121,230,122,239,123,247,124,252,125,255,126,255,127,255,127,61,10,63,10,69,10,78,10,91,10,108,10,129,10,153,10,181,10,212,10,248,10,31,11,74,11,120,11,170,11,224,11,25,12,86,12,151,12,219,12,35,13,110,13,189,13,15,14,101,14,190,14,27,15,123,15,223,15,70,16,176,16,30,17,143,17,3,18,123,18,245,18,115,19,244,19,120,20,0,21,138,21,23,22,168,22,59,23,209,23,106,24,6,25,165,25,70,26,234,26,145,27,59,28,231,28,149,29,70,30,250,30,176,31,104,32,35,33,224,33,159,34,97,35,36,36,234,36,178,37,124,38,71,39,21,40,228,40,181,41,136,42,93,43,51,44,11,45,228,45,191,46,155,47,121,48,88,49,56,50,26,51,252,51,224,52,196,53,170,54,145,55,120,56,96,57,73,58,51,59,29,60,8,61,243,61,223,62,203,63,184,64,165,65,146,66,127,67,108,68,90,69,71,70,52,71,33,72,14,73,251,73,231,74,211,75,191,76,170,77,149,78,126,79,104,80,80,81,56,82,31,83,5,84,234,84,207,85,178,86,148,87,116,88,84,89,50,90,15,91,235,91,197,92,157,93,117,94,74,95,30,96,240,96,192,97,143,98,91,99,38,100,239,100,181,101,122,102,60,103,253,103,187,104,119,105,48,106,232,106,156,107,79,108,255,108,172,109,87,110,255,110,165,111,71,112,231,112,133,113,31,114,183,114,75,115,221,115,108,116,248,116,129,117,6,118,137,118,8,119,133,119,254,119,116,120,230,120,86,121,194,121,42,122,144,122,242,122,80,123,171,123,3,124,87,124,167,124,244,124,62,125,132,125,198,125,5,126,64,126,120,126,172,126,220,126,9,127,49,127,87,127,120,127,150,127,176,127,199,127,217,127,232,127,243,127,251,127,255,127,255,127,229,127,153,127,25,127,103,126,129,125],"i8",ALLOC_NONE,Runtime.GLOBAL_BASE+20480);allocate([106,124,33,123,167,121,252,119,34,118,24,116,223,113,122,111,231,108,41,106,65,103,47,100,245,96,149,93,15,90,101,86,153,82,171,78,158,74,116,70,45,66,204,61,82,57,193,52,27,48,98,43,151,38,189,33,213,28,226,23,230,18,226,13,216,8,203,3,61,10,64,10,73,10,88,10,108,10,135,10,167,10,205,10,249,10,43,11,99,11,160,11,227,11,44,12,122,12,207,12,40,13,136,13,237,13,87,14,199,14,60,15,183,15,55,16,189,16,71,17,215,17,108,18,6,19,165,19,73,20,242,20,159,21,82,22,9,23,196,23,133,24,73,25,18,26,224,26,177,27,135,28,97,29,62,30,32,31,5,32,238,32,219,33,203,34,191,35,182,36,176,37,174,38,174,39,177,40,184,41,193,42,204,43,218,44,235,45,254,46,19,48,42,49,67,50,94,51,123,52,154,53,186,54,219,55,254,56,34,58,71,59,109,60,148,61,188,62,228,63,13,65,54,66,96,67,138,68,180,69,221,70,7,72,48,73,89,74,130,75,169,76,208,77,246,78,27,80,63,81,98,82,132,83,164,84,194,85,223,86,250,87,19,89,43,90,64,91,83,92,99,93,113,94,125,95,134,96,140,97,143,98,144,99,141,100,135,101,126,102,114,103,98,104,79,105,56,106,30,107,255,107,221,108,183,109,140,110,94,111,43,112,244,112,185,113,121,114,53,115,236,115,158,116,76,117,245,117,153,118,55,119,209,119,102,120,246,120,129,121,6,122,134,122,1,123,118,123,230,123,81,124,182,124,21,125,111,125,195,125,17,126,90,126,157,126,219,126,18,127,68,127,112,127,150,127,183,127,209,127,230,127,244,127,253,127,255,127,255,127,244,127,208,127,149,127,66,127,215,126,85,126,188,125,12,125,69,124,104,123,117,122,108,121,78,120,28,119,213,117,122,116,13,115,140,113,250,111,87,110,162,108,222,106,11,105,40,103,57,101,60,99,51,97,30,95,255,92,215,90,165,88,108,86,44,84,229,81,154,79,74,77,247,74,161,72,74,70,243,67,156,65,71,63,244,60,164,58,88,56,18,54,209,51,152,49,103,47,62,45,31,43,11,41,2,39,5,37,21,35,51,33,95,31,155,29,231,27,67,26,177,24,49,23,195,21,105,20,34,19,239,17,209,16,201,15,214,14,249,13,50,13,130,12,232,11,102,11,252,10,169,10,109,10,73,10,61,10,61,10,63,10,67,10,74,10,84,10,96,10,111,10,129,10,150,10,174,10,200,10,229,10,5,11,39,11,77,11,117,11,159,11,205,11,253,11,48,12,101,12,157,12,216,12,22,13,86,13,153,13,222,13,38,14,113,14,190,14,13,15,96,15,181,15,12,16,102,16,194,16,33,17,130,17,230,17,76,18,180,18,31,19,140,19,252,19,110,20,226,20,88,21,209,21,76,22,201,22,72,23,202,23,77,24,211,24,91,25,229,25,113,26,254,26,142,27,32,28,180,28,74,29,225,29,123,30,22,31,179,31,82,32,242,32,149,33,57,34,222,34,133,35,46,36,216,36,132,37,50,38,224,38,145,39,66,40,245,40,169,41,95,42,22,43,206,43,135,44,66,45,253,45,186,46,120,47,54,48,246,48,183,49,120,50,59,51,254,51,194,52,135,53,77,54,19,55,218,55,161,56,106,57,50,58,252,58,197,59,144,60,90,61,37,62,240,62,188,63,136,64,84,65,32,66,236,66,185,67,133,68,82,69,30,70,235,70,183,71,132,72,80,73,28,74,231,74,179,75,126,76,73,77,19,78,221,78,166,79,111,80,56,81,0,82,199,82,142,83,84,84,25,85,221,85,161,86,100,87,38,88,231,88,167,89,103,90,37,91,226,91,158,92,89,93,19,94,204,94,131,95,57,96,238,96,162,97,84,98,5,99,181,99,99,100,15,101,186,101,100,102,12,103,178,103,87,104,250,104,155,105,59,106,217,106,117,107,16,108,168,108,63,109,211,109,102,110,247,110,134,111,19,112,158,112,39,113,174,113,50,114,181,114,53,115,179,115,47,116,169,116,33,117,150,117,9,118,122,118,232,118,84,119,190,119,37,120,138,120,236,120,76,121,170,121,5,122,94,122,180,122,7,123,88,123,167,123,242,123,60,124,130,124,198,124,8,125,71,125,131,125,188,125,243,125,39,126,89,126,136,126,180,126,221,126,4,127,40,127,73,127,103,127,131,127,156,127,178,127,197,127,214,127,228,127,239,127,247,127,253,127,255,127,255,127,97,125,160,117,15,105,48,88,181,67,116,44,98,19,68,101,99,111,100,101,114,0,101,110,99,111,100,101,114,0],"i8",ALLOC_NONE,Runtime.GLOBAL_BASE+30720);var tempDoublePtr=Runtime.alignMemory(allocate(12,"i8",ALLOC_STATIC),8);assert(tempDoublePtr%8==0);function copyTempFloat(ptr){HEAP8[tempDoublePtr]=HEAP8[ptr];HEAP8[tempDoublePtr+1]=HEAP8[ptr+1];HEAP8[tempDoublePtr+2]=HEAP8[ptr+2];HEAP8[tempDoublePtr+3]=HEAP8[ptr+3]}function copyTempDouble(ptr){HEAP8[tempDoublePtr]=HEAP8[ptr];HEAP8[tempDoublePtr+1]=HEAP8[ptr+1];HEAP8[tempDoublePtr+2]=HEAP8[ptr+2];HEAP8[tempDoublePtr+3]=HEAP8[ptr+3];HEAP8[tempDoublePtr+4]=HEAP8[ptr+4];HEAP8[tempDoublePtr+5]=HEAP8[ptr+5];HEAP8[tempDoublePtr+6]=HEAP8[ptr+6];HEAP8[tempDoublePtr+7]=HEAP8[ptr+7]}function _sbrk(bytes){var self=_sbrk;if(!self.called){DYNAMICTOP=alignMemoryPage(DYNAMICTOP);self.called=true;assert(Runtime.dynamicAlloc);self.alloc=Runtime.dynamicAlloc;Runtime.dynamicAlloc=function(){abort("cannot dynamically allocate, sbrk now has control")}}var ret=DYNAMICTOP;if(bytes!=0){var success=self.alloc(bytes);if(!success)return-1>>>0}return ret}function ___setErrNo(value){if(Module["___errno_location"])HEAP32[Module["___errno_location"]()>>2]=value;return value}var ERRNO_CODES={EPERM:1,ENOENT:2,ESRCH:3,EINTR:4,EIO:5,ENXIO:6,E2BIG:7,ENOEXEC:8,EBADF:9,ECHILD:10,EAGAIN:11,EWOULDBLOCK:11,ENOMEM:12,EACCES:13,EFAULT:14,ENOTBLK:15,EBUSY:16,EEXIST:17,EXDEV:18,ENODEV:19,ENOTDIR:20,EISDIR:21,EINVAL:22,ENFILE:23,EMFILE:24,ENOTTY:25,ETXTBSY:26,EFBIG:27,ENOSPC:28,ESPIPE:29,EROFS:30,EMLINK:31,EPIPE:32,EDOM:33,ERANGE:34,ENOMSG:42,EIDRM:43,ECHRNG:44,EL2NSYNC:45,EL3HLT:46,EL3RST:47,ELNRNG:48,EUNATCH:49,ENOCSI:50,EL2HLT:51,EDEADLK:35,ENOLCK:37,EBADE:52,EBADR:53,EXFULL:54,ENOANO:55,EBADRQC:56,EBADSLT:57,EDEADLOCK:35,EBFONT:59,ENOSTR:60,ENODATA:61,ETIME:62,ENOSR:63,ENONET:64,ENOPKG:65,EREMOTE:66,ENOLINK:67,EADV:68,ESRMNT:69,ECOMM:70,EPROTO:71,EMULTIHOP:72,EDOTDOT:73,EBADMSG:74,ENOTUNIQ:76,EBADFD:77,EREMCHG:78,ELIBACC:79,ELIBBAD:80,ELIBSCN:81,ELIBMAX:82,ELIBEXEC:83,ENOSYS:38,ENOTEMPTY:39,ENAMETOOLONG:36,ELOOP:40,EOPNOTSUPP:95,EPFNOSUPPORT:96,ECONNRESET:104,ENOBUFS:105,EAFNOSUPPORT:97,EPROTOTYPE:91,ENOTSOCK:88,ENOPROTOOPT:92,ESHUTDOWN:108,ECONNREFUSED:111,EADDRINUSE:98,ECONNABORTED:103,ENETUNREACH:101,ENETDOWN:100,ETIMEDOUT:110,EHOSTDOWN:112,EHOSTUNREACH:113,EINPROGRESS:115,EALREADY:114,EDESTADDRREQ:89,EMSGSIZE:90,EPROTONOSUPPORT:93,ESOCKTNOSUPPORT:94,EADDRNOTAVAIL:99,ENETRESET:102,EISCONN:106,ENOTCONN:107,ETOOMANYREFS:109,EUSERS:87,EDQUOT:122,ESTALE:116,ENOTSUP:95,ENOMEDIUM:123,EILSEQ:84,EOVERFLOW:75,ECANCELED:125,ENOTRECOVERABLE:131,EOWNERDEAD:130,ESTRPIPE:86};function _sysconf(name){switch(name){case 30:return PAGE_SIZE;case 85:return totalMemory/PAGE_SIZE;case 132:case 133:case 12:case 137:case 138:case 15:case 235:case 16:case 17:case 18:case 19:case 20:case 149:case 13:case 10:case 236:case 153:case 9:case 21:case 22:case 159:case 154:case 14:case 77:case 78:case 139:case 80:case 81:case 82:case 68:case 67:case 164:case 11:case 29:case 47:case 48:case 95:case 52:case 51:case 46:return 200809;case 79:return 0;case 27:case 246:case 127:case 128:case 23:case 24:case 160:case 161:case 181:case 182:case 242:case 183:case 184:case 243:case 244:case 245:case 165:case 178:case 179:case 49:case 50:case 168:case 169:case 175:case 170:case 171:case 172:case 97:case 76:case 32:case 173:case 35:return-1;case 176:case 177:case 7:case 155:case 8:case 157:case 125:case 126:case 92:case 93:case 129:case 130:case 131:case 94:case 91:return 1;case 74:case 60:case 69:case 70:case 4:return 1024;case 31:case 42:case 72:return 32;case 87:case 26:case 33:return 2147483647;case 34:case 1:return 47839;case 38:case 36:return 99;case 43:case 37:return 2048;case 0:return 2097152;case 3:return 65536;case 28:return 32768;case 44:return 32767;case 75:return 16384;case 39:return 1e3;case 89:return 700;case 71:return 256;case 40:return 255;case 2:return 100;case 180:return 64;case 25:return 20;case 5:return 16;case 6:return 6;case 73:return 4;case 84:{if(typeof navigator==="object")return navigator["hardwareConcurrency"]||1;return 1}}___setErrNo(ERRNO_CODES.EINVAL);return-1}function _emscripten_memcpy_big(dest,src,num){HEAPU8.set(HEAPU8.subarray(src,src+num),dest);return dest}Module["_memcpy"]=_memcpy;Module["_memmove"]=_memmove;Module["_memset"]=_memset;function _abort(){Module["abort"]()}var ERRNO_MESSAGES={0:"Success",1:"Not super-user",2:"No such file or directory",3:"No such process",4:"Interrupted system call",5:"I/O error",6:"No such device or address",7:"Arg list too long",8:"Exec format error",9:"Bad file number",10:"No children",11:"No more processes",12:"Not enough core",13:"Permission denied",14:"Bad address",15:"Block device required",16:"Mount device busy",17:"File exists",18:"Cross-device link",19:"No such device",20:"Not a directory",21:"Is a directory",22:"Invalid argument",23:"Too many open files in system",24:"Too many open files",25:"Not a typewriter",26:"Text file busy",27:"File too large",28:"No space left on device",29:"Illegal seek",30:"Read only file system",31:"Too many links",32:"Broken pipe",33:"Math arg out of domain of func",34:"Math result not representable",35:"File locking deadlock error",36:"File or path name too long",37:"No record locks available",38:"Function not implemented",39:"Directory not empty",40:"Too many symbolic links",42:"No message of desired type",43:"Identifier removed",44:"Channel number out of range",45:"Level 2 not synchronized",46:"Level 3 halted",47:"Level 3 reset",48:"Link number out of range",49:"Protocol driver not attached",50:"No CSI structure available",51:"Level 2 halted",52:"Invalid exchange",53:"Invalid request descriptor",54:"Exchange full",55:"No anode",56:"Invalid request code",57:"Invalid slot",59:"Bad font file fmt",60:"Device not a stream",61:"No data (for no delay io)",62:"Timer expired",63:"Out of streams resources",64:"Machine is not on the network",65:"Package not installed",66:"The object is remote",67:"The link has been severed",68:"Advertise error",69:"Srmount error",70:"Communication error on send",71:"Protocol error",72:"Multihop attempted",73:"Cross mount point (not really error)",74:"Trying to read unreadable message",75:"Value too large for defined data type",76:"Given log. name not unique",77:"f.d. invalid for this operation",78:"Remote address changed",79:"Can   access a needed shared lib",80:"Accessing a corrupted shared lib",81:".lib section in a.out corrupted",82:"Attempting to link in too many libs",83:"Attempting to exec a shared library",84:"Illegal byte sequence",86:"Streams pipe error",87:"Too many users",88:"Socket operation on non-socket",89:"Destination address required",90:"Message too long",91:"Protocol wrong type for socket",92:"Protocol not available",93:"Unknown protocol",94:"Socket type not supported",95:"Not supported",96:"Protocol family not supported",97:"Address family not supported by protocol family",98:"Address already in use",99:"Address not available",100:"Network interface is not configured",101:"Network is unreachable",102:"Connection reset by network",103:"Connection aborted",104:"Connection reset by peer",105:"No buffer space available",106:"Socket is already connected",107:"Socket is not connected",108:"Can\'t send after socket shutdown",109:"Too many references",110:"Connection timed out",111:"Connection refused",112:"Host is down",113:"Host is unreachable",114:"Socket already connected",115:"Connection already in progress",116:"Stale file handle",122:"Quota exceeded",123:"No medium (in tape drive)",125:"Operation canceled",130:"Previous owner died",131:"State not recoverable"};var TTY={ttys:[],init:function(){},shutdown:function(){},register:function(dev,ops){TTY.ttys[dev]={input:[],output:[],ops:ops};FS.registerDevice(dev,TTY.stream_ops)},stream_ops:{open:function(stream){var tty=TTY.ttys[stream.node.rdev];if(!tty){throw new FS.ErrnoError(ERRNO_CODES.ENODEV)}stream.tty=tty;stream.seekable=false},close:function(stream){stream.tty.ops.flush(stream.tty)},flush:function(stream){stream.tty.ops.flush(stream.tty)},read:function(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.get_char){throw new FS.ErrnoError(ERRNO_CODES.ENXIO)}var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=stream.tty.ops.get_char(stream.tty)}catch(e){throw new FS.ErrnoError(ERRNO_CODES.EIO)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.timestamp=Date.now()}return bytesRead},write:function(stream,buffer,offset,length,pos){if(!stream.tty||!stream.tty.ops.put_char){throw new FS.ErrnoError(ERRNO_CODES.ENXIO)}for(var i=0;i<length;i++){try{stream.tty.ops.put_char(stream.tty,buffer[offset+i])}catch(e){throw new FS.ErrnoError(ERRNO_CODES.EIO)}}if(length){stream.node.timestamp=Date.now()}return i}},default_tty_ops:{get_char:function(tty){if(!tty.input.length){var result=null;if(typeof window!="undefined"&&typeof window.prompt=="function"){result=window.prompt("Input: ");if(result!==null){result+="\\n"}}else if(typeof readline=="function"){result=readline();if(result!==null){result+="\\n"}}if(!result){return null}tty.input=intArrayFromString(result,true)}return tty.input.shift()},put_char:function(tty,val){if(val===null||val===10){Module["print"](UTF8ArrayToString(tty.output,0));tty.output=[]}else{if(val!=0)tty.output.push(val)}},flush:function(tty){if(tty.output&&tty.output.length>0){Module["print"](UTF8ArrayToString(tty.output,0));tty.output=[]}}},default_tty1_ops:{put_char:function(tty,val){if(val===null||val===10){Module["printErr"](UTF8ArrayToString(tty.output,0));tty.output=[]}else{if(val!=0)tty.output.push(val)}},flush:function(tty){if(tty.output&&tty.output.length>0){Module["printErr"](UTF8ArrayToString(tty.output,0));tty.output=[]}}}};var MEMFS={ops_table:null,mount:function(mount){return MEMFS.createNode(null,"/",16384|511,0)},createNode:function(parent,name,mode,dev){if(FS.isBlkdev(mode)||FS.isFIFO(mode)){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}if(!MEMFS.ops_table){MEMFS.ops_table={dir:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,lookup:MEMFS.node_ops.lookup,mknod:MEMFS.node_ops.mknod,rename:MEMFS.node_ops.rename,unlink:MEMFS.node_ops.unlink,rmdir:MEMFS.node_ops.rmdir,readdir:MEMFS.node_ops.readdir,symlink:MEMFS.node_ops.symlink},stream:{llseek:MEMFS.stream_ops.llseek}},file:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:{llseek:MEMFS.stream_ops.llseek,read:MEMFS.stream_ops.read,write:MEMFS.stream_ops.write,allocate:MEMFS.stream_ops.allocate,mmap:MEMFS.stream_ops.mmap,msync:MEMFS.stream_ops.msync}},link:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr,readlink:MEMFS.node_ops.readlink},stream:{}},chrdev:{node:{getattr:MEMFS.node_ops.getattr,setattr:MEMFS.node_ops.setattr},stream:FS.chrdev_stream_ops}}}var node=FS.createNode(parent,name,mode,dev);if(FS.isDir(node.mode)){node.node_ops=MEMFS.ops_table.dir.node;node.stream_ops=MEMFS.ops_table.dir.stream;node.contents={}}else if(FS.isFile(node.mode)){node.node_ops=MEMFS.ops_table.file.node;node.stream_ops=MEMFS.ops_table.file.stream;node.usedBytes=0;node.contents=null}else if(FS.isLink(node.mode)){node.node_ops=MEMFS.ops_table.link.node;node.stream_ops=MEMFS.ops_table.link.stream}else if(FS.isChrdev(node.mode)){node.node_ops=MEMFS.ops_table.chrdev.node;node.stream_ops=MEMFS.ops_table.chrdev.stream}node.timestamp=Date.now();if(parent){parent.contents[name]=node}return node},getFileDataAsRegularArray:function(node){if(node.contents&&node.contents.subarray){var arr=[];for(var i=0;i<node.usedBytes;++i)arr.push(node.contents[i]);return arr}return node.contents},getFileDataAsTypedArray:function(node){if(!node.contents)return new Uint8Array;if(node.contents.subarray)return node.contents.subarray(0,node.usedBytes);return new Uint8Array(node.contents)},expandFileStorage:function(node,newCapacity){if(node.contents&&node.contents.subarray&&newCapacity>node.contents.length){node.contents=MEMFS.getFileDataAsRegularArray(node);node.usedBytes=node.contents.length}if(!node.contents||node.contents.subarray){var prevCapacity=node.contents?node.contents.buffer.byteLength:0;if(prevCapacity>=newCapacity)return;var CAPACITY_DOUBLING_MAX=1024*1024;newCapacity=Math.max(newCapacity,prevCapacity*(prevCapacity<CAPACITY_DOUBLING_MAX?2:1.125)|0);if(prevCapacity!=0)newCapacity=Math.max(newCapacity,256);var oldContents=node.contents;node.contents=new Uint8Array(newCapacity);if(node.usedBytes>0)node.contents.set(oldContents.subarray(0,node.usedBytes),0);return}if(!node.contents&&newCapacity>0)node.contents=[];while(node.contents.length<newCapacity)node.contents.push(0)},resizeFileStorage:function(node,newSize){if(node.usedBytes==newSize)return;if(newSize==0){node.contents=null;node.usedBytes=0;return}if(!node.contents||node.contents.subarray){var oldContents=node.contents;node.contents=new Uint8Array(new ArrayBuffer(newSize));if(oldContents){node.contents.set(oldContents.subarray(0,Math.min(newSize,node.usedBytes)))}node.usedBytes=newSize;return}if(!node.contents)node.contents=[];if(node.contents.length>newSize)node.contents.length=newSize;else while(node.contents.length<newSize)node.contents.push(0);node.usedBytes=newSize},node_ops:{getattr:function(node){var attr={};attr.dev=FS.isChrdev(node.mode)?node.id:1;attr.ino=node.id;attr.mode=node.mode;attr.nlink=1;attr.uid=0;attr.gid=0;attr.rdev=node.rdev;if(FS.isDir(node.mode)){attr.size=4096}else if(FS.isFile(node.mode)){attr.size=node.usedBytes}else if(FS.isLink(node.mode)){attr.size=node.link.length}else{attr.size=0}attr.atime=new Date(node.timestamp);attr.mtime=new Date(node.timestamp);attr.ctime=new Date(node.timestamp);attr.blksize=4096;attr.blocks=Math.ceil(attr.size/attr.blksize);return attr},setattr:function(node,attr){if(attr.mode!==undefined){node.mode=attr.mode}if(attr.timestamp!==undefined){node.timestamp=attr.timestamp}if(attr.size!==undefined){MEMFS.resizeFileStorage(node,attr.size)}},lookup:function(parent,name){throw FS.genericErrors[ERRNO_CODES.ENOENT]},mknod:function(parent,name,mode,dev){return MEMFS.createNode(parent,name,mode,dev)},rename:function(old_node,new_dir,new_name){if(FS.isDir(old_node.mode)){var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(new_node){for(var i in new_node.contents){throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)}}}delete old_node.parent.contents[old_node.name];old_node.name=new_name;new_dir.contents[new_name]=old_node;old_node.parent=new_dir},unlink:function(parent,name){delete parent.contents[name]},rmdir:function(parent,name){var node=FS.lookupNode(parent,name);for(var i in node.contents){throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)}delete parent.contents[name]},readdir:function(node){var entries=[".",".."];for(var key in node.contents){if(!node.contents.hasOwnProperty(key)){continue}entries.push(key)}return entries},symlink:function(parent,newname,oldpath){var node=MEMFS.createNode(parent,newname,511|40960,0);node.link=oldpath;return node},readlink:function(node){if(!FS.isLink(node.mode)){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}return node.link}},stream_ops:{read:function(stream,buffer,offset,length,position){var contents=stream.node.contents;if(position>=stream.node.usedBytes)return 0;var size=Math.min(stream.node.usedBytes-position,length);assert(size>=0);if(size>8&&contents.subarray){buffer.set(contents.subarray(position,position+size),offset)}else{for(var i=0;i<size;i++)buffer[offset+i]=contents[position+i]}return size},write:function(stream,buffer,offset,length,position,canOwn){if(!length)return 0;var node=stream.node;node.timestamp=Date.now();if(buffer.subarray&&(!node.contents||node.contents.subarray)){if(canOwn){node.contents=buffer.subarray(offset,offset+length);node.usedBytes=length;return length}else if(node.usedBytes===0&&position===0){node.contents=new Uint8Array(buffer.subarray(offset,offset+length));node.usedBytes=length;return length}else if(position+length<=node.usedBytes){node.contents.set(buffer.subarray(offset,offset+length),position);return length}}MEMFS.expandFileStorage(node,position+length);if(node.contents.subarray&&buffer.subarray)node.contents.set(buffer.subarray(offset,offset+length),position);else{for(var i=0;i<length;i++){node.contents[position+i]=buffer[offset+i]}}node.usedBytes=Math.max(node.usedBytes,position+length);return length},llseek:function(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.usedBytes}}if(position<0){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}return position},allocate:function(stream,offset,length){MEMFS.expandFileStorage(stream.node,offset+length);stream.node.usedBytes=Math.max(stream.node.usedBytes,offset+length)},mmap:function(stream,buffer,offset,length,position,prot,flags){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(ERRNO_CODES.ENODEV)}var ptr;var allocated;var contents=stream.node.contents;if(!(flags&2)&&(contents.buffer===buffer||contents.buffer===buffer.buffer)){allocated=false;ptr=contents.byteOffset}else{if(position>0||position+length<stream.node.usedBytes){if(contents.subarray){contents=contents.subarray(position,position+length)}else{contents=Array.prototype.slice.call(contents,position,position+length)}}allocated=true;ptr=_malloc(length);if(!ptr){throw new FS.ErrnoError(ERRNO_CODES.ENOMEM)}buffer.set(contents,ptr)}return{ptr:ptr,allocated:allocated}},msync:function(stream,buffer,offset,length,mmapFlags){if(!FS.isFile(stream.node.mode)){throw new FS.ErrnoError(ERRNO_CODES.ENODEV)}if(mmapFlags&2){return 0}var bytesWritten=MEMFS.stream_ops.write(stream,buffer,0,length,offset,false);return 0}}};var IDBFS={dbs:{},indexedDB:function(){if(typeof indexedDB!=="undefined")return indexedDB;var ret=null;if(typeof window==="object")ret=window.indexedDB||window.mozIndexedDB||window.webkitIndexedDB||window.msIndexedDB;assert(ret,"IDBFS used, but indexedDB not supported");return ret},DB_VERSION:21,DB_STORE_NAME:"FILE_DATA",mount:function(mount){return MEMFS.mount.apply(null,arguments)},syncfs:function(mount,populate,callback){IDBFS.getLocalSet(mount,function(err,local){if(err)return callback(err);IDBFS.getRemoteSet(mount,function(err,remote){if(err)return callback(err);var src=populate?remote:local;var dst=populate?local:remote;IDBFS.reconcile(src,dst,callback)})})},getDB:function(name,callback){var db=IDBFS.dbs[name];if(db){return callback(null,db)}var req;try{req=IDBFS.indexedDB().open(name,IDBFS.DB_VERSION)}catch(e){return callback(e)}req.onupgradeneeded=function(e){var db=e.target.result;var transaction=e.target.transaction;var fileStore;if(db.objectStoreNames.contains(IDBFS.DB_STORE_NAME)){fileStore=transaction.objectStore(IDBFS.DB_STORE_NAME)}else{fileStore=db.createObjectStore(IDBFS.DB_STORE_NAME)}if(!fileStore.indexNames.contains("timestamp")){fileStore.createIndex("timestamp","timestamp",{unique:false})}};req.onsuccess=function(){db=req.result;IDBFS.dbs[name]=db;callback(null,db)};req.onerror=function(e){callback(this.error);e.preventDefault()}},getLocalSet:function(mount,callback){var entries={};function isRealDir(p){return p!=="."&&p!==".."}function toAbsolute(root){return function(p){return PATH.join2(root,p)}}var check=FS.readdir(mount.mountpoint).filter(isRealDir).map(toAbsolute(mount.mountpoint));while(check.length){var path=check.pop();var stat;try{stat=FS.stat(path)}catch(e){return callback(e)}if(FS.isDir(stat.mode)){check.push.apply(check,FS.readdir(path).filter(isRealDir).map(toAbsolute(path)))}entries[path]={timestamp:stat.mtime}}return callback(null,{type:"local",entries:entries})},getRemoteSet:function(mount,callback){var entries={};IDBFS.getDB(mount.mountpoint,function(err,db){if(err)return callback(err);var transaction=db.transaction([IDBFS.DB_STORE_NAME],"readonly");transaction.onerror=function(e){callback(this.error);e.preventDefault()};var store=transaction.objectStore(IDBFS.DB_STORE_NAME);var index=store.index("timestamp");index.openKeyCursor().onsuccess=function(event){var cursor=event.target.result;if(!cursor){return callback(null,{type:"remote",db:db,entries:entries})}entries[cursor.primaryKey]={timestamp:cursor.key};cursor.continue()}})},loadLocalEntry:function(path,callback){var stat,node;try{var lookup=FS.lookupPath(path);node=lookup.node;stat=FS.stat(path)}catch(e){return callback(e)}if(FS.isDir(stat.mode)){return callback(null,{timestamp:stat.mtime,mode:stat.mode})}else if(FS.isFile(stat.mode)){node.contents=MEMFS.getFileDataAsTypedArray(node);return callback(null,{timestamp:stat.mtime,mode:stat.mode,contents:node.contents})}else{return callback(new Error("node type not supported"))}},storeLocalEntry:function(path,entry,callback){try{if(FS.isDir(entry.mode)){FS.mkdir(path,entry.mode)}else if(FS.isFile(entry.mode)){FS.writeFile(path,entry.contents,{encoding:"binary",canOwn:true})}else{return callback(new Error("node type not supported"))}FS.chmod(path,entry.mode);FS.utime(path,entry.timestamp,entry.timestamp)}catch(e){return callback(e)}callback(null)},removeLocalEntry:function(path,callback){try{var lookup=FS.lookupPath(path);var stat=FS.stat(path);if(FS.isDir(stat.mode)){FS.rmdir(path)}else if(FS.isFile(stat.mode)){FS.unlink(path)}}catch(e){return callback(e)}callback(null)},loadRemoteEntry:function(store,path,callback){var req=store.get(path);req.onsuccess=function(event){callback(null,event.target.result)};req.onerror=function(e){callback(this.error);e.preventDefault()}},storeRemoteEntry:function(store,path,entry,callback){var req=store.put(entry,path);req.onsuccess=function(){callback(null)};req.onerror=function(e){callback(this.error);e.preventDefault()}},removeRemoteEntry:function(store,path,callback){var req=store.delete(path);req.onsuccess=function(){callback(null)};req.onerror=function(e){callback(this.error);e.preventDefault()}},reconcile:function(src,dst,callback){var total=0;var create=[];Object.keys(src.entries).forEach(function(key){var e=src.entries[key];var e2=dst.entries[key];if(!e2||e.timestamp>e2.timestamp){create.push(key);total++}});var remove=[];Object.keys(dst.entries).forEach(function(key){var e=dst.entries[key];var e2=src.entries[key];if(!e2){remove.push(key);total++}});if(!total){return callback(null)}var errored=false;var completed=0;var db=src.type==="remote"?src.db:dst.db;var transaction=db.transaction([IDBFS.DB_STORE_NAME],"readwrite");var store=transaction.objectStore(IDBFS.DB_STORE_NAME);function done(err){if(err){if(!done.errored){done.errored=true;return callback(err)}return}if(++completed>=total){return callback(null)}}transaction.onerror=function(e){done(this.error);e.preventDefault()};create.sort().forEach(function(path){if(dst.type==="local"){IDBFS.loadRemoteEntry(store,path,function(err,entry){if(err)return done(err);IDBFS.storeLocalEntry(path,entry,done)})}else{IDBFS.loadLocalEntry(path,function(err,entry){if(err)return done(err);IDBFS.storeRemoteEntry(store,path,entry,done)})}});remove.sort().reverse().forEach(function(path){if(dst.type==="local"){IDBFS.removeLocalEntry(path,done)}else{IDBFS.removeRemoteEntry(store,path,done)}})}};var WORKERFS={DIR_MODE:16895,FILE_MODE:33279,reader:null,mount:function(mount){assert(ENVIRONMENT_IS_WORKER);if(!WORKERFS.reader)WORKERFS.reader=new FileReaderSync;var root=WORKERFS.createNode(null,"/",WORKERFS.DIR_MODE,0);var createdParents={};function ensureParent(path){var parts=path.split("/");var parent=root;for(var i=0;i<parts.length-1;i++){var curr=parts.slice(0,i+1).join("/");if(!createdParents[curr]){createdParents[curr]=WORKERFS.createNode(parent,curr,WORKERFS.DIR_MODE,0)}parent=createdParents[curr]}return parent}function base(path){var parts=path.split("/");return parts[parts.length-1]}Array.prototype.forEach.call(mount.opts["files"]||[],function(file){WORKERFS.createNode(ensureParent(file.name),base(file.name),WORKERFS.FILE_MODE,0,file,file.lastModifiedDate)});(mount.opts["blobs"]||[]).forEach(function(obj){WORKERFS.createNode(ensureParent(obj["name"]),base(obj["name"]),WORKERFS.FILE_MODE,0,obj["data"])});(mount.opts["packages"]||[]).forEach(function(pack){pack["metadata"].files.forEach(function(file){var name=file.filename.substr(1);WORKERFS.createNode(ensureParent(name),base(name),WORKERFS.FILE_MODE,0,pack["blob"].slice(file.start,file.end))})});return root},createNode:function(parent,name,mode,dev,contents,mtime){var node=FS.createNode(parent,name,mode);node.mode=mode;node.node_ops=WORKERFS.node_ops;node.stream_ops=WORKERFS.stream_ops;node.timestamp=(mtime||new Date).getTime();assert(WORKERFS.FILE_MODE!==WORKERFS.DIR_MODE);if(mode===WORKERFS.FILE_MODE){node.size=contents.size;node.contents=contents}else{node.size=4096;node.contents={}}if(parent){parent.contents[name]=node}return node},node_ops:{getattr:function(node){return{dev:1,ino:undefined,mode:node.mode,nlink:1,uid:0,gid:0,rdev:undefined,size:node.size,atime:new Date(node.timestamp),mtime:new Date(node.timestamp),ctime:new Date(node.timestamp),blksize:4096,blocks:Math.ceil(node.size/4096)}},setattr:function(node,attr){if(attr.mode!==undefined){node.mode=attr.mode}if(attr.timestamp!==undefined){node.timestamp=attr.timestamp}},lookup:function(parent,name){throw new FS.ErrnoError(ERRNO_CODES.ENOENT)},mknod:function(parent,name,mode,dev){throw new FS.ErrnoError(ERRNO_CODES.EPERM)},rename:function(oldNode,newDir,newName){throw new FS.ErrnoError(ERRNO_CODES.EPERM)},unlink:function(parent,name){throw new FS.ErrnoError(ERRNO_CODES.EPERM)},rmdir:function(parent,name){throw new FS.ErrnoError(ERRNO_CODES.EPERM)},readdir:function(node){throw new FS.ErrnoError(ERRNO_CODES.EPERM)},symlink:function(parent,newName,oldPath){throw new FS.ErrnoError(ERRNO_CODES.EPERM)},readlink:function(node){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}},stream_ops:{read:function(stream,buffer,offset,length,position){if(position>=stream.node.size)return 0;var chunk=stream.node.contents.slice(position,position+length);var ab=WORKERFS.reader.readAsArrayBuffer(chunk);buffer.set(new Uint8Array(ab),offset);return chunk.size},write:function(stream,buffer,offset,length,position){throw new FS.ErrnoError(ERRNO_CODES.EIO)},llseek:function(stream,offset,whence){var position=offset;if(whence===1){position+=stream.position}else if(whence===2){if(FS.isFile(stream.node.mode)){position+=stream.node.size}}if(position<0){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}return position}}};var _stdin=allocate(1,"i32*",ALLOC_STATIC);var _stdout=allocate(1,"i32*",ALLOC_STATIC);var _stderr=allocate(1,"i32*",ALLOC_STATIC);var FS={root:null,mounts:[],devices:[null],streams:[],nextInode:1,nameTable:null,currentPath:"/",initialized:false,ignorePermissions:true,trackingDelegate:{},tracking:{openFlags:{READ:1,WRITE:2}},ErrnoError:null,genericErrors:{},filesystems:null,handleFSError:function(e){if(!(e instanceof FS.ErrnoError))throw e+" : "+stackTrace();return ___setErrNo(e.errno)},lookupPath:function(path,opts){path=PATH.resolve(FS.cwd(),path);opts=opts||{};if(!path)return{path:"",node:null};var defaults={follow_mount:true,recurse_count:0};for(var key in defaults){if(opts[key]===undefined){opts[key]=defaults[key]}}if(opts.recurse_count>8){throw new FS.ErrnoError(ERRNO_CODES.ELOOP)}var parts=PATH.normalizeArray(path.split("/").filter(function(p){return!!p}),false);var current=FS.root;var current_path="/";for(var i=0;i<parts.length;i++){var islast=i===parts.length-1;if(islast&&opts.parent){break}current=FS.lookupNode(current,parts[i]);current_path=PATH.join2(current_path,parts[i]);if(FS.isMountpoint(current)){if(!islast||islast&&opts.follow_mount){current=current.mounted.root}}if(!islast||opts.follow){var count=0;while(FS.isLink(current.mode)){var link=FS.readlink(current_path);current_path=PATH.resolve(PATH.dirname(current_path),link);var lookup=FS.lookupPath(current_path,{recurse_count:opts.recurse_count});current=lookup.node;if(count++>40){throw new FS.ErrnoError(ERRNO_CODES.ELOOP)}}}}return{path:current_path,node:current}},getPath:function(node){var path;while(true){if(FS.isRoot(node)){var mount=node.mount.mountpoint;if(!path)return mount;return mount[mount.length-1]!=="/"?mount+"/"+path:mount+path}path=path?node.name+"/"+path:node.name;node=node.parent}},hashName:function(parentid,name){var hash=0;for(var i=0;i<name.length;i++){hash=(hash<<5)-hash+name.charCodeAt(i)|0}return(parentid+hash>>>0)%FS.nameTable.length},hashAddNode:function(node){var hash=FS.hashName(node.parent.id,node.name);node.name_next=FS.nameTable[hash];FS.nameTable[hash]=node},hashRemoveNode:function(node){var hash=FS.hashName(node.parent.id,node.name);if(FS.nameTable[hash]===node){FS.nameTable[hash]=node.name_next}else{var current=FS.nameTable[hash];while(current){if(current.name_next===node){current.name_next=node.name_next;break}current=current.name_next}}},lookupNode:function(parent,name){var err=FS.mayLookup(parent);if(err){throw new FS.ErrnoError(err,parent)}var hash=FS.hashName(parent.id,name);for(var node=FS.nameTable[hash];node;node=node.name_next){var nodeName=node.name;if(node.parent.id===parent.id&&nodeName===name){return node}}return FS.lookup(parent,name)},createNode:function(parent,name,mode,rdev){if(!FS.FSNode){FS.FSNode=function(parent,name,mode,rdev){if(!parent){parent=this}this.parent=parent;this.mount=parent.mount;this.mounted=null;this.id=FS.nextInode++;this.name=name;this.mode=mode;this.node_ops={};this.stream_ops={};this.rdev=rdev};FS.FSNode.prototype={};var readMode=292|73;var writeMode=146;Object.defineProperties(FS.FSNode.prototype,{read:{get:function(){return(this.mode&readMode)===readMode},set:function(val){val?this.mode|=readMode:this.mode&=~readMode}},write:{get:function(){return(this.mode&writeMode)===writeMode},set:function(val){val?this.mode|=writeMode:this.mode&=~writeMode}},isFolder:{get:function(){return FS.isDir(this.mode)}},isDevice:{get:function(){return FS.isChrdev(this.mode)}}})}var node=new FS.FSNode(parent,name,mode,rdev);FS.hashAddNode(node);return node},destroyNode:function(node){FS.hashRemoveNode(node)},isRoot:function(node){return node===node.parent},isMountpoint:function(node){return!!node.mounted},isFile:function(mode){return(mode&61440)===32768},isDir:function(mode){return(mode&61440)===16384},isLink:function(mode){return(mode&61440)===40960},isChrdev:function(mode){return(mode&61440)===8192},isBlkdev:function(mode){return(mode&61440)===24576},isFIFO:function(mode){return(mode&61440)===4096},isSocket:function(mode){return(mode&49152)===49152},flagModes:{r:0,rs:1052672,"r+":2,w:577,wx:705,xw:705,"w+":578,"wx+":706,"xw+":706,a:1089,ax:1217,xa:1217,"a+":1090,"ax+":1218,"xa+":1218},modeStringToFlags:function(str){var flags=FS.flagModes[str];if(typeof flags==="undefined"){throw new Error("Unknown file open mode: "+str)}return flags},flagsToPermissionString:function(flag){var perms=["r","w","rw"][flag&3];if(flag&512){perms+="w"}return perms},nodePermissions:function(node,perms){if(FS.ignorePermissions){return 0}if(perms.indexOf("r")!==-1&&!(node.mode&292)){return ERRNO_CODES.EACCES}else if(perms.indexOf("w")!==-1&&!(node.mode&146)){return ERRNO_CODES.EACCES}else if(perms.indexOf("x")!==-1&&!(node.mode&73)){return ERRNO_CODES.EACCES}return 0},mayLookup:function(dir){var err=FS.nodePermissions(dir,"x");if(err)return err;if(!dir.node_ops.lookup)return ERRNO_CODES.EACCES;return 0},mayCreate:function(dir,name){try{var node=FS.lookupNode(dir,name);return ERRNO_CODES.EEXIST}catch(e){}return FS.nodePermissions(dir,"wx")},mayDelete:function(dir,name,isdir){var node;try{node=FS.lookupNode(dir,name)}catch(e){return e.errno}var err=FS.nodePermissions(dir,"wx");if(err){return err}if(isdir){if(!FS.isDir(node.mode)){return ERRNO_CODES.ENOTDIR}if(FS.isRoot(node)||FS.getPath(node)===FS.cwd()){return ERRNO_CODES.EBUSY}}else{if(FS.isDir(node.mode)){return ERRNO_CODES.EISDIR}}return 0},mayOpen:function(node,flags){if(!node){return ERRNO_CODES.ENOENT}if(FS.isLink(node.mode)){return ERRNO_CODES.ELOOP}else if(FS.isDir(node.mode)){if((flags&2097155)!==0||flags&512){return ERRNO_CODES.EISDIR}}return FS.nodePermissions(node,FS.flagsToPermissionString(flags))},MAX_OPEN_FDS:4096,nextfd:function(fd_start,fd_end){fd_start=fd_start||0;fd_end=fd_end||FS.MAX_OPEN_FDS;for(var fd=fd_start;fd<=fd_end;fd++){if(!FS.streams[fd]){return fd}}throw new FS.ErrnoError(ERRNO_CODES.EMFILE)},getStream:function(fd){return FS.streams[fd]},createStream:function(stream,fd_start,fd_end){if(!FS.FSStream){FS.FSStream=function(){};FS.FSStream.prototype={};Object.defineProperties(FS.FSStream.prototype,{object:{get:function(){return this.node},set:function(val){this.node=val}},isRead:{get:function(){return(this.flags&2097155)!==1}},isWrite:{get:function(){return(this.flags&2097155)!==0}},isAppend:{get:function(){return this.flags&1024}}})}var newStream=new FS.FSStream;for(var p in stream){newStream[p]=stream[p]}stream=newStream;var fd=FS.nextfd(fd_start,fd_end);stream.fd=fd;FS.streams[fd]=stream;return stream},closeStream:function(fd){FS.streams[fd]=null},chrdev_stream_ops:{open:function(stream){var device=FS.getDevice(stream.node.rdev);stream.stream_ops=device.stream_ops;if(stream.stream_ops.open){stream.stream_ops.open(stream)}},llseek:function(){throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)}},major:function(dev){return dev>>8},minor:function(dev){return dev&255},makedev:function(ma,mi){return ma<<8|mi},registerDevice:function(dev,ops){FS.devices[dev]={stream_ops:ops}},getDevice:function(dev){return FS.devices[dev]},getMounts:function(mount){var mounts=[];var check=[mount];while(check.length){var m=check.pop();mounts.push(m);check.push.apply(check,m.mounts)}return mounts},syncfs:function(populate,callback){if(typeof populate==="function"){callback=populate;populate=false}var mounts=FS.getMounts(FS.root.mount);var completed=0;function done(err){if(err){if(!done.errored){done.errored=true;return callback(err)}return}if(++completed>=mounts.length){callback(null)}}mounts.forEach(function(mount){if(!mount.type.syncfs){return done(null)}mount.type.syncfs(mount,populate,done)})},mount:function(type,opts,mountpoint){var root=mountpoint==="/";var pseudo=!mountpoint;var node;if(root&&FS.root){throw new FS.ErrnoError(ERRNO_CODES.EBUSY)}else if(!root&&!pseudo){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});mountpoint=lookup.path;node=lookup.node;if(FS.isMountpoint(node)){throw new FS.ErrnoError(ERRNO_CODES.EBUSY)}if(!FS.isDir(node.mode)){throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)}}var mount={type:type,opts:opts,mountpoint:mountpoint,mounts:[]};var mountRoot=type.mount(mount);mountRoot.mount=mount;mount.root=mountRoot;if(root){FS.root=mountRoot}else if(node){node.mounted=mount;if(node.mount){node.mount.mounts.push(mount)}}return mountRoot},unmount:function(mountpoint){var lookup=FS.lookupPath(mountpoint,{follow_mount:false});if(!FS.isMountpoint(lookup.node)){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}var node=lookup.node;var mount=node.mounted;var mounts=FS.getMounts(mount);Object.keys(FS.nameTable).forEach(function(hash){var current=FS.nameTable[hash];while(current){var next=current.name_next;if(mounts.indexOf(current.mount)!==-1){FS.destroyNode(current)}current=next}});node.mounted=null;var idx=node.mount.mounts.indexOf(mount);assert(idx!==-1);node.mount.mounts.splice(idx,1)},lookup:function(parent,name){return parent.node_ops.lookup(parent,name)},mknod:function(path,mode,dev){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);if(!name||name==="."||name===".."){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}var err=FS.mayCreate(parent,name);if(err){throw new FS.ErrnoError(err)}if(!parent.node_ops.mknod){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}return parent.node_ops.mknod(parent,name,mode,dev)},create:function(path,mode){mode=mode!==undefined?mode:438;mode&=4095;mode|=32768;return FS.mknod(path,mode,0)},mkdir:function(path,mode){mode=mode!==undefined?mode:511;mode&=511|512;mode|=16384;return FS.mknod(path,mode,0)},mkdev:function(path,mode,dev){if(typeof dev==="undefined"){dev=mode;mode=438}mode|=8192;return FS.mknod(path,mode,dev)},symlink:function(oldpath,newpath){if(!PATH.resolve(oldpath)){throw new FS.ErrnoError(ERRNO_CODES.ENOENT)}var lookup=FS.lookupPath(newpath,{parent:true});var parent=lookup.node;if(!parent){throw new FS.ErrnoError(ERRNO_CODES.ENOENT)}var newname=PATH.basename(newpath);var err=FS.mayCreate(parent,newname);if(err){throw new FS.ErrnoError(err)}if(!parent.node_ops.symlink){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}return parent.node_ops.symlink(parent,newname,oldpath)},rename:function(old_path,new_path){var old_dirname=PATH.dirname(old_path);var new_dirname=PATH.dirname(new_path);var old_name=PATH.basename(old_path);var new_name=PATH.basename(new_path);var lookup,old_dir,new_dir;try{lookup=FS.lookupPath(old_path,{parent:true});old_dir=lookup.node;lookup=FS.lookupPath(new_path,{parent:true});new_dir=lookup.node}catch(e){throw new FS.ErrnoError(ERRNO_CODES.EBUSY)}if(!old_dir||!new_dir)throw new FS.ErrnoError(ERRNO_CODES.ENOENT);if(old_dir.mount!==new_dir.mount){throw new FS.ErrnoError(ERRNO_CODES.EXDEV)}var old_node=FS.lookupNode(old_dir,old_name);var relative=PATH.relative(old_path,new_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}relative=PATH.relative(new_path,old_dirname);if(relative.charAt(0)!=="."){throw new FS.ErrnoError(ERRNO_CODES.ENOTEMPTY)}var new_node;try{new_node=FS.lookupNode(new_dir,new_name)}catch(e){}if(old_node===new_node){return}var isdir=FS.isDir(old_node.mode);var err=FS.mayDelete(old_dir,old_name,isdir);if(err){throw new FS.ErrnoError(err)}err=new_node?FS.mayDelete(new_dir,new_name,isdir):FS.mayCreate(new_dir,new_name);if(err){throw new FS.ErrnoError(err)}if(!old_dir.node_ops.rename){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}if(FS.isMountpoint(old_node)||new_node&&FS.isMountpoint(new_node)){throw new FS.ErrnoError(ERRNO_CODES.EBUSY)}if(new_dir!==old_dir){err=FS.nodePermissions(old_dir,"w");if(err){throw new FS.ErrnoError(err)}}try{if(FS.trackingDelegate["willMovePath"]){FS.trackingDelegate["willMovePath"](old_path,new_path)}}catch(e){console.log("FS.trackingDelegate[\'willMovePath\'](\'"+old_path+"\', \'"+new_path+"\') threw an exception: "+e.message)}FS.hashRemoveNode(old_node);try{old_dir.node_ops.rename(old_node,new_dir,new_name)}catch(e){throw e}finally{FS.hashAddNode(old_node)}try{if(FS.trackingDelegate["onMovePath"])FS.trackingDelegate["onMovePath"](old_path,new_path)}catch(e){console.log("FS.trackingDelegate[\'onMovePath\'](\'"+old_path+"\', \'"+new_path+"\') threw an exception: "+e.message)}},rmdir:function(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var err=FS.mayDelete(parent,name,true);if(err){throw new FS.ErrnoError(err)}if(!parent.node_ops.rmdir){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(ERRNO_CODES.EBUSY)}try{if(FS.trackingDelegate["willDeletePath"]){FS.trackingDelegate["willDeletePath"](path)}}catch(e){console.log("FS.trackingDelegate[\'willDeletePath\'](\'"+path+"\') threw an exception: "+e.message)}parent.node_ops.rmdir(parent,name);FS.destroyNode(node);try{if(FS.trackingDelegate["onDeletePath"])FS.trackingDelegate["onDeletePath"](path)}catch(e){console.log("FS.trackingDelegate[\'onDeletePath\'](\'"+path+"\') threw an exception: "+e.message)}},readdir:function(path){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;if(!node.node_ops.readdir){throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)}return node.node_ops.readdir(node)},unlink:function(path){var lookup=FS.lookupPath(path,{parent:true});var parent=lookup.node;var name=PATH.basename(path);var node=FS.lookupNode(parent,name);var err=FS.mayDelete(parent,name,false);if(err){if(err===ERRNO_CODES.EISDIR)err=ERRNO_CODES.EPERM;throw new FS.ErrnoError(err)}if(!parent.node_ops.unlink){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}if(FS.isMountpoint(node)){throw new FS.ErrnoError(ERRNO_CODES.EBUSY)}try{if(FS.trackingDelegate["willDeletePath"]){FS.trackingDelegate["willDeletePath"](path)}}catch(e){console.log("FS.trackingDelegate[\'willDeletePath\'](\'"+path+"\') threw an exception: "+e.message)}parent.node_ops.unlink(parent,name);FS.destroyNode(node);try{if(FS.trackingDelegate["onDeletePath"])FS.trackingDelegate["onDeletePath"](path)}catch(e){console.log("FS.trackingDelegate[\'onDeletePath\'](\'"+path+"\') threw an exception: "+e.message)}},readlink:function(path){var lookup=FS.lookupPath(path);var link=lookup.node;if(!link){throw new FS.ErrnoError(ERRNO_CODES.ENOENT)}if(!link.node_ops.readlink){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}return PATH.resolve(FS.getPath(link.parent),link.node_ops.readlink(link))},stat:function(path,dontFollow){var lookup=FS.lookupPath(path,{follow:!dontFollow});var node=lookup.node;if(!node){throw new FS.ErrnoError(ERRNO_CODES.ENOENT)}if(!node.node_ops.getattr){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}return node.node_ops.getattr(node)},lstat:function(path){return FS.stat(path,true)},chmod:function(path,mode,dontFollow){var node;if(typeof path==="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}if(!node.node_ops.setattr){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}node.node_ops.setattr(node,{mode:mode&4095|node.mode&~4095,timestamp:Date.now()})},lchmod:function(path,mode){FS.chmod(path,mode,true)},fchmod:function(fd,mode){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(ERRNO_CODES.EBADF)}FS.chmod(stream.node,mode)},chown:function(path,uid,gid,dontFollow){var node;if(typeof path==="string"){var lookup=FS.lookupPath(path,{follow:!dontFollow});node=lookup.node}else{node=path}if(!node.node_ops.setattr){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}node.node_ops.setattr(node,{timestamp:Date.now()})},lchown:function(path,uid,gid){FS.chown(path,uid,gid,true)},fchown:function(fd,uid,gid){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(ERRNO_CODES.EBADF)}FS.chown(stream.node,uid,gid)},truncate:function(path,len){if(len<0){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}var node;if(typeof path==="string"){var lookup=FS.lookupPath(path,{follow:true});node=lookup.node}else{node=path}if(!node.node_ops.setattr){throw new FS.ErrnoError(ERRNO_CODES.EPERM)}if(FS.isDir(node.mode)){throw new FS.ErrnoError(ERRNO_CODES.EISDIR)}if(!FS.isFile(node.mode)){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}var err=FS.nodePermissions(node,"w");if(err){throw new FS.ErrnoError(err)}node.node_ops.setattr(node,{size:len,timestamp:Date.now()})},ftruncate:function(fd,len){var stream=FS.getStream(fd);if(!stream){throw new FS.ErrnoError(ERRNO_CODES.EBADF)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}FS.truncate(stream.node,len)},utime:function(path,atime,mtime){var lookup=FS.lookupPath(path,{follow:true});var node=lookup.node;node.node_ops.setattr(node,{timestamp:Math.max(atime,mtime)})},open:function(path,flags,mode,fd_start,fd_end){if(path===""){throw new FS.ErrnoError(ERRNO_CODES.ENOENT)}flags=typeof flags==="string"?FS.modeStringToFlags(flags):flags;mode=typeof mode==="undefined"?438:mode;if(flags&64){mode=mode&4095|32768}else{mode=0}var node;if(typeof path==="object"){node=path}else{path=PATH.normalize(path);try{var lookup=FS.lookupPath(path,{follow:!(flags&131072)});node=lookup.node}catch(e){}}var created=false;if(flags&64){if(node){if(flags&128){throw new FS.ErrnoError(ERRNO_CODES.EEXIST)}}else{node=FS.mknod(path,mode,0);created=true}}if(!node){throw new FS.ErrnoError(ERRNO_CODES.ENOENT)}if(FS.isChrdev(node.mode)){flags&=~512}if(flags&65536&&!FS.isDir(node.mode)){throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)}if(!created){var err=FS.mayOpen(node,flags);if(err){throw new FS.ErrnoError(err)}}if(flags&512){FS.truncate(node,0)}flags&=~(128|512);var stream=FS.createStream({node:node,path:FS.getPath(node),flags:flags,seekable:true,position:0,stream_ops:node.stream_ops,ungotten:[],error:false},fd_start,fd_end);if(stream.stream_ops.open){stream.stream_ops.open(stream)}if(Module["logReadFiles"]&&!(flags&1)){if(!FS.readFiles)FS.readFiles={};if(!(path in FS.readFiles)){FS.readFiles[path]=1;Module["printErr"]("read file: "+path)}}try{if(FS.trackingDelegate["onOpenFile"]){var trackingFlags=0;if((flags&2097155)!==1){trackingFlags|=FS.tracking.openFlags.READ}if((flags&2097155)!==0){trackingFlags|=FS.tracking.openFlags.WRITE}FS.trackingDelegate["onOpenFile"](path,trackingFlags)}}catch(e){console.log("FS.trackingDelegate[\'onOpenFile\'](\'"+path+"\', flags) threw an exception: "+e.message)}return stream},close:function(stream){if(stream.getdents)stream.getdents=null;try{if(stream.stream_ops.close){stream.stream_ops.close(stream)}}catch(e){throw e}finally{FS.closeStream(stream.fd)}},llseek:function(stream,offset,whence){if(!stream.seekable||!stream.stream_ops.llseek){throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)}stream.position=stream.stream_ops.llseek(stream,offset,whence);stream.ungotten=[];return stream.position},read:function(stream,buffer,offset,length,position){if(length<0||position<0){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}if((stream.flags&2097155)===1){throw new FS.ErrnoError(ERRNO_CODES.EBADF)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(ERRNO_CODES.EISDIR)}if(!stream.stream_ops.read){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}var seeking=true;if(typeof position==="undefined"){position=stream.position;seeking=false}else if(!stream.seekable){throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)}var bytesRead=stream.stream_ops.read(stream,buffer,offset,length,position);if(!seeking)stream.position+=bytesRead;return bytesRead},write:function(stream,buffer,offset,length,position,canOwn){if(length<0||position<0){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(ERRNO_CODES.EBADF)}if(FS.isDir(stream.node.mode)){throw new FS.ErrnoError(ERRNO_CODES.EISDIR)}if(!stream.stream_ops.write){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}if(stream.flags&1024){FS.llseek(stream,0,2)}var seeking=true;if(typeof position==="undefined"){position=stream.position;seeking=false}else if(!stream.seekable){throw new FS.ErrnoError(ERRNO_CODES.ESPIPE)}var bytesWritten=stream.stream_ops.write(stream,buffer,offset,length,position,canOwn);if(!seeking)stream.position+=bytesWritten;try{if(stream.path&&FS.trackingDelegate["onWriteToFile"])FS.trackingDelegate["onWriteToFile"](stream.path)}catch(e){console.log("FS.trackingDelegate[\'onWriteToFile\'](\'"+path+"\') threw an exception: "+e.message)}return bytesWritten},allocate:function(stream,offset,length){if(offset<0||length<=0){throw new FS.ErrnoError(ERRNO_CODES.EINVAL)}if((stream.flags&2097155)===0){throw new FS.ErrnoError(ERRNO_CODES.EBADF)}if(!FS.isFile(stream.node.mode)&&!FS.isDir(node.mode)){throw new FS.ErrnoError(ERRNO_CODES.ENODEV)}if(!stream.stream_ops.allocate){throw new FS.ErrnoError(ERRNO_CODES.EOPNOTSUPP)}stream.stream_ops.allocate(stream,offset,length)},mmap:function(stream,buffer,offset,length,position,prot,flags){if((stream.flags&2097155)===1){throw new FS.ErrnoError(ERRNO_CODES.EACCES)}if(!stream.stream_ops.mmap){throw new FS.ErrnoError(ERRNO_CODES.ENODEV)}return stream.stream_ops.mmap(stream,buffer,offset,length,position,prot,flags)},msync:function(stream,buffer,offset,length,mmapFlags){if(!stream||!stream.stream_ops.msync){return 0}return stream.stream_ops.msync(stream,buffer,offset,length,mmapFlags)},munmap:function(stream){return 0},ioctl:function(stream,cmd,arg){if(!stream.stream_ops.ioctl){throw new FS.ErrnoError(ERRNO_CODES.ENOTTY)}return stream.stream_ops.ioctl(stream,cmd,arg)},readFile:function(path,opts){opts=opts||{};opts.flags=opts.flags||"r";opts.encoding=opts.encoding||"binary";if(opts.encoding!=="utf8"&&opts.encoding!=="binary"){throw new Error(\'Invalid encoding type "\'+opts.encoding+\'"\')}var ret;var stream=FS.open(path,opts.flags);var stat=FS.stat(path);var length=stat.size;var buf=new Uint8Array(length);FS.read(stream,buf,0,length,0);if(opts.encoding==="utf8"){ret=UTF8ArrayToString(buf,0)}else if(opts.encoding==="binary"){ret=buf}FS.close(stream);return ret},writeFile:function(path,data,opts){opts=opts||{};opts.flags=opts.flags||"w";opts.encoding=opts.encoding||"utf8";if(opts.encoding!=="utf8"&&opts.encoding!=="binary"){throw new Error(\'Invalid encoding type "\'+opts.encoding+\'"\')}var stream=FS.open(path,opts.flags,opts.mode);if(opts.encoding==="utf8"){var buf=new Uint8Array(lengthBytesUTF8(data)+1);var actualNumBytes=stringToUTF8Array(data,buf,0,buf.length);FS.write(stream,buf,0,actualNumBytes,0,opts.canOwn)}else if(opts.encoding==="binary"){FS.write(stream,data,0,data.length,0,opts.canOwn)}FS.close(stream)},cwd:function(){return FS.currentPath},chdir:function(path){var lookup=FS.lookupPath(path,{follow:true});if(!FS.isDir(lookup.node.mode)){throw new FS.ErrnoError(ERRNO_CODES.ENOTDIR)}var err=FS.nodePermissions(lookup.node,"x");if(err){throw new FS.ErrnoError(err)}FS.currentPath=lookup.path},createDefaultDirectories:function(){FS.mkdir("/tmp");FS.mkdir("/home");FS.mkdir("/home/web_user")},createDefaultDevices:function(){FS.mkdir("/dev");FS.registerDevice(FS.makedev(1,3),{read:function(){return 0},write:function(stream,buffer,offset,length,pos){return length}});FS.mkdev("/dev/null",FS.makedev(1,3));TTY.register(FS.makedev(5,0),TTY.default_tty_ops);TTY.register(FS.makedev(6,0),TTY.default_tty1_ops);FS.mkdev("/dev/tty",FS.makedev(5,0));FS.mkdev("/dev/tty1",FS.makedev(6,0));var random_device;if(typeof crypto!=="undefined"){var randomBuffer=new Uint8Array(1);random_device=function(){crypto.getRandomValues(randomBuffer);return randomBuffer[0]}}else{random_device=function(){return Math.random()*256|0}}FS.createDevice("/dev","random",random_device);FS.createDevice("/dev","urandom",random_device);FS.mkdir("/dev/shm");FS.mkdir("/dev/shm/tmp")},createSpecialDirectories:function(){FS.mkdir("/proc");FS.mkdir("/proc/self");FS.mkdir("/proc/self/fd");FS.mount({mount:function(){var node=FS.createNode("/proc/self","fd",16384|511,73);node.node_ops={lookup:function(parent,name){var fd=+name;var stream=FS.getStream(fd);if(!stream)throw new FS.ErrnoError(ERRNO_CODES.EBADF);var ret={parent:null,mount:{mountpoint:"fake"},node_ops:{readlink:function(){return stream.path}}};ret.parent=ret;return ret}};return node}},{},"/proc/self/fd")},createStandardStreams:function(){if(Module["stdin"]){FS.createDevice("/dev","stdin",Module["stdin"])}else{FS.symlink("/dev/tty","/dev/stdin")}if(Module["stdout"]){FS.createDevice("/dev","stdout",null,Module["stdout"])}else{FS.symlink("/dev/tty","/dev/stdout")}if(Module["stderr"]){FS.createDevice("/dev","stderr",null,Module["stderr"])}else{FS.symlink("/dev/tty1","/dev/stderr")}var stdin=FS.open("/dev/stdin","r");assert(stdin.fd===0,"invalid handle for stdin ("+stdin.fd+")");var stdout=FS.open("/dev/stdout","w");assert(stdout.fd===1,"invalid handle for stdout ("+stdout.fd+")");var stderr=FS.open("/dev/stderr","w");assert(stderr.fd===2,"invalid handle for stderr ("+stderr.fd+")")},ensureErrnoError:function(){if(FS.ErrnoError)return;FS.ErrnoError=function ErrnoError(errno,node){this.node=node;this.setErrno=function(errno){this.errno=errno;for(var key in ERRNO_CODES){if(ERRNO_CODES[key]===errno){this.code=key;break}}};this.setErrno(errno);this.message=ERRNO_MESSAGES[errno]};FS.ErrnoError.prototype=new Error;FS.ErrnoError.prototype.constructor=FS.ErrnoError;[ERRNO_CODES.ENOENT].forEach(function(code){FS.genericErrors[code]=new FS.ErrnoError(code);FS.genericErrors[code].stack="<generic error, no stack>"})},staticInit:function(){FS.ensureErrnoError();FS.nameTable=new Array(4096);FS.mount(MEMFS,{},"/");FS.createDefaultDirectories();FS.createDefaultDevices();FS.createSpecialDirectories();FS.filesystems={MEMFS:MEMFS,IDBFS:IDBFS,NODEFS:{},WORKERFS:WORKERFS}},init:function(input,output,error){assert(!FS.init.initialized,"FS.init was previously called. If you want to initialize later with custom parameters, remove any earlier calls (note that one is automatically added to the generated code)");FS.init.initialized=true;FS.ensureErrnoError();Module["stdin"]=input||Module["stdin"];Module["stdout"]=output||Module["stdout"];Module["stderr"]=error||Module["stderr"];FS.createStandardStreams()},quit:function(){FS.init.initialized=false;var fflush=Module["_fflush"];if(fflush)fflush(0);for(var i=0;i<FS.streams.length;i++){var stream=FS.streams[i];if(!stream){continue}FS.close(stream)}},getMode:function(canRead,canWrite){var mode=0;if(canRead)mode|=292|73;if(canWrite)mode|=146;return mode},joinPath:function(parts,forceRelative){var path=PATH.join.apply(null,parts);if(forceRelative&&path[0]=="/")path=path.substr(1);return path},absolutePath:function(relative,base){return PATH.resolve(base,relative)},standardizePath:function(path){return PATH.normalize(path)},findObject:function(path,dontResolveLastLink){var ret=FS.analyzePath(path,dontResolveLastLink);if(ret.exists){return ret.object}else{___setErrNo(ret.error);return null}},analyzePath:function(path,dontResolveLastLink){try{var lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});path=lookup.path}catch(e){}var ret={isRoot:false,exists:false,error:0,name:null,path:null,object:null,parentExists:false,parentPath:null,parentObject:null};try{var lookup=FS.lookupPath(path,{parent:true});ret.parentExists=true;ret.parentPath=lookup.path;ret.parentObject=lookup.node;ret.name=PATH.basename(path);lookup=FS.lookupPath(path,{follow:!dontResolveLastLink});ret.exists=true;ret.path=lookup.path;ret.object=lookup.node;ret.name=lookup.node.name;ret.isRoot=lookup.path==="/"}catch(e){ret.error=e.errno}return ret},createFolder:function(parent,name,canRead,canWrite){var path=PATH.join2(typeof parent==="string"?parent:FS.getPath(parent),name);var mode=FS.getMode(canRead,canWrite);return FS.mkdir(path,mode)},createPath:function(parent,path,canRead,canWrite){parent=typeof parent==="string"?parent:FS.getPath(parent);var parts=path.split("/").reverse();while(parts.length){var part=parts.pop();if(!part)continue;var current=PATH.join2(parent,part);try{FS.mkdir(current)}catch(e){}parent=current}return current},createFile:function(parent,name,properties,canRead,canWrite){var path=PATH.join2(typeof parent==="string"?parent:FS.getPath(parent),name);var mode=FS.getMode(canRead,canWrite);return FS.create(path,mode)},createDataFile:function(parent,name,data,canRead,canWrite,canOwn){var path=name?PATH.join2(typeof parent==="string"?parent:FS.getPath(parent),name):parent;var mode=FS.getMode(canRead,canWrite);var node=FS.create(path,mode);if(data){if(typeof data==="string"){var arr=new Array(data.length);for(var i=0,len=data.length;i<len;++i)arr[i]=data.charCodeAt(i);data=arr}FS.chmod(node,mode|146);var stream=FS.open(node,"w");FS.write(stream,data,0,data.length,0,canOwn);FS.close(stream);FS.chmod(node,mode)}return node},createDevice:function(parent,name,input,output){var path=PATH.join2(typeof parent==="string"?parent:FS.getPath(parent),name);var mode=FS.getMode(!!input,!!output);if(!FS.createDevice.major)FS.createDevice.major=64;var dev=FS.makedev(FS.createDevice.major++,0);FS.registerDevice(dev,{open:function(stream){stream.seekable=false},close:function(stream){if(output&&output.buffer&&output.buffer.length){output(10)}},read:function(stream,buffer,offset,length,pos){var bytesRead=0;for(var i=0;i<length;i++){var result;try{result=input()}catch(e){throw new FS.ErrnoError(ERRNO_CODES.EIO)}if(result===undefined&&bytesRead===0){throw new FS.ErrnoError(ERRNO_CODES.EAGAIN)}if(result===null||result===undefined)break;bytesRead++;buffer[offset+i]=result}if(bytesRead){stream.node.timestamp=Date.now()}return bytesRead},write:function(stream,buffer,offset,length,pos){for(var i=0;i<length;i++){try{output(buffer[offset+i])}catch(e){throw new FS.ErrnoError(ERRNO_CODES.EIO)}}if(length){stream.node.timestamp=Date.now()}return i}});return FS.mkdev(path,mode,dev)},createLink:function(parent,name,target,canRead,canWrite){var path=PATH.join2(typeof parent==="string"?parent:FS.getPath(parent),name);return FS.symlink(target,path)},forceLoadFile:function(obj){if(obj.isDevice||obj.isFolder||obj.link||obj.contents)return true;var success=true;if(typeof XMLHttpRequest!=="undefined"){throw new Error("Lazy loading should have been performed (contents set) in createLazyFile, but it was not. Lazy loading only works in web workers. Use --embed-file or --preload-file in emcc on the main thread.")}else if(Module["read"]){try{obj.contents=intArrayFromString(Module["read"](obj.url),true);obj.usedBytes=obj.contents.length}catch(e){success=false}}else{throw new Error("Cannot load without read() or XMLHttpRequest.")}if(!success)___setErrNo(ERRNO_CODES.EIO);return success},createLazyFile:function(parent,name,url,canRead,canWrite){function LazyUint8Array(){this.lengthKnown=false;this.chunks=[]}LazyUint8Array.prototype.get=function LazyUint8Array_get(idx){if(idx>this.length-1||idx<0){return undefined}var chunkOffset=idx%this.chunkSize;var chunkNum=idx/this.chunkSize|0;return this.getter(chunkNum)[chunkOffset]};LazyUint8Array.prototype.setDataGetter=function LazyUint8Array_setDataGetter(getter){this.getter=getter};LazyUint8Array.prototype.cacheLength=function LazyUint8Array_cacheLength(){var xhr=new XMLHttpRequest;xhr.open("HEAD",url,false);xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))throw new Error("Couldn\'t load "+url+". Status: "+xhr.status);var datalength=Number(xhr.getResponseHeader("Content-length"));var header;var hasByteServing=(header=xhr.getResponseHeader("Accept-Ranges"))&&header==="bytes";var chunkSize=1024*1024;if(!hasByteServing)chunkSize=datalength;var doXHR=function(from,to){if(from>to)throw new Error("invalid range ("+from+", "+to+") or no bytes requested!");if(to>datalength-1)throw new Error("only "+datalength+" bytes available! programmer error!");var xhr=new XMLHttpRequest;xhr.open("GET",url,false);if(datalength!==chunkSize)xhr.setRequestHeader("Range","bytes="+from+"-"+to);if(typeof Uint8Array!="undefined")xhr.responseType="arraybuffer";if(xhr.overrideMimeType){xhr.overrideMimeType("text/plain; charset=x-user-defined")}xhr.send(null);if(!(xhr.status>=200&&xhr.status<300||xhr.status===304))throw new Error("Couldn\'t load "+url+". Status: "+xhr.status);if(xhr.response!==undefined){return new Uint8Array(xhr.response||[])}else{return intArrayFromString(xhr.responseText||"",true)}};var lazyArray=this;lazyArray.setDataGetter(function(chunkNum){var start=chunkNum*chunkSize;var end=(chunkNum+1)*chunkSize-1;end=Math.min(end,datalength-1);if(typeof lazyArray.chunks[chunkNum]==="undefined"){lazyArray.chunks[chunkNum]=doXHR(start,end)}if(typeof lazyArray.chunks[chunkNum]==="undefined")throw new Error("doXHR failed!");return lazyArray.chunks[chunkNum]});this._length=datalength;this._chunkSize=chunkSize;this.lengthKnown=true};if(typeof XMLHttpRequest!=="undefined"){if(!ENVIRONMENT_IS_WORKER)throw"Cannot do synchronous binary XHRs outside webworkers in modern browsers. Use --embed-file or --preload-file in emcc";var lazyArray=new LazyUint8Array;Object.defineProperty(lazyArray,"length",{get:function(){if(!this.lengthKnown){this.cacheLength()}return this._length}});Object.defineProperty(lazyArray,"chunkSize",{get:function(){if(!this.lengthKnown){this.cacheLength()}return this._chunkSize}});var properties={isDevice:false,contents:lazyArray}}else{var properties={isDevice:false,url:url}}var node=FS.createFile(parent,name,properties,canRead,canWrite);if(properties.contents){node.contents=properties.contents}else if(properties.url){node.contents=null;node.url=properties.url}Object.defineProperty(node,"usedBytes",{get:function(){return this.contents.length}});var stream_ops={};var keys=Object.keys(node.stream_ops);keys.forEach(function(key){var fn=node.stream_ops[key];stream_ops[key]=function forceLoadLazyFile(){if(!FS.forceLoadFile(node)){throw new FS.ErrnoError(ERRNO_CODES.EIO)}return fn.apply(null,arguments)}});stream_ops.read=function stream_ops_read(stream,buffer,offset,length,position){if(!FS.forceLoadFile(node)){throw new FS.ErrnoError(ERRNO_CODES.EIO)}var contents=stream.node.contents;if(position>=contents.length)return 0;var size=Math.min(contents.length-position,length);assert(size>=0);if(contents.slice){for(var i=0;i<size;i++){buffer[offset+i]=contents[position+i]}}else{for(var i=0;i<size;i++){buffer[offset+i]=contents.get(position+i)}}return size};node.stream_ops=stream_ops;return node},createPreloadedFile:function(parent,name,url,canRead,canWrite,onload,onerror,dontCreateFile,canOwn,preFinish){Browser.init();var fullname=name?PATH.resolve(PATH.join2(parent,name)):parent;var dep=getUniqueRunDependency("cp "+fullname);function processData(byteArray){function finish(byteArray){if(preFinish)preFinish();if(!dontCreateFile){FS.createDataFile(parent,name,byteArray,canRead,canWrite,canOwn)}if(onload)onload();removeRunDependency(dep)}var handled=false;Module["preloadPlugins"].forEach(function(plugin){if(handled)return;if(plugin["canHandle"](fullname)){plugin["handle"](byteArray,fullname,finish,function(){if(onerror)onerror();removeRunDependency(dep)});handled=true}});if(!handled)finish(byteArray)}addRunDependency(dep);if(typeof url=="string"){Browser.asyncLoad(url,function(byteArray){processData(byteArray)},onerror)}else{processData(url)}},indexedDB:function(){return window.indexedDB||window.mozIndexedDB||window.webkitIndexedDB||window.msIndexedDB},DB_NAME:function(){return"EM_FS_"+window.location.pathname},DB_VERSION:20,DB_STORE_NAME:"FILE_DATA",saveFilesToDB:function(paths,onload,onerror){onload=onload||function(){};onerror=onerror||function(){};var indexedDB=FS.indexedDB();try{var openRequest=indexedDB.open(FS.DB_NAME(),FS.DB_VERSION)}catch(e){return onerror(e)}openRequest.onupgradeneeded=function openRequest_onupgradeneeded(){console.log("creating db");var db=openRequest.result;db.createObjectStore(FS.DB_STORE_NAME)};openRequest.onsuccess=function openRequest_onsuccess(){var db=openRequest.result;var transaction=db.transaction([FS.DB_STORE_NAME],"readwrite");var files=transaction.objectStore(FS.DB_STORE_NAME);var ok=0,fail=0,total=paths.length;function finish(){if(fail==0)onload();else onerror()}paths.forEach(function(path){var putRequest=files.put(FS.analyzePath(path).object.contents,path);putRequest.onsuccess=function putRequest_onsuccess(){ok++;if(ok+fail==total)finish()};putRequest.onerror=function putRequest_onerror(){fail++;if(ok+fail==total)finish()}});transaction.onerror=onerror};openRequest.onerror=onerror},loadFilesFromDB:function(paths,onload,onerror){onload=onload||function(){};onerror=onerror||function(){};var indexedDB=FS.indexedDB();try{var openRequest=indexedDB.open(FS.DB_NAME(),FS.DB_VERSION)}catch(e){return onerror(e)}openRequest.onupgradeneeded=onerror;openRequest.onsuccess=function openRequest_onsuccess(){var db=openRequest.result;try{var transaction=db.transaction([FS.DB_STORE_NAME],"readonly")}catch(e){onerror(e);return}var files=transaction.objectStore(FS.DB_STORE_NAME);var ok=0,fail=0,total=paths.length;function finish(){if(fail==0)onload();else onerror()}paths.forEach(function(path){var getRequest=files.get(path);getRequest.onsuccess=function getRequest_onsuccess(){if(FS.analyzePath(path).exists){FS.unlink(path)}FS.createDataFile(PATH.dirname(path),PATH.basename(path),getRequest.result,true,true,true);ok++;if(ok+fail==total)finish()};getRequest.onerror=function getRequest_onerror(){fail++;if(ok+fail==total)finish()}});transaction.onerror=onerror};openRequest.onerror=onerror}};var PATH={splitPath:function(filename){var splitPathRe=/^(\\/?|)([\\s\\S]*?)((?:\\.{1,2}|[^\\/]+?|)(\\.[^.\\/]*|))(?:[\\/]*)$/;return splitPathRe.exec(filename).slice(1)},normalizeArray:function(parts,allowAboveRoot){var up=0;for(var i=parts.length-1;i>=0;i--){var last=parts[i];if(last==="."){parts.splice(i,1)}else if(last===".."){parts.splice(i,1);up++}else if(up){parts.splice(i,1);up--}}if(allowAboveRoot){for(;up--;up){parts.unshift("..")}}return parts},normalize:function(path){var isAbsolute=path.charAt(0)==="/",trailingSlash=path.substr(-1)==="/";path=PATH.normalizeArray(path.split("/").filter(function(p){return!!p}),!isAbsolute).join("/");if(!path&&!isAbsolute){path="."}if(path&&trailingSlash){path+="/"}return(isAbsolute?"/":"")+path},dirname:function(path){var result=PATH.splitPath(path),root=result[0],dir=result[1];if(!root&&!dir){return"."}if(dir){dir=dir.substr(0,dir.length-1)}return root+dir},basename:function(path){if(path==="/")return"/";var lastSlash=path.lastIndexOf("/");if(lastSlash===-1)return path;return path.substr(lastSlash+1)},extname:function(path){return PATH.splitPath(path)[3]},join:function(){var paths=Array.prototype.slice.call(arguments,0);return PATH.normalize(paths.join("/"))},join2:function(l,r){return PATH.normalize(l+"/"+r)},resolve:function(){var resolvedPath="",resolvedAbsolute=false;for(var i=arguments.length-1;i>=-1&&!resolvedAbsolute;i--){var path=i>=0?arguments[i]:FS.cwd();if(typeof path!=="string"){throw new TypeError("Arguments to path.resolve must be strings")}else if(!path){return""}resolvedPath=path+"/"+resolvedPath;resolvedAbsolute=path.charAt(0)==="/"}resolvedPath=PATH.normalizeArray(resolvedPath.split("/").filter(function(p){return!!p}),!resolvedAbsolute).join("/");return(resolvedAbsolute?"/":"")+resolvedPath||"."},relative:function(from,to){from=PATH.resolve(from).substr(1);to=PATH.resolve(to).substr(1);function trim(arr){var start=0;for(;start<arr.length;start++){if(arr[start]!=="")break}var end=arr.length-1;for(;end>=0;end--){if(arr[end]!=="")break}if(start>end)return[];return arr.slice(start,end-start+1)}var fromParts=trim(from.split("/"));var toParts=trim(to.split("/"));var length=Math.min(fromParts.length,toParts.length);var samePartsLength=length;for(var i=0;i<length;i++){if(fromParts[i]!==toParts[i]){samePartsLength=i;break}}var outputParts=[];for(var i=samePartsLength;i<fromParts.length;i++){outputParts.push("..")}outputParts=outputParts.concat(toParts.slice(samePartsLength));return outputParts.join("/")}};function _emscripten_set_main_loop_timing(mode,value){Browser.mainLoop.timingMode=mode;Browser.mainLoop.timingValue=value;if(!Browser.mainLoop.func){return 1}if(mode==0){Browser.mainLoop.scheduler=function Browser_mainLoop_scheduler_setTimeout(){setTimeout(Browser.mainLoop.runner,value)};Browser.mainLoop.method="timeout"}else if(mode==1){Browser.mainLoop.scheduler=function Browser_mainLoop_scheduler_rAF(){Browser.requestAnimationFrame(Browser.mainLoop.runner)};Browser.mainLoop.method="rAF"}else if(mode==2){if(!window["setImmediate"]){var setImmediates=[];var emscriptenMainLoopMessageId="__emcc";function Browser_setImmediate_messageHandler(event){if(event.source===window&&event.data===emscriptenMainLoopMessageId){event.stopPropagation();setImmediates.shift()()}}window.addEventListener("message",Browser_setImmediate_messageHandler,true);window["setImmediate"]=function Browser_emulated_setImmediate(func){setImmediates.push(func);window.postMessage(emscriptenMainLoopMessageId,"*")}}Browser.mainLoop.scheduler=function Browser_mainLoop_scheduler_setImmediate(){window["setImmediate"](Browser.mainLoop.runner)};Browser.mainLoop.method="immediate"}return 0}function _emscripten_set_main_loop(func,fps,simulateInfiniteLoop,arg,noSetTiming){Module["noExitRuntime"]=true;assert(!Browser.mainLoop.func,"emscripten_set_main_loop: there can only be one main loop function at once: call emscripten_cancel_main_loop to cancel the previous one before setting a new one with different parameters.");Browser.mainLoop.func=func;Browser.mainLoop.arg=arg;var thisMainLoopId=Browser.mainLoop.currentlyRunningMainloop;Browser.mainLoop.runner=function Browser_mainLoop_runner(){if(ABORT)return;if(Browser.mainLoop.queue.length>0){var start=Date.now();var blocker=Browser.mainLoop.queue.shift();blocker.func(blocker.arg);if(Browser.mainLoop.remainingBlockers){var remaining=Browser.mainLoop.remainingBlockers;var next=remaining%1==0?remaining-1:Math.floor(remaining);if(blocker.counted){Browser.mainLoop.remainingBlockers=next}else{next=next+.5;Browser.mainLoop.remainingBlockers=(8*remaining+next)/9}}console.log(\'main loop blocker "\'+blocker.name+\'" took \'+(Date.now()-start)+" ms");Browser.mainLoop.updateStatus();setTimeout(Browser.mainLoop.runner,0);return}if(thisMainLoopId<Browser.mainLoop.currentlyRunningMainloop)return;Browser.mainLoop.currentFrameNumber=Browser.mainLoop.currentFrameNumber+1|0;if(Browser.mainLoop.timingMode==1&&Browser.mainLoop.timingValue>1&&Browser.mainLoop.currentFrameNumber%Browser.mainLoop.timingValue!=0){Browser.mainLoop.scheduler();return}if(Browser.mainLoop.method==="timeout"&&Module.ctx){Module.printErr("Looks like you are rendering without using requestAnimationFrame for the main loop. You should use 0 for the frame rate in emscripten_set_main_loop in order to use requestAnimationFrame, as that can greatly improve your frame rates!");Browser.mainLoop.method=""}Browser.mainLoop.runIter(function(){if(typeof arg!=="undefined"){Runtime.dynCall("vi",func,[arg])}else{Runtime.dynCall("v",func)}});if(thisMainLoopId<Browser.mainLoop.currentlyRunningMainloop)return;if(typeof SDL==="object"&&SDL.audio&&SDL.audio.queueNewAudioData)SDL.audio.queueNewAudioData();Browser.mainLoop.scheduler()};if(!noSetTiming){if(fps&&fps>0)_emscripten_set_main_loop_timing(0,1e3/fps);else _emscripten_set_main_loop_timing(1,1);Browser.mainLoop.scheduler()}if(simulateInfiniteLoop){throw"SimulateInfiniteLoop"}}var Browser={mainLoop:{scheduler:null,method:"",currentlyRunningMainloop:0,func:null,arg:0,timingMode:0,timingValue:0,currentFrameNumber:0,queue:[],pause:function(){Browser.mainLoop.scheduler=null;Browser.mainLoop.currentlyRunningMainloop++},resume:function(){Browser.mainLoop.currentlyRunningMainloop++;var timingMode=Browser.mainLoop.timingMode;var timingValue=Browser.mainLoop.timingValue;var func=Browser.mainLoop.func;Browser.mainLoop.func=null;_emscripten_set_main_loop(func,0,false,Browser.mainLoop.arg,true);_emscripten_set_main_loop_timing(timingMode,timingValue);Browser.mainLoop.scheduler()},updateStatus:function(){if(Module["setStatus"]){var message=Module["statusMessage"]||"Please wait...";var remaining=Browser.mainLoop.remainingBlockers;var expected=Browser.mainLoop.expectedBlockers;if(remaining){if(remaining<expected){Module["setStatus"](message+" ("+(expected-remaining)+"/"+expected+")")}else{Module["setStatus"](message)}}else{Module["setStatus"]("")}}},runIter:function(func){if(ABORT)return;if(Module["preMainLoop"]){var preRet=Module["preMainLoop"]();if(preRet===false){return}}try{func()}catch(e){if(e instanceof ExitStatus){return}else{if(e&&typeof e==="object"&&e.stack)Module.printErr("exception thrown: "+[e,e.stack]);throw e}}if(Module["postMainLoop"])Module["postMainLoop"]()}},isFullScreen:false,pointerLock:false,moduleContextCreatedCallbacks:[],workers:[],init:function(){if(!Module["preloadPlugins"])Module["preloadPlugins"]=[];if(Browser.initted)return;Browser.initted=true;try{new Blob;Browser.hasBlobConstructor=true}catch(e){Browser.hasBlobConstructor=false;console.log("warning: no blob constructor, cannot create blobs with mimetypes")}Browser.BlobBuilder=typeof MozBlobBuilder!="undefined"?MozBlobBuilder:typeof WebKitBlobBuilder!="undefined"?WebKitBlobBuilder:!Browser.hasBlobConstructor?console.log("warning: no BlobBuilder"):null;Browser.URLObject=typeof window!="undefined"?window.URL?window.URL:window.webkitURL:undefined;if(!Module.noImageDecoding&&typeof Browser.URLObject==="undefined"){console.log("warning: Browser does not support creating object URLs. Built-in browser image decoding will not be available.");Module.noImageDecoding=true}var imagePlugin={};imagePlugin["canHandle"]=function imagePlugin_canHandle(name){return!Module.noImageDecoding&&/\\.(jpg|jpeg|png|bmp)$/i.test(name)};imagePlugin["handle"]=function imagePlugin_handle(byteArray,name,onload,onerror){var b=null;if(Browser.hasBlobConstructor){try{b=new Blob([byteArray],{type:Browser.getMimetype(name)});if(b.size!==byteArray.length){b=new Blob([new Uint8Array(byteArray).buffer],{type:Browser.getMimetype(name)})}}catch(e){Runtime.warnOnce("Blob constructor present but fails: "+e+"; falling back to blob builder")}}if(!b){var bb=new Browser.BlobBuilder;bb.append(new Uint8Array(byteArray).buffer);b=bb.getBlob()}var url=Browser.URLObject.createObjectURL(b);var img=new Image;img.onload=function img_onload(){assert(img.complete,"Image "+name+" could not be decoded");var canvas=document.createElement("canvas");canvas.width=img.width;canvas.height=img.height;var ctx=canvas.getContext("2d");ctx.drawImage(img,0,0);Module["preloadedImages"][name]=canvas;Browser.URLObject.revokeObjectURL(url);if(onload)onload(byteArray)};img.onerror=function img_onerror(event){console.log("Image "+url+" could not be decoded");if(onerror)onerror()};img.src=url};Module["preloadPlugins"].push(imagePlugin);var audioPlugin={};audioPlugin["canHandle"]=function audioPlugin_canHandle(name){return!Module.noAudioDecoding&&name.substr(-4)in{".ogg":1,".wav":1,".mp3":1}};audioPlugin["handle"]=function audioPlugin_handle(byteArray,name,onload,onerror){var done=false;function finish(audio){if(done)return;done=true;Module["preloadedAudios"][name]=audio;if(onload)onload(byteArray)}function fail(){if(done)return;done=true;Module["preloadedAudios"][name]=new Audio;if(onerror)onerror()}if(Browser.hasBlobConstructor){try{var b=new Blob([byteArray],{type:Browser.getMimetype(name)})}catch(e){return fail()}var url=Browser.URLObject.createObjectURL(b);var audio=new Audio;audio.addEventListener("canplaythrough",function(){finish(audio)},false);audio.onerror=function audio_onerror(event){if(done)return;console.log("warning: browser could not fully decode audio "+name+", trying slower base64 approach");function encode64(data){var BASE="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";var PAD="=";var ret="";var leftchar=0;var leftbits=0;for(var i=0;i<data.length;i++){leftchar=leftchar<<8|data[i];leftbits+=8;while(leftbits>=6){var curr=leftchar>>leftbits-6&63;leftbits-=6;ret+=BASE[curr]}}if(leftbits==2){ret+=BASE[(leftchar&3)<<4];ret+=PAD+PAD}else if(leftbits==4){ret+=BASE[(leftchar&15)<<2];ret+=PAD}return ret}audio.src="data:audio/x-"+name.substr(-3)+";base64,"+encode64(byteArray);finish(audio)};audio.src=url;Browser.safeSetTimeout(function(){finish(audio)},1e4)}else{return fail()}};Module["preloadPlugins"].push(audioPlugin);var canvas=Module["canvas"];function pointerLockChange(){Browser.pointerLock=document["pointerLockElement"]===canvas||document["mozPointerLockElement"]===canvas||document["webkitPointerLockElement"]===canvas||document["msPointerLockElement"]===canvas}if(canvas){canvas.requestPointerLock=canvas["requestPointerLock"]||canvas["mozRequestPointerLock"]||canvas["webkitRequestPointerLock"]||canvas["msRequestPointerLock"]||function(){};canvas.exitPointerLock=document["exitPointerLock"]||document["mozExitPointerLock"]||document["webkitExitPointerLock"]||document["msExitPointerLock"]||function(){};canvas.exitPointerLock=canvas.exitPointerLock.bind(document);document.addEventListener("pointerlockchange",pointerLockChange,false);document.addEventListener("mozpointerlockchange",pointerLockChange,false);document.addEventListener("webkitpointerlockchange",pointerLockChange,false);document.addEventListener("mspointerlockchange",pointerLockChange,false);if(Module["elementPointerLock"]){canvas.addEventListener("click",function(ev){if(!Browser.pointerLock&&canvas.requestPointerLock){canvas.requestPointerLock();ev.preventDefault()}},false)}}},createContext:function(canvas,useWebGL,setInModule,webGLContextAttributes){if(useWebGL&&Module.ctx&&canvas==Module.canvas)return Module.ctx;var ctx;var contextHandle;if(useWebGL){var contextAttributes={antialias:false,alpha:false};if(webGLContextAttributes){for(var attribute in webGLContextAttributes){contextAttributes[attribute]=webGLContextAttributes[attribute]}}contextHandle=GL.createContext(canvas,contextAttributes);if(contextHandle){ctx=GL.getContext(contextHandle).GLctx}canvas.style.backgroundColor="black"}else{ctx=canvas.getContext("2d")}if(!ctx)return null;if(setInModule){if(!useWebGL)assert(typeof GLctx==="undefined","cannot set in module if GLctx is used, but we are a non-GL context that would replace it");Module.ctx=ctx;if(useWebGL)GL.makeContextCurrent(contextHandle);Module.useWebGL=useWebGL;Browser.moduleContextCreatedCallbacks.forEach(function(callback){callback()});Browser.init()}return ctx},destroyContext:function(canvas,useWebGL,setInModule){},fullScreenHandlersInstalled:false,lockPointer:undefined,resizeCanvas:undefined,requestFullScreen:function(lockPointer,resizeCanvas,vrDevice){Browser.lockPointer=lockPointer;Browser.resizeCanvas=resizeCanvas;Browser.vrDevice=vrDevice;if(typeof Browser.lockPointer==="undefined")Browser.lockPointer=true;if(typeof Browser.resizeCanvas==="undefined")Browser.resizeCanvas=false;if(typeof Browser.vrDevice==="undefined")Browser.vrDevice=null;var canvas=Module["canvas"];function fullScreenChange(){Browser.isFullScreen=false;var canvasContainer=canvas.parentNode;if((document["webkitFullScreenElement"]||document["webkitFullscreenElement"]||document["mozFullScreenElement"]||document["mozFullscreenElement"]||document["fullScreenElement"]||document["fullscreenElement"]||document["msFullScreenElement"]||document["msFullscreenElement"]||document["webkitCurrentFullScreenElement"])===canvasContainer){canvas.cancelFullScreen=document["cancelFullScreen"]||document["mozCancelFullScreen"]||document["webkitCancelFullScreen"]||document["msExitFullscreen"]||document["exitFullscreen"]||function(){};canvas.cancelFullScreen=canvas.cancelFullScreen.bind(document);if(Browser.lockPointer)canvas.requestPointerLock();Browser.isFullScreen=true;if(Browser.resizeCanvas)Browser.setFullScreenCanvasSize()}else{canvasContainer.parentNode.insertBefore(canvas,canvasContainer);canvasContainer.parentNode.removeChild(canvasContainer);if(Browser.resizeCanvas)Browser.setWindowedCanvasSize()}if(Module["onFullScreen"])Module["onFullScreen"](Browser.isFullScreen);Browser.updateCanvasDimensions(canvas)}if(!Browser.fullScreenHandlersInstalled){Browser.fullScreenHandlersInstalled=true;document.addEventListener("fullscreenchange",fullScreenChange,false);document.addEventListener("mozfullscreenchange",fullScreenChange,false);document.addEventListener("webkitfullscreenchange",fullScreenChange,false);document.addEventListener("MSFullscreenChange",fullScreenChange,false)}var canvasContainer=document.createElement("div");canvas.parentNode.insertBefore(canvasContainer,canvas);canvasContainer.appendChild(canvas);canvasContainer.requestFullScreen=canvasContainer["requestFullScreen"]||canvasContainer["mozRequestFullScreen"]||canvasContainer["msRequestFullscreen"]||(canvasContainer["webkitRequestFullScreen"]?function(){canvasContainer["webkitRequestFullScreen"](Element["ALLOW_KEYBOARD_INPUT"])}:null);if(vrDevice){canvasContainer.requestFullScreen({vrDisplay:vrDevice})}else{canvasContainer.requestFullScreen()}},nextRAF:0,fakeRequestAnimationFrame:function(func){var now=Date.now();if(Browser.nextRAF===0){Browser.nextRAF=now+1e3/60}else{while(now+2>=Browser.nextRAF){Browser.nextRAF+=1e3/60}}var delay=Math.max(Browser.nextRAF-now,0);setTimeout(func,delay)},requestAnimationFrame:function requestAnimationFrame(func){if(typeof window==="undefined"){Browser.fakeRequestAnimationFrame(func)}else{if(!window.requestAnimationFrame){window.requestAnimationFrame=window["requestAnimationFrame"]||window["mozRequestAnimationFrame"]||window["webkitRequestAnimationFrame"]||window["msRequestAnimationFrame"]||window["oRequestAnimationFrame"]||Browser.fakeRequestAnimationFrame}window.requestAnimationFrame(func)}},safeCallback:function(func){return function(){if(!ABORT)return func.apply(null,arguments)}},allowAsyncCallbacks:true,queuedAsyncCallbacks:[],pauseAsyncCallbacks:function(){Browser.allowAsyncCallbacks=false},resumeAsyncCallbacks:function(){Browser.allowAsyncCallbacks=true;if(Browser.queuedAsyncCallbacks.length>0){var callbacks=Browser.queuedAsyncCallbacks;Browser.queuedAsyncCallbacks=[];callbacks.forEach(function(func){func()})}},safeRequestAnimationFrame:function(func){return Browser.requestAnimationFrame(function(){if(ABORT)return;if(Browser.allowAsyncCallbacks){func()}else{Browser.queuedAsyncCallbacks.push(func)}})},safeSetTimeout:function(func,timeout){Module["noExitRuntime"]=true;return setTimeout(function(){if(ABORT)return;if(Browser.allowAsyncCallbacks){func()}else{Browser.queuedAsyncCallbacks.push(func)}},timeout)},safeSetInterval:function(func,timeout){Module["noExitRuntime"]=true;return setInterval(function(){if(ABORT)return;if(Browser.allowAsyncCallbacks){func()}},timeout)},getMimetype:function(name){return{jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",bmp:"image/bmp",ogg:"audio/ogg",wav:"audio/wav",mp3:"audio/mpeg"}[name.substr(name.lastIndexOf(".")+1)]},getUserMedia:function(func){if(!window.getUserMedia){window.getUserMedia=navigator["getUserMedia"]||navigator["mozGetUserMedia"]}window.getUserMedia(func)},getMovementX:function(event){return event["movementX"]||event["mozMovementX"]||event["webkitMovementX"]||0},getMovementY:function(event){return event["movementY"]||event["mozMovementY"]||event["webkitMovementY"]||0},getMouseWheelDelta:function(event){var delta=0;switch(event.type){case"DOMMouseScroll":delta=event.detail;break;case"mousewheel":delta=event.wheelDelta;break;case"wheel":delta=event["deltaY"];break;default:throw"unrecognized mouse wheel event: "+event.type}return delta},mouseX:0,mouseY:0,mouseMovementX:0,mouseMovementY:0,touches:{},lastTouches:{},calculateMouseEvent:function(event){if(Browser.pointerLock){if(event.type!="mousemove"&&"mozMovementX"in event){Browser.mouseMovementX=Browser.mouseMovementY=0}else{Browser.mouseMovementX=Browser.getMovementX(event);Browser.mouseMovementY=Browser.getMovementY(event)}if(typeof SDL!="undefined"){Browser.mouseX=SDL.mouseX+Browser.mouseMovementX;Browser.mouseY=SDL.mouseY+Browser.mouseMovementY}else{Browser.mouseX+=Browser.mouseMovementX;Browser.mouseY+=Browser.mouseMovementY}}else{var rect=Module["canvas"].getBoundingClientRect();var cw=Module["canvas"].width;var ch=Module["canvas"].height;var scrollX=typeof window.scrollX!=="undefined"?window.scrollX:window.pageXOffset;var scrollY=typeof window.scrollY!=="undefined"?window.scrollY:window.pageYOffset;if(event.type==="touchstart"||event.type==="touchend"||event.type==="touchmove"){var touch=event.touch;if(touch===undefined){return}var adjustedX=touch.pageX-(scrollX+rect.left);var adjustedY=touch.pageY-(scrollY+rect.top);adjustedX=adjustedX*(cw/rect.width);adjustedY=adjustedY*(ch/rect.height);var coords={x:adjustedX,y:adjustedY};if(event.type==="touchstart"){Browser.lastTouches[touch.identifier]=coords;Browser.touches[touch.identifier]=coords}else if(event.type==="touchend"||event.type==="touchmove"){var last=Browser.touches[touch.identifier];if(!last)last=coords;Browser.lastTouches[touch.identifier]=last;Browser.touches[touch.identifier]=coords}return}var x=event.pageX-(scrollX+rect.left);var y=event.pageY-(scrollY+rect.top);x=x*(cw/rect.width);y=y*(ch/rect.height);Browser.mouseMovementX=x-Browser.mouseX;Browser.mouseMovementY=y-Browser.mouseY;Browser.mouseX=x;Browser.mouseY=y}},xhrLoad:function(url,onload,onerror){var xhr=new XMLHttpRequest;xhr.open("GET",url,true);xhr.responseType="arraybuffer";xhr.onload=function xhr_onload(){if(xhr.status==200||xhr.status==0&&xhr.response){onload(xhr.response)}else{onerror()}};xhr.onerror=onerror;xhr.send(null)},asyncLoad:function(url,onload,onerror,noRunDep){Browser.xhrLoad(url,function(arrayBuffer){assert(arrayBuffer,\'Loading data file "\'+url+\'" failed (no arrayBuffer).\');onload(new Uint8Array(arrayBuffer));if(!noRunDep)removeRunDependency("al "+url)},function(event){if(onerror){onerror()}else{throw\'Loading data file "\'+url+\'" failed.\'}});if(!noRunDep)addRunDependency("al "+url)},resizeListeners:[],updateResizeListeners:function(){var canvas=Module["canvas"];Browser.resizeListeners.forEach(function(listener){listener(canvas.width,canvas.height)})},setCanvasSize:function(width,height,noUpdates){var canvas=Module["canvas"];Browser.updateCanvasDimensions(canvas,width,height);if(!noUpdates)Browser.updateResizeListeners()},windowedWidth:0,windowedHeight:0,setFullScreenCanvasSize:function(){if(typeof SDL!="undefined"){var flags=HEAPU32[SDL.screen+Runtime.QUANTUM_SIZE*0>>2];flags=flags|8388608;HEAP32[SDL.screen+Runtime.QUANTUM_SIZE*0>>2]=flags}Browser.updateResizeListeners()},setWindowedCanvasSize:function(){if(typeof SDL!="undefined"){var flags=HEAPU32[SDL.screen+Runtime.QUANTUM_SIZE*0>>2];flags=flags&~8388608;HEAP32[SDL.screen+Runtime.QUANTUM_SIZE*0>>2]=flags}Browser.updateResizeListeners()},updateCanvasDimensions:function(canvas,wNative,hNative){if(wNative&&hNative){canvas.widthNative=wNative;canvas.heightNative=hNative}else{wNative=canvas.widthNative;hNative=canvas.heightNative}var w=wNative;var h=hNative;if(Module["forcedAspectRatio"]&&Module["forcedAspectRatio"]>0){if(w/h<Module["forcedAspectRatio"]){w=Math.round(h*Module["forcedAspectRatio"])}else{h=Math.round(w/Module["forcedAspectRatio"])}}if((document["webkitFullScreenElement"]||document["webkitFullscreenElement"]||document["mozFullScreenElement"]||document["mozFullscreenElement"]||document["fullScreenElement"]||document["fullscreenElement"]||document["msFullScreenElement"]||document["msFullscreenElement"]||document["webkitCurrentFullScreenElement"])===canvas.parentNode&&typeof screen!="undefined"){var factor=Math.min(screen.width/w,screen.height/h);w=Math.round(w*factor);h=Math.round(h*factor)}if(Browser.resizeCanvas){if(canvas.width!=w)canvas.width=w;if(canvas.height!=h)canvas.height=h;if(typeof canvas.style!="undefined"){canvas.style.removeProperty("width");canvas.style.removeProperty("height")}}else{if(canvas.width!=wNative)canvas.width=wNative;if(canvas.height!=hNative)canvas.height=hNative;if(typeof canvas.style!="undefined"){if(w!=wNative||h!=hNative){canvas.style.setProperty("width",w+"px","important");canvas.style.setProperty("height",h+"px","important")}else{canvas.style.removeProperty("width");canvas.style.removeProperty("height")}}}},wgetRequests:{},nextWgetRequestHandle:0,getNextWgetRequestHandle:function(){var handle=Browser.nextWgetRequestHandle;Browser.nextWgetRequestHandle++;return handle}};function _time(ptr){var ret=Date.now()/1e3|0;if(ptr){HEAP32[ptr>>2]=ret}return ret}function _pthread_self(){return 0}Module["requestFullScreen"]=function Module_requestFullScreen(lockPointer,resizeCanvas,vrDevice){Browser.requestFullScreen(lockPointer,resizeCanvas,vrDevice)};Module["requestAnimationFrame"]=function Module_requestAnimationFrame(func){Browser.requestAnimationFrame(func)};Module["setCanvasSize"]=function Module_setCanvasSize(width,height,noUpdates){Browser.setCanvasSize(width,height,noUpdates)};Module["pauseMainLoop"]=function Module_pauseMainLoop(){Browser.mainLoop.pause()};Module["resumeMainLoop"]=function Module_resumeMainLoop(){Browser.mainLoop.resume()};Module["getUserMedia"]=function Module_getUserMedia(){Browser.getUserMedia()};Module["createContext"]=function Module_createContext(canvas,useWebGL,setInModule,webGLContextAttributes){return Browser.createContext(canvas,useWebGL,setInModule,webGLContextAttributes)};FS.staticInit();__ATINIT__.unshift(function(){if(!Module["noFSInit"]&&!FS.init.initialized)FS.init()});__ATMAIN__.push(function(){FS.ignorePermissions=false});__ATEXIT__.push(function(){FS.quit()});Module["FS_createFolder"]=FS.createFolder;Module["FS_createPath"]=FS.createPath;Module["FS_createDataFile"]=FS.createDataFile;Module["FS_createPreloadedFile"]=FS.createPreloadedFile;Module["FS_createLazyFile"]=FS.createLazyFile;Module["FS_createLink"]=FS.createLink;Module["FS_createDevice"]=FS.createDevice;Module["FS_unlink"]=FS.unlink;__ATINIT__.unshift(function(){TTY.init()});__ATEXIT__.push(function(){TTY.shutdown()});STACK_BASE=STACKTOP=Runtime.alignMemory(STATICTOP);staticSealed=true;STACK_MAX=STACK_BASE+TOTAL_STACK;DYNAMIC_BASE=DYNAMICTOP=Runtime.alignMemory(STACK_MAX);assert(DYNAMIC_BASE<TOTAL_MEMORY,"TOTAL_MEMORY not big enough for stack");Module.asmGlobalArg={Math:Math,Int8Array:Int8Array,Int16Array:Int16Array,Int32Array:Int32Array,Uint8Array:Uint8Array,Uint16Array:Uint16Array,Uint32Array:Uint32Array,Float32Array:Float32Array,Float64Array:Float64Array,NaN:NaN,Infinity:Infinity};Module.asmLibraryArg={abort:abort,assert:assert,_sysconf:_sysconf,_pthread_self:_pthread_self,_abort:_abort,___setErrNo:___setErrNo,_sbrk:_sbrk,_time:_time,_emscripten_set_main_loop_timing:_emscripten_set_main_loop_timing,_emscripten_memcpy_big:_emscripten_memcpy_big,_emscripten_set_main_loop:_emscripten_set_main_loop,STACKTOP:STACKTOP,STACK_MAX:STACK_MAX,tempDoublePtr:tempDoublePtr,ABORT:ABORT};var asm=function(global,env,buffer){"use asm";var a=new global.Int8Array(buffer);var b=new global.Int16Array(buffer);var c=new global.Int32Array(buffer);var d=new global.Uint8Array(buffer);var e=new global.Uint16Array(buffer);var f=new global.Uint32Array(buffer);var g=new global.Float32Array(buffer);var h=new global.Float64Array(buffer);var i=env.STACKTOP|0;var j=env.STACK_MAX|0;var k=env.tempDoublePtr|0;var l=env.ABORT|0;var m=0;var n=0;var o=0;var p=0;var q=global.NaN,r=global.Infinity;var s=0,t=0,u=0,v=0,w=0.0,x=0,y=0,z=0,A=0.0;var B=0;var C=0;var D=0;var E=0;var F=0;var G=0;var H=0;var I=0;var J=0;var K=0;var L=global.Math.floor;var M=global.Math.abs;var N=global.Math.sqrt;var O=global.Math.pow;var P=global.Math.cos;var Q=global.Math.sin;var R=global.Math.tan;var S=global.Math.acos;var T=global.Math.asin;var U=global.Math.atan;var V=global.Math.atan2;var W=global.Math.exp;var X=global.Math.log;var Y=global.Math.ceil;var Z=global.Math.imul;var _=global.Math.min;var $=global.Math.clz32;var aa=env.abort;var ba=env.assert;var ca=env._sysconf;var da=env._pthread_self;var ea=env._abort;var fa=env.___setErrNo;var ga=env._sbrk;var ha=env._time;var ia=env._emscripten_set_main_loop_timing;var ja=env._emscripten_memcpy_big;var ka=env._emscripten_set_main_loop;var la=0.0;function ma(a){a=a|0;var b=0;b=i;i=i+a|0;i=i+15&-16;return b|0}function na(){return i|0}function oa(a){a=a|0;i=a}function pa(a,b){a=a|0;b=b|0;i=a;j=b}function qa(a,b){a=a|0;b=b|0;if(!m){m=a;n=b}}function ra(b){b=b|0;a[k>>0]=a[b>>0];a[k+1>>0]=a[b+1>>0];a[k+2>>0]=a[b+2>>0];a[k+3>>0]=a[b+3>>0]}function sa(b){b=b|0;a[k>>0]=a[b>>0];a[k+1>>0]=a[b+1>>0];a[k+2>>0]=a[b+2>>0];a[k+3>>0]=a[b+3>>0];a[k+4>>0]=a[b+4>>0];a[k+5>>0]=a[b+5>>0];a[k+6>>0]=a[b+6>>0];a[k+7>>0]=a[b+7>>0]}function ta(a){a=a|0;B=a}function ua(){return B|0}function va(){var a=0,b=0;b=i;i=i+16|0;a=b;c[a>>2]=0;Db(a,31756)|0;i=b;return c[a>>2]|0}function wa(a){a=a|0;var b=0,d=0;b=i;i=i+16|0;d=b;c[d>>2]=a;Eb(d);i=b;return}function xa(a,b,c,e){a=a|0;b=b|0;c=c|0;e=e|0;Ea(a,(e|0)==0?(d[b>>0]|0)>>>3&15:15,b+1|0,c,2)|0;return}function ya(a){a=a|0;var b=0;b=Je(8)|0;Hb(b,b+4|0,a)|0;return b|0}function za(a){a=a|0;Ib(a,a+4|0);Ke(a);return}function Aa(b,e,f,g,h){b=b|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0;h=i;i=i+16|0;j=h;c[j>>2]=e;f=(Jb(c[b>>2]|0,c[b+4>>2]|0,e,f,g,j,3)|0)<<16>>16;a[g>>0]=d[g>>0]|0|4;i=h;return f|0}function Ba(a){a=a|0;if(!a)a=-1;else{b[a>>1]=4096;a=0}return a|0}function Ca(a,d,e,f,g,h){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;m=c[h>>2]|0;q=g<<16>>16>0;if(q){i=0;j=0;do{l=b[e+(i<<1)>>1]|0;l=Z(l,l)|0;if((l|0)!=1073741824){k=(l<<1)+j|0;if((l^j|0)>0&(k^j|0)<0){c[h>>2]=1;j=(j>>>31)+2147483647|0}else j=k}else{c[h>>2]=1;j=2147483647}i=i+1|0}while((i&65535)<<16>>16!=g<<16>>16);if((j|0)==2147483647){c[h>>2]=m;l=0;k=0;do{j=b[e+(l<<1)>>1]>>2;j=Z(j,j)|0;if((j|0)!=1073741824){i=(j<<1)+k|0;if((j^k|0)>0&(i^k|0)<0){c[h>>2]=1;k=(k>>>31)+2147483647|0}else k=i}else{c[h>>2]=1;k=2147483647}l=l+1|0}while((l&65535)<<16>>16!=g<<16>>16)}else p=8}else{j=0;p=8}if((p|0)==8)k=j>>4;if(!k){b[a>>1]=0;return}o=((pe(k)|0)&65535)+65535|0;j=o<<16>>16;if((o&65535)<<16>>16>0){i=k<<j;if((i>>j|0)==(k|0))k=i;else k=k>>31^2147483647}else{j=0-j<<16;if((j|0)<2031616)k=k>>(j>>16);else k=0}n=Ce(k,h)|0;i=c[h>>2]|0;if(q){j=0;k=0;do{m=b[d+(j<<1)>>1]|0;m=Z(m,m)|0;if((m|0)!=1073741824){l=(m<<1)+k|0;if((m^k|0)>0&(l^k|0)<0){c[h>>2]=1;k=(k>>>31)+2147483647|0}else k=l}else{c[h>>2]=1;k=2147483647}j=j+1|0}while((j&65535)<<16>>16!=g<<16>>16);if((k|0)==2147483647){c[h>>2]=i;m=0;k=0;do{l=b[d+(m<<1)>>1]>>2;l=Z(l,l)|0;if((l|0)!=1073741824){j=(l<<1)+k|0;if((l^k|0)>0&(j^k|0)<0){c[h>>2]=1;k=(k>>>31)+2147483647|0}else k=j}else{c[h>>2]=1;k=2147483647}m=m+1|0}while((m&65535)<<16>>16!=g<<16>>16)}else p=29}else{k=0;p=29}if((p|0)==29)k=k>>4;if(!k)l=0;else{j=(pe(k)|0)<<16>>16;i=o-j|0;l=i&65535;k=(Td(n,Ce(k<<j,h)|0)|0)<<16>>16;j=k<<7;i=i<<16>>16;if(l<<16>>16>0)i=l<<16>>16<31?j>>i:0;else{p=0-i<<16>>16;i=j<<p;i=(i>>p|0)==(j|0)?i:k>>24^2147483647}l=(Z(((ce(i,h)|0)<<9)+32768>>16,32767-(f&65535)<<16>>16)|0)>>>15<<16>>16}i=b[a>>1]|0;if(q){k=f<<16>>16;j=0;while(1){f=((Z(i<<16>>16,k)|0)>>>15&65535)+l|0;i=f&65535;b[e>>1]=(Z(b[e>>1]|0,f<<16>>16)|0)>>>12;j=j+1<<16>>16;if(j<<16>>16>=g<<16>>16)break;else e=e+2|0}}b[a>>1]=i;return}function Da(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;i=c[f>>2]|0;g=e<<16>>16>0;if(g){j=0;h=0;do{l=b[d+(j<<1)>>1]|0;l=Z(l,l)|0;if((l|0)!=1073741824){k=(l<<1)+h|0;if((l^h|0)>0&(k^h|0)<0){c[f>>2]=1;h=(h>>>31)+2147483647|0}else h=k}else{c[f>>2]=1;h=2147483647}j=j+1|0}while((j&65535)<<16>>16!=e<<16>>16);if((h|0)==2147483647){c[f>>2]=i;l=0;i=0;do{k=b[d+(l<<1)>>1]>>2;k=Z(k,k)|0;if((k|0)!=1073741824){j=(k<<1)+i|0;if((k^i|0)>0&(j^i|0)<0){c[f>>2]=1;i=(i>>>31)+2147483647|0}else i=j}else{c[f>>2]=1;i=2147483647}l=l+1|0}while((l&65535)<<16>>16!=e<<16>>16)}else o=8}else{h=0;o=8}if((o|0)==8)i=h>>4;if(!i)return;n=((pe(i)|0)&65535)+65535|0;k=n<<16>>16;if((n&65535)<<16>>16>0){j=i<<k;if((j>>k|0)==(i|0))i=j;else i=i>>31^2147483647}else{k=0-k<<16;if((k|0)<2031616)i=i>>(k>>16);else i=0}m=Ce(i,f)|0;i=c[f>>2]|0;if(g){j=0;h=0;do{l=b[a+(j<<1)>>1]|0;l=Z(l,l)|0;if((l|0)!=1073741824){k=(l<<1)+h|0;if((l^h|0)>0&(k^h|0)<0){c[f>>2]=1;h=(h>>>31)+2147483647|0}else h=k}else{c[f>>2]=1;h=2147483647}j=j+1|0}while((j&65535)<<16>>16!=e<<16>>16);if((h|0)==2147483647){c[f>>2]=i;i=0;j=0;do{l=b[a+(i<<1)>>1]>>2;l=Z(l,l)|0;if((l|0)!=1073741824){k=(l<<1)+j|0;if((l^j|0)>0&(k^j|0)<0){c[f>>2]=1;j=(j>>>31)+2147483647|0}else j=k}else{c[f>>2]=1;j=2147483647}i=i+1|0}while((i&65535)<<16>>16!=e<<16>>16)}else o=28}else{h=0;o=28}if((o|0)==28)j=h>>4;if(!j)g=0;else{l=pe(j)|0;k=l<<16>>16;if(l<<16>>16>0){i=j<<k;if((i>>k|0)==(j|0))j=i;else j=j>>31^2147483647}else{k=0-k<<16;if((k|0)<2031616)j=j>>(k>>16);else j=0}i=n-(l&65535)|0;k=i&65535;h=(Td(m,Ce(j,f)|0)|0)<<16>>16;g=h<<7;i=i<<16>>16;if(k<<16>>16>0)g=k<<16>>16<31?g>>i:0;else{n=0-i<<16>>16;a=g<<n;g=(a>>n|0)==(g|0)?a:h>>24^2147483647}g=ce(g,f)|0;if((g|0)>4194303)g=2147483647;else g=(g|0)<-4194304?-2147483648:g<<9;g=Ce(g,f)|0}h=(e&65535)+65535&65535;if(h<<16>>16<=-1)return;l=g<<16>>16;k=e+-1<<16>>16<<16>>16;while(1){i=d+(k<<1)|0;g=Z(b[i>>1]|0,l)|0;do{if((g|0)!=1073741824){j=g<<1;if((j|0)<=268435455)if((j|0)<-268435456){b[i>>1]=-32768;break}else{b[i>>1]=g>>>12;break}else o=52}else{c[f>>2]=1;o=52}}while(0);if((o|0)==52){o=0;b[i>>1]=32767}h=h+-1<<16>>16;if(h<<16>>16<=-1)break;else k=k+-1|0}return}function Ea(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;l=i;i=i+496|0;k=l;j=(g|0)==2;do{if(!(j&1|(g|0)==4)){if(g){a=-1;i=l;return a|0}j=b[e>>1]|0;d=e+490|0;g=e+2|0;h=0;while(1){b[k+(h<<1)>>1]=b[g>>1]|0;h=h+1|0;if((h|0)==244)break;else g=g+2|0}h=j<<16>>16;if(j<<16>>16==7){g=492;d=c[a+1760>>2]|0;break}else{g=492;d=b[d>>1]|0;break}}else{h=a+1168|0;if(j){Gb(d,e,k,h);h=604}else{pb(d,e,k,h);h=3436}g=b[h+(d<<1)>>1]|0;do{if(d>>>0>=8){if((d|0)==8){d=b[k+76>>1]<<2|(b[k+74>>1]<<1|b[k+72>>1]);h=(b[k+70>>1]|0)==0?4:5;break}if(d>>>0<15){a=-1;i=l;return a|0}else{d=c[a+1760>>2]|0;h=7;break}}else h=0}while(0);if(g<<16>>16==-1){a=-1;i=l;return a|0}}}while(0);Fb(a,d,k,h,f);c[a+1760>>2]=d;a=g;i=l;return a|0}function Fa(a,d,f){a=a|0;d=d|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;t=i;i=i+48|0;r=t+20|0;s=t;h=r;g=h+20|0;do{b[h>>1]=b[a>>1]|0;h=h+2|0;a=a+2|0}while((h|0)<(g|0));a=b[r+18>>1]|0;q=(a&65535)-((a&65535)>>>15&65535)|0;a:do{if(((q<<16>>31^q)&65535)<<16>>16<=4095){g=9;q=9;while(1){a=a<<16>>16;a=(a<<19>>19|0)==(a|0)?a<<3:a>>>15^32767;p=d+(g<<1)|0;b[p>>1]=a;a=a<<16>>16;a=Z(a,a)|0;if((a|0)==1073741824){c[f>>2]=1;h=2147483647}else h=a<<1;a=2147483647-h|0;if((a&h|0)<0){c[f>>2]=1;a=2147483647}n=pe(a)|0;o=15-(n&65535)&65535;j=n<<16>>16;if(n<<16>>16>0){h=a<<j;if((h>>j|0)!=(a|0))h=a>>31^2147483647}else{h=0-j<<16;if((h|0)<2031616)h=a>>(h>>16);else h=0}h=Td(16384,Ce(h,f)|0)|0;do{if(q<<16>>16>0){n=g+-1|0;k=h<<16>>16;l=q<<16>>16;m=0;while(1){g=e[r+(m<<1)>>1]|0;a=g<<16;j=Z(b[r+(n-m<<1)>>1]|0,b[p>>1]|0)|0;if((j|0)==1073741824){c[f>>2]=1;h=2147483647}else h=j<<1;j=a-h|0;if(((j^a)&(h^a)|0)<0){c[f>>2]=1;j=(g>>>15)+2147483647|0}j=Z((Ce(j,f)|0)<<16>>16,k)|0;if((j|0)==1073741824){c[f>>2]=1;j=2147483647}else j=j<<1;j=ge(j,o,f)|0;h=j-(j>>>31)|0;if((h>>31^h|0)>32767){j=24;break}b[s+(m<<1)>>1]=j;m=m+1|0;if((l|0)<=(m|0)){j=26;break}}if((j|0)==24){j=0;h=d;g=h+20|0;do{b[h>>1]=0;h=h+2|0}while((h|0)<(g|0));a=10}else if((j|0)==26){j=0;if(q<<16>>16>0)a=q;else{j=28;break}}h=a+-1<<16>>16;Oe(r|0,s|0,((h&65535)<<1)+2|0)|0;g=h<<16>>16}else j=28}while(0);if((j|0)==28){a=q+-1<<16>>16;if(a<<16>>16>-1){g=a<<16>>16;h=32767}else break}a=b[r+(g<<1)>>1]|0;q=(a&65535)-((a&65535)>>>15&65535)|0;if(((q<<16>>31^q)&65535)<<16>>16>4095)break a;else q=h}i=t;return}}while(0);h=d;g=h+20|0;do{b[h>>1]=0;h=h+2|0}while((h|0)<(g|0));i=t;return}function Ga(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0,h=0;if(b<<16>>16<=0){a=0;return a|0}e=c[a>>2]|0;f=0;d=0;do{h=e&1;d=h|d<<1&131070;g=e>>1;e=(h|0)==(e>>>28&1|0)?g:g|1073741824;f=f+1<<16>>16}while(f<<16>>16<b<<16>>16);c[a>>2]=e;h=d&65535;return h|0}function Ha(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0;g=d;f=g+80|0;do{b[g>>1]=0;g=g+2|0}while((g|0)<(f|0));f=0;g=c[a>>2]|0;do{k=g&1;j=g>>1;j=(k|0)==(g>>>28&1|0)?j:j|1073741824;h=j&1;i=j>>1;c[a>>2]=(h|0)==(j>>>28&1|0)?i:i|1073741824;h=Rd((Z(k<<1|h,1310720)|0)>>>17&65535,f,e)|0;k=c[a>>2]|0;i=k&1;j=k>>1;g=(i|0)==(k>>>28&1|0)?j:j|1073741824;c[a>>2]=g;b[d+(h<<16>>16<<1)>>1]=((i&65535)<<13&65535)+-4096<<16>>16;f=f+1<<16>>16}while(f<<16>>16<10);return}function Ia(a,d,f,g,h,i){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0;j=b[a>>1]|0;if((j*31821|0)==1073741824){c[i>>2]=1;k=1073741823}else k=j*63642>>1;j=k+13849|0;if((k|0)>-1&(j^k|0)<0){c[i>>2]=1;j=(k>>>31)+2147483647|0}b[a>>1]=j;if(d<<16>>16<=0)return;k=0;j=h+((j&127)<<1)|0;while(1){b[g+(k<<1)>>1]=(-65536<<b[f+(k<<1)>>1]>>>16^65535)&e[j>>1];k=k+1|0;if((k&65535)<<16>>16==d<<16>>16)break;else j=j+2|0}return}function Ja(a){a=a|0;var c=0;if(!a){c=-1;return c|0}c=a+122|0;do{b[a>>1]=0;a=a+2|0}while((a|0)<(c|0));c=0;return c|0}function Ka(a,d,f,g,h){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0;k=159;j=0;while(1){m=b[f+(k<<1)>>1]|0;m=Z(m,m)|0;m=(m|0)==1073741824?2147483647:m<<1;i=m+j|0;if((m^j|0)>-1&(i^j|0)<0){c[h>>2]=1;j=(j>>>31)+2147483647|0}else j=i;if((k|0)>0)k=k+-1|0;else{k=j;break}}h=k>>>14&65535;j=32767;i=59;while(1){m=b[a+(i<<1)>>1]|0;j=m<<16>>16<j<<16>>16?m:j;if((i|0)>0)i=i+-1|0;else break}m=(k|0)>536870911?32767:h;h=j<<16>>16;i=h<<20>>16;k=j<<16>>16>0?32767:-32768;f=55;j=b[a>>1]|0;while(1){l=b[a+(f<<1)>>1]|0;j=j<<16>>16<l<<16>>16?l:j;if((f|0)>1)f=f+-1|0;else break}f=b[a+80>>1]|0;l=b[a+82>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+84>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+86>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+88>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+90>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+92>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+94>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+96>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+98>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+100>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+102>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+104>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+106>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+108>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+110>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+112>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+114>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=b[a+116>>1]|0;f=f<<16>>16<l<<16>>16?l:f;l=a+118|0;o=b[l>>1]|0;do{if((m+-21&65535)<17557&j<<16>>16>20?(m<<16>>16|0)<(((h<<4|0)==(i|0)?i:k)|0)?1:(f<<16>>16<o<<16>>16?o:f)<<16>>16<1953:0){j=a+120|0;i=b[j>>1]|0;if(i<<16>>16>29){b[j>>1]=30;f=j;k=1;break}else{k=(i&65535)+1&65535;b[j>>1]=k;f=j;k=k<<16>>16>1&1;break}}else n=14}while(0);if((n|0)==14){f=a+120|0;b[f>>1]=0;k=0}j=0;do{o=j;j=j+1|0;b[a+(o<<1)>>1]=b[a+(j<<1)>>1]|0}while((j|0)!=59);b[l>>1]=m;j=b[f>>1]|0;j=j<<16>>16>15?16383:j<<16>>16>8?15565:13926;i=Zd(d+8|0,5)|0;if((b[f>>1]|0)>20){if(((Zd(d,9)|0)<<16>>16|0)>(j|0))n=20}else if((i<<16>>16|0)>(j|0))n=20;if((n|0)==20){b[g>>1]=0;return k|0}i=(e[g>>1]|0)+1&65535;if(i<<16>>16>10){b[g>>1]=10;return k|0}else{b[g>>1]=i;return k|0}return 0}function La(a){a=a|0;var c=0;if(!a){c=-1;return c|0}c=a+18|0;do{b[a>>1]=0;a=a+2|0}while((a|0)<(c|0));c=0;return c|0}function Ma(a,d,f,g,h,i,j,k,l,m,n,o){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;y=a+2|0;b[a>>1]=b[y>>1]|0;z=a+4|0;b[y>>1]=b[z>>1]|0;A=a+6|0;b[z>>1]=b[A>>1]|0;B=a+8|0;b[A>>1]=b[B>>1]|0;C=a+10|0;b[B>>1]=b[C>>1]|0;D=a+12|0;b[C>>1]=b[D>>1]|0;b[D>>1]=f;t=0;x=0;do{p=h+(x<<1)|0;r=Ge(b[p>>1]|0,b[g+(x<<1)>>1]|0,o)|0;r=(r&65535)-((r&65535)>>>15&65535)|0;r=r<<16>>31^r;w=((qe(r&65535)|0)&65535)+65535|0;q=w<<16>>16;if((w&65535)<<16>>16<0){s=0-q<<16;if((s|0)<983040)u=r<<16>>16>>(s>>16)&65535;else u=0}else{s=r<<16>>16;r=s<<q;if((r<<16>>16>>q|0)==(s|0))u=r&65535;else u=(s>>>15^32767)&65535}v=qe(b[p>>1]|0)|0;r=b[p>>1]|0;q=v<<16>>16;if(v<<16>>16<0){s=0-q<<16;if((s|0)<983040)s=r<<16>>16>>(s>>16)&65535;else s=0}else{s=r<<16>>16;r=s<<q;if((r<<16>>16>>q|0)==(s|0))s=r&65535;else s=(s>>>15^32767)&65535}q=Td(u,s)|0;s=(w&65535)+2-(v&65535)|0;r=s&65535;do{if(s&32768){if(r<<16>>16!=-32768){w=0-s|0;s=w<<16>>16;if((w&65535)<<16>>16<0){s=0-s<<16;if((s|0)>=983040){s=0;break}s=q<<16>>16>>(s>>16)&65535;break}}else s=32767;r=q<<16>>16;q=r<<s;if((q<<16>>16>>s|0)==(r|0))s=q&65535;else s=(r>>>15^32767)&65535}else s=De(q,r,o)|0}while(0);t=Rd(t,s,o)|0;x=x+1|0}while((x|0)!=10);s=t&65535;r=t<<16>>16>5325;t=a+14|0;if(r){h=(e[t>>1]|0)+1&65535;b[t>>1]=h;if(h<<16>>16>10)b[a+16>>1]=0}else b[t>>1]=0;switch(d|0){case 0:case 1:case 2:case 3:case 6:break;default:{D=a+16|0;o=f;f=b[D>>1]|0;f=f&65535;f=f+1|0;f=f&65535;b[D>>1]=f;return o|0}}u=(j|i)<<16>>16==0;v=m<<16>>16==0;w=d>>>0<3;t=s+(w&((v|(u&(k<<16>>16==0|l<<16>>16==0)|n<<16>>16<2))^1)?61030:62259)&65535;t=t<<16>>16>0?t:0;if(t<<16>>16<=2048){t=t<<16>>16;if((t<<18>>18|0)==(t|0))l=t<<2;else l=t>>>15^32767}else l=8192;k=a+16|0;n=r|(b[k>>1]|0)<40;t=b[z>>1]|0;if((t*6554|0)==1073741824){c[o>>2]=1;r=2147483647}else r=t*13108|0;t=b[A>>1]|0;s=t*6554|0;if((s|0)!=1073741824){t=(t*13108|0)+r|0;if((s^r|0)>0&(t^r|0)<0){c[o>>2]=1;t=(r>>>31)+2147483647|0}}else{c[o>>2]=1;t=2147483647}s=b[B>>1]|0;r=s*6554|0;if((r|0)!=1073741824){s=(s*13108|0)+t|0;if((r^t|0)>0&(s^t|0)<0){c[o>>2]=1;s=(t>>>31)+2147483647|0}}else{c[o>>2]=1;s=2147483647}t=b[C>>1]|0;r=t*6554|0;if((r|0)!=1073741824){t=(t*13108|0)+s|0;if((r^s|0)>0&(t^s|0)<0){c[o>>2]=1;r=(s>>>31)+2147483647|0}else r=t}else{c[o>>2]=1;r=2147483647}t=b[D>>1]|0;s=t*6554|0;if((s|0)!=1073741824){t=(t*13108|0)+r|0;if((s^r|0)>0&(t^r|0)<0){c[o>>2]=1;t=(r>>>31)+2147483647|0}}else{c[o>>2]=1;t=2147483647}r=Ce(t,o)|0;if(w&((u|v)^1)){t=b[a>>1]|0;if((t*4681|0)==1073741824){c[o>>2]=1;r=2147483647}else r=t*9362|0;t=b[y>>1]|0;s=t*4681|0;if((s|0)!=1073741824){t=(t*9362|0)+r|0;if((s^r|0)>0&(t^r|0)<0){c[o>>2]=1;r=(r>>>31)+2147483647|0}else r=t}else{c[o>>2]=1;r=2147483647}t=b[z>>1]|0;s=t*4681|0;if((s|0)!=1073741824){t=(t*9362|0)+r|0;if((s^r|0)>0&(t^r|0)<0){c[o>>2]=1;r=(r>>>31)+2147483647|0}else r=t}else{c[o>>2]=1;r=2147483647}t=b[A>>1]|0;s=t*4681|0;if((s|0)!=1073741824){t=(t*9362|0)+r|0;if((s^r|0)>0&(t^r|0)<0){c[o>>2]=1;t=(r>>>31)+2147483647|0}}else{c[o>>2]=1;t=2147483647}s=b[B>>1]|0;r=s*4681|0;if((r|0)!=1073741824){s=(s*9362|0)+t|0;if((r^t|0)>0&(s^t|0)<0){c[o>>2]=1;t=(t>>>31)+2147483647|0}else t=s}else{c[o>>2]=1;t=2147483647}s=b[C>>1]|0;r=s*4681|0;if((r|0)!=1073741824){s=(s*9362|0)+t|0;if((r^t|0)>0&(s^t|0)<0){c[o>>2]=1;s=(t>>>31)+2147483647|0}}else{c[o>>2]=1;s=2147483647}r=b[D>>1]|0;p=r*4681|0;if((p|0)!=1073741824){q=(r*9362|0)+s|0;if((p^s|0)>0&(q^s|0)<0){c[o>>2]=1;q=(s>>>31)+2147483647|0}}else{c[o>>2]=1;q=2147483647}r=Ce(q,o)|0}t=n?8192:l<<16>>16;p=Z(t,f<<16>>16)|0;if((p|0)==1073741824){c[o>>2]=1;s=2147483647}else s=p<<1;r=r<<16>>16;q=r<<13;if((q|0)!=1073741824){p=s+(r<<14)|0;if((s^q|0)>0&(p^s|0)<0){c[o>>2]=1;s=(s>>>31)+2147483647|0}else s=p}else{c[o>>2]=1;s=2147483647}p=Z(r,t)|0;if((p|0)==1073741824){c[o>>2]=1;q=2147483647}else q=p<<1;p=s-q|0;if(((p^s)&(q^s)|0)<0){c[o>>2]=1;p=(s>>>31)+2147483647|0}D=p<<2;f=k;o=Ce((D>>2|0)==(p|0)?D:p>>31^2147483647,o)|0;D=b[f>>1]|0;D=D&65535;D=D+1|0;D=D&65535;b[f>>1]=D;return o|0}function Na(a,c,d){a=a|0;c=c|0;d=d|0;var f=0,g=0,h=0,i=0;f=c;g=f+80|0;do{b[f>>1]=0;f=f+2|0}while((f|0)<(g|0));f=0;do{i=b[a+(f<<1)>>1]|0;g=((i&8)<<10&65535^8192)+-4096<<16>>16;h=f<<16;i=((b[d+((i&7)<<1)>>1]|0)*327680|0)+h>>16;b[c+(i<<1)>>1]=g;h=((b[d+((e[a+(f+5<<1)>>1]&7)<<1)>>1]|0)*327680|0)+h>>16;if((h|0)<(i|0))g=0-(g&65535)&65535;i=c+(h<<1)|0;b[i>>1]=(e[i>>1]|0)+(g&65535);f=f+1|0}while((f|0)!=5);return}function Oa(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,f=0,g=0;f=c<<16>>16;e=(f<<1&2|1)+((f>>>1&7)*5|0)|0;c=f>>>4&3;c=((f>>>6&7)*5|0)+((c|0)==3?4:c)|0;f=d;g=f+80|0;do{b[f>>1]=0;f=f+2|0}while((f|0)<(g|0));a=a<<16>>16;b[d+(e<<1)>>1]=(0-(a&1)&16383)+57344;b[d+(c<<1)>>1]=(0-(a>>>1&1)&16383)+57344;return}function Pa(a,c,d,f,g,h){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;h=h|0;var i=0,j=0;h=d<<16>>16;j=h>>>3;a=a<<16>>16;a=((a<<17>>17|0)==(a|0)?a<<1:a>>>15^32767)+(j&8)<<16;j=(e[f+(a+65536>>16<<1)>>1]|0)+((j&7)*5|0)|0;d=c<<16>>16;i=(0-(d&1)&16383)+57344&65535;a=g+((e[f+(a>>16<<1)>>1]|0)+((h&7)*5|0)<<16>>16<<1)|0;c=g;h=c+80|0;do{b[c>>1]=0;c=c+2|0}while((c|0)<(h|0));b[a>>1]=i;b[g+(j<<16>>16<<1)>>1]=(0-(d>>>1&1)&16383)+57344;return}function Qa(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0;c=c<<16>>16;e=(c&7)*5|0;f=(c>>>2&2|1)+((c>>>4&7)*5|0)|0;c=(c>>>6&2)+2+((c>>>8&7)*5|0)|0;g=d;h=g+80|0;do{b[g>>1]=0;g=g+2|0}while((g|0)<(h|0));a=a<<16>>16;b[d+(e<<1)>>1]=(0-(a&1)&16383)+57344;b[d+(f<<1)>>1]=(0-(a>>>1&1)&16383)+57344;b[d+(c<<1)>>1]=(0-(a>>>2&1)&16383)+57344;return}function Ra(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;c=c<<16>>16;h=b[d+((c&7)<<1)>>1]|0;i=b[d+((c>>>3&7)<<1)>>1]|0;g=b[d+((c>>>6&7)<<1)>>1]|0;d=(c>>>9&1)+3+((b[d+((c>>>10&7)<<1)>>1]|0)*5|0)|0;c=e;f=c+80|0;do{b[c>>1]=0;c=c+2|0}while((c|0)<(f|0));a=a<<16>>16;b[e+(h*327680>>16<<1)>>1]=(0-(a&1)&16383)+57344;b[e+((i*327680|0)+65536>>16<<1)>>1]=(0-(a>>>1&1)&16383)+57344;b[e+((g*327680|0)+131072>>16<<1)>>1]=(0-(a>>>2&1)&16383)+57344;b[e+(d<<16>>16<<1)>>1]=(0-(a>>>3&1)&16383)+57344;return}function Sa(a,d,f){a=a|0;d=d|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;q=i;i=i+32|0;p=q+16|0;o=q;j=d;h=j+80|0;do{b[j>>1]=0;j=j+2|0}while((j|0)<(h|0));h=b[a>>1]|0;b[p>>1]=h;b[p+2>>1]=b[a+2>>1]|0;b[p+4>>1]=b[a+4>>1]|0;b[p+6>>1]=b[a+6>>1]|0;m=b[a+8>>1]|0;Ta(m>>>3&65535,m&7,0,4,1,o,f);m=b[a+10>>1]|0;Ta(m>>>3&65535,m&7,2,6,5,o,f);m=b[a+12>>1]|0;g=m>>2;do{if((g*25|0)!=1073741824){j=(Z(g,1638400)|0)+786432>>21;g=j*6554>>15;if((g|0)>32767){c[f>>2]=1;k=1;l=1;a=163835;n=6;break}a=(g<<16>>16)*5|0;k=g&1;if((a|0)==1073741824){c[f>>2]=1;l=0;a=65535}else{l=0;n=6}}else{c[f>>2]=1;k=0;g=0;l=0;j=0;a=0;n=6}}while(0);if((n|0)==6)a=a&65535;n=j-a|0;k=k<<16>>16==0?n:4-n|0;n=k<<16>>16;b[o+6>>1]=Rd(((k<<17>>17|0)==(n|0)?k<<1:n>>>15^32767)&65535,m&1,f)|0;if(l){c[f>>2]=1;g=32767}n=g<<16>>16;b[o+14>>1]=((g<<17>>17|0)==(n|0)?g<<1:n>>>15^32767)+(m>>>1&1);g=0;while(1){h=h<<16>>16==0?8191:-8191;n=(b[o+(g<<1)>>1]<<2)+g<<16;j=n>>16;if((n|0)<2621440)b[d+(j<<1)>>1]=h;k=(b[o+(g+4<<1)>>1]<<2)+g<<16;a=k>>16;if((a|0)<(j|0))h=0-(h&65535)&65535;if((k|0)<2621440){n=d+(a<<1)|0;b[n>>1]=(e[n>>1]|0)+(h&65535)}g=g+1|0;if((g|0)==4)break;h=b[p+(g<<1)>>1]|0}i=q;return}function Ta(a,d,e,f,g,h,i){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0;k=a<<16>>16>124?124:a;a=(k<<16>>16)*1311>>15;p=(a|0)>32767;if(!p){j=a<<16>>16;if((j*25|0)==1073741824){c[i>>2]=1;j=1073741823}else o=4}else{c[i>>2]=1;j=32767;o=4}if((o|0)==4)j=(j*50|0)>>>1;m=(k&65535)-j|0;j=(m<<16>>16)*6554>>15;n=(j|0)>32767;if(!n){k=j<<16>>16;if((k*5|0)==1073741824){c[i>>2]=1;l=1073741823}else o=9}else{c[i>>2]=1;k=32767;o=9}if((o|0)==9)l=(k*10|0)>>>1;m=m-l|0;o=m<<16>>16;k=d<<16>>16;l=k>>2;k=k-(l<<2)|0;b[h+(e<<16>>16<<1)>>1]=((m<<17>>17|0)==(o|0)?m<<1:o>>>15^32767)+(k&1);if(n){c[i>>2]=1;j=32767}e=j<<16>>16;b[h+(f<<16>>16<<1)>>1]=((j<<17>>17|0)==(e|0)?j<<1:e>>>15^32767)+(k<<16>>17);if(p){c[i>>2]=1;a=32767}f=a<<16>>16;b[h+(g<<16>>16<<1)>>1]=Rd(l&65535,((a<<17>>17|0)==(f|0)?a<<1:f>>>15^32767)&65535,i)|0;return}function Ua(a){a=a|0;var d=0,e=0,f=0,g=0;if(!a){g=-1;return g|0}Yd(a+1168|0);b[a+460>>1]=40;c[a+1164>>2]=0;d=a+646|0;e=a+1216|0;f=a+462|0;g=f+22|0;do{b[f>>1]=0;f=f+2|0}while((f|0)<(g|0));db(d,c[e>>2]|0)|0;mb(a+686|0)|0;ib(a+700|0)|0;La(a+608|0)|0;rb(a+626|0,c[e>>2]|0)|0;Ja(a+484|0)|0;tb(a+730|0)|0;eb(a+748|0)|0;Ud(a+714|0)|0;Va(a,0)|0;g=0;return g|0}function Va(a,d){a=a|0;d=d|0;var e=0,f=0;if(!a){a=-1;return a|0}c[a+388>>2]=a+308;Qe(a|0,0,308)|0;d=(d|0)!=8;if(d){e=a+412|0;f=e+20|0;do{b[e>>1]=0;e=e+2|0}while((e|0)<(f|0));b[a+392>>1]=3e4;b[a+394>>1]=26e3;b[a+396>>1]=21e3;b[a+398>>1]=15e3;b[a+400>>1]=8e3;b[a+402>>1]=0;b[a+404>>1]=-8e3;b[a+406>>1]=-15e3;b[a+408>>1]=-21e3;b[a+410>>1]=-26e3}b[a+432>>1]=0;b[a+434>>1]=40;c[a+1164>>2]=0;b[a+436>>1]=0;b[a+438>>1]=0;b[a+440>>1]=0;b[a+460>>1]=40;b[a+462>>1]=0;b[a+464>>1]=0;if(d){e=a+442|0;f=e+18|0;do{b[e>>1]=0;e=e+2|0}while((e|0)<(f|0));e=a+466|0;f=e+18|0;do{b[e>>1]=0;e=e+2|0}while((e|0)<(f|0));La(a+608|0)|0;f=a+1216|0;rb(a+626|0,c[f>>2]|0)|0;db(a+646|0,c[f>>2]|0)|0;mb(a+686|0)|0;ib(a+700|0)|0;Ud(a+714|0)|0}else{e=a+466|0;f=e+18|0;do{b[e>>1]=0;e=e+2|0}while((e|0)<(f|0));La(a+608|0)|0;db(a+646|0,c[a+1216>>2]|0)|0;mb(a+686|0)|0;ib(a+700|0)|0}Ja(a+484|0)|0;b[a+606>>1]=21845;tb(a+730|0)|0;if(!d){a=0;return a|0}eb(a+748|0)|0;a=0;return a|0}function Wa(d,f,g,h,j,k){d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0,xa=0,ya=0,za=0,Aa=0,Ba=0,Ca=0,Ea=0,Fa=0,Ga=0,Ha=0,Ja=0,La=0,Ta=0,Ua=0,Wa=0,bb=0,db=0,eb=0,ib=0,mb=0,pb=0,rb=0,tb=0,xb=0,yb=0,zb=0,Ab=0,Bb=0;Bb=i;i=i+336|0;r=Bb+236|0;q=Bb+216|0;zb=Bb+112|0;yb=Bb+12|0;mb=Bb+256|0;rb=Bb+136|0;pb=Bb+32|0;eb=Bb+8|0;ib=Bb+6|0;xb=Bb+4|0;tb=Bb+2|0;Ab=Bb;Ta=d+1164|0;Ua=d+748|0;Wa=hb(Ua,h,Ta)|0;if(Wa){Va(d,8)|0;fb(Ua,d+412|0,d+646|0,d+714|0,d+608|0,Wa,f,g,d+1168|0,j,k,Ta);Ab=d+666|0;me(Ab,d+392|0,10,Ta);sb(d+626|0,Ab,Ta);Ab=d+1156|0;c[Ab>>2]=Wa;i=Bb;return}switch(h|0){case 1:{l=1;x=6;break}case 2:case 7:{Ia(d+606|0,b[(c[d+1256>>2]|0)+(f<<1)>>1]|0,c[(c[d+1260>>2]|0)+(f<<2)>>2]|0,g,c[d+1276>>2]|0,Ta);x=9;break}case 3:{x=9;break}default:{l=0;x=6}}do{if((x|0)==6){h=d+440|0;if((b[h>>1]|0)==6){b[h>>1]=5;Ja=0;La=0;break}else{b[h>>1]=0;Ja=0;La=0;break}}else if((x|0)==9){h=d+440|0;Ja=(e[h>>1]|0)+1&65535;b[h>>1]=Ja<<16>>16>6?6:Ja;Ja=1;La=1;l=0}}while(0);Ea=d+1156|0;switch(c[Ea>>2]|0){case 1:{b[h>>1]=5;b[d+436>>1]=0;break}case 2:{b[h>>1]=5;b[d+436>>1]=1;break}default:{}}n=d+646|0;Fa=d+666|0;m=zb;o=Fa;p=m+20|0;do{a[m>>0]=a[o>>0]|0;m=m+1|0;o=o+1|0}while((m|0)<(p|0));Ga=(f|0)!=7;Ha=d+1168|0;if(Ga){ab(n,f,La,g,Ha,r,Ta);m=d+392|0;ae(m,r,k,Ta);g=g+6|0}else{cb(n,La,g,Ha,q,r,Ta);m=d+392|0;_d(m,q,r,k,Ta);g=g+10|0}o=r;p=m+20|0;do{b[m>>1]=b[o>>1]|0;m=m+2|0;o=o+2|0}while((m|0)<(p|0));Ca=f>>>0>1;B=f>>>0<4&1;Ba=(f|0)==5;Aa=Ba?10:5;Ba=Ba?19:9;E=d+434|0;F=143-Ba&65535;G=d+460|0;H=d+462|0;I=d+464|0;C=f>>>0>2;J=d+388|0;K=(f|0)==0;L=f>>>0<2;M=d+1244|0;N=d+432|0;O=f>>>0<6;P=d+1168|0;Q=(f|0)==6;R=La<<16>>16==0;S=d+714|0;T=d+686|0;U=d+436|0;V=d+700|0;W=(f|0)==7;X=d+482|0;Y=f>>>0<3;_=d+608|0;$=d+626|0;aa=d+438|0;ba=f>>>0<7;ca=d+730|0;D=Ja^1;da=l<<16>>16!=0;za=da?La^1:0;ea=d+442|0;fa=d+458|0;ga=d+412|0;ha=d+80|0;ia=d+1236|0;ja=d+1240|0;ka=d+468|0;la=d+466|0;ma=d+470|0;na=d+472|0;oa=d+474|0;pa=d+476|0;qa=d+478|0;ra=d+480|0;sa=d+444|0;ta=d+446|0;ua=d+448|0;va=d+450|0;wa=d+452|0;xa=d+454|0;ya=d+456|0;y=0;z=0;s=0;t=0;A=-1;while(1){A=(A<<16>>16)+1|0;p=A&65535;z=1-(z<<16>>16)|0;v=z&65535;q=Ca&s<<16>>16==80?0:s;u=g+2|0;r=b[g>>1]|0;a:do{if(Ga){w=b[E>>1]|0;m=(w&65535)-Aa&65535;m=m<<16>>16<20?20:m;o=(m&65535)+Ba&65535;n=o<<16>>16>143;Ya(r,n?F:m,n?143:o,q,w,eb,ib,B,Ta);q=b[eb>>1]|0;b[G>>1]=q;if(Ja){r=b[E>>1]|0;if(r<<16>>16<143){r=(r&65535)+1&65535;b[E>>1]=r}b[eb>>1]=r;b[ib>>1]=0;if((b[H>>1]|0)!=0?!(C|(b[I>>1]|0)<5):0){b[eb>>1]=q;r=q;q=0}else q=0}else{r=q;q=b[ib>>1]|0}se(c[J>>2]|0,r,q,40,1,Ta);if(L){q=g+6|0;Pa(p,b[g+4>>1]|0,b[u>>1]|0,c[M>>2]|0,mb,Ta);g=b[N>>1]|0;w=g<<16>>16;r=w<<1;if((r|0)==(w<<17>>16|0)){o=K;break}o=K;r=g<<16>>16>0?32767:-32768;break}switch(f|0){case 2:{q=g+6|0;Oa(b[g+4>>1]|0,b[u>>1]|0,mb);g=b[N>>1]|0;w=g<<16>>16;r=w<<1;if((r|0)==(w<<17>>16|0)){o=K;break a}o=K;r=g<<16>>16>0?32767:-32768;break a}case 3:{q=g+6|0;Qa(b[g+4>>1]|0,b[u>>1]|0,mb);g=b[N>>1]|0;w=g<<16>>16;r=w<<1;if((r|0)==(w<<17>>16|0)){o=K;break a}o=K;r=g<<16>>16>0?32767:-32768;break a}default:{if(O){q=g+6|0;Ra(b[g+4>>1]|0,b[u>>1]|0,c[P>>2]|0,mb);g=b[N>>1]|0;w=g<<16>>16;r=w<<1;if((r|0)==(w<<17>>16|0)){o=K;break a}o=K;r=g<<16>>16>0?32767:-32768;break a}if(!Q){o=K;x=44;break a}Sa(u,mb,Ta);r=g+16|0;g=b[N>>1]|0;w=g<<16>>16;p=w<<1;if((p|0)==(w<<17>>16|0)){q=r;o=K;r=p;break a}q=r;o=K;r=g<<16>>16>0?32767:-32768;break a}}}else{Za(r,18,143,q,eb,ib,Ta);if(R?q<<16>>16==0|r<<16>>16<61:0){r=b[eb>>1]|0;q=b[ib>>1]|0}else{b[G>>1]=b[eb>>1]|0;r=b[E>>1]|0;b[eb>>1]=r;b[ib>>1]=0;q=0}se(c[J>>2]|0,r,q,40,0,Ta);o=0;x=44}}while(0);if((x|0)==44){x=0;if(Ja)lb(T,b[h>>1]|0,xb,Ta);else b[xb>>1]=$a(f,b[u>>1]|0,c[ja>>2]|0)|0;nb(T,La,b[U>>1]|0,xb,Ta);Na(g+4|0,mb,c[P>>2]|0);r=g+24|0;g=b[xb>>1]|0;w=g<<16>>16;p=w<<1;if((p|0)==(w<<17>>16|0)){q=r;r=p}else{q=r;r=g<<16>>16>0?32767:-32768}}g=b[eb>>1]|0;b:do{if(g<<16>>16<40){m=r<<16>>16;n=g;r=g<<16>>16;while(1){p=mb+(r<<1)|0;g=(Z(b[mb+(r-(n<<16>>16)<<1)>>1]|0,m)|0)>>15;if((g|0)>32767){c[Ta>>2]=1;g=32767}w=g&65535;b[Ab>>1]=w;b[p>>1]=Rd(b[p>>1]|0,w,Ta)|0;r=r+1|0;if((r&65535)<<16>>16==40)break b;n=b[eb>>1]|0}}}while(0);c:do{if(o){o=(z&65535|0)==0;if(o){g=q;p=t}else{g=q+2|0;p=b[q>>1]|0}if(R)Xa(S,f,p,mb,v,xb,tb,Ha,Ta);else{lb(T,b[h>>1]|0,xb,Ta);jb(V,S,b[h>>1]|0,tb,Ta)}nb(T,La,b[U>>1]|0,xb,Ta);kb(V,La,b[U>>1]|0,tb,Ta);q=b[xb>>1]|0;r=q<<16>>16>13017?13017:q;if(o)x=80;else w=p}else{g=q+2|0;r=b[q>>1]|0;switch(f|0){case 1:case 2:case 3:case 4:case 6:{if(R)Xa(S,f,r,mb,v,xb,tb,Ha,Ta);else{lb(T,b[h>>1]|0,xb,Ta);jb(V,S,b[h>>1]|0,tb,Ta)}nb(T,La,b[U>>1]|0,xb,Ta);kb(V,La,b[U>>1]|0,tb,Ta);q=b[xb>>1]|0;r=q<<16>>16>13017?13017:q;if(!Q){p=t;x=80;break c}if((b[E>>1]|0)<=45){p=t;x=80;break c}p=t;r=r<<16>>16>>>2&65535;x=80;break c}case 5:{if(Ja)lb(T,b[h>>1]|0,xb,Ta);else b[xb>>1]=$a(5,r,c[ja>>2]|0)|0;nb(T,La,b[U>>1]|0,xb,Ta);if(R)_a(S,5,b[g>>1]|0,mb,c[ia>>2]|0,tb,Ta);else jb(V,S,b[h>>1]|0,tb,Ta);kb(V,La,b[U>>1]|0,tb,Ta);r=b[xb>>1]|0;g=q+4|0;q=r;p=t;r=r<<16>>16>13017?13017:r;x=80;break c}default:{if(R)_a(S,f,r,mb,c[ia>>2]|0,tb,Ta);else jb(V,S,b[h>>1]|0,tb,Ta);kb(V,La,b[U>>1]|0,tb,Ta);r=b[xb>>1]|0;q=r;p=t;x=80;break c}}}}while(0);if((x|0)==80){x=0;b[N>>1]=q<<16>>16>13017?13017:q;w=p}r=r<<16>>16;r=(r<<17>>17|0)==(r|0)?r<<1:r>>>15^32767;v=(r&65535)<<16>>16>16384;d:do{if(v){u=r<<16>>16;if(W)q=0;else{q=0;while(1){r=(Z(b[(c[J>>2]|0)+(q<<1)>>1]|0,u)|0)>>15;if((r|0)>32767){c[Ta>>2]=1;r=32767}b[Ab>>1]=r;r=Z(b[xb>>1]|0,r<<16>>16)|0;if((r|0)==1073741824){c[Ta>>2]=1;r=2147483647}else r=r<<1;b[rb+(q<<1)>>1]=Ce(r,Ta)|0;q=q+1|0;if((q|0)==40)break d}}do{r=(Z(b[(c[J>>2]|0)+(q<<1)>>1]|0,u)|0)>>15;if((r|0)>32767){c[Ta>>2]=1;r=32767}b[Ab>>1]=r;r=Z(b[xb>>1]|0,r<<16>>16)|0;if((r|0)!=1073741824){r=r<<1;if((r|0)<0)r=~((r^-2)>>1);else x=88}else{c[Ta>>2]=1;r=2147483647;x=88}if((x|0)==88){x=0;r=r>>1}b[rb+(q<<1)>>1]=Ce(r,Ta)|0;q=q+1|0}while((q|0)!=40)}}while(0);if(R){b[la>>1]=b[ka>>1]|0;b[ka>>1]=b[ma>>1]|0;b[ma>>1]=b[na>>1]|0;b[na>>1]=b[oa>>1]|0;b[oa>>1]=b[pa>>1]|0;b[pa>>1]=b[qa>>1]|0;b[qa>>1]=b[ra>>1]|0;b[ra>>1]=b[X>>1]|0;b[X>>1]=b[xb>>1]|0}if((Ja|(b[U>>1]|0)!=0?Y&(b[H>>1]|0)!=0:0)?(bb=b[xb>>1]|0,bb<<16>>16>12288):0){x=(((bb<<16>>16)+118784|0)>>>1)+12288&65535;b[xb>>1]=x<<16>>16>14745?14745:x}qb(zb,Fa,s,yb,Ta);r=Ma(_,f,b[tb>>1]|0,yb,$,La,b[U>>1]|0,l,b[aa>>1]|0,b[H>>1]|0,b[I>>1]|0,Ta)|0;switch(f|0){case 0:case 1:case 2:case 3:case 6:{p=b[xb>>1]|0;u=1;break}default:{r=b[tb>>1]|0;p=b[xb>>1]|0;if(ba)u=1;else{q=p<<16>>16;if(p<<16>>16<0)q=~((q^-2)>>1);else q=q>>>1;p=q&65535;u=2}}}m=p<<16>>16;s=u&65535;q=c[J>>2]|0;t=0;do{q=q+(t<<1)|0;b[pb+(t<<1)>>1]=b[q>>1]|0;q=Z(b[q>>1]|0,m)|0;if((q|0)==1073741824){c[Ta>>2]=1;n=2147483647}else n=q<<1;o=Z(b[tb>>1]|0,b[mb+(t<<1)>>1]|0)|0;if((o|0)!=1073741824){q=(o<<1)+n|0;if((o^n|0)>0&(q^n|0)<0){c[Ta>>2]=1;q=(n>>>31)+2147483647|0}}else{c[Ta>>2]=1;q=2147483647}x=q<<s;x=Ce((x>>s|0)==(q|0)?x:q>>31^2147483647,Ta)|0;q=c[J>>2]|0;b[q+(t<<1)>>1]=x;t=t+1|0}while((t|0)!=40);vb(ca);if((Y?(b[I>>1]|0)>3:0)?!((b[H>>1]|0)==0|D):0)ub(ca);wb(ca,f,pb,r,b[xb>>1]|0,mb,p,u,Ha,Ta);r=0;o=0;do{q=b[pb+(o<<1)>>1]|0;q=Z(q,q)|0;if((q|0)!=1073741824){p=(q<<1)+r|0;if((q^r|0)>0&(p^r|0)<0){c[Ta>>2]=1;r=(r>>>31)+2147483647|0}else r=p}else{c[Ta>>2]=1;r=2147483647}o=o+1|0}while((o|0)!=40);if((r|0)<0)r=~((r^-2)>>1);else r=r>>1;r=Fe(r,Ab,Ta)|0;p=((b[Ab>>1]|0)>>>1)+15|0;q=p&65535;p=p<<16>>16;if(q<<16>>16>0)if(q<<16>>16<31){r=r>>p;x=135}else{r=0;x=137}else{u=0-p<<16>>16;x=r<<u;r=(x>>u|0)==(r|0)?x:r>>31^2147483647;x=135}if((x|0)==135){x=0;if((r|0)<0)r=~((r^-4)>>2);else x=137}if((x|0)==137){x=0;r=r>>>2}r=r&65535;do{if(Y?(db=b[I>>1]|0,db<<16>>16>5):0)if(b[H>>1]|0)if((b[h>>1]|0)<4){if(da){if(!(Ja|(b[aa>>1]|0)!=0))x=145}else if(!Ja)x=145;if((x|0)==145?(0,(b[U>>1]|0)==0):0){x=147;break}ob(pb,r,ea,db,b[U>>1]|0,za,Ta)|0;x=147}else x=147;else x=151;else x=147}while(0);do{if((x|0)==147){x=0;if(b[H>>1]|0){if(!Ja?(b[U>>1]|0)==0:0){x=151;break}if((b[h>>1]|0)>=4)x=151}else x=151}}while(0);if((x|0)==151){x=0;b[ea>>1]=b[sa>>1]|0;b[sa>>1]=b[ta>>1]|0;b[ta>>1]=b[ua>>1]|0;b[ua>>1]=b[va>>1]|0;b[va>>1]=b[wa>>1]|0;b[wa>>1]=b[xa>>1]|0;b[xa>>1]=b[ya>>1]|0;b[ya>>1]=b[fa>>1]|0;b[fa>>1]=r}if(v){r=0;do{v=rb+(r<<1)|0;b[v>>1]=Rd(b[v>>1]|0,b[pb+(r<<1)>>1]|0,Ta)|0;r=r+1|0}while((r|0)!=40);Da(pb,rb,40,Ta);c[Ta>>2]=0;He(k,rb,j+(y<<1)|0,40,ga,0)}else{c[Ta>>2]=0;He(k,pb,j+(y<<1)|0,40,ga,0)}if(!(c[Ta>>2]|0))Pe(ga|0,j+(y+30<<1)|0,20)|0;else{p=193;while(1){q=d+(p<<1)|0;v=b[q>>1]|0;r=v<<16>>16;if(v<<16>>16<0)r=~((r^-4)>>2);else r=r>>>2;b[q>>1]=r;if((p|0)>0)p=p+-1|0;else{p=39;break}}while(1){q=pb+(p<<1)|0;v=b[q>>1]|0;r=v<<16>>16;if(v<<16>>16<0)r=~((r^-4)>>2);else r=r>>>2;b[q>>1]=r;if((p|0)>0)p=p+-1|0;else break}He(k,pb,j+(y<<1)|0,40,ga,1)}Pe(d|0,ha|0,308)|0;b[E>>1]=b[eb>>1]|0;r=y+40|0;s=r&65535;if(s<<16>>16>=160)break;else{y=r<<16>>16;k=k+22|0;t=w}}b[H>>1]=Ka(d+484|0,d+466|0,j,I,Ta)|0;gb(Ua,Fa,j,Ta);b[U>>1]=La;b[aa>>1]=l;sb(d+626|0,Fa,Ta);Ab=Ea;c[Ab>>2]=Wa;i=Bb;return}function Xa(a,d,f,g,h,j,k,l,m){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0;r=i;i=i+16|0;p=r+2|0;q=r;f=f<<16>>16;f=(f<<18>>18|0)==(f|0)?f<<2:f>>>15^32767;switch(d|0){case 3:case 4:case 6:{o=f<<16>>16;f=c[l+84>>2]|0;b[j>>1]=b[f+(o<<1)>>1]|0;l=b[f+(o+1<<1)>>1]|0;n=b[f+(o+3<<1)>>1]|0;j=b[f+(o+2<<1)>>1]|0;break}case 0:{l=(f&65535)+(h<<16>>16<<1^2)|0;l=(l&65535)<<16>>16>1022?1022:l<<16>>16;b[j>>1]=b[782+(l<<1)>>1]|0;j=b[782+(l+1<<1)>>1]|0;de(j<<16>>16,q,p,m);b[q>>1]=(e[q>>1]|0)+65524;l=Ee(b[p>>1]|0,5,m)|0;o=b[q>>1]|0;o=Rd(l,((o<<26>>26|0)==(o|0)?o<<10:o>>>15^32767)&65535,m)|0;l=b[p>>1]|0;f=b[q>>1]|0;if((f*24660|0)==1073741824){c[m>>2]=1;h=2147483647}else h=f*49320|0;n=(l<<16>>16)*24660>>15;f=h+(n<<1)|0;if((h^n|0)>0&(f^h|0)<0){c[m>>2]=1;f=(h>>>31)+2147483647|0}n=f<<13;l=j;n=Ce((n>>13|0)==(f|0)?n:f>>31^2147483647,m)|0;j=o;break}default:{o=f<<16>>16;f=c[l+80>>2]|0;b[j>>1]=b[f+(o<<1)>>1]|0;l=b[f+(o+1<<1)>>1]|0;n=b[f+(o+3<<1)>>1]|0;j=b[f+(o+2<<1)>>1]|0}}Vd(a,d,g,q,p,0,0,m);h=Z((re(14,b[p>>1]|0,m)|0)<<16>>16,l<<16>>16)|0;if((h|0)==1073741824){c[m>>2]=1;f=2147483647}else f=h<<1;l=10-(e[q>>1]|0)|0;h=l&65535;l=l<<16>>16;if(h<<16>>16>0){q=h<<16>>16<31?f>>l:0;q=q>>>16;q=q&65535;b[k>>1]=q;Wd(a,j,n);i=r;return}else{m=0-l<<16>>16;q=f<<m;q=(q>>m|0)==(f|0)?q:f>>31^2147483647;q=q>>>16;q=q&65535;b[k>>1]=q;Wd(a,j,n);i=r;return}}function Ya(a,d,e,f,g,h,i,j,k){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;if(!(f<<16>>16)){j=a<<16>>16;if(a<<16>>16>=197){b[h>>1]=j+65424;b[i>>1]=0;return}g=((j<<16)+131072>>16)*10923>>15;if((g|0)>32767){c[k>>2]=1;g=32767}a=(g&65535)+19|0;b[h>>1]=a;b[i>>1]=j+58-((a*196608|0)>>>16);return}if(!(j<<16>>16)){k=a<<16>>16<<16;a=((k+131072>>16)*21846|0)+-65536>>16;b[h>>1]=a+(d&65535);b[i>>1]=((k+-131072|0)>>>16)-((a*196608|0)>>>16);return}if((Ge(g,d,k)|0)<<16>>16>5)g=(d&65535)+5&65535;j=e<<16>>16;j=(j-(g&65535)&65535)<<16>>16>4?j+65532&65535:g;g=a<<16>>16;if(a<<16>>16<4){b[h>>1]=((((j&65535)<<16)+-327680|0)>>>16)+g;b[i>>1]=0;return}g=g<<16;if(a<<16>>16<12){k=(((g+-327680>>16)*10923|0)>>>15<<16)+-65536|0;a=k>>16;b[h>>1]=(j&65535)+a;b[i>>1]=((g+-589824|0)>>>16)-(k>>>15)-a;return}else{b[h>>1]=((g+-786432+((j&65535)<<16)|0)>>>16)+1;b[i>>1]=0;return}}function Za(a,c,d,f,g,h,i){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;h=h|0;i=i|0;if(f<<16>>16){i=(e[g>>1]|0)+65531|0;i=(i<<16>>16|0)<(c<<16>>16|0)?c:i&65535;d=d<<16>>16;c=a<<16>>16<<16;a=((c+327680>>16)*10924|0)+-65536>>16;b[g>>1]=(((((i&65535)<<16)+589824>>16|0)>(d|0)?d+65527&65535:i)&65535)+a;b[h>>1]=((c+-196608|0)>>>16)-((a*393216|0)>>>16);return}f=a<<16>>16;if(a<<16>>16<463){a=((((f<<16)+327680>>16)*10924|0)>>>16)+17|0;b[g>>1]=a;b[h>>1]=f+105-((a*393216|0)>>>16);return}else{b[g>>1]=f+65168;b[h>>1]=0;return}}function _a(a,d,e,f,g,h,j){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0;n=i;i=i+16|0;l=n+6|0;k=n+4|0;Vd(a,d,f,l,k,n+2|0,n,j);m=(e&31)*3|0;f=g+(m<<1)|0;if(!((Ge(d&65535,7,j)|0)<<16>>16)){l=re(b[l>>1]|0,b[k>>1]|0,j)|0;k=l<<16>>16;k=(Z(((l<<20>>20|0)==(k|0)?l<<4:k>>>15^32767)<<16>>16,b[f>>1]|0)|0)>>15;if((k|0)>32767){c[j>>2]=1;k=32767}f=k<<16;e=f>>16;if((k<<17>>17|0)==(e|0))k=f>>15;else k=e>>>15^32767}else{e=re(14,b[k>>1]|0,j)|0;e=Z(e<<16>>16,b[f>>1]|0)|0;if((e|0)==1073741824){c[j>>2]=1;f=2147483647}else f=e<<1;e=Ge(9,b[l>>1]|0,j)|0;k=e<<16>>16;if(e<<16>>16>0)k=e<<16>>16<31?f>>k:0;else{j=0-k<<16>>16;k=f<<j;k=(k>>j|0)==(f|0)?k:f>>31^2147483647}k=k>>>16}b[h>>1]=k;Wd(a,b[g+(m+1<<1)>>1]|0,b[g+(m+2<<1)>>1]|0);i=n;return}function $a(a,c,d){a=a|0;c=c|0;d=d|0;c=b[d+(c<<16>>16<<1)>>1]|0;if((a|0)!=7){a=c;return a|0}a=c&65532;return a|0}function ab(d,e,f,g,h,j,k){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;v=i;i=i+48|0;r=v+20|0;u=v;t=c[h+44>>2]|0;s=c[h+64>>2]|0;l=c[h+4>>2]|0;q=c[h+12>>2]|0;n=c[h+20>>2]|0;m=c[h+56>>2]|0;if(!(f<<16>>16)){o=e>>>0<2;if(o){f=765;p=508;n=c[h+52>>2]|0}else{h=(e|0)==5;f=h?1533:765;p=2044;l=h?m:l}m=b[g>>1]|0;f=((m*196608>>16|0)>(f&65535|0)?f:m*3&65535)<<16>>16;m=b[l+(f<<1)>>1]|0;b[r>>1]=m;b[r+2>>1]=b[l+(f+1<<1)>>1]|0;b[r+4>>1]=b[l+(f+2<<1)>>1]|0;f=b[g+2>>1]|0;if(o)f=f<<16>>16<<1&65535;o=(f<<16>>16)*196608|0;o=(o|0)>100466688?1533:o>>16;b[r+6>>1]=b[q+(o<<1)>>1]|0;b[r+8>>1]=b[q+(o+1<<1)>>1]|0;b[r+10>>1]=b[q+(o+2<<1)>>1]|0;g=b[g+4>>1]|0;g=((g<<18>>16|0)>(p&65535|0)?p:g<<2&65535)<<16>>16;b[r+12>>1]=b[n+(g<<1)>>1]|0;b[r+14>>1]=b[n+((g|1)<<1)>>1]|0;b[r+16>>1]=b[n+((g|2)<<1)>>1]|0;b[r+18>>1]=b[n+((g|3)<<1)>>1]|0;if((e|0)==8){f=0;while(1){s=d+(f<<1)|0;b[u+(f<<1)>>1]=Rd(m,Rd(b[t+(f<<1)>>1]|0,b[s>>1]|0,k)|0,k)|0;b[s>>1]=m;f=f+1|0;if((f|0)==10)break;m=b[r+(f<<1)>>1]|0}Ae(u,205,10,k);l=d+20|0;m=u;f=l+20|0;do{a[l>>0]=a[m>>0]|0;l=l+1|0;m=m+1|0}while((l|0)<(f|0));me(u,j,10,k);i=v;return}else l=0;do{m=d+(l<<1)|0;f=(Z(b[s+(l<<1)>>1]|0,b[m>>1]|0)|0)>>15;if((f|0)>32767){c[k>>2]=1;f=32767}g=Rd(b[t+(l<<1)>>1]|0,f&65535,k)|0;e=b[r+(l<<1)>>1]|0;b[u+(l<<1)>>1]=Rd(e,g,k)|0;b[m>>1]=e;l=l+1|0}while((l|0)!=10);Ae(u,205,10,k);l=d+20|0;m=u;f=l+20|0;do{a[l>>0]=a[m>>0]|0;l=l+1|0;m=m+1|0}while((l|0)<(f|0));me(u,j,10,k);i=v;return}else{l=0;do{f=(b[d+20+(l<<1)>>1]|0)*29491>>15;if((f|0)>32767){c[k>>2]=1;f=32767}m=(b[t+(l<<1)>>1]|0)*3277>>15;if((m|0)>32767){c[k>>2]=1;m=32767}b[u+(l<<1)>>1]=Rd(m&65535,f&65535,k)|0;l=l+1|0}while((l|0)!=10);if((e|0)==8){l=0;do{s=d+(l<<1)|0;r=Rd(b[t+(l<<1)>>1]|0,b[s>>1]|0,k)|0;b[s>>1]=Ge(b[u+(l<<1)>>1]|0,r,k)|0;l=l+1|0}while((l|0)!=10);Ae(u,205,10,k);l=d+20|0;m=u;f=l+20|0;do{a[l>>0]=a[m>>0]|0;l=l+1|0;m=m+1|0}while((l|0)<(f|0));me(u,j,10,k);i=v;return}else l=0;do{m=d+(l<<1)|0;f=(Z(b[s+(l<<1)>>1]|0,b[m>>1]|0)|0)>>15;if((f|0)>32767){c[k>>2]=1;f=32767}r=Rd(b[t+(l<<1)>>1]|0,f&65535,k)|0;b[m>>1]=Ge(b[u+(l<<1)>>1]|0,r,k)|0;l=l+1|0}while((l|0)!=10);Ae(u,205,10,k);l=d+20|0;m=u;f=l+20|0;do{a[l>>0]=a[m>>0]|0;l=l+1|0;m=m+1|0}while((l|0)<(f|0));me(u,j,10,k);i=v;return}}function bb(a,b,c){a=a|0;b=b|0;c=c|0;Pe(a|0,c+((b<<16>>16)*10<<1)|0,20)|0;return}function cb(d,e,f,g,h,j,k){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;v=i;i=i+80|0;q=v+60|0;r=v+40|0;t=v+20|0;u=v;s=c[g+48>>2]|0;n=c[g+24>>2]|0;o=c[g+28>>2]|0;p=c[g+32>>2]|0;if(e<<16>>16){l=0;do{q=s+(l<<1)|0;f=Rd(((b[q>>1]|0)*1639|0)>>>15&65535,((b[d+20+(l<<1)>>1]|0)*31128|0)>>>15&65535,k)|0;b[t+(l<<1)>>1]=f;b[u+(l<<1)>>1]=f;r=d+(l<<1)|0;b[r>>1]=Ge(f,Rd(b[q>>1]|0,((b[r>>1]|0)*21299|0)>>>15&65535,k)|0,k)|0;l=l+1|0}while((l|0)!=10);Ae(t,205,10,k);Ae(u,205,10,k);l=d+20|0;g=u;e=l+20|0;do{a[l>>0]=a[g>>0]|0;l=l+1|0;g=g+1|0}while((l|0)<(e|0));me(t,h,10,k);me(u,j,10,k);i=v;return}e=c[g+16>>2]|0;g=c[g+8>>2]|0;m=b[f>>1]|0;m=((m<<18>>18|0)==(m|0)?m<<2:m>>>15^32767)<<16>>16;b[q>>1]=b[g+(m<<1)>>1]|0;b[q+2>>1]=b[g+(m+1<<1)>>1]|0;b[r>>1]=b[g+(m+2<<1)>>1]|0;b[r+2>>1]=b[g+(m+3<<1)>>1]|0;m=b[f+2>>1]|0;m=((m<<18>>18|0)==(m|0)?m<<2:m>>>15^32767)<<16>>16;b[q+4>>1]=b[e+(m<<1)>>1]|0;b[q+6>>1]=b[e+(m+1<<1)>>1]|0;b[r+4>>1]=b[e+(m+2<<1)>>1]|0;b[r+6>>1]=b[e+(m+3<<1)>>1]|0;m=b[f+4>>1]|0;g=m<<16>>16;if(m<<16>>16<0)e=~((g^-2)>>1);else e=g>>>1;m=e<<16>>16;m=((e<<18>>18|0)==(m|0)?e<<2:m>>>15^32767)<<16>>16;l=n+(m+1<<1)|0;e=b[n+(m<<1)>>1]|0;if(!(g&1)){b[q+8>>1]=e;b[q+10>>1]=b[l>>1]|0;b[r+8>>1]=b[n+(m+2<<1)>>1]|0;b[r+10>>1]=b[n+(m+3<<1)>>1]|0}else{if(e<<16>>16==-32768)e=32767;else e=0-(e&65535)&65535;b[q+8>>1]=e;e=b[l>>1]|0;if(e<<16>>16==-32768)e=32767;else e=0-(e&65535)&65535;b[q+10>>1]=e;e=b[n+(m+2<<1)>>1]|0;if(e<<16>>16==-32768)e=32767;else e=0-(e&65535)&65535;b[r+8>>1]=e;e=b[n+(m+3<<1)>>1]|0;if(e<<16>>16==-32768)e=32767;else e=0-(e&65535)&65535;b[r+10>>1]=e}l=b[f+6>>1]|0;l=((l<<18>>18|0)==(l|0)?l<<2:l>>>15^32767)<<16>>16;b[q+12>>1]=b[o+(l<<1)>>1]|0;b[q+14>>1]=b[o+(l+1<<1)>>1]|0;b[r+12>>1]=b[o+(l+2<<1)>>1]|0;b[r+14>>1]=b[o+(l+3<<1)>>1]|0;l=b[f+8>>1]|0;l=((l<<18>>18|0)==(l|0)?l<<2:l>>>15^32767)<<16>>16;b[q+16>>1]=b[p+(l<<1)>>1]|0;b[q+18>>1]=b[p+(l+1<<1)>>1]|0;b[r+16>>1]=b[p+(l+2<<1)>>1]|0;b[r+18>>1]=b[p+(l+3<<1)>>1]|0;l=0;do{g=d+(l<<1)|0;e=(b[g>>1]|0)*21299>>15;if((e|0)>32767){c[k>>2]=1;e=32767}p=Rd(b[s+(l<<1)>>1]|0,e&65535,k)|0;b[t+(l<<1)>>1]=Rd(b[q+(l<<1)>>1]|0,p,k)|0;f=b[r+(l<<1)>>1]|0;b[u+(l<<1)>>1]=Rd(f,p,k)|0;b[g>>1]=f;l=l+1|0}while((l|0)!=10);Ae(t,205,10,k);Ae(u,205,10,k);l=d+20|0;g=u;e=l+20|0;do{a[l>>0]=a[g>>0]|0;l=l+1|0;g=g+1|0}while((l|0)<(e|0));me(t,h,10,k);me(u,j,10,k);i=v;return}function db(a,c){a=a|0;c=c|0;var d=0,e=0;if(!a){e=-1;return e|0}d=a;e=d+20|0;do{b[d>>1]=0;d=d+2|0}while((d|0)<(e|0));Pe(a+20|0,c|0,20)|0;e=0;return e|0}function eb(d){d=d|0;var e=0,f=0,g=0,h=0,i=0;if(!d){i=-1;return i|0}b[d>>1]=0;b[d+2>>1]=8192;e=d+4|0;b[e>>1]=3500;b[d+6>>1]=3500;c[d+8>>2]=1887529304;b[d+12>>1]=3e4;b[d+14>>1]=26e3;b[d+16>>1]=21e3;b[d+18>>1]=15e3;b[d+20>>1]=8e3;b[d+22>>1]=0;b[d+24>>1]=-8e3;b[d+26>>1]=-15e3;b[d+28>>1]=-21e3;b[d+30>>1]=-26e3;b[d+32>>1]=3e4;b[d+34>>1]=26e3;b[d+36>>1]=21e3;b[d+38>>1]=15e3;b[d+40>>1]=8e3;b[d+42>>1]=0;b[d+44>>1]=-8e3;b[d+46>>1]=-15e3;b[d+48>>1]=-21e3;b[d+50>>1]=-26e3;b[d+212>>1]=0;b[d+374>>1]=0;b[d+392>>1]=0;f=d+52|0;b[f>>1]=1384;b[d+54>>1]=2077;b[d+56>>1]=3420;b[d+58>>1]=5108;b[d+60>>1]=6742;b[d+62>>1]=8122;b[d+64>>1]=9863;b[d+66>>1]=11092;b[d+68>>1]=12714;b[d+70>>1]=13701;g=d+72|0;h=f;i=g+20|0;do{a[g>>0]=a[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(i|0));g=d+92|0;h=f;i=g+20|0;do{a[g>>0]=a[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(i|0));g=d+112|0;h=f;i=g+20|0;do{a[g>>0]=a[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(i|0));g=d+132|0;h=f;i=g+20|0;do{a[g>>0]=a[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(i|0));g=d+152|0;h=f;i=g+20|0;do{a[g>>0]=a[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(i|0));g=d+172|0;h=f;i=g+20|0;do{a[g>>0]=a[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(i|0));g=d+192|0;h=f;i=g+20|0;do{a[g>>0]=a[h>>0]|0;g=g+1|0;h=h+1|0}while((g|0)<(i|0));Qe(d+214|0,0,160)|0;b[d+376>>1]=3500;b[d+378>>1]=3500;i=b[e>>1]|0;b[d+380>>1]=i;b[d+382>>1]=i;b[d+384>>1]=i;b[d+386>>1]=i;b[d+388>>1]=i;b[d+390>>1]=i;b[d+394>>1]=0;b[d+396>>1]=7;b[d+398>>1]=32767;b[d+400>>1]=0;b[d+402>>1]=0;b[d+404>>1]=0;c[d+408>>2]=1;b[d+412>>1]=0;i=0;return i|0}function fb(d,f,g,h,j,k,l,m,n,o,p,q){d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;var r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0;_=i;i=i+304|0;Q=_+192|0;N=_+168|0;S=_+148|0;W=_+216|0;T=_+146|0;U=_+144|0;O=_+124|0;P=_+104|0;R=_+84|0;V=_+60|0;L=_+40|0;K=_;Y=d+404|0;X=d+400|0;if((b[Y>>1]|0)!=0?(b[X>>1]|0)!=0:0){J=d+394|0;b[J>>1]=b[636+(l<<1)>>1]|0;z=b[d+212>>1]|0;y=z+10|0;Pe(d+52+(((y&65535|0)==80?0:y<<16>>16)<<1)|0,d+52+(z<<1)|0,20)|0;z=b[d+392>>1]|0;y=z+1|0;b[d+376+(((y&65535|0)==8?0:y<<16>>16)<<1)>>1]=b[d+376+(z<<1)>>1]|0;y=d+4|0;b[y>>1]=0;z=K+36|0;A=K+32|0;B=K+28|0;C=K+24|0;D=K+20|0;E=K+16|0;F=K+12|0;G=K+8|0;H=K+4|0;I=d+52|0;t=K;M=t+40|0;do{c[t>>2]=0;t=t+4|0}while((t|0)<(M|0));s=0;r=7;while(1){M=b[d+376+(r<<1)>>1]|0;x=M<<16>>16;if(M<<16>>16<0)x=~((x^-8)>>3);else x=x>>>3;s=Rd(s,x&65535,q)|0;b[y>>1]=s;v=r*10|0;t=9;while(1){u=K+(t<<2)|0;w=c[u>>2]|0;M=b[d+52+(t+v<<1)>>1]|0;x=M+w|0;if((M^w|0)>-1&(x^w|0)<0){c[q>>2]=1;x=(w>>>31)+2147483647|0}c[u>>2]=x;if((t|0)>0)t=t+-1|0;else break}if((r|0)<=0)break;else r=r+-1|0}b[L+18>>1]=(c[z>>2]|0)>>>3;b[L+16>>1]=(c[A>>2]|0)>>>3;b[L+14>>1]=(c[B>>2]|0)>>>3;b[L+12>>1]=(c[C>>2]|0)>>>3;b[L+10>>1]=(c[D>>2]|0)>>>3;b[L+8>>1]=(c[E>>2]|0)>>>3;b[L+6>>1]=(c[F>>2]|0)>>>3;b[L+4>>1]=(c[G>>2]|0)>>>3;b[L+2>>1]=(c[H>>2]|0)>>>3;b[L>>1]=(c[K>>2]|0)>>>3;me(L,d+12|0,10,q);b[y>>1]=Ge(b[y>>1]|0,b[J>>1]|0,q)|0;Oe(d+214|0,I|0,160)|0;L=9;while(1){M=b[d+214+(L+70<<1)>>1]|0;u=M<<16>>16;K=b[d+214+(L+60<<1)>>1]|0;t=(K<<16>>16)+u|0;if((K^M)<<16>>16>-1&(t^u|0)<0){c[q>>2]=1;t=(u>>>31)+2147483647|0}M=b[d+214+(L+50<<1)>>1]|0;u=M+t|0;if((M^t|0)>-1&(u^t|0)<0){c[q>>2]=1;u=(t>>>31)+2147483647|0}M=b[d+214+(L+40<<1)>>1]|0;t=M+u|0;if((M^u|0)>-1&(t^u|0)<0){c[q>>2]=1;t=(u>>>31)+2147483647|0}M=b[d+214+(L+30<<1)>>1]|0;u=M+t|0;if((M^t|0)>-1&(u^t|0)<0){c[q>>2]=1;u=(t>>>31)+2147483647|0}M=b[d+214+(L+20<<1)>>1]|0;t=M+u|0;if((M^u|0)>-1&(t^u|0)<0){c[q>>2]=1;t=(u>>>31)+2147483647|0}M=b[d+214+(L+10<<1)>>1]|0;u=M+t|0;if((M^t|0)>-1&(u^t|0)<0){c[q>>2]=1;t=(t>>>31)+2147483647|0}else t=u;M=b[d+214+(L<<1)>>1]|0;u=M+t|0;if((M^t|0)>-1&(u^t|0)<0){c[q>>2]=1;u=(t>>>31)+2147483647|0}if((u|0)<0)u=~((u^-8)>>3);else u=u>>>3;x=u&65535;v=b[654+(L<<1)>>1]|0;w=7;while(1){r=d+214+((w*10|0)+L<<1)|0;u=Ge(b[r>>1]|0,x,q)|0;b[r>>1]=u;u=(Z(v,u<<16>>16)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[r>>1]=u;s=(u&65535)-(u>>>15&1)|0;s=s<<16>>31^s;t=s&65535;if(t<<16>>16>655)t=(((s<<16>>16)+261489|0)>>>2)+655&65535;t=t<<16>>16>1310?1310:t;if(!(u&32768))u=t;else u=0-(t&65535)&65535;b[r>>1]=u;if((w|0)>0)w=w+-1|0;else break}if((L|0)>0)L=L+-1|0;else break}}if(b[X>>1]|0){x=d+32|0;w=d+12|0;t=x;v=w;M=t+20|0;do{a[t>>0]=a[v>>0]|0;t=t+1|0;v=v+1|0}while((t|0)<(M|0));v=d+4|0;s=b[v>>1]|0;r=d+6|0;b[r>>1]=s;do{if(b[d+402>>1]|0){t=b[d>>1]|0;b[d>>1]=0;t=t<<16>>16<32?t:32;M=t<<16>>16;u=M<<10;if((u|0)!=(M<<26>>16|0)){c[q>>2]=1;u=t<<16>>16>0?32767:-32768}if(t<<16>>16>1)u=Td(1024,u&65535)|0;else u=16384;b[d+2>>1]=u;bb(g,b[m>>1]|0,c[n+60>>2]|0);ab(g,8,0,m+2|0,n,w,q);t=g;M=t+20|0;do{a[t>>0]=0;t=t+1|0}while((t|0)<(M|0));s=b[m+8>>1]|0;s=s<<16>>16==0?-32768:((s+64&65535)>127?s<<16>>16>0?32767:32768:s<<16>>16<<9)+60416&65535;b[v>>1]=s;if((b[d+412>>1]|0)!=0?(c[d+408>>2]|0)!=0:0)break;t=x;v=w;M=t+20|0;do{a[t>>0]=a[v>>0]|0;t=t+1|0;v=v+1|0}while((t|0)<(M|0));b[r>>1]=s}}while(0);t=s<<16>>16;if(s<<16>>16<0)t=~((t^-2)>>1);else t=t>>>1;t=t+56536|0;u=t<<16;if((u|0)>0)t=0;else t=(u|0)<-946077696?-14436:t&65535;b[h>>1]=t;b[h+2>>1]=t;b[h+4>>1]=t;b[h+6>>1]=t;m=((t<<16>>16)*5443|0)>>>15&65535;b[h+8>>1]=m;b[h+10>>1]=m;b[h+12>>1]=m;b[h+14>>1]=m}t=((b[636+(l<<1)>>1]|0)*104864|0)>>>15<<16;if((t|0)<0)t=~((t>>16^-32)>>5);else t=t>>21;l=d+394|0;b[l>>1]=Rd(((b[l>>1]|0)*29491|0)>>>15&65535,t&65535,q)|0;h=(e[d>>1]<<16)+65536|0;t=h>>16;n=d+2|0;t=(Z(((h<<10>>26|0)==(t|0)?h>>>6:t>>>15^32767)<<16>>16,b[n>>1]|0)|0)>>15;if((t|0)>32767){c[q>>2]=1;t=32767}s=t&65535;if(s<<16>>16<=1024)if(s<<16>>16<-2048)w=-32768;else w=t<<4&65535;else w=16384;m=d+4|0;x=w<<16>>16;u=Z(b[m>>1]|0,x)|0;if((u|0)==1073741824){c[q>>2]=1;L=2147483647}else L=u<<1;u=(Z(b[d+30>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}y=u&65535;b[Q+18>>1]=y;u=(Z(b[d+28>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[Q+16>>1]=u;u=(Z(b[d+26>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[Q+14>>1]=u;u=(Z(b[d+24>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[Q+12>>1]=u;u=(Z(b[d+22>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[Q+10>>1]=u;u=(Z(b[d+20>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[Q+8>>1]=u;u=(Z(b[d+18>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[Q+6>>1]=u;u=(Z(b[d+16>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[Q+4>>1]=u;u=(Z(b[d+14>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[Q+2>>1]=u;u=(Z(b[d+12>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[Q>>1]=u;h=d+6|0;x=16384-(w&65535)<<16>>16;u=Z(b[h>>1]|0,x)|0;if((u|0)!=1073741824){t=(u<<1)+L|0;if((u^L|0)>0&(t^L|0)<0){c[q>>2]=1;K=(L>>>31)+2147483647|0}else K=t}else{c[q>>2]=1;K=2147483647}t=y;v=9;while(1){s=Q+(v<<1)|0;u=(Z(b[d+32+(v<<1)>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}t=Rd(t,u&65535,q)|0;b[s>>1]=t;M=t<<16>>16;u=M<<1;if((u|0)!=(M<<17>>16|0)){c[q>>2]=1;u=t<<16>>16>0?32767:-32768}b[s>>1]=u;u=v+-1|0;if((v|0)<=0)break;t=b[Q+(u<<1)>>1]|0;v=u}L=d+374|0;u=((e[L>>1]<<16)+-161021952>>16)*9830>>15;if((u|0)>32767){c[q>>2]=1;u=32767}u=4096-(u&65535)|0;t=u<<16;if((t|0)>268369920)x=32767;else x=(t|0)<0?0:u<<19>>16;J=d+8|0;u=Ga(J,3)|0;ne(Q,O,10,q);t=P;v=O;M=t+20|0;do{b[t>>1]=b[v>>1]|0;t=t+2|0;v=v+2|0}while((t|0)<(M|0));t=(u<<16>>16)*10|0;v=9;while(1){s=P+(v<<1)|0;r=b[s>>1]|0;u=(Z(b[d+214+(v+t<<1)>>1]|0,x)|0)>>15;if((u|0)>32767){c[q>>2]=1;u=32767}b[s>>1]=Rd(r,u&65535,q)|0;if((v|0)>0)v=v+-1|0;else break}Ae(O,205,10,q);Ae(P,205,10,q);t=g+20|0;v=O;M=t+20|0;do{a[t>>0]=a[v>>0]|0;t=t+1|0;v=v+1|0}while((t|0)<(M|0));me(O,Q,10,q);me(P,R,10,q);he(Q,N,q);he(R,V,q);t=p;v=N;M=t+22|0;do{a[t>>0]=a[v>>0]|0;t=t+1|0;v=v+1|0}while((t|0)<(M|0));t=p+22|0;v=N;M=t+22|0;do{a[t>>0]=a[v>>0]|0;t=t+1|0;v=v+1|0}while((t|0)<(M|0));t=p+44|0;v=N;M=t+22|0;do{a[t>>0]=a[v>>0]|0;t=t+1|0;v=v+1|0}while((t|0)<(M|0));t=p+66|0;v=N;M=t+22|0;do{a[t>>0]=a[v>>0]|0;t=t+1|0;v=v+1|0}while((t|0)<(M|0));Fa(N+2|0,S,q);u=0;t=32767;do{s=b[S+(u<<1)>>1]|0;s=Z(s,s)|0;if(s>>>0<1073741824)s=32767-(s>>>15)|0;else{c[q>>2]=1;s=0}t=(Z(s<<16>>16,t<<16>>16)|0)>>15;if((t|0)>32767){c[q>>2]=1;t=32767}u=u+1|0}while((u|0)!=10);de(t<<16>>16,T,U,q);t=(e[T>>1]<<16)+-983040|0;s=t>>16;s=De(Ge(0,Rd(((t<<12>>28|0)==(s|0)?t>>>4:s>>>15^32767)&65535,De(b[U>>1]|0,3,q)|0,q)|0,q)|0,1,q)|0;t=(b[L>>1]|0)*29491>>15;if((t|0)>32767){c[q>>2]=1;t=32767}u=s<<16>>16;s=u*3277>>15;if((s|0)>32767){c[q>>2]=1;s=32767}b[L>>1]=Rd(t&65535,s&65535,q)|0;s=K>>10;r=s+262144|0;if((s|0)>-1&(r^s|0)<0){c[q>>2]=1;r=(s>>>31)+2147483647|0}U=u<<4;s=r-U|0;if(((s^r)&(r^U)|0)<0){c[q>>2]=1;r=(r>>>31)+2147483647|0}else r=s;U=b[l>>1]<<5;s=U+r|0;if((U^r|0)>-1&(s^r|0)<0){c[q>>2]=1;s=(r>>>31)+2147483647|0}u=(re(s>>>16&65535,s>>>1&32767,q)|0)<<16>>16;Ha(J,W,q);r=39;while(1){t=W+(r<<1)|0;s=(Z(b[t>>1]|0,u)|0)>>15;if((s|0)>32767){c[q>>2]=1;s=32767}b[t>>1]=s;if((r|0)>0)r=r+-1|0;else break}He(V,W,o,40,f,1);Ha(J,W,q);r=39;while(1){t=W+(r<<1)|0;s=(Z(b[t>>1]|0,u)|0)>>15;if((s|0)>32767){c[q>>2]=1;s=32767}b[t>>1]=s;if((r|0)>0)r=r+-1|0;else break}He(V,W,o+80|0,40,f,1);Ha(J,W,q);r=39;while(1){t=W+(r<<1)|0;s=(Z(b[t>>1]|0,u)|0)>>15;if((s|0)>32767){c[q>>2]=1;s=32767}b[t>>1]=s;if((r|0)>0)r=r+-1|0;else break}He(V,W,o+160|0,40,f,1);Ha(J,W,q);t=39;while(1){r=W+(t<<1)|0;s=(Z(b[r>>1]|0,u)|0)>>15;if((s|0)>32767){c[q>>2]=1;s=32767}b[r>>1]=s;if((t|0)>0)t=t+-1|0;else break}He(V,W,o+240|0,40,f,1);b[j+14>>1]=20;b[j+16>>1]=0;if((k|0)==2){s=b[d>>1]|0;s=s<<16>>16>32?32:s<<16>>16<1?8:s;o=s<<16>>16;r=o<<10;if((r|0)!=(o<<26>>16|0)){c[q>>2]=1;r=s<<16>>16>0?32767:-32768}b[n>>1]=Td(1024,r&65535)|0;b[d>>1]=0;t=d+32|0;v=d+12|0;M=t+20|0;do{a[t>>0]=a[v>>0]|0;t=t+1|0;v=v+1|0}while((t|0)<(M|0));q=b[m>>1]|0;b[h>>1]=q;b[m>>1]=(q&65535)+65280}if(!(b[X>>1]|0)){i=_;return}do{if(!(b[d+402>>1]|0)){if(b[Y>>1]|0)break;i=_;return}}while(0);b[d>>1]=0;b[d+412>>1]=1;i=_;return}function gb(a,d,f,g){a=a|0;d=d|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0;m=i;i=i+16|0;k=m+2|0;l=m;b[l>>1]=0;j=a+212|0;h=(e[j>>1]|0)+10|0;h=(h&65535|0)==80?0:h&65535;b[j>>1]=h;Pe(a+52+(h<<16>>16<<1)|0,d|0,20)|0;h=0;j=159;while(1){n=b[f+(j<<1)>>1]|0;n=Z(n,n)|0;n=(n|0)==1073741824?2147483647:n<<1;d=n+h|0;if((n^h|0)>-1&(d^h|0)<0){c[g>>2]=1;h=(h>>>31)+2147483647|0}else h=d;if((j|0)>0)j=j+-1|0;else break}de(h,k,l,g);h=b[k>>1]|0;n=h<<16>>16;d=n<<10;if((d|0)!=(n<<26>>16|0)){c[g>>2]=1;d=h<<16>>16>0?32767:-32768}b[k>>1]=d;n=b[l>>1]|0;h=n<<16>>16;if(n<<16>>16<0)h=~((h^-32)>>5);else h=h>>>5;l=a+392|0;n=(e[l>>1]|0)+1|0;n=(n&65535|0)==8?0:n&65535;b[l>>1]=n;b[a+376+(n<<16>>16<<1)>>1]=h+57015+d;i=m;return}function hb(a,d,f){a=a|0;d=d|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0;l=(d|0)==4;m=(d|0)==5;n=(d|0)==6;g=c[a+408>>2]|0;a:do{if((d+-4|0)>>>0<3)k=4;else{if((g+-1|0)>>>0<2)switch(d|0){case 2:case 3:case 7:{k=4;break a}default:{}}b[a>>1]=0;j=0}}while(0);if((k|0)==4){b:do{if((g|0)==2){switch(d|0){case 2:case 4:case 6:case 7:break;default:{h=1;break b}}h=2}else h=1}while(0);j=(e[a>>1]|0)+1&65535;b[a>>1]=j;j=(d|0)!=5&j<<16>>16>50?2:h}i=a+398|0;if(m&(b[a+412>>1]|0)==0){b[i>>1]=0;h=0}else h=b[i>>1]|0;h=Rd(h,1,f)|0;b[i>>1]=h;f=a+404|0;b[f>>1]=0;c:do{switch(d|0){case 2:case 4:case 5:case 6:case 7:{if(!((d|0)==7&(j|0)==0)){if(h<<16>>16>30){b[f>>1]=1;b[i>>1]=0;b[a+396>>1]=0;break c}h=a+396|0;g=b[h>>1]|0;if(!(g<<16>>16)){b[i>>1]=0;break c}else{b[h>>1]=(g&65535)+65535;break c}}else k=14;break}default:k=14}}while(0);if((k|0)==14)b[a+396>>1]=7;if(!j)return j|0;h=a+400|0;b[h>>1]=0;g=a+402|0;b[g>>1]=0;if(l){b[h>>1]=1;return j|0}if(m){b[h>>1]=1;b[g>>1]=1;return j|0}if(!n)return j|0;b[h>>1]=1;b[f>>1]=0;return j|0}function ib(a){a=a|0;if(!a){a=-1;return a|0}b[a>>1]=1;b[a+2>>1]=1;b[a+4>>1]=1;b[a+6>>1]=1;b[a+8>>1]=1;b[a+10>>1]=0;b[a+12>>1]=1;a=0;return a|0}function jb(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0;l=i;i=i+16|0;k=l+2|0;j=l;h=Zd(a,5)|0;a=a+10|0;if((Ge(h,b[a>>1]|0,g)|0)<<16>>16>0)h=b[a>>1]|0;h=(Z(b[674+(e<<16>>16<<1)>>1]|0,h<<16>>16)|0)>>15;if((h|0)>32767){c[g>>2]=1;h=32767}b[f>>1]=h;Xd(d,k,j,g);Wd(d,b[k>>1]|0,b[j>>1]|0);i=l;return}function kb(a,c,d,e,f){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;if(!(c<<16>>16)){if(d<<16>>16){c=a+12|0;if((Ge(b[e>>1]|0,b[c>>1]|0,f)|0)<<16>>16>0)b[e>>1]=b[c>>1]|0}else c=a+12|0;b[c>>1]=b[e>>1]|0}b[a+10>>1]=b[e>>1]|0;f=a+2|0;b[a>>1]=b[f>>1]|0;d=a+4|0;b[f>>1]=b[d>>1]|0;f=a+6|0;b[d>>1]=b[f>>1]|0;a=a+8|0;b[f>>1]=b[a>>1]|0;b[a>>1]=b[e>>1]|0;return}function lb(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0;g=Zd(a,5)|0;a=a+10|0;if((Ge(g,b[a>>1]|0,f)|0)<<16>>16>0)g=b[a>>1]|0;g=(Z(b[688+(d<<16>>16<<1)>>1]|0,g<<16>>16)|0)>>15;if((g|0)<=32767){f=g;f=f&65535;b[e>>1]=f;return}c[f>>2]=1;f=32767;f=f&65535;b[e>>1]=f;return}function mb(a){a=a|0;if(!a){a=-1;return a|0}b[a>>1]=1640;b[a+2>>1]=1640;b[a+4>>1]=1640;b[a+6>>1]=1640;b[a+8>>1]=1640;b[a+10>>1]=0;b[a+12>>1]=16384;a=0;return a|0}function nb(a,c,d,e,f){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;if(!(c<<16>>16)){if(d<<16>>16){c=a+12|0;if((Ge(b[e>>1]|0,b[c>>1]|0,f)|0)<<16>>16>0)b[e>>1]=b[c>>1]|0}else c=a+12|0;b[c>>1]=b[e>>1]|0}e=b[e>>1]|0;c=a+10|0;b[c>>1]=e;if((Ge(e,16384,f)|0)<<16>>16>0){b[c>>1]=16384;c=16384}else c=b[c>>1]|0;f=a+2|0;b[a>>1]=b[f>>1]|0;e=a+4|0;b[f>>1]=b[e>>1]|0;f=a+6|0;b[e>>1]=b[f>>1]|0;a=a+8|0;b[f>>1]=b[a>>1]|0;b[a>>1]=c;return}function ob(a,d,e,f,g,h,i){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0;k=Zd(e,9)|0;l=b[e+16>>1]|0;j=l<<16>>16;e=(j+(b[e+14>>1]|0)|0)>>>1;e=(j|0)<(e<<16>>16|0)?l:e&65535;if(!(d<<16>>16>5?k<<16>>16>d<<16>>16:0))return 0;j=e<<16>>16;j=((j<<18>>18|0)==(j|0)?j<<2:j>>>15^32767)&65535;if(!(f<<16>>16>6&g<<16>>16==0))j=Ge(j,e,i)|0;k=k<<16>>16>j<<16>>16?j:k;l=qe(d)|0;j=l<<16>>16;if(l<<16>>16<0){e=0-j<<16;if((e|0)<983040)j=d<<16>>16>>(e>>16)&65535;else j=0}else{e=d<<16>>16;g=e<<j;if((g<<16>>16>>j|0)==(e|0))j=g&65535;else j=(e>>>15^32767)&65535}f=Z((Td(16383,j)|0)<<16>>16,k<<16>>16)|0;if((f|0)==1073741824){c[i>>2]=1;g=2147483647}else g=f<<1;f=Ge(20,l,i)|0;j=f<<16>>16;if(f<<16>>16>0)f=f<<16>>16<31?g>>j:0;else{d=0-j<<16>>16;f=g<<d;f=(f>>d|0)==(g|0)?f:g>>31^2147483647}f=(f|0)>32767?32767:f&65535;f=h<<16>>16!=0&f<<16>>16>3072?3072:f<<16>>16;e=0;do{g=a+(e<<1)|0;j=Z(b[g>>1]|0,f)|0;if((j|0)==1073741824){c[i>>2]=1;j=2147483647}else j=j<<1;b[g>>1]=j>>>11;e=e+1|0}while((e|0)!=40);return 0}function pb(a,e,f,g){a=a|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0;h=c[g+104>>2]|0;i=c[g+96>>2]|0;if(a>>>0>=8){b[f>>1]=(d[e>>0]|0)>>>4&1;b[f+2>>1]=(d[e>>0]|0)>>>5&1;b[f+4>>1]=(d[e>>0]|0)>>>6&1;b[f+6>>1]=(d[e>>0]|0)>>>7&255;h=h+(a<<1)|0;if((b[h>>1]|0)>1){a=1;g=1;i=4}else return;while(1){j=e+a|0;a=i|1;b[f+(i<<16>>16<<1)>>1]=d[j>>0]&1;b[f+(a<<16>>16<<1)>>1]=(d[j>>0]|0)>>>1&1;k=i|3;b[f+(a+1<<16>>16<<16>>16<<1)>>1]=(d[j>>0]|0)>>>2&1;b[f+(k<<16>>16<<1)>>1]=(d[j>>0]|0)>>>3&1;b[f+(k+1<<16>>16<<16>>16<<1)>>1]=(d[j>>0]|0)>>>4&1;b[f+(k+2<<16>>16<<16>>16<<1)>>1]=(d[j>>0]|0)>>>5&1;b[f+(k+3<<16>>16<<16>>16<<1)>>1]=(d[j>>0]|0)>>>6&1;b[f+(k+4<<16>>16<<16>>16<<1)>>1]=(d[j>>0]|0)>>>7&255;g=g+1<<16>>16;if(g<<16>>16<(b[h>>1]|0)){a=g<<16>>16;i=i+8<<16>>16}else break}return}k=c[(c[g+100>>2]|0)+(a<<2)>>2]|0;b[f+(b[k>>1]<<1)>>1]=(d[e>>0]|0)>>>4&1;b[f+(b[k+2>>1]<<1)>>1]=(d[e>>0]|0)>>>5&1;b[f+(b[k+4>>1]<<1)>>1]=(d[e>>0]|0)>>>6&1;b[f+(b[k+6>>1]<<1)>>1]=(d[e>>0]|0)>>>7&255;j=h+(a<<1)|0;if((b[j>>1]|0)<=1)return;g=i+(a<<1)|0;h=1;a=1;i=4;while(1){h=e+h|0;i=i<<16>>16;if((i|0)<(b[g>>1]|0)){b[f+(b[k+(i<<1)>>1]<<1)>>1]=d[h>>0]&1;i=i+1|0;if((i|0)<(b[g>>1]|0)){b[f+(b[k+(i<<1)>>1]<<1)>>1]=(d[h>>0]|0)>>>1&1;i=i+1|0;if((i|0)<(b[g>>1]|0)){b[f+(b[k+(i<<1)>>1]<<1)>>1]=(d[h>>0]|0)>>>2&1;i=i+1|0;if((i|0)<(b[g>>1]|0)){b[f+(b[k+(i<<1)>>1]<<1)>>1]=(d[h>>0]|0)>>>3&1;i=i+1|0;if((i|0)<(b[g>>1]|0)){b[f+(b[k+(i<<1)>>1]<<1)>>1]=(d[h>>0]|0)>>>4&1;i=i+1|0;if((i|0)<(b[g>>1]|0)){b[f+(b[k+(i<<1)>>1]<<1)>>1]=(d[h>>0]|0)>>>5&1;i=i+1|0;if((i|0)<(b[g>>1]|0)){b[f+(b[k+(i<<1)>>1]<<1)>>1]=(d[h>>0]|0)>>>6&1;i=i+1|0;if((i|0)<(b[g>>1]|0)){b[f+(b[k+(i<<1)>>1]<<1)>>1]=(d[h>>0]|0)>>>7&1;i=i+1|0}}}}}}}}a=a+1<<16>>16;if(a<<16>>16<(b[j>>1]|0))h=a<<16>>16;else break}return}function qb(a,c,d,e,f){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0;switch(d<<16>>16){case 0:{j=9;while(1){i=b[a+(j<<1)>>1]|0;d=i<<16>>16;if(i<<16>>16<0)d=~((d^-4)>>2);else d=d>>>2;h=b[c+(j<<1)>>1]|0;g=h<<16>>16;if(h<<16>>16<0)h=~((g^-4)>>2);else h=g>>>2;b[e+(j<<1)>>1]=Rd((i&65535)-d&65535,h&65535,f)|0;if((j|0)>0)j=j+-1|0;else break}return}case 40:{h=9;while(1){f=b[a+(h<<1)>>1]|0;d=f<<16>>16;if(f<<16>>16<0)g=~((d^-2)>>1);else g=d>>>1;f=b[c+(h<<1)>>1]|0;d=f<<16>>16;if(f<<16>>16<0)d=~((d^-2)>>1);else d=d>>>1;b[e+(h<<1)>>1]=d+g;if((h|0)>0)h=h+-1|0;else break}return}case 80:{j=9;while(1){i=b[a+(j<<1)>>1]|0;d=i<<16>>16;if(i<<16>>16<0)i=~((d^-4)>>2);else i=d>>>2;d=b[c+(j<<1)>>1]|0;g=d<<16>>16;if(d<<16>>16<0)h=~((g^-4)>>2);else h=g>>>2;b[e+(j<<1)>>1]=Rd(i&65535,(d&65535)-h&65535,f)|0;if((j|0)>0)j=j+-1|0;else break}return}case 120:{b[e+18>>1]=b[c+18>>1]|0;b[e+16>>1]=b[c+16>>1]|0;b[e+14>>1]=b[c+14>>1]|0;b[e+12>>1]=b[c+12>>1]|0;b[e+10>>1]=b[c+10>>1]|0;b[e+8>>1]=b[c+8>>1]|0;b[e+6>>1]=b[c+6>>1]|0;b[e+4>>1]=b[c+4>>1]|0;b[e+2>>1]=b[c+2>>1]|0;b[e>>1]=b[c>>1]|0;return}default:return}}function rb(a,b){a=a|0;b=b|0;if(!a){a=-1;return a|0}Pe(a|0,b|0,20)|0;a=0;return a|0}function sb(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0;l=0;do{k=a+(l<<1)|0;f=b[k>>1]|0;i=f&65535;j=i<<16;f=f<<16>>16;if((f*5243|0)==1073741824){c[e>>2]=1;h=2147483647}else h=f*10486|0;g=j-h|0;if(((g^j)&(h^j)|0)<0){c[e>>2]=1;h=(i>>>15)+2147483647|0}else h=g;f=b[d+(l<<1)>>1]|0;g=f*5243|0;if((g|0)!=1073741824){f=(f*10486|0)+h|0;if((g^h|0)>0&(f^h|0)<0){c[e>>2]=1;f=(h>>>31)+2147483647|0}}else{c[e>>2]=1;f=2147483647}b[k>>1]=Ce(f,e)|0;l=l+1|0}while((l|0)!=10);return}function tb(a){a=a|0;var c=0;if(!a){c=-1;return c|0}c=a+18|0;do{b[a>>1]=0;a=a+2|0}while((a|0)<(c|0));c=0;return c|0}function ub(a){a=a|0;b[a+14>>1]=1;return}function vb(a){a=a|0;b[a+14>>1]=0;return}function wb(a,d,e,f,g,h,j,k,l,m){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;C=i;i=i+160|0;z=C+80|0;A=C;v=c[l+120>>2]|0;w=c[l+124>>2]|0;x=c[l+128>>2]|0;u=c[l+132>>2]|0;o=a+6|0;t=a+8|0;b[t>>1]=b[o>>1]|0;r=a+4|0;b[o>>1]=b[r>>1]|0;s=a+2|0;b[r>>1]=b[s>>1]|0;b[s>>1]=b[a>>1]|0;b[a>>1]=g;l=g<<16>>16<14746?g<<16>>16>9830&1:2;n=a+12|0;g=b[n>>1]|0;p=g<<15;do{if((p|0)<=536870911)if((p|0)<-536870912){c[m>>2]=1;g=-2147483648;break}else{g=g<<17;break}else{c[m>>2]=1;g=2147483647}}while(0);y=f<<16>>16;q=a+16|0;if((Ce(g,m)|0)<<16>>16>=f<<16>>16){p=b[q>>1]|0;if(p<<16>>16>0){p=(p&65535)+65535&65535;b[q>>1]=p}if(!(p<<16>>16)){g=(b[a>>1]|0)<9830;g=(b[s>>1]|0)<9830?g?2:1:g&1;if((b[r>>1]|0)<9830)g=(g&65535)+1&65535;if((b[o>>1]|0)<9830)g=(g&65535)+1&65535;if((b[t>>1]|0)<9830)g=(g&65535)+1&65535;p=0;l=g<<16>>16>2?0:l}}else{b[q>>1]=2;p=2}s=l<<16>>16;t=a+10|0;s=(p<<16>>16==0?(s|0)>((b[t>>1]|0)+1|0):0)?s+65535&65535:l;a=(b[a+14>>1]|0)==1?0:f<<16>>16<10?2:s<<16>>16<2&p<<16>>16>0?(s&65535)+1&65535:s;b[t>>1]=a;b[n>>1]=f;switch(d|0){case 4:case 6:case 7:break;default:if(a<<16>>16<2){p=0;l=0;o=h;n=z;while(1){if(!(b[o>>1]|0))g=0;else{l=l<<16>>16;b[A+(l<<1)>>1]=p;g=b[o>>1]|0;l=l+1&65535}b[n>>1]=g;b[o>>1]=0;p=p+1<<16>>16;if(p<<16>>16>=40){t=l;break}else{o=o+2|0;n=n+2|0}}s=a<<16>>16==0;s=(d|0)==5?s?v:w:s?x:u;if(t<<16>>16>0){r=0;do{q=b[A+(r<<1)>>1]|0;l=q<<16>>16;a=b[z+(l<<1)>>1]|0;if(q<<16>>16<40){p=a<<16>>16;o=39-q&65535;n=q;l=h+(l<<1)|0;g=s;while(1){d=(Z(b[g>>1]|0,p)|0)>>>15&65535;b[l>>1]=Rd(b[l>>1]|0,d,m)|0;n=n+1<<16>>16;if(n<<16>>16>=40)break;else{l=l+2|0;g=g+2|0}}if(q<<16>>16>0){l=s+(o+1<<1)|0;B=36}}else{l=s;B=36}if((B|0)==36){B=0;g=a<<16>>16;p=0;o=h;while(1){d=(Z(b[l>>1]|0,g)|0)>>>15&65535;b[o>>1]=Rd(b[o>>1]|0,d,m)|0;p=p+1<<16>>16;if(p<<16>>16>=q<<16>>16)break;else{o=o+2|0;l=l+2|0}}}r=r+1|0}while((r&65535)<<16>>16!=t<<16>>16)}}}r=j<<16>>16;s=y<<1;g=k<<16>>16;n=0-g<<16;l=n>>16;if(k<<16>>16>0){p=0;o=e;while(1){a=Z(b[e+(p<<1)>>1]|0,r)|0;if((a|0)==1073741824){c[m>>2]=1;n=2147483647}else n=a<<1;k=Z(s,b[h>>1]|0)|0;a=k+n|0;if((k^n|0)>-1&(a^n|0)<0){c[m>>2]=1;a=(n>>>31)+2147483647|0}k=a<<g;b[o>>1]=Ce((k>>g|0)==(a|0)?k:a>>31^2147483647,m)|0;p=p+1|0;if((p|0)==40)break;else{h=h+2|0;o=o+2|0}}i=C;return}if((n|0)<2031616){p=0;o=e;while(1){a=Z(b[e+(p<<1)>>1]|0,r)|0;if((a|0)==1073741824){c[m>>2]=1;n=2147483647}else n=a<<1;k=Z(s,b[h>>1]|0)|0;a=k+n|0;if((k^n|0)>-1&(a^n|0)<0){c[m>>2]=1;a=(n>>>31)+2147483647|0}b[o>>1]=Ce(a>>l,m)|0;p=p+1|0;if((p|0)==40)break;else{h=h+2|0;o=o+2|0}}i=C;return}else{o=0;n=e;while(1){a=Z(b[e+(o<<1)>>1]|0,r)|0;if((a|0)==1073741824){c[m>>2]=1;a=2147483647}else a=a<<1;k=Z(s,b[h>>1]|0)|0;if((k^a|0)>-1&(k+a^a|0)<0)c[m>>2]=1;b[n>>1]=Ce(0,m)|0;o=o+1|0;if((o|0)==40)break;else{h=h+2|0;n=n+2|0}}i=C;return}}function xb(a){a=a|0;if(!a){a=-1;return a|0}b[a>>1]=0;b[a+2>>1]=0;b[a+4>>1]=0;b[a+6>>1]=0;b[a+8>>1]=0;b[a+10>>1]=0;a=0;return a|0}function yb(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;if(d<<16>>16<=0)return;f=a+10|0;j=a+8|0;l=a+4|0;m=a+6|0;n=a+2|0;g=b[l>>1]|0;h=b[m>>1]|0;i=b[a>>1]|0;k=b[n>>1]|0;o=0;while(1){p=b[f>>1]|0;q=b[j>>1]|0;b[f>>1]=q;r=b[c>>1]|0;b[j>>1]=r;p=((r<<16>>16)*7699|0)+((Z(i<<16>>16,-7667)|0)+(((g<<16>>16)*15836|0)+((h<<16>>16)*15836>>15))+((Z(k<<16>>16,-7667)|0)>>15))+(Z(q<<16>>16,-15398)|0)+((p<<16>>16)*7699|0)|0;q=p<<3;p=(q>>3|0)==(p|0)?q:p>>31^2147483647;q=p<<1;b[c>>1]=Ce((q>>1|0)==(p|0)?q:p>>31^2147483647,e)|0;i=b[l>>1]|0;b[a>>1]=i;k=b[m>>1]|0;b[n>>1]=k;g=p>>>16&65535;b[l>>1]=g;h=(p>>>1)-(p>>16<<15)&65535;b[m>>1]=h;o=o+1<<16>>16;if(o<<16>>16>=d<<16>>16)break;else c=c+2|0}return}function zb(a){a=a|0;if(!a)a=-1;else{b[a>>1]=0;a=0}return a|0}function Ab(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0;j=f<<16>>16;h=d+(j+-1<<1)|0;j=j+-2|0;k=b[h>>1]|0;if(f<<16>>16<2)f=e<<16>>16;else{f=e<<16>>16;i=0;d=d+(j<<1)|0;while(1){e=(Z(b[d>>1]|0,f)|0)>>15;if((e|0)>32767){c[g>>2]=1;e=32767}b[h>>1]=Ge(b[h>>1]|0,e&65535,g)|0;h=h+-2|0;i=i+1<<16>>16;if((i<<16>>16|0)>(j|0))break;else d=d+-2|0}}f=(Z(b[a>>1]|0,f)|0)>>15;if((f|0)<=32767){j=f;j=j&65535;i=b[h>>1]|0;g=Ge(i,j,g)|0;b[h>>1]=g;b[a>>1]=k;return}c[g>>2]=1;j=32767;j=j&65535;i=b[h>>1]|0;g=Ge(i,j,g)|0;b[h>>1]=g;b[a>>1]=k;return}function Bb(a){a=a|0;var c=0,d=0,e=0;if(!a){e=-1;return e|0}Qe(a+104|0,0,340)|0;c=a+102|0;d=a;e=d+100|0;do{b[d>>1]=0;d=d+2|0}while((d|0)<(e|0));Ba(c)|0;zb(a+100|0)|0;e=0;return e|0}function Cb(d,e,f,g,h){d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;w=i;i=i+96|0;s=w+22|0;t=w;u=w+44|0;Pe(d+124|0,f|0,320)|0;o=u+22|0;p=d+100|0;q=d+80|0;r=d+102|0;if((e&-2|0)==6){n=0;while(1){Ie(g,702,s);Ie(g,722,t);m=d+104+(n+10<<1)|0;Be(s,m,d,40);k=u;j=s;e=k+22|0;do{b[k>>1]=b[j>>1]|0;k=k+2|0;j=j+2|0}while((k|0)<(e|0));k=o;e=k+22|0;do{b[k>>1]=0;k=k+2|0}while((k|0)<(e|0));He(t,u,u,22,o,0);e=0;k=21;do{j=b[u+(k<<16>>16<<1)>>1]|0;j=Z(j,j)|0;if((j|0)==1073741824){v=7;break}l=j<<1;j=l+e|0;if((l^e|0)>-1&(j^e|0)<0){c[h>>2]=1;e=(e>>>31)+2147483647|0}else e=j;k=k+-1<<16>>16}while(k<<16>>16>-1);if((v|0)==7){v=0;c[h>>2]=1}l=e>>>16&65535;j=20;e=0;k=20;while(1){j=Z(b[u+(j+1<<1)>>1]|0,b[u+(j<<1)>>1]|0)|0;if((j|0)==1073741824){v=13;break}x=j<<1;j=x+e|0;if((x^e|0)>-1&(j^e|0)<0){c[h>>2]=1;e=(e>>>31)+2147483647|0}else e=j;j=(k&65535)+-1<<16>>16;if(j<<16>>16>-1){j=j<<16>>16;k=k+-1|0}else break}if((v|0)==13){v=0;c[h>>2]=1}e=e>>16;if((e|0)<1)e=0;else e=Td((e*26214|0)>>>15&65535,l)|0;Ab(p,d,e,40,h);e=f+(n<<1)|0;He(t,d,e,40,q,1);Ca(r,m,e,29491,40,h);e=(n<<16)+2621440|0;if((e|0)<10485760){n=e>>16;g=g+22|0}else break}k=d+104|0;j=d+424|0;e=k+20|0;do{a[k>>0]=a[j>>0]|0;k=k+1|0;j=j+1|0}while((k|0)<(e|0));i=w;return}else{n=0;while(1){Ie(g,742,s);Ie(g,762,t);m=d+104+(n+10<<1)|0;Be(s,m,d,40);k=u;j=s;e=k+22|0;do{b[k>>1]=b[j>>1]|0;k=k+2|0;j=j+2|0}while((k|0)<(e|0));k=o;e=k+22|0;do{b[k>>1]=0;k=k+2|0}while((k|0)<(e|0));He(t,u,u,22,o,0);e=0;k=21;do{j=b[u+(k<<16>>16<<1)>>1]|0;j=Z(j,j)|0;if((j|0)==1073741824){v=22;break}x=j<<1;j=x+e|0;if((x^e|0)>-1&(j^e|0)<0){c[h>>2]=1;e=(e>>>31)+2147483647|0}else e=j;k=k+-1<<16>>16}while(k<<16>>16>-1);if((v|0)==22){v=0;c[h>>2]=1}l=e>>>16&65535;j=20;e=0;k=20;while(1){j=Z(b[u+(j+1<<1)>>1]|0,b[u+(j<<1)>>1]|0)|0;if((j|0)==1073741824){v=28;break}x=j<<1;j=x+e|0;if((x^e|0)>-1&(j^e|0)<0){c[h>>2]=1;e=(e>>>31)+2147483647|0}else e=j;j=(k&65535)+-1<<16>>16;if(j<<16>>16>-1){j=j<<16>>16;k=k+-1|0}else break}if((v|0)==28){v=0;c[h>>2]=1}e=e>>16;if((e|0)<1)e=0;else e=Td((e*26214|0)>>>15&65535,l)|0;Ab(p,d,e,40,h);e=f+(n<<1)|0;He(t,d,e,40,q,1);Ca(r,m,e,29491,40,h);e=(n<<16)+2621440|0;if((e|0)<10485760){n=e>>16;g=g+22|0}else break}k=d+104|0;j=d+424|0;e=k+20|0;do{a[k>>0]=a[j>>0]|0;k=k+1|0;j=j+1|0}while((k|0)<(e|0));i=w;return}}function Db(a,b){a=a|0;b=b|0;var d=0,e=0;if(!a){a=-1;return a|0}c[a>>2]=0;d=Je(1764)|0;if(!d){a=-1;return a|0}if((Ua(d)|0)<<16>>16==0?(e=d+1748|0,(xb(e)|0)<<16>>16==0):0){Va(d,0)|0;Bb(d+1304|0)|0;xb(e)|0;c[d+1760>>2]=0;c[a>>2]=d;a=0;return a|0}b=c[d>>2]|0;if(!b){a=-1;return a|0}Ke(b);c[d>>2]=0;a=-1;return a|0}function Eb(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function Fb(a,d,f,g,h){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;v=i;i=i+208|0;u=v+88|0;t=v;s=a+1164|0;j=c[a+1256>>2]|0;if((g+-5|0)>>>0<2){r=j+16|0;if((b[r>>1]|0)>0){q=c[(c[a+1260>>2]|0)+32>>2]|0;p=0;j=0;while(1){o=q+(p<<1)|0;m=b[o>>1]|0;if(m<<16>>16>0){l=f;n=0;k=0;while(1){k=e[l>>1]|k<<1&131070;n=n+1<<16>>16;if(n<<16>>16>=m<<16>>16)break;else l=l+2|0}k=k&65535}else k=0;b[u+(p<<1)>>1]=k;j=j+1<<16>>16;if(j<<16>>16<(b[r>>1]|0)){f=f+(b[o>>1]<<1)|0;p=j<<16>>16}else break}}}else{q=j+(d<<1)|0;if((b[q>>1]|0)>0){r=c[(c[a+1260>>2]|0)+(d<<2)>>2]|0;o=0;j=0;while(1){p=r+(o<<1)|0;m=b[p>>1]|0;if(m<<16>>16>0){l=f;n=0;k=0;while(1){k=e[l>>1]|k<<1&131070;n=n+1<<16>>16;if(n<<16>>16>=m<<16>>16)break;else l=l+2|0}k=k&65535}else k=0;b[u+(o<<1)>>1]=k;j=j+1<<16>>16;if(j<<16>>16<(b[q>>1]|0)){f=f+(b[p>>1]<<1)|0;o=j<<16>>16}else break}}}Wa(a,d,u,g,h,t);Cb(a+1304|0,d,h,t,s);yb(a+1748|0,h,160,s);j=0;do{a=h+(j<<1)|0;b[a>>1]=e[a>>1]&65528;j=j+1|0}while((j|0)!=160);i=v;return}function Gb(a,f,g,h){a=a|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0;j=c[h+100>>2]|0;k=(e[(c[h+96>>2]|0)+(a<<1)>>1]|0)+65535|0;h=k&65535;i=h<<16>>16>-1;if(a>>>0<8){if(!i)return;j=c[j+(a<<2)>>2]|0;i=k<<16>>16;while(1){b[g+(b[j+(i<<1)>>1]<<1)>>1]=(d[f+(i>>3)>>0]|0)>>>(i&7^7)&1;h=h+-1<<16>>16;if(h<<16>>16>-1)i=h<<16>>16;else break}return}else{if(!i)return;i=k<<16>>16;while(1){b[g+(i<<1)>>1]=(d[f+(i>>3)>>0]|0)>>>(i&7^7)&1;h=h+-1<<16>>16;if(h<<16>>16>-1)i=h<<16>>16;else break}return}}function Hb(a,b,c){a=a|0;b=b|0;c=c|0;a=vd(a,c,31764)|0;return((sd(b)|0|a)<<16>>16!=0)<<31>>31|0}function Ib(a,b){a=a|0;b=b|0;wd(a);td(b);return}function Jb(d,f,g,h,j,k,l){d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0;q=i;i=i+512|0;m=q+8|0;n=q+4|0;o=q;c[o>>2]=0;p=l<<16>>16==3;if(!((l&65535)<2|p&1)){if(l<<16>>16!=2){j=-1;i=q;return j|0}xd(d,g,h,m+2|0,o);d=c[o>>2]|0;c[k>>2]=d;ud(f,d,n);f=c[n>>2]|0;b[m>>1]=f;b[m+490>>1]=(f|0)==3?-1:g&65535;a[j>>0]=f;f=1;do{m=m+1|0;a[j+f>>0]=a[m>>0]|0;f=f+1|0}while((f|0)!=492);m=492;i=q;return m|0}xd(d,g,h,m,o);ud(f,c[o>>2]|0,n);h=c[n>>2]|0;if((h|0)!=3){f=c[o>>2]|0;c[k>>2]=f;if((f|0)==8){switch(h|0){case 1:{b[m+70>>1]=0;break}case 2:{o=m+70|0;b[o>>1]=e[o>>1]|0|1;break}default:{}}b[m+72>>1]=g&1;b[m+74>>1]=g>>>1&1;b[m+76>>1]=g>>>2&1;f=8}}else{c[k>>2]=15;f=15}if(p){tc(f,m,j,(c[d+4>>2]|0)+2392|0);j=b[3404+(c[k>>2]<<16>>16<<1)>>1]|0;i=q;return j|0}switch(l<<16>>16){case 0:{sc(f,m,j,(c[d+4>>2]|0)+2392|0);j=b[3404+(c[k>>2]<<16>>16<<1)>>1]|0;i=q;return j|0}case 1:{rc(f,m,j,(c[d+4>>2]|0)+2392|0);j=b[3436+(c[k>>2]<<16>>16<<1)>>1]|0;i=q;return j|0}default:{j=-1;i=q;return j|0}}return 0}function Kb(a,c,d,e,f,g){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;y=i;i=i+480|0;x=y;g=240;l=f;k=a;j=x;h=0;while(1){w=((Z(b[l>>1]|0,b[k>>1]|0)|0)+16384|0)>>>15;b[j>>1]=w;w=w<<16;h=(Z(w>>15,w>>16)|0)+h|0;if((h|0)<0){m=4;break}g=g+-1|0;if(!((g&65535)<<16>>16)){g=0;break}else{l=l+2|0;k=k+2|0;j=j+2|0}}if((m|0)==4){h=g&65535;j=240-g|0;if(!(h<<16>>16))g=0;else{l=h;k=f+(j<<1)|0;g=a+(j<<1)|0;h=x+(j<<1)|0;while(1){b[h>>1]=((Z(b[k>>1]|0,b[g>>1]|0)|0)+16384|0)>>>15;l=l+-1<<16>>16;if(!(l<<16>>16)){g=0;break}else{k=k+2|0;g=g+2|0;h=h+2|0}}}do{k=g&65535;g=120;j=x;h=0;while(1){w=(b[j>>1]|0)>>>2;u=j+2|0;b[j>>1]=w;w=w<<16>>16;w=Z(w,w)|0;v=(b[u>>1]|0)>>>2;b[u>>1]=v;v=v<<16>>16;h=((Z(v,v)|0)+w<<1)+h|0;g=g+-1<<16>>16;if(!(g<<16>>16))break;else j=j+4|0}g=k+4|0}while((h|0)<1)}w=h+1|0;v=(pe(w)|0)<<16>>16;w=w<<v;b[d>>1]=w>>>16;b[e>>1]=(w>>>1)-(w>>16<<15);w=x+478|0;l=c<<16>>16;if(c<<16>>16<=0){x=v-g|0;x=x&65535;i=y;return x|0}r=x+476|0;s=v+1|0;t=239-l|0;u=x+(236-l<<1)|0;c=l;d=d+(l<<1)|0;e=e+(l<<1)|0;while(1){m=Z((t>>>1)+65535&65535,-2)|0;k=x+(m+236<<1)|0;m=u+(m<<1)|0;f=240-c|0;q=f+-1|0;j=x+(q<<1)|0;a=q>>>1&65535;f=x+(f+-2<<1)|0;l=Z(b[w>>1]|0,b[j>>1]|0)|0;if(!(a<<16>>16)){m=f;k=r}else{p=r;o=w;while(1){h=j+-4|0;n=o+-4|0;l=(Z(b[p>>1]|0,b[f>>1]|0)|0)+l|0;a=a+-1<<16>>16;l=(Z(b[n>>1]|0,b[h>>1]|0)|0)+l|0;if(!(a<<16>>16))break;else{f=j+-6|0;p=o+-6|0;j=h;o=n}}}if(q&1)l=(Z(b[k>>1]|0,b[m>>1]|0)|0)+l|0;q=l<<s;b[d>>1]=q>>>16;b[e>>1]=(q>>>1)-(q>>16<<15);if((c&65535)+-1<<16>>16<<16>>16>0){t=t+1|0;u=u+2|0;c=c+-1|0;d=d+-2|0;e=e+-2|0}else break}x=v-g|0;x=x&65535;i=y;return x|0}function Lb(a,c,d,f,g,h,j,k){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;E=i;i=i+3440|0;D=E+3420|0;z=E+3400|0;A=E+3224|0;C=E;x=E+3320|0;B=E+3240|0;y=E+24|0;hc(d,a,x,2,k);rd(x,c,B,A,5,z,5,k);fc(d,B,y,k);pd(10,5,5,x,y,z,A,C,k);c=f;k=c+80|0;do{b[c>>1]=0;c=c+2|0}while((c|0)<(k|0));b[h>>1]=65535;b[h+2>>1]=65535;b[h+4>>1]=65535;b[h+6>>1]=65535;b[h+8>>1]=65535;p=0;q=C;r=D;do{a=b[q>>1]|0;q=q+2|0;l=(a*6554|0)>>>15;m=l<<16>>16;c=f+(a<<1)|0;k=b[c>>1]|0;if((b[B+(a<<1)>>1]|0)>0){b[c>>1]=k+4096;b[r>>1]=8192;n=l}else{b[c>>1]=k+61440;b[r>>1]=-8192;n=m+8|0}r=r+2|0;o=n&65535;c=a-(l<<2)-m<<16>>16;l=h+(c<<1)|0;k=b[l>>1]|0;a=k<<16>>16;do{if(k<<16>>16>=0){m=n<<16>>16;if(!((m^a)&8)){c=h+(c+5<<1)|0;if((a|0)>(m|0)){b[c>>1]=k;b[l>>1]=o;break}else{b[c>>1]=o;break}}else{c=h+(c+5<<1)|0;if((a&7)>>>0>(m&7)>>>0){b[c>>1]=o;break}else{b[c>>1]=k;b[l>>1]=o;break}}}else b[l>>1]=o}while(0);p=p+1<<16>>16}while(p<<16>>16<10);r=D+2|0;p=D+4|0;n=D+6|0;m=D+8|0;l=D+10|0;c=D+12|0;k=D+14|0;a=D+16|0;s=D+18|0;t=40;u=d+(0-(b[C>>1]|0)<<1)|0;v=d+(0-(b[C+2>>1]|0)<<1)|0;w=d+(0-(b[C+4>>1]|0)<<1)|0;x=d+(0-(b[C+6>>1]|0)<<1)|0;y=d+(0-(b[C+8>>1]|0)<<1)|0;z=d+(0-(b[C+10>>1]|0)<<1)|0;A=d+(0-(b[C+12>>1]|0)<<1)|0;B=d+(0-(b[C+14>>1]|0)<<1)|0;f=d+(0-(b[C+16>>1]|0)<<1)|0;q=d+(0-(b[C+18>>1]|0)<<1)|0;o=g;while(1){K=(Z(b[D>>1]|0,b[u>>1]|0)|0)>>7;J=(Z(b[r>>1]|0,b[v>>1]|0)|0)>>7;I=(Z(b[p>>1]|0,b[w>>1]|0)|0)>>7;H=(Z(b[n>>1]|0,b[x>>1]|0)|0)>>7;G=(Z(b[m>>1]|0,b[y>>1]|0)|0)>>7;F=(Z(b[l>>1]|0,b[z>>1]|0)|0)>>7;C=(Z(b[c>>1]|0,b[A>>1]|0)|0)>>7;d=(Z(b[k>>1]|0,b[B>>1]|0)|0)>>>7;g=(Z(b[a>>1]|0,b[f>>1]|0)|0)>>>7;b[o>>1]=(K+128+J+I+H+G+F+C+d+g+((Z(b[s>>1]|0,b[q>>1]|0)|0)>>>7)|0)>>>8;t=t+-1<<16>>16;if(!(t<<16>>16))break;else{u=u+2|0;v=v+2|0;w=w+2|0;x=x+2|0;y=y+2|0;z=z+2|0;A=A+2|0;B=B+2|0;f=f+2|0;q=q+2|0;o=o+2|0}}c=0;do{k=h+(c<<1)|0;a=b[k>>1]|0;if((c|0)<5)a=(e[j+((a&7)<<1)>>1]|a&8)&65535;else a=b[j+((a&7)<<1)>>1]|0;b[k>>1]=a;c=c+1|0}while((c|0)!=10);i=E;return}function Mb(a,d,e,f,g,h,j,k){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0;N=i;i=i+3456|0;I=N+3448|0;G=N+3360|0;E=N+3368|0;p=N+3280|0;H=N+3200|0;F=N;K=(f&65535)<<17;M=e<<16>>16;J=e<<16>>16<40;if(J){f=K>>16;e=M;do{m=(Z(b[d+(e-M<<1)>>1]|0,f)|0)>>15;if((m|0)>32767){c[k>>2]=1;m=32767}D=d+(e<<1)|0;b[D>>1]=Rd(b[D>>1]|0,m&65535,k)|0;e=e+1|0}while((e&65535)<<16>>16!=40)}hc(d,a,E,1,k);qd(E,H,p,8);fc(d,H,F,k);D=G+2|0;b[G>>1]=0;b[D>>1]=1;a=1;m=0;o=1;p=0;n=-1;do{B=b[2830+(p<<1)>>1]|0;C=B<<16>>16;A=0;do{y=b[2834+(A<<1)>>1]|0;z=y<<16>>16;x=a;v=C;u=o;w=B;t=n;while(1){l=b[E+(v<<1)>>1]|0;r=b[F+(v*80|0)+(v<<1)>>1]|0;e=z;o=1;s=y;a=y;n=-1;while(1){f=Rd(l,b[E+(e<<1)>>1]|0,k)|0;f=f<<16>>16;f=(Z(f,f)|0)>>>15;q=(b[F+(v*80|0)+(e<<1)>>1]<<15)+32768+((b[F+(e*80|0)+(e<<1)>>1]|0)+r<<14)|0;if(((Z(f<<16>>16,o<<16>>16)|0)-(Z(q>>16,n<<16>>16)|0)<<1|0)>0){o=q>>>16&65535;a=s;n=f&65535}q=e+5|0;s=q&65535;if(s<<16>>16>=40)break;else e=q<<16>>16}if(((Z(n<<16>>16,u<<16>>16)|0)-(Z(o<<16>>16,t<<16>>16)|0)<<1|0)>0){b[G>>1]=w;b[D>>1]=a;m=w}else{a=x;o=u;n=t}q=v+5|0;w=q&65535;if(w<<16>>16>=40)break;else{x=a;v=q<<16>>16;u=o;t=n}}A=A+1|0}while((A|0)!=4);p=p+1|0}while((p|0)!=2);r=a;s=m;f=g;e=f+80|0;do{b[f>>1]=0;f=f+2|0}while((f|0)<(e|0));o=s;e=0;q=0;f=0;while(1){m=o<<16>>16;l=b[H+(m<<1)>>1]|0;a=(m*6554|0)>>>15;o=a<<16;p=o>>15;n=m-(p+(a<<3)<<16>>17)|0;switch(n<<16>>16|0){case 0:{p=o>>10;a=1;break}case 1:{if(!((e&65535)<<16>>16))a=0;else{p=a<<22>>16|16;a=1}break}case 2:{p=a<<22>>16|32;a=1;break}case 3:{p=a<<17>>16|1;a=0;break}case 4:{p=a<<22>>16|48;a=1;break}default:{p=a;a=n&65535}}p=p&65535;n=g+(m<<1)|0;if(l<<16>>16>0){b[n>>1]=8191;b[I+(e<<1)>>1]=32767;m=a<<16>>16;if(a<<16>>16<0){m=0-m<<16;if((m|0)<983040)m=1>>>(m>>16)&65535;else m=0}else{F=1<<m;m=(F<<16>>16>>m|0)==1?F&65535:32767}f=Rd(f,m,k)|0}else{b[n>>1]=-8192;b[I+(e<<1)>>1]=-32768}m=Rd(q,p,k)|0;e=e+1|0;if((e|0)==2){q=m;break}o=b[G+(e<<1)>>1]|0;q=m}b[j>>1]=f;p=I+2|0;o=b[I>>1]|0;a=0;n=d+(0-(s<<16>>16)<<1)|0;m=d+(0-(r<<16>>16)<<1)|0;do{f=Z(b[n>>1]|0,o)|0;n=n+2|0;if((f|0)!=1073741824?(L=f<<1,!((f|0)>0&(L|0)<0)):0)l=L;else{c[k>>2]=1;l=2147483647}e=Z(b[p>>1]|0,b[m>>1]|0)|0;m=m+2|0;if((e|0)!=1073741824){f=(e<<1)+l|0;if((e^l|0)>0&(f^l|0)<0){c[k>>2]=1;f=(l>>>31)+2147483647|0}}else{c[k>>2]=1;f=2147483647}b[h+(a<<1)>>1]=Ce(f,k)|0;a=a+1|0}while((a|0)!=40);if(!J){i=N;return q|0}e=K>>16;f=M;do{l=(Z(b[g+(f-M<<1)>>1]|0,e)|0)>>15;if((l|0)>32767){c[k>>2]=1;l=32767}h=g+(f<<1)|0;b[h>>1]=Rd(b[h>>1]|0,l&65535,k)|0;f=f+1|0}while((f&65535)<<16>>16!=40);i=N;return q|0}function Nb(a,d,e,f,g,h,j,k,l,m){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;x=i;i=i+3456|0;r=x+3360|0;s=x+3368|0;t=x+3280|0;u=x+3200|0;v=x;w=g<<16>>16;p=w<<1;if((p|0)==(w<<17>>16|0))q=p;else{c[m>>2]=1;q=g<<16>>16>0?32767:-32768}w=f<<16>>16;n=f<<16>>16<40;if(n){g=q<<16>>16;o=w;do{f=e+(o<<1)|0;p=(Z(b[e+(o-w<<1)>>1]|0,g)|0)>>15;if((p|0)>32767){c[m>>2]=1;p=32767}b[f>>1]=Rd(b[f>>1]|0,p&65535,m)|0;o=o+1|0}while((o&65535)<<16>>16!=40)}hc(e,d,s,1,m);qd(s,u,t,8);fc(e,u,v,m);Ob(a,s,v,l,r);p=Pb(a,r,u,h,e,j,k,m)|0;if(!n){i=x;return p|0}o=q<<16>>16;g=w;do{f=h+(g<<1)|0;n=(Z(b[h+(g-w<<1)>>1]|0,o)|0)>>15;if((n|0)>32767){c[m>>2]=1;n=32767}b[f>>1]=Rd(b[f>>1]|0,n&65535,m)|0;g=g+1|0}while((g&65535)<<16>>16!=40);i=x;return p|0}function Ob(a,c,d,f,g){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0;x=g+2|0;b[g>>1]=0;b[x>>1]=1;v=a<<16>>16<<1;h=1;w=0;a=-1;do{u=(w<<3)+v<<16>>16;k=b[f+(u<<1)>>1]|0;u=b[f+((u|1)<<1)>>1]|0;i=k<<16>>16;a:do{if(k<<16>>16<40){t=u<<16>>16;if(u<<16>>16<40)s=h;else while(1){if((a<<16>>16|0)<(0-(h<<16>>16)|0)){b[g>>1]=k;b[x>>1]=u;j=1;a=-1}else j=h;h=i+5|0;k=h&65535;if(k<<16>>16>=40){h=j;break a}else{i=h<<16>>16;h=j}}while(1){q=b[d+(i*80|0)+(i<<1)>>1]|0;p=e[c+(i<<1)>>1]|0;o=t;h=1;r=u;j=u;l=-1;while(1){n=(e[c+(o<<1)>>1]|0)+p<<16>>16;n=(Z(n,n)|0)>>>15;m=(b[d+(i*80|0)+(o<<1)>>1]<<15)+32768+((b[d+(o*80|0)+(o<<1)>>1]|0)+q<<14)|0;if(((Z(n<<16>>16,h<<16>>16)|0)-(Z(m>>16,l<<16>>16)|0)<<1|0)>0){h=m>>>16&65535;j=r;l=n&65535}m=o+5|0;r=m&65535;if(r<<16>>16>=40)break;else o=m<<16>>16}if(((Z(l<<16>>16,s<<16>>16)|0)-(Z(h<<16>>16,a<<16>>16)|0)<<1|0)>0){b[g>>1]=k;b[x>>1]=j;a=l}else h=s;i=i+5|0;k=i&65535;if(k<<16>>16>=40)break;else{i=i<<16>>16;s=h}}}}while(0);w=w+1|0}while((w|0)!=2);return}function Pb(a,d,e,f,g,h,i,j){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0;k=f;l=k+80|0;do{b[k>>1]=0;k=k+2|0}while((k|0)<(l|0));k=b[d>>1]|0;o=(k*6554|0)>>>15;l=o<<16>>16;n=(748250>>>((k+(Z(l,-5)|0)<<16>>16)+((a<<16>>16)*5|0)|0)&1|0)==0;m=(b[e+(k<<1)>>1]|0)>0;p=m?32767:-32768;b[f+(k<<1)>>1]=m?8191:-8192;k=d+2|0;a=b[k>>1]|0;f=f+(a<<1)|0;if((b[e+(a<<1)>>1]|0)>0){b[f>>1]=8191;e=32767;f=(m&1|2)&65535}else{b[f>>1]=-8192;e=-32768;f=m&1}o=((a*6554|0)>>>15<<3)+(n?o:l+64|0)&65535;b[i>>1]=f;n=0;m=g+(0-(b[d>>1]|0)<<1)|0;f=g+(0-(b[k>>1]|0)<<1)|0;do{k=Z(p,b[m>>1]|0)|0;m=m+2|0;if((k|0)==1073741824){c[j>>2]=1;a=2147483647}else a=k<<1;l=Z(e,b[f>>1]|0)|0;f=f+2|0;if((l|0)!=1073741824){k=(l<<1)+a|0;if((l^a|0)>0&(k^a|0)<0){c[j>>2]=1;k=(a>>>31)+2147483647|0}}else{c[j>>2]=1;k=2147483647}b[h+(n<<1)>>1]=Ce(k,j)|0;n=n+1|0}while((n|0)!=40);return o|0}function Qb(a,d,f,g,h,j,k,l){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;U=i;i=i+3440|0;M=U+3360|0;N=U+3280|0;P=U+3200|0;O=U;R=(g&65535)<<17;T=f<<16>>16;Q=f<<16>>16<40;if(Q){f=R>>16;m=T;do{g=(Z(b[d+(m-T<<1)>>1]|0,f)|0)>>15;if((g|0)>32767){c[l>>2]=1;g=32767}L=d+(m<<1)|0;b[L>>1]=Rd(b[L>>1]|0,g&65535,l)|0;m=m+1|0}while((m&65535)<<16>>16!=40)}hc(d,a,M,1,l);qd(M,P,N,6);fc(d,P,O,l);L=1;n=2;o=1;g=0;m=1;a=-1;p=1;while(1){K=2;s=2;while(1){H=0;I=0;J=p;G=s;while(1){if(I<<16>>16<40){C=J<<16>>16;D=J<<16>>16<40;E=G<<16>>16;F=G<<16>>16<40;A=I<<16>>16;B=I;while(1){if((b[N+(A<<1)>>1]|0)>-1){x=b[O+(A*80|0)+(A<<1)>>1]|0;if(D){y=e[M+(A<<1)>>1]|0;w=C;r=1;z=J;f=J;s=0;q=-1;while(1){u=(e[M+(w<<1)>>1]|0)+y|0;v=u<<16>>16;v=(Z(v,v)|0)>>>15;t=(b[O+(A*80|0)+(w<<1)>>1]<<15)+32768+((b[O+(w*80|0)+(w<<1)>>1]|0)+x<<14)|0;if(((Z(v<<16>>16,r<<16>>16)|0)-(Z(t>>16,q<<16>>16)|0)<<1|0)>0){r=t>>>16&65535;f=z;s=u&65535;q=v&65535}t=w+5|0;z=t&65535;if(z<<16>>16>=40)break;else w=t<<16>>16}}else{r=1;f=J;s=0}if(F){y=s&65535;z=f<<16>>16;w=(r<<16>>16<<14)+32768|0;v=E;s=1;x=G;q=G;r=-1;while(1){u=(e[M+(v<<1)>>1]|0)+y<<16>>16;u=(Z(u,u)|0)>>>15;t=w+(b[O+(v*80|0)+(v<<1)>>1]<<12)+((b[O+(A*80|0)+(v<<1)>>1]|0)+(b[O+(z*80|0)+(v<<1)>>1]|0)<<13)|0;if(((Z(u<<16>>16,s<<16>>16)|0)-(Z(t>>16,r<<16>>16)|0)<<1|0)>0){s=t>>>16&65535;q=x;r=u&65535}t=v+5|0;x=t&65535;if(x<<16>>16>=40){w=s;v=r;break}else v=t<<16>>16}}else{w=1;q=G;v=-1}s=Z(v<<16>>16,m<<16>>16)|0;if((s|0)==1073741824){c[l>>2]=1;t=2147483647}else t=s<<1;s=Z(w<<16>>16,a<<16>>16)|0;if((s|0)==1073741824){c[l>>2]=1;r=2147483647}else r=s<<1;s=t-r|0;if(((s^t)&(r^t)|0)<0){c[l>>2]=1;s=(t>>>31)+2147483647|0}z=(s|0)>0;n=z?q:n;o=z?f:o;g=z?B:g;m=z?w:m;a=z?v:a}s=A+5|0;B=s&65535;if(B<<16>>16>=40)break;else A=s<<16>>16}}H=H+1<<16>>16;if(H<<16>>16>=3)break;else{F=G;G=J;J=I;I=F}}f=K+2|0;s=f&65535;if(s<<16>>16>=5)break;else K=f&65535}f=L+2|0;p=f&65535;if(p<<16>>16<4)L=f&65535;else{s=n;n=o;break}}f=h;m=f+80|0;do{b[f>>1]=0;f=f+2|0}while((f|0)<(m|0));v=g<<16>>16;a=b[P+(v<<1)>>1]|0;g=(v*6554|0)>>>15;f=g<<16;m=v-(((f>>16)*327680|0)>>>16)|0;switch(m<<16>>16|0){case 1:{g=f>>12;break}case 2:{g=f>>8;m=2;break}case 3:{g=g<<20>>16|8;m=1;break}case 4:{g=g<<24>>16|128;m=2;break}default:{}}f=h+(v<<1)|0;if(a<<16>>16>0){b[f>>1]=8191;z=32767;o=65536<<(m<<16>>16)>>>16&65535}else{b[f>>1]=-8192;z=-32768;o=0}t=n<<16>>16;n=b[P+(t<<1)>>1]|0;f=(t*6554|0)>>>15;m=f<<16;a=t-(((m>>16)*327680|0)>>>16)|0;switch(a<<16>>16|0){case 1:{f=m>>12;break}case 2:{f=m>>8;a=2;break}case 3:{f=f<<20>>16|8;a=1;break}case 4:{f=f<<24>>16|128;a=2;break}default:{}}m=h+(t<<1)|0;if(n<<16>>16>0){b[m>>1]=8191;u=32767;o=(65536<<(a<<16>>16)>>>16)+(o&65535)&65535}else{b[m>>1]=-8192;u=-32768}p=f+g|0;r=s<<16>>16;n=b[P+(r<<1)>>1]|0;g=(r*6554|0)>>>15;f=g<<16;m=r-(((f>>16)*327680|0)>>>16)|0;switch(m<<16>>16|0){case 1:{f=f>>12;break}case 2:{f=f>>8;m=2;break}case 3:{f=g<<20>>16|8;m=1;break}case 4:{f=g<<24>>16|128;m=2;break}default:f=g}g=h+(r<<1)|0;if(n<<16>>16>0){b[g>>1]=8191;s=32767;g=(65536<<(m<<16>>16)>>>16)+(o&65535)&65535}else{b[g>>1]=-8192;s=-32768;g=o}q=p+f|0;b[k>>1]=g;o=0;p=d+(0-v<<1)|0;a=d+(0-t<<1)|0;n=d+(0-r<<1)|0;do{g=Z(b[p>>1]|0,z)|0;p=p+2|0;if((g|0)!=1073741824?(S=g<<1,!((g|0)>0&(S|0)<0)):0)m=S;else{c[l>>2]=1;m=2147483647}g=Z(b[a>>1]|0,u)|0;a=a+2|0;if((g|0)!=1073741824){f=(g<<1)+m|0;if((g^m|0)>0&(f^m|0)<0){c[l>>2]=1;f=(m>>>31)+2147483647|0}}else{c[l>>2]=1;f=2147483647}m=Z(b[n>>1]|0,s)|0;n=n+2|0;if((m|0)!=1073741824){g=(m<<1)+f|0;if((m^f|0)>0&(g^f|0)<0){c[l>>2]=1;g=(f>>>31)+2147483647|0}}else{c[l>>2]=1;g=2147483647}b[j+(o<<1)>>1]=Ce(g,l)|0;o=o+1|0}while((o|0)!=40);g=q&65535;if(!Q){i=U;return g|0}m=R>>16;f=T;do{a=(Z(b[h+(f-T<<1)>>1]|0,m)|0)>>15;if((a|0)>32767){c[l>>2]=1;a=32767}j=h+(f<<1)|0;b[j>>1]=Rd(b[j>>1]|0,a&65535,l)|0;f=f+1|0}while((f&65535)<<16>>16!=40);i=U;return g|0}function Rb(a,d,f,g,h,j,k,l,m){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0;da=i;i=i+3456|0;_=da+3448|0;X=da+3360|0;U=da+3368|0;V=da+3280|0;Y=da+3200|0;W=da;aa=(g&65535)<<17;ca=f<<16>>16;$=f<<16>>16<40;if($){f=aa>>16;n=ca;do{g=(Z(b[d+(n-ca<<1)>>1]|0,f)|0)>>15;if((g|0)>32767){c[m>>2]=1;g=32767}T=d+(n<<1)|0;b[T>>1]=Rd(b[T>>1]|0,g&65535,m)|0;n=n+1|0}while((n&65535)<<16>>16!=40)}hc(d,a,U,1,m);qd(U,Y,V,4);fc(d,Y,W,m);R=X+2|0;b[X>>1]=0;S=X+4|0;b[R>>1]=1;T=X+6|0;b[S>>1]=2;b[T>>1]=3;r=3;p=2;o=1;g=0;f=1;n=-1;q=3;do{M=0;N=0;O=q;P=1;Q=2;while(1){if(N<<16>>16<40){G=P<<16>>16;H=P<<16>>16<40;I=Q<<16>>16;J=Q<<16>>16<40;K=O<<16>>16;L=O<<16>>16<40;F=N<<16>>16;E=p;C=o;B=f;D=N;while(1){if((b[V+(F<<1)>>1]|0)>-1){t=b[W+(F*80|0)+(F<<1)>>1]|0;if(H){s=e[U+(F<<1)>>1]|0;u=G;z=1;p=P;o=P;x=0;y=-1;while(1){w=(e[U+(u<<1)>>1]|0)+s|0;v=w<<16>>16;v=(Z(v,v)|0)>>>15;A=(b[W+(F*80|0)+(u<<1)>>1]<<15)+32768+((b[W+(u*80|0)+(u<<1)>>1]|0)+t<<14)|0;if(((Z(v<<16>>16,z<<16>>16)|0)-(Z(A>>16,y<<16>>16)|0)<<1|0)>0){z=A>>>16&65535;o=p;x=w&65535;y=v&65535}A=u+5|0;p=A&65535;if(p<<16>>16>=40)break;else u=A<<16>>16}}else{z=1;o=P;x=0}if(J){f=x&65535;a=o<<16>>16;t=(z<<16>>16<<14)+32768|0;u=I;A=1;s=Q;p=Q;y=0;x=-1;while(1){w=(e[U+(u<<1)>>1]|0)+f|0;v=w<<16>>16;v=(Z(v,v)|0)>>>15;z=t+(b[W+(u*80|0)+(u<<1)>>1]<<12)+((b[W+(F*80|0)+(u<<1)>>1]|0)+(b[W+(a*80|0)+(u<<1)>>1]|0)<<13)|0;if(((Z(v<<16>>16,A<<16>>16)|0)-(Z(z>>16,x<<16>>16)|0)<<1|0)>0){A=z>>>16&65535;p=s;y=w&65535;x=v&65535}z=u+5|0;s=z&65535;if(s<<16>>16>=40)break;else u=z<<16>>16}}else{A=1;p=Q;y=0}if(L){t=y&65535;s=p<<16>>16;a=o<<16>>16;v=(A&65535)<<16|32768;w=K;f=1;u=O;z=O;A=-1;while(1){x=(e[U+(w<<1)>>1]|0)+t<<16>>16;x=(Z(x,x)|0)>>>15;y=(b[W+(w*80|0)+(w<<1)>>1]<<12)+v+((b[W+(a*80|0)+(w<<1)>>1]|0)+(b[W+(s*80|0)+(w<<1)>>1]|0)+(b[W+(F*80|0)+(w<<1)>>1]|0)<<13)|0;if(((Z(x<<16>>16,f<<16>>16)|0)-(Z(y>>16,A<<16>>16)|0)<<1|0)>0){f=y>>>16&65535;z=u;A=x&65535}y=w+5|0;u=y&65535;if(u<<16>>16>=40)break;else w=y<<16>>16}}else{f=1;z=O;A=-1}if(((Z(A<<16>>16,B<<16>>16)|0)-(Z(f<<16>>16,n<<16>>16)|0)<<1|0)>0){b[X>>1]=D;b[R>>1]=o;b[S>>1]=p;b[T>>1]=z;r=z;g=D;n=A}else{p=E;o=C;f=B}}else{p=E;o=C;f=B}w=F+5|0;D=w&65535;if(D<<16>>16>=40)break;else{F=w<<16>>16;E=p;C=o;B=f}}}M=M+1<<16>>16;if(M<<16>>16>=4)break;else{K=Q;L=O;Q=P;P=N;O=K;N=L}}q=q+1<<16>>16}while(q<<16>>16<5);A=r;z=p;y=o;x=g;g=h;f=g+80|0;do{b[g>>1]=0;g=g+2|0}while((g|0)<(f|0));a=x;f=0;n=0;g=0;while(1){p=a<<16>>16;q=b[Y+(p<<1)>>1]|0;a=p*13108>>16;o=p-((a*327680|0)>>>16)|0;a=b[l+(a<<1)>>1]|0;switch(o<<16>>16|0){case 1:{r=a<<16>>16<<3&65535;break}case 2:{r=a<<16>>16<<6&65535;break}case 3:{r=a<<16>>16<<10&65535;break}case 4:{r=((a&65535)<<10|512)&65535;o=3;break}default:r=a}a=h+(p<<1)|0;if(q<<16>>16>0){b[a>>1]=8191;a=32767;g=(65536<<(o<<16>>16)>>>16)+(g&65535)&65535}else{b[a>>1]=-8192;a=-32768}b[_+(f<<1)>>1]=a;n=(r&65535)+(n&65535)|0;f=f+1|0;if((f|0)==4){w=n;break}a=b[X+(f<<1)>>1]|0}b[k>>1]=g;t=_+2|0;u=_+4|0;v=_+6|0;a=b[_>>1]|0;s=0;o=d+(0-(x<<16>>16)<<1)|0;p=d+(0-(y<<16>>16)<<1)|0;q=d+(0-(z<<16>>16)<<1)|0;r=d+(0-(A<<16>>16)<<1)|0;do{g=Z(b[o>>1]|0,a)|0;o=o+2|0;if((g|0)!=1073741824?(ba=g<<1,!((g|0)>0&(ba|0)<0)):0)n=ba;else{c[m>>2]=1;n=2147483647}g=Z(b[t>>1]|0,b[p>>1]|0)|0;p=p+2|0;if((g|0)!=1073741824){f=(g<<1)+n|0;if((g^n|0)>0&(f^n|0)<0){c[m>>2]=1;f=(n>>>31)+2147483647|0}}else{c[m>>2]=1;f=2147483647}g=Z(b[u>>1]|0,b[q>>1]|0)|0;q=q+2|0;if((g|0)!=1073741824){n=(g<<1)+f|0;if((g^f|0)>0&(n^f|0)<0){c[m>>2]=1;n=(f>>>31)+2147483647|0}}else{c[m>>2]=1;n=2147483647}f=Z(b[v>>1]|0,b[r>>1]|0)|0;r=r+2|0;if((f|0)!=1073741824){g=(f<<1)+n|0;if((f^n|0)>0&(g^n|0)<0){c[m>>2]=1;g=(n>>>31)+2147483647|0}}else{c[m>>2]=1;g=2147483647}b[j+(s<<1)>>1]=Ce(g,m)|0;s=s+1|0}while((s|0)!=40);g=w&65535;if(((ca<<16)+-2621440|0)>-1|$^1){i=da;return g|0}n=aa>>16;f=ca;do{a=(Z(b[h+(f-ca<<1)>>1]|0,n)|0)>>15;if((a|0)>32767){c[m>>2]=1;a=32767}j=h+(f<<1)|0;b[j>>1]=Rd(b[j>>1]|0,a&65535,m)|0;f=f+1|0}while((f&65535)<<16>>16!=40);i=da;return g|0}function Sb(a,d,f,g,h,j,k){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0;L=i;i=i+3440|0;t=L+3424|0;G=L+3408|0;H=L+3240|0;u=L+3224|0;E=L+3328|0;s=L+3248|0;F=L+24|0;K=L+16|0;J=L;gc(f,a,E,2,4,4,k);rd(E,d,s,H,4,G,4,k);fc(f,s,F,k);pd(8,4,4,E,F,G,H,u,k);d=g;a=d+80|0;do{b[d>>1]=0;d=d+2|0}while((d|0)<(a|0));b[J>>1]=-1;b[K>>1]=-1;C=J+2|0;b[C>>1]=-1;D=K+2|0;b[D>>1]=-1;E=J+4|0;b[E>>1]=-1;F=K+4|0;b[F>>1]=-1;H=J+6|0;b[H>>1]=-1;G=K+6|0;b[G>>1]=-1;q=0;do{o=b[u+(q<<1)>>1]|0;d=o>>>2;m=d&65535;a=o&3;n=(b[s+(o<<1)>>1]|0)>0;o=g+(o<<1)|0;r=n&1^1;b[o>>1]=(e[o>>1]|0)+(n?8191:57345);b[t+(q<<1)>>1]=n?32767:-32768;n=J+(a<<1)|0;o=b[n>>1]|0;do{if(o<<16>>16>=0){p=K+(a<<1)|0;l=(o<<16>>16|0)<=(d<<16>>16|0);d=J+((a|4)<<1)|0;if((r&65535|0)==(e[p>>1]&1|0))if(l){b[d>>1]=m;break}else{b[d>>1]=o;b[n>>1]=m;b[p>>1]=r;break}else if(l){b[d>>1]=o;b[n>>1]=m;b[p>>1]=r;break}else{b[d>>1]=m;break}}else{b[n>>1]=m;b[K+(a<<1)>>1]=r}}while(0);q=q+1|0}while((q|0)!=8);v=t+2|0;w=t+4|0;x=t+6|0;y=t+8|0;z=t+10|0;A=t+12|0;B=t+14|0;t=b[t>>1]|0;q=0;p=f+(0-(b[u>>1]|0)<<1)|0;o=f+(0-(b[u+2>>1]|0)<<1)|0;n=f+(0-(b[u+4>>1]|0)<<1)|0;m=f+(0-(b[u+6>>1]|0)<<1)|0;d=f+(0-(b[u+8>>1]|0)<<1)|0;a=f+(0-(b[u+10>>1]|0)<<1)|0;l=f+(0-(b[u+12>>1]|0)<<1)|0;f=f+(0-(b[u+14>>1]|0)<<1)|0;do{r=Z(b[p>>1]|0,t)|0;p=p+2|0;if((r|0)!=1073741824?(I=r<<1,!((r|0)>0&(I|0)<0)):0)r=I;else{c[k>>2]=1;r=2147483647}s=Z(b[v>>1]|0,b[o>>1]|0)|0;o=o+2|0;if((s|0)!=1073741824){g=(s<<1)+r|0;if((s^r|0)>0&(g^r|0)<0){c[k>>2]=1;r=(r>>>31)+2147483647|0}else r=g}else{c[k>>2]=1;r=2147483647}s=Z(b[w>>1]|0,b[n>>1]|0)|0;n=n+2|0;if((s|0)!=1073741824){g=(s<<1)+r|0;if((s^r|0)>0&(g^r|0)<0){c[k>>2]=1;g=(r>>>31)+2147483647|0}}else{c[k>>2]=1;g=2147483647}s=Z(b[x>>1]|0,b[m>>1]|0)|0;m=m+2|0;if((s|0)!=1073741824){r=(s<<1)+g|0;if((s^g|0)>0&(r^g|0)<0){c[k>>2]=1;r=(g>>>31)+2147483647|0}}else{c[k>>2]=1;r=2147483647}s=Z(b[y>>1]|0,b[d>>1]|0)|0;d=d+2|0;if((s|0)!=1073741824){g=(s<<1)+r|0;if((s^r|0)>0&(g^r|0)<0){c[k>>2]=1;g=(r>>>31)+2147483647|0}}else{c[k>>2]=1;g=2147483647}s=Z(b[z>>1]|0,b[a>>1]|0)|0;a=a+2|0;if((s|0)!=1073741824){r=(s<<1)+g|0;if((s^g|0)>0&(r^g|0)<0){c[k>>2]=1;r=(g>>>31)+2147483647|0}}else{c[k>>2]=1;r=2147483647}s=Z(b[A>>1]|0,b[l>>1]|0)|0;l=l+2|0;if((s|0)!=1073741824){g=(s<<1)+r|0;if((s^r|0)>0&(g^r|0)<0){c[k>>2]=1;g=(r>>>31)+2147483647|0}}else{c[k>>2]=1;g=2147483647}s=Z(b[B>>1]|0,b[f>>1]|0)|0;f=f+2|0;if((s|0)!=1073741824){r=(s<<1)+g|0;if((s^g|0)>0&(r^g|0)<0){c[k>>2]=1;r=(g>>>31)+2147483647|0}}else{c[k>>2]=1;r=2147483647}b[h+(q<<1)>>1]=Ce(r,k)|0;q=q+1|0}while((q|0)!=40);b[j>>1]=b[K>>1]|0;b[j+2>>1]=b[D>>1]|0;b[j+4>>1]=b[F>>1]|0;b[j+6>>1]=b[G>>1]|0;a=b[J>>1]|0;d=b[J+8>>1]|0;l=b[C>>1]|0;b[j+8>>1]=d<<1&2|a&1|l<<2&4|(((d>>1)*327680|0)+(a>>>1<<16)+(Z(l>>1,1638400)|0)|0)>>>13&65528;l=b[E>>1]|0;a=b[J+12>>1]|0;d=b[J+10>>1]|0;b[j+10>>1]=a<<1&2|l&1|d<<2&4|(((a>>1)*327680|0)+(l>>>1<<16)+(Z(d>>1,1638400)|0)|0)>>>13&65528;d=b[J+14>>1]|0;l=b[H>>1]|0;a=l<<16>>16>>>1;if(!(d&2)){h=a;k=d<<16>>16;K=k>>1;K=K*327680|0;h=h<<16;K=h+K|0;K=K<<5;K=K>>16;K=K|12;K=K*2622|0;K=K>>>16;h=l&65535;h=h&1;k=k<<17;k=k&131072;K=K<<18;k=K|k;k=k>>>16;h=k|h;h=h&65535;j=j+12|0;b[j>>1]=h;i=L;return}h=4-(a<<16>>16)|0;k=d<<16>>16;K=k>>1;K=K*327680|0;h=h<<16;K=h+K|0;K=K<<5;K=K>>16;K=K|12;K=K*2622|0;K=K>>>16;h=l&65535;h=h&1;k=k<<17;k=k&131072;K=K<<18;k=K|k;k=k>>>16;h=k|h;h=h&65535;j=j+12|0;b[j>>1]=h;i=L;return}function Tb(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;r=e<<16>>16;h=0-r|0;e=g+(h<<2)|0;g=((r-(f<<16>>16)|0)>>>2)+1&65535;if(g<<16>>16<=0)return;r=d<<16>>16>>>1&65535;if(!(r<<16>>16)){while(1){c[e>>2]=0;c[e+4>>2]=0;c[e+8>>2]=0;c[e+12>>2]=0;if(g<<16>>16>1){e=e+16|0;g=g+-1<<16>>16}else break}return}q=a+(h<<1)|0;while(1){l=q+4|0;n=b[l>>1]|0;j=b[q>>1]|0;m=n;k=r;o=a;p=q;q=q+8|0;i=0;h=0;f=0;d=0;while(1){t=b[o>>1]|0;s=(Z(j<<16>>16,t)|0)+i|0;i=b[p+2>>1]|0;h=(Z(i,t)|0)+h|0;j=(Z(m<<16>>16,t)|0)+f|0;f=b[p+6>>1]|0;m=(Z(f,t)|0)+d|0;d=b[o+2>>1]|0;i=s+(Z(d,i)|0)|0;h=h+(Z(n<<16>>16,d)|0)|0;l=l+4|0;f=j+(Z(d,f)|0)|0;j=b[l>>1]|0;d=m+(Z(j<<16>>16,d)|0)|0;k=k+-1<<16>>16;if(!(k<<16>>16))break;t=n;m=j;n=b[p+8>>1]|0;o=o+4|0;p=p+4|0;j=t}c[e>>2]=i<<1;c[e+4>>2]=h<<1;c[e+8>>2]=f<<1;c[e+12>>2]=d<<1;if(g<<16>>16<=1)break;else{e=e+16|0;g=g+-1<<16>>16}}return}function Ub(a,d,f,g,h,j,k,l,m){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;y=i;i=i+16|0;w=y+2|0;x=y;do{if(h<<16>>16>0){s=g<<16>>16;u=0;p=0;g=0;o=0;t=0;while(1){n=b[a+(u<<1)>>1]|0;q=n<<16>>16;p=(Z(q,q)|0)+p|0;q=b[d+(u<<1)>>1]|0;g=(Z(q,q)|0)+g|0;o=(Z(b[f+(u<<1)>>1]|0,q)|0)+o|0;q=Z(q,s)|0;if((q|0)==1073741824){c[m>>2]=1;r=2147483647}else r=q<<1;q=r<<1;q=(Ge(n,Ce((q>>1|0)==(r|0)?q:r>>31^2147483647,m)|0,m)|0)<<16>>16;q=Z(q,q)|0;if((q|0)!=1073741824){n=(q<<1)+t|0;if((q^t|0)>0&(n^t|0)<0){c[m>>2]=1;n=(t>>>31)+2147483647|0}}else{c[m>>2]=1;n=2147483647}u=u+1|0;if((u&65535)<<16>>16==h<<16>>16){t=n;break}else t=n}p=p<<1;g=g<<1;o=o<<1;if((p|0)>=0){if((p|0)<400){n=t;v=14;break}}else{c[m>>2]=1;p=2147483647}r=pe(p)|0;q=r<<16>>16;if(r<<16>>16>0){n=p<<q;if((n>>q|0)!=(p|0))n=p>>31^2147483647}else{n=0-q<<16;if((n|0)<2031616)n=p>>(n>>16);else n=0}b[j>>1]=n>>>16;p=g;s=o;n=t;g=15-(r&65535)&65535}else{g=0;o=0;n=0;v=14}}while(0);if((v|0)==14){b[j>>1]=0;p=g;s=o;g=-15}b[k>>1]=g;if((p|0)<0){c[m>>2]=1;p=2147483647}q=pe(p)|0;o=q<<16>>16;if(q<<16>>16>0){g=p<<o;if((g>>o|0)!=(p|0))g=p>>31^2147483647}else{g=0-o<<16;if((g|0)<2031616)g=p>>(g>>16);else g=0}b[j+2>>1]=g>>>16;b[k+2>>1]=15-(q&65535);p=pe(s)|0;o=p<<16>>16;if(p<<16>>16>0){g=s<<o;if((g>>o|0)!=(s|0))g=s>>31^2147483647}else{g=0-o<<16;if((g|0)<2031616)g=s>>(g>>16);else g=0}b[j+4>>1]=g>>>16;b[k+4>>1]=2-(p&65535);p=pe(n)|0;g=p<<16>>16;if(p<<16>>16>0){o=n<<g;if((o>>g|0)!=(n|0))o=n>>31^2147483647}else{g=0-g<<16;if((g|0)<2031616)o=n>>(g>>16);else o=0}g=o>>>16&65535;n=15-(p&65535)&65535;b[j+6>>1]=g;b[k+6>>1]=n;if((o>>16|0)<=0){m=0;b[l>>1]=m;i=y;return}o=b[j>>1]|0;if(!(o<<16>>16)){m=0;b[l>>1]=m;i=y;return}g=Td(De(o,1,m)|0,g)|0;g=(g&65535)<<16;o=((Ge(n,b[k>>1]|0,m)|0)&65535)+3|0;n=o&65535;o=o<<16>>16;if(n<<16>>16>0)n=n<<16>>16<31?g>>o:0;else{k=0-o<<16>>16;n=g<<k;n=(n>>k|0)==(g|0)?n:g>>31^2147483647}de(n,w,x,m);x=Ic((e[w>>1]|0)+65509&65535,b[x>>1]|0,m)|0;w=x<<13;m=Ce((w>>13|0)==(x|0)?w:x>>31^2147483647,m)|0;b[l>>1]=m;i=y;return}function Vb(a,d,f,g,h,j,k,l,m,n,o){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;y=i;i=i+80|0;v=y;b[k>>1]=b[j>>1]|0;b[l>>1]=b[j+2>>1]|0;r=b[j+4>>1]|0;if(r<<16>>16==-32768)r=32767;else r=0-(r&65535)&65535;b[k+2>>1]=r;b[l+2>>1]=(e[j+6>>1]|0)+1;switch(a|0){case 0:case 5:{u=0;q=0;p=0;t=0;break}default:{u=0;q=1;p=1;t=1}}while(1){s=(b[h+(u<<1)>>1]|0)>>>3;b[v+(u<<1)>>1]=s;s=s<<16>>16;r=Z(s,s)|0;if((r|0)!=1073741824){j=(r<<1)+q|0;if((r^q|0)>0&(j^q|0)<0){c[o>>2]=1;q=(q>>>31)+2147483647|0}else q=j}else{c[o>>2]=1;q=2147483647}r=Z(b[d+(u<<1)>>1]|0,s)|0;if((r|0)!=1073741824){j=(r<<1)+p|0;if((r^p|0)>0&(j^p|0)<0){c[o>>2]=1;p=(p>>>31)+2147483647|0}else p=j}else{c[o>>2]=1;p=2147483647}r=Z(b[g+(u<<1)>>1]|0,s)|0;if((r|0)!=1073741824){j=(r<<1)+t|0;if((r^t|0)>0&(j^t|0)<0){c[o>>2]=1;j=(t>>>31)+2147483647|0}}else{c[o>>2]=1;j=2147483647}u=u+1|0;if((u|0)==40){g=j;s=p;break}else t=j}p=pe(q)|0;j=p<<16>>16;if(p<<16>>16>0){r=q<<j;if((r>>j|0)!=(q|0))r=q>>31^2147483647}else{r=0-j<<16;if((r|0)<2031616)r=q>>(r>>16);else r=0}h=k+4|0;b[h>>1]=r>>>16;d=l+4|0;b[d>>1]=-3-(p&65535);q=pe(s)|0;j=q<<16>>16;if(q<<16>>16>0){r=s<<j;if((r>>j|0)!=(s|0))r=s>>31^2147483647}else{r=0-j<<16;if((r|0)<2031616)r=s>>(r>>16);else r=0}j=r>>>16;b[k+6>>1]=(j|0)==32768?32767:0-j&65535;b[l+6>>1]=7-(q&65535);q=pe(g)|0;j=q<<16>>16;if(q<<16>>16>0){r=g<<j;if((r>>j|0)!=(g|0))r=g>>31^2147483647}else{r=0-j<<16;if((r|0)<2031616)r=g>>(r>>16);else r=0}b[k+8>>1]=r>>>16;b[l+8>>1]=7-(q&65535);switch(a|0){case 0:case 5:{r=0;p=0;break}default:{i=y;return}}do{p=(Z(b[v+(r<<1)>>1]|0,b[f+(r<<1)>>1]|0)|0)+p|0;r=r+1|0}while((r|0)!=40);j=p<<1;r=pe(j)|0;q=r<<16>>16;if(r<<16>>16>0){p=j<<q;if((p>>q|0)==(j|0)){w=p;x=40}else{w=j>>31^2147483647;x=40}}else{p=0-q<<16;if((p|0)<2031616){w=j>>(p>>16);x=40}}if((x|0)==40?(w>>16|0)>=1:0){o=De(w>>>16&65535,1,o)|0;b[m>>1]=Td(o,b[h>>1]|0)|0;b[n>>1]=65528-(r&65535)-(e[d>>1]|0);i=y;return}b[m>>1]=0;b[n>>1]=0;i=y;return}function Wb(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;h=0;g=0;do{i=b[a+(h<<1)>>1]|0;g=(Z(i,i)|0)+g|0;h=h+1|0}while((h|0)!=40);if((g|0)<0){c[f>>2]=1;g=2147483647}f=pe(g)|0;a=f<<16>>16;if(f<<16>>16>0){h=g<<a;if((h>>a|0)==(g|0))g=h;else g=g>>31^2147483647}else{a=0-a<<16;if((a|0)<2031616)g=g>>(a>>16);else g=0}b[e>>1]=g>>>16;b[d>>1]=16-(f&65535);return}function Xb(a,d,e,f,g,h,j,k,l,m,n,o,p){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;var q=0,r=0,s=0,t=0;r=i;i=i+16|0;q=r;if(m>>>0<2){j=Nb(n,a,d,e,f,j,k,q,c[o+76>>2]|0,p)|0;p=c[l>>2]|0;b[p>>1]=j;j=b[q>>1]|0;c[l>>2]=p+4;b[p+2>>1]=j;i=r;return}switch(m|0){case 2:{j=Mb(a,d,e,f,j,k,q,p)|0;p=c[l>>2]|0;b[p>>1]=j;j=b[q>>1]|0;c[l>>2]=p+4;b[p+2>>1]=j;i=r;return}case 3:{j=Qb(a,d,e,f,j,k,q,p)|0;p=c[l>>2]|0;b[p>>1]=j;j=b[q>>1]|0;c[l>>2]=p+4;b[p+2>>1]=j;i=r;return}default:{if((m&-2|0)==4){j=Rb(a,d,e,f,j,k,q,c[o+36>>2]|0,p)|0;p=c[l>>2]|0;b[p>>1]=j;j=b[q>>1]|0;c[l>>2]=p+4;b[p+2>>1]=j;i=r;return}if((m|0)!=6){n=g<<16>>16;n=(n<<17>>17|0)==(n|0)?n<<1:n>>>15^32767;g=e<<16>>16<40;if(!g){Lb(a,h,d,j,k,c[l>>2]|0,c[o+36>>2]|0,p);c[l>>2]=(c[l>>2]|0)+20;i=r;return}q=e<<16>>16;m=n<<16>>16;f=q;do{t=(Z(b[d+(f-q<<1)>>1]|0,m)|0)>>>15&65535;s=d+(f<<1)|0;b[s>>1]=Rd(b[s>>1]|0,t,p)|0;f=f+1|0}while((f&65535)<<16>>16!=40);Lb(a,h,d,j,k,c[l>>2]|0,c[o+36>>2]|0,p);c[l>>2]=(c[l>>2]|0)+20;if(!g){i=r;return}g=e<<16>>16;m=n<<16>>16;q=g;do{f=(Z(b[j+(q-g<<1)>>1]|0,m)|0)>>15;if((f|0)>32767){c[p>>2]=1;f=32767}t=j+(q<<1)|0;b[t>>1]=Rd(b[t>>1]|0,f&65535,p)|0;q=q+1|0}while((q&65535)<<16>>16!=40);i=r;return}o=f<<16>>16;o=(o<<17>>17|0)==(o|0)?o<<1:o>>>15^32767;n=e<<16>>16<40;if(!n){Sb(a,h,d,j,k,c[l>>2]|0,p);c[l>>2]=(c[l>>2]|0)+14;i=r;return}q=e<<16>>16;m=o<<16>>16;f=q;do{g=(Z(b[d+(f-q<<1)>>1]|0,m)|0)>>15;if((g|0)>32767){c[p>>2]=1;g=32767}t=d+(f<<1)|0;b[t>>1]=Rd(b[t>>1]|0,g&65535,p)|0;f=f+1|0}while((f&65535)<<16>>16!=40);Sb(a,h,d,j,k,c[l>>2]|0,p);c[l>>2]=(c[l>>2]|0)+14;if(!n){i=r;return}g=e<<16>>16;m=o<<16>>16;q=g;do{f=(Z(b[j+(q-g<<1)>>1]|0,m)|0)>>15;if((f|0)>32767){c[p>>2]=1;f=32767}t=j+(q<<1)|0;b[t>>1]=Rd(b[t>>1]|0,f&65535,p)|0;q=q+1|0}while((q&65535)<<16>>16!=40);i=r;return}}}function Yb(a){a=a|0;var b=0;if(!a){a=-1;return a|0}c[a>>2]=0;b=Je(4)|0;if(!b){a=-1;return a|0}if(!((Uc(b)|0)<<16>>16)){Vc(c[b>>2]|0)|0;c[a>>2]=b;a=0;return a|0}else{Wc(b);Ke(b);a=-1;return a|0}return 0}function Zb(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Wc(b);Ke(c[a>>2]|0);c[a>>2]=0;return}function _b(a){a=a|0;if(!a){a=-1;return a|0}Vc(c[a>>2]|0)|0;a=0;return a|0}function $b(a,d,f,g,h,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;t=t|0;u=u|0;v=v|0;w=w|0;x=x|0;var y=0,z=0,A=0,B=0;z=i;i=i+16|0;B=z+2|0;A=z;b[q>>1]=Xc(c[a>>2]|0,f,h,k,m,j,40,g,r,A,B,x)|0;a=b[B>>1]|0;g=c[u>>2]|0;c[u>>2]=g+2;b[g>>1]=a;se(k,b[q>>1]|0,b[r>>1]|0,40,b[A>>1]|0,x);ec(k,j,p,40);b[s>>1]=Dc(f,m,p,t,40,x)|0;b[v>>1]=32767;if(n<<16>>16!=0?(y=b[s>>1]|0,y<<16>>16>15565):0)y=Ed(d,y,x)|0;else y=0;if(f>>>0<2){B=b[s>>1]|0;b[s>>1]=B<<16>>16>13926?13926:B;if(y<<16>>16)b[v>>1]=15565}else{if(y<<16>>16){b[v>>1]=15565;b[s>>1]=15565}if((f|0)==7){A=nd(7,b[v>>1]|0,s,0,0,w,x)|0;B=c[u>>2]|0;c[u>>2]=B+2;b[B>>1]=A}}q=b[s>>1]|0;y=0;while(1){A=Z(b[p>>1]|0,q)|0;b[o>>1]=(e[m>>1]|0)-(A>>>14);A=(Z(b[k>>1]|0,q)|0)>>>14;B=l+(y<<1)|0;b[B>>1]=(e[B>>1]|0)-A;y=y+1|0;if((y|0)==40)break;else{k=k+2|0;m=m+2|0;o=o+2|0;p=p+2|0}}i=z;return}function ac(a,b){a=a|0;b=b|0;var d=0,e=0,f=0,g=0;g=i;i=i+16|0;f=g;if(!a){a=-1;i=g;return a|0}c[a>>2]=0;d=Je(2532)|0;c[f>>2]=d;if(!d){a=-1;i=g;return a|0}Yd(d+2392|0);c[d+2188>>2]=0;c[(c[f>>2]|0)+2192>>2]=0;c[(c[f>>2]|0)+2196>>2]=0;c[(c[f>>2]|0)+2200>>2]=0;c[(c[f>>2]|0)+2204>>2]=0;c[(c[f>>2]|0)+2208>>2]=0;c[(c[f>>2]|0)+2212>>2]=0;c[(c[f>>2]|0)+2220>>2]=0;e=c[f>>2]|0;c[e+2216>>2]=b;c[e+2528>>2]=0;d=e;if((((((((Yb(e+2196|0)|0)<<16>>16==0?(ie(e+2192|0)|0)<<16>>16==0:0)?(yc(e+2200|0)|0)<<16>>16==0:0)?(_c(e+2204|0)|0)<<16>>16==0:0)?(Ad(e+2208|0)|0)<<16>>16==0:0)?(Gd(e+2212|0)|0)<<16>>16==0:0)?(jc(e+2220|0,c[e+2432>>2]|0)|0)<<16>>16==0:0)?(Pc(e+2188|0)|0)<<16>>16==0:0){cc(e)|0;c[a>>2]=d;a=0;i=g;return a|0}bc(f);a=-1;i=g;return a|0}function bc(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Qc(b+2188|0);ke((c[a>>2]|0)+2192|0);zc((c[a>>2]|0)+2200|0);Zb((c[a>>2]|0)+2196|0);ad((c[a>>2]|0)+2204|0);Cd((c[a>>2]|0)+2208|0);Id((c[a>>2]|0)+2212|0);lc((c[a>>2]|0)+2220|0);Ke(c[a>>2]|0);c[a>>2]=0;return}function cc(a){a=a|0;var d=0,e=0,f=0,g=0;if(!a){g=-1;return g|0}c[a+652>>2]=a+320;c[a+640>>2]=a+240;c[a+644>>2]=a+160;c[a+648>>2]=a+80;c[a+1264>>2]=a+942;c[a+1912>>2]=a+1590;f=a+1938|0;c[a+2020>>2]=f;c[a+2384>>2]=a+2304;d=a+2028|0;c[a+2024>>2]=a+2108;c[a+2528>>2]=0;Qe(a|0,0,640)|0;Qe(a+1282|0,0,308)|0;Qe(a+656|0,0,286)|0;e=a+2224|0;g=f+80|0;do{b[f>>1]=0;f=f+2|0}while((f|0)<(g|0));f=d;g=f+80|0;do{b[f>>1]=0;f=f+2|0}while((f|0)<(g|0));d=a+1268|0;f=e;g=f+80|0;do{b[f>>1]=0;f=f+2|0}while((f|0)<(g|0));b[d>>1]=40;b[a+1270>>1]=40;b[a+1272>>1]=40;b[a+1274>>1]=40;b[a+1276>>1]=40;Rc(c[a+2188>>2]|0)|0;je(c[a+2192>>2]|0)|0;_b(c[a+2196>>2]|0)|0;Ac(c[a+2200>>2]|0)|0;$c(c[a+2204>>2]|0)|0;Bd(c[a+2208>>2]|0)|0;Hd(c[a+2212>>2]|0)|0;kc(c[a+2220>>2]|0,c[a+2432>>2]|0)|0;b[a+2388>>1]=0;g=0;return g|0}function dc(a,d,e,f,g,h){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,Z=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0;qa=i;i=i+1184|0;T=qa;n=qa+1096|0;o=qa+1008|0;l=qa+904|0;ka=qa+928|0;la=qa+824|0;X=qa+744|0;na=qa+664|0;oa=qa+584|0;Z=qa+328|0;ha=qa+504|0;ia=qa+424|0;ma=qa+344|0;pa=qa+248|0;Y=qa+168|0;da=qa+88|0;fa=qa+68|0;ga=qa+48|0;ea=qa+28|0;ja=qa+24|0;ba=qa+22|0;$=qa+20|0;W=qa+16|0;U=qa+12|0;V=qa+10|0;aa=qa+8|0;_=qa+6|0;ca=qa+4|0;c[T>>2]=f;S=a+2528|0;j=a+652|0;Oe(c[j>>2]|0,e|0,320)|0;c[g>>2]=d;m=a+2216|0;if(!(c[m>>2]|0)){e=a+2220|0;f=0}else{f=Nd(c[a+2212>>2]|0,c[j>>2]|0,S)|0;R=a+2220|0;e=R;f=oc(c[R>>2]|0,f,g,S)|0}R=a+2392|0;Sc(c[a+2188>>2]|0,d,c[a+644>>2]|0,c[a+648>>2]|0,n,R,S);k=a+2192|0;le(c[k>>2]|0,d,c[g>>2]|0,n,o,l,T,S);nc(c[e>>2]|0,l,c[j>>2]|0,S);if((c[g>>2]|0)==8){mc(c[e>>2]|0,f,c[(c[k>>2]|0)+40>>2]|0,(c[a+2200>>2]|0)+32|0,T,S);Qe(a+1282|0,0,308)|0;j=a+2244|0;q=j+20|0;do{b[j>>1]=0;j=j+2|0}while((j|0)<(q|0));j=a+2284|0;q=j+20|0;do{b[j>>1]=0;j=j+2|0}while((j|0)<(q|0));j=c[a+2020>>2]|0;q=j+80|0;do{b[j>>1]=0;j=j+2|0}while((j|0)<(q|0));j=a+2028|0;q=j+80|0;do{b[j>>1]=0;j=j+2|0}while((j|0)<(q|0));je(c[k>>2]|0)|0;j=c[k>>2]|0;e=l;q=j+20|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0));j=(c[k>>2]|0)+20|0;e=l;q=j+20|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0));_b(c[a+2196>>2]|0)|0;b[a+2388>>1]=0;Q=0}else Q=Dd(c[a+2208>>2]|0,c[k>>2]|0,S)|0;N=a+640|0;k=a+2264|0;j=a+1264|0;e=a+2204|0;f=a+2212|0;O=a+1268|0;P=a+1278|0;cd(d,2842,2862,2882,n,0,c[N>>2]|0,k,c[j>>2]|0,S);if(d>>>0>1){Tc(c[e>>2]|0,c[f>>2]|0,d,c[j>>2]|0,W,O,P,0,c[m>>2]|0,S);cd(d,2842,2862,2882,n,80,c[N>>2]|0,k,c[j>>2]|0,S);Tc(c[e>>2]|0,c[f>>2]|0,d,(c[j>>2]|0)+160|0,W+2|0,O,P,1,c[m>>2]|0,S)}else{cd(d,2842,2862,2882,n,80,c[N>>2]|0,k,c[j>>2]|0,S);Tc(c[e>>2]|0,c[f>>2]|0,d,c[j>>2]|0,W,O,P,1,c[m>>2]|0,S);b[W+2>>1]=b[W>>1]|0}if(c[m>>2]|0)Md(c[f>>2]|0,W,S);if((c[g>>2]|0)==8){oa=a+656|0;pa=a+976|0;Oe(oa|0,pa|0,286)|0;pa=a+320|0;Oe(a|0,pa|0,320)|0;i=qa;return 0}z=a+2224|0;A=a+2244|0;B=a+2284|0;C=a+2388|0;D=a+2020|0;E=a+1916|0;F=a+1912|0;G=a+2024|0;H=a+2384|0;I=a+2196|0;J=a+2208|0;K=a+2464|0;L=a+2200|0;M=a+2224|0;w=a+2244|0;x=a+1270|0;y=a+1280|0;v=0;m=0;l=0;s=0;t=0;k=0;u=-1;while(1){p=u;u=u+1<<16>>16;s=1-(s<<16>>16)|0;f=s&65535;r=(s&65535|0)!=0;e=c[g>>2]|0;j=(e|0)==0;do{if(r)if(j){j=fa;e=z;q=j+20|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0));j=ga;e=A;q=j+20|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0));j=ea;e=B;q=j+20|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0));b[ja>>1]=b[C>>1]|0;d=(c[N>>2]|0)+(v<<1)|0;j=20;break}else{d=(c[N>>2]|0)+(v<<1)|0;j=19;break}else{d=(c[N>>2]|0)+(v<<1)|0;if(j)j=20;else j=19}}while(0);if((j|0)==19)yd(e,2842,2862,2882,n,o,d,B,w,c[D>>2]|0,E,(c[F>>2]|0)+(v<<1)|0,c[G>>2]|0,ka,ha,c[H>>2]|0);else if((j|0)==20?(0,yd(0,2842,2862,2882,n,o,d,B,ga,c[D>>2]|0,E,(c[F>>2]|0)+(v<<1)|0,c[G>>2]|0,ka,ha,c[H>>2]|0),r):0){j=da;e=c[G>>2]|0;q=j+80|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0))}j=ia;e=ha;q=j+80|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0));$b(c[I>>2]|0,c[J>>2]|0,c[g>>2]|0,t,W,c[G>>2]|0,(c[F>>2]|0)+(v<<1)|0,ia,ka,Q,la,na,U,V,aa,Z,T,ca,c[K>>2]|0,S);switch(p<<16>>16){case-1:{if((b[P>>1]|0)>0)b[x>>1]=b[U>>1]|0;break}case 2:{if((b[y>>1]|0)>0)b[O>>1]=b[U>>1]|0;break}default:{}}Xb(la,c[G>>2]|0,b[U>>1]|0,b[C>>1]|0,b[aa>>1]|0,ia,X,oa,T,c[g>>2]|0,u,R,S);Bc(c[L>>2]|0,c[g>>2]|0,ha,(c[F>>2]|0)+(v<<1)|0,X,ka,la,na,oa,Z,f,b[ca>>1]|0,ba,$,aa,_,T,R,S);Fd(c[J>>2]|0,b[aa>>1]|0,S);d=c[g>>2]|0;do{if(!d)if(r){j=ma;e=ka;q=j+80|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0));j=pa;e=oa;q=j+80|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0));j=Y;e=X;q=j+80|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0));l=b[U>>1]|0;m=b[V>>1]|0;zd(c[N>>2]|0,0,t,b[aa>>1]|0,b[_>>1]|0,o,h,ka,X,na,oa,fa,B,ga,c[F>>2]|0,C,S);b[C>>1]=b[ja>>1]|0;k=t;break}else{j=B;e=ea;q=j+20|0;do{b[j>>1]=b[e>>1]|0;j=j+2|0;e=e+2|0}while((j|0)<(q|0));r=k<<16>>16;se((c[F>>2]|0)+(r<<1)|0,l,m,40,1,S);ec((c[F>>2]|0)+(r<<1)|0,da,na,40);zd(c[N>>2]|0,c[g>>2]|0,k,b[ba>>1]|0,b[$>>1]|0,o+-22|0,h,ma,Y,na,pa,M,B,w,c[F>>2]|0,ja,S);yd(c[g>>2]|0,2842,2862,2882,n,o,(c[N>>2]|0)+(v<<1)|0,B,w,c[D>>2]|0,E,(c[F>>2]|0)+(v<<1)|0,c[G>>2]|0,ka,ha,c[H>>2]|0);se((c[F>>2]|0)+(v<<1)|0,b[U>>1]|0,b[V>>1]|0,40,1,S);ec((c[F>>2]|0)+(v<<1)|0,c[G>>2]|0,na,40);zd(c[N>>2]|0,c[g>>2]|0,t,b[aa>>1]|0,b[_>>1]|0,o,h,ka,X,na,oa,M,B,w,c[F>>2]|0,C,S);break}else zd(c[N>>2]|0,d,t,b[aa>>1]|0,b[_>>1]|0,o,h,ka,X,na,oa,M,B,w,c[F>>2]|0,C,S)}while(0);d=v+40|0;t=d&65535;if(t<<16>>16>=160)break;else{v=d<<16>>16;n=n+22|0;o=o+22|0}}Oe(a+1282|0,a+1602|0,308)|0;oa=a+656|0;pa=a+976|0;Oe(oa|0,pa|0,286)|0;pa=a+320|0;Oe(a|0,pa|0,320)|0;i=qa;return 0}function ec(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0;o=e<<16>>16;if(e<<16>>16>1)n=1;else return;while(1){f=b[a>>1]|0;i=c+(n+-1<<1)|0;e=Z(b[c+(n<<1)>>1]|0,f)|0;k=b[i>>1]|0;f=Z(k<<16>>16,f)|0;h=(n+131071|0)>>>1;j=h&65535;g=b[a+2>>1]|0;if(!(j<<16>>16)){c=i;h=k}else{l=(h<<1)+131070&131070;m=n-l|0;h=a;do{q=(Z(k<<16>>16,g)|0)+e|0;p=h;h=h+4|0;e=b[i+-2>>1]|0;g=(Z(e,g)|0)+f|0;f=b[h>>1]|0;i=i+-4|0;e=q+(Z(f,e)|0)|0;k=b[i>>1]|0;f=g+(Z(k<<16>>16,f)|0)|0;j=j+-1<<16>>16;g=b[p+6>>1]|0}while(j<<16>>16!=0);h=c+(m+-3<<1)|0;a=a+(l+2<<1)|0;c=h;h=b[h>>1]|0}e=(Z(h<<16>>16,g)|0)+e|0;b[d>>1]=f>>>12;b[d+2>>1]=e>>>12;e=(n<<16)+131072>>16;if((e|0)<(o|0)){d=d+4|0;a=a+(1-n<<1)|0;n=e}else break}return}function fc(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;z=i;i=i+80|0;y=z;h=20;g=a;f=1;while(1){x=b[g>>1]|0;x=(Z(x,x)|0)+f|0;f=b[g+2>>1]|0;f=x+(Z(f,f)|0)|0;h=h+-1<<16>>16;if(!(h<<16>>16))break;else g=g+4|0}f=f<<1;if((f|0)<0){g=20;f=a;e=y;while(1){b[e>>1]=(b[f>>1]|0)>>>1;b[e+2>>1]=(b[f+2>>1]|0)>>>1;g=g+-1<<16>>16;if(!(g<<16>>16)){x=y;break}else{f=f+4|0;e=e+4|0}}}else{f=ce(f>>1,e)|0;if((f|0)<16777215)f=((f>>9)*32440|0)>>>15<<16>>16;else f=32440;h=20;g=a;e=y;while(1){b[e>>1]=((Z(b[g>>1]|0,f)|0)+32|0)>>>6;b[e+2>>1]=((Z(b[g+2>>1]|0,f)|0)+32|0)>>>6;h=h+-1<<16>>16;if(!(h<<16>>16)){x=y;break}else{g=g+4|0;e=e+4|0}}}h=20;g=x;e=d+3198|0;f=0;while(1){w=b[g>>1]|0;w=(Z(w,w)|0)+f|0;b[e>>1]=(w+16384|0)>>>15;v=b[g+2>>1]|0;f=(Z(v,v)|0)+w|0;b[e+-82>>1]=(f+16384|0)>>>15;h=h+-1<<16>>16;if(!(h<<16>>16))break;else{g=g+4|0;e=e+-164|0}}w=c+78|0;v=1;while(1){f=39-v|0;a=d+3120+(f<<1)|0;e=d+(f*80|0)+78|0;f=c+(f<<1)|0;k=y+(v<<1)|0;g=65575-v|0;j=g&65535;h=b[x>>1]|0;if(!(j<<16>>16)){j=w;g=0}else{r=g+65535&65535;t=r*41|0;u=(Z(v,-40)|0)-t|0;s=0-v|0;t=s-t|0;s=s-r|0;q=v+r|0;p=b[k>>1]|0;n=x;o=w;l=d+((38-v|0)*80|0)+78|0;g=0;m=0;while(1){k=k+2|0;g=(Z(p<<16>>16,h)|0)+g|0;n=n+2|0;p=b[k>>1]|0;m=(Z(p<<16>>16,h)|0)+m|0;B=f;f=f+-2|0;h=b[f>>1]|0;A=b[o>>1]<<1;B=(Z((Z(A,b[B>>1]|0)|0)>>16,(g<<1)+32768>>16)|0)>>>15&65535;b[e>>1]=B;b[a>>1]=B;h=(Z((Z(A,h)|0)>>16,(m<<1)+32768>>16)|0)>>>15&65535;b[a+-2>>1]=h;b[l>>1]=h;j=j+-1<<16>>16;h=b[n>>1]|0;if(!(j<<16>>16))break;else{o=o+-2|0;a=a+-82|0;e=e+-82|0;l=l+-82|0}}k=y+(q+1<<1)|0;j=c+(38-r<<1)|0;f=c+(s+38<<1)|0;a=d+3040+(t+38<<1)|0;e=d+3040+(u+38<<1)|0}B=(Z(b[k>>1]|0,h)|0)+g|0;B=(Z((B<<1)+32768>>16,(Z(b[j>>1]<<1,b[f>>1]|0)|0)>>16)|0)>>>15&65535;b[a>>1]=B;b[e>>1]=B;e=(v<<16)+131072|0;if((e|0)<2621440)v=e>>16;else break}i=z;return}function gc(a,d,e,f,g,h,j){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;r=i;i=i+160|0;q=r;if(g<<16>>16>0){o=h&65535;p=0;k=5;do{if((p|0)<40){n=p;m=p&65535;h=0;while(1){if(m<<16>>16<40){m=m<<16>>16;l=0;do{l=(Z(b[a+(m-n<<1)>>1]|0,b[d+(m<<1)>>1]|0)|0)+l|0;m=m+1|0}while((m&65535)<<16>>16!=40)}else l=0;l=l<<1;c[q+(n<<2)>>2]=l;l=Gc(l)|0;h=(l|0)>(h|0)?l:h;l=n+o|0;m=l&65535;if(m<<16>>16>=40)break;else n=l<<16>>16}}else h=0;k=(h>>1)+k|0;p=p+1|0}while((p&65535)<<16>>16!=g<<16>>16)}else k=5;f=((pe(k)|0)&65535)-(f&65535)|0;h=f<<16>>16;l=0-h<<16;k=(l|0)<2031616;l=l>>16;if((f&65535)<<16>>16>0)if(k){k=0;do{f=c[q+(k<<2)>>2]|0;d=f<<h;b[e+(k<<1)>>1]=Ce((d>>h|0)==(f|0)?d:f>>31^2147483647,j)|0;k=k+1|0}while((k|0)!=40);i=r;return}else{k=0;do{f=c[q+(k<<2)>>2]|0;d=f<<h;b[e+(k<<1)>>1]=Ce((d>>h|0)==(f|0)?d:f>>31^2147483647,j)|0;k=k+1|0}while((k|0)!=40);i=r;return}else if(k){k=0;do{b[e+(k<<1)>>1]=Ce(c[q+(k<<2)>>2]>>l,j)|0;k=k+1|0}while((k|0)!=40);i=r;return}else{k=0;do{b[e+(k<<1)>>1]=Ce(0,j)|0;k=k+1|0}while((k|0)!=40);i=r;return}}function hc(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0;z=i;i=i+160|0;y=z;v=a+2|0;w=b[a>>1]|0;x=0;g=5;do{u=x;k=0;while(1){n=d+(u<<1)|0;t=40-u|0;h=(t+131071|0)>>>1&65535;l=d+(u+1<<1)|0;j=Z(b[n>>1]<<1,w)|0;if(!(h<<16>>16))h=v;else{s=131111-u+131070&131070;r=u+s|0;q=v;p=a;o=n;while(1){m=o+4|0;n=p+4|0;j=(Z(b[l>>1]<<1,b[q>>1]|0)|0)+j|0;h=h+-1<<16>>16;j=(Z(b[m>>1]<<1,b[n>>1]|0)|0)+j|0;if(!(h<<16>>16))break;else{l=o+6|0;q=p+6|0;p=n;o=m}}l=d+(r+3<<1)|0;h=a+(s+3<<1)|0}if(!(t&1))j=(Z(b[l>>1]<<1,b[h>>1]|0)|0)+j|0;c[y+(u<<2)>>2]=j;j=(j|0)<0?0-j|0:j;k=(j|0)>(k|0)?j:k;j=u+5|0;if((j&65535)<<16>>16<40)u=j<<16>>16;else break}g=(k>>1)+g|0;x=x+1|0}while((x|0)!=5);f=((pe(g)|0)&65535)-(f&65535)|0;j=f<<16>>16;g=0-j<<16;k=g>>16;if((f&65535)<<16>>16>0){h=20;g=y;while(1){y=c[g>>2]|0;f=y<<j;b[e>>1]=(((f>>j|0)==(y|0)?f:y>>31^2147483647)+32768|0)>>>16;y=c[g+4>>2]|0;f=y<<j;b[e+2>>1]=(((f>>j|0)==(y|0)?f:y>>31^2147483647)+32768|0)>>>16;h=h+-1<<16>>16;if(!(h<<16>>16))break;else{e=e+4|0;g=g+8|0}}i=z;return}if((g|0)<2031616){h=20;g=y;while(1){b[e>>1]=((c[g>>2]>>k)+32768|0)>>>16;b[e+2>>1]=((c[g+4>>2]>>k)+32768|0)>>>16;h=h+-1<<16>>16;if(!(h<<16>>16))break;else{e=e+4|0;g=g+8|0}}i=z;return}else{b[e>>1]=0;y=e+4|0;b[e+2>>1]=0;b[y>>1]=0;f=y+4|0;b[y+2>>1]=0;b[f>>1]=0;y=f+4|0;b[f+2>>1]=0;b[y>>1]=0;f=y+4|0;b[y+2>>1]=0;b[f>>1]=0;y=f+4|0;b[f+2>>1]=0;b[y>>1]=0;f=y+4|0;b[y+2>>1]=0;b[f>>1]=0;y=f+4|0;b[f+2>>1]=0;b[y>>1]=0;f=y+4|0;b[y+2>>1]=0;b[f>>1]=0;y=f+4|0;b[f+2>>1]=0;b[y>>1]=0;f=y+4|0;b[y+2>>1]=0;b[f>>1]=0;y=f+4|0;b[f+2>>1]=0;b[y>>1]=0;f=y+4|0;b[y+2>>1]=0;b[f>>1]=0;y=f+4|0;b[f+2>>1]=0;b[y>>1]=0;f=y+4|0;b[y+2>>1]=0;b[f>>1]=0;y=f+4|0;b[f+2>>1]=0;b[y>>1]=0;f=y+4|0;b[y+2>>1]=0;b[f>>1]=0;y=f+4|0;b[f+2>>1]=0;b[y>>1]=0;f=y+4|0;b[y+2>>1]=0;b[f>>1]=0;y=f+4|0;b[f+2>>1]=0;b[y>>1]=0;b[y+2>>1]=0;i=z;return}}function ic(a,b,d,e){a=a|0;b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0;h=(Td(16383,b)|0)<<16>>16;b=Z(h,b<<16>>16)|0;if((b|0)==1073741824){c[e>>2]=1;f=2147483647}else f=b<<1;g=(Z(h,d<<16>>16)|0)>>15;b=f+(g<<1)|0;if((f^g|0)>0&(b^f|0)<0){c[e>>2]=1;b=(f>>>31)+2147483647|0}f=2147483647-b|0;d=f>>16;b=Z(d,h)|0;if((b|0)==1073741824){c[e>>2]=1;g=2147483647}else g=b<<1;h=(Z((f>>>1)-(d<<15)<<16>>16,h)|0)>>15;b=g+(h<<1)|0;if((g^h|0)>0&(b^g|0)<0){c[e>>2]=1;b=(g>>>31)+2147483647|0}g=b>>16;h=a>>16;d=Z(g,h)|0;d=(d|0)==1073741824?2147483647:d<<1;f=(Z((b>>>1)-(g<<15)<<16>>16,h)|0)>>15;e=(f<<1)+d|0;e=(f^d|0)>0&(e^d|0)<0?(d>>>31)+2147483647|0:e;h=(Z(g,(a>>>1)-(h<<15)<<16>>16)|0)>>15;a=e+(h<<1)|0;a=(e^h|0)>0&(a^e|0)<0?(e>>>31)+2147483647|0:a;e=a<<2;return((e>>2|0)==(a|0)?e:a>>31^2147483647)|0}function jc(a,d){a=a|0;d=d|0;var e=0,f=0,g=0,h=0;if(!a){h=-1;return h|0}c[a>>2]=0;e=Je(192)|0;if(!e){h=-1;return h|0}f=e+176|0;b[f>>1]=0;b[f+2>>1]=0;b[f+4>>1]=0;b[f+6>>1]=0;b[f+8>>1]=0;b[f+10>>1]=0;f=e;g=d;h=f+20|0;do{b[f>>1]=b[g>>1]|0;f=f+2|0;g=g+2|0}while((f|0)<(h|0));f=e+20|0;g=d;h=f+20|0;do{b[f>>1]=b[g>>1]|0;f=f+2|0;g=g+2|0}while((f|0)<(h|0));f=e+40|0;g=d;h=f+20|0;do{b[f>>1]=b[g>>1]|0;f=f+2|0;g=g+2|0}while((f|0)<(h|0));f=e+60|0;g=d;h=f+20|0;do{b[f>>1]=b[g>>1]|0;f=f+2|0;g=g+2|0}while((f|0)<(h|0));f=e+80|0;g=d;h=f+20|0;do{b[f>>1]=b[g>>1]|0;f=f+2|0;g=g+2|0}while((f|0)<(h|0));f=e+100|0;g=d;h=f+20|0;do{b[f>>1]=b[g>>1]|0;f=f+2|0;g=g+2|0}while((f|0)<(h|0));f=e+120|0;g=d;h=f+20|0;do{b[f>>1]=b[g>>1]|0;f=f+2|0;g=g+2|0}while((f|0)<(h|0));f=e+140|0;g=d;h=f+20|0;do{b[f>>1]=b[g>>1]|0;f=f+2|0;g=g+2|0}while((f|0)<(h|0));f=e+160|0;h=f+20|0;do{b[f>>1]=0;f=f+2|0}while((f|0)<(h|0));b[e+188>>1]=7;b[e+190>>1]=32767;c[a>>2]=e;h=0;return h|0}function kc(a,c){a=a|0;c=c|0;var d=0,e=0,f=0;if(!a){f=-1;return f|0}d=a+176|0;b[d>>1]=0;b[d+2>>1]=0;b[d+4>>1]=0;b[d+6>>1]=0;b[d+8>>1]=0;b[d+10>>1]=0;d=a;e=c;f=d+20|0;do{b[d>>1]=b[e>>1]|0;d=d+2|0;e=e+2|0}while((d|0)<(f|0));d=a+20|0;e=c;f=d+20|0;do{b[d>>1]=b[e>>1]|0;d=d+2|0;e=e+2|0}while((d|0)<(f|0));d=a+40|0;e=c;f=d+20|0;do{b[d>>1]=b[e>>1]|0;d=d+2|0;e=e+2|0}while((d|0)<(f|0));d=a+60|0;e=c;f=d+20|0;do{b[d>>1]=b[e>>1]|0;d=d+2|0;e=e+2|0}while((d|0)<(f|0));d=a+80|0;e=c;f=d+20|0;do{b[d>>1]=b[e>>1]|0;d=d+2|0;e=e+2|0}while((d|0)<(f|0));d=a+100|0;e=c;f=d+20|0;do{b[d>>1]=b[e>>1]|0;d=d+2|0;e=e+2|0}while((d|0)<(f|0));d=a+120|0;e=c;f=d+20|0;do{b[d>>1]=b[e>>1]|0;d=d+2|0;e=e+2|0}while((d|0)<(f|0));d=a+140|0;e=c;f=d+20|0;do{b[d>>1]=b[e>>1]|0;d=d+2|0;e=e+2|0}while((d|0)<(f|0));d=a+160|0;f=d+20|0;do{b[d>>1]=0;d=d+2|0}while((d|0)<(f|0));b[a+188>>1]=7;b[a+190>>1]=32767;f=1;return f|0}function lc(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function mc(a,d,e,f,g,h){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;C=i;i=i+112|0;z=C+80|0;A=C+60|0;B=C+40|0;y=C;if(d<<16>>16==0?(j=a+178|0,(b[j>>1]|0)!=0):0){B=a+180|0;h=a+182|0;e=j;B=b[B>>1]|0;f=c[g>>2]|0;A=f+2|0;b[f>>1]=B;h=b[h>>1]|0;B=f+4|0;b[A>>1]=h;A=a+184|0;A=b[A>>1]|0;h=f+6|0;b[B>>1]=A;B=a+186|0;B=b[B>>1]|0;a=f+8|0;b[h>>1]=B;e=b[e>>1]|0;f=f+10|0;c[g>>2]=f;b[a>>1]=e;i=C;return}s=y+36|0;t=y+32|0;u=y+28|0;v=y+24|0;w=y+20|0;x=y+16|0;p=y+12|0;q=y+8|0;r=y+4|0;d=y;j=d+40|0;do{c[d>>2]=0;d=d+4|0}while((d|0)<(j|0));o=7;d=0;while(1){n=b[a+160+(o<<1)>>1]|0;j=n<<16>>16;if(n<<16>>16<0)j=~((j^-4)>>2);else j=j>>>2;d=Rd(d,j&65535,h)|0;l=o*10|0;n=9;while(1){m=y+(n<<2)|0;k=c[m>>2]|0;D=b[a+(n+l<<1)>>1]|0;j=D+k|0;if((D^k|0)>-1&(j^k|0)<0){c[h>>2]=1;j=(k>>>31)+2147483647|0}c[m>>2]=j;if((n|0)>0)n=n+-1|0;else break}if((o|0)>0)o=o+-1|0;else break}j=d<<16>>16;if(d<<16>>16<0)j=~((j^-2)>>1);else j=j>>>1;b[A+18>>1]=(c[s>>2]|0)>>>3;b[A+16>>1]=(c[t>>2]|0)>>>3;b[A+14>>1]=(c[u>>2]|0)>>>3;b[A+12>>1]=(c[v>>2]|0)>>>3;b[A+10>>1]=(c[w>>2]|0)>>>3;b[A+8>>1]=(c[x>>2]|0)>>>3;b[A+6>>1]=(c[p>>2]|0)>>>3;b[A+4>>1]=(c[q>>2]|0)>>>3;b[A+2>>1]=(c[r>>2]|0)>>>3;b[A>>1]=(c[y>>2]|0)>>>3;d=a+178|0;j=(((j<<16)+167772160|0)>>>16)+128|0;b[d>>1]=j;j=j<<16;if((j|0)<0)j=~((j>>16^-256)>>8);else j=j>>24;b[d>>1]=j;if((j|0)<=63){if((j|0)<0){b[d>>1]=0;j=0}}else{b[d>>1]=63;j=63}D=Ge(j<<8&65535,11560,h)|0;D=D<<16>>16>0?0:D<<16>>16<-14436?-14436:D;b[f>>1]=D;b[f+2>>1]=D;b[f+4>>1]=D;b[f+6>>1]=D;D=((D<<16>>16)*5443|0)>>>15&65535;b[f+8>>1]=D;b[f+10>>1]=D;b[f+12>>1]=D;b[f+14>>1]=D;ne(A,z,10,h);Ae(z,205,10,h);me(z,A,10,h);f=a+182|0;D=a+180|0;te(e,8,A,B,f,D,h);h=f;f=d;D=b[D>>1]|0;e=c[g>>2]|0;B=e+2|0;b[e>>1]=D;h=b[h>>1]|0;D=e+4|0;b[B>>1]=h;B=a+184|0;B=b[B>>1]|0;h=e+6|0;b[D>>1]=B;a=a+186|0;a=b[a>>1]|0;D=e+8|0;b[h>>1]=a;a=b[f>>1]|0;e=e+10|0;c[g>>2]=e;b[D>>1]=a;i=C;return}function nc(a,d,f,g){a=a|0;d=d|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0;n=i;i=i+16|0;k=n+2|0;m=n;l=a+176|0;j=(e[l>>1]|0)+1|0;j=(j&65535|0)==8?0:j&65535;b[l>>1]=j;j=a+((j<<16>>16)*10<<1)|0;h=j+20|0;do{b[j>>1]=b[d>>1]|0;j=j+2|0;d=d+2|0}while((j|0)<(h|0));d=0;h=160;while(1){j=b[f>>1]|0;d=(Z(j<<1,j)|0)+d|0;if((d|0)<0){d=2147483647;break}h=h+-1<<16>>16;if(!(h<<16>>16))break;else f=f+2|0}de(d,k,m,g);d=b[k>>1]|0;k=d<<16>>16;f=k<<10;if((f|0)!=(k<<26>>16|0)){c[g>>2]=1;f=d<<16>>16>0?32767:-32768}b[a+160+(b[l>>1]<<1)>>1]=(((b[m>>1]|0)>>>5)+f<<16)+-558432256>>17;i=n;return}function oc(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;h=a+190|0;i=Rd(b[h>>1]|0,1,f)|0;b[h>>1]=i;g=a+188|0;do{if(!(d<<16>>16)){a=b[g>>1]|0;if(!(a<<16>>16)){b[h>>1]=0;c[e>>2]=8;a=1;break}h=(a&65535)+65535&65535;b[g>>1]=h;if((Rd(i,h,f)|0)<<16>>16<30){c[e>>2]=8;a=0}else a=0}else{b[g>>1]=7;a=0}}while(0);return a|0}function pc(a,b,c,d,e,f,g,h){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;if(!(f<<16>>16)){f=a<<16>>16;if(((f<<16)+-5570560|0)<65536){b=(f*3|0)+-58+(b<<16>>16)|0;b=b&65535;return b|0}else{b=f+112|0;b=b&65535;return b|0}}if(!(g<<16>>16)){h=(a&65535)-(d&65535)<<16;b=(b<<16>>16)+2+(h>>15)+(h>>16)|0;b=b&65535;return b|0}d=d<<16>>16;d=(((c&65535)-d<<16)+-327680|0)>0?d+5&65535:c;e=e<<16>>16;c=a<<16>>16;d=(((e-(d&65535)<<16)+-262144|0)>0?e+65532&65535:d)<<16>>16;e=d*196608|0;a=e+-393216>>16;f=((b&65535)<<16)+(c*196608|0)>>16;if(!(a-f&32768)){b=c+5-d|0;b=b&65535;return b|0}if((e+196608>>16|0)>(f|0)){b=f+3-a|0;b=b&65535;return b|0}else{b=c+11-d|0;b=b&65535;return b|0}return 0}function qc(a,b,c,d,e){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;e=a<<16>>16;do{if(!(d<<16>>16))if(a<<16>>16<95){e=((e*393216|0)+-6881280>>16)+(b<<16>>16)|0;break}else{e=e+368|0;break}else e=((((e-(c&65535)|0)*393216|0)+196608|0)>>>16)+(b&65535)|0}while(0);return e&65535|0}function rc(d,f,g,h){d=d|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0;i=c[h+96>>2]|0;if(d>>>0<8){m=(c[h+100>>2]|0)+(d<<2)|0;l=c[m>>2]|0;a[g>>0]=b[f+(b[l>>1]<<1)>>1]<<4|d|b[f+(b[l+2>>1]<<1)>>1]<<5|b[f+(b[l+4>>1]<<1)>>1]<<6|b[f+(b[l+6>>1]<<1)>>1]<<7;l=i+(d<<1)|0;h=b[l>>1]|0;if((h+-7|0)>4){i=4;k=4;d=1;while(1){n=b[f+(b[(c[m>>2]|0)+(i<<1)>>1]<<1)>>1]|0;h=g+(d<<16>>16)|0;a[h>>0]=n;n=e[f+(b[(c[m>>2]|0)+((k|1)<<16>>16<<1)>>1]<<1)>>1]<<1|n&65535;a[h>>0]=n;n=e[f+(b[(c[m>>2]|0)+((k|2)<<16>>16<<1)>>1]<<1)>>1]<<2|n;a[h>>0]=n;n=e[f+(b[(c[m>>2]|0)+((k|3)<<16>>16<<1)>>1]<<1)>>1]<<3|n;a[h>>0]=n;n=e[f+(b[(c[m>>2]|0)+(k+4<<16>>16<<16>>16<<1)>>1]<<1)>>1]<<4|n;a[h>>0]=n;n=e[f+(b[(c[m>>2]|0)+(k+5<<16>>16<<16>>16<<1)>>1]<<1)>>1]<<5|n;a[h>>0]=n;n=e[f+(b[(c[m>>2]|0)+(k+6<<16>>16<<16>>16<<1)>>1]<<1)>>1]<<6|n;a[h>>0]=n;j=k+8<<16>>16;d=d+1<<16>>16;a[h>>0]=e[f+(b[(c[m>>2]|0)+(k+7<<16>>16<<16>>16<<1)>>1]<<1)>>1]<<7|n;i=j<<16>>16;h=b[l>>1]|0;if((i|0)>=(h+-7|0))break;else k=j}}else{j=4;d=1}l=h+4&7;if(!l)return;i=g+(d<<16>>16)|0;a[i>>0]=0;h=0;k=0;d=0;while(1){k=(e[f+(b[(c[m>>2]|0)+(j<<16>>16<<1)>>1]<<1)>>1]&255)<<h|k&255;a[i>>0]=k;d=d+1<<16>>16;h=d<<16>>16;if((h|0)>=(l|0))break;else j=j+1<<16>>16}return}if((d|0)==15){a[g>>0]=15;return}a[g>>0]=b[f>>1]<<4|d|b[f+2>>1]<<5|b[f+4>>1]<<6|b[f+6>>1]<<7;h=i+(d<<1)|0;d=b[h>>1]|0;i=((d&65535)<<16)+262144>>16;m=i&-8;k=(m+524281|0)>>>3&65535;if(k<<16>>16>0){i=((i&-8)+524281|0)>>>3;l=((i<<3)+524280&524280)+12|0;j=1;d=f+8|0;while(1){a[g+(j<<16>>16)>>0]=e[d+2>>1]<<1|e[d>>1]|e[d+4>>1]<<2|e[d+6>>1]<<3|e[d+8>>1]<<4|e[d+10>>1]<<5|e[d+12>>1]<<6|e[d+14>>1]<<7;if(k<<16>>16>1){k=k+-1<<16>>16;j=j+1<<16>>16;d=d+16|0}else break}d=b[h>>1]|0;j=(i<<16)+65536>>16}else{l=4;j=1}d=(0-m|4)+(d&65535)<<16;k=d>>16;if(!k)return;j=g+j|0;a[j>>0]=0;if((d|0)>0){d=0;i=0;h=0}else return;do{i=i&255|b[f+(l+d<<1)>>1]<<d;a[j>>0]=i;h=h+1<<16>>16;d=h<<16>>16}while((d|0)<(k|0));return}function sc(d,f,g,h){d=d|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;o=c[h+100>>2]|0;n=c[h+96>>2]|0;a[g>>0]=d&15;n=n+(d<<1)|0;i=b[n>>1]|0;if(d>>>0>=8){l=((i&65535)<<16)+-458752|0;if((l|0)>0){m=1;k=f;while(1){f=k+16|0;h=m+1<<16>>16;a[g+(m<<16>>16)>>0]=e[k+14>>1]|e[k+12>>1]<<1|((e[k+2>>1]<<6|e[k>>1]<<7|e[k+4>>1]<<5|e[k+6>>1]<<4)&240|e[k+8>>1]<<3|e[k+10>>1]<<2)&252;l=l+-524288&-65536;if((l|0)<=0)break;else{m=h;k=f}}i=b[n>>1]|0}else h=1;m=i&7;i=g+(h<<16>>16)|0;a[i>>0]=0;if(!m)return;else{j=0;k=0;l=0;h=f}while(1){k=k&255|b[h>>1]<<7-j;a[i>>0]=k;l=l+1<<16>>16;j=l<<16>>16;if((j|0)>=(m|0))break;else h=h+2|0}return}k=i<<16>>16;if(i<<16>>16>7){i=o+(d<<2)|0;h=0;m=0;j=1;while(1){p=e[f+(b[(c[i>>2]|0)+(h<<1)>>1]<<1)>>1]<<7;k=g+(j<<16>>16)|0;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|1)<<16>>16<<1)>>1]<<1)>>1]<<6|p;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|2)<<16>>16<<1)>>1]<<1)>>1]<<5|p;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|3)<<16>>16<<1)>>1]<<1)>>1]<<4|p;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|4)<<16>>16<<1)>>1]<<1)>>1]<<3|p&240;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|5)<<16>>16<<1)>>1]<<1)>>1]<<2|p;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|6)<<16>>16<<1)>>1]<<1)>>1]<<1|p;a[k>>0]=p;l=m+8<<16>>16;j=j+1<<16>>16;a[k>>0]=p&254|e[f+(b[(c[i>>2]|0)+((m|7)<<16>>16<<1)>>1]<<1)>>1];h=l<<16>>16;k=b[n>>1]|0;if((h|0)>=(k+-7|0))break;else m=l}}else{l=0;j=1}n=k&7;m=g+(j<<16>>16)|0;a[m>>0]=0;if(!n)return;j=o+(d<<2)|0;i=0;h=0;k=0;while(1){h=(e[f+(b[(c[j>>2]|0)+(l<<16>>16<<1)>>1]<<1)>>1]&255)<<7-i|h&255;a[m>>0]=h;k=k+1<<16>>16;i=k<<16>>16;if((i|0)>=(n|0))break;else l=l+1<<16>>16}return}function tc(d,f,g,h){d=d|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0;o=c[h+100>>2]|0;n=c[h+96>>2]|0;a[g>>0]=d<<3;n=n+(d<<1)|0;i=b[n>>1]|0;if(d>>>0>=8){l=((i&65535)<<16)+-458752|0;if((l|0)>0){m=1;k=f;while(1){f=k+16|0;h=m+1<<16>>16;a[g+(m<<16>>16)>>0]=e[k+14>>1]|e[k+12>>1]<<1|((e[k+2>>1]<<6|e[k>>1]<<7|e[k+4>>1]<<5|e[k+6>>1]<<4)&240|e[k+8>>1]<<3|e[k+10>>1]<<2)&252;l=l+-524288&-65536;if((l|0)<=0)break;else{m=h;k=f}}i=b[n>>1]|0}else h=1;m=i&7;i=g+(h<<16>>16)|0;a[i>>0]=0;if(!m)return;else{j=0;k=0;l=0;h=f}while(1){k=k&255|b[h>>1]<<7-j;a[i>>0]=k;l=l+1<<16>>16;j=l<<16>>16;if((j|0)>=(m|0))break;else h=h+2|0}return}k=i<<16>>16;if(i<<16>>16>7){i=o+(d<<2)|0;h=0;m=0;j=1;while(1){p=e[f+(b[(c[i>>2]|0)+(h<<1)>>1]<<1)>>1]<<7;k=g+(j<<16>>16)|0;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|1)<<16>>16<<1)>>1]<<1)>>1]<<6|p;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|2)<<16>>16<<1)>>1]<<1)>>1]<<5|p;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|3)<<16>>16<<1)>>1]<<1)>>1]<<4|p;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|4)<<16>>16<<1)>>1]<<1)>>1]<<3|p&240;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|5)<<16>>16<<1)>>1]<<1)>>1]<<2|p;a[k>>0]=p;p=e[f+(b[(c[i>>2]|0)+((m|6)<<16>>16<<1)>>1]<<1)>>1]<<1|p;a[k>>0]=p;l=m+8<<16>>16;j=j+1<<16>>16;a[k>>0]=p&254|e[f+(b[(c[i>>2]|0)+((m|7)<<16>>16<<1)>>1]<<1)>>1];h=l<<16>>16;k=b[n>>1]|0;if((h|0)>=(k+-7|0))break;else m=l}}else{l=0;j=1}n=k&7;m=g+(j<<16>>16)|0;a[m>>0]=0;if(!n)return;j=o+(d<<2)|0;i=0;h=0;k=0;while(1){h=(e[f+(b[(c[j>>2]|0)+(l<<16>>16<<1)>>1]<<1)>>1]&255)<<7-i|h&255;a[m>>0]=h;k=k+1<<16>>16;i=k<<16>>16;if((i|0)>=(n|0))break;else l=l+1<<16>>16}return}function uc(a){a=a|0;var d=0;if(!a){a=-1;return a|0}c[a>>2]=0;d=Je(16)|0;if(!d){a=-1;return a|0}b[d>>1]=0;b[d+2>>1]=0;b[d+4>>1]=0;b[d+6>>1]=0;b[d+8>>1]=0;b[d+10>>1]=0;b[d+12>>1]=0;b[d+14>>1]=0;c[a>>2]=d;a=0;return a|0}function vc(a){a=a|0;if(!a){a=-1;return a|0}b[a>>1]=0;b[a+2>>1]=0;b[a+4>>1]=0;b[a+6>>1]=0;b[a+8>>1]=0;b[a+10>>1]=0;b[a+12>>1]=0;b[a+14>>1]=0;a=0;return a|0}function wc(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function xc(a,d,e,f,g){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,i=0,j=0,k=0,l=0;j=d<<16>>16<2722?0:d<<16>>16<5444?1:2;i=Ee(e,1,g)|0;l=a+4|0;if(!(e<<16>>16>200?i<<16>>16>(b[l>>1]|0):0)){i=b[a>>1]|0;if(i<<16>>16){h=i+-1<<16>>16;b[a>>1]=h;h=h<<16>>16!=0;k=5}}else{b[a>>1]=8;h=1;k=5}if((k|0)==5)if((j&65535)<2&h)j=(j&65535)+1&65535;k=a+6|0;b[k>>1]=d;h=Zd(k,5)|0;if(!(j<<16>>16!=0|h<<16>>16>5443))if(h<<16>>16<0)h=16384;else{h=h<<16>>16;h=(((h<<18>>18|0)==(h|0)?h<<2:h>>>15^32767)<<16>>16)*24660>>15;if((h|0)>32767){c[g>>2]=1;h=32767}h=16384-h&65535}else h=0;i=a+2|0;if(!(b[i>>1]|0))h=De(h,1,g)|0;b[f>>1]=h;b[i>>1]=h;b[l>>1]=e;f=a+12|0;b[a+14>>1]=b[f>>1]|0;e=a+10|0;b[f>>1]=b[e>>1]|0;a=a+8|0;b[e>>1]=b[a>>1]|0;b[a>>1]=b[k>>1]|0;return}function yc(a){a=a|0;var d=0,e=0,f=0,g=0,h=0,i=0;if(!a){a=-1;return a|0}c[a>>2]=0;d=Je(68)|0;f=d;if(!d){a=-1;return a|0}c[d+28>>2]=0;g=d+64|0;c[g>>2]=0;h=d+32|0;if(((Ud(h)|0)<<16>>16==0?(i=d+48|0,(Ud(i)|0)<<16>>16==0):0)?(uc(g)|0)<<16>>16==0:0){e=d+32|0;do{b[d>>1]=0;d=d+2|0}while((d|0)<(e|0));Ud(h)|0;Ud(i)|0;vc(c[g>>2]|0)|0;c[a>>2]=f;a=0;return a|0}wc(g);Ke(d);a=-1;return a|0}function zc(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;wc(b+64|0);Ke(c[a>>2]|0);c[a>>2]=0;return}function Ac(a){a=a|0;var d=0,e=0,f=0;if(!a){f=-1;return f|0}d=a+32|0;e=a;f=e+32|0;do{b[e>>1]=0;e=e+2|0}while((e|0)<(f|0));Ud(d)|0;Ud(a+48|0)|0;vc(c[a+64>>2]|0)|0;f=0;return f|0}function Bc(a,d,f,g,h,j,k,l,m,n,o,p,q,r,s,t,u,v,w){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;t=t|0;u=u|0;v=v|0;w=w|0;var x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0;H=i;i=i+48|0;y=H+34|0;A=H+32|0;C=H+30|0;B=H+28|0;z=H+18|0;x=H+8|0;D=H+6|0;E=H+4|0;F=H+2|0;G=H;if(d){o=a+32|0;Vd(o,d,h,y,A,D,E,w);do{if((d|0)!=7){Vb(d,j,k,l,m,n,z,x,G,F,w);if((d|0)==5){ld(c[a+64>>2]|0,f,g,h,z,x,b[D>>1]|0,b[E>>1]|0,b[y>>1]|0,b[A>>1]|0,40,b[G>>1]|0,b[F>>1]|0,p,s,t,C,B,u,v,w);break}else{a=od(d,b[y>>1]|0,b[A>>1]|0,z,x,p,s,t,C,B,v,w)|0;j=c[u>>2]|0;c[u>>2]=j+2;b[j>>1]=a;break}}else{b[t>>1]=Cc(k,m,w)|0;a=md(7,b[y>>1]|0,b[A>>1]|0,t,C,B,c[v+68>>2]|0,w)|0;j=c[u>>2]|0;c[u>>2]=j+2;b[j>>1]=a}}while(0);Wd(o,b[C>>1]|0,b[B>>1]|0);i=H;return}if(!(o<<16>>16)){Vd(a+48|0,0,h,y,A,D,E,w);Vb(0,j,k,l,m,n,z,x,G,F,w);Wb(j,D,E,w);j=jd(a+32|0,b[a>>1]|0,b[a+2>>1]|0,a+8|0,a+18|0,b[a+4>>1]|0,b[a+6>>1]|0,h,b[y>>1]|0,b[A>>1]|0,x,z,b[D>>1]|0,b[E>>1]|0,p,q,r,s,t,w)|0;b[c[a+28>>2]>>1]=j;i=H;return}o=c[u>>2]|0;c[u>>2]=o+2;c[a+28>>2]=o;o=a+48|0;f=a+32|0;q=f;q=e[q>>1]|e[q+2>>1]<<16;f=f+4|0;f=e[f>>1]|e[f+2>>1]<<16;u=o;r=u;b[r>>1]=q;b[r+2>>1]=q>>>16;u=u+4|0;b[u>>1]=f;b[u+2>>1]=f>>>16;u=a+40|0;f=u;f=e[f>>1]|e[f+2>>1]<<16;u=u+4|0;u=e[u>>1]|e[u+2>>1]<<16;r=a+56|0;q=r;b[q>>1]=f;b[q+2>>1]=f>>>16;r=r+4|0;b[r>>1]=u;b[r+2>>1]=u>>>16;r=a+2|0;Vd(o,0,h,a,r,D,E,w);Vb(0,j,k,l,m,n,a+18|0,a+8|0,G,F,w);l=(e[F>>1]|0)+1|0;u=b[G>>1]|0;q=l<<16>>16;if((l&65535)<<16>>16<0){v=0-q<<16;if((v|0)<983040)v=u<<16>>16>>(v>>16)&65535;else v=0}else{u=u<<16>>16;v=u<<q;if((v<<16>>16>>q|0)==(u|0))v=v&65535;else v=(u>>>15^32767)&65535}b[t>>1]=v;Wb(j,a+4|0,a+6|0,w);id(o,b[a>>1]|0,b[r>>1]|0,b[F>>1]|0,b[G>>1]|0,w);i=H;return}function Cc(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,f=0,g=0;f=10;d=a;e=c;a=0;while(1){a=(Z(b[e>>1]>>1,b[d>>1]|0)|0)+a|0;a=a+(Z(b[e+2>>1]>>1,b[d+2>>1]|0)|0)|0;a=a+(Z(b[e+4>>1]>>1,b[d+4>>1]|0)|0)|0;a=a+(Z(b[e+6>>1]>>1,b[d+6>>1]|0)|0)|0;f=f+-1<<16>>16;if(!(f<<16>>16))break;else{d=d+8|0;e=e+8|0}}d=a<<1;f=pe(d|1)|0;g=f<<16>>16;d=(f<<16>>16<17?d>>17-g:d<<g+-17)&65535;if(d<<16>>16<1){c=0;return c|0}else{f=20;e=c;a=0}while(1){c=b[e>>1]>>1;c=((Z(c,c)|0)>>>2)+a|0;a=b[e+2>>1]>>1;a=c+((Z(a,a)|0)>>>2)|0;f=f+-1<<16>>16;if(!(f<<16>>16))break;else e=e+4|0}a=a<<3;f=pe(a)|0;c=f<<16>>16;d=Td(d,(f<<16>>16<16?a>>16-c:a<<c+-16)&65535)|0;c=(g<<16)+327680-(c<<16)|0;a=c>>16;if((c|0)>65536)a=d<<16>>16>>a+-1;else a=d<<16>>16<<1-a;c=a&65535;return c|0}function Dc(a,d,e,f,g,h){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0;c[h>>2]=0;m=g<<16>>16;k=m>>>2&65535;o=k<<16>>16==0;if(o)j=0;else{l=k;i=e;j=0;while(1){p=b[i>>1]|0;p=(Z(p,p)|0)+j|0;j=b[i+2>>1]|0;j=p+(Z(j,j)|0)|0;p=b[i+4>>1]|0;p=j+(Z(p,p)|0)|0;j=b[i+6>>1]|0;j=p+(Z(j,j)|0)|0;l=l+-1<<16>>16;if(!(l<<16>>16))break;else i=i+8|0}}if(!((j>>>31^1)&(j|0)<1073741824)){j=m>>>1&65535;if(!(j<<16>>16))j=1;else{i=j;l=e;j=0;while(1){p=b[l>>1]>>2;p=(Z(p,p)|0)+j|0;j=b[l+2>>1]>>2;j=p+(Z(j,j)|0)|0;i=i+-1<<16>>16;if(!(i<<16>>16))break;else l=l+4|0}j=j<<1|1}p=(pe(j)|0)<<16>>16;n=p+65532&65535;p=Ce(j<<p,h)|0}else{m=j<<1|1;p=pe(m)|0;n=p;p=Ce(m<<(p<<16>>16),h)|0}c[h>>2]=0;do{if(!(g<<16>>16)){j=1;q=14}else{m=g;l=d;j=e;g=0;while(1){r=Z(b[j>>1]|0,b[l>>1]|0)|0;i=r+g|0;if((r^g|0)>0&(i^g|0)<0)break;m=m+-1<<16>>16;if(!(m<<16>>16)){q=13;break}else{l=l+2|0;j=j+2|0;g=i}}if((q|0)==13){j=i<<1|1;q=14;break}c[h>>2]=1;if(o)j=1;else{j=d;i=0;while(1){i=(Z(b[e>>1]>>2,b[j>>1]|0)|0)+i|0;i=i+(Z(b[e+2>>1]>>2,b[j+2>>1]|0)|0)|0;i=i+(Z(b[e+4>>1]>>2,b[j+4>>1]|0)|0)|0;i=i+(Z(b[e+6>>1]>>2,b[j+6>>1]|0)|0)|0;k=k+-1<<16>>16;if(!(k<<16>>16))break;else{j=j+8|0;e=e+8|0}}j=i<<1|1}e=(pe(j)|0)<<16>>16;i=e+65532&65535;e=Ce(j<<e,h)|0}}while(0);if((q|0)==14){e=pe(j)|0;i=e;e=Ce(j<<(e<<16>>16),h)|0}b[f>>1]=p;j=n<<16>>16;b[f+2>>1]=15-j;b[f+4>>1]=e;i=i<<16>>16;b[f+6>>1]=15-i;if(e<<16>>16<4){r=0;return r|0}i=De(Td(e<<16>>16>>>1&65535,p)|0,i-j&65535,h)|0;i=i<<16>>16>19661?19661:i;if((a|0)!=7){r=i;return r|0}r=i&65532;return r|0}function Ec(a,d,e,f,g,h,i){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0,n=0,o=0;k=(f&65535)+65535&65535;if(k<<16>>16>g<<16>>16){n=f+-1<<16>>16<<16>>16;f=-2147483648;while(1){l=c[a+(0-n<<2)>>2]|0;j=l<<1;l=(j>>1|0)==(l|0)?j:l>>31^2147483647;j=c[a+(~n<<2)>>2]|0;m=l-j|0;if(((m^l)&(l^j)|0)<0){c[i>>2]=1;m=(l>>>31)+2147483647|0}l=c[a+(1-n<<2)>>2]|0;j=m-l|0;if(((j^m)&(l^m)|0)<0){c[i>>2]=1;j=(m>>>31)+2147483647|0}m=Gc(j)|0;f=(m|0)<(f|0)?f:m;k=k+-1<<16>>16;if(k<<16>>16<=g<<16>>16){g=f;break}else n=n+-1|0}}else g=-2147483648;a=e<<16>>16>0;if(a){f=0;j=d;k=0;while(1){m=b[j>>1]|0;m=Z(m,m)|0;if((m|0)!=1073741824){l=(m<<1)+k|0;if((m^k|0)>0&(l^k|0)<0){c[i>>2]=1;k=(k>>>31)+2147483647|0}else k=l}else{c[i>>2]=1;k=2147483647}f=f+1<<16>>16;if(f<<16>>16>=e<<16>>16)break;else j=j+2|0}if(a){a=0;n=d;f=d+-2|0;j=0;while(1){m=Z(b[f>>1]|0,b[n>>1]|0)|0;if((m|0)!=1073741824){l=(m<<1)+j|0;if((m^j|0)>0&(l^j|0)<0){c[i>>2]=1;j=(j>>>31)+2147483647|0}else j=l}else{c[i>>2]=1;j=2147483647}a=a+1<<16>>16;if(a<<16>>16>=e<<16>>16)break;else{n=n+2|0;f=f+2|0}}}else j=0}else{k=0;j=0}f=k<<1;f=(f>>1|0)==(k|0)?f:k>>31^2147483647;e=j<<1;e=(e>>1|0)==(j|0)?e:j>>31^2147483647;k=f-e|0;if(((k^f)&(e^f)|0)<0){c[i>>2]=1;k=(f>>>31)+2147483647|0}a=Gc(k)|0;n=((pe(g)|0)&65535)+65535|0;k=n<<16>>16;if((n&65535)<<16>>16>0){f=g<<k;if((f>>k|0)!=(g|0))f=g>>31^2147483647}else{k=0-k<<16;if((k|0)<2031616)f=g>>(k>>16);else f=0}m=pe(a)|0;j=m<<16>>16;if(m<<16>>16>0){k=a<<j;if((k>>j|0)==(a|0))o=33;else{k=a>>31^2147483647;o=33}}else{k=0-j<<16;if((k|0)<2031616){k=a>>(k>>16);o=33}else l=0}if((o|0)==33)if(k>>>0>65535)l=Td(f>>>16&65535,k>>>16&65535)|0;else l=0;k=m&65535;o=(n&65535)-k|0;f=o&65535;if(!(o&32768)){i=De(l,f,i)|0;b[h>>1]=i;return 0}if(f<<16>>16!=-32768){i=k-n|0;j=i<<16>>16;if((i&65535)<<16>>16<0){j=0-j<<16;if((j|0)>=983040){i=0;b[h>>1]=i;return 0}i=l<<16>>16>>(j>>16)&65535;b[h>>1]=i;return 0}}else j=32767;f=l<<16>>16;k=f<<j;if((k<<16>>16>>j|0)==(f|0)){i=k&65535;b[h>>1]=i;return 0}i=(f>>>15^32767)&65535;b[h>>1]=i;return 0}function Fc(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;if(d<<16>>16)c=c<<16>>16<<1&65535;if(c<<16>>16<0){a=a+-2|0;c=(c&65535)+6&65535}d=c<<16>>16;e=6-d<<16>>16;c=(Z(b[3468+(d<<1)>>1]|0,b[a>>1]|0)|0)+16384|0;c=c+(Z(b[3468+(e<<1)>>1]|0,b[a+2>>1]|0)|0)|0;c=c+(Z(b[3468+(d+6<<1)>>1]|0,b[a+-2>>1]|0)|0)|0;c=c+(Z(b[3468+(e+6<<1)>>1]|0,b[a+4>>1]|0)|0)|0;c=(Z(b[3468+(d+12<<1)>>1]|0,b[a+-4>>1]|0)|0)+c|0;c=c+(Z(b[3468+(e+12<<1)>>1]|0,b[a+6>>1]|0)|0)|0;d=c+(Z(b[3468+(d+18<<1)>>1]|0,b[a+-6>>1]|0)|0)|0;return(d+(Z(b[3468+(e+18<<1)>>1]|0,b[a+8>>1]|0)|0)|0)>>>15&65535|0}function Gc(a){a=a|0;a=a-(a>>>31)|0;return a>>31^a|0}function Hc(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0;if(!(a<<16>>16))return;else{f=3518;g=3538;e=d}while(1){e=e+2|0;c=c+2|0;j=b[c>>1]|0;i=b[f>>1]|0;d=Z(i,j)|0;d=(d|0)==1073741824?2147483647:d<<1;j=(Z(b[g>>1]|0,j)|0)>>15;h=(j<<1)+d|0;h=(d^j|0)>0&(h^d|0)<0?(d>>>31)+2147483647|0:h;i=(Z(i,b[e>>1]|0)|0)>>15;d=h+(i<<1)|0;d=(h^i|0)>0&(d^h|0)<0?(h>>>31)+2147483647|0:d;b[c>>1]=d>>>16;b[e>>1]=(d>>>1)-(d>>16<<15);a=a+-1<<16>>16;if(!(a<<16>>16))break;else{f=f+2|0;g=g+2|0}}return}function Ic(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=a&65535;f=e<<16;b=b<<16>>16;a=(b<<1)+f|0;if(!((b^f|0)>0&(a^f|0)<0)){f=a;return f|0}c[d>>2]=1;f=(e>>>15)+2147483647|0;return f|0}function Jc(a){a=a|0;var d=0,e=0,f=0;if(!a){f=-1;return f|0}c[a>>2]=0;d=Je(22)|0;if(!d){f=-1;return f|0}b[d>>1]=4096;e=d+2|0;f=e+20|0;do{b[e>>1]=0;e=e+2|0}while((e|0)<(f|0));c[a>>2]=d;f=0;return f|0}function Kc(a){a=a|0;var c=0;if(!a){c=-1;return c|0}b[a>>1]=4096;a=a+2|0;c=a+20|0;do{b[a>>1]=0;a=a+2|0}while((a|0)<(c|0));c=0;return c|0}function Lc(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function Mc(a,c,d,f,g,h){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0;K=i;i=i+96|0;I=K+66|0;J=K+44|0;H=K+22|0;k=K;D=c+2|0;G=d+2|0;F=(b[G>>1]<<1)+(e[D>>1]<<16)|0;j=Gc(F)|0;j=ic(j,b[c>>1]|0,b[d>>1]|0,h)|0;if((F|0)>0)j=Oc(j)|0;B=j>>16;b[g>>1]=Ce(j,h)|0;v=j>>20;E=I+2|0;b[E>>1]=v;F=J+2|0;b[F>>1]=(j>>>5)-(v<<15);v=Z(B,B)|0;v=(v|0)==1073741824?2147483647:v<<1;B=(Z((j>>>1)-(B<<15)<<16>>16,B)|0)>>15;C=B<<1;A=C+v|0;A=(B^v|0)>0&(A^v|0)<0?(v>>>31)+2147483647|0:A;C=A+C|0;C=2147483647-(Gc((A^B|0)>0&(C^A|0)<0?(A>>>31)+2147483647|0:C)|0)|0;A=C>>16;B=b[c>>1]|0;v=Z(A,B)|0;v=(v|0)==1073741824?2147483647:v<<1;B=(Z((C>>>1)-(A<<15)<<16>>16,B)|0)>>15;C=(B<<1)+v|0;C=(B^v|0)>0&(C^v|0)<0?(v>>>31)+2147483647|0:C;A=(Z(b[d>>1]|0,A)|0)>>15;v=C+(A<<1)|0;v=(C^A|0)>0&(v^C|0)<0?(C>>>31)+2147483647|0:v;C=pe(v)|0;v=v<<(C<<16>>16);A=H+2|0;B=k+2|0;l=v;v=(v>>>1)-(v>>16<<15)|0;w=k+4|0;x=H+4|0;y=2;z=2;while(1){u=l>>>16;j=u&65535;r=v&65535;s=z+-1|0;n=I+(s<<1)|0;t=J+(s<<1)|0;q=1;p=n;o=t;m=D;k=G;l=0;while(1){L=b[m>>1]|0;M=((Z(b[o>>1]|0,L)|0)>>15)+l|0;l=b[p>>1]|0;l=M+(Z(l,L)|0)+((Z(l,b[k>>1]|0)|0)>>15)|0;q=q+1<<16>>16;if((q<<16>>16|0)>=(z|0))break;else{p=p+-2|0;o=o+-2|0;m=m+2|0;k=k+2|0}}M=(e[c+(z<<1)>>1]<<16)+(l<<5)+(b[d+(z<<1)>>1]<<1)|0;l=ic(Gc(M)|0,j,r,h)|0;if((M|0)>0)l=Oc(l)|0;k=C<<16>>16;if(C<<16>>16>0){j=l<<k;if((j>>k|0)!=(l|0))j=l>>31^2147483647}else{k=0-k<<16;if((k|0)<2031616)j=l>>(k>>16);else j=0}q=j>>16;if((z|0)<5)b[g+(s<<1)>>1]=(j+32768|0)>>>16;M=(j>>>16)-(j>>>31)|0;if(((M<<16>>31^M)&65535)<<16>>16>32750){j=16;break}o=(j>>>1)-(q<<15)<<16>>16;p=1;l=t;k=A;m=B;while(1){L=(Z(b[l>>1]|0,q)|0)>>15;t=b[n>>1]|0;M=(Z(t,o)|0)>>15;t=Z(t,q)|0;M=t+L+(b[J+(p<<1)>>1]|0)+(b[I+(p<<1)>>1]<<15)+M|0;b[k>>1]=M>>>15;b[m>>1]=M&32767;p=p+1|0;if((p&65535)<<16>>16==y<<16>>16)break;else{n=n+-2|0;l=l+-2|0;k=k+2|0;m=m+2|0}}b[x>>1]=j>>20;b[w>>1]=(j>>>5)-(b[H+(z<<1)>>1]<<15);L=Z(q,q)|0;L=(L|0)==1073741824?2147483647:L<<1;j=(Z(o,q)|0)>>15;M=j<<1;k=M+L|0;k=(j^L|0)>0&(k^L|0)<0?(L>>>31)+2147483647|0:k;M=k+M|0;M=2147483647-(Gc((k^j|0)>0&(M^k|0)<0?(k>>>31)+2147483647|0:M)|0)|0;k=M>>16;j=u<<16>>16;j=((Z(k,v<<16>>16)|0)>>15)+(Z(k,j)|0)+((Z((M>>>1)-(k<<15)<<16>>16,j)|0)>>15)<<1;k=(pe(j)|0)<<16>>16;j=j<<k;M=z<<1;Oe(E|0,A|0,M|0)|0;Oe(F|0,B|0,M|0)|0;z=z+1|0;if((z|0)>=11){j=20;break}else{C=k+(C&65535)&65535;l=j;v=(j>>1)-(j>>16<<15)|0;w=w+2|0;x=x+2|0;y=y+1<<16>>16}}if((j|0)==16){j=f+22|0;do{b[f>>1]=b[a>>1]|0;f=f+2|0;a=a+2|0}while((f|0)<(j|0));M=g;L=M;b[L>>1]=0;b[L+2>>1]=0>>>16;M=M+4|0;b[M>>1]=0;b[M+2>>1]=0>>>16;i=K;return 0}else if((j|0)==20){b[f>>1]=4096;M=((b[F>>1]|0)+8192+(b[E>>1]<<15)|0)>>>14&65535;b[f+2>>1]=M;b[a+2>>1]=M;M=((b[J+4>>1]|0)+8192+(b[I+4>>1]<<15)|0)>>>14&65535;b[f+4>>1]=M;b[a+4>>1]=M;M=((b[J+6>>1]|0)+8192+(b[I+6>>1]<<15)|0)>>>14&65535;b[f+6>>1]=M;b[a+6>>1]=M;M=((b[J+8>>1]|0)+8192+(b[I+8>>1]<<15)|0)>>>14&65535;b[f+8>>1]=M;b[a+8>>1]=M;M=((b[J+10>>1]|0)+8192+(b[I+10>>1]<<15)|0)>>>14&65535;b[f+10>>1]=M;b[a+10>>1]=M;M=((b[J+12>>1]|0)+8192+(b[I+12>>1]<<15)|0)>>>14&65535;b[f+12>>1]=M;b[a+12>>1]=M;M=((b[J+14>>1]|0)+8192+(b[I+14>>1]<<15)|0)>>>14&65535;b[f+14>>1]=M;b[a+14>>1]=M;M=((b[J+16>>1]|0)+8192+(b[I+16>>1]<<15)|0)>>>14&65535;b[f+16>>1]=M;b[a+16>>1]=M;M=((b[J+18>>1]|0)+8192+(b[I+18>>1]<<15)|0)>>>14&65535;b[f+18>>1]=M;b[a+18>>1]=M;M=((b[J+20>>1]|0)+8192+(b[I+20>>1]<<15)|0)>>>14&65535;b[f+20>>1]=M;b[a+20>>1]=M;i=K;return 0}return 0}function Nc(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;e=a>>16;b[c>>1]=e;b[d>>1]=(a>>>1)-(e<<15);return}function Oc(a){a=a|0;return((a|0)==-2147483648?2147483647:0-a|0)|0}function Pc(a){a=a|0;var b=0;if(!a){a=-1;return a|0}c[a>>2]=0;b=Je(4)|0;if(!b){a=-1;return a|0}c[b>>2]=0;if(!((Jc(b)|0)<<16>>16)){Kc(c[b>>2]|0)|0;c[a>>2]=b;a=0;return a|0}else{Lc(b);Ke(b);a=-1;return a|0}return 0}function Qc(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Lc(b);Ke(c[a>>2]|0);c[a>>2]=0;return}function Rc(a){a=a|0;if(!a){a=-1;return a|0}Kc(c[a>>2]|0)|0;a=0;return a|0}function Sc(a,b,d,e,f,g,h){a=a|0;b=b|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0;m=i;i=i+64|0;l=m+48|0;k=m+22|0;j=m;if((b|0)==7){d=c[g+116>>2]|0;Kb(e,10,j,k,c[g+112>>2]|0,h)|0;Hc(10,j,k,h);Mc(c[a>>2]|0,j,k,f+22|0,l,h)|0;Kb(e,10,j,k,d,h)|0;Hc(10,j,k,h);Mc(c[a>>2]|0,j,k,f+66|0,l,h)|0;i=m;return}else{Kb(d,10,j,k,c[g+108>>2]|0,h)|0;Hc(10,j,k,h);Mc(c[a>>2]|0,j,k,f+66|0,l,h)|0;i=m;return}}function Tc(a,c,d,e,f,g,h,i,j,k){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;if((d|0)==6){b[f>>1]=bd(a,c,e,20,143,80,g,h,i,j,k)|0;return}b[h>>1]=0;b[h+2>>1]=0;if(d>>>0<2){b[f>>1]=Yc(c,d,e,20,143,160,i,j,k)|0;return}if(d>>>0<6){b[f>>1]=Yc(c,d,e,20,143,80,i,j,k)|0;return}else{b[f>>1]=Yc(c,d,e,18,143,80,i,j,k)|0;return}}function Uc(a){a=a|0;var d=0;if((a|0)!=0?(c[a>>2]=0,d=Je(2)|0,(d|0)!=0):0){b[d>>1]=0;c[a>>2]=d;d=0}else d=-1;return d|0}function Vc(a){a=a|0;if(!a)a=-1;else{b[a>>1]=0;a=0}return a|0}function Wc(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function Xc(a,c,d,f,g,h,j,k,l,m,n,o){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;var p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0;U=i;i=i+240|0;u=U+160|0;v=U+80|0;O=U;N=b[3558+(c*18|0)>>1]|0;T=b[3558+(c*18|0)+2>>1]|0;p=b[3558+(c*18|0)+4>>1]|0;P=b[3558+(c*18|0)+6>>1]|0;s=b[3558+(c*18|0)+12>>1]|0;r=b[3558+(c*18|0)+14>>1]|0;q=b[3558+(c*18|0)+16>>1]|0;a:do{switch(k<<16>>16){case 0:case 80:if(c>>>0<2&k<<16>>16==80){Q=(e[a>>1]|0)-(s&65535)|0;Q=(Q<<16>>16|0)<(q<<16>>16|0)?q:Q&65535;M=r<<16>>16;R=(Q&65535)+M&65535;S=R<<16>>16>143;Q=S?143-M&65535:Q;R=S?143:R;S=1;break a}else{Q=(e[d+((k<<16>>16!=0&1)<<1)>>1]|0)-(e[3558+(c*18|0)+8>>1]|0)|0;Q=(Q<<16>>16|0)<(q<<16>>16|0)?q:Q&65535;M=b[3558+(c*18|0)+10>>1]|0;R=(Q&65535)+M&65535;S=R<<16>>16>143;Q=S?143-M&65535:Q;R=S?143:R;S=0;break a}default:{Q=(e[a>>1]|0)-(s&65535)|0;Q=(Q<<16>>16|0)<(q<<16>>16|0)?q:Q&65535;M=r<<16>>16;R=(Q&65535)+M&65535;S=R<<16>>16>143;Q=S?143-M&65535:Q;R=S?143:R;S=1}}}while(0);L=Q&65535;k=L+65532|0;t=k&65535;K=(R&65535)+4&65535;M=k<<16>>16;k=0-(k&65535)|0;s=k&65535;ec(f+(k<<16>>16<<1)|0,h,u,j);k=j<<16>>16;B=k>>>1&65535;w=B<<16>>16==0;if(w)j=1;else{j=B;q=u;d=v;r=0;while(1){J=b[q>>1]|0;b[d>>1]=J>>>2;J=(Z(J,J)|0)+r|0;r=b[q+2>>1]|0;b[d+2>>1]=r>>>2;r=J+(Z(r,r)|0)|0;j=j+-1<<16>>16;if(!(j<<16>>16))break;else{q=q+4|0;d=d+4|0}}j=(r|0)<33554433}J=j?0:2;A=j?u:v;x=j?u:v;b:do{if(t<<16>>16<=K<<16>>16){y=k+-1|0;G=A+(y<<1)|0;H=h+(y<<1)|0;I=A+(k+-2<<1)|0;D=y>>>1;E=D&65535;z=E<<16>>16==0;F=j?12:14;D=(D<<1)+131070&131070;d=k+-3-D|0;C=A+(d<<1)|0;D=A+(k+-4-D<<1)|0;h=h+(d<<1)|0;if(!w){w=M;while(1){v=B;u=x;q=g;r=0;j=0;while(1){v=v+-1<<16>>16;k=b[u>>1]|0;r=(Z(k,b[q>>1]|0)|0)+r|0;k=(Z(k,k)|0)+j|0;j=b[u+2>>1]|0;r=r+(Z(j,b[q+2>>1]|0)|0)|0;j=k+(Z(j,j)|0)|0;if(!(v<<16>>16))break;else{u=u+4|0;q=q+4|0}}u=ce(j<<1,o)|0;j=u>>16;q=r<<1>>16;v=Z(j,q)|0;v=(v|0)==1073741824?2147483647:v<<1;q=(Z((u>>>1)-(j<<15)<<16>>16,q)|0)>>15;u=(q<<1)+v|0;u=(q^v|0)>0&(u^v|0)<0?(v>>>31)+2147483647|0:u;j=(Z(j,r&32767)|0)>>15;v=u+(j<<1)|0;b[O+(w-M<<1)>>1]=(u^j|0)>0&(v^u|0)<0?(u>>>31)+65535|0:v;if(t<<16>>16!=K<<16>>16){s=s+-1<<16>>16;v=b[f+(s<<16>>16<<1)>>1]|0;if(z){u=y;j=I;r=H;q=G}else{u=E;j=I;r=H;q=G;while(1){w=(Z(b[r>>1]|0,v)|0)>>F;b[q>>1]=w+(e[j>>1]|0);w=(Z(b[r+-2>>1]|0,v)|0)>>F;b[q+-2>>1]=w+(e[j+-2>>1]|0);u=u+-1<<16>>16;if(!(u<<16>>16)){u=d;j=D;r=h;q=C;break}else{j=j+-4|0;r=r+-4|0;q=q+-4|0}}}w=(Z(b[r>>1]|0,v)|0)>>F;b[q>>1]=w+(e[j>>1]|0);b[A+(u+-1<<1)>>1]=v>>J}t=t+1<<16>>16;if(t<<16>>16>K<<16>>16)break b;else w=t<<16>>16}}if(z){j=A+(k+-2<<1)|0;r=M;while(1){ce(0,o)|0;b[O+(r-M<<1)>>1]=0;if(t<<16>>16!=K<<16>>16){s=s+-1<<16>>16;g=b[f+(s<<16>>16<<1)>>1]|0;E=(Z(b[H>>1]|0,g)|0)>>F;b[G>>1]=E+(e[I>>1]|0);b[j>>1]=g>>J}t=t+1<<16>>16;if(t<<16>>16>K<<16>>16)break b;else r=t<<16>>16}}u=A+(d+-1<<1)|0;j=M;while(1){ce(0,o)|0;b[O+(j-M<<1)>>1]=0;if(t<<16>>16!=K<<16>>16){s=s+-1<<16>>16;j=b[f+(s<<16>>16<<1)>>1]|0;r=E;q=I;d=H;k=G;while(1){g=(Z(b[d>>1]|0,j)|0)>>F;b[k>>1]=g+(e[q>>1]|0);g=(Z(b[d+-2>>1]|0,j)|0)>>F;b[k+-2>>1]=g+(e[q+-2>>1]|0);r=r+-1<<16>>16;if(!(r<<16>>16))break;else{q=q+-4|0;d=d+-4|0;k=k+-4|0}}g=(Z(b[h>>1]|0,j)|0)>>F;b[C>>1]=g+(e[D>>1]|0);b[u>>1]=j>>J}t=t+1<<16>>16;if(t<<16>>16>K<<16>>16)break;else j=t<<16>>16}}}while(0);t=Q<<16>>16;d=L+1&65535;if(d<<16>>16>R<<16>>16)h=Q;else{s=Q;k=b[O+(t-M<<1)>>1]|0;while(1){r=b[O+((d<<16>>16)-M<<1)>>1]|0;q=r<<16>>16<k<<16>>16;s=q?s:d;d=d+1<<16>>16;if(d<<16>>16>R<<16>>16){h=s;break}else k=q?k:r}}c:do{if(!(S<<16>>16==0?h<<16>>16>N<<16>>16:0)){if(!(c>>>0<4&S<<16>>16!=0)){s=O+((h<<16>>16)-M<<1)|0;r=Fc(s,p,T,o)|0;d=(p&65535)+1&65535;if(d<<16>>16<=P<<16>>16)while(1){q=Fc(s,d,T,o)|0;k=q<<16>>16>r<<16>>16;p=k?d:p;d=d+1<<16>>16;if(d<<16>>16>P<<16>>16)break;else r=k?q:r}if((c+-7|0)>>>0<2){P=p<<16>>16==-3;d=(P<<31>>31)+h<<16>>16;p=P?3:p;break}switch(p<<16>>16){case-2:{d=h+-1<<16>>16;p=1;break c}case 2:{d=h+1<<16>>16;p=-1;break c}default:{d=h;break c}}}N=b[a>>1]|0;N=((N<<16>>16)-t|0)>5?t+5&65535:N;k=R<<16>>16;N=(k-(N<<16>>16)|0)>4?k+65532&65535:N;k=h<<16>>16;d=N<<16>>16;if((k|0)==(d+-1|0)?1:h<<16>>16==N<<16>>16){s=O+(k-M<<1)|0;k=Fc(s,p,T,o)|0;d=(p&65535)+1&65535;if(d<<16>>16<=P<<16>>16)while(1){r=Fc(s,d,T,o)|0;q=r<<16>>16>k<<16>>16;p=q?d:p;d=d+1<<16>>16;if(d<<16>>16>P<<16>>16)break;else k=q?r:k}if((c+-7|0)>>>0<2){P=p<<16>>16==-3;d=(P<<31>>31)+h<<16>>16;p=P?3:p;break}switch(p<<16>>16){case-2:{d=h+-1<<16>>16;p=1;break c}case 2:{d=h+1<<16>>16;p=-1;break c}default:{d=h;break c}}}if((k|0)==(d+-2|0)){d=O+(k-M<<1)|0;k=Fc(d,0,T,o)|0;if((c|0)!=8){p=0;s=1;while(1){r=Fc(d,s,T,o)|0;q=r<<16>>16>k<<16>>16;p=q?s:p;s=s+1<<16>>16;if(s<<16>>16>P<<16>>16)break;else k=q?r:k}if((c+-7|0)>>>0>=2)switch(p<<16>>16){case-2:{d=h+-1<<16>>16;p=1;break c}case 2:{d=h+1<<16>>16;p=-1;break c}default:{d=h;break c}}}else p=0;P=p<<16>>16==-3;d=(P<<31>>31)+h<<16>>16;p=P?3:p;break}if((k|0)==(d+1|0)){s=O+(k-M<<1)|0;d=Fc(s,p,T,o)|0;k=(p&65535)+1&65535;if(k<<16>>16<=0)while(1){q=Fc(s,k,T,o)|0;r=q<<16>>16>d<<16>>16;p=r?k:p;k=k+1<<16>>16;if(k<<16>>16>0)break;else d=r?q:d}if((c+-7|0)>>>0<2){P=p<<16>>16==-3;d=(P<<31>>31)+h<<16>>16;p=P?3:p;break}switch(p<<16>>16){case-2:{d=h+-1<<16>>16;p=1;break c}case 2:{d=h+1<<16>>16;p=-1;break c}default:{d=h;break c}}}else{d=h;p=0}}else{d=h;p=0}}while(0);if((c+-7|0)>>>0>1){P=a;a=pc(d,p,b[a>>1]|0,Q,R,S,c>>>0<4&1,o)|0;b[n>>1]=a;b[P>>1]=d;b[m>>1]=T;b[l>>1]=p;i=U;return d|0}else{o=qc(d,p,Q,S,o)|0;b[n>>1]=o;b[a>>1]=d;b[m>>1]=T;b[l>>1]=p;i=U;return d|0}return 0}function Yc(a,d,e,f,g,h,j,k,l){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;D=i;i=i+1200|0;B=D+1188|0;A=D+580|0;C=D+578|0;z=D+576|0;v=D;x=D+582|0;y=(k|0)!=0;do{if(y)if(d>>>0<2){Ld(a,1,l);break}else{Ld(a,0,l);break}}while(0);w=g<<16>>16;o=0-w|0;n=e+(o<<1)|0;o=o&65535;s=h<<16>>16;do{if(o<<16>>16<h<<16>>16){r=o;q=n;o=0;while(1){t=b[q>>1]|0;o=(Z(t<<1,t)|0)+o|0;if((o|0)<0)break;r=r+1<<16>>16;if(r<<16>>16>=h<<16>>16){u=14;break}else q=q+2|0}if((u|0)==14){if((o|0)<1048576){u=15;break}Oe(x|0,n|0,s+w<<1|0)|0;t=0;break}m=s+w|0;p=m>>>1;r=p&65535;if(!(r<<16>>16))o=x;else{t=((p<<1)+131070&131070)+2|0;s=t-w|0;q=x;while(1){b[q>>1]=(b[n>>1]|0)>>>3;b[q+2>>1]=(b[n+2>>1]|0)>>>3;r=r+-1<<16>>16;if(!(r<<16>>16))break;else{n=n+4|0;q=q+4|0}}n=e+(s<<1)|0;o=x+(t<<1)|0}if(!(m&1))t=3;else{b[o>>1]=(b[n>>1]|0)>>>3;t=3}}else u=15}while(0);if((u|0)==15){t=s+w|0;o=t>>>1;p=o&65535;if(!(p<<16>>16))o=x;else{s=((o<<1)+131070&131070)+2|0;q=s-w|0;r=x;while(1){b[r>>1]=b[n>>1]<<3;b[r+2>>1]=b[n+2>>1]<<3;p=p+-1<<16>>16;if(!(p<<16>>16))break;else{n=n+4|0;r=r+4|0}}n=e+(q<<1)|0;o=x+(s<<1)|0}if(!(t&1))t=-3;else{b[o>>1]=b[n>>1]<<3;t=-3}}s=v+(w<<2)|0;q=x+(w<<1)|0;Tb(q,h,g,f,s);m=(d|0)==7&1;o=f<<16>>16;n=o<<2;if((n|0)!=(o<<18>>16|0)){c[l>>2]=1;n=f<<16>>16>0?32767:-32768}r=Zc(a,s,q,t,m,h,g,n&65535,B,k,l)|0;o=o<<1;p=Zc(a,s,q,t,m,h,n+65535&65535,o&65535,A,k,l)|0;o=Zc(a,s,q,t,m,h,o+65535&65535,f,C,k,l)|0;if(j<<16>>16==1&y){Ec(s,q,h,g,f,z,l)|0;Jd(a,b[z>>1]|0)}n=b[B>>1]|0;m=b[A>>1]|0;if(((n<<16>>16)*55706>>16|0)>=(m<<16>>16|0)){A=n;B=r;A=A<<16>>16;A=A*55706|0;A=A>>16;C=b[C>>1]|0;C=C<<16>>16;C=(A|0)<(C|0);C=C?o:B;i=D;return C|0}b[B>>1]=m;A=m;B=p;A=A<<16>>16;A=A*55706|0;A=A>>16;C=b[C>>1]|0;C=C<<16>>16;C=(A|0)<(C|0);C=C?o:B;i=D;return C|0}function Zc(a,d,e,f,g,h,i,j,k,l,m){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;var n=0,o=0,p=0,q=0,r=0;if(i<<16>>16<j<<16>>16){j=-2147483648;p=i}else{p=i;n=-2147483648;o=d+(0-(i<<16>>16)<<2)|0;d=i;while(1){i=c[o>>2]|0;r=(i|0)<(n|0);d=r?d:p;n=r?n:i;p=p+-1<<16>>16;if(p<<16>>16<j<<16>>16){j=n;p=d;break}else o=o+4|0}}d=h<<16>>16>>>2&65535;if(!(d<<16>>16))d=0;else{n=d;i=e+(0-(p<<16>>16)<<1)|0;d=0;while(1){r=b[i>>1]|0;r=(Z(r,r)|0)+d|0;d=b[i+2>>1]|0;d=r+(Z(d,d)|0)|0;r=b[i+4>>1]|0;r=d+(Z(r,r)|0)|0;d=b[i+6>>1]|0;d=r+(Z(d,d)|0)|0;n=n+-1<<16>>16;if(!(n<<16>>16))break;else i=i+8|0}d=d<<1}if(l)Kd(a,j,d,m);d=ce(d,m)|0;i=g<<16>>16!=0;if(i)d=(d|0)>1073741823?2147483647:d<<1;g=j>>16;a=d>>16;m=Z(a,g)|0;m=(m|0)==1073741824?2147483647:m<<1;d=(Z((d>>>1)-(a<<15)<<16>>16,g)|0)>>15;r=(d<<1)+m|0;r=(d^m|0)>0&(r^m|0)<0?(m>>>31)+2147483647|0:r;g=(Z(a,(j>>>1)-(g<<15)<<16>>16)|0)>>15;d=r+(g<<1)|0;d=(r^g|0)>0&(d^r|0)<0?(r>>>31)+2147483647|0:d;if(!i){b[k>>1]=d;return p|0}i=f<<16>>16;if(f<<16>>16>0)if(f<<16>>16<31){i=d>>i;q=16}else i=0;else{q=0-i<<16>>16;i=d<<q;i=(i>>q|0)==(d|0)?i:d>>31^2147483647;q=16}if((q|0)==16){if((i|0)>65535){b[k>>1]=32767;return p|0}if((i|0)<-65536){b[k>>1]=-32768;return p|0}}b[k>>1]=i>>>1;return p|0}function _c(a){a=a|0;var d=0;if(!a){a=-1;return a|0}c[a>>2]=0;d=Je(6)|0;if(!d){a=-1;return a|0}b[d>>1]=40;b[d+2>>1]=0;b[d+4>>1]=0;c[a>>2]=d;a=0;return a|0}function $c(a){a=a|0;if(!a){a=-1;return a|0}b[a>>1]=40;b[a+2>>1]=0;b[a+4>>1]=0;a=0;return a|0}function ad(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function bd(a,d,e,f,g,h,j,k,l,m,n){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;var o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0;F=i;i=i+1200|0;w=F+1186|0;x=F+1184|0;E=F+1182|0;v=F;z=F+576|0;y=g<<16>>16;D=z+(y<<1)|0;o=(0-y&65535)<<16>>16<h<<16>>16;if(o){s=0-g<<16>>16<<16>>16;p=0;do{r=b[e+(s<<1)>>1]|0;r=Z(r,r)|0;if((r|0)!=1073741824){q=(r<<1)+p|0;if((r^p|0)>0&(q^p|0)<0){c[n>>2]=1;p=(p>>>31)+2147483647|0}else p=q}else{c[n>>2]=1;p=2147483647}s=s+1|0}while((s&65535)<<16>>16!=h<<16>>16)}else p=0;if((2147483646-p&p|0)>=0)if((p|0)==2147483647){if(o){p=0-g<<16>>16<<16>>16;do{b[z+(p+y<<1)>>1]=De(b[e+(p<<1)>>1]|0,3,n)|0;p=p+1|0}while((p&65535)<<16>>16!=h<<16>>16)}}else t=14;else{c[n>>2]=1;t=14}do{if((t|0)==14){if((1048575-p&p|0)<0){c[n>>2]=1;p=(p>>>31)+2147483647|0}else p=p+-1048576|0;if((p|0)>=0){if(!o)break;C=0-g<<16>>16<<16>>16;Oe(z+(y+C<<1)|0,e+(C<<1)|0,(((h+g<<16>>16)+-1&65535)<<1)+2|0)|0;break}if(o){p=0-g<<16>>16<<16>>16;do{C=b[e+(p<<1)>>1]|0;b[z+(p+y<<1)>>1]=(C<<19>>19|0)==(C|0)?C<<3:C>>>15^32767;p=p+1|0}while((p&65535)<<16>>16!=h<<16>>16)}}}while(0);B=v+(y<<2)|0;Tb(D,h,g,f,B);s=b[a>>1]|0;C=a+4|0;A=k+(l<<16>>16<<1)|0;a:do{if(g<<16>>16<f<<16>>16)u=g;else{if((b[C>>1]|0)<=0){e=g;k=-2147483648;r=g;t=3402;while(1){Nc(c[v+(y-(e<<16>>16)<<2)>>2]|0,w,x,n);q=b[x>>1]|0;p=b[t>>1]|0;s=Z(p,b[w>>1]|0)|0;if((s|0)==1073741824){c[n>>2]=1;o=2147483647}else o=s<<1;u=(Z(p,q<<16>>16)|0)>>15;s=o+(u<<1)|0;if((o^u|0)>0&(s^o|0)<0){c[n>>2]=1;s=(o>>>31)+2147483647|0}q=(s|0)<(k|0);r=q?r:e;e=e+-1<<16>>16;if(e<<16>>16<f<<16>>16){u=r;break a}else{k=q?k:s;t=t+-2|0}}}k=g;o=-2147483648;r=g;u=2902+(y+123-(s<<16>>16)<<1)|0;e=3402;while(1){Nc(c[v+(y-(k<<16>>16)<<2)>>2]|0,w,x,n);t=b[x>>1]|0;q=b[e>>1]|0;s=Z(q,b[w>>1]|0)|0;if((s|0)==1073741824){c[n>>2]=1;p=2147483647}else p=s<<1;t=(Z(q,t<<16>>16)|0)>>15;s=p+(t<<1)|0;if((p^t|0)>0&(s^p|0)<0){c[n>>2]=1;s=(p>>>31)+2147483647|0}Nc(s,w,x,n);t=b[x>>1]|0;q=b[u>>1]|0;s=Z(q,b[w>>1]|0)|0;if((s|0)==1073741824){c[n>>2]=1;p=2147483647}else p=s<<1;t=(Z(q,t<<16>>16)|0)>>15;s=p+(t<<1)|0;if((p^t|0)>0&(s^p|0)<0){c[n>>2]=1;s=(p>>>31)+2147483647|0}q=(s|0)<(o|0);r=q?r:k;k=k+-1<<16>>16;if(k<<16>>16<f<<16>>16){u=r;break}else{o=q?o:s;u=u+-2|0;e=e+-2|0}}}}while(0);if(h<<16>>16>0){k=0;e=D;t=z+(y-(u<<16>>16)<<1)|0;r=0;p=0;while(1){s=b[t>>1]|0;q=Z(s,b[e>>1]|0)|0;if((q|0)!=1073741824){o=(q<<1)+r|0;if((q^r|0)>0&(o^r|0)<0){c[n>>2]=1;r=(r>>>31)+2147483647|0}else r=o}else{c[n>>2]=1;r=2147483647}o=Z(s,s)|0;if((o|0)!=1073741824){q=(o<<1)+p|0;if((o^p|0)>0&(q^p|0)<0){c[n>>2]=1;p=(p>>>31)+2147483647|0}else p=q}else{c[n>>2]=1;p=2147483647}k=k+1<<16>>16;if(k<<16>>16>=h<<16>>16)break;else{e=e+2|0;t=t+2|0}}}else{r=0;p=0}q=(m|0)==0;if(!q){Ld(d,0,n);Kd(d,r,p,n)}o=(Ce(p,n)|0)<<16>>16;if((o*13107|0)==1073741824){c[n>>2]=1;p=2147483647}else p=o*26214|0;o=r-p|0;if(((o^r)&(p^r)|0)<0){c[n>>2]=1;o=(r>>>31)+2147483647|0}m=Ce(o,n)|0;b[A>>1]=m;if(m<<16>>16>0){o=j+6|0;b[j+8>>1]=b[o>>1]|0;m=j+4|0;b[o>>1]=b[m>>1]|0;o=j+2|0;b[m>>1]=b[o>>1]|0;b[o>>1]=b[j>>1]|0;b[j>>1]=u;b[a>>1]=Zd(j,5)|0;b[a+2>>1]=32767;o=32767}else{b[a>>1]=u;a=a+2|0;o=((b[a>>1]|0)*29491|0)>>>15&65535;b[a>>1]=o}b[C>>1]=((Ge(o,9830,n)|0)&65535)>>>15^1;if(q){i=F;return u|0}if((Ge(l,1,n)|0)<<16>>16){i=F;return u|0}Ec(B,D,h,g,f,E,n)|0;Jd(d,b[E>>1]|0);i=F;return u|0}function cd(a,b,c,d,e,f,g,h,j,k){a=a|0;b=b|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0;k=i;i=i+48|0;m=k+22|0;l=k;b=a>>>0<6?b:c;c=f<<16>>16>0?22:0;a=e+(c<<1)|0;Ie(a,b,m);Ie(a,d,l);a=f<<16>>16;f=j+(a<<1)|0;Be(m,g+(a<<1)|0,f,40);He(l,f,f,40,h,1);c=e+(((c<<16)+720896|0)>>>16<<1)|0;Ie(c,b,m);Ie(c,d,l);a=(a<<16)+2621440>>16;j=j+(a<<1)|0;Be(m,g+(a<<1)|0,j,40);He(l,j,j,40,h,1);i=k;return}function dd(a){a=a|0;var d=0;if(!a){a=-1;return a|0}c[a>>2]=0;d=Je(12)|0;if(!d){a=-1;return a|0}b[d>>1]=0;b[d+2>>1]=0;b[d+4>>1]=0;b[d+6>>1]=0;b[d+8>>1]=0;b[d+10>>1]=0;c[a>>2]=d;a=0;return a|0}function ed(a){a=a|0;if(!a){a=-1;return a|0}b[a>>1]=0;b[a+2>>1]=0;b[a+4>>1]=0;b[a+6>>1]=0;b[a+8>>1]=0;b[a+10>>1]=0;a=0;return a|0}function fd(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function gd(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0;m=a+10|0;f=b[m>>1]|0;n=a+8|0;e=b[n>>1]|0;if(!(d<<16>>16)){a=e;l=f;b[m>>1]=l;b[n>>1]=a;return}i=a+4|0;j=a+6|0;k=a+2|0;h=b[j>>1]|0;l=b[i>>1]|0;g=d;d=f;while(1){o=(Z(b[a>>1]|0,-3733)|0)+(((l<<16>>16)*7807|0)+((h<<16>>16)*7807>>15))|0;b[a>>1]=l;o=o+((Z(b[k>>1]|0,-3733)|0)>>15)|0;b[k>>1]=h;o=((d<<16>>16)*1899|0)+o+(Z(e<<16>>16,-3798)|0)|0;d=b[c>>1]|0;o=o+((d<<16>>16)*1899|0)|0;b[c>>1]=(o+2048|0)>>>12;f=o>>>12;l=f&65535;b[i>>1]=l;h=(o<<3)-(f<<15)&65535;b[j>>1]=h;g=g+-1<<16>>16;if(!(g<<16>>16))break;else{o=e;c=c+2|0;e=d;d=o}}b[m>>1]=e;b[n>>1]=d;return}function hd(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0,j=0;g=b[(c[f+88>>2]|0)+(a<<1)>>1]|0;if(!(g<<16>>16))return;j=e;i=c[(c[f+92>>2]|0)+(a<<2)>>2]|0;while(1){e=b[i>>1]|0;if(!(e<<16>>16))e=0;else{a=b[d>>1]|0;h=e;f=j+((e<<16>>16)+-1<<1)|0;while(1){e=a<<16>>16;b[f>>1]=e&1;h=h+-1<<16>>16;if(!(h<<16>>16))break;else{a=e>>>1&65535;f=f+-2|0}}e=b[i>>1]|0}d=d+2|0;g=g+-1<<16>>16;if(!(g<<16>>16))break;else{j=j+(e<<16>>16<<1)|0;i=i+2|0}}return}function id(a,d,f,g,h,j){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0;o=i;i=i+16|0;m=o+2|0;n=o;k=h<<16>>16;if(h<<16>>16<1){j=-5443;n=-32768;Wd(a,n,j);i=o;return}l=re(14,f,j)|0;if((k|0)<(l<<16>>16|0))f=g;else{f=(g&65535)+1&65535;h=k>>>1&65535}g=Td(h,l&65535)|0;b[n>>1]=g;de(g<<16>>16,m,n,j);b[m>>1]=((((f&65535)-(d&65535)<<16)+-65536|0)>>>16)+(e[m>>1]|0);g=Ee(b[n>>1]|0,5,j)|0;k=b[m>>1]|0;g=((k&65535)<<10)+(g&65535)&65535;if(g<<16>>16>18284){j=3037;n=18284;Wd(a,n,j);i=o;return}h=b[n>>1]|0;k=k<<16>>16;if((k*24660|0)==1073741824){c[j>>2]=1;f=2147483647}else f=k*49320|0;n=(h<<16>>16)*24660>>15;k=f+(n<<1)|0;if((f^n|0)>0&(k^f|0)<0){c[j>>2]=1;k=(f>>>31)+2147483647|0}n=k<<13;j=Ce((n>>13|0)==(k|0)?n:k>>31^2147483647,j)|0;n=g;Wd(a,n,j);i=o;return}function jd(a,d,f,g,h,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;t=t|0;u=u|0;v=v|0;w=w|0;x=x|0;var y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0;ha=i;i=i+80|0;da=ha+66|0;ea=ha+64|0;fa=ha+62|0;ga=ha+60|0;O=ha+40|0;P=ha+20|0;M=ha;b[da>>1]=d;b[ea>>1]=m;b[fa>>1]=n;L=re(14,f,x)|0;ca=L&65535;b[ga>>1]=ca;N=re(14,n,x)|0;K=(e[g>>1]|0)+65523|0;b[M>>1]=K;E=(e[g+2>>1]|0)+65522|0;F=M+2|0;b[F>>1]=E;G=((d&65535)<<16)+-720896|0;B=G>>16;G=(G>>>15)+15+(e[g+4>>1]|0)|0;H=M+4|0;b[H>>1]=G;I=(e[g+6>>1]|0)+B|0;J=M+6|0;b[J>>1]=I;B=B+1+(e[g+8>>1]|0)|0;C=M+8|0;b[C>>1]=B;y=(e[o>>1]|0)+65523&65535;b[M+10>>1]=y;D=(e[o+2>>1]|0)+65522&65535;b[M+12>>1]=D;z=((m&65535)<<16)+-720896|0;g=z>>16;z=(z>>>15)+15+(e[o+4>>1]|0)&65535;b[M+14>>1]=z;A=(e[o+6>>1]|0)+g&65535;b[M+16>>1]=A;g=g+1+(e[o+8>>1]|0)&65535;b[M+18>>1]=g;aa=(j&65535)-(q&65535)<<16;m=aa>>16;if((aa|0)>0){n=k;f=r<<16>>16>>m&65535}else{n=k<<16>>16>>0-m&65535;f=r}if((Ee(f,1,x)|0)<<16>>16>n<<16>>16)f=1;else f=(((n<<16>>16)+3>>2|0)>(f<<16>>16|0))<<31>>31;o=K+f&65535;b[M>>1]=o;aa=E+f&65535;b[F>>1]=aa;$=G+f&65535;b[H>>1]=$;_=I+f&65535;b[J>>1]=_;Y=B+f&65535;b[C>>1]=Y;m=g<<16>>16>o<<16>>16?g:o;m=A<<16>>16>m<<16>>16?A:m;m=z<<16>>16>m<<16>>16?z:m;m=D<<16>>16>m<<16>>16?D:m;m=y<<16>>16>m<<16>>16?y:m;m=Y<<16>>16>m<<16>>16?Y:m;m=_<<16>>16>m<<16>>16?_:m;m=$<<16>>16>m<<16>>16?$:m;m=(aa<<16>>16>m<<16>>16?aa:m)+1&65535;g=0;while(1){f=m-(o&65535)|0;o=f&65535;n=e[h>>1]<<16;f=f<<16>>16;if(o<<16>>16>0)o=o<<16>>16<31?n>>f:0;else{aa=0-f<<16>>16;o=n<<aa;o=(o>>aa|0)==(n|0)?o:n>>31^2147483647}aa=o>>16;b[O+(g<<1)>>1]=aa;b[P+(g<<1)>>1]=(o>>>1)-(aa<<15);g=g+1|0;if((g|0)==5){f=5;n=p;break}o=b[M+(g<<1)>>1]|0;h=h+2|0}while(1){g=m-(y&65535)|0;y=g&65535;o=e[n>>1]<<16;g=g<<16>>16;if(y<<16>>16>0)o=y<<16>>16<31?o>>g:0;else{$=0-g<<16>>16;aa=o<<$;o=(aa>>$|0)==(o|0)?aa:o>>31^2147483647}aa=o>>16;b[O+(f<<1)>>1]=aa;b[P+(f<<1)>>1]=(o>>>1)-(aa<<15);o=f+1|0;if((o&65535)<<16>>16==10)break;y=b[M+(o<<1)>>1]|0;f=o;n=n+2|0}Q=L<<16>>16;R=b[O>>1]|0;S=b[P>>1]|0;T=b[O+2>>1]|0;U=b[P+2>>1]|0;V=b[O+4>>1]|0;W=b[P+4>>1]|0;X=b[O+6>>1]|0;Y=b[P+6>>1]|0;_=b[O+8>>1]|0;$=b[P+8>>1]|0;aa=s&65535;q=N<<16>>16;j=b[O+10>>1]|0;A=b[P+10>>1]|0;z=b[O+12>>1]|0;h=b[P+12>>1]|0;f=b[O+14>>1]|0;n=b[P+14>>1]|0;g=b[O+16>>1]|0;y=b[P+16>>1]|0;B=b[O+18>>1]|0;P=b[P+18>>1]|0;m=2147483647;O=0;o=0;C=782;do{M=b[C>>1]|0;I=(Z(Q,b[C+2>>1]|0)|0)>>>15<<16;p=I>>16;G=M<<1;K=(Z(G,M)|0)>>16;r=Z(K,R)|0;if((r|0)==1073741824){c[x>>2]=1;J=2147483647}else J=r<<1;N=(Z(S,K)|0)>>15;r=J+(N<<1)|0;if((J^N|0)>0&(r^J|0)<0){c[x>>2]=1;r=(J>>>31)+2147483647|0}K=Z(T,M)|0;if((K|0)==1073741824){c[x>>2]=1;J=2147483647}else J=K<<1;N=(Z(U,M)|0)>>15;K=J+(N<<1)|0;if((J^N|0)>0&(K^J|0)<0){c[x>>2]=1;K=(J>>>31)+2147483647|0}I=(Z(I>>15,p)|0)>>16;J=Z(V,I)|0;if((J|0)==1073741824){c[x>>2]=1;H=2147483647}else H=J<<1;N=(Z(W,I)|0)>>15;J=H+(N<<1)|0;if((H^N|0)>0&(J^H|0)<0){c[x>>2]=1;J=(H>>>31)+2147483647|0}I=Z(X,p)|0;if((I|0)==1073741824){c[x>>2]=1;H=2147483647}else H=I<<1;N=(Z(Y,p)|0)>>15;I=H+(N<<1)|0;if((H^N|0)>0&(I^H|0)<0){c[x>>2]=1;N=(H>>>31)+2147483647|0}else N=I;H=(Z(G,p)|0)>>16;I=Z(_,H)|0;if((I|0)==1073741824){c[x>>2]=1;G=2147483647}else G=I<<1;L=(Z($,H)|0)>>15;I=G+(L<<1)|0;if((G^L|0)>0&(I^G|0)<0){c[x>>2]=1;I=(G>>>31)+2147483647|0}H=b[C+4>>1]|0;G=b[C+6>>1]|0;C=C+8|0;if((M-aa&65535)<<16>>16<1?(ba=H<<16>>16,H<<16>>16<=s<<16>>16):0){E=(Z(G<<16>>16,q)|0)>>>15<<16;M=E>>16;D=ba<<1;G=(Z(D,ba)|0)>>16;H=Z(j,G)|0;if((H|0)==1073741824){c[x>>2]=1;F=2147483647}else F=H<<1;L=(Z(A,G)|0)>>15;H=F+(L<<1)|0;if((F^L|0)>0&(H^F|0)<0){c[x>>2]=1;H=(F>>>31)+2147483647|0}G=Z(z,ba)|0;if((G|0)==1073741824){c[x>>2]=1;F=2147483647}else F=G<<1;L=(Z(h,ba)|0)>>15;G=F+(L<<1)|0;if((F^L|0)>0&(G^F|0)<0){c[x>>2]=1;L=(F>>>31)+2147483647|0}else L=G;F=(Z(E>>15,M)|0)>>16;G=Z(f,F)|0;if((G|0)==1073741824){c[x>>2]=1;E=2147483647}else E=G<<1;p=(Z(n,F)|0)>>15;G=E+(p<<1)|0;if((E^p|0)>0&(G^E|0)<0){c[x>>2]=1;p=(E>>>31)+2147483647|0}else p=G;G=Z(g,M)|0;if((G|0)==1073741824){c[x>>2]=1;F=2147483647}else F=G<<1;E=(Z(y,M)|0)>>15;G=F+(E<<1)|0;if((F^E|0)>0&(G^F|0)<0){c[x>>2]=1;k=(F>>>31)+2147483647|0}else k=G;F=(Z(D,M)|0)>>16;G=Z(B,F)|0;if((G|0)==1073741824){c[x>>2]=1;E=2147483647}else E=G<<1;M=(Z(P,F)|0)>>15;G=E+(M<<1)|0;if((E^M|0)>0&(G^E|0)<0){c[x>>2]=1;G=(E>>>31)+2147483647|0}M=K+r+J+N+I+H+L+p+k+G|0;N=(M|0)<(m|0);m=N?M:m;o=N?O:o}O=O+1<<16>>16}while(O<<16>>16<256);s=(o&65535)<<18>>16;kd(a,782+(s<<1)|0,ca,d,t,u,x);Vd(a,0,l,ea,fa,da,ga,x);l=(re(14,b[fa>>1]|0,x)|0)&65535;kd(a,782+((s|2)<<1)|0,l,b[ea>>1]|0,v,w,x);i=ha;return o|0}function kd(a,d,f,g,h,j,k){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0;o=i;i=i+16|0;m=o+2|0;n=o;b[h>>1]=b[d>>1]|0;l=b[d+2>>1]|0;f=Z(f<<16>>16<<1,l)|0;h=10-(g&65535)|0;d=h&65535;h=h<<16>>16;if(d<<16>>16>0)d=d<<16>>16<31?f>>h:0;else{h=0-h<<16>>16;d=f<<h;d=(d>>h|0)==(f|0)?d:f>>31^2147483647}b[j>>1]=d>>>16;de(l,m,n,k);b[m>>1]=(e[m>>1]|0)+65524;h=Ee(b[n>>1]|0,5,k)|0;g=b[m>>1]|0;h=((g&65535)<<10)+(h&65535)&65535;f=b[n>>1]|0;g=g<<16>>16;if((g*24660|0)==1073741824){c[k>>2]=1;d=2147483647}else d=g*49320|0;n=(f<<16>>16)*24660>>15;g=d+(n<<1)|0;if(!((d^n|0)>0&(g^d|0)<0)){k=g;k=k<<13;k=k+32768|0;k=k>>>16;k=k&65535;Wd(a,h,k);i=o;return}c[k>>2]=1;k=(d>>>31)+2147483647|0;k=k<<13;k=k+32768|0;k=k>>>16;k=k&65535;Wd(a,h,k);i=o;return}function ld(a,d,f,g,h,j,k,l,m,n,o,p,q,r,s,t,u,v,w,x,y){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;t=t|0;u=u|0;v=v|0;w=w|0;x=x|0;y=y|0;var z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0;la=i;i=i+80|0;ia=la+72|0;ja=la+70|0;ka=la+68|0;ga=la+66|0;ha=la+56|0;_=la+24|0;Y=la+12|0;W=la+48|0;X=la+40|0;R=la+34|0;T=la+22|0;P=la+6|0;Q=la;nd(5,r,s,P,Q,c[x+72>>2]|0,y)|0;B=re(14,n,y)|0;S=x+68|0;O=c[S>>2]|0;V=m<<16>>16;U=V+65526|0;r=(e[j>>1]|0)+65523&65535;b[ha>>1]=r;x=(e[j+2>>1]|0)+65522&65535;b[ha+2>>1]=x;da=U<<16>>16;ea=((U<<17>>17|0)==(da|0)?U<<1:da>>>15^32767)+15+(e[j+4>>1]|0)&65535;b[ha+4>>1]=ea;fa=(e[j+6>>1]|0)+da&65535;b[ha+6>>1]=fa;j=da+1+(e[j+8>>1]|0)&65535;b[ha+8>>1]=j;x=x<<16>>16>r<<16>>16?x:r;x=ea<<16>>16>x<<16>>16?ea:x;x=fa<<16>>16>x<<16>>16?fa:x;x=(Rd(j<<16>>16>x<<16>>16?j:x,1,y)|0)&65535;j=r;r=0;while(1){n=x-(j&65535)|0;j=n&65535;A=e[h+(r<<1)>>1]<<16;n=n<<16>>16;if(j<<16>>16>0)n=j<<16>>16<31?A>>n:0;else{fa=0-n<<16>>16;n=A<<fa;n=(n>>fa|0)==(A|0)?n:A>>31^2147483647}Nc(n,_+(r<<1)|0,Y+(r<<1)|0,y);n=r+1|0;if((n|0)==5)break;j=b[ha+(n<<1)>>1]|0;r=n}M=_+2|0;N=Y+2|0;fa=B<<16>>16;$=_+4|0;aa=Y+4|0;ba=_+6|0;ca=Y+6|0;da=_+8|0;ea=Y+8|0;E=0;j=2147483647;h=0;n=0;while(1){L=b[P+(h<<1)>>1]|0;B=Z(L,L)|0;if(B>>>0>1073741823){c[y>>2]=1;B=32767}else B=B>>>15;x=b[Y>>1]|0;A=B<<16>>16;B=Z(A,b[_>>1]|0)|0;if((B|0)==1073741824){c[y>>2]=1;r=2147483647}else r=B<<1;K=(Z(x<<16>>16,A)|0)>>15;B=r+(K<<1)|0;if((r^K|0)>0&(B^r|0)<0){c[y>>2]=1;B=(r>>>31)+2147483647|0}x=b[N>>1]|0;A=Z(b[M>>1]|0,L)|0;if((A|0)!=1073741824){r=(A<<1)+B|0;if((A^B|0)>0&(r^B|0)<0){c[y>>2]=1;r=(B>>>31)+2147483647|0}}else{c[y>>2]=1;r=2147483647}B=(Z(x<<16>>16,L)|0)>>15;if((B|0)>32767){c[y>>2]=1;B=32767}K=B<<16;B=(K>>15)+r|0;if((K>>16^r|0)>0&(B^r|0)<0){c[y>>2]=1;K=(r>>>31)+2147483647|0}else K=B;I=(K>>>31)+2147483647|0;J=h&65535;B=E;G=0;H=O;do{A=(Z(b[H>>1]|0,fa)|0)>>15;H=H+6|0;if((A|0)>32767){c[y>>2]=1;A=32767}F=A<<16>>16;A=Z(F,F)|0;if((A|0)==1073741824){c[y>>2]=1;D=2147483647}else D=A<<1;Nc(D,ia,ja,y);A=Z(F,L)|0;if((A|0)==1073741824){c[y>>2]=1;D=2147483647}else D=A<<1;Nc(D,ka,ga,y);r=b[aa>>1]|0;C=b[ja>>1]|0;A=b[$>>1]|0;x=b[ia>>1]|0;E=Z(x,A)|0;if((E|0)!=1073741824){D=(E<<1)+K|0;if((E^K|0)>0&(D^K|0)<0){c[y>>2]=1;D=I}}else{c[y>>2]=1;D=2147483647}E=(Z(C<<16>>16,A)|0)>>15;if((E|0)>32767){c[y>>2]=1;E=32767}C=E<<16;E=(C>>15)+D|0;if((C>>16^D|0)>0&(E^D|0)<0){c[y>>2]=1;E=(D>>>31)+2147483647|0}D=(Z(x,r<<16>>16)|0)>>15;if((D|0)>32767){c[y>>2]=1;D=32767}C=D<<16;D=(C>>15)+E|0;if((C>>16^E|0)>0&(D^E|0)<0){c[y>>2]=1;D=(E>>>31)+2147483647|0}A=b[ca>>1]|0;E=Z(b[ba>>1]|0,F)|0;if((E|0)!=1073741824){C=(E<<1)+D|0;if((E^D|0)>0&(C^D|0)<0){c[y>>2]=1;C=(D>>>31)+2147483647|0}}else{c[y>>2]=1;C=2147483647}A=(Z(A<<16>>16,F)|0)>>15;if((A|0)>32767){c[y>>2]=1;A=32767}F=A<<16;A=(F>>15)+C|0;if((F>>16^C|0)>0&(A^C|0)<0){c[y>>2]=1;A=(C>>>31)+2147483647|0}x=b[ea>>1]|0;C=b[ga>>1]|0;r=b[da>>1]|0;z=b[ka>>1]|0;E=Z(z,r)|0;do{if((E|0)==1073741824){c[y>>2]=1;E=2147483647}else{D=(E<<1)+A|0;if(!((E^A|0)>0&(D^A|0)<0)){E=D;break}c[y>>2]=1;E=(A>>>31)+2147483647|0}}while(0);D=(Z(C<<16>>16,r)|0)>>15;if((D|0)>32767){c[y>>2]=1;D=32767}F=D<<16;D=(F>>15)+E|0;if((F>>16^E|0)>0&(D^E|0)<0){c[y>>2]=1;D=(E>>>31)+2147483647|0}A=(Z(z,x<<16>>16)|0)>>15;if((A|0)>32767){c[y>>2]=1;A=32767}F=A<<16;A=(F>>15)+D|0;if((F>>16^D|0)>0&(A^D|0)<0){c[y>>2]=1;A=(D>>>31)+2147483647|0}F=(A|0)<(j|0);B=F?G:B;n=F?J:n;j=F?A:j;G=G+1<<16>>16}while(G<<16>>16<32);h=h+1|0;if((h|0)==3){A=B;h=n;break}else E=B}N=(A<<16>>16)*3|0;j=b[O+(N<<1)>>1]|0;b[u>>1]=b[O+(N+1<<1)>>1]|0;b[v>>1]=b[O+(N+2<<1)>>1]|0;j=Z(j<<16>>16,fa)|0;if((j|0)==1073741824){c[y>>2]=1;B=2147483647}else B=j<<1;N=9-V|0;O=N&65535;N=N<<16>>16;M=O<<16>>16>0;if(M)B=O<<16>>16<31?B>>N:0;else{K=0-N<<16>>16;L=B<<K;B=(L>>K|0)==(B|0)?L:B>>31^2147483647}b[t>>1]=B>>>16;L=h<<16>>16;P=b[P+(L<<1)>>1]|0;b[s>>1]=P;Q=b[Q+(L<<1)>>1]|0;Ub(d,f,g,P,o,W,X,R,y);xc(a,b[R>>1]|0,b[t>>1]|0,T,y);if(!((b[W>>1]|0)!=0&(b[T>>1]|0)>0)){y=A;u=c[w>>2]|0;t=u+2|0;b[u>>1]=Q;u=u+4|0;c[w>>2]=u;b[t>>1]=y;i=la;return}F=W+6|0;b[F>>1]=l;D=X+6|0;b[D>>1]=k;m=((Ge(q,m,y)|0)&65535)+10|0;x=m<<16>>16;if((m&65535)<<16>>16<0){n=0-x<<16;if((n|0)<983040)p=p<<16>>16>>(n>>16)&65535;else p=0}else{n=p<<16>>16;r=n<<x;if((r<<16>>16>>x|0)==(n|0))p=r&65535;else p=(n>>>15^32767)&65535}j=b[s>>1]|0;B=b[T>>1]|0;S=c[S>>2]|0;r=b[t>>1]|0;T=10-V|0;x=T<<16>>16;if((T&65535)<<16>>16<0){n=0-x<<16;if((n|0)<983040)l=r<<16>>16>>(n>>16)&65535;else l=0}else{n=r<<16>>16;r=n<<x;if((r<<16>>16>>x|0)==(n|0))l=r&65535;else l=(n>>>15^32767)&65535}h=j<<16>>16;n=Z(h,h)|0;if(n>>>0>1073741823){c[y>>2]=1;j=32767}else j=n>>>15;A=Rd(32767-(B&65535)&65535,1,y)|0;B=B<<16>>16;n=Z(b[W+2>>1]|0,B)|0;if((n|0)==1073741824){c[y>>2]=1;n=2147483647}else n=n<<1;T=n<<1;n=Z(((T>>1|0)==(n|0)?T:n>>31^2147418112)>>16,j<<16>>16)|0;if((n|0)==1073741824){c[y>>2]=1;E=2147483647}else E=n<<1;C=(e[X+2>>1]|0)+65521|0;x=C&65535;n=Z(b[W+4>>1]|0,B)|0;if((n|0)==1073741824){c[y>>2]=1;j=2147483647}else j=n<<1;n=j<<1;n=(Z(((n>>1|0)==(j|0)?n:j>>31^2147418112)>>16,h)|0)>>15;if((n|0)>32767){c[y>>2]=1;n=32767}b[$>>1]=n;j=U&65535;b[ia>>1]=j;j=Rd(b[X+4>>1]|0,j,y)|0;n=Z(b[F>>1]|0,B)|0;if((n|0)==1073741824){c[y>>2]=1;n=2147483647}else n=n<<1;z=n<<1;b[ba>>1]=((z>>1|0)==(n|0)?z:n>>31^2147418112)>>>16;z=((V<<17>>17|0)==(V|0)?V<<1:V>>>15^32767)+65529&65535;b[ia>>1]=z;z=Rd(b[D>>1]|0,z,y)|0;n=(Z(b[F>>1]|0,A<<16>>16)|0)>>15;if((n|0)>32767){c[y>>2]=1;n=32767}b[da>>1]=n;A=Rd(z,1,y)|0;r=Z(b[W>>1]|0,B)|0;if((r|0)==1073741824){c[y>>2]=1;n=2147483647}else n=r<<1;D=Fe(n,ia,y)|0;h=(e[ia>>1]|0)+47|0;b[ia>>1]=h;h=(e[X>>1]|0)-(h&65535)|0;B=h+31&65535;B=x<<16>>16>B<<16>>16?x:B;B=j<<16>>16>B<<16>>16?j:B;B=z<<16>>16>B<<16>>16?z:B;B=(A<<16>>16>B<<16>>16?A:B)<<16>>16;r=B-(C&65535)|0;n=r&65535;r=r<<16>>16;if(n<<16>>16>0)K=n<<16>>16<31?E>>r:0;else{X=0-r<<16>>16;K=E<<X;K=(K>>X|0)==(E|0)?K:E>>31^2147483647}x=B-(j&65535)|0;n=x&65535;r=e[$>>1]<<16;x=x<<16>>16;if(n<<16>>16>0)r=n<<16>>16<31?r>>x:0;else{W=0-x<<16>>16;X=r<<W;r=(X>>W|0)==(r|0)?X:r>>31^2147483647}Nc(r,$,aa,y);z=B-(z&65535)|0;r=z&65535;x=e[ba>>1]<<16;z=z<<16>>16;if(r<<16>>16>0)r=r<<16>>16<31?x>>z:0;else{X=0-z<<16>>16;r=x<<X;r=(r>>X|0)==(x|0)?r:x>>31^2147483647}Nc(r,ba,ca,y);z=B-(A&65535)|0;r=z&65535;x=e[da>>1]<<16;z=z<<16>>16;if(r<<16>>16>0)r=r<<16>>16<31?x>>z:0;else{X=0-z<<16>>16;r=x<<X;r=(r>>X|0)==(x|0)?r:x>>31^2147483647}Nc(r,da,ea,y);z=B+65505|0;b[ia>>1]=z;z=z-(h&65535)|0;r=De(z&65535,1,y)|0;x=r<<16>>16;if(r<<16>>16>0)x=r<<16>>16<31?D>>x:0;else{X=0-x<<16>>16;x=D<<X;x=(x>>X|0)==(D|0)?x:D>>31^2147483647}do{if(!(z&1))E=x;else{Nc(x,_,Y,y);r=b[Y>>1]|0;x=b[_>>1]|0;if((x*23170|0)==1073741824){c[y>>2]=1;z=2147483647}else z=x*46340|0;_=(r<<16>>16)*23170>>15;x=z+(_<<1)|0;if(!((z^_|0)>0&(x^z|0)<0)){E=x;break}c[y>>2]=1;E=(z>>>31)+2147483647|0}}while(0);F=(K>>>31)+2147483647|0;D=2147483647;C=0;x=0;G=S;while(1){r=(Z(b[G>>1]|0,fa)|0)>>15;G=G+6|0;if((r|0)>32767){c[y>>2]=1;r=32767}z=r&65535;if(z<<16>>16>=l<<16>>16)break;j=r<<16>>16;r=Z(j,j)|0;if((r|0)==1073741824){c[y>>2]=1;n=2147483647}else n=r<<1;Nc(n,ja,ka,y);r=(Ge(z,p,y)|0)<<16>>16;r=Z(r,r)|0;if((r|0)==1073741824){c[y>>2]=1;r=2147483647}else r=r<<1;Nc(r,ga,ha,y);z=b[aa>>1]|0;n=Z(b[$>>1]|0,j)|0;do{if((n|0)==1073741824){c[y>>2]=1;n=2147483647}else{r=(n<<1)+K|0;if(!((n^K|0)>0&(r^K|0)<0)){n=r;break}c[y>>2]=1;n=F}}while(0);r=(Z(z<<16>>16,j)|0)>>15;if((r|0)>32767){c[y>>2]=1;r=32767}_=r<<16;r=(_>>15)+n|0;if((_>>16^n|0)>0&(r^n|0)<0){c[y>>2]=1;r=(n>>>31)+2147483647|0}h=b[ca>>1]|0;A=b[ka>>1]|0;j=b[ba>>1]|0;B=b[ja>>1]|0;n=Z(B,j)|0;do{if((n|0)==1073741824){c[y>>2]=1;z=2147483647}else{z=(n<<1)+r|0;if(!((n^r|0)>0&(z^r|0)<0))break;c[y>>2]=1;z=(r>>>31)+2147483647|0}}while(0);n=(Z(A<<16>>16,j)|0)>>15;if((n|0)>32767){c[y>>2]=1;n=32767}_=n<<16;n=(_>>15)+z|0;if((_>>16^z|0)>0&(n^z|0)<0){c[y>>2]=1;n=(z>>>31)+2147483647|0}r=(Z(B,h<<16>>16)|0)>>15;if((r|0)>32767){c[y>>2]=1;r=32767}_=r<<16;r=(_>>15)+n|0;if((_>>16^n|0)>0&(r^n|0)<0){c[y>>2]=1;r=(n>>>31)+2147483647|0}r=Fe(r,ia,y)|0;z=De(b[ia>>1]|0,1,y)|0;n=z<<16>>16;if(z<<16>>16>0)z=z<<16>>16<31?r>>n:0;else{_=0-n<<16>>16;z=r<<_;z=(z>>_|0)==(r|0)?z:r>>31^2147483647}r=z-E|0;if(((r^z)&(z^E)|0)<0){c[y>>2]=1;r=(z>>>31)+2147483647|0}r=(Ce(r,y)|0)<<16>>16;r=Z(r,r)|0;if((r|0)==1073741824){c[y>>2]=1;z=2147483647}else z=r<<1;B=b[ea>>1]|0;j=b[ha>>1]|0;A=b[da>>1]|0;h=b[ga>>1]|0;n=Z(h,A)|0;do{if((n|0)==1073741824){c[y>>2]=1;r=2147483647}else{r=(n<<1)+z|0;if(!((n^z|0)>0&(r^z|0)<0))break;c[y>>2]=1;r=(z>>>31)+2147483647|0}}while(0);n=(Z(j<<16>>16,A)|0)>>15;if((n|0)>32767){c[y>>2]=1;n=32767}_=n<<16;n=(_>>15)+r|0;if((_>>16^r|0)>0&(n^r|0)<0){c[y>>2]=1;n=(r>>>31)+2147483647|0}r=(Z(h,B<<16>>16)|0)>>15;if((r|0)>32767){c[y>>2]=1;r=32767}_=r<<16;r=(_>>15)+n|0;if((_>>16^n|0)>0&(r^n|0)<0){c[y>>2]=1;r=(n>>>31)+2147483647|0}n=(r|0)<(D|0);x=n?C:x;C=C+1<<16>>16;if(C<<16>>16>=32)break;else D=n?r:D}ka=(x<<16>>16)*3|0;z=b[S+(ka<<1)>>1]|0;b[u>>1]=b[S+(ka+1<<1)>>1]|0;b[v>>1]=b[S+(ka+2<<1)>>1]|0;z=Z(z<<16>>16,fa)|0;if((z|0)==1073741824){c[y>>2]=1;z=2147483647}else z=z<<1;if(M)z=O<<16>>16<31?z>>N:0;else{u=0-N<<16>>16;y=z<<u;z=(y>>u|0)==(z|0)?y:z>>31^2147483647}b[t>>1]=z>>>16;y=x;u=c[w>>2]|0;t=u+2|0;b[u>>1]=Q;u=u+4|0;c[w>>2]=u;b[t>>1]=y;i=la;return}function md(a,c,d,e,f,g,h,i){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0,n=0;n=(a|0)==7;j=b[e>>1]|0;if(n){j=j<<16>>16>>>1&65535;m=re(c,d,i)|0;c=m<<16;a=c>>16;if((m<<20>>20|0)==(a|0))a=c>>12;else a=a>>>15^32767}else{m=re(c,d,i)|0;c=m<<16;a=c>>16;if((m<<21>>21|0)==(a|0))a=c>>11;else a=a>>>15^32767}m=a<<16>>16;i=j<<16>>16;c=i-((Z(m,b[h>>1]|0)|0)>>>15&65535)|0;c=((c&32768|0)!=0?0-c|0:c)&65535;k=1;a=0;l=h;while(1){l=l+6|0;j=i-((Z(b[l>>1]|0,m)|0)>>>15&65535)|0;d=j<<16;j=(d|0)<0?0-(d>>16)|0:j;d=(j<<16>>16|0)<(c<<16>>16|0);a=d?k:a;k=k+1<<16>>16;if(k<<16>>16>=32)break;else c=d?j&65535:c}l=(a<<16>>16)*196608>>16;b[e>>1]=(Z(b[h+(l<<1)>>1]|0,m)|0)>>>15<<(n&1);b[f>>1]=b[h+(l+1<<1)>>1]|0;b[g>>1]=b[h+(l+2<<1)>>1]|0;return a|0}function nd(a,c,d,e,f,g,h){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;var i=0,j=0,k=0,l=0,m=0,n=0;i=Ge(b[d>>1]|0,b[g>>1]|0,h)|0;i=(i&65535)-((i&65535)>>>15&65535)|0;i=(i<<16>>31^i)&65535;k=0;l=1;while(1){j=b[g+(l<<1)>>1]|0;if(j<<16>>16>c<<16>>16)j=i;else{j=Ge(b[d>>1]|0,j,h)|0;j=(j&65535)-((j&65535)>>>15&65535)|0;j=(j<<16>>31^j)&65535;n=j<<16>>16<i<<16>>16;j=n?j:i;k=n?l&65535:k}l=l+1|0;if((l|0)==16)break;else i=j}if((a|0)!=5){i=b[g+(k<<16>>16<<1)>>1]|0;if((a|0)==7){b[d>>1]=i&65532;return k|0}else{b[d>>1]=i;return k|0}}j=k<<16>>16;switch(k<<16>>16){case 0:{i=0;break}case 15:{m=8;break}default:if((b[g+(j+1<<1)>>1]|0)>c<<16>>16)m=8;else i=j+65535&65535}if((m|0)==8)i=j+65534&65535;b[f>>1]=i;n=i<<16>>16;b[e>>1]=b[g+(n<<1)>>1]|0;n=n+1|0;b[f+2>>1]=n;n=n<<16>>16;b[e+2>>1]=b[g+(n<<1)>>1]|0;n=n+1|0;b[f+4>>1]=n;b[e+4>>1]=b[g+(n<<16>>16<<1)>>1]|0;b[d>>1]=b[g+(j<<1)>>1]|0;return k|0}function od(a,d,f,g,h,j,k,l,m,n,o,p){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;var q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;K=i;i=i+32|0;s=K+20|0;t=K+10|0;r=K;switch(a|0){case 3:case 4:case 6:{o=o+84|0;J=128;break}default:{o=o+80|0;J=64}}I=c[o>>2]|0;q=re(14,f,p)|0;H=d<<16>>16;G=H+65525|0;a=(e[h>>1]|0)+65523&65535;b[r>>1]=a;d=(e[h+2>>1]|0)+65522&65535;b[r+2>>1]=d;F=G<<16>>16;F=Rd(b[h+4>>1]|0,((G<<17>>17|0)==(F|0)?G<<1:F>>>15^32767)+15&65535,p)|0;b[r+4>>1]=F;G=Rd(b[h+6>>1]|0,G&65535,p)|0;b[r+6>>1]=G;h=Rd(b[h+8>>1]|0,H+65526&65535,p)|0;b[r+8>>1]=h;d=d<<16>>16>a<<16>>16?d:a;d=F<<16>>16>d<<16>>16?F:d;d=G<<16>>16>d<<16>>16?G:d;d=(h<<16>>16>d<<16>>16?h:d)+1&65535;h=0;while(1){f=d-(a&65535)|0;o=f&65535;a=e[g+(h<<1)>>1]<<16;f=f<<16>>16;if(o<<16>>16>0)o=o<<16>>16<31?a>>f:0;else{G=0-f<<16>>16;o=a<<G;o=(o>>G|0)==(a|0)?o:a>>31^2147483647}Nc(o,s+(h<<1)|0,t+(h<<1)|0,p);o=h+1|0;if((o|0)==5)break;a=b[r+(o<<1)>>1]|0;h=o}G=q<<16>>16;y=b[s>>1]|0;z=b[t>>1]|0;A=b[s+2>>1]|0;B=b[t+2>>1]|0;C=b[s+4>>1]|0;D=b[t+4>>1]|0;E=b[s+6>>1]|0;F=b[t+6>>1]|0;x=b[s+8>>1]|0;u=b[t+8>>1]|0;d=2147483647;v=0;o=0;w=I;while(1){h=b[w>>1]|0;if(h<<16>>16>j<<16>>16)q=d;else{q=(Z(b[w+2>>1]|0,G)|0)>>15;if((q|0)>32767){c[p>>2]=1;q=32767}t=h<<16>>16;h=Z(t,t)|0;if(h>>>0>1073741823){c[p>>2]=1;r=32767}else r=h>>>15;f=q<<16>>16;q=Z(f,f)|0;if(q>>>0>1073741823){c[p>>2]=1;s=32767}else s=q>>>15;g=(Z(f,t)|0)>>15;if((g|0)>32767){c[p>>2]=1;g=32767}q=r<<16>>16;r=Z(y,q)|0;if((r|0)==1073741824){c[p>>2]=1;h=2147483647}else h=r<<1;q=(Z(z,q)|0)>>15;r=h+(q<<1)|0;if((h^q|0)>0&(r^h|0)<0){c[p>>2]=1;r=(h>>>31)+2147483647|0}q=Z(A,t)|0;if((q|0)==1073741824){c[p>>2]=1;h=2147483647}else h=q<<1;t=(Z(B,t)|0)>>15;q=h+(t<<1)|0;if((h^t|0)>0&(q^h|0)<0){c[p>>2]=1;q=(h>>>31)+2147483647|0}h=q+r|0;if((q^r|0)>-1&(h^r|0)<0){c[p>>2]=1;h=(r>>>31)+2147483647|0}q=s<<16>>16;r=Z(C,q)|0;if((r|0)==1073741824){c[p>>2]=1;a=2147483647}else a=r<<1;t=(Z(D,q)|0)>>15;r=a+(t<<1)|0;if((a^t|0)>0&(r^a|0)<0){c[p>>2]=1;r=(a>>>31)+2147483647|0}q=r+h|0;if((r^h|0)>-1&(q^h|0)<0){c[p>>2]=1;a=(h>>>31)+2147483647|0}else a=q;q=Z(E,f)|0;if((q|0)==1073741824){c[p>>2]=1;r=2147483647}else r=q<<1;t=(Z(F,f)|0)>>15;q=r+(t<<1)|0;if((r^t|0)>0&(q^r|0)<0){c[p>>2]=1;q=(r>>>31)+2147483647|0}h=q+a|0;if((q^a|0)>-1&(h^a|0)<0){c[p>>2]=1;r=(a>>>31)+2147483647|0}else r=h;h=g<<16>>16;q=Z(x,h)|0;if((q|0)==1073741824){c[p>>2]=1;a=2147483647}else a=q<<1;t=(Z(u,h)|0)>>15;q=a+(t<<1)|0;if((a^t|0)>0&(q^a|0)<0){c[p>>2]=1;h=(a>>>31)+2147483647|0}else h=q;q=h+r|0;if((h^r|0)>-1&(q^r|0)<0){c[p>>2]=1;q=(r>>>31)+2147483647|0}t=(q|0)<(d|0);q=t?q:d;o=t?v:o}w=w+8|0;v=v+1<<16>>16;if((v<<16>>16|0)>=(J|0))break;else d=q}j=o<<16>>16;j=((j<<18>>18|0)==(j|0)?j<<2:j>>>15^32767)<<16>>16;b[k>>1]=b[I+(j<<1)>>1]|0;d=b[I+(j+1<<1)>>1]|0;b[m>>1]=b[I+(j+2<<1)>>1]|0;b[n>>1]=b[I+(j+3<<1)>>1]|0;d=Z(d<<16>>16,G)|0;if((d|0)==1073741824){c[p>>2]=1;a=2147483647}else a=d<<1;f=10-H|0;d=f&65535;f=f<<16>>16;if(d<<16>>16>0){p=d<<16>>16<31?a>>f:0;p=p>>>16;p=p&65535;b[l>>1]=p;i=K;return o|0}else{m=0-f<<16>>16;p=a<<m;p=(p>>m|0)==(a|0)?p:a>>31^2147483647;p=p>>>16;p=p&65535;b[l>>1]=p;i=K;return o|0}return 0}function pd(a,c,d,f,g,h,j,k,l){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0,W=0,X=0,Y=0,_=0,$=0,aa=0,ba=0,ca=0,da=0,ea=0,fa=0,ga=0,ha=0,ia=0,ja=0,ka=0,la=0,ma=0,na=0,oa=0,pa=0,qa=0,ra=0,sa=0,ta=0,ua=0,va=0,wa=0;wa=i;i=i+160|0;va=wa;n=a<<16>>16;ta=a<<16>>16==10;ua=b[j+(b[h>>1]<<1)>>1]|0;if(a<<16>>16>0){l=0;m=k;while(1){b[m>>1]=l;l=l+1<<16>>16;if(l<<16>>16>=a<<16>>16)break;else m=m+2|0}}if(d<<16>>16<=1){i=wa;return}ra=h+2|0;sa=ua<<16>>16;oa=f+(sa<<1)|0;pa=g+(sa*80|0)+(sa<<1)|0;qa=h+6|0;X=c&65535;Y=h+4|0;_=h+10|0;$=h+8|0;aa=h+14|0;ba=h+12|0;ca=h+18|0;da=h+16|0;ea=k+2|0;fa=k+4|0;ga=k+6|0;ha=k+8|0;ia=k+10|0;ja=k+12|0;ka=k+14|0;la=k+16|0;ma=k+18|0;na=a<<16>>16>2;V=h+(n+-1<<1)|0;T=1;W=1;N=0;O=0;U=-1;while(1){S=b[j+(b[ra>>1]<<1)>>1]|0;R=S<<16>>16;c=(e[f+(R<<1)>>1]|0)+(e[oa>>1]|0)|0;m=(b[g+(sa*80|0)+(R<<1)>>1]<<13)+32768+((b[g+(R*80|0)+(R<<1)>>1]|0)+(b[pa>>1]|0)<<12)|0;n=b[qa>>1]|0;if(n<<16>>16<40){n=n<<16>>16;o=va;while(1){P=(b[g+(n*80|0)+(n<<1)>>1]|0)>>>1;M=b[g+(n*80|0)+(sa<<1)>>1]|0;Q=b[g+(n*80|0)+(R<<1)>>1]|0;b[o>>1]=c+(e[f+(n<<1)>>1]|0);b[o+2>>1]=(M+2+P+Q|0)>>>2;n=n+X|0;if((n&65535)<<16>>16<40){n=n<<16>>16;o=o+4|0}else break}B=b[qa>>1]|0}else B=n;c=b[Y>>1]|0;A=m>>12;n=c<<16>>16;a:do{if(c<<16>>16<40){z=B<<16>>16;if(B<<16>>16<40){o=1;q=c;s=B;r=0;p=-1}else while(1){n=n+X|0;if((n&65535)<<16>>16<40)n=n<<16>>16;else{o=1;Q=c;P=B;n=0;break a}}while(1){y=((b[g+(n*80|0)+(n<<1)>>1]|0)+A>>1)+(b[g+(n*80|0)+(sa<<1)>>1]|0)+(b[g+(n*80|0)+(R<<1)>>1]|0)|0;x=e[f+(n<<1)>>1]|0;v=z;w=B;u=va;t=r;while(1){m=(e[u>>1]|0)+x|0;l=m<<16>>16;l=(Z(l,l)|0)>>>15;r=(y+(b[g+(n*80|0)+(v<<1)>>1]|0)>>2)+(b[u+2>>1]|0)>>1;if((Z(l<<16>>16,o<<16>>16)|0)>(Z(r,p<<16>>16)|0)){o=r&65535;q=c;s=w;r=m&65535;p=l&65535}else r=t;m=v+X|0;w=m&65535;if(w<<16>>16>=40)break;else{v=m<<16>>16;u=u+4|0;t=r}}n=n+X|0;c=n&65535;if(c<<16>>16<40)n=n<<16>>16;else{Q=q;P=s;n=r;break}}}else{o=1;Q=c;P=B;n=0}}while(0);q=o<<16>>16<<15;o=b[_>>1]|0;if(o<<16>>16<40){m=Q<<16>>16;l=P<<16>>16;c=n&65535;o=o<<16>>16;n=va;while(1){J=b[g+(o*80|0)+(o<<1)>>1]>>1;I=b[g+(o*80|0)+(sa<<1)>>1]|0;K=b[g+(o*80|0)+(R<<1)>>1]|0;L=b[g+(o*80|0)+(m<<1)>>1]|0;M=b[g+(o*80|0)+(l<<1)>>1]|0;b[n>>1]=(e[f+(o<<1)>>1]|0)+c;b[n+2>>1]=(I+2+J+K+L+M|0)>>>2;o=o+X|0;if((o&65535)<<16>>16<40){o=o<<16>>16;n=n+4|0}else break}J=b[_>>1]|0}else J=o;p=b[$>>1]|0;o=p<<16>>16;b:do{if(p<<16>>16<40){C=Q<<16>>16;D=P<<16>>16;E=J<<16>>16;B=q+32768|0;if(J<<16>>16<40){r=1;q=p;c=J;s=p;n=0;p=-1}else while(1){o=o+X|0;if((o&65535)<<16>>16<40)o=o<<16>>16;else{o=1;M=p;L=J;n=0;break b}}while(1){l=e[f+(o<<1)>>1]|0;A=(b[g+(o*80|0)+(R<<1)>>1]|0)+(b[g+(o*80|0)+(sa<<1)>>1]|0)+(b[g+(o*80|0)+(C<<1)>>1]|0)+(b[g+(o*80|0)+(D<<1)>>1]|0)|0;z=B+(b[g+(o*80|0)+(o<<1)>>1]<<11)|0;x=E;v=J;y=va;while(1){t=(e[y>>1]|0)+l|0;m=z+(b[y+2>>1]<<14)+(A+(b[g+(o*80|0)+(x<<1)>>1]|0)<<12)|0;u=t<<16>>16;u=(Z(u,u)|0)>>>15;if((Z(u<<16>>16,r<<16>>16)|0)>(Z(m>>16,p<<16>>16)|0)){r=m>>>16&65535;w=s;c=v;n=t&65535;p=u&65535}else w=q;q=x+X|0;v=q&65535;if(v<<16>>16>=40){q=w;break}else{x=q<<16>>16;q=w;y=y+4|0}}o=o+X|0;s=o&65535;if(s<<16>>16<40)o=o<<16>>16;else{o=r;M=q;L=c;break}}}else{o=1;M=p;L=J;n=0}}while(0);r=o<<16>>16<<15;o=b[aa>>1]|0;if(o<<16>>16<40){m=Q<<16>>16;l=P<<16>>16;p=M<<16>>16;q=L<<16>>16;c=n&65535;o=o<<16>>16;n=va;while(1){F=b[g+(o*80|0)+(o<<1)>>1]>>1;E=b[g+(sa*80|0)+(o<<1)>>1]|0;G=b[g+(R*80|0)+(o<<1)>>1]|0;H=b[g+(m*80|0)+(o<<1)>>1]|0;I=b[g+(l*80|0)+(o<<1)>>1]|0;J=b[g+(p*80|0)+(o<<1)>>1]|0;K=b[g+(q*80|0)+(o<<1)>>1]|0;b[n>>1]=(e[f+(o<<1)>>1]|0)+c;b[n+2>>1]=(E+4+F+G+H+I+J+K|0)>>>3;o=o+X|0;if((o&65535)<<16>>16<40){o=o<<16>>16;n=n+4|0}else break}c=b[aa>>1]|0}else c=o;s=b[ba>>1]|0;if(s<<16>>16<40){J=Q<<16>>16;F=P<<16>>16;E=M<<16>>16;D=L<<16>>16;C=c<<16>>16;B=c<<16>>16<40;G=r+32768|0;I=s<<16>>16;l=1;w=s;v=c;H=s;q=0;o=-1;while(1){if(B){r=e[f+(I<<1)>>1]|0;n=(b[g+(I*80|0)+(R<<1)>>1]|0)+(b[g+(I*80|0)+(sa<<1)>>1]|0)+(b[g+(I*80|0)+(J<<1)>>1]|0)+(b[g+(I*80|0)+(F<<1)>>1]|0)+(b[g+(I*80|0)+(E<<1)>>1]|0)+(b[g+(I*80|0)+(D<<1)>>1]|0)|0;p=G+(b[g+(I*80|0)+(I<<1)>>1]<<10)|0;u=C;s=c;z=v;A=va;while(1){y=(e[A>>1]|0)+r|0;v=p+(b[A+2>>1]<<14)+(n+(b[g+(I*80|0)+(u<<1)>>1]|0)<<11)|0;x=y<<16>>16;x=(Z(x,x)|0)>>>15;if((Z(x<<16>>16,l<<16>>16)|0)>(Z(v>>16,o<<16>>16)|0)){l=v>>>16&65535;w=H;v=s;q=y&65535;o=x&65535}else v=z;t=u+X|0;s=t&65535;if(s<<16>>16>=40)break;else{u=t<<16>>16;z=v;A=A+4|0}}}s=I+X|0;H=s&65535;if(H<<16>>16>=40){K=v;break}else I=s<<16>>16}}else{l=1;w=s;K=c;q=0;o=-1}if(ta){u=l<<16>>16<<15;o=b[ca>>1]|0;if(o<<16>>16<40){n=Q<<16>>16;c=P<<16>>16;m=M<<16>>16;l=L<<16>>16;r=w<<16>>16;s=K<<16>>16;p=q&65535;o=o<<16>>16;q=va;while(1){E=b[g+(o*80|0)+(o<<1)>>1]>>1;D=b[g+(sa*80|0)+(o<<1)>>1]|0;F=b[g+(R*80|0)+(o<<1)>>1]|0;G=b[g+(n*80|0)+(o<<1)>>1]|0;H=b[g+(c*80|0)+(o<<1)>>1]|0;I=b[g+(m*80|0)+(o<<1)>>1]|0;J=b[g+(l*80|0)+(o<<1)>>1]|0;N=b[g+(r*80|0)+(o<<1)>>1]|0;O=b[g+(s*80|0)+(o<<1)>>1]|0;b[q>>1]=(e[f+(o<<1)>>1]|0)+p;b[q+2>>1]=(D+4+E+F+G+H+I+J+N+O|0)>>>3;o=o+X|0;if((o&65535)<<16>>16<40){o=o<<16>>16;q=q+4|0}else break}J=b[ca>>1]|0}else J=o;r=b[da>>1]|0;if(r<<16>>16<40){E=Q<<16>>16;D=P<<16>>16;C=M<<16>>16;m=L<<16>>16;F=w<<16>>16;G=K<<16>>16;H=J<<16>>16;I=J<<16>>16<40;B=u+32768|0;n=r<<16>>16;l=1;s=r;q=J;c=r;o=-1;while(1){if(I){u=e[f+(n<<1)>>1]|0;p=(b[g+(R*80|0)+(n<<1)>>1]|0)+(b[g+(sa*80|0)+(n<<1)>>1]|0)+(b[g+(E*80|0)+(n<<1)>>1]|0)+(b[g+(D*80|0)+(n<<1)>>1]|0)+(b[g+(C*80|0)+(n<<1)>>1]|0)+(b[g+(m*80|0)+(n<<1)>>1]|0)+(b[g+(F*80|0)+(n<<1)>>1]|0)+(b[g+(G*80|0)+(n<<1)>>1]|0)|0;r=B+(b[g+(n*80|0)+(n<<1)>>1]<<9)|0;A=H;x=J;z=va;while(1){y=(e[z>>1]|0)+u<<16>>16;y=(Z(y,y)|0)>>>15;v=r+(b[z+2>>1]<<13)+(p+(b[g+(n*80|0)+(A<<1)>>1]|0)<<10)|0;if((Z(y<<16>>16,l<<16>>16)|0)>(Z(v>>16,o<<16>>16)|0)){l=v>>>16&65535;s=c;q=x;o=y&65535}t=A+X|0;x=t&65535;if(x<<16>>16>=40)break;else{A=t<<16>>16;z=z+4|0}}}r=n+X|0;c=r&65535;if(c<<16>>16>=40)break;else n=r<<16>>16}}else{l=1;s=r;q=J;o=-1}}else{s=N;q=O}if((Z(o<<16>>16,T<<16>>16)|0)>(Z(l<<16>>16,U<<16>>16)|0)){b[k>>1]=ua;b[ea>>1]=S;b[fa>>1]=Q;b[ga>>1]=P;b[ha>>1]=M;b[ia>>1]=L;b[ja>>1]=w;b[ka>>1]=K;if(ta){b[la>>1]=s;b[ma>>1]=q}}else{l=T;o=U}n=b[ra>>1]|0;if(na){c=1;m=2;while(1){b[h+(c<<1)>>1]=b[h+(m<<1)>>1]|0;m=m+1|0;if((m&65535)<<16>>16==a<<16>>16)break;else c=c+1|0}}b[V>>1]=n;W=W+1<<16>>16;if(W<<16>>16>=d<<16>>16)break;else{T=l;N=s;O=q;U=o}}i=wa;return}function qd(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0;i=39;while(1){h=a+(i<<1)|0;g=b[h>>1]|0;f=c+(i<<1)|0;if(g<<16>>16>-1)b[f>>1]=32767;else{b[f>>1]=-32767;if(g<<16>>16==-32768)g=32767;else g=0-(g&65535)&65535;b[h>>1]=g}b[d+(i<<1)>>1]=g;if((i|0)>0)i=i+-1|0;else break}k=8-(e<<16>>16)|0;if((k|0)>0){j=0;f=0}else return;do{e=0;a=0;h=32767;while(1){c=b[d+(e<<1)>>1]|0;i=c<<16>>16>-1?c<<16>>16<h<<16>>16:0;f=i?a:f;g=e+5|0;a=g&65535;if(a<<16>>16>=40)break;else{e=g<<16>>16;h=i?c:h}}b[d+(f<<16>>16<<1)>>1]=-1;j=j+1<<16>>16}while((j<<16>>16|0)<(k|0));j=0;do{c=1;a=1;g=32767;while(1){e=b[d+(c<<1)>>1]|0;i=e<<16>>16>-1?e<<16>>16<g<<16>>16:0;f=i?a:f;h=c+5|0;a=h&65535;if(a<<16>>16>=40)break;else{c=h<<16>>16;g=i?e:g}}b[d+(f<<16>>16<<1)>>1]=-1;j=j+1<<16>>16}while((j<<16>>16|0)<(k|0));j=0;do{c=2;a=2;g=32767;while(1){e=b[d+(c<<1)>>1]|0;i=e<<16>>16>-1?e<<16>>16<g<<16>>16:0;f=i?a:f;h=c+5|0;a=h&65535;if(a<<16>>16>=40)break;else{c=h<<16>>16;g=i?e:g}}b[d+(f<<16>>16<<1)>>1]=-1;j=j+1<<16>>16}while((j<<16>>16|0)<(k|0));j=0;while(1){c=3;a=3;g=32767;while(1){e=b[d+(c<<1)>>1]|0;i=e<<16>>16>-1?e<<16>>16<g<<16>>16:0;f=i?a:f;h=c+5|0;a=h&65535;if(a<<16>>16>=40){g=f;break}else{c=h<<16>>16;g=i?e:g}}b[d+(g<<16>>16<<1)>>1]=-1;j=j+1<<16>>16;if((j<<16>>16|0)>=(k|0)){f=0;break}else f=g}do{c=4;a=4;j=32767;while(1){e=b[d+(c<<1)>>1]|0;i=e<<16>>16>-1?e<<16>>16<j<<16>>16:0;g=i?a:g;h=c+5|0;a=h&65535;if(a<<16>>16>=40)break;else{c=h<<16>>16;j=i?e:j}}b[d+(g<<16>>16<<1)>>1]=-1;f=f+1<<16>>16}while((f<<16>>16|0)<(k|0));return}function rd(a,d,e,f,g,h,j,k){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0;y=i;i=i+80|0;x=y;p=40;q=d;r=a;m=256;n=256;while(1){l=b[q>>1]|0;q=q+2|0;l=Z(l,l)|0;if((l|0)!=1073741824){o=(l<<1)+m|0;if((l^m|0)>0&(o^m|0)<0){c[k>>2]=1;m=(m>>>31)+2147483647|0}else m=o}else{c[k>>2]=1;m=2147483647}w=b[r>>1]|0;n=(Z(w<<1,w)|0)+n|0;p=p+-1<<16>>16;if(!(p<<16>>16))break;else r=r+2|0}w=ce(m,k)|0;u=w<<5;w=((u>>5|0)==(w|0)?u:w>>31^2147418112)>>16;u=(ce(n,k)|0)<<5>>16;v=39;s=d+78|0;t=x+78|0;l=e+78|0;while(1){r=Z(b[s>>1]|0,w)|0;s=s+-2|0;q=r<<1;d=a+(v<<1)|0;m=b[d>>1]|0;p=Z(m<<16>>16,u)|0;if((p|0)!=1073741824){o=(p<<1)+q|0;if((p^q|0)>0&(o^q|0)<0){c[k>>2]=1;o=(r>>>30&1)+2147483647|0}}else{c[k>>2]=1;o=2147483647}n=o<<10;n=Ce((n>>10|0)==(o|0)?n:o>>31^2147483647,k)|0;if(n<<16>>16>-1)b[l>>1]=32767;else{b[l>>1]=-32767;if(n<<16>>16==-32768)n=32767;else n=0-(n&65535)&65535;if(m<<16>>16==-32768)o=32767;else o=0-(m&65535)&65535;b[d>>1]=o}l=l+-2|0;b[t>>1]=n;if((v|0)<=0)break;else{v=v+-1|0;t=t+-2|0}}d=g<<16>>16;if(g<<16>>16<=0){b[h+(d<<1)>>1]=b[h>>1]|0;i=y;return}r=j&65535;q=0;p=-1;l=0;while(1){if((q|0)<40){n=q;o=q&65535;m=-1;while(1){k=b[x+(n<<1)>>1]|0;j=k<<16>>16>m<<16>>16;m=j?k:m;l=j?o:l;n=n+r|0;o=n&65535;if(o<<16>>16>=40)break;else n=n<<16>>16}}else m=-1;b[f+(q<<1)>>1]=l;if(m<<16>>16>p<<16>>16)b[h>>1]=q;else m=p;q=q+1|0;if((q&65535)<<16>>16==g<<16>>16)break;else p=m}l=b[h>>1]|0;b[h+(d<<1)>>1]=l;if(g<<16>>16>1)m=1;else{i=y;return}do{f=l+1<<16>>16;l=f<<16>>16>=g<<16>>16?0:f;b[h+(m<<1)>>1]=l;b[h+(m+d<<1)>>1]=l;m=m+1|0}while((m&65535)<<16>>16!=g<<16>>16);i=y;return}function sd(a){a=a|0;var d=0;if(!a){a=-1;return a|0}c[a>>2]=0;d=Je(12)|0;if(!d){a=-1;return a|0}b[d>>1]=8;c[a>>2]=d;b[d+2>>1]=3;b[d+4>>1]=0;c[d+8>>2]=0;a=0;return a|0}function td(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function ud(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0,h=0;do{if((d|0)==8){f=a+2|0;g=(b[f>>1]|0)+-1<<16>>16;b[f>>1]=g;d=a+8|0;if(!(c[d>>2]|0)){c[e>>2]=1;b[f>>1]=3;break}h=a+4|0;if(g<<16>>16>2&(b[h>>1]|0)>0){c[e>>2]=2;b[h>>1]=(b[h>>1]|0)+-1<<16>>16;break}if(!(g<<16>>16)){c[e>>2]=2;b[f>>1]=b[a>>1]|0;break}else{c[e>>2]=3;break}}else{b[a+2>>1]=b[a>>1]|0;c[e>>2]=0;d=a+8|0}}while(0);c[d>>2]=c[e>>2];return}function vd(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0,g=0;if(!a){a=-1;return a|0}c[a>>2]=0;d=Je(12)|0;e=d;if(!d){a=-1;return a|0}c[d>>2]=0;f=d+4|0;c[f>>2]=0;g=d+8|0;c[g>>2]=b;if((dd(d)|0)<<16>>16==0?(ac(f,c[g>>2]|0)|0)<<16>>16==0:0){ed(c[d>>2]|0)|0;cc(c[f>>2]|0)|0;c[a>>2]=e;a=0;return a|0}fd(d);bc(f);Ke(d);a=-1;return a|0}function wd(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;fd(b);bc((c[a>>2]|0)+4|0);Ke(c[a>>2]|0);c[a>>2]=0;return}function xd(a,d,f,g,h){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;var j=0,k=0,l=0,m=0,n=0;m=i;i=i+448|0;k=m+320|0;l=m;Qe(g|0,0,488)|0;j=0;do{n=f+(j<<1)|0;b[n>>1]=(e[n>>1]|0)&65528;j=j+1|0}while((j|0)!=160);gd(c[a>>2]|0,f,160);n=a+4|0;dc(c[n>>2]|0,d,f,k,h,l)|0;hd(c[h>>2]|0,k,g,(c[n>>2]|0)+2392|0);i=m;return}function yd(a,c,d,e,f,g,h,j,k,l,m,n,o,p,q,r){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;var s=0,t=0,u=0;u=i;i=i+48|0;s=u+22|0;t=u;Ie(f,(a&-2|0)==6?d:c,s);Ie(f,e,t);d=m;c=s;f=d+22|0;do{b[d>>1]=b[c>>1]|0;d=d+2|0;c=c+2|0}while((d|0)<(f|0));He(g,m,o,40,l,0);He(t,o,o,40,l,0);Be(g,h,q,40);d=n;c=q;f=d+80|0;do{b[d>>1]=b[c>>1]|0;d=d+2|0;c=c+2|0}while((d|0)<(f|0));He(g,n,r,40,j,0);Be(s,r,p,40);He(t,p,p,40,k,0);i=u;return}function zd(a,c,d,f,g,h,i,j,k,l,m,n,o,p,q,r,s){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;k=k|0;l=l|0;m=m|0;n=n|0;o=o|0;p=p|0;q=q|0;r=r|0;s=s|0;var t=0,u=0,v=0,w=0,x=0;if((c|0)==7){v=11;c=f<<16>>16>>>1&65535;t=2}else{v=13;c=f;t=1}b[r>>1]=f<<16>>16<13017?f:13017;u=d<<16>>16;q=q+(u<<1)|0;r=c<<16>>16;g=g<<16>>16;d=20;c=k;s=q;while(1){k=s+2|0;x=Z(b[s>>1]|0,r)|0;w=Z(b[k>>1]|0,r)|0;x=(Z(b[c>>1]|0,g)|0)+x<<1;w=(Z(b[c+2>>1]|0,g)|0)+w<<1<<t;b[s>>1]=((x<<t)+32768|0)>>>16;b[k>>1]=(w+32768|0)>>>16;d=d+-1<<16>>16;if(!(d<<16>>16))break;else{c=c+4|0;s=s+4|0}}c=f<<16>>16;He(h,q,i+(u<<1)|0,40,n,1);d=30;s=0;while(1){w=d+u|0;b[o+(s<<1)>>1]=(e[a+(w<<1)>>1]|0)-(e[i+(w<<1)>>1]|0);w=Z(b[l+(d<<1)>>1]|0,c)|0;x=(Z(b[m+(d<<1)>>1]|0,g)|0)>>v;b[p+(s<<1)>>1]=(e[j+(d<<1)>>1]|0)-(w>>>14)-x;s=s+1|0;if((s|0)==10)break;else d=d+1|0}return}function Ad(a){a=a|0;var d=0;if(!a){a=-1;return a|0}c[a>>2]=0;d=Je(16)|0;if(!d){a=-1;return a|0}b[d>>1]=0;b[d+2>>1]=0;b[d+4>>1]=0;b[d+6>>1]=0;b[d+8>>1]=0;b[d+10>>1]=0;b[d+12>>1]=0;b[d+14>>1]=0;c[a>>2]=d;a=0;return a|0}function Bd(a){a=a|0;if(!a){a=-1;return a|0}b[a>>1]=0;b[a+2>>1]=0;b[a+4>>1]=0;b[a+6>>1]=0;b[a+8>>1]=0;b[a+10>>1]=0;b[a+12>>1]=0;b[a+14>>1]=0;a=0;return a|0}function Cd(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function Dd(a,c,d){a=a|0;c=c|0;d=d|0;var f=0,g=0,h=0,i=0;f=e[c+6>>1]|0;d=e[c+8>>1]|0;g=f-d|0;g=(g&65535|0)!=32767?g&65535:32767;h=e[c+10>>1]|0;d=d-h|0;g=(d<<16>>16|0)<(g<<16>>16|0)?d&65535:g;d=e[c+12>>1]|0;h=h-d|0;g=(h<<16>>16|0)<(g<<16>>16|0)?h&65535:g;h=e[c+14>>1]|0;d=d-h|0;g=(d<<16>>16|0)<(g<<16>>16|0)?d&65535:g;h=h-(e[c+16>>1]|0)|0;d=b[c+2>>1]|0;i=e[c+4>>1]|0;c=(d&65535)-i|0;c=(c&65535|0)!=32767?c&65535:32767;f=i-f|0;if(((h<<16>>16|0)<(g<<16>>16|0)?h&65535:g)<<16>>16<1500?1:(((f<<16>>16|0)<(c<<16>>16|0)?f&65535:c)<<16>>16|0)<((d<<16>>16>32e3?600:d<<16>>16>30500?800:1100)|0)){h=(b[a>>1]|0)+1<<16>>16;i=h<<16>>16>11;b[a>>1]=i?12:h;return i&1|0}else{b[a>>1]=0;return 0}return 0}function Ed(a,c,d){a=a|0;c=c|0;d=d|0;c=De(c,3,d)|0;c=Rd(c,b[a+2>>1]|0,d)|0;c=Rd(c,b[a+4>>1]|0,d)|0;c=Rd(c,b[a+6>>1]|0,d)|0;c=Rd(c,b[a+8>>1]|0,d)|0;c=Rd(c,b[a+10>>1]|0,d)|0;c=Rd(c,b[a+12>>1]|0,d)|0;return(Rd(c,b[a+14>>1]|0,d)|0)<<16>>16>15565|0}function Fd(a,c,d){a=a|0;c=c|0;d=d|0;var e=0;d=a+4|0;b[a+2>>1]=b[d>>1]|0;e=a+6|0;b[d>>1]=b[e>>1]|0;d=a+8|0;b[e>>1]=b[d>>1]|0;e=a+10|0;b[d>>1]=b[e>>1]|0;d=a+12|0;b[e>>1]=b[d>>1]|0;a=a+14|0;b[d>>1]=b[a>>1]|0;b[a>>1]=c<<16>>16>>>3;return}function Gd(a){a=a|0;var d=0,e=0,f=0;if(!a){f=-1;return f|0}c[a>>2]=0;d=Je(128)|0;if(!d){f=-1;return f|0}e=d+72|0;f=e+46|0;do{b[e>>1]=0;e=e+2|0}while((e|0)<(f|0));b[d>>1]=150;b[d+36>>1]=150;b[d+18>>1]=150;b[d+54>>1]=0;b[d+2>>1]=150;b[d+38>>1]=150;b[d+20>>1]=150;b[d+56>>1]=0;b[d+4>>1]=150;b[d+40>>1]=150;b[d+22>>1]=150;b[d+58>>1]=0;b[d+6>>1]=150;b[d+42>>1]=150;b[d+24>>1]=150;b[d+60>>1]=0;b[d+8>>1]=150;b[d+44>>1]=150;b[d+26>>1]=150;b[d+62>>1]=0;b[d+10>>1]=150;b[d+46>>1]=150;b[d+28>>1]=150;b[d+64>>1]=0;b[d+12>>1]=150;b[d+48>>1]=150;b[d+30>>1]=150;b[d+66>>1]=0;b[d+14>>1]=150;b[d+50>>1]=150;b[d+32>>1]=150;b[d+68>>1]=0;b[d+16>>1]=150;b[d+52>>1]=150;b[d+34>>1]=150;b[d+70>>1]=0;b[d+118>>1]=13106;b[d+120>>1]=0;b[d+122>>1]=0;b[d+124>>1]=0;b[d+126>>1]=13106;c[a>>2]=d;f=0;return f|0}function Hd(a){a=a|0;var c=0,d=0;if(!a){d=-1;return d|0}c=a+72|0;d=c+46|0;do{b[c>>1]=0;c=c+2|0}while((c|0)<(d|0));b[a>>1]=150;b[a+36>>1]=150;b[a+18>>1]=150;b[a+54>>1]=0;b[a+2>>1]=150;b[a+38>>1]=150;b[a+20>>1]=150;b[a+56>>1]=0;b[a+4>>1]=150;b[a+40>>1]=150;b[a+22>>1]=150;b[a+58>>1]=0;b[a+6>>1]=150;b[a+42>>1]=150;b[a+24>>1]=150;b[a+60>>1]=0;b[a+8>>1]=150;b[a+44>>1]=150;b[a+26>>1]=150;b[a+62>>1]=0;b[a+10>>1]=150;b[a+46>>1]=150;b[a+28>>1]=150;b[a+64>>1]=0;b[a+12>>1]=150;b[a+48>>1]=150;b[a+30>>1]=150;b[a+66>>1]=0;b[a+14>>1]=150;b[a+50>>1]=150;b[a+32>>1]=150;b[a+68>>1]=0;b[a+16>>1]=150;b[a+52>>1]=150;b[a+34>>1]=150;b[a+70>>1]=0;b[a+118>>1]=13106;b[a+120>>1]=0;b[a+122>>1]=0;b[a+124>>1]=0;b[a+126>>1]=13106;d=0;return d|0}function Id(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function Jd(a,c){a=a|0;c=c|0;b[a+118>>1]=c;return}function Kd(a,d,f,g){a=a|0;d=d|0;f=f|0;g=g|0;var h=0;f=Ce(f,g)|0;if(f<<16>>16<=0)return;f=f<<16>>16;if((f*21298|0)==1073741824){c[g>>2]=1;h=2147483647}else h=f*42596|0;f=d-h|0;if(((f^d)&(h^d)|0)<0){c[g>>2]=1;f=(d>>>31)+2147483647|0}if((f|0)<=0)return;a=a+104|0;b[a>>1]=e[a>>1]|0|16384;return}function Ld(a,c,d){a=a|0;c=c|0;d=d|0;var e=0;a=a+104|0;e=De(b[a>>1]|0,1,d)|0;b[a>>1]=e;if(!(c<<16>>16))return;b[a>>1]=(De(e,1,d)|0)&65535|8192;return}function Md(a,c,d){a=a|0;c=c|0;d=d|0;var f=0,g=0,h=0;g=a+112|0;f=Ge(b[g>>1]|0,b[c>>1]|0,d)|0;f=(f&65535)-((f&65535)>>>15&65535)|0;f=((f<<16>>31^f)&65535)<<16>>16<4;h=b[c>>1]|0;b[g>>1]=h;c=c+2|0;h=Ge(h,b[c>>1]|0,d)|0;h=(h&65535)-((h&65535)>>>15&65535)|0;f=((h<<16>>31^h)&65535)<<16>>16<4?f?2:1:f&1;b[g>>1]=b[c>>1]|0;g=a+102|0;b[g>>1]=De(b[g>>1]|0,1,d)|0;c=a+110|0;if((Rd(b[c>>1]|0,f,d)|0)<<16>>16<=3){b[c>>1]=f;return}b[g>>1]=e[g>>1]|0|16384;b[c>>1]=f;return}function Nd(a,d,f){a=a|0;d=d|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;D=i;i=i+352|0;n=D+24|0;B=D;k=0;h=0;do{g=b[d+(k+-40<<1)>>1]|0;g=Z(g,g)|0;if((g|0)!=1073741824){j=(g<<1)+h|0;if((g^h|0)>0&(j^h|0)<0){c[f>>2]=1;h=(h>>>31)+2147483647|0}else h=j}else{c[f>>2]=1;h=2147483647}k=k+1|0}while((k|0)!=160);o=h;if((343039-o&o|0)<0){c[f>>2]=1;h=(o>>>31)+2147483647|0}else h=o+-343040|0;if((h|0)<0){A=a+102|0;b[A>>1]=e[A>>1]&16383}m=o+-15e3|0;p=(14999-o&o|0)<0;if(p){c[f>>2]=1;j=(o>>>31)+2147483647|0}else j=m;if((j|0)<0){A=a+108|0;b[A>>1]=e[A>>1]&16383}g=a+72|0;l=a+74|0;j=b[g>>1]|0;k=b[l>>1]|0;h=0;do{A=h<<2;y=Ge((b[d+(A<<1)>>1]|0)>>>2&65535,((j<<16>>16)*21955|0)>>>15&65535,f)|0;v=((y<<16>>16)*21955|0)>>>15&65535;u=Rd(j,v,f)|0;x=A|1;z=Ge((b[d+(x<<1)>>1]|0)>>>2&65535,((k<<16>>16)*6390|0)>>>15&65535,f)|0;w=((z<<16>>16)*6390|0)>>>15&65535;j=Rd(k,w,f)|0;b[n+(A<<1)>>1]=Rd(u,j,f)|0;b[n+(x<<1)>>1]=Ge(u,j,f)|0;x=A|2;j=Ge((b[d+(x<<1)>>1]|0)>>>2&65535,v,f)|0;y=Rd(y,((j<<16>>16)*21955|0)>>>15&65535,f)|0;A=A|3;k=Ge((b[d+(A<<1)>>1]|0)>>>2&65535,w,f)|0;z=Rd(z,((k<<16>>16)*6390|0)>>>15&65535,f)|0;b[n+(x<<1)>>1]=Rd(y,z,f)|0;b[n+(A<<1)>>1]=Ge(y,z,f)|0;h=h+1|0}while((h|0)!=40);b[g>>1]=j;b[l>>1]=k;k=a+76|0;j=a+80|0;h=0;do{A=h<<2;Od(n+(A<<1)|0,n+((A|2)<<1)|0,k,f);Od(n+((A|1)<<1)|0,n+((A|3)<<1)|0,j,f);h=h+1|0}while((h|0)!=40);k=a+84|0;j=a+86|0;h=a+92|0;g=0;do{A=g<<3;Pd(n+(A<<1)|0,n+((A|4)<<1)|0,k,f);Pd(n+((A|2)<<1)|0,n+((A|6)<<1)|0,j,f);Pd(n+((A|3)<<1)|0,n+((A|7)<<1)|0,h,f);g=g+1|0}while((g|0)!=20);k=a+88|0;j=a+90|0;h=0;do{A=h<<4;Pd(n+(A<<1)|0,n+((A|8)<<1)|0,k,f);Pd(n+((A|4)<<1)|0,n+((A|12)<<1)|0,j,f);h=h+1|0}while((h|0)!=10);t=Qd(n,a+70|0,32,40,4,1,15,f)|0;b[B+16>>1]=t;u=Qd(n,a+68|0,16,20,8,7,16,f)|0;b[B+14>>1]=u;v=Qd(n,a+66|0,16,20,8,3,16,f)|0;b[B+12>>1]=v;w=Qd(n,a+64|0,16,20,8,2,16,f)|0;b[B+10>>1]=w;x=Qd(n,a+62|0,16,20,8,6,16,f)|0;b[B+8>>1]=x;y=Qd(n,a+60|0,8,10,16,4,16,f)|0;b[B+6>>1]=y;z=Qd(n,a+58|0,8,10,16,12,16,f)|0;b[B+4>>1]=z;A=Qd(n,a+56|0,8,10,16,8,16,f)|0;b[B+2>>1]=A;s=Qd(n,a+54|0,8,10,16,0,16,f)|0;b[B>>1]=s;k=0;g=0;do{j=a+(g<<1)|0;d=qe(b[j>>1]|0)|0;j=b[j>>1]|0;h=d<<16>>16;if(d<<16>>16<0){l=0-h<<16;if((l|0)<983040)l=j<<16>>16>>(l>>16)&65535;else l=0}else{l=j<<16>>16;j=l<<h;if((j<<16>>16>>h|0)==(l|0))l=j&65535;else l=(l>>>15^32767)&65535}j=Td(De(b[B+(g<<1)>>1]|0,1,f)|0,l)|0;r=Ge(d,5,f)|0;h=r<<16>>16;if(r<<16>>16<0){l=0-h<<16;if((l|0)<983040)l=j<<16>>16>>(l>>16);else l=0}else{j=j<<16>>16;l=j<<h;if((l<<16>>16>>h|0)!=(j|0))l=j>>>15^32767}l=l<<16>>16;l=Z(l,l)|0;if((l|0)!=1073741824){j=(l<<1)+k|0;if((l^k|0)>0&(j^k|0)<0){c[f>>2]=1;k=(k>>>31)+2147483647|0}else k=j}else{c[f>>2]=1;k=2147483647}g=g+1|0}while((g|0)!=9);r=k<<6;k=(((r>>6|0)==(k|0)?r:k>>31^2147418112)>>16)*3641>>15;if((k|0)>32767){c[f>>2]=1;k=32767}r=b[a>>1]|0;l=r<<16>>16;q=b[a+2>>1]|0;j=(q<<16>>16)+l|0;if((q^r)<<16>>16>-1&(j^l|0)<0){c[f>>2]=1;j=(l>>>31)+2147483647|0}r=b[a+4>>1]|0;l=r+j|0;if((r^j|0)>-1&(l^j|0)<0){c[f>>2]=1;l=(j>>>31)+2147483647|0}r=b[a+6>>1]|0;j=r+l|0;if((r^l|0)>-1&(j^l|0)<0){c[f>>2]=1;j=(l>>>31)+2147483647|0}r=b[a+8>>1]|0;l=r+j|0;if((r^j|0)>-1&(l^j|0)<0){c[f>>2]=1;l=(j>>>31)+2147483647|0}r=b[a+10>>1]|0;j=r+l|0;if((r^l|0)>-1&(j^l|0)<0){c[f>>2]=1;j=(l>>>31)+2147483647|0}r=b[a+12>>1]|0;l=r+j|0;if((r^j|0)>-1&(l^j|0)<0){c[f>>2]=1;l=(j>>>31)+2147483647|0}r=b[a+14>>1]|0;j=r+l|0;if((r^l|0)>-1&(j^l|0)<0){c[f>>2]=1;j=(l>>>31)+2147483647|0}r=b[a+16>>1]|0;l=r+j|0;if((r^j|0)>-1&(l^j|0)<0){c[f>>2]=1;l=(j>>>31)+2147483647|0}q=l<<13;q=((q>>13|0)==(l|0)?q:l>>31^2147418112)>>>16&65535;l=(Z((Ge(q,0,f)|0)<<16>>16,-2808)|0)>>15;if((l|0)>32767){c[f>>2]=1;l=32767}n=Rd(l&65535,1260,f)|0;r=a+100|0;l=De(b[r>>1]|0,1,f)|0;if((k<<16>>16|0)>((n<<16>>16<720?720:n<<16>>16)|0))l=(l&65535|16384)&65535;b[r>>1]=l;if(p){c[f>>2]=1;m=(o>>>31)+2147483647|0}h=b[a+118>>1]|0;p=a+126|0;l=b[p>>1]|0;g=l<<16>>16<19660;g=h<<16>>16<l<<16>>16?g?2621:6553:g?2621:655;d=l&65535;k=d<<16;l=Z(g,l<<16>>16)|0;if((l|0)==1073741824){c[f>>2]=1;l=2147483647}else l=l<<1;j=k-l|0;if(((j^k)&(l^k)|0)<0){c[f>>2]=1;j=(d>>>15)+2147483647|0}k=Z(g,h<<16>>16)|0;do{if((k|0)==1073741824){c[f>>2]=1;l=2147483647}else{l=j+(k<<1)|0;if(!((j^k|0)>0&(l^j|0)<0))break;c[f>>2]=1;l=(j>>>31)+2147483647|0}}while(0);d=Ce(l,f)|0;o=(m|0)>-1;b[p>>1]=o?d<<16>>16<13106?13106:d:13106;d=a+106|0;b[d>>1]=De(b[d>>1]|0,1,f)|0;j=a+108|0;l=De(b[j>>1]|0,1,f)|0;b[j>>1]=l;k=b[p>>1]|0;a:do{if(o){do{if(k<<16>>16>19660)b[d>>1]=e[d>>1]|16384;else{if(k<<16>>16>16383)break;k=a+116|0;l=0;break a}}while(0);b[j>>1]=l&65535|16384;C=62}else C=62}while(0);do{if((C|0)==62){l=a+116|0;if(k<<16>>16<=22936){k=l;l=0;break}k=l;l=Rd(b[l>>1]|0,1,f)|0}}while(0);b[k>>1]=l;if((b[d>>1]&32640)!=32640){n=(b[j>>1]&32767)==32767;b[a+122>>1]=n&1;if(n)C=67}else{b[a+122>>1]=1;C=67}do{if((C|0)==67){k=a+98|0;if((b[k>>1]|0)>=5)break;b[k>>1]=5}}while(0);n=a+102|0;do{if((b[n>>1]&24576)==24576)C=71;else{if((b[a+104>>1]&31744)==31744){C=71;break}if(!(b[r>>1]&32640)){b[a+98>>1]=20;j=32767;break}else{j=s;k=0;l=0}while(1){g=b[a+18+(k<<1)>>1]|0;h=j<<16>>16>g<<16>>16;m=h?j:g;j=h?g:j;m=m<<16>>16<184?184:m;j=j<<16>>16<184?184:j;g=qe(j)|0;h=g<<16>>16;do{if(g<<16>>16<0){d=0-h<<16;if((d|0)>=983040){d=0;break}d=j<<16>>16>>(d>>16)&65535}else{d=j<<16>>16;j=d<<h;if((j<<16>>16>>h|0)==(d|0)){d=j&65535;break}d=(d>>>15^32767)&65535}}while(0);m=Td(De(m,1,f)|0,d)|0;l=Rd(l,De(m,Ge(8,g,f)|0,f)|0,f)|0;k=k+1|0;if((k|0)==9)break;j=b[B+(k<<1)>>1]|0}if(l<<16>>16>1e3){b[a+98>>1]=20;j=32767;break}j=b[r>>1]|0;k=a+98|0;l=b[k>>1]|0;do{if(!(j&16384))C=86;else{if(!(l<<16>>16)){l=j;break}l=Ge(l,1,f)|0;b[k>>1]=l;C=86}}while(0);if((C|0)==86){if(l<<16>>16==20){j=32767;break}l=b[r>>1]|0}j=(l&16384)==0?16383:3276}}while(0);if((C|0)==71){b[a+98>>1]=20;j=32767}k=s;l=0;while(1){m=a+18+(l<<1)|0;d=oe(j,Ge(k,b[m>>1]|0,f)|0,f)|0;b[m>>1]=Rd(b[m>>1]|0,d,f)|0;l=l+1|0;if((l|0)==9)break;k=b[B+(l<<1)>>1]|0}do{if(!(b[r>>1]&30720)){if(b[n>>1]&30720){C=95;break}if(!(b[a+114>>1]|0)){h=2097;g=1638;d=2}else C=95}else C=95}while(0);do{if((C|0)==95){if((b[a+98>>1]|0)==0?(b[a+114>>1]|0)==0:0){h=1867;g=491;d=2;break}h=1638;g=0;d=0}}while(0);j=0;do{k=a+(j<<1)|0;l=Ge(b[a+36+(j<<1)>>1]|0,b[k>>1]|0,f)|0;if(l<<16>>16<0){l=oe(h,l,f)|0;l=Rd(-2,Rd(b[k>>1]|0,l,f)|0,f)|0;l=l<<16>>16<40?40:l}else{l=oe(g,l,f)|0;l=Rd(d,Rd(b[k>>1]|0,l,f)|0,f)|0;l=l<<16>>16>16e3?16e3:l}b[k>>1]=l;j=j+1|0}while((j|0)!=9);b[a+36>>1]=s;b[a+38>>1]=A;b[a+40>>1]=z;b[a+42>>1]=y;b[a+44>>1]=x;b[a+46>>1]=w;b[a+48>>1]=v;b[a+50>>1]=u;b[a+52>>1]=t;k=q<<16>>16>100;j=k?7:4;k=k?4:5;if(!o){b[a+94>>1]=0;b[a+96>>1]=0;b[a+114>>1]=0;b[a+116>>1]=0;f=0;a=a+120|0;b[a>>1]=f;i=D;return f|0}h=a+114|0;g=b[h>>1]|0;do{if((b[a+116>>1]|0)<=100){if(g<<16>>16)break;g=b[r>>1]|0;do{if(!(g&16368)){if((b[p>>1]|0)>21298)g=1;else break;a=a+120|0;b[a>>1]=g;i=D;return g|0}}while(0);h=a+94|0;if(!(g&16384)){b[h>>1]=0;g=a+96|0;h=b[g>>1]|0;if(h<<16>>16<=0){f=0;a=a+120|0;b[a>>1]=f;i=D;return f|0}b[g>>1]=Ge(h,1,f)|0;f=1;a=a+120|0;b[a>>1]=f;i=D;return f|0}else{f=Rd(b[h>>1]|0,1,f)|0;b[h>>1]=f;if((f<<16>>16|0)<(k|0)){f=1;a=a+120|0;b[a>>1]=f;i=D;return f|0}b[a+96>>1]=j;f=1;a=a+120|0;b[a>>1]=f;i=D;return f|0}}else{if(g<<16>>16>=250)break;b[h>>1]=250;g=250}}while(0);b[a+94>>1]=4;b[h>>1]=Ge(g,1,f)|0;f=1;a=a+120|0;b[a>>1]=f;i=D;return f|0}function Od(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,i=0;g=(b[e>>1]|0)*21955>>15;if((g|0)>32767){c[f>>2]=1;g=32767}h=Ge(b[a>>1]|0,g&65535,f)|0;g=(h<<16>>16)*21955>>15;if((g|0)>32767){c[f>>2]=1;g=32767}i=Rd(b[e>>1]|0,g&65535,f)|0;b[e>>1]=h;e=e+2|0;g=(b[e>>1]|0)*6390>>15;if((g|0)>32767){c[f>>2]=1;g=32767}h=Ge(b[d>>1]|0,g&65535,f)|0;g=(h<<16>>16)*6390>>15;if((g|0)>32767){c[f>>2]=1;g=32767}g=Rd(b[e>>1]|0,g&65535,f)|0;b[e>>1]=h;b[a>>1]=De(Rd(i,g,f)|0,1,f)|0;b[d>>1]=De(Ge(i,g,f)|0,1,f)|0;return}function Pd(a,d,e,f){a=a|0;d=d|0;e=e|0;f=f|0;var g=0,h=0;g=(b[e>>1]|0)*13363>>15;if((g|0)>32767){c[f>>2]=1;g=32767}h=Ge(b[d>>1]|0,g&65535,f)|0;g=(h<<16>>16)*13363>>15;if((g|0)>32767){c[f>>2]=1;g=32767}g=Rd(b[e>>1]|0,g&65535,f)|0;b[e>>1]=h;b[d>>1]=De(Ge(b[a>>1]|0,g,f)|0,1,f)|0;b[a>>1]=De(Rd(b[a>>1]|0,g,f)|0,1,f)|0;return}function Qd(a,d,e,f,g,h,i,j){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0;if(e<<16>>16<f<<16>>16){n=g<<16>>16;k=h<<16>>16;o=e<<16>>16;l=0;do{p=b[a+((Z(o,n)|0)+k<<1)>>1]|0;p=(p&65535)-((p&65535)>>>15&65535)|0;p=(p<<16>>31^p)<<16;m=(p>>15)+l|0;if((p>>16^l|0)>0&(m^l|0)<0){c[j>>2]=1;l=(l>>>31)+2147483647|0}else l=m;o=o+1|0}while((o&65535)<<16>>16!=f<<16>>16);o=l}else o=0;l=b[d>>1]|0;p=Ge(16,i,j)|0;k=p<<16>>16;if(p<<16>>16>0){f=l<<k;if((f>>k|0)!=(l|0))f=l>>31^2147483647}else{k=0-k<<16;if((k|0)<2031616)f=l>>(k>>16);else f=0}k=f+o|0;if((f^o|0)>-1&(k^o|0)<0){c[j>>2]=1;k=(o>>>31)+2147483647|0}p=i<<16>>16;i=i<<16>>16>0;if(i){f=o<<p;if((f>>p|0)!=(o|0))f=o>>31^2147483647}else{f=0-p<<16;if((f|0)<2031616)f=o>>(f>>16);else f=0}b[d>>1]=f>>>16;if(e<<16>>16>0){n=g<<16>>16;l=h<<16>>16;m=0;do{h=b[a+((Z(m,n)|0)+l<<1)>>1]|0;h=(h&65535)-((h&65535)>>>15&65535)|0;h=(h<<16>>31^h)<<16;f=(h>>15)+k|0;if((h>>16^k|0)>0&(f^k|0)<0){c[j>>2]=1;k=(k>>>31)+2147483647|0}else k=f;m=m+1|0}while((m&65535)<<16>>16!=e<<16>>16)}if(i){f=k<<p;if((f>>p|0)==(k|0)){j=f;j=j>>>16;j=j&65535;return j|0}j=k>>31^2147483647;j=j>>>16;j=j&65535;return j|0}else{f=0-p<<16;if((f|0)>=2031616){j=0;j=j>>>16;j=j&65535;return j|0}j=k>>(f>>16);j=j>>>16;j=j&65535;return j|0}return 0}function Rd(a,b,d){a=a|0;b=b|0;d=d|0;a=(b<<16>>16)+(a<<16>>16)|0;if((a|0)<=32767){if((a|0)<-32768){c[d>>2]=1;a=-32768}}else{c[d>>2]=1;a=32767}return a&65535|0}function Sd(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;y=i;i=i+32|0;w=y+12|0;x=y;b[w>>1]=1024;b[x>>1]=1024;k=b[a+2>>1]|0;h=b[a+20>>1]|0;e=((h+k|0)>>>2)+64512|0;b[w+2>>1]=e;h=((k-h|0)>>>2)+1024|0;b[x+2>>1]=h;k=b[a+4>>1]|0;f=b[a+18>>1]|0;e=((f+k|0)>>>2)-e|0;b[w+4>>1]=e;h=((k-f|0)>>>2)+h|0;b[x+4>>1]=h;f=b[a+6>>1]|0;k=b[a+16>>1]|0;e=((k+f|0)>>>2)-e|0;b[w+6>>1]=e;h=((f-k|0)>>>2)+h|0;b[x+6>>1]=h;k=b[a+8>>1]|0;f=b[a+14>>1]|0;e=((f+k|0)>>>2)-e|0;b[w+8>>1]=e;h=((k-f|0)>>>2)+h|0;b[x+8>>1]=h;f=b[a+10>>1]|0;k=b[a+12>>1]|0;e=((k+f|0)>>>2)-e|0;b[w+10>>1]=e;b[x+10>>1]=((f-k|0)>>>2)+h;h=b[3454]|0;k=h<<16>>16;a=b[w+2>>1]|0;f=(a<<16>>16<<14)+(k<<10)|0;s=f&-65536;f=(f>>>1)-(f>>16<<15)<<16;v=(((Z(f>>16,k)|0)>>15)+(Z(s>>16,k)|0)<<2)+-16777216|0;v=(b[w+4>>1]<<14)+v|0;j=v>>16;v=(v>>>1)-(j<<15)<<16;s=(((Z(v>>16,k)|0)>>15)+(Z(j,k)|0)<<2)-((f>>15)+s)|0;s=(b[w+6>>1]<<14)+s|0;f=s>>16;s=(s>>>1)-(f<<15)<<16;j=(((Z(s>>16,k)|0)>>15)+(Z(f,k)|0)<<2)-((v>>15)+(j<<16))|0;j=(b[w+8>>1]<<14)+j|0;v=j>>16;f=(e<<16>>3)+((((Z((j>>>1)-(v<<15)<<16>>16,k)|0)>>15)+(Z(v,k)|0)<<1)-((s>>15)+(f<<16)))|0;s=w+4|0;k=w;v=0;j=0;e=0;r=w+10|0;f=(f+33554432|0)>>>0<67108863?f>>>10&65535:(f|0)>33554431?32767:-32768;a:while(1){t=a<<16>>16<<14;q=k+6|0;p=k+8|0;o=j<<16>>16;while(1){if((o|0)>=60)break a;k=(o&65535)+1<<16>>16;l=b[6908+(k<<16>>16<<1)>>1]|0;u=l<<16>>16;j=t+(u<<10)|0;g=j&-65536;j=(j>>>1)-(j>>16<<15)<<16;m=(((Z(j>>16,u)|0)>>15)+(Z(g>>16,u)|0)<<2)+-16777216|0;n=b[s>>1]|0;m=(n<<16>>16<<14)+m|0;B=m>>16;m=(m>>>1)-(B<<15)<<16;g=(((Z(m>>16,u)|0)>>15)+(Z(B,u)|0)<<2)-((j>>15)+g)|0;j=b[q>>1]|0;g=(j<<16>>16<<14)+g|0;a=g>>16;g=(g>>>1)-(a<<15)<<16;B=(((Z(g>>16,u)|0)>>15)+(Z(a,u)|0)<<2)-((m>>15)+(B<<16))|0;m=b[p>>1]|0;B=(m<<16>>16<<14)+B|0;A=B>>16;a=(((Z((B>>>1)-(A<<15)<<16>>16,u)|0)>>15)+(Z(A,u)|0)<<1)-((g>>15)+(a<<16))|0;g=b[r>>1]|0;a=(g<<16>>16<<13)+a|0;a=(a+33554432|0)>>>0<67108863?a>>>10&65535:(a|0)>33554431?32767:-32768;if((Z(a<<16>>16,f<<16>>16)|0)<1){u=k;k=n;break}else{o=o+1|0;h=l;f=a}}s=g<<16>>16<<13;r=k<<16>>16<<14;n=j<<16>>16<<14;p=m<<16>>16<<14;g=l<<16>>16;o=4;while(1){A=(h<<16>>16>>>1)+(g>>>1)|0;g=A<<16;q=g>>16;g=t+(g>>6)|0;B=g&-65536;g=(g>>>1)-(g>>16<<15)<<16;m=r+((((Z(g>>16,q)|0)>>15)+(Z(B>>16,q)|0)<<2)+-16777216)|0;k=m>>16;m=(m>>>1)-(k<<15)<<16;B=n+((((Z(m>>16,q)|0)>>15)+(Z(k,q)|0)<<2)-((g>>15)+B))|0;g=B>>16;B=(B>>>1)-(g<<15)<<16;k=p+((((Z(B>>16,q)|0)>>15)+(Z(g,q)|0)<<2)-((m>>15)+(k<<16)))|0;m=k>>16;A=A&65535;g=s+((((Z((k>>>1)-(m<<15)<<16>>16,q)|0)>>15)+(Z(m,q)|0)<<1)-((B>>15)+(g<<16)))|0;g=(g+33554432|0)>>>0<67108863?g>>>10&65535:(g|0)>33554431?32767:-32768;B=(Z(g<<16>>16,a<<16>>16)|0)<1;q=B?l:A;a=B?a:g;h=B?A:h;f=B?g:f;o=o+-1<<16>>16;g=q<<16>>16;if(!(o<<16>>16)){l=g;j=h;h=q;break}else l=q}k=e<<16>>16;g=a<<16>>16;a=(f&65535)-g|0;f=a<<16;if(f){B=(a&65535)-(a>>>15&1)|0;B=B<<16>>31^B;a=(qe(B&65535)|0)<<16>>16;a=(Z((Td(16383,B<<16>>16<<a&65535)|0)<<16>>16,(j&65535)-l<<16>>16)|0)>>19-a;if((f|0)<0)a=0-(a<<16>>16)|0;h=l-((Z(a<<16>>16,g)|0)>>>10)&65535}b[c+(k<<1)>>1]=h;f=v<<16>>16==0?x:w;A=h<<16>>16;a=b[f+2>>1]|0;g=(a<<16>>16<<14)+(A<<10)|0;B=g&-65536;g=(g>>>1)-(g>>16<<15)<<16;t=(((Z(g>>16,A)|0)>>15)+(Z(B>>16,A)|0)<<2)+-16777216|0;t=(b[f+4>>1]<<14)+t|0;s=t>>16;t=(t>>>1)-(s<<15)<<16;B=(((Z(t>>16,A)|0)>>15)+(Z(s,A)|0)<<2)-((g>>15)+B)|0;B=(b[f+6>>1]<<14)+B|0;g=B>>16;B=(B>>>1)-(g<<15)<<16;s=(((Z(B>>16,A)|0)>>15)+(Z(g,A)|0)<<2)-((t>>15)+(s<<16))|0;s=(b[f+8>>1]<<14)+s|0;t=s>>16;e=e+1<<16>>16;g=(((Z((s>>>1)-(t<<15)<<16>>16,A)|0)>>15)+(Z(t,A)|0)<<1)-((B>>15)+(g<<16))|0;g=(b[f+10>>1]<<13)+g|0;if(e<<16>>16<10){s=f+4|0;k=f;v=v^1;j=u;r=f+10|0;f=(g+33554432|0)>>>0<67108863?g>>>10&65535:(g|0)>33554431?32767:-32768}else{z=13;break}}if((z|0)==13){i=y;return}b[c>>1]=b[d>>1]|0;b[c+2>>1]=b[d+2>>1]|0;b[c+4>>1]=b[d+4>>1]|0;b[c+6>>1]=b[d+6>>1]|0;b[c+8>>1]=b[d+8>>1]|0;b[c+10>>1]=b[d+10>>1]|0;b[c+12>>1]=b[d+12>>1]|0;b[c+14>>1]=b[d+14>>1]|0;b[c+16>>1]=b[d+16>>1]|0;b[c+18>>1]=b[d+18>>1]|0;i=y;return}function Td(a,b){a=a|0;b=b|0;var c=0,d=0,e=0,f=0,g=0,h=0;e=b<<16>>16;if(a<<16>>16<1?1:a<<16>>16>b<<16>>16){e=0;return e|0}if(a<<16>>16==b<<16>>16){e=32767;return e|0}d=e<<1;c=e<<2;f=a<<16>>16<<3;a=(f|0)<(c|0);f=f-(a?0:c)|0;a=a?0:4;g=(f|0)<(d|0);f=f-(g?0:d)|0;b=(f|0)<(e|0);a=(b&1|(g?a:a|2))<<3^8;b=f-(b?0:e)<<3;if((b|0)>=(c|0)){b=b-c|0;a=a&65528|4}f=(b|0)<(d|0);g=b-(f?0:d)|0;b=(g|0)<(e|0);a=(b&1^1|(f?a:a|2))<<16>>13;b=g-(b?0:e)<<3;if((b|0)>=(c|0)){b=b-c|0;a=a&65528|4}f=(b|0)<(d|0);g=b-(f?0:d)|0;b=(g|0)<(e|0);a=(b&1^1|(f?a:a|2))<<16>>13;b=g-(b?0:e)<<3;if((b|0)>=(c|0)){b=b-c|0;a=a&65528|4}h=(b|0)<(d|0);f=b-(h?0:d)|0;g=(f|0)<(e|0);b=(g&1^1|(h?a:a|2))<<16>>13;a=f-(g?0:e)<<3;if((a|0)>=(c|0)){a=a-c|0;b=b&65528|4}h=(a|0)<(d|0);h=((a-(h?0:d)|0)>=(e|0)|(h?b:b|2))&65535;return h|0}function Ud(a){a=a|0;if(!a){a=-1;return a|0}b[a>>1]=-14336;b[a+8>>1]=-2381;b[a+2>>1]=-14336;b[a+10>>1]=-2381;b[a+4>>1]=-14336;b[a+12>>1]=-2381;b[a+6>>1]=-14336;b[a+14>>1]=-2381;a=0;return a|0}function Vd(a,d,f,g,h,j,k,l){a=a|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;l=l|0;var m=0,n=0,o=0,p=0,q=0,r=0;r=i;i=i+16|0;p=r+2|0;q=r;m=0;n=10;while(1){o=b[f>>1]|0;o=((Z(o,o)|0)>>>3)+m|0;m=b[f+2>>1]|0;m=o+((Z(m,m)|0)>>>3)|0;o=b[f+4>>1]|0;o=m+((Z(o,o)|0)>>>3)|0;m=b[f+6>>1]|0;m=o+((Z(m,m)|0)>>>3)|0;n=n+-1<<16>>16;if(!(n<<16>>16))break;else f=f+8|0}n=m<<4;n=(n|0)<0?2147483647:n;if((d|0)==7){de(((Ce(n,l)|0)<<16>>16)*52428|0,p,q,l);o=e[p>>1]<<16;n=b[q>>1]<<1;d=b[a+8>>1]|0;m=(d<<16>>16)*88|0;if(d<<16>>16>-1&(m|0)<-783741){c[l>>2]=1;f=2147483647}else f=m+783741|0;d=(b[a+10>>1]|0)*74|0;m=d+f|0;if((d^f|0)>-1&(m^f|0)<0){c[l>>2]=1;f=(f>>>31)+2147483647|0}else f=m;d=(b[a+12>>1]|0)*44|0;m=d+f|0;if((d^f|0)>-1&(m^f|0)<0){c[l>>2]=1;f=(f>>>31)+2147483647|0}else f=m;a=(b[a+14>>1]|0)*24|0;m=a+f|0;if((a^f|0)>-1&(m^f|0)<0){c[l>>2]=1;m=(f>>>31)+2147483647|0}a=o+-1966080+n|0;f=m-a|0;if(((f^m)&(m^a)|0)<0){c[l>>2]=1;f=(m>>>31)+2147483647|0}l=f>>17;b[g>>1]=l;l=(f>>2)-(l<<15)|0;l=l&65535;b[h>>1]=l;i=r;return}o=pe(n)|0;m=o<<16>>16;if(o<<16>>16>0){f=n<<m;if((f>>m|0)==(n|0))n=f;else n=n>>31^2147483647}else{m=0-m<<16;if((m|0)<2031616)n=n>>(m>>16);else n=0}ee(n,o,p,q);p=Z(b[p>>1]|0,-49320)|0;m=(Z(b[q>>1]|0,-24660)|0)>>15;m=(m&65536|0)==0?m:m|-65536;q=m<<1;f=q+p|0;if((q^p|0)>-1&(f^q|0)<0){c[l>>2]=1;f=(m>>>30&1)+2147483647|0}switch(d|0){case 6:{m=f+2134784|0;if((f|0)>-1&(m^f|0)<0){c[l>>2]=1;m=(f>>>31)+2147483647|0}break}case 5:{b[k>>1]=n>>>16;b[j>>1]=-11-(o&65535);m=f+2183936|0;if((f|0)>-1&(m^f|0)<0){c[l>>2]=1;m=(f>>>31)+2147483647|0}break}case 4:{m=f+2085632|0;if((f|0)>-1&(m^f|0)<0){c[l>>2]=1;m=(f>>>31)+2147483647|0}break}case 3:{m=f+2065152|0;if((f|0)>-1&(m^f|0)<0){c[l>>2]=1;m=(f>>>31)+2147483647|0}break}default:{m=f+2134784|0;if((f|0)>-1&(m^f|0)<0){c[l>>2]=1;m=(f>>>31)+2147483647|0}}}do{if((m|0)<=2097151)if((m|0)<-2097152){c[l>>2]=1;f=-2147483648;break}else{f=m<<10;break}else{c[l>>2]=1;f=2147483647}}while(0);k=(b[a>>1]|0)*11142|0;m=k+f|0;if((k^f|0)>-1&(m^f|0)<0){c[l>>2]=1;m=(f>>>31)+2147483647|0}k=(b[a+2>>1]|0)*9502|0;f=k+m|0;if((k^m|0)>-1&(f^m|0)<0){c[l>>2]=1;f=(m>>>31)+2147483647|0}k=(b[a+4>>1]|0)*5570|0;m=k+f|0;if((k^f|0)>-1&(m^f|0)<0){c[l>>2]=1;m=(f>>>31)+2147483647|0}a=(b[a+6>>1]|0)*3112|0;f=a+m|0;if((a^m|0)>-1&(f^m|0)<0){c[l>>2]=1;f=(m>>>31)+2147483647|0}f=Z(f>>16,(d|0)==4?10878:10886)|0;if((f|0)<0)f=~((f^-256)>>8);else f=f>>8;b[g>>1]=f>>>16;if((f|0)<0)m=~((f^-2)>>1);else m=f>>1;g=f>>16<<15;f=m-g|0;if(((f^m)&(g^m)|0)>=0){l=f;l=l&65535;b[h>>1]=l;i=r;return}c[l>>2]=1;l=(m>>>31)+2147483647|0;l=l&65535;b[h>>1]=l;i=r;return}function Wd(a,c,d){a=a|0;c=c|0;d=d|0;var e=0,f=0,g=0;f=a+4|0;b[a+6>>1]=b[f>>1]|0;g=a+12|0;b[a+14>>1]=b[g>>1]|0;e=a+2|0;b[f>>1]=b[e>>1]|0;f=a+10|0;b[g>>1]=b[f>>1]|0;b[e>>1]=b[a>>1]|0;e=a+8|0;b[f>>1]=b[e>>1]|0;b[e>>1]=c;b[a>>1]=d;return}function Xd(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0;g=Rd(0,b[a+8>>1]|0,e)|0;g=Rd(g,b[a+10>>1]|0,e)|0;g=Rd(g,b[a+12>>1]|0,e)|0;g=Rd(g,b[a+14>>1]|0,e)|0;f=g<<16>>16>>2;f=(g<<16>>16<0?f|49152:f)&65535;b[c>>1]=f<<16>>16<-2381?-2381:f;c=Rd(0,b[a>>1]|0,e)|0;c=Rd(c,b[a+2>>1]|0,e)|0;c=Rd(c,b[a+4>>1]|0,e)|0;e=Rd(c,b[a+6>>1]|0,e)|0;a=e<<16>>16>>2;a=(e<<16>>16<0?a|49152:a)&65535;b[d>>1]=a<<16>>16<-14336?-14336:a;return}function Yd(a){a=a|0;c[a>>2]=6892;c[a+4>>2]=8180;c[a+8>>2]=21e3;c[a+12>>2]=9716;c[a+16>>2]=22024;c[a+20>>2]=12788;c[a+24>>2]=24072;c[a+28>>2]=26120;c[a+32>>2]=28168;c[a+36>>2]=6876;c[a+40>>2]=7452;c[a+44>>2]=8140;c[a+48>>2]=20980;c[a+52>>2]=16884;c[a+56>>2]=17908;c[a+60>>2]=7980;c[a+64>>2]=8160;c[a+68>>2]=6678;c[a+72>>2]=6646;c[a+76>>2]=6614;c[a+80>>2]=29704;c[a+84>>2]=28680;c[a+88>>2]=3720;c[a+92>>2]=8;c[a+96>>2]=4172;c[a+100>>2]=44;c[a+104>>2]=3436;c[a+108>>2]=30316;c[a+112>>2]=30796;c[a+116>>2]=31276;c[a+120>>2]=7472;c[a+124>>2]=7552;c[a+128>>2]=7632;c[a+132>>2]=7712;return}function Zd(a,c){a=a|0;c=c|0;var d=0,e=0,f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0;n=i;i=i+48|0;l=n+18|0;m=n;k=c<<16>>16;Oe(m|0,a|0,k<<1|0)|0;if(c<<16>>16>0){d=0;e=0}else{m=k>>1;m=l+(m<<1)|0;m=b[m>>1]|0;m=m<<16>>16;m=a+(m<<1)|0;m=b[m>>1]|0;i=n;return m|0}do{j=0;h=-32767;while(1){f=b[m+(j<<1)>>1]|0;g=f<<16>>16<h<<16>>16;e=g?e:j&65535;j=j+1|0;if((j&65535)<<16>>16==c<<16>>16)break;else h=g?h:f}b[m+(e<<16>>16<<1)>>1]=-32768;b[l+(d<<1)>>1]=e;d=d+1|0}while((d&65535)<<16>>16!=c<<16>>16);m=k>>1;m=l+(m<<1)|0;m=b[m>>1]|0;m=m<<16>>16;m=a+(m<<1)|0;m=b[m>>1]|0;i=n;return m|0}function _d(a,c,d,e,f){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;g=i;i=i+32|0;h=g;A=c+2|0;z=h+2|0;b[h>>1]=((b[c>>1]|0)>>>1)+((b[a>>1]|0)>>>1);y=c+4|0;x=h+4|0;b[z>>1]=((b[A>>1]|0)>>>1)+((b[a+2>>1]|0)>>>1);w=c+6|0;v=h+6|0;b[x>>1]=((b[y>>1]|0)>>>1)+((b[a+4>>1]|0)>>>1);u=c+8|0;t=h+8|0;b[v>>1]=((b[w>>1]|0)>>>1)+((b[a+6>>1]|0)>>>1);s=c+10|0;r=h+10|0;b[t>>1]=((b[u>>1]|0)>>>1)+((b[a+8>>1]|0)>>>1);q=c+12|0;p=h+12|0;b[r>>1]=((b[s>>1]|0)>>>1)+((b[a+10>>1]|0)>>>1);o=c+14|0;n=h+14|0;b[p>>1]=((b[q>>1]|0)>>>1)+((b[a+12>>1]|0)>>>1);m=c+16|0;l=h+16|0;b[n>>1]=((b[o>>1]|0)>>>1)+((b[a+14>>1]|0)>>>1);k=c+18|0;j=h+18|0;b[l>>1]=((b[m>>1]|0)>>>1)+((b[a+16>>1]|0)>>>1);b[j>>1]=((b[k>>1]|0)>>>1)+((b[a+18>>1]|0)>>>1);he(h,e,f);he(c,e+22|0,f);b[h>>1]=((b[d>>1]|0)>>>1)+((b[c>>1]|0)>>>1);b[z>>1]=((b[d+2>>1]|0)>>>1)+((b[A>>1]|0)>>>1);b[x>>1]=((b[d+4>>1]|0)>>>1)+((b[y>>1]|0)>>>1);b[v>>1]=((b[d+6>>1]|0)>>>1)+((b[w>>1]|0)>>>1);b[t>>1]=((b[d+8>>1]|0)>>>1)+((b[u>>1]|0)>>>1);b[r>>1]=((b[d+10>>1]|0)>>>1)+((b[s>>1]|0)>>>1);b[p>>1]=((b[d+12>>1]|0)>>>1)+((b[q>>1]|0)>>>1);b[n>>1]=((b[d+14>>1]|0)>>>1)+((b[o>>1]|0)>>>1);b[l>>1]=((b[d+16>>1]|0)>>>1)+((b[m>>1]|0)>>>1);b[j>>1]=((b[d+18>>1]|0)>>>1)+((b[k>>1]|0)>>>1);he(h,e+44|0,f);he(d,e+66|0,f);i=g;return}function $d(a,c,d,e,f){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;var g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0;g=i;i=i+32|0;h=g;A=c+2|0;z=h+2|0;b[h>>1]=((b[c>>1]|0)>>>1)+((b[a>>1]|0)>>>1);y=c+4|0;x=h+4|0;b[z>>1]=((b[A>>1]|0)>>>1)+((b[a+2>>1]|0)>>>1);w=c+6|0;v=h+6|0;b[x>>1]=((b[y>>1]|0)>>>1)+((b[a+4>>1]|0)>>>1);u=c+8|0;t=h+8|0;b[v>>1]=((b[w>>1]|0)>>>1)+((b[a+6>>1]|0)>>>1);s=c+10|0;r=h+10|0;b[t>>1]=((b[u>>1]|0)>>>1)+((b[a+8>>1]|0)>>>1);q=c+12|0;p=h+12|0;b[r>>1]=((b[s>>1]|0)>>>1)+((b[a+10>>1]|0)>>>1);o=c+14|0;n=h+14|0;b[p>>1]=((b[q>>1]|0)>>>1)+((b[a+12>>1]|0)>>>1);m=c+16|0;l=h+16|0;b[n>>1]=((b[o>>1]|0)>>>1)+((b[a+14>>1]|0)>>>1);k=c+18|0;j=h+18|0;b[l>>1]=((b[m>>1]|0)>>>1)+((b[a+16>>1]|0)>>>1);b[j>>1]=((b[k>>1]|0)>>>1)+((b[a+18>>1]|0)>>>1);he(h,e,f);b[h>>1]=((b[d>>1]|0)>>>1)+((b[c>>1]|0)>>>1);b[z>>1]=((b[d+2>>1]|0)>>>1)+((b[A>>1]|0)>>>1);b[x>>1]=((b[d+4>>1]|0)>>>1)+((b[y>>1]|0)>>>1);b[v>>1]=((b[d+6>>1]|0)>>>1)+((b[w>>1]|0)>>>1);b[t>>1]=((b[d+8>>1]|0)>>>1)+((b[u>>1]|0)>>>1);b[r>>1]=((b[d+10>>1]|0)>>>1)+((b[s>>1]|0)>>>1);b[p>>1]=((b[d+12>>1]|0)>>>1)+((b[q>>1]|0)>>>1);b[n>>1]=((b[d+14>>1]|0)>>>1)+((b[o>>1]|0)>>>1);b[l>>1]=((b[d+16>>1]|0)>>>1)+((b[m>>1]|0)>>>1);b[j>>1]=((b[d+18>>1]|0)>>>1)+((b[k>>1]|0)>>>1);he(h,e+44|0,f);i=g;return}function ae(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;f=i;i=i+32|0;g=f;H=b[a>>1]|0;b[g>>1]=H-(H>>>2)+((b[c>>1]|0)>>>2);H=a+2|0;E=b[H>>1]|0;I=c+2|0;G=g+2|0;b[G>>1]=E-(E>>>2)+((b[I>>1]|0)>>>2);E=a+4|0;B=b[E>>1]|0;F=c+4|0;D=g+4|0;b[D>>1]=B-(B>>>2)+((b[F>>1]|0)>>>2);B=a+6|0;y=b[B>>1]|0;C=c+6|0;A=g+6|0;b[A>>1]=y-(y>>>2)+((b[C>>1]|0)>>>2);y=a+8|0;v=b[y>>1]|0;z=c+8|0;x=g+8|0;b[x>>1]=v-(v>>>2)+((b[z>>1]|0)>>>2);v=a+10|0;s=b[v>>1]|0;w=c+10|0;u=g+10|0;b[u>>1]=s-(s>>>2)+((b[w>>1]|0)>>>2);s=a+12|0;p=b[s>>1]|0;t=c+12|0;r=g+12|0;b[r>>1]=p-(p>>>2)+((b[t>>1]|0)>>>2);p=a+14|0;m=b[p>>1]|0;q=c+14|0;o=g+14|0;b[o>>1]=m-(m>>>2)+((b[q>>1]|0)>>>2);m=a+16|0;j=b[m>>1]|0;n=c+16|0;l=g+16|0;b[l>>1]=j-(j>>>2)+((b[n>>1]|0)>>>2);j=a+18|0;J=b[j>>1]|0;k=c+18|0;h=g+18|0;b[h>>1]=J-(J>>>2)+((b[k>>1]|0)>>>2);he(g,d,e);b[g>>1]=((b[a>>1]|0)>>>1)+((b[c>>1]|0)>>>1);b[G>>1]=((b[H>>1]|0)>>>1)+((b[I>>1]|0)>>>1);b[D>>1]=((b[E>>1]|0)>>>1)+((b[F>>1]|0)>>>1);b[A>>1]=((b[B>>1]|0)>>>1)+((b[C>>1]|0)>>>1);b[x>>1]=((b[y>>1]|0)>>>1)+((b[z>>1]|0)>>>1);b[u>>1]=((b[v>>1]|0)>>>1)+((b[w>>1]|0)>>>1);b[r>>1]=((b[s>>1]|0)>>>1)+((b[t>>1]|0)>>>1);b[o>>1]=((b[p>>1]|0)>>>1)+((b[q>>1]|0)>>>1);b[l>>1]=((b[m>>1]|0)>>>1)+((b[n>>1]|0)>>>1);b[h>>1]=((b[j>>1]|0)>>>1)+((b[k>>1]|0)>>>1);he(g,d+22|0,e);J=b[c>>1]|0;b[g>>1]=J-(J>>>2)+((b[a>>1]|0)>>>2);a=b[I>>1]|0;b[G>>1]=a-(a>>>2)+((b[H>>1]|0)>>>2);a=b[F>>1]|0;b[D>>1]=a-(a>>>2)+((b[E>>1]|0)>>>2);a=b[C>>1]|0;b[A>>1]=a-(a>>>2)+((b[B>>1]|0)>>>2);a=b[z>>1]|0;b[x>>1]=a-(a>>>2)+((b[y>>1]|0)>>>2);a=b[w>>1]|0;b[u>>1]=a-(a>>>2)+((b[v>>1]|0)>>>2);a=b[t>>1]|0;b[r>>1]=a-(a>>>2)+((b[s>>1]|0)>>>2);a=b[q>>1]|0;b[o>>1]=a-(a>>>2)+((b[p>>1]|0)>>>2);a=b[n>>1]|0;b[l>>1]=a-(a>>>2)+((b[m>>1]|0)>>>2);a=b[k>>1]|0;b[h>>1]=a-(a>>>2)+((b[j>>1]|0)>>>2);he(g,d+44|0,e);he(c,d+66|0,e);i=f;return}function be(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0;f=i;i=i+32|0;g=f;H=b[a>>1]|0;b[g>>1]=H-(H>>>2)+((b[c>>1]|0)>>>2);H=a+2|0;E=b[H>>1]|0;I=c+2|0;G=g+2|0;b[G>>1]=E-(E>>>2)+((b[I>>1]|0)>>>2);E=a+4|0;B=b[E>>1]|0;F=c+4|0;D=g+4|0;b[D>>1]=B-(B>>>2)+((b[F>>1]|0)>>>2);B=a+6|0;y=b[B>>1]|0;C=c+6|0;A=g+6|0;b[A>>1]=y-(y>>>2)+((b[C>>1]|0)>>>2);y=a+8|0;v=b[y>>1]|0;z=c+8|0;x=g+8|0;b[x>>1]=v-(v>>>2)+((b[z>>1]|0)>>>2);v=a+10|0;s=b[v>>1]|0;w=c+10|0;u=g+10|0;b[u>>1]=s-(s>>>2)+((b[w>>1]|0)>>>2);s=a+12|0;p=b[s>>1]|0;t=c+12|0;r=g+12|0;b[r>>1]=p-(p>>>2)+((b[t>>1]|0)>>>2);p=a+14|0;m=b[p>>1]|0;q=c+14|0;o=g+14|0;b[o>>1]=m-(m>>>2)+((b[q>>1]|0)>>>2);m=a+16|0;j=b[m>>1]|0;n=c+16|0;l=g+16|0;b[l>>1]=j-(j>>>2)+((b[n>>1]|0)>>>2);j=a+18|0;J=b[j>>1]|0;k=c+18|0;h=g+18|0;b[h>>1]=J-(J>>>2)+((b[k>>1]|0)>>>2);he(g,d,e);b[g>>1]=((b[a>>1]|0)>>>1)+((b[c>>1]|0)>>>1);b[G>>1]=((b[H>>1]|0)>>>1)+((b[I>>1]|0)>>>1);b[D>>1]=((b[E>>1]|0)>>>1)+((b[F>>1]|0)>>>1);b[A>>1]=((b[B>>1]|0)>>>1)+((b[C>>1]|0)>>>1);b[x>>1]=((b[y>>1]|0)>>>1)+((b[z>>1]|0)>>>1);b[u>>1]=((b[v>>1]|0)>>>1)+((b[w>>1]|0)>>>1);b[r>>1]=((b[s>>1]|0)>>>1)+((b[t>>1]|0)>>>1);b[o>>1]=((b[p>>1]|0)>>>1)+((b[q>>1]|0)>>>1);b[l>>1]=((b[m>>1]|0)>>>1)+((b[n>>1]|0)>>>1);b[h>>1]=((b[j>>1]|0)>>>1)+((b[k>>1]|0)>>>1);he(g,d+22|0,e);c=b[c>>1]|0;b[g>>1]=c-(c>>>2)+((b[a>>1]|0)>>>2);a=b[I>>1]|0;b[G>>1]=a-(a>>>2)+((b[H>>1]|0)>>>2);a=b[F>>1]|0;b[D>>1]=a-(a>>>2)+((b[E>>1]|0)>>>2);a=b[C>>1]|0;b[A>>1]=a-(a>>>2)+((b[B>>1]|0)>>>2);a=b[z>>1]|0;b[x>>1]=a-(a>>>2)+((b[y>>1]|0)>>>2);a=b[w>>1]|0;b[u>>1]=a-(a>>>2)+((b[v>>1]|0)>>>2);a=b[t>>1]|0;b[r>>1]=a-(a>>>2)+((b[s>>1]|0)>>>2);a=b[q>>1]|0;b[o>>1]=a-(a>>>2)+((b[p>>1]|0)>>>2);a=b[n>>1]|0;b[l>>1]=a-(a>>>2)+((b[m>>1]|0)>>>2);a=b[k>>1]|0;b[h>>1]=a-(a>>>2)+((b[j>>1]|0)>>>2);he(g,d+44|0,e);i=f;return}function ce(a,c){a=a|0;c=c|0;var d=0,f=0;if((a|0)<1){c=1073741823;return c|0}d=(pe(a)|0)<<16>>16;c=30-d|0;a=a<<d>>(c&1^1);d=(a>>25<<16)+-1048576>>16;f=b[7030+(d<<1)>>1]|0;c=(f<<16)-(Z(f-(e[7030+(d+1<<1)>>1]|0)<<16>>15,a>>>10&32767)|0)>>(c<<16>>17)+1;return c|0}function de(a,b,c,d){a=a|0;b=b|0;c=c|0;d=d|0;d=pe(a)|0;ee(a<<(d<<16>>16),d,b,c);return}function ee(a,c,d,f){a=a|0;c=c|0;d=d|0;f=f|0;if((a|0)<1){b[d>>1]=0;d=0;b[f>>1]=d;return}else{b[d>>1]=30-(c&65535);d=(a>>25<<16)+-2097152>>16;c=b[7128+(d<<1)>>1]|0;d=((c<<16)-(Z(a>>>9&65534,c-(e[7128+(d+1<<1)>>1]|0)<<16>>16)|0)|0)>>>16&65535;b[f>>1]=d;return}}function fe(a,c,d){a=a|0;c=c|0;d=d|0;var f=0,g=0;f=a+2|0;d=b[f>>1]|0;b[c>>1]=d;g=a+4|0;b[c+2>>1]=(e[g>>1]|0)-(e[a>>1]|0);b[c+4>>1]=(e[a+6>>1]|0)-(e[f>>1]|0);f=a+8|0;b[c+6>>1]=(e[f>>1]|0)-(e[g>>1]|0);b[c+8>>1]=(e[a+10>>1]|0)-(e[a+6>>1]|0);g=a+12|0;b[c+10>>1]=(e[g>>1]|0)-(e[f>>1]|0);b[c+12>>1]=(e[a+14>>1]|0)-(e[a+10>>1]|0);b[c+14>>1]=(e[a+16>>1]|0)-(e[g>>1]|0);b[c+16>>1]=(e[a+18>>1]|0)-(e[a+14>>1]|0);b[c+18>>1]=16384-(e[a+16>>1]|0);a=10;g=c;while(1){d=d<<16>>16;c=(d<<16)+-120782848|0;if((c|0)>0)c=1843-((c>>16)*12484>>16)|0;else c=3427-((d*56320|0)>>>16)|0;f=g+2|0;b[g>>1]=c<<3;a=a+-1<<16>>16;if(!(a<<16>>16))break;d=b[f>>1]|0;g=f}return}function ge(a,b,c){a=a|0;b=b|0;c=c|0;c=b<<16>>16;if(b<<16>>16>31){b=0;return b|0}if(b<<16>>16>0)return((1<<c+-1&a|0)!=0&1)+(b<<16>>16<31?a>>c:0)|0;c=0-c<<16>>16;b=a<<c;b=(b>>c|0)==(a|0)?b:a>>31^2147483647;return b|0}function he(a,d,e){a=a|0;d=d|0;e=e|0;var f=0,g=0,h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;s=i;i=i+48|0;q=s+24|0;r=s;o=q+4|0;c[q>>2]=16777216;f=0-(b[a>>1]|0)|0;p=q+8|0;c[o>>2]=f<<10;g=b[a+4>>1]|0;l=f>>6;c[p>>2]=33554432-(((Z((f<<9)-(l<<15)<<16>>16,g)|0)>>15)+(Z(l,g)|0)<<2);l=q+4|0;g=(c[l>>2]|0)-(g<<10)|0;c[l>>2]=g;l=q+12|0;f=q+4|0;c[l>>2]=g;e=b[a+8>>1]|0;h=g;m=1;while(1){k=l+-4|0;j=c[k>>2]|0;n=j>>16;c[l>>2]=h+g-(((Z((j>>>1)-(n<<15)<<16>>16,e)|0)>>15)+(Z(n,e)|0)<<2);if((m|0)==2)break;h=c[l+-12>>2]|0;l=k;g=j;m=m+1|0}c[f>>2]=(c[f>>2]|0)-(e<<10);e=q+16|0;f=c[q+8>>2]|0;c[e>>2]=f;k=b[a+12>>1]|0;g=f;l=1;while(1){j=e+-4|0;h=c[j>>2]|0;n=h>>16;c[e>>2]=g+f-(((Z((h>>>1)-(n<<15)<<16>>16,k)|0)>>15)+(Z(n,k)|0)<<2);if((l|0)==3)break;g=c[e+-12>>2]|0;e=j;f=h;l=l+1|0}e=q+4|0;c[e>>2]=(c[e>>2]|0)-(k<<10);e=q+20|0;g=c[q+12>>2]|0;c[e>>2]=g;f=b[a+16>>1]|0;h=g;l=1;while(1){k=e+-4|0;j=c[k>>2]|0;n=j>>16;c[e>>2]=h+g-(((Z((j>>>1)-(n<<15)<<16>>16,f)|0)>>15)+(Z(n,f)|0)<<2);if((l|0)==4)break;h=c[e+-12>>2]|0;e=k;g=j;l=l+1|0}l=q+4|0;c[l>>2]=(c[l>>2]|0)-(f<<10);c[r>>2]=16777216;l=0-(b[a+2>>1]|0)|0;n=r+8|0;c[r+4>>2]=l<<10;f=b[a+6>>1]|0;m=l>>6;c[n>>2]=33554432-(((Z((l<<9)-(m<<15)<<16>>16,f)|0)>>15)+(Z(m,f)|0)<<2);m=r+4|0;f=(c[m>>2]|0)-(f<<10)|0;c[m>>2]=f;m=r+12|0;l=r+4|0;c[m>>2]=f;k=b[a+10>>1]|0;g=f;e=1;while(1){j=m+-4|0;h=c[j>>2]|0;t=h>>16;c[m>>2]=g+f-(((Z((h>>>1)-(t<<15)<<16>>16,k)|0)>>15)+(Z(t,k)|0)<<2);if((e|0)==2)break;g=c[m+-12>>2]|0;m=j;f=h;e=e+1|0}c[l>>2]=(c[l>>2]|0)-(k<<10);l=r+16|0;f=c[r+8>>2]|0;c[l>>2]=f;k=b[a+14>>1]|0;g=f;e=1;while(1){j=l+-4|0;h=c[j>>2]|0;t=h>>16;c[l>>2]=g+f-(((Z((h>>>1)-(t<<15)<<16>>16,k)|0)>>15)+(Z(t,k)|0)<<2);if((e|0)==3)break;g=c[l+-12>>2]|0;l=j;f=h;e=e+1|0}e=r+4|0;c[e>>2]=(c[e>>2]|0)-(k<<10);e=r+20|0;k=c[r+12>>2]|0;c[e>>2]=k;f=b[a+18>>1]|0;j=k;l=1;while(1){g=e+-4|0;h=c[g>>2]|0;t=h>>16;c[e>>2]=j+k-(((Z((h>>>1)-(t<<15)<<16>>16,f)|0)>>15)+(Z(t,f)|0)<<2);if((l|0)==4)break;j=c[e+-12>>2]|0;e=g;k=h;l=l+1|0}j=(c[r+4>>2]|0)-(f<<10)|0;m=q+20|0;k=r+20|0;l=c[q+16>>2]|0;a=(c[m>>2]|0)+l|0;c[m>>2]=a;m=c[r+16>>2]|0;t=(c[k>>2]|0)-m|0;c[k>>2]=t;k=c[q+12>>2]|0;l=l+k|0;c[q+16>>2]=l;h=c[r+12>>2]|0;m=m-h|0;c[r+16>>2]=m;f=c[p>>2]|0;k=k+f|0;c[q+12>>2]=k;g=c[n>>2]|0;p=h-g|0;c[r+12>>2]=p;h=c[o>>2]|0;n=f+h|0;c[q+8>>2]=n;o=g-j|0;c[r+8>>2]=o;q=h+(c[q>>2]|0)|0;r=j-(c[r>>2]|0)|0;b[d>>1]=4096;q=q+4096|0;b[d+2>>1]=(q+r|0)>>>13;b[d+20>>1]=(q-r|0)>>>13;r=n+4096|0;b[d+4>>1]=(r+o|0)>>>13;b[d+18>>1]=(r-o|0)>>>13;r=k+4096|0;b[d+6>>1]=(r+p|0)>>>13;b[d+16>>1]=(r-p|0)>>>13;r=l+4096|0;b[d+8>>1]=(r+m|0)>>>13;b[d+14>>1]=(r-m|0)>>>13;r=a+4096|0;b[d+10>>1]=(r+t|0)>>>13;b[d+12>>1]=(r-t|0)>>>13;i=s;return}function ie(a){a=a|0;var d=0,e=0,f=0,g=0,h=0;if(!a){h=-1;return h|0}c[a>>2]=0;d=Je(44)|0;if(!d){h=-1;return h|0}e=d+40|0;if((xe(e)|0)<<16>>16){h=-1;return h|0}f=d;g=7452;h=f+20|0;do{b[f>>1]=b[g>>1]|0;f=f+2|0;g=g+2|0}while((f|0)<(h|0));f=d+20|0;g=7452;h=f+20|0;do{b[f>>1]=b[g>>1]|0;f=f+2|0;g=g+2|0}while((f|0)<(h|0));ye(c[e>>2]|0)|0;c[a>>2]=d;h=0;return h|0}function je(a){a=a|0;var d=0,e=0,f=0;if(!a){f=-1;return f|0}d=a;e=7452;f=d+20|0;do{b[d>>1]=b[e>>1]|0;d=d+2|0;e=e+2|0}while((d|0)<(f|0));d=a+20|0;e=7452;f=d+20|0;do{b[d>>1]=b[e>>1]|0;d=d+2|0;e=e+2|0}while((d|0)<(f|0));ye(c[a+40>>2]|0)|0;f=0;return f|0}function ke(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;ze(b+40|0);Ke(c[a>>2]|0);c[a>>2]=0;return}function le(a,d,e,f,g,h,j,k){a=a|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;j=j|0;k=k|0;var l=0,m=0,n=0,o=0,p=0;p=i;i=i+64|0;o=p+44|0;l=p+24|0;m=p+4|0;n=p;if((d|0)==7){Sd(f+22|0,l,a,k);Sd(f+66|0,h,l,k);$d(a,l,h,f,k);if((e|0)==8)f=6;else{ve(c[a+40>>2]|0,l,h,m,o,c[j>>2]|0,k);_d(a+20|0,m,o,g,k);g=(c[j>>2]|0)+10|0;f=7}}else{Sd(f+66|0,h,a,k);be(a,h,f,k);if((e|0)==8)f=6;else{te(c[a+40>>2]|0,d,h,o,c[j>>2]|0,n,k);ae(a+20|0,o,g,k);g=(c[j>>2]|0)+6|0;f=7}}if((f|0)==6){f=a;g=f+20|0;do{b[f>>1]=b[h>>1]|0;f=f+2|0;h=h+2|0}while((f|0)<(g|0));i=p;return}else if((f|0)==7){c[j>>2]=g;f=a;g=f+20|0;do{b[f>>1]=b[h>>1]|0;f=f+2|0;h=h+2|0}while((f|0)<(g|0));f=a+20|0;h=o;g=f+20|0;do{b[f>>1]=b[h>>1]|0;f=f+2|0;h=h+2|0}while((f|0)<(g|0));i=p;return}}function me(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0;if(d<<16>>16>0)e=0;else return;do{g=b[a+(e<<1)>>1]|0;h=g>>8;f=b[7194+(h<<1)>>1]|0;b[c+(e<<1)>>1]=((Z((b[7194+(h+1<<1)>>1]|0)-f|0,g&255)|0)>>>8)+f;e=e+1|0}while((e&65535)<<16>>16!=d<<16>>16);return}function ne(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0;e=(d<<16>>16)+-1|0;d=e&65535;if(d<<16>>16<=-1)return;f=63;h=c+(e<<1)|0;g=a+(e<<1)|0;while(1){a=b[g>>1]|0;c=f;while(1){e=c<<16>>16;f=b[7194+(e<<1)>>1]|0;if(a<<16>>16>f<<16>>16)c=c+-1<<16>>16;else break}b[h>>1]=(((Z(b[7324+(e<<1)>>1]|0,(a<<16>>16)-(f<<16>>16)|0)|0)+2048|0)>>>12)+(e<<8);d=d+-1<<16>>16;if(d<<16>>16>-1){f=c;h=h+-2|0;g=g+-2|0}else break}return}function oe(a,b,d){a=a|0;b=b|0;d=d|0;a=(Z(b<<16>>16,a<<16>>16)|0)+16384>>15;a=a|0-(a&65536);if((a|0)<=32767){if((a|0)<-32768){c[d>>2]=1;a=-32768}}else{c[d>>2]=1;a=32767}return a&65535|0}function pe(a){a=a|0;var b=0;a:do{if((a|0)!=0?(b=a-(a>>>31)|0,b=b>>31^b,(b&1073741824|0)==0):0){a=b;b=0;while(1){if(a&536870912){a=7;break}if(a&268435456){a=8;break}if(a&134217728){a=9;break}b=b+4<<16>>16;a=a<<4;if(a&1073741824)break a}if((a|0)==7){b=b|1;break}else if((a|0)==8){b=b|2;break}else if((a|0)==9){b=b|3;break}}else b=0}while(0);return b|0}function qe(a){a=a|0;var b=0,c=0;if(!(a<<16>>16)){c=0;return c|0}b=(a&65535)-((a&65535)>>>15&65535)|0;b=(b<<16>>31^b)<<16;a=b>>16;if(!(a&16384)){c=b;b=0}else{c=0;return c|0}while(1){if(a&8192){a=b;c=7;break}if(a&4096){a=b;c=8;break}if(a&2048){a=b;c=9;break}b=b+4<<16>>16;c=c<<4;a=c>>16;if(a&16384){a=b;c=10;break}}if((c|0)==7){c=a|1;return c|0}else if((c|0)==8){c=a|2;return c|0}else if((c|0)==9){c=a|3;return c|0}else if((c|0)==10)return a|0;return 0}function re(a,d,f){a=a|0;d=d|0;f=f|0;var g=0,h=0,i=0;d=d<<16>>16;if((d&134217727|0)==33554432){c[f>>2]=1;d=2147483647}else d=d<<6;g=d>>>16&31;i=b[7792+(g<<1)>>1]|0;h=i<<16;d=Z(i-(e[7792+(g+1<<1)>>1]|0)<<16>>16,d>>>1&32767)|0;if((d|0)==1073741824){c[f>>2]=1;g=2147483647}else g=d<<1;d=h-g|0;if(((d^h)&(g^h)|0)>=0){i=d;a=a&65535;a=30-a|0;a=a&65535;f=ge(i,a,f)|0;return f|0}c[f>>2]=1;i=(i>>>15&1)+2147483647|0;a=a&65535;a=30-a|0;a=a&65535;f=ge(i,a,f)|0;return f|0}function se(a,c,d,e,f,g){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0;o=i;i=i+48|0;n=o;m=0-(d&65535)|0;m=f<<16>>16==0?m:m<<1&131070;d=m&65535;m=(d<<16>>16<0?m+6|0:m)<<16>>16;g=6-m|0;b[n>>1]=b[7858+(m<<1)>>1]|0;b[n+2>>1]=b[7858+(g<<1)>>1]|0;b[n+4>>1]=b[7858+(m+6<<1)>>1]|0;b[n+6>>1]=b[7858+(g+6<<1)>>1]|0;b[n+8>>1]=b[7858+(m+12<<1)>>1]|0;b[n+10>>1]=b[7858+(g+12<<1)>>1]|0;b[n+12>>1]=b[7858+(m+18<<1)>>1]|0;b[n+14>>1]=b[7858+(g+18<<1)>>1]|0;b[n+16>>1]=b[7858+(m+24<<1)>>1]|0;b[n+18>>1]=b[7858+(g+24<<1)>>1]|0;b[n+20>>1]=b[7858+(m+30<<1)>>1]|0;b[n+22>>1]=b[7858+(g+30<<1)>>1]|0;b[n+24>>1]=b[7858+(m+36<<1)>>1]|0;b[n+26>>1]=b[7858+(g+36<<1)>>1]|0;b[n+28>>1]=b[7858+(m+42<<1)>>1]|0;b[n+30>>1]=b[7858+(g+42<<1)>>1]|0;b[n+32>>1]=b[7858+(m+48<<1)>>1]|0;b[n+34>>1]=b[7858+(g+48<<1)>>1]|0;b[n+36>>1]=b[7858+(m+54<<1)>>1]|0;b[n+38>>1]=b[7858+(g+54<<1)>>1]|0;g=e<<16>>16>>>1&65535;if(!(g<<16>>16)){i=o;return}m=a+((d<<16>>16>>15<<16>>16)-(c<<16>>16)<<1)|0;while(1){l=m+2|0;h=b[l>>1]|0;c=h;e=m;j=5;k=n;f=16384;d=16384;while(1){q=b[k>>1]|0;r=(Z(q,c<<16>>16)|0)+d|0;p=b[l+-2>>1]|0;d=(Z(p,q)|0)+f|0;q=e;e=e+4|0;s=b[k+2>>1]|0;d=d+(Z(s,h<<16>>16)|0)|0;f=b[e>>1]|0;s=r+(Z(f,s)|0)|0;l=l+-4|0;r=b[k+4>>1]|0;p=s+(Z(r,p)|0)|0;c=b[l>>1]|0;r=d+(Z(c<<16>>16,r)|0)|0;d=b[k+6>>1]|0;f=r+(Z(d,f)|0)|0;h=b[q+6>>1]|0;d=p+(Z(h<<16>>16,d)|0)|0;if(j<<16>>16<=1)break;else{j=j+-1<<16>>16;k=k+8|0}}b[a>>1]=f>>>15;b[a+2>>1]=d>>>15;g=g+-1<<16>>16;if(!(g<<16>>16))break;else{m=m+4|0;a=a+4|0}}i=o;return}function te(a,c,d,f,g,h,j){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0;C=i;i=i+144|0;t=C+120|0;y=C+100|0;A=C+80|0;B=C+60|0;z=C+40|0;q=C+20|0;r=C;ne(d,t,10,j);fe(t,y,j);if((c|0)==8){b[h>>1]=0;l=2147483647;s=0;while(1){n=s*10|0;d=0;m=0;do{x=(e[7980+(m+n<<1)>>1]|0)+(e[8140+(m<<1)>>1]|0)|0;b[r+(m<<1)>>1]=x;x=(e[t+(m<<1)>>1]|0)-(x&65535)|0;b[q+(m<<1)>>1]=x;x=x<<16;d=(Z(x>>15,x>>16)|0)+d|0;m=m+1|0}while((m|0)!=10);if((d|0)<(l|0)){u=B;p=q;o=u+20|0;do{b[u>>1]=b[p>>1]|0;u=u+2|0;p=p+2|0}while((u|0)<(o|0));u=A;p=r;o=u+20|0;do{b[u>>1]=b[p>>1]|0;u=u+2|0;p=p+2|0}while((u|0)<(o|0));u=a;p=7980+(n<<1)|0;o=u+20|0;do{b[u>>1]=b[p>>1]|0;u=u+2|0;p=p+2|0}while((u|0)<(o|0));b[h>>1]=s}else d=l;s=s+1|0;if((s|0)==8)break;else l=d}}else{d=0;do{x=Z(b[8160+(d<<1)>>1]|0,b[a+(d<<1)>>1]|0)|0;x=(x>>>15)+(e[8140+(d<<1)>>1]|0)|0;b[A+(d<<1)>>1]=x;b[B+(d<<1)>>1]=(e[t+(d<<1)>>1]|0)-x;d=d+1|0}while((d|0)!=10)}do{if(c>>>0>=2){x=B+2|0;w=B+4|0;v=e[B>>1]|0;u=b[y>>1]<<1;t=e[x>>1]|0;q=b[y+2>>1]<<1;p=e[w>>1]|0;o=b[y+4>>1]<<1;if((c|0)==5){r=2147483647;h=0;d=0;s=17908;while(1){m=(Z(v-(e[s>>1]|0)<<16>>16,u)|0)>>16;m=Z(m,m)|0;n=(Z(t-(e[s+2>>1]|0)<<16>>16,q)|0)>>16;m=(Z(n,n)|0)+m|0;n=(Z(p-(e[s+4>>1]|0)<<16>>16,o)|0)>>16;n=m+(Z(n,n)|0)|0;m=(n|0)<(r|0);d=m?h:d;h=h+1<<16>>16;if(h<<16>>16>=512)break;else{r=m?n:r;s=s+6|0}}n=(d<<16>>16)*3|0;b[B>>1]=b[17908+(n<<1)>>1]|0;b[x>>1]=b[17908+(n+1<<1)>>1]|0;b[w>>1]=b[17908+(n+2<<1)>>1]|0;b[g>>1]=d;n=B+6|0;m=B+8|0;v=B+10|0;s=e[n>>1]|0;h=b[y+6>>1]<<1;r=e[m>>1]|0;q=b[y+8>>1]<<1;p=e[v>>1]|0;o=b[y+10>>1]<<1;k=2147483647;t=0;d=0;u=9716;while(1){l=(Z(h,s-(e[u>>1]|0)<<16>>16)|0)>>16;l=Z(l,l)|0;c=(Z(q,r-(e[u+2>>1]|0)<<16>>16)|0)>>16;l=(Z(c,c)|0)+l|0;c=(Z(o,p-(e[u+4>>1]|0)<<16>>16)|0)>>16;c=l+(Z(c,c)|0)|0;l=(c|0)<(k|0);d=l?t:d;t=t+1<<16>>16;if(t<<16>>16>=512)break;else{k=l?c:k;u=u+6|0}}k=(d<<16>>16)*3|0;b[n>>1]=b[9716+(k<<1)>>1]|0;b[m>>1]=b[9716+(k+1<<1)>>1]|0;b[v>>1]=b[9716+(k+2<<1)>>1]|0;b[g+2>>1]=d;k=B+12|0;b[g+4>>1]=ue(k,12788,y+12|0,512)|0;t=x;s=w;d=v;l=B;break}else{r=2147483647;h=0;d=0;s=8180;while(1){m=(Z(v-(e[s>>1]|0)<<16>>16,u)|0)>>16;m=Z(m,m)|0;n=(Z(t-(e[s+2>>1]|0)<<16>>16,q)|0)>>16;m=(Z(n,n)|0)+m|0;n=(Z(p-(e[s+4>>1]|0)<<16>>16,o)|0)>>16;n=m+(Z(n,n)|0)|0;m=(n|0)<(r|0);d=m?h:d;h=h+1<<16>>16;if(h<<16>>16>=256)break;else{r=m?n:r;s=s+6|0}}n=(d<<16>>16)*3|0;b[B>>1]=b[8180+(n<<1)>>1]|0;b[x>>1]=b[8180+(n+1<<1)>>1]|0;b[w>>1]=b[8180+(n+2<<1)>>1]|0;b[g>>1]=d;n=B+6|0;m=B+8|0;v=B+10|0;s=e[n>>1]|0;h=b[y+6>>1]<<1;r=e[m>>1]|0;q=b[y+8>>1]<<1;p=e[v>>1]|0;o=b[y+10>>1]<<1;k=2147483647;t=0;d=0;u=9716;while(1){l=(Z(h,s-(e[u>>1]|0)<<16>>16)|0)>>16;l=Z(l,l)|0;c=(Z(q,r-(e[u+2>>1]|0)<<16>>16)|0)>>16;l=(Z(c,c)|0)+l|0;c=(Z(o,p-(e[u+4>>1]|0)<<16>>16)|0)>>16;c=l+(Z(c,c)|0)|0;l=(c|0)<(k|0);d=l?t:d;t=t+1<<16>>16;if(t<<16>>16>=512)break;else{k=l?c:k;u=u+6|0}}k=(d<<16>>16)*3|0;b[n>>1]=b[9716+(k<<1)>>1]|0;b[m>>1]=b[9716+(k+1<<1)>>1]|0;b[v>>1]=b[9716+(k+2<<1)>>1]|0;b[g+2>>1]=d;k=B+12|0;b[g+4>>1]=ue(k,12788,y+12|0,512)|0;t=x;s=w;d=v;l=B;break}}else{w=B+2|0;x=B+4|0;n=e[B>>1]|0;m=b[y>>1]<<1;l=e[w>>1]|0;k=b[y+2>>1]<<1;c=e[x>>1]|0;o=b[y+4>>1]<<1;r=2147483647;h=0;d=0;s=8180;while(1){q=(Z(m,n-(e[s>>1]|0)<<16>>16)|0)>>16;q=Z(q,q)|0;p=(Z(k,l-(e[s+2>>1]|0)<<16>>16)|0)>>16;q=(Z(p,p)|0)+q|0;p=(Z(o,c-(e[s+4>>1]|0)<<16>>16)|0)>>16;p=q+(Z(p,p)|0)|0;q=(p|0)<(r|0);d=q?h:d;h=h+1<<16>>16;if(h<<16>>16>=256)break;else{r=q?p:r;s=s+6|0}}n=(d<<16>>16)*3|0;b[B>>1]=b[8180+(n<<1)>>1]|0;b[w>>1]=b[8180+(n+1<<1)>>1]|0;b[x>>1]=b[8180+(n+2<<1)>>1]|0;b[g>>1]=d;n=B+6|0;m=B+8|0;v=B+10|0;s=e[n>>1]|0;h=b[y+6>>1]<<1;r=e[m>>1]|0;q=b[y+8>>1]<<1;p=e[v>>1]|0;o=b[y+10>>1]<<1;k=2147483647;t=0;d=0;u=9716;while(1){l=(Z(h,s-(e[u>>1]|0)<<16>>16)|0)>>16;l=Z(l,l)|0;c=(Z(q,r-(e[u+2>>1]|0)<<16>>16)|0)>>16;l=(Z(c,c)|0)+l|0;c=(Z(o,p-(e[u+4>>1]|0)<<16>>16)|0)>>16;c=l+(Z(c,c)|0)|0;l=(c|0)<(k|0);d=l?t:d;t=t+1<<16>>16;if(t<<16>>16>=256)break;else{k=l?c:k;u=u+12|0}}k=(d<<16>>16)*6|0;b[n>>1]=b[9716+(k<<1)>>1]|0;b[m>>1]=b[9716+((k|1)<<1)>>1]|0;b[v>>1]=b[9716+(k+2<<1)>>1]|0;b[g+2>>1]=d;k=B+12|0;b[g+4>>1]=ue(k,16884,y+12|0,128)|0;t=w;s=x;d=v;l=B}}while(0);u=a;p=B;o=u+20|0;do{b[u>>1]=b[p>>1]|0;u=u+2|0;p=p+2|0}while((u|0)<(o|0));b[z>>1]=(e[A>>1]|0)+(e[l>>1]|0);b[z+2>>1]=(e[A+2>>1]|0)+(e[t>>1]|0);b[z+4>>1]=(e[A+4>>1]|0)+(e[s>>1]|0);b[z+6>>1]=(e[A+6>>1]|0)+(e[n>>1]|0);b[z+8>>1]=(e[A+8>>1]|0)+(e[m>>1]|0);b[z+10>>1]=(e[A+10>>1]|0)+(e[d>>1]|0);b[z+12>>1]=(e[A+12>>1]|0)+(e[k>>1]|0);b[z+14>>1]=(e[A+14>>1]|0)+(e[B+14>>1]|0);b[z+16>>1]=(e[A+16>>1]|0)+(e[B+16>>1]|0);b[z+18>>1]=(e[A+18>>1]|0)+(e[B+18>>1]|0);Ae(z,205,10,j);me(z,f,10,j);i=C;return}function ue(a,c,d,f){a=a|0;c=c|0;d=d|0;f=f|0;var g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0;t=a+2|0;u=a+4|0;v=a+6|0;if(f<<16>>16>0){m=e[a>>1]|0;n=b[d>>1]<<1;o=e[t>>1]|0;p=b[d+2>>1]<<1;q=e[u>>1]|0;r=b[d+4>>1]<<1;s=e[v>>1]|0;g=b[d+6>>1]<<1;j=2147483647;k=0;d=0;l=c;while(1){h=(Z(n,m-(e[l>>1]|0)<<16>>16)|0)>>16;h=Z(h,h)|0;i=(Z(p,o-(e[l+2>>1]|0)<<16>>16)|0)>>16;h=(Z(i,i)|0)+h|0;i=(Z(r,q-(e[l+4>>1]|0)<<16>>16)|0)>>16;i=h+(Z(i,i)|0)|0;h=(Z(g,s-(e[l+6>>1]|0)<<16>>16)|0)>>16;h=i+(Z(h,h)|0)|0;i=(h|0)<(j|0);d=i?k:d;k=k+1<<16>>16;if(k<<16>>16>=f<<16>>16)break;else{j=i?h:j;l=l+8|0}}}else d=0;f=d<<16>>16<<2;s=f|1;b[a>>1]=b[c+(f<<1)>>1]|0;b[t>>1]=b[c+(s<<1)>>1]|0;b[u>>1]=b[c+(s+1<<1)>>1]|0;b[v>>1]=b[c+((f|3)<<1)>>1]|0;return d|0}function ve(a,c,d,f,g,h,j){a=a|0;c=c|0;d=d|0;f=f|0;g=g|0;h=h|0;j=j|0;var k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0;I=i;i=i+192|0;m=I+160|0;l=I+140|0;C=I+120|0;D=I+100|0;E=I+80|0;F=I+60|0;k=I+40|0;G=I+20|0;H=I;ne(c,m,10,j);ne(d,l,10,j);fe(m,C,j);fe(l,D,j);n=0;d=E;c=F;o=k;while(1){B=(((b[a+(n<<1)>>1]|0)*21299|0)>>>15)+(e[20980+(n<<1)>>1]|0)|0;b[d>>1]=B;b[c>>1]=(e[m>>1]|0)-B;b[o>>1]=(e[l>>1]|0)-B;n=n+1|0;if((n|0)==10)break;else{m=m+2|0;l=l+2|0;d=d+2|0;c=c+2|0;o=o+2|0}}b[h>>1]=we(F,k,21e3,b[C>>1]|0,b[C+2>>1]|0,b[D>>1]|0,b[D+2>>1]|0,128)|0;b[h+2>>1]=we(F+4|0,k+4|0,22024,b[C+4>>1]|0,b[C+6>>1]|0,b[D+4>>1]|0,b[D+6>>1]|0,256)|0;y=F+8|0;z=k+8|0;A=F+10|0;B=k+10|0;d=b[y>>1]|0;p=b[C+8>>1]<<1;q=b[A>>1]|0;r=b[C+10>>1]<<1;s=b[z>>1]|0;t=b[D+8>>1]<<1;u=b[B>>1]|0;v=b[D+10>>1]<<1;l=2147483647;w=0;o=0;x=24072;c=0;while(1){m=b[x>>1]|0;n=(Z(d-m<<16>>16,p)|0)>>16;n=Z(n,n)|0;m=(Z(m+d<<16>>16,p)|0)>>16;m=Z(m,m)|0;J=b[x+2>>1]|0;K=(Z(q-J<<16>>16,r)|0)>>16;n=(Z(K,K)|0)+n|0;J=(Z(J+q<<16>>16,r)|0)>>16;m=(Z(J,J)|0)+m|0;if((n|0)<(l|0)|(m|0)<(l|0)){K=b[x+4>>1]|0;J=(Z(s-K<<16>>16,t)|0)>>16;J=(Z(J,J)|0)+n|0;K=(Z(K+s<<16>>16,t)|0)>>16;K=(Z(K,K)|0)+m|0;m=b[x+6>>1]|0;n=(Z(u-m<<16>>16,v)|0)>>16;n=J+(Z(n,n)|0)|0;m=(Z(m+u<<16>>16,v)|0)>>16;m=K+(Z(m,m)|0)|0;K=(n|0)<(l|0);n=K?n:l;J=(m|0)<(n|0);n=J?m:n;o=K|J?w:o;c=J?1:K?0:c}else n=l;w=w+1<<16>>16;if(w<<16>>16>=256)break;else{l=n;x=x+8|0}}n=o<<16>>16;m=n<<2;o=m|1;l=24072+(o<<1)|0;d=b[24072+(m<<1)>>1]|0;if(!(c<<16>>16)){b[y>>1]=d;b[A>>1]=b[l>>1]|0;b[z>>1]=b[24072+(o+1<<1)>>1]|0;b[B>>1]=b[24072+((m|3)<<1)>>1]|0;c=n<<1}else{b[y>>1]=0-(d&65535);b[A>>1]=0-(e[l>>1]|0);b[z>>1]=0-(e[24072+(o+1<<1)>>1]|0);b[B>>1]=0-(e[24072+((m|3)<<1)>>1]|0);c=n<<1&65534|1}b[h+4>>1]=c;b[h+6>>1]=we(F+12|0,k+12|0,26120,b[C+12>>1]|0,b[C+14>>1]|0,b[D+12>>1]|0,b[D+14>>1]|0,256)|0;b[h+8>>1]=we(F+16|0,k+16|0,28168,b[C+16>>1]|0,b[C+18>>1]|0,b[D+16>>1]|0,b[D+18>>1]|0,64)|0;l=0;m=G;n=H;d=E;c=F;while(1){J=e[d>>1]|0;b[m>>1]=J+(e[c>>1]|0);K=b[k>>1]|0;b[n>>1]=J+(K&65535);b[a+(l<<1)>>1]=K;l=l+1|0;if((l|0)==10)break;else{m=m+2|0;n=n+2|0;d=d+2|0;c=c+2|0;k=k+2|0}}Ae(G,205,10,j);Ae(H,205,10,j);me(G,f,10,j);me(H,g,10,j);i=I;return}function we(a,c,d,e,f,g,h,i){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;h=h|0;i=i|0;var j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0;o=b[a>>1]|0;u=a+2|0;q=b[u>>1]|0;s=b[c>>1]|0;v=c+2|0;t=b[v>>1]|0;if(i<<16>>16>0){n=e<<16>>16<<1;m=f<<16>>16<<1;l=g<<16>>16<<1;f=h<<16>>16<<1;g=2147483647;j=0;e=0;k=d;while(1){h=(Z(n,o-(b[k>>1]|0)|0)|0)>>16;h=Z(h,h)|0;if(((h|0)<(g|0)?(p=(Z(m,q-(b[k+2>>1]|0)|0)|0)>>16,p=(Z(p,p)|0)+h|0,(p|0)<(g|0)):0)?(r=(Z(l,s-(b[k+4>>1]|0)|0)|0)>>16,r=(Z(r,r)|0)+p|0,(r|0)<(g|0)):0){h=(Z(f,t-(b[k+6>>1]|0)|0)|0)>>16;h=(Z(h,h)|0)+r|0;w=(h|0)<(g|0);h=w?h:g;e=w?j:e}else h=g;j=j+1<<16>>16;if(j<<16>>16>=i<<16>>16)break;else{g=h;k=k+8|0}}}else e=0;w=e<<16>>16<<2;i=w|1;b[a>>1]=b[d+(w<<1)>>1]|0;b[u>>1]=b[d+(i<<1)>>1]|0;b[c>>1]=b[d+(i+1<<1)>>1]|0;b[v>>1]=b[d+((w|3)<<1)>>1]|0;return e|0}function xe(a){a=a|0;var d=0,e=0,f=0;if(!a){f=-1;return f|0}c[a>>2]=0;d=Je(20)|0;if(!d){f=-1;return f|0}e=d;f=e+20|0;do{b[e>>1]=0;e=e+2|0}while((e|0)<(f|0));c[a>>2]=d;f=0;return f|0}function ye(a){a=a|0;var c=0;if(!a){c=-1;return c|0}c=a+20|0;do{b[a>>1]=0;a=a+2|0}while((a|0)<(c|0));c=0;return c|0}function ze(a){a=a|0;var b=0;if(!a)return;b=c[a>>2]|0;if(!b)return;Ke(b);c[a>>2]=0;return}function Ae(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0;if(d<<16>>16<=0)return;f=c<<16>>16;g=c&65535;h=0;while(1){e=b[a>>1]|0;if(e<<16>>16<c<<16>>16){b[a>>1]=c;e=(c<<16>>16)+f|0}else e=(e&65535)+g|0;h=h+1<<16>>16;if(h<<16>>16>=d<<16>>16)break;else{c=e&65535;a=a+2|0}}return}function Be(a,c,d,e){a=a|0;c=c|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0;f=e<<16>>16;e=f>>>2&65535;if(!(e<<16>>16))return;n=f+-1|0;t=a+20|0;p=c+(f+-4<<1)|0;q=c+(f+-3<<1)|0;r=c+(f+-2<<1)|0;s=c+(n<<1)|0;o=c+(f+-11<<1)|0;n=d+(n<<1)|0;while(1){c=b[t>>1]|0;h=5;i=t;j=o;k=o+-2|0;l=o+-4|0;m=o+-6|0;g=2048;a=2048;f=2048;d=2048;while(1){g=(Z(b[j>>1]|0,c)|0)+g|0;a=(Z(b[k>>1]|0,c)|0)+a|0;f=(Z(b[l>>1]|0,c)|0)+f|0;c=(Z(b[m>>1]|0,c)|0)+d|0;d=b[i+-2>>1]|0;g=g+(Z(b[j+2>>1]|0,d)|0)|0;a=a+(Z(b[k+2>>1]|0,d)|0)|0;f=f+(Z(b[l+2>>1]|0,d)|0)|0;i=i+-4|0;d=c+(Z(b[m+2>>1]|0,d)|0)|0;h=h+-1<<16>>16;c=b[i>>1]|0;if(!(h<<16>>16))break;else{j=j+4|0;k=k+4|0;l=l+4|0;m=m+4|0}}j=(Z(b[s>>1]|0,c)|0)+g|0;k=(Z(b[r>>1]|0,c)|0)+a|0;l=(Z(b[q>>1]|0,c)|0)+f|0;m=(Z(b[p>>1]|0,c)|0)+d|0;b[n>>1]=j>>>12;b[n+-2>>1]=k>>>12;b[n+-4>>1]=l>>>12;b[n+-6>>1]=m>>>12;e=e+-1<<16>>16;if(!(e<<16>>16))break;else{p=p+-8|0;q=q+-8|0;r=r+-8|0;s=s+-8|0;o=o+-8|0;n=n+-8|0}}return}function Ce(a,b){a=a|0;b=b|0;var d=0;d=a+32768|0;if((a|0)>-1&(d^a|0)<0){c[b>>2]=1;d=(a>>>31)+2147483647|0}return d>>>16&65535|0}function De(a,b,d){a=a|0;b=b|0;d=d|0;var e=0,f=0;e=b<<16>>16;if(!(b<<16>>16))return a|0;if(b<<16>>16>0){a=a<<16>>16>>(b<<16>>16>15?15:e)&65535;return a|0}f=0-e|0;b=a<<16>>16;f=(f&65535)<<16>>16>15?15:f<<16>>16;e=b<<f;if((e<<16>>16>>f|0)==(b|0)){f=e&65535;return f|0}c[d>>2]=1;f=a<<16>>16>0?32767:-32768;return f|0}function Ee(a,b,c){a=a|0;b=b|0;c=c|0;if(b<<16>>16>15){b=0;return b|0}c=De(a,b,c)|0;if(b<<16>>16>0)return c+((1<<(b<<16>>16)+-1&a<<16>>16|0)!=0&1)<<16>>16|0;else{b=c;return b|0}return 0}function Fe(a,d,f){a=a|0;d=d|0;f=f|0;var g=0,h=0,i=0;if((a|0)<1){b[d>>1]=0;f=0;return f|0}h=(pe(a)|0)&65534;i=h&65535;h=h<<16>>16;if(i<<16>>16>0){g=a<<h;if((g>>h|0)!=(a|0))g=a>>31^2147483647}else{h=0-h<<16;if((h|0)<2031616)g=a>>(h>>16);else g=0}b[d>>1]=i;d=g>>>25&63;d=d>>>0>15?d+-16|0:d;i=b[30216+(d<<1)>>1]|0;a=i<<16;g=Z(i-(e[30216+(d+1<<1)>>1]|0)<<16>>16,g>>>10&32767)|0;if((g|0)==1073741824){c[f>>2]=1;h=2147483647}else h=g<<1;g=a-h|0;if(((g^a)&(h^a)|0)>=0){f=g;return f|0}c[f>>2]=1;f=(i>>>15&1)+2147483647|0;return f|0}function Ge(a,b,d){a=a|0;b=b|0;d=d|0;a=(a<<16>>16)-(b<<16>>16)|0;if((a+32768|0)>>>0<=65535){d=a;d=d&65535;return d|0}c[d>>2]=1;d=(a|0)>32767?32767:-32768;d=d&65535;return d|0}function He(a,c,d,e,f,g){a=a|0;c=c|0;d=d|0;e=e|0;f=f|0;g=g|0;var h=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0;A=i;i=i+48|0;o=A;k=o;h=f;j=k+20|0;do{b[k>>1]=b[h>>1]|0;k=k+2|0;h=h+2|0}while((k|0)<(j|0));n=o+18|0;s=a+2|0;t=a+4|0;p=c+20|0;u=a+6|0;v=a+8|0;w=a+10|0;x=a+12|0;y=a+14|0;z=a+16|0;q=a+18|0;r=a+20|0;j=b[n>>1]|0;h=5;l=c;m=d;k=o+20|0;while(1){D=b[a>>1]|0;C=(Z(D,b[l>>1]|0)|0)+2048|0;D=(Z(b[l+2>>1]|0,D)|0)+2048|0;o=j<<16>>16;C=C-(Z(o,b[s>>1]|0)|0)|0;B=b[t>>1]|0;o=D-(Z(o,B)|0)|0;D=b[n+-2>>1]|0;B=C-(Z(D,B)|0)|0;C=b[u>>1]|0;D=o-(Z(C,D)|0)|0;o=b[n+-4>>1]|0;C=B-(Z(o,C)|0)|0;B=b[v>>1]|0;o=D-(Z(B,o)|0)|0;D=b[n+-6>>1]|0;B=C-(Z(D,B)|0)|0;C=b[w>>1]|0;D=o-(Z(D,C)|0)|0;o=b[n+-8>>1]|0;C=B-(Z(o,C)|0)|0;B=b[x>>1]|0;o=D-(Z(B,o)|0)|0;D=b[n+-10>>1]|0;B=C-(Z(D,B)|0)|0;C=b[y>>1]|0;D=o-(Z(C,D)|0)|0;o=b[n+-12>>1]|0;C=B-(Z(o,C)|0)|0;B=b[z>>1]|0;o=D-(Z(o,B)|0)|0;D=b[n+-14>>1]|0;B=C-(Z(D,B)|0)|0;C=b[q>>1]|0;D=o-(Z(C,D)|0)|0;o=b[n+-16>>1]|0;C=B-(Z(o,C)|0)|0;B=b[r>>1]|0;o=D-(Z(B,o)|0)|0;B=C-(Z(b[n+-18>>1]|0,B)|0)|0;B=(B+134217728|0)>>>0<268435455?B>>>12&65535:(B|0)>134217727?32767:-32768;o=o-(Z(b[s>>1]|0,B<<16>>16)|0)|0;n=k+2|0;b[k>>1]=B;b[m>>1]=B;j=(o+134217728|0)>>>0<268435455?o>>>12&65535:(o|0)>134217727?32767:-32768;b[n>>1]=j;b[m+2>>1]=j;h=h+-1<<16>>16;if(!(h<<16>>16))break;else{l=l+4|0;m=m+4|0;k=k+4|0}}e=(e<<16>>16)+-10|0;k=e>>>1&65535;if(k<<16>>16){o=d+18|0;j=c+16|0;n=b[o>>1]|0;l=p;h=d+20|0;while(1){B=b[a>>1]|0;m=(Z(B,b[l>>1]|0)|0)+2048|0;B=(Z(b[j+6>>1]|0,B)|0)+2048|0;j=b[s>>1]|0;C=n<<16>>16;m=m-(Z(C,j)|0)|0;D=b[t>>1]|0;C=B-(Z(C,D)|0)|0;B=b[o+-2>>1]|0;D=m-(Z(B,D)|0)|0;m=b[u>>1]|0;B=C-(Z(m,B)|0)|0;C=b[o+-4>>1]|0;m=D-(Z(C,m)|0)|0;D=b[v>>1]|0;C=B-(Z(D,C)|0)|0;B=b[o+-6>>1]|0;D=m-(Z(B,D)|0)|0;m=b[w>>1]|0;B=C-(Z(B,m)|0)|0;C=b[o+-8>>1]|0;m=D-(Z(C,m)|0)|0;D=b[x>>1]|0;C=B-(Z(D,C)|0)|0;B=b[o+-10>>1]|0;D=m-(Z(B,D)|0)|0;m=b[y>>1]|0;B=C-(Z(m,B)|0)|0;C=b[o+-12>>1]|0;m=D-(Z(C,m)|0)|0;D=b[z>>1]|0;C=B-(Z(C,D)|0)|0;B=b[o+-14>>1]|0;D=m-(Z(B,D)|0)|0;m=b[q>>1]|0;B=C-(Z(m,B)|0)|0;C=b[o+-16>>1]|0;m=D-(Z(C,m)|0)|0;D=b[r>>1]|0;C=B-(Z(D,C)|0)|0;D=m-(Z(b[o+-18>>1]|0,D)|0)|0;m=l+4|0;D=(D+134217728|0)>>>0<268435455?D>>>12&65535:(D|0)>134217727?32767:-32768;j=C-(Z(j,D<<16>>16)|0)|0;o=h+2|0;b[h>>1]=D;do{if((j+134217728|0)>>>0>=268435455){h=h+4|0;if((j|0)>134217727){b[o>>1]=32767;j=32767;break}else{b[o>>1]=-32768;j=-32768;break}}else{j=j>>>12&65535;b[o>>1]=j;h=h+4|0}}while(0);k=k+-1<<16>>16;if(!(k<<16>>16))break;else{D=l;n=j;l=m;j=D}}}if(!(g<<16>>16)){i=A;return}k=f;h=d+(e<<1)|0;j=k+20|0;do{b[k>>1]=b[h>>1]|0;k=k+2|0;h=h+2|0}while((k|0)<(j|0));i=A;return}function Ie(a,c,d){a=a|0;c=c|0;d=d|0;b[d>>1]=b[a>>1]|0;b[d+2>>1]=((Z(b[c>>1]|0,b[a+2>>1]|0)|0)+16384|0)>>>15;b[d+4>>1]=((Z(b[c+2>>1]|0,b[a+4>>1]|0)|0)+16384|0)>>>15;b[d+6>>1]=((Z(b[c+4>>1]|0,b[a+6>>1]|0)|0)+16384|0)>>>15;b[d+8>>1]=((Z(b[c+6>>1]|0,b[a+8>>1]|0)|0)+16384|0)>>>15;b[d+10>>1]=((Z(b[c+8>>1]|0,b[a+10>>1]|0)|0)+16384|0)>>>15;b[d+12>>1]=((Z(b[c+10>>1]|0,b[a+12>>1]|0)|0)+16384|0)>>>15;b[d+14>>1]=((Z(b[c+12>>1]|0,b[a+14>>1]|0)|0)+16384|0)>>>15;b[d+16>>1]=((Z(b[c+14>>1]|0,b[a+16>>1]|0)|0)+16384|0)>>>15;b[d+18>>1]=((Z(b[c+16>>1]|0,b[a+18>>1]|0)|0)+16384|0)>>>15;b[d+20>>1]=((Z(b[c+18>>1]|0,b[a+20>>1]|0)|0)+16384|0)>>>15;return}function Je(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0,C=0,D=0,E=0,F=0,G=0,H=0,I=0,J=0,K=0,L=0,M=0,N=0,O=0,P=0,Q=0,R=0,S=0,T=0,U=0,V=0;do{if(a>>>0<245){s=a>>>0<11?16:a+11&-8;a=s>>>3;m=c[26]|0;j=m>>>a;if(j&3){e=(j&1^1)+a|0;b=e<<1;d=144+(b<<2)|0;b=144+(b+2<<2)|0;f=c[b>>2]|0;g=f+8|0;h=c[g>>2]|0;do{if((d|0)==(h|0))c[26]=m&~(1<<e);else{if(h>>>0>=(c[30]|0)>>>0?(l=h+12|0,(c[l>>2]|0)==(f|0)):0){c[l>>2]=d;c[b>>2]=h;break}ea()}}while(0);U=e<<3;c[f+4>>2]=U|3;U=f+(U|4)|0;c[U>>2]=c[U>>2]|1;break}b=c[28]|0;if(s>>>0>b>>>0){if(j){f=2<<a;f=j<<a&(f|0-f);f=(f&0-f)+-1|0;g=f>>>12&16;f=f>>>g;e=f>>>5&8;f=f>>>e;d=f>>>2&4;f=f>>>d;h=f>>>1&2;f=f>>>h;i=f>>>1&1;i=(e|g|d|h|i)+(f>>>i)|0;f=i<<1;h=144+(f<<2)|0;f=144+(f+2<<2)|0;d=c[f>>2]|0;g=d+8|0;e=c[g>>2]|0;do{if((h|0)==(e|0)){c[26]=m&~(1<<i);n=b}else{if(e>>>0>=(c[30]|0)>>>0?(k=e+12|0,(c[k>>2]|0)==(d|0)):0){c[k>>2]=h;c[f>>2]=e;n=c[28]|0;break}ea()}}while(0);U=i<<3;b=U-s|0;c[d+4>>2]=s|3;j=d+s|0;c[d+(s|4)>>2]=b|1;c[d+U>>2]=b;if(n){d=c[31]|0;e=n>>>3;h=e<<1;i=144+(h<<2)|0;f=c[26]|0;e=1<<e;if(f&e){f=144+(h+2<<2)|0;h=c[f>>2]|0;if(h>>>0<(c[30]|0)>>>0)ea();else{p=f;q=h}}else{c[26]=f|e;p=144+(h+2<<2)|0;q=i}c[p>>2]=d;c[q+12>>2]=d;c[d+8>>2]=q;c[d+12>>2]=i}c[28]=b;c[31]=j;break}a=c[27]|0;if(a){f=(a&0-a)+-1|0;T=f>>>12&16;f=f>>>T;S=f>>>5&8;f=f>>>S;U=f>>>2&4;f=f>>>U;h=f>>>1&2;f=f>>>h;j=f>>>1&1;j=c[408+((S|T|U|h|j)+(f>>>j)<<2)>>2]|0;f=(c[j+4>>2]&-8)-s|0;h=j;while(1){i=c[h+16>>2]|0;if(!i){i=c[h+20>>2]|0;if(!i){b=f;break}}h=(c[i+4>>2]&-8)-s|0;U=h>>>0<f>>>0;f=U?h:f;h=i;j=U?i:j}a=c[30]|0;if(j>>>0>=a>>>0?(v=j+s|0,j>>>0<v>>>0):0){e=c[j+24>>2]|0;i=c[j+12>>2]|0;do{if((i|0)==(j|0)){h=j+20|0;i=c[h>>2]|0;if(!i){h=j+16|0;i=c[h>>2]|0;if(!i){t=0;break}}while(1){g=i+20|0;f=c[g>>2]|0;if(f){i=f;h=g;continue}g=i+16|0;f=c[g>>2]|0;if(!f)break;else{i=f;h=g}}if(h>>>0<a>>>0)ea();else{c[h>>2]=0;t=i;break}}else{h=c[j+8>>2]|0;if((h>>>0>=a>>>0?(d=h+12|0,(c[d>>2]|0)==(j|0)):0)?(o=i+8|0,(c[o>>2]|0)==(j|0)):0){c[d>>2]=i;c[o>>2]=h;t=i;break}ea()}}while(0);do{if(e){h=c[j+28>>2]|0;g=408+(h<<2)|0;if((j|0)==(c[g>>2]|0)){c[g>>2]=t;if(!t){c[27]=c[27]&~(1<<h);break}}else{if(e>>>0<(c[30]|0)>>>0)ea();h=e+16|0;if((c[h>>2]|0)==(j|0))c[h>>2]=t;else c[e+20>>2]=t;if(!t)break}g=c[30]|0;if(t>>>0<g>>>0)ea();c[t+24>>2]=e;h=c[j+16>>2]|0;do{if(h)if(h>>>0<g>>>0)ea();else{c[t+16>>2]=h;c[h+24>>2]=t;break}}while(0);h=c[j+20>>2]|0;if(h)if(h>>>0<(c[30]|0)>>>0)ea();else{c[t+20>>2]=h;c[h+24>>2]=t;break}}}while(0);if(b>>>0<16){U=b+s|0;c[j+4>>2]=U|3;U=j+(U+4)|0;c[U>>2]=c[U>>2]|1}else{c[j+4>>2]=s|3;c[j+(s|4)>>2]=b|1;c[j+(b+s)>>2]=b;e=c[28]|0;if(e){d=c[31]|0;f=e>>>3;h=f<<1;i=144+(h<<2)|0;g=c[26]|0;f=1<<f;if(g&f){h=144+(h+2<<2)|0;g=c[h>>2]|0;if(g>>>0<(c[30]|0)>>>0)ea();else{u=h;w=g}}else{c[26]=g|f;u=144+(h+2<<2)|0;w=i}c[u>>2]=d;c[w+12>>2]=d;c[d+8>>2]=w;c[d+12>>2]=i}c[28]=b;c[31]=v}g=j+8|0;break}ea()}else V=154}else V=154}else if(a>>>0<=4294967231){a=a+11|0;w=a&-8;m=c[27]|0;if(m){j=0-w|0;a=a>>>8;if(a)if(w>>>0>16777215)l=31;else{v=(a+1048320|0)>>>16&8;V=a<<v;u=(V+520192|0)>>>16&4;V=V<<u;l=(V+245760|0)>>>16&2;l=14-(u|v|l)+(V<<l>>>15)|0;l=w>>>(l+7|0)&1|l<<1}else l=0;a=c[408+(l<<2)>>2]|0;a:do{if(!a){i=0;a=0;V=86}else{d=j;i=0;b=w<<((l|0)==31?0:25-(l>>>1)|0);k=a;a=0;while(1){e=c[k+4>>2]&-8;j=e-w|0;if(j>>>0<d>>>0)if((e|0)==(w|0)){e=k;a=k;V=90;break a}else a=k;else j=d;V=c[k+20>>2]|0;k=c[k+16+(b>>>31<<2)>>2]|0;i=(V|0)==0|(V|0)==(k|0)?i:V;if(!k){V=86;break}else{d=j;b=b<<1}}}}while(0);if((V|0)==86){if((i|0)==0&(a|0)==0){a=2<<l;a=m&(a|0-a);if(!a){s=w;V=154;break}a=(a&0-a)+-1|0;t=a>>>12&16;a=a>>>t;q=a>>>5&8;a=a>>>q;u=a>>>2&4;a=a>>>u;v=a>>>1&2;a=a>>>v;i=a>>>1&1;i=c[408+((q|t|u|v|i)+(a>>>i)<<2)>>2]|0;a=0}if(!i){q=j;p=a}else{e=i;V=90}}if((V|0)==90)while(1){V=0;v=(c[e+4>>2]&-8)-w|0;i=v>>>0<j>>>0;j=i?v:j;a=i?e:a;i=c[e+16>>2]|0;if(i){e=i;V=90;continue}e=c[e+20>>2]|0;if(!e){q=j;p=a;break}else V=90}if((p|0)!=0?q>>>0<((c[28]|0)-w|0)>>>0:0){a=c[30]|0;if(p>>>0>=a>>>0?(H=p+w|0,p>>>0<H>>>0):0){j=c[p+24>>2]|0;i=c[p+12>>2]|0;do{if((i|0)==(p|0)){h=p+20|0;i=c[h>>2]|0;if(!i){h=p+16|0;i=c[h>>2]|0;if(!i){y=0;break}}while(1){g=i+20|0;f=c[g>>2]|0;if(f){i=f;h=g;continue}g=i+16|0;f=c[g>>2]|0;if(!f)break;else{i=f;h=g}}if(h>>>0<a>>>0)ea();else{c[h>>2]=0;y=i;break}}else{h=c[p+8>>2]|0;if((h>>>0>=a>>>0?(r=h+12|0,(c[r>>2]|0)==(p|0)):0)?(s=i+8|0,(c[s>>2]|0)==(p|0)):0){c[r>>2]=i;c[s>>2]=h;y=i;break}ea()}}while(0);do{if(j){i=c[p+28>>2]|0;h=408+(i<<2)|0;if((p|0)==(c[h>>2]|0)){c[h>>2]=y;if(!y){c[27]=c[27]&~(1<<i);break}}else{if(j>>>0<(c[30]|0)>>>0)ea();h=j+16|0;if((c[h>>2]|0)==(p|0))c[h>>2]=y;else c[j+20>>2]=y;if(!y)break}i=c[30]|0;if(y>>>0<i>>>0)ea();c[y+24>>2]=j;h=c[p+16>>2]|0;do{if(h)if(h>>>0<i>>>0)ea();else{c[y+16>>2]=h;c[h+24>>2]=y;break}}while(0);h=c[p+20>>2]|0;if(h)if(h>>>0<(c[30]|0)>>>0)ea();else{c[y+20>>2]=h;c[h+24>>2]=y;break}}}while(0);b:do{if(q>>>0>=16){c[p+4>>2]=w|3;c[p+(w|4)>>2]=q|1;c[p+(q+w)>>2]=q;i=q>>>3;if(q>>>0<256){g=i<<1;e=144+(g<<2)|0;f=c[26]|0;h=1<<i;if(f&h){h=144+(g+2<<2)|0;g=c[h>>2]|0;if(g>>>0<(c[30]|0)>>>0)ea();else{z=h;A=g}}else{c[26]=f|h;z=144+(g+2<<2)|0;A=e}c[z>>2]=H;c[A+12>>2]=H;c[p+(w+8)>>2]=A;c[p+(w+12)>>2]=e;break}d=q>>>8;if(d)if(q>>>0>16777215)i=31;else{T=(d+1048320|0)>>>16&8;U=d<<T;S=(U+520192|0)>>>16&4;U=U<<S;i=(U+245760|0)>>>16&2;i=14-(S|T|i)+(U<<i>>>15)|0;i=q>>>(i+7|0)&1|i<<1}else i=0;h=408+(i<<2)|0;c[p+(w+28)>>2]=i;c[p+(w+20)>>2]=0;c[p+(w+16)>>2]=0;g=c[27]|0;f=1<<i;if(!(g&f)){c[27]=g|f;c[h>>2]=H;c[p+(w+24)>>2]=h;c[p+(w+12)>>2]=H;c[p+(w+8)>>2]=H;break}d=c[h>>2]|0;c:do{if((c[d+4>>2]&-8|0)!=(q|0)){i=q<<((i|0)==31?0:25-(i>>>1)|0);while(1){b=d+16+(i>>>31<<2)|0;h=c[b>>2]|0;if(!h)break;if((c[h+4>>2]&-8|0)==(q|0)){C=h;break c}else{i=i<<1;d=h}}if(b>>>0<(c[30]|0)>>>0)ea();else{c[b>>2]=H;c[p+(w+24)>>2]=d;c[p+(w+12)>>2]=H;c[p+(w+8)>>2]=H;break b}}else C=d}while(0);d=C+8|0;b=c[d>>2]|0;U=c[30]|0;if(b>>>0>=U>>>0&C>>>0>=U>>>0){c[b+12>>2]=H;c[d>>2]=H;c[p+(w+8)>>2]=b;c[p+(w+12)>>2]=C;c[p+(w+24)>>2]=0;break}else ea()}else{U=q+w|0;c[p+4>>2]=U|3;U=p+(U+4)|0;c[U>>2]=c[U>>2]|1}}while(0);g=p+8|0;break}ea()}else{s=w;V=154}}else{s=w;V=154}}else{s=-1;V=154}}while(0);d:do{if((V|0)==154){a=c[28]|0;if(a>>>0>=s>>>0){b=a-s|0;d=c[31]|0;if(b>>>0>15){c[31]=d+s;c[28]=b;c[d+(s+4)>>2]=b|1;c[d+a>>2]=b;c[d+4>>2]=s|3}else{c[28]=0;c[31]=0;c[d+4>>2]=a|3;V=d+(a+4)|0;c[V>>2]=c[V>>2]|1}g=d+8|0;break}a=c[29]|0;if(a>>>0>s>>>0){V=a-s|0;c[29]=V;g=c[32]|0;c[32]=g+s;c[g+(s+4)>>2]=V|1;c[g+4>>2]=s|3;g=g+8|0;break}if(!(c[144]|0))Me();m=s+48|0;d=c[146]|0;l=s+47|0;e=d+l|0;d=0-d|0;k=e&d;if(k>>>0>s>>>0){a=c[136]|0;if((a|0)!=0?(C=c[134]|0,H=C+k|0,H>>>0<=C>>>0|H>>>0>a>>>0):0){g=0;break}e:do{if(!(c[137]&4)){a=c[32]|0;f:do{if(a){i=552;while(1){j=c[i>>2]|0;if(j>>>0<=a>>>0?(x=i+4|0,(j+(c[x>>2]|0)|0)>>>0>a>>>0):0){g=i;a=x;break}i=c[i+8>>2]|0;if(!i){V=172;break f}}j=e-(c[29]|0)&d;if(j>>>0<2147483647){i=ga(j|0)|0;H=(i|0)==((c[g>>2]|0)+(c[a>>2]|0)|0);a=H?j:0;if(H){if((i|0)!=(-1|0)){A=i;t=a;V=192;break e}}else V=182}else a=0}else V=172}while(0);do{if((V|0)==172){g=ga(0)|0;if((g|0)!=(-1|0)){a=g;j=c[145]|0;i=j+-1|0;if(!(i&a))j=k;else j=k-a+(i+a&0-j)|0;a=c[134]|0;i=a+j|0;if(j>>>0>s>>>0&j>>>0<2147483647){H=c[136]|0;if((H|0)!=0?i>>>0<=a>>>0|i>>>0>H>>>0:0){a=0;break}i=ga(j|0)|0;V=(i|0)==(g|0);a=V?j:0;if(V){A=g;t=a;V=192;break e}else V=182}else a=0}else a=0}}while(0);g:do{if((V|0)==182){g=0-j|0;do{if(m>>>0>j>>>0&(j>>>0<2147483647&(i|0)!=(-1|0))?(B=c[146]|0,B=l-j+B&0-B,B>>>0<2147483647):0)if((ga(B|0)|0)==(-1|0)){ga(g|0)|0;break g}else{j=B+j|0;break}}while(0);if((i|0)!=(-1|0)){A=i;t=j;V=192;break e}}}while(0);c[137]=c[137]|4;V=189}else{a=0;V=189}}while(0);if((((V|0)==189?k>>>0<2147483647:0)?(D=ga(k|0)|0,E=ga(0)|0,D>>>0<E>>>0&((D|0)!=(-1|0)&(E|0)!=(-1|0))):0)?(F=E-D|0,G=F>>>0>(s+40|0)>>>0,G):0){A=D;t=G?F:a;V=192}if((V|0)==192){j=(c[134]|0)+t|0;c[134]=j;if(j>>>0>(c[135]|0)>>>0)c[135]=j;q=c[32]|0;h:do{if(q){g=552;do{a=c[g>>2]|0;j=g+4|0;i=c[j>>2]|0;if((A|0)==(a+i|0)){I=a;J=j;K=i;L=g;V=202;break}g=c[g+8>>2]|0}while((g|0)!=0);if(((V|0)==202?(c[L+12>>2]&8|0)==0:0)?q>>>0<A>>>0&q>>>0>=I>>>0:0){c[J>>2]=K+t;V=(c[29]|0)+t|0;U=q+8|0;U=(U&7|0)==0?0:0-U&7;T=V-U|0;c[32]=q+U;c[29]=T;c[q+(U+4)>>2]=T|1;c[q+(V+4)>>2]=40;c[33]=c[148];break}j=c[30]|0;if(A>>>0<j>>>0){c[30]=A;j=A}i=A+t|0;a=552;while(1){if((c[a>>2]|0)==(i|0)){g=a;i=a;V=210;break}a=c[a+8>>2]|0;if(!a){i=552;break}}if((V|0)==210)if(!(c[i+12>>2]&8)){c[g>>2]=A;o=i+4|0;c[o>>2]=(c[o>>2]|0)+t;o=A+8|0;o=(o&7|0)==0?0:0-o&7;l=A+(t+8)|0;l=(l&7|0)==0?0:0-l&7;i=A+(l+t)|0;p=o+s|0;n=A+p|0;a=i-(A+o)-s|0;c[A+(o+4)>>2]=s|3;i:do{if((i|0)!=(q|0)){if((i|0)==(c[31]|0)){V=(c[28]|0)+a|0;c[28]=V;c[31]=n;c[A+(p+4)>>2]=V|1;c[A+(V+p)>>2]=V;break}b=t+4|0;h=c[A+(b+l)>>2]|0;if((h&3|0)==1){k=h&-8;e=h>>>3;j:do{if(h>>>0>=256){d=c[A+((l|24)+t)>>2]|0;g=c[A+(t+12+l)>>2]|0;k:do{if((g|0)==(i|0)){f=l|16;g=A+(b+f)|0;h=c[g>>2]|0;if(!h){g=A+(f+t)|0;h=c[g>>2]|0;if(!h){R=0;break}}while(1){f=h+20|0;e=c[f>>2]|0;if(e){h=e;g=f;continue}f=h+16|0;e=c[f>>2]|0;if(!e)break;else{h=e;g=f}}if(g>>>0<j>>>0)ea();else{c[g>>2]=0;R=h;break}}else{f=c[A+((l|8)+t)>>2]|0;do{if(f>>>0>=j>>>0){j=f+12|0;if((c[j>>2]|0)!=(i|0))break;h=g+8|0;if((c[h>>2]|0)!=(i|0))break;c[j>>2]=g;c[h>>2]=f;R=g;break k}}while(0);ea()}}while(0);if(!d)break;j=c[A+(t+28+l)>>2]|0;h=408+(j<<2)|0;do{if((i|0)!=(c[h>>2]|0)){if(d>>>0<(c[30]|0)>>>0)ea();h=d+16|0;if((c[h>>2]|0)==(i|0))c[h>>2]=R;else c[d+20>>2]=R;if(!R)break j}else{c[h>>2]=R;if(R)break;c[27]=c[27]&~(1<<j);break j}}while(0);j=c[30]|0;if(R>>>0<j>>>0)ea();c[R+24>>2]=d;i=l|16;h=c[A+(i+t)>>2]|0;do{if(h)if(h>>>0<j>>>0)ea();else{c[R+16>>2]=h;c[h+24>>2]=R;break}}while(0);i=c[A+(b+i)>>2]|0;if(!i)break;if(i>>>0<(c[30]|0)>>>0)ea();else{c[R+20>>2]=i;c[i+24>>2]=R;break}}else{h=c[A+((l|8)+t)>>2]|0;g=c[A+(t+12+l)>>2]|0;f=144+(e<<1<<2)|0;do{if((h|0)!=(f|0)){if(h>>>0>=j>>>0?(c[h+12>>2]|0)==(i|0):0)break;ea()}}while(0);if((g|0)==(h|0)){c[26]=c[26]&~(1<<e);break}do{if((g|0)==(f|0))M=g+8|0;else{if(g>>>0>=j>>>0?(N=g+8|0,(c[N>>2]|0)==(i|0)):0){M=N;break}ea()}}while(0);c[h+12>>2]=g;c[M>>2]=h}}while(0);i=A+((k|l)+t)|0;a=k+a|0}i=i+4|0;c[i>>2]=c[i>>2]&-2;c[A+(p+4)>>2]=a|1;c[A+(a+p)>>2]=a;i=a>>>3;if(a>>>0<256){g=i<<1;e=144+(g<<2)|0;f=c[26]|0;h=1<<i;do{if(!(f&h)){c[26]=f|h;S=144+(g+2<<2)|0;T=e}else{h=144+(g+2<<2)|0;g=c[h>>2]|0;if(g>>>0>=(c[30]|0)>>>0){S=h;T=g;break}ea()}}while(0);c[S>>2]=n;c[T+12>>2]=n;c[A+(p+8)>>2]=T;c[A+(p+12)>>2]=e;break}d=a>>>8;do{if(!d)i=0;else{if(a>>>0>16777215){i=31;break}T=(d+1048320|0)>>>16&8;V=d<<T;S=(V+520192|0)>>>16&4;V=V<<S;i=(V+245760|0)>>>16&2;i=14-(S|T|i)+(V<<i>>>15)|0;i=a>>>(i+7|0)&1|i<<1}}while(0);h=408+(i<<2)|0;c[A+(p+28)>>2]=i;c[A+(p+20)>>2]=0;c[A+(p+16)>>2]=0;g=c[27]|0;f=1<<i;if(!(g&f)){c[27]=g|f;c[h>>2]=n;c[A+(p+24)>>2]=h;c[A+(p+12)>>2]=n;c[A+(p+8)>>2]=n;break}d=c[h>>2]|0;l:do{if((c[d+4>>2]&-8|0)!=(a|0)){i=a<<((i|0)==31?0:25-(i>>>1)|0);while(1){b=d+16+(i>>>31<<2)|0;h=c[b>>2]|0;if(!h)break;if((c[h+4>>2]&-8|0)==(a|0)){U=h;break l}else{i=i<<1;d=h}}if(b>>>0<(c[30]|0)>>>0)ea();else{c[b>>2]=n;c[A+(p+24)>>2]=d;c[A+(p+12)>>2]=n;c[A+(p+8)>>2]=n;break i}}else U=d}while(0);d=U+8|0;b=c[d>>2]|0;V=c[30]|0;if(b>>>0>=V>>>0&U>>>0>=V>>>0){c[b+12>>2]=n;c[d>>2]=n;c[A+(p+8)>>2]=b;c[A+(p+12)>>2]=U;c[A+(p+24)>>2]=0;break}else ea()}else{V=(c[29]|0)+a|0;c[29]=V;c[32]=n;c[A+(p+4)>>2]=V|1}}while(0);g=A+(o|8)|0;break d}else i=552;while(1){g=c[i>>2]|0;if(g>>>0<=q>>>0?(h=c[i+4>>2]|0,f=g+h|0,f>>>0>q>>>0):0)break;i=c[i+8>>2]|0}i=g+(h+-39)|0;i=g+(h+-47+((i&7|0)==0?0:0-i&7))|0;j=q+16|0;i=i>>>0<j>>>0?q:i;h=i+8|0;g=A+8|0;g=(g&7|0)==0?0:0-g&7;V=t+-40-g|0;c[32]=A+g;c[29]=V;c[A+(g+4)>>2]=V|1;c[A+(t+-36)>>2]=40;c[33]=c[148];g=i+4|0;c[g>>2]=27;c[h>>2]=c[138];c[h+4>>2]=c[139];c[h+8>>2]=c[140];c[h+12>>2]=c[141];c[138]=A;c[139]=t;c[141]=0;c[140]=h;h=i+28|0;c[h>>2]=7;if((i+32|0)>>>0<f>>>0)do{V=h;h=h+4|0;c[h>>2]=7}while((V+8|0)>>>0<f>>>0);if((i|0)!=(q|0)){a=i-q|0;c[g>>2]=c[g>>2]&-2;c[q+4>>2]=a|1;c[i>>2]=a;f=a>>>3;if(a>>>0<256){h=f<<1;i=144+(h<<2)|0;g=c[26]|0;e=1<<f;if(g&e){d=144+(h+2<<2)|0;b=c[d>>2]|0;if(b>>>0<(c[30]|0)>>>0)ea();else{O=d;P=b}}else{c[26]=g|e;O=144+(h+2<<2)|0;P=i}c[O>>2]=q;c[P+12>>2]=q;c[q+8>>2]=P;c[q+12>>2]=i;break}d=a>>>8;if(d)if(a>>>0>16777215)h=31;else{U=(d+1048320|0)>>>16&8;V=d<<U;T=(V+520192|0)>>>16&4;V=V<<T;h=(V+245760|0)>>>16&2;h=14-(T|U|h)+(V<<h>>>15)|0;h=a>>>(h+7|0)&1|h<<1}else h=0;e=408+(h<<2)|0;c[q+28>>2]=h;c[q+20>>2]=0;c[j>>2]=0;d=c[27]|0;b=1<<h;if(!(d&b)){c[27]=d|b;c[e>>2]=q;c[q+24>>2]=e;c[q+12>>2]=q;c[q+8>>2]=q;break}d=c[e>>2]|0;m:do{if((c[d+4>>2]&-8|0)!=(a|0)){h=a<<((h|0)==31?0:25-(h>>>1)|0);while(1){b=d+16+(h>>>31<<2)|0;e=c[b>>2]|0;if(!e)break;if((c[e+4>>2]&-8|0)==(a|0)){Q=e;break m}else{h=h<<1;d=e}}if(b>>>0<(c[30]|0)>>>0)ea();else{c[b>>2]=q;c[q+24>>2]=d;c[q+12>>2]=q;c[q+8>>2]=q;break h}}else Q=d}while(0);d=Q+8|0;b=c[d>>2]|0;V=c[30]|0;if(b>>>0>=V>>>0&Q>>>0>=V>>>0){c[b+12>>2]=q;c[d>>2]=q;c[q+8>>2]=b;c[q+12>>2]=Q;c[q+24>>2]=0;break}else ea()}}else{V=c[30]|0;if((V|0)==0|A>>>0<V>>>0)c[30]=A;c[138]=A;c[139]=t;c[141]=0;c[35]=c[144];c[34]=-1;d=0;do{V=d<<1;U=144+(V<<2)|0;c[144+(V+3<<2)>>2]=U;c[144+(V+2<<2)>>2]=U;d=d+1|0}while((d|0)!=32);V=A+8|0;V=(V&7|0)==0?0:0-V&7;U=t+-40-V|0;c[32]=A+V;c[29]=U;c[A+(V+4)>>2]=U|1;c[A+(t+-36)>>2]=40;c[33]=c[148]}}while(0);b=c[29]|0;if(b>>>0>s>>>0){V=b-s|0;c[29]=V;g=c[32]|0;c[32]=g+s;c[g+(s+4)>>2]=V|1;c[g+4>>2]=s|3;g=g+8|0;break}}c[(Le()|0)>>2]=12;g=0}else g=0}}while(0);return g|0}function Ke(a){a=a|0;var b=0,d=0,e=0,f=0,g=0,h=0,i=0,j=0,k=0,l=0,m=0,n=0,o=0,p=0,q=0,r=0,s=0,t=0,u=0,v=0,w=0,x=0,y=0,z=0,A=0,B=0;a:do{if(a){f=a+-8|0;k=c[30]|0;b:do{if(f>>>0>=k>>>0?(e=c[a+-4>>2]|0,d=e&3,(d|0)!=1):0){v=e&-8;w=a+(v+-8)|0;do{if(!(e&1)){f=c[f>>2]|0;if(!d)break a;l=-8-f|0;n=a+l|0;o=f+v|0;if(n>>>0<k>>>0)break b;if((n|0)==(c[31]|0)){g=a+(v+-4)|0;f=c[g>>2]|0;if((f&3|0)!=3){B=n;g=o;break}c[28]=o;c[g>>2]=f&-2;c[a+(l+4)>>2]=o|1;c[w>>2]=o;break a}d=f>>>3;if(f>>>0<256){e=c[a+(l+8)>>2]|0;g=c[a+(l+12)>>2]|0;f=144+(d<<1<<2)|0;do{if((e|0)!=(f|0)){if(e>>>0>=k>>>0?(c[e+12>>2]|0)==(n|0):0)break;ea()}}while(0);if((g|0)==(e|0)){c[26]=c[26]&~(1<<d);B=n;g=o;break}do{if((g|0)==(f|0))b=g+8|0;else{if(g>>>0>=k>>>0?(h=g+8|0,(c[h>>2]|0)==(n|0)):0){b=h;break}ea()}}while(0);c[e+12>>2]=g;c[b>>2]=e;B=n;g=o;break}h=c[a+(l+24)>>2]|0;f=c[a+(l+12)>>2]|0;do{if((f|0)==(n|0)){e=a+(l+20)|0;f=c[e>>2]|0;if(!f){e=a+(l+16)|0;f=c[e>>2]|0;if(!f){m=0;break}}while(1){d=f+20|0;b=c[d>>2]|0;if(b){f=b;e=d;continue}d=f+16|0;b=c[d>>2]|0;if(!b)break;else{f=b;e=d}}if(e>>>0<k>>>0)ea();else{c[e>>2]=0;m=f;break}}else{e=c[a+(l+8)>>2]|0;if((e>>>0>=k>>>0?(i=e+12|0,(c[i>>2]|0)==(n|0)):0)?(j=f+8|0,(c[j>>2]|0)==(n|0)):0){c[i>>2]=f;c[j>>2]=e;m=f;break}ea()}}while(0);if(h){f=c[a+(l+28)>>2]|0;e=408+(f<<2)|0;if((n|0)==(c[e>>2]|0)){c[e>>2]=m;if(!m){c[27]=c[27]&~(1<<f);B=n;g=o;break}}else{if(h>>>0<(c[30]|0)>>>0)ea();f=h+16|0;if((c[f>>2]|0)==(n|0))c[f>>2]=m;else c[h+20>>2]=m;if(!m){B=n;g=o;break}}e=c[30]|0;if(m>>>0<e>>>0)ea();c[m+24>>2]=h;f=c[a+(l+16)>>2]|0;do{if(f)if(f>>>0<e>>>0)ea();else{c[m+16>>2]=f;c[f+24>>2]=m;break}}while(0);f=c[a+(l+20)>>2]|0;if(f)if(f>>>0<(c[30]|0)>>>0)ea();else{c[m+20>>2]=f;c[f+24>>2]=m;B=n;g=o;break}else{B=n;g=o}}else{B=n;g=o}}else{B=f;g=v}}while(0);if(B>>>0<w>>>0?(p=a+(v+-4)|0,q=c[p>>2]|0,(q&1|0)!=0):0){if(!(q&2)){if((w|0)==(c[32]|0)){A=(c[29]|0)+g|0;c[29]=A;c[32]=B;c[B+4>>2]=A|1;if((B|0)!=(c[31]|0))break a;c[31]=0;c[28]=0;break a}if((w|0)==(c[31]|0)){A=(c[28]|0)+g|0;c[28]=A;c[31]=B;c[B+4>>2]=A|1;c[B+A>>2]=A;break a}j=(q&-8)+g|0;d=q>>>3;do{if(q>>>0>=256){b=c[a+(v+16)>>2]|0;g=c[a+(v|4)>>2]|0;do{if((g|0)==(w|0)){f=a+(v+12)|0;g=c[f>>2]|0;if(!g){f=a+(v+8)|0;g=c[f>>2]|0;if(!g){x=0;break}}while(1){e=g+20|0;d=c[e>>2]|0;if(d){g=d;f=e;continue}e=g+16|0;d=c[e>>2]|0;if(!d)break;else{g=d;f=e}}if(f>>>0<(c[30]|0)>>>0)ea();else{c[f>>2]=0;x=g;break}}else{f=c[a+v>>2]|0;if((f>>>0>=(c[30]|0)>>>0?(t=f+12|0,(c[t>>2]|0)==(w|0)):0)?(u=g+8|0,(c[u>>2]|0)==(w|0)):0){c[t>>2]=g;c[u>>2]=f;x=g;break}ea()}}while(0);if(b){g=c[a+(v+20)>>2]|0;f=408+(g<<2)|0;if((w|0)==(c[f>>2]|0)){c[f>>2]=x;if(!x){c[27]=c[27]&~(1<<g);break}}else{if(b>>>0<(c[30]|0)>>>0)ea();g=b+16|0;if((c[g>>2]|0)==(w|0))c[g>>2]=x;else c[b+20>>2]=x;if(!x)break}g=c[30]|0;if(x>>>0<g>>>0)ea();c[x+24>>2]=b;f=c[a+(v+8)>>2]|0;do{if(f)if(f>>>0<g>>>0)ea();else{c[x+16>>2]=f;c[f+24>>2]=x;break}}while(0);d=c[a+(v+12)>>2]|0;if(d)if(d>>>0<(c[30]|0)>>>0)ea();else{c[x+20>>2]=d;c[d+24>>2]=x;break}}}else{e=c[a+v>>2]|0;g=c[a+(v|4)>>2]|0;f=144+(d<<1<<2)|0;do{if((e|0)!=(f|0)){if(e>>>0>=(c[30]|0)>>>0?(c[e+12>>2]|0)==(w|0):0)break;ea()}}while(0);if((g|0)==(e|0)){c[26]=c[26]&~(1<<d);break}do{if((g|0)==(f|0))r=g+8|0;else{if(g>>>0>=(c[30]|0)>>>0?(s=g+8|0,(c[s>>2]|0)==(w|0)):0){r=s;break}ea()}}while(0);c[e+12>>2]=g;c[r>>2]=e}}while(0);c[B+4>>2]=j|1;c[B+j>>2]=j;if((B|0)==(c[31]|0)){c[28]=j;break a}else g=j}else{c[p>>2]=q&-2;c[B+4>>2]=g|1;c[B+g>>2]=g}f=g>>>3;if(g>>>0<256){e=f<<1;g=144+(e<<2)|0;b=c[26]|0;d=1<<f;if(b&d){d=144+(e+2<<2)|0;b=c[d>>2]|0;if(b>>>0<(c[30]|0)>>>0)ea();else{y=d;z=b}}else{c[26]=b|d;y=144+(e+2<<2)|0;z=g}c[y>>2]=B;c[z+12>>2]=B;c[B+8>>2]=z;c[B+12>>2]=g;break a}b=g>>>8;if(b)if(g>>>0>16777215)f=31;else{y=(b+1048320|0)>>>16&8;z=b<<y;a=(z+520192|0)>>>16&4;z=z<<a;f=(z+245760|0)>>>16&2;f=14-(a|y|f)+(z<<f>>>15)|0;f=g>>>(f+7|0)&1|f<<1}else f=0;d=408+(f<<2)|0;c[B+28>>2]=f;c[B+20>>2]=0;c[B+16>>2]=0;b=c[27]|0;e=1<<f;c:do{if(b&e){d=c[d>>2]|0;d:do{if((c[d+4>>2]&-8|0)!=(g|0)){f=g<<((f|0)==31?0:25-(f>>>1)|0);while(1){b=d+16+(f>>>31<<2)|0;e=c[b>>2]|0;if(!e)break;if((c[e+4>>2]&-8|0)==(g|0)){A=e;break d}else{f=f<<1;d=e}}if(b>>>0<(c[30]|0)>>>0)ea();else{c[b>>2]=B;c[B+24>>2]=d;c[B+12>>2]=B;c[B+8>>2]=B;break c}}else A=d}while(0);b=A+8|0;d=c[b>>2]|0;z=c[30]|0;if(d>>>0>=z>>>0&A>>>0>=z>>>0){c[d+12>>2]=B;c[b>>2]=B;c[B+8>>2]=d;c[B+12>>2]=A;c[B+24>>2]=0;break}else ea()}else{c[27]=b|e;c[d>>2]=B;c[B+24>>2]=d;c[B+12>>2]=B;c[B+8>>2]=B}}while(0);B=(c[34]|0)+-1|0;c[34]=B;if(!B)b=560;else break a;while(1){b=c[b>>2]|0;if(!b)break;else b=b+8|0}c[34]=-1;break a}}}while(0);ea()}}while(0);return}function Le(){var a=0;if(!0)a=600;else a=c[(da()|0)+60>>2]|0;return a|0}function Me(){var a=0;do{if(!(c[144]|0)){a=ca(30)|0;if(!(a+-1&a)){c[146]=a;c[145]=a;c[147]=-1;c[148]=-1;c[149]=0;c[137]=0;c[144]=(ha(0)|0)&-16^1431655768;break}else ea()}}while(0);return}function Ne(){}function Oe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0;if((e|0)>=4096)return ja(b|0,d|0,e|0)|0;f=b|0;if((b&3)==(d&3)){while(b&3){if(!e)return f|0;a[b>>0]=a[d>>0]|0;b=b+1|0;d=d+1|0;e=e-1|0}while((e|0)>=4){c[b>>2]=c[d>>2];b=b+4|0;d=d+4|0;e=e-4|0}}while((e|0)>0){a[b>>0]=a[d>>0]|0;b=b+1|0;d=d+1|0;e=e-1|0}return f|0}function Pe(b,c,d){b=b|0;c=c|0;d=d|0;var e=0;if((c|0)<(b|0)&(b|0)<(c+d|0)){e=b;c=c+d|0;b=b+d|0;while((d|0)>0){b=b-1|0;c=c-1|0;d=d-1|0;a[b>>0]=a[c>>0]|0}b=e}else Oe(b,c,d)|0;return b|0}function Qe(b,d,e){b=b|0;d=d|0;e=e|0;var f=0,g=0,h=0,i=0;f=b+e|0;if((e|0)>=20){d=d&255;h=b&3;i=d|d<<8|d<<16|d<<24;g=f&~3;if(h){h=b+4-h|0;while((b|0)<(h|0)){a[b>>0]=d;b=b+1|0}}while((b|0)<(g|0)){c[b>>2]=i;b=b+4|0}}while((b|0)<(f|0)){a[b>>0]=d;b=b+1|0}return b-e|0}return{_free:Ke,___errno_location:Le,_memmove:Pe,_Decoder_Interface_Decode:xa,_Decoder_Interface_exit:wa,_Encoder_Interface_init:ya,_memset:Qe,_malloc:Je,_memcpy:Oe,_Encoder_Interface_exit:za,_Decoder_Interface_init:va,_Encoder_Interface_Encode:Aa,runPostSets:Ne,stackAlloc:ma,stackSave:na,stackRestore:oa,establishStackSpace:pa,setThrew:qa,setTempRet0:ta,getTempRet0:ua}}(Module.asmGlobalArg,Module.asmLibraryArg,buffer);var _Encoder_Interface_Encode=Module["_Encoder_Interface_Encode"]=asm["_Encoder_Interface_Encode"];var _free=Module["_free"]=asm["_free"];var runPostSets=Module["runPostSets"]=asm["runPostSets"];var _memmove=Module["_memmove"]=asm["_memmove"];var _Decoder_Interface_exit=Module["_Decoder_Interface_exit"]=asm["_Decoder_Interface_exit"];var _Encoder_Interface_init=Module["_Encoder_Interface_init"]=asm["_Encoder_Interface_init"];var _memset=Module["_memset"]=asm["_memset"];var _malloc=Module["_malloc"]=asm["_malloc"];var _memcpy=Module["_memcpy"]=asm["_memcpy"];var _Decoder_Interface_Decode=Module["_Decoder_Interface_Decode"]=asm["_Decoder_Interface_Decode"];var _Decoder_Interface_init=Module["_Decoder_Interface_init"]=asm["_Decoder_Interface_init"];var _Encoder_Interface_exit=Module["_Encoder_Interface_exit"]=asm["_Encoder_Interface_exit"];var ___errno_location=Module["___errno_location"]=asm["___errno_location"];Runtime.stackAlloc=asm["stackAlloc"];Runtime.stackSave=asm["stackSave"];Runtime.stackRestore=asm["stackRestore"];Runtime.establishStackSpace=asm["establishStackSpace"];Runtime.setTempRet0=asm["setTempRet0"];Runtime.getTempRet0=asm["getTempRet0"];function ExitStatus(status){this.name="ExitStatus";this.message="Program terminated with exit("+status+")";this.status=status}ExitStatus.prototype=new Error;ExitStatus.prototype.constructor=ExitStatus;var initialStackTop;var preloadStartTime=null;var calledMain=false;dependenciesFulfilled=function runCaller(){if(!Module["calledRun"])run();if(!Module["calledRun"])dependenciesFulfilled=runCaller};Module["callMain"]=Module.callMain=function callMain(args){assert(runDependencies==0,"cannot call main when async dependencies remain! (listen on __ATMAIN__)");assert(__ATPRERUN__.length==0,"cannot call main when preRun functions remain to be called");args=args||[];ensureInitRuntime();var argc=args.length+1;function pad(){for(var i=0;i<4-1;i++){argv.push(0)}}var argv=[allocate(intArrayFromString(Module["thisProgram"]),"i8",ALLOC_NORMAL)];pad();for(var i=0;i<argc-1;i=i+1){argv.push(allocate(intArrayFromString(args[i]),"i8",ALLOC_NORMAL));pad()}argv.push(0);argv=allocate(argv,"i32",ALLOC_NORMAL);initialStackTop=Runtime.stackSave();try{var ret=Module["_main"](argc,argv,0);exit(ret,true)}catch(e){if(e instanceof ExitStatus){return}else if(e=="SimulateInfiniteLoop"){Module["noExitRuntime"]=true;Runtime.stackRestore(initialStackTop);return}else{if(e&&typeof e==="object"&&e.stack)Module.printErr("exception thrown: "+[e,e.stack]);throw e}}finally{calledMain=true}};function run(args){args=args||Module["arguments"];if(preloadStartTime===null)preloadStartTime=Date.now();if(runDependencies>0){return}preRun();if(runDependencies>0)return;if(Module["calledRun"])return;function doRun(){if(Module["calledRun"])return;Module["calledRun"]=true;if(ABORT)return;ensureInitRuntime();preMain();if(Module["onRuntimeInitialized"])Module["onRuntimeInitialized"]();if(Module["_main"]&&shouldRunNow)Module["callMain"](args);postRun()}if(Module["setStatus"]){Module["setStatus"]("Running...");setTimeout(function(){setTimeout(function(){Module["setStatus"]("")},1);doRun()},1)}else{doRun()}}Module["run"]=Module.run=run;function exit(status,implicit){if(implicit&&Module["noExitRuntime"]){return}if(Module["noExitRuntime"]){}else{ABORT=true;EXITSTATUS=status;STACKTOP=initialStackTop;exitRuntime();if(Module["onExit"])Module["onExit"](status)}if(ENVIRONMENT_IS_SHELL&&typeof quit==="function"){quit(status)}throw new ExitStatus(status)}Module["exit"]=Module.exit=exit;var abortDecorators=[];function abort(what){if(what!==undefined){Module.print(what);Module.printErr(what);what=JSON.stringify(what)}else{what=""}ABORT=true;EXITSTATUS=1;var extra="\\nIf this abort() is unexpected, build with -s ASSERTIONS=1 which can give more information.";var output="abort("+what+") at "+stackTrace()+extra;if(abortDecorators){abortDecorators.forEach(function(decorator){output=decorator(output,what)})}throw output}Module["abort"]=Module.abort=abort;if(Module["preInit"]){if(typeof Module["preInit"]=="function")Module["preInit"]=[Module["preInit"]];while(Module["preInit"].length>0){Module["preInit"].pop()()}}var shouldRunNow=true;if(Module["noInitialRun"]){shouldRunNow=false}Module["noExitRuntime"]=true;run();return AMR}();self.onmessage=function(e){switch(e.data.command){case"encode":encode(e.data.samples,e.data.sampleRate,e.data.seq);break;case"decode":decode(e.data.buffer,e.data.seq);break}};function encode(samples,sampleRate,seq){sampleRate=sampleRate||8e3;self.postMessage({command:"encode",amr:AMR.encode(samples,sampleRate,7),seq:seq})}function decode(u8Array,seq){self.postMessage({command:"decode",amr:AMR.decode(u8Array),seq:seq})}\n},{}]},{},[1]);\n'],{type:"text/javascript"})));
        this._amrWorker.onmessage = function (e) {
            _this._amrResolves[e.data.seq + ''](e.data.amr);
            delete _this._amrResolves[e.data.seq + ''];
        };
    }

    /**
     * 是否已经初始化
     * @return {boolean}
     */


    _createClass(BenzAMRRecorder, [{
        key: 'isInit',
        value: function isInit() {
            return this._isInit;
        }

        /**
         * 使用浮点数据初始化
         * @param {Float32Array} array
         * @return {Promise}
         */

    }, {
        key: 'initWithArrayBuffer',
        value: function initWithArrayBuffer(array) {
            var _this2 = this;

            if (this._isInit || this._isInitRecorder) {
                throw new Error('AMR has been initialized. For a new AMR, please generate a new BenzAMRRecorder().');
            }
            this._playEmpty();
            return new Promise(function (resolve, reject) {
                var u8Array = new Uint8Array(array);
                _this2.decodeAMRAsync(u8Array).then(function (samples) {
                    _this2._samples = samples;
                    _this2._isInit = true;

                    if (!_this2._samples) {
                        (0, _audioContext.decodeAudioArrayBufferByContext)(array).then(function (data) {
                            _this2._isInit = true;
                            return _this2.encodeAMRAsync(data, (0, _audioContext.getCtxSampleRate)());
                        }).then(function (rawData) {
                            _this2._rawData = rawData;
                            _this2._blob = BenzAMRRecorder.rawAMRData2Blob(rawData);
                            return _this2.decodeAMRAsync(rawData);
                        }).then(function (sample) {
                            _this2._samples = sample;
                            resolve();
                        }).catch(function () {
                            reject(new Error('Failed to decode.'));
                        });
                    } else {
                        _this2._rawData = u8Array;
                        resolve();
                    }
                });
            });
        }

        /**
         * 使用 Blob 对象初始化（ <input type="file">）
         * @param {Blob} blob
         * @return {Promise}
         */

    }, {
        key: 'initWithBlob',
        value: function initWithBlob(blob) {
            var _this3 = this;

            if (this._isInit || this._isInitRecorder) {
                throw new Error('AMR has been initialized. For a new AMR, please generate a new BenzAMRRecorder().');
            }
            this._playEmpty();
            this._blob = blob;
            var p = new Promise(function (resolve) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    resolve(e.target.result);
                };
                reader.readAsArrayBuffer(blob);
            });
            return p.then(function (data) {
                return _this3.initWithArrayBuffer(data);
            });
        }

        /**
         * 使用 url 初始化
         * @param {string} url
         * @return {Promise}
         */

    }, {
        key: 'initWithUrl',
        value: function initWithUrl(url) {
            var _this4 = this;

            if (this._isInit || this._isInitRecorder) {
                throw new Error('AMR has been initialized. For a new AMR, please generate a new BenzAMRRecorder().');
            }
            this._playEmpty();
            var p = new Promise(function (resolve, reject) {
                var xhr = new XMLHttpRequest();
                xhr.open('GET', url, true);
                xhr.responseType = 'arraybuffer';
                xhr.onload = function () {
                    resolve(this.response);
                };
                xhr.onerror = function () {
                    reject(new Error('Failed to fetch ' + url));
                };
                xhr.send();
            });
            return p.then(function (array) {
                return _this4.initWithArrayBuffer(array);
            });
        }

        /**
         * 初始化录音
         * @return {Promise}
         */

    }, {
        key: 'initWithRecord',
        value: function initWithRecord() {
            var _this5 = this;

            if (this._isInit || this._isInitRecorder) {
                throw new Error('AMR has been initialized. For a new AMR, please generate a new BenzAMRRecorder().');
            }
            this._playEmpty();
            return new Promise(function (resolve, reject) {
                (0, _audioContext.initRecorder)().then(function () {
                    _this5._isInitRecorder = true;
                    resolve();
                }).catch(function (e) {
                    reject(e);
                });
            });
        }

        /**
         * init 之前先播放一个空音频。
         * 因为有些环境（如iOS）播放首个音频时禁止自动、异步播放，
         * 播放空音频防止加载后立即播放的功能失效。
         * 但即使如此，init* 仍然须放入一个用户事件中
         * @private
         */

    }, {
        key: 'on',
        value: function on(action, fn) {
            if (typeof fn === 'function') {
                switch (action) {
                    case 'play':
                        this._onPlay = fn;
                        break;
                    case 'stop':
                        this._onStop = fn;
                        break;
                    case 'ended':
                        this._onEnded = fn;
                        break;
                    case 'startRecord':
                        this._onStartRecord = fn;
                        break;
                    case 'cancelRecord':
                        this._onCancelRecord = fn;
                        break;
                    case 'finishRecord':
                        this._onFinishRecord = fn;
                        break;
                    default:
                }
            }
        }

        /**
         * 播放事件
         * @param {Function} fn
         */

    }, {
        key: 'onPlay',
        value: function onPlay(fn) {
            this.on('play', fn);
        }

        /**
         * 停止事件（包括播放结束）
         * @param {Function} fn
         */

    }, {
        key: 'onStop',
        value: function onStop(fn) {
            this.on('stop', fn);
        }

        /**
         * 播放结束事件
         * @param {Function} fn
         */

    }, {
        key: 'onEnded',
        value: function onEnded(fn) {
            this.on('ended', fn);
        }

        /**
         * 开始录音事件
         * @param {Function} fn
         */

    }, {
        key: 'onStartRecord',
        value: function onStartRecord(fn) {
            this.on('startRecord', fn);
        }

        /**
         * 结束录音事件
         * @param {Function} fn
         */

    }, {
        key: 'onFinishRecord',
        value: function onFinishRecord(fn) {
            this.on('finishRecord', fn);
        }

        /**
         * 放弃录音事件
         * @param {Function} fn
         */

    }, {
        key: 'onCancelRecord',
        value: function onCancelRecord(fn) {
            this.on('cancelRecord', fn);
        }
    }, {
        key: 'play',


        /**
         * 播放
         */
        value: function play() {
            if (!this._isInit) {
                throw new Error('Please init AMR first.');
            }
            if (this._onPlay) {
                this._onPlay();
            }
            this._isPlaying = true;
            (0, _audioContext.playPcm)(this._samples, this._isInitRecorder ? (0, _audioContext.getCtxSampleRate)() : 8000, this._onEndCallback.bind(this));
        }

        /**
         * 停止
         */

    }, {
        key: 'stop',
        value: function stop() {
            (0, _audioContext.stopPcm)();
            this._isPlaying = false;
            if (this._onStop) {
                this._onStop();
            }
        }

        /**
         * 是否正在播放
         * @return {boolean}
         */

    }, {
        key: 'isPlaying',
        value: function isPlaying() {
            return this._isPlaying;
        }

        /**
         * 开始录音
         */

    }, {
        key: 'startRecord',
        value: function startRecord() {
            (0, _audioContext.startRecord)();
            if (this._onStartRecord) {
                this._onStartRecord();
            }
        }

        /**
         * 结束录音，并把录制的音频转换成 AMR
         * @return {Promise}
         */

    }, {
        key: 'finishRecord',
        value: function finishRecord() {
            var _this6 = this;

            return new Promise(function (resolve) {
                (0, _audioContext.stopRecord)();
                (0, _audioContext.generateRecordSamples)().then(function (samples) {
                    _this6._samples = samples;
                    return _this6.encodeAMRAsync(samples, (0, _audioContext.getCtxSampleRate)());
                }).then(function (rawData) {
                    _this6._rawData = rawData;
                    _this6._blob = BenzAMRRecorder.rawAMRData2Blob(_this6._rawData);
                    _this6._isInit = true;
                    if (_this6._onFinishRecord) {
                        _this6._onFinishRecord();
                    }
                    resolve();
                });
            });
        }

        /**
         * 放弃录音
         */

    }, {
        key: 'cancelRecord',
        value: function cancelRecord() {
            (0, _audioContext.stopRecord)();
            if (this._onCancelRecord) {
                this._onCancelRecord();
            }
        }

        /**
         * 是否正在录音
         * @return {boolean}
         */

    }, {
        key: 'isRecording',
        value: function isRecording() {
            return (0, _audioContext.isRecording)();
        }

        /**
         * 获取音频的时间长度（单位：秒）
         * @return {Number}
         */

    }, {
        key: 'getDuration',
        value: function getDuration() {
            var rate = this._isInitRecorder ? (0, _audioContext.getCtxSampleRate)() : 8000;
            return this._samples.length / rate;
        }
    }, {
        key: 'getBlob',
        value: function getBlob() {
            return this._blob;
        }

        /*
        static encodeAMR(samples, sampleRate) {
            sampleRate = sampleRate || 8000;
            return AMR.encode(samples, sampleRate, 7);
        }
        */

    }, {
        key: 'encodeAMRAsync',
        value: function encodeAMRAsync(samples, sampleRate) {
            var _this7 = this;

            return new Promise(function (resolve) {
                _this7._amrSeq++;
                _this7._amrResolves[_this7._amrSeq + ''] = resolve;
                _this7._amrWorker.postMessage({
                    command: 'encode',
                    samples: samples,
                    sampleRate: sampleRate,
                    seq: _this7._amrSeq
                });
            });
        }
    }, {
        key: 'decodeAMRAsync',
        value: function decodeAMRAsync(u8Array) {
            var _this8 = this;

            return new Promise(function (resolve) {
                _this8._amrSeq++;
                _this8._amrResolves[_this8._amrSeq + ''] = resolve;
                _this8._amrWorker.postMessage({
                    command: 'decode',
                    buffer: u8Array,
                    seq: _this8._amrSeq
                });
            });
        }
    }], [{
        key: 'rawAMRData2Blob',
        value: function rawAMRData2Blob(data) {
            return new Blob([data.buffer], { type: 'audio/amr' });
        }
    }]);

    return BenzAMRRecorder;
}();

exports.default = BenzAMRRecorder;

},{"./audioContext":14}],14:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.decodeAudioArrayBufferByContext = exports.generateRecordSamples = exports.getCtxSampleRate = exports.stopRecord = exports.startRecord = exports.isRecording = exports.initRecorder = exports.stopPcm = exports.playPcm = undefined;

var _recorderjs = require('recorderjs');

var _recorderjs2 = _interopRequireDefault(_recorderjs);

var _audioBufferRemix = require('audio-buffer-remix');

var _audioBufferRemix2 = _interopRequireDefault(_audioBufferRemix);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * @file 公共的 Web Audio API Context
 * @author BenzLeung(https://github.com/BenzLeung)
 * @date 2017/11/12
 * Created by JetBrains PhpStorm.
 *
 * 每位工程师都有保持代码优雅的义务
 * each engineer has a duty to keep the code elegant
 */

var AudioContext = window.AudioContext || window.webkitAudioContext || window.mozAudioContext;

var ctx = null;
var curSourceNode = null;

if (AudioContext) {
    ctx = new AudioContext();
} else {
    console.error(new Error('Web Audio API is Unsupported.'));
}
/*
const increaseSampleRate = function (samples, multiple) {
    let sampleLen = samples.length;
    let newSamples = new Float32Array(sampleLen * multiple);
    for (let i = 0; i < sampleLen; i ++) {
        for (let j = 0; j < multiple; j ++) {
            newSamples[i * multiple + j] = samples[i];
        }
    }
    return newSamples;
};
*/

var playPcm = exports.playPcm = function playPcm(samples, sampleRate, onEnded) {
    sampleRate = sampleRate || 8000;
    stopPcm();
    curSourceNode = ctx['createBufferSource']();
    var _samples = samples;
    var buffer = void 0,
        channelBuffer = void 0;
    try {
        buffer = ctx['createBuffer'](1, samples.length, sampleRate);
    } catch (e) {
        // iOS 不支持 22050 以下的采样率，于是先提升采样率，然后用慢速播放
        if (sampleRate < 11025) {
            /*buffer = ctx['createBuffer'](1, samples.length * 3, sampleRate * 3);
            _samples = increaseSampleRate(samples, 3);*/
            buffer = ctx['createBuffer'](1, samples.length, sampleRate * 4);
            curSourceNode['playbackRate'].value = 0.25;
        } else {
            /*buffer = ctx['createBuffer'](1, samples.length * 2, sampleRate * 2);
            _samples = increaseSampleRate(samples, 2);*/
            buffer = ctx['createBuffer'](1, samples.length, sampleRate * 2);
            curSourceNode['playbackRate'].value = 0.5;
        }
    }
    if (buffer['copyToChannel']) {
        buffer['copyToChannel'](_samples, 0, 0);
    } else {
        channelBuffer = buffer['getChannelData'](0);
        channelBuffer.set(_samples);
    }
    curSourceNode['buffer'] = buffer;
    curSourceNode['loop'] = false;
    curSourceNode['connect'](ctx['destination']);
    curSourceNode.onended = onEnded;
    curSourceNode.start();
};

var stopPcm = exports.stopPcm = function stopPcm() {
    if (curSourceNode) {
        curSourceNode.stop();
        curSourceNode = null;
    }
};

var recorderStream = null;
var recorder = null;
var recording = false;

var initRecorder = exports.initRecorder = function initRecorder() {
    return new Promise(function (resolve, reject) {
        var s = function s(stream) {
            recorderStream = ctx['createMediaStreamSource'](stream);
            recorder = new _recorderjs2.default(recorderStream);
            recording = false;
            resolve();
        };
        var j = function j(e) {
            reject(e);
        };
        if (!recorder) {
            if (window.navigator.mediaDevices.getUserMedia) {
                window.navigator.mediaDevices.getUserMedia({ audio: true }).then(s).catch(j);
            } else if (window.navigator.getUserMedia) {
                window.navigator.getUserMedia({ audio: true }, s, j);
            } else {
                j();
            }
        } else {
            resolve();
        }
    });
};

var isRecording = exports.isRecording = function isRecording() {
    return recorder && recording;
};

var startRecord = exports.startRecord = function startRecord() {
    if (recorder) {
        recorder.clear();
        recorder.record();
        recording = true;
    }
};

var stopRecord = exports.stopRecord = function stopRecord() {
    if (recorder) {
        recorder.stop();
        recording = false;
    }
};

var getCtxSampleRate = exports.getCtxSampleRate = function getCtxSampleRate() {
    return ctx.sampleRate;
};

var generateRecordSamples = exports.generateRecordSamples = function generateRecordSamples() {
    return new Promise(function (resolve) {
        if (recorder) {
            recorder.getBuffer(function (buffers) {
                resolve(buffers[0]);
            });
        }
    });
};

var decodeAudioArrayBufferByContext = exports.decodeAudioArrayBufferByContext = function decodeAudioArrayBufferByContext(array) {
    return new Promise(function (resolve, reject) {
        ctx['decodeAudioData'](array, function (audioBuf) {
            // 把多声道音频 mix 成单声道
            var oneChannel = (0, _audioBufferRemix2.default)(audioBuf, 1);
            resolve(oneChannel['getChannelData'](0));
        }, reject);
    });
};

},{"audio-buffer-remix":1,"recorderjs":12}],15:[function(require,module,exports){
'use strict';

/**
 * @file Browserify 入口
 * @author BenzLeung(https://github.com/BenzLeung)
 * @date 2017/12/10
 * Created by JetBrains PhpStorm.
 *
 * 每位工程师都有保持代码优雅的义务
 * each engineer has a duty to keep the code elegant
 */

module.exports = require('./BenzAMRRecorder.js').default;

},{"./BenzAMRRecorder.js":13}]},{},[15])(15)
});
//# sourceMappingURL=BenzAMRRecorder.js.map
