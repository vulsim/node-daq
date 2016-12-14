var Class = require("../core/class");
var Object = require("../core/object");

var CCore = require("../helpers/ccore").CCore;
var CJournal = require("../helpers/cjournal").CJournal;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var util = require("util");
var crc = require("../helpers/crc");

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
		requestPacket = util.format("%s%s\r", cmd);
	}

	return new Buffer(requestPacket);
};

TC05.prototype.rawResponsePacket = function (buffer) {

	//var responsePacket = buffer.toString("utf8");
	//console.log(responsePacket);

	console.log(buffer);

	/*if (buffer && buffer.length > 5) {
		var crcSum = 0xFFFF;

		for (var i = 0; i < buffer.length - 2; i++) {
			crcSum = crc.crc16_ARC_Add(crcSum, buffer[i]);
		}

		if ((parseInt(buffer[buffer.length - 2]) << 8) + (parseInt(buffer[buffer.length - 1])) == crcSum) {
			var ret = {
				"address" : buffer[0],
				"func" : buffer[1],
				"param" : buffer[2],
				"result" : buffer[3]
			};

			if (buffer.length > 6) {
				var data = new Buffer(buffer.length - 6);

				for (var i = 0; i < buffer.length - 6; i++) {
					data[i] = buffer[i + 4];
				}

				ret.data = data;
			}

			return ret;
		}		
	}*/
	
	return null;
};

TC05.prototype.getDeviceType = function (rawReadFunc, rawWriteFunc, cb) {

	var that = this;

	try {
		rawWriteFunc(that.rawRequestPacket("RH"), function (err) {
			try {
				rawReadFunc(4000, function (err, rawData) {
					try {
						var data = that.rawResponsePacket(rawData);
						if (data && data.data && data.func == 3 && data.param == 17 && data.result == 0) {
							cb(null, data.data.toString());
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