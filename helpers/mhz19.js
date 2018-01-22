var Class = require("../core/class");
var Object = require("../core/object");

var CCore = require("../helpers/ccore").CCore;
var CJournal = require("../helpers/cjournal").CJournal;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var util = require("util");

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

	return (sum == parseInt(block[block.length - 1], 16));
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

		circuit[block[1].replace(/\s/g, "")] = block[2];
	}

	return object;
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var Mhz19 = Class.Inherit("Mhz19", Object, function (name, serial, context) {
	
	Class.Construct(this, name);

	this.core = new CCore("CCoreHelper", context);
	this.journal = new CJournal("CJournalHelper", context);
	this.serial = serial;

	return this;
});

Mhz19.prototype.checksum = function (packet) {
	
	if (!(packet instanceof Array)) {
		return null;
	}

	let checksum = 0;

	for (let item of packet) {
		checksum += item & 0xFF;		
	}


	return 0xFF - (checksum & 0xFF) + 1;
};

Mhz19.prototype.rawRequestPacket = function (cmd, nSensor) {

	var requestPacket = [nSensor & 0xFF, cmd & 0xFF, 0x0, 0x0, 0x0, 0x0, 0x0];

	return Buffer.from([0xFF].concat(requestPacket, this.checksum(requestPacket)));
};

Mhz19.prototype.rawResponsePacket = function (buffer) {
	
	if (buffer == null || buffer.length != 9) {
		return null;
	}

	var responsePacket = [];

	for (var i = 1; i < 8; i++) {
		responsePacket.push(buffer[i] & 0xFF);
	}

	return (buffer[8] == this.checksum(responsePacket)) ? responsePacket : null;
};

Mhz19.prototype.getGasConcentration = function (rawReadFunc, rawWriteFunc, cb) {

	var that = this;

	try {
		rawWriteFunc(that.rawRequestPacket(0x86, 0x1), function (err) {
			try {
				rawReadFunc(1000, function (err, rawData) {
					try {
						var data = that.rawResponsePacket(rawData);

						if (data != null && data[0] == 0x86) {																					
							cb(null, {
								"date": new Date(),
								"device_serial": that.serial,
								"cppm": data[1] * 256 + data[2]
							});
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

module.exports.Mhz19 = Mhz19;
