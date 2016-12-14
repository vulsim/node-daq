var Class = require("../core/class");
var Object = require("../core/object");

var CCore = require("../helpers/ccore").CCore;
var CJournal = require("../helpers/cjournal").CJournal;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var util = require("util");
var crc = require("../helpers/crc");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var isValidBlock = function (block) {
	
	if (block.length != 4) {
		return false;
	}

	var sum = 27;

	for (var idx = 0; idx < block.length - 1; idx++) {
		var item = block[idx];

		for (var i = 0; i < item.length; i++) {
			sum += item.charCodeAt(i);
		}
	}

	sum = sum & 0xFF;

	return (block[block.length - 1].toUpperCase() === sum.toString(16).toUpperCase());
};

var covertResponse = function (response) {
	var object = {};

	for (var i = 0; i < response.length; i++) {
		var block = response[i];
		var circuit = {};

		if (object[block[0]] != undefined) {
			circuit = object[block[0]];
		} else {
			object[block[0]] = circuit;
		}

		circuit[block[1]] = block[2];
	}

	return object;
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var TC05 = Class.Inherit("TC05", Object, function (name, context) {
	
	Class.Construct(this, name);

	this.core = new CCore("CCoreHelper", context);
	this.journal = new CJournal("CJournalHelper", context);

	return this;
});

TC05.prototype.rawRequestPacket = function (cmd, param1, param2) {

	var requestPacket = null;

	if (param1 || param2) {
		var params = param1;

		if (param2 != null) {
			params = (params != null) ? params + "," + param2 : param2;
		}

		requestPacket = util.format("%s(%s)\r", cmd, params);
	} else {
		requestPacket = util.format("%s\r", cmd);
	}

	return new Buffer(requestPacket, "ascii");
};

TC05.prototype.rawResponsePacket = function (buffer) {

	var responsePacket = buffer.toString("ascii").split("\r");
	var response = [];

	for (var i = 0; i < responsePacket.length - 1; i++) {
		var block = responsePacket[i].split("\t");

		if (isValidBlock(block)) {
			response.push(block);
		}
	}

	return  (response.length > 0) ? covertResponse(response) : null;
};

TC05.prototype.getDeviceInfo = function (rawReadFunc, rawWriteFunc, cb) {

	var that = this;

	try {
		rawWriteFunc(that.rawRequestPacket("RH"), function (err) {
			try {
				rawReadFunc(2000, function (err, rawData) {
					try {
						var data = that.rawResponsePacket(rawData);
						
						if (data != null) {							
							console.log(data);

							//cb(null, data);
						} else {
							cb(new Error("An error occurred when reading from device"));
						}
					} catch (e) {
						that.journal.error(e.stack.toString());
						cb(e);
					}
				});
			} catch (e) {
				that.journal.error(e.stack.toString());
				cb(e);
			}
		});
	} catch (e) {
		that.journal.error(e.stack.toString());
		cb(e);
	}
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports.TC05 = TC05;