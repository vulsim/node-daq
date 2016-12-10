
var schedule = require("node-schedule");
var Influx = require("influx");
var SerialPort = require('serialport');
var util = require("util");
var Tem05m1 = require("./helpers/tem05m1").Tem05m1;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var influxHost = "192.168.111.1";
var influxDatabase = "garant";
var influxDatabaseUser = "daq";
var influxDatabasePassword = "influx";
var daqNode = "teplouzel";
var daqHost = "vrb86_1"
var serialDevice1 = "/dev/ttyUSB0";

var logMessage1 = "->\tRead data from device\t\t\t\t%s";
var logMessage2 = "->\tStarting of scheduled devices polling\t\t\t\t%s";

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var influx = new Influx.InfluxDB({
	host: influxHost,
	database: influxDatabase,
	username: influxDatabaseUser,
  	password: influxDatabasePassword,
	schema: [
		{
			measurement: "heatmeter_tem05m1",
			fields: {
				device_serial: Influx.FieldType.STRING,
				fw_version: Influx.FieldType.INTEGER,
				operating_hours: Influx.FieldType.INTEGER,
				g1_min: Influx.FieldType.FLOAT,
				g1_max: Influx.FieldType.FLOAT,
				g2_min: Influx.FieldType.FLOAT,
				g2_max: Influx.FieldType.FLOAT,
				t3_prog: Influx.FieldType.FLOAT,
				t3: Influx.FieldType.FLOAT,
				g1: Influx.FieldType.FLOAT,
				p1: Influx.FieldType.FLOAT,
				q1: Influx.FieldType.FLOAT,
				v1: Influx.FieldType.FLOAT,
				m1: Influx.FieldType.FLOAT,
				t1: Influx.FieldType.FLOAT,
				g2: Influx.FieldType.FLOAT,
				p2: Influx.FieldType.FLOAT,
				q2: Influx.FieldType.FLOAT,
				v2: Influx.FieldType.FLOAT,
				m2: Influx.FieldType.FLOAT,
				t2: Influx.FieldType.FLOAT,
				errors: Influx.FieldType.STRING
			},
			tags: ["host", "node"]
		}
	]
});

var rawReadBuffer1 = null;

var tem05m1 = new Tem05m1("Tem05m1", {
	journal: {
		information: function(message) {
			console.log("INFO\t" + message);
		},

		warning: function(message) {
			console.log("WARN\t" + message);
		},

		error: function(message) {
			console.log("ERROR\t" + message);
		}
	}
});

var port1 = new SerialPort(serialDevice1, {
  baudRate: 9600,
  dataBits: 8,
  parity: "none",
  stopBits: 1,
  autoOpen: false
});

port1.on("data", function(data) {
    if (rawReadBuffer1 != null) {
        rawReadBuffer1 = Buffer.concat([rawReadBuffer1, data]);
    } else {
        rawReadBuffer1 = data;
    }
});

port1.on("open", function() {

	var readHandler = function(timeout, rawReadCb) {
		try {
			var rawReadTimerId = setInterval(function() {
				try {
					clearInterval(rawReadTimerId);

					if (rawReadBuffer1) {
						rawReadCb(null, rawReadBuffer1);
						rawReadBuffer1 = null;
					} else {
						rawReadCb(new Error("No data received"), null);
					}			
				} catch (e) {
					rawReadCb(e);
				}
			}, timeout);
		} catch (e) {
			rawReadCb(e);
		}						
	};

	var writeHandler = function (data, rawWriteCb) {
		try {													
			port1.write(data, function(err, length) {
				rawWriteCb(err);
			});
		} catch (e) {
			rawWriteCb(e);
		}						
	};

	var getDeviceData = function () {
		tem05m1.getOperatingParams(readHandler, writeHandler, function (err, data) {
			port1.close();

			if (err) {
			    console.log(util.format(logMessage1, "FAILED"));		    
			} else {
				console.log(util.format(logMessage1, "OK"));
				console.log(util.format("\t\\- Device serial: %d, fw: %d, errors: %s", data.device_serial, data.fw_version, data.errors));

				influx.writePoints([{
					measurement: "heatmeter_tem05m1",
				    tags: { host: daqHost, node: daqNode},
				    fields: { 
				    	device_serial: data.device_serial,
						fw_version: data.fw_version,
						operating_hours: data.operating_hours,
						g1_min: data.g1_min,
						g1_max: data.g1_max,
						g2_min: data.g2_min,
						g2_max: data.g2_max,
						t3_prog: data.t3_prog,
						t3: data.t3,
						g1: data.g1,
						p1: data.p1,
						q1: data.q1,
						v1: data.v1,
						m1: data.m1,
						t1: data.t1,
						g2: data.g2,
						p2: data.p2,
						q2: data.q2,
						v2: data.v2,
						m2: data.m2,
						t2: data.t2,
						errors: data.errors 
				    }
				}]);
			}
		});
	};

	var syncBufferSize = 0;
	var syncTimerId = setInterval(function() {
		if ((syncBufferSize == 0 && rawReadBuffer1 == null) ||
			(rawReadBuffer1 != null && syncBufferSize == rawReadBuffer1.length)) {
			clearInterval(syncTimerId);
			getDeviceData();
		} if (rawReadBuffer1 != null) {
			syncBufferSize = rawReadBuffer1.length; 
		}
	}, 500);
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var daq_job = schedule.scheduleJob("*/1 * * * *", function() {
	try {
		port1.open();
		console.log(util.format(logMessage2, "OK"));
	} catch (err) {
		console.log(util.format(logMessage2, "FAILED"));
	}	
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////