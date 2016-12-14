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

TC05.prototype.getOperatingInfo = function (rawReadFunc, rawWriteFunc, cb) {

	var that = this;
	var info = {};

	try {
		that.getDeviceInfo(rawReadFunc, rawWriteFunc, function (err1, deviceInfo) {
			try {
				that.getOperatingParams(rawReadFunc, rawWriteFunc, function (err2, operatingParams) {
					try {
						if (err1 || err2) {
							cb(new Error("Device cannot be read"));
							return;
						}

						var dateTime = deviceInfo["CT"].split("\s");
						var dateComponents = dateTime[0].split("-");
						var timeComponents = dateTime[1].split(":");
						var year = parseInt(dateComponents[2]);

						if (year < 90) {
							year += 2000;
						} else if (year < 100) {
							year += 1900;
						}

						cb(null, {
							"date": new Date(year, 
							parseInt(dateComponents[1]) - 1, 
							parseInt(dateComponents[0]),
							parseInt(timeComponents[0]), 
							parseInt(timeComponents[1])),
							"date": new Date(Date.parse()),
							"device_serial": parseInt(deviceInfo["NU"]),
							"fw_version": deviceInfo["SV"],
							"h": operatingParams["1"]["T"],
							"he": operatingParams["1"]["T!"],
							"g1": parseFloat(operatingParams["1"]["v>"]),
							"p1": parseFloat(operatingParams["1"]["q>"]),
							"q1": parseFloat(operatingParams["1"]["Q"]),
							"v1": parseFloat(operatingParams["1"]["V>"]),
							"t1": parseFloat(operatingParams["1"]["t>"]),
							"t2": parseFloat(operatingParams["1"]["t<"]),
							"errors": operatingParams["1"]["!?"]
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
		});		
	} catch (e) {
		that.journal.error(e.stack.toString());
		cb(e);
	}
};

TC05.prototype.getDeviceInfo = function (rawReadFunc, rawWriteFunc, cb) {

	var that = this;

	try {
		rawWriteFunc(that.rawRequestPacket("RH"), function (err) {
			try {
				rawReadFunc(2000, function (err, rawData) {
					try {
						var data = that.rawResponsePacket(rawData);
						
						if (data != null && data["0"] != null && data["0"]["CT"] != null &&	
							data["0"]["NU"] != null && data["0"]["SV"] != null) {							
							cb(null, data["0"]);
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

TC05.prototype.getOperatingParams = function (rawReadFunc, rawWriteFunc, cb) {

	var that = this;

	try {
		rawWriteFunc(that.rawRequestPacket("RD"), function (err) {
			try {
				rawReadFunc(2000, function (err, rawData) {
					try {
						var data = that.rawResponsePacket(rawData);
						
						if (data != null && data["1"] != null && data["1"]["T"] != null && 
							data["1"]["T!"] != null && data["1"]["v>"] != null && data["1"]["q>"] != null && 
							data["1"]["Q"] != null && data["1"]["V>"] != null && data["1"]["t>"] != null && 
							data["1"]["t<"] != null && data["1"]["!?"] != null) {														
							cb(null, data);
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