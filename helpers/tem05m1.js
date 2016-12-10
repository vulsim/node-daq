var Class = require("../core/class");
var Object = require("../core/object");

var CCore = require("../helpers/ccore").CCore;
var CJournal = require("../helpers/cjournal").CJournal;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var util = require("util");
var crc = require("../helpers/crc");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var readBcd8 = function(buffer, index) {
	return (buffer[index] & 0xF) + ((buffer[index] >> 4) * 10);
};

var readUInt24LE = function(buffer, index) {
	return buffer[index] + (buffer[index + 1] << 8) + (buffer[index + 2] << 16);
};

var readHeatmeterConfig = function (buffer, index) {

	var result = [];

	switch (buffer[index] & 0x1F) {
		case 1:
			result.push("on_supply");
			break;
		case 2:
			result.push("on_return");
			break;
		case 4:
			result.push("p_supply");
			break;
		case 8:
			result.push("p_return");
			break;
		case 16:
			result.push("double_flow");
			break;
	}

	result.push(((buffer[index] >> 5) & 1) ? "no_t3_sensor" : "has_t3_sensor");
	result.push(((buffer[index] >> 6) & 1) ? "two_flow_sensors" : "one_flow_sensor");
	result.push(((buffer[index] >> 7) & 1) ? "has_pressure_sensors" : "no_pressure_sensor");

	return result;
};

var readDeviceErrors = function (buffer, index) {

	var result = [];

	if (buffer[index] & 1) {
		result.push("t_sensor_failure");
	}

	if ((buffer[index] >> 1) & 1) {
		result.push("flow_or_pressure_sensor_failure");
	}

	if ((buffer[index] >> 2) & 1) {
		result.push("g1_under_min");
	}

	if ((buffer[index] >> 3) & 1) {
		result.push("g2_under_min");
	}

	if ((buffer[index] >> 4) & 1) {
		result.push("g1_over_max");
	}

	if ((buffer[index] >> 5) & 1) {
		result.push("g2_over_max");
	}

	if ((buffer[index] >> 6) & 1) {
		result.push("dt_under_min");
	}

	if ((buffer[index] >> 7) & 1) {
		result.push("power_failure");
	}

	return result;
};

var readMaxConsumption = function (buffer, index) {

	switch (buffer[index] & 0x1F) {
		case 0x0:
			return 0.25;
		case 0x1:
			return 0.5;
		case 0x2:
			return 1.0;
		case 0x3:
			return 1.25;
		case 0x4:
		case 0x6:
			return 2.5;
		case 0x5:
		case 0x7:
		case 0x15:
			return 5;
		case 0x8:
		case 0x9:
		case 0x16:
			return 10;
		case 0xA:
		case 0x17:
			return 20;
		case 0xB:
			return 40;
		case 0xC:
			return 25;
		case 0xD:
		case 0xF:
			return 50;
		case 0xE:
		case 0x10:
		case 0x12:
			return 100;
		case 0x11:
		case 0x13:
			return 200;
		case 0x14:
			return 400;
	}

	return 0;
};

var readPrecision = function (buffer, index) {

	switch (buffer[index] & 0x1F) {
		case 0x0:
		case 0x1:
			return 1000;
		case 0x2:
		case 0x3:
		case 0x4:
		case 0x5:
		case 0x6:
		case 0x7:
		case 0x15:
			return 100;
		case 0x8:
		case 0x9:
		case 0xA:
		case 0xB:
		case 0xC:
		case 0xD:
		case 0xF:
		case 0x16:
		case 0x17:
			return 10;
		case 0xE:
		case 0x10:
		case 0x11:
		case 0x12:
		case 0x13:
		case 0x14:
			return 1;
	}

	return 1;
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var Tem05m1 = Class.Inherit("Tem05m1", Object, function (name, context) {
	
	Class.Construct(this, name);

	this.core = new CCore("CCoreHelper", context);
	this.journal = new CJournal("CJournalHelper", context);

	return this;
});

Tem05m1.prototype.getOperatingParams = function (rawReadFunc, rawWriteFunc, cb) {

	var that = this;

	try {
		var syncWithDeviceIterator = function (index, syncCb) {
			if (index < 6) {
				rawReadFunc(1000, function (err, rawData) {
					if (rawData == null || rawData.length == 0) {
						syncCb();
					} else {
						syncWithDeviceIterator(index + 1, syncCb);
					}
				});
			} else {
				cb(new Error("Can't perform synchronization"));
			}
		};

		syncWithDeviceIterator(0, function () {
			rawReadFunc(3000, function (err, rawData) {
				try {				
					if (rawData && rawData.length == 344) {

						var year = readBcd8(rawData, 0x9);

						if (year < 90) {
							year += 2000;
						} else if (year < 100) {
							year += 1900;
						}

						console.log(readUInt24LE(rawData, 0x20));

						cb(null, {
							"date": new Date(year, 
							readBcd8(rawData, 0x8) - 1, 
							readBcd8(rawData, 0x7),
							readBcd8(rawData, 0x4), 
							readBcd8(rawData, 0x2), 
							readBcd8(rawData, 0x0)),
							"device_serial": rawData.readUInt16LE(0xE),
							"fw_version": rawData[0x10],
							"device_config": readHeatmeterConfig(rawData, 0x11),
							"operating_hours": rawData[0x18] / 60 + readUInt24LE(rawData, 0x19),
							"g1_min": readMaxConsumption(rawData, 0x12) * (rawData[0x14] & 0xF) / 100,
							"g1_max": readMaxConsumption(rawData, 0x12),
							"g2_min": readMaxConsumption(rawData, 0x13) * (rawData[0x14] >> 4) / 100,
							"g2_max": readMaxConsumption(rawData, 0x13),
							"t3_prog": rawData[0x15] / 10,
							"t3": rawData.readUInt16LE(0xD2) / 100,
							"g1": readUInt24LE(rawData, 0x20) * 100 / readPrecision(rawData, 0x12),
							"p1": readUInt24LE(rawData, 0x23) / readPrecision(rawData, 0x12),
							"q1": readUInt24LE(rawData, 0x26) * 10 / readPrecision(rawData, 0x12),
							"v1": readUInt24LE(rawData, 0x29) / readPrecision(rawData, 0x12),
							"m1": readUInt24LE(rawData, 0x2C) / readPrecision(rawData, 0x12),
							"t1": rawData.readUInt16LE(0xCE) / 100,
							"g2": readUInt24LE(rawData, 0x2F) * 100 / readPrecision(rawData, 0x13),
							"p2": readUInt24LE(rawData, 0x32) / readPrecision(rawData, 0x13),
							"q2": readUInt24LE(rawData, 0x35) * 10 / readPrecision(rawData, 0x13),
							"v2": readUInt24LE(rawData, 0x38) / readPrecision(rawData, 0x12),
							"m2": readUInt24LE(rawData, 0x3B) / readPrecision(rawData, 0x12),
							"t2": rawData.readUInt16LE(0xD0) / 100,
							"errors": readDeviceErrors(rawData, 0x3E)
						});
					} else {
						cb(new Error("An error occurred when reading operating params from device"));
					}
				} catch (e) {
					that.journal.error(e.stack.toString());
					cb(e);
				}
			});
		});
	} catch (e) {
		that.journal.error(e.stack.toString());
		cb(e);
	}
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports.Tem05m1 = Tem05m1;