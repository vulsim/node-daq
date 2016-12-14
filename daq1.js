
var schedule = require("node-schedule");
var Influx = require("influx");
var SerialPort = require('serialport');
var util = require("util");
var gpio = require("pi-gpio");
var TC05 = require("./helpers/tc05").TC05;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var influxHost = "192.168.1.111";
var influxDatabase = "garant";
var influxDatabaseUser = "daq";
var influxDatabasePassword = "influx";
var influxNode = "ozh42"
var serialDevice1 = "/dev/ttyUSB0";
var serialDevicePowerPin = 20;

var logMessage1 = "->\tRead data from device\t\t\t\t%s";
var logMessage2 = "->\tStarting of scheduled devices polling\t\t%s";

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var influx = new Influx.InfluxDB({
	host: influxHost,
	database: influxDatabase,
	username: influxDatabaseUser,
  	password: influxDatabasePassword,
	schema: [
		{
			measurement: util.format("%s.heatmeter.info", influxNode),
			tags: [],
			fields: {
				device_type: Influx.FieldType.STRING,
				device_serial: Influx.FieldType.INTEGER,
				device_date: Influx.FieldType.STRING,
				fw_version: Influx.FieldType.STRING,
			}
		},
		{
			measurement: util.format("%s.heatmeter.h", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		},
		{
			measurement: util.format("%s.heatmeter.he", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		},
		{
			measurement: util.format("%s.heatmeter.g1", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		},
		{
			measurement: util.format("%s.heatmeter.q1", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		},
		{
			measurement: util.format("%s.heatmeter.v1", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		},
		{
			measurement: util.format("%s.heatmeter.m1", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		},
		{
			measurement: util.format("%s.heatmeter.p1", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		},
		{
			measurement: util.format("%s.heatmeter.t1", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		},
		{
			measurement: util.format("%s.heatmeter.t2", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		}
	]
});

var rawReadBuffer1 = null;

var tc05 = new TC05("TC05", {
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
  baudRate: 2400,
  dataBits: 8,
  parity: "even",
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

					if (rawReadBuffer1 != null) {
						rawReadCb(null, rawReadBuffer1);
						rawReadBuffer1 = null;
					} else {
						rawReadCb(null, null);
					}			
				} catch (e) {
					rawReadCb(e, null);
				}
			}, timeout);
		} catch (e) {
			rawReadCb(e, null);
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

	tc05.getOperatingInfo(readHandler, writeHandler, function (err, data) {
		port1.close();
		gpio.write(serialDevicePowerPin, 1);

		if (err) {
		    console.log(util.format(logMessage1, "FAILED"));		    
		} else {
			console.log(util.format(logMessage1, "OK"));
			console.log(util.format("\t\\- Device serial: %d, fw: %s, errors: %s", data.device_serial, data.fw_version, data.errors));

			influx.writePoints([
				{
					measurement: util.format("%s.heatmeter.info", influxNode),
				    fields: {
				    	device_type: "tc05",
				    	device_serial: data.device_serial,
				    	device_date: data.date.toString(),					
						fw_version: data.fw_version.toString(),						
				    }
				},
				{
					measurement: util.format("%s.heatmeter.h", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.h
				    }
				},
				{
					measurement: util.format("%s.heatmeter.he", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.he
				    }
				},
				{
					measurement: util.format("%s.heatmeter.g1", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.g1
				    }
				},
				
				{
					measurement: util.format("%s.heatmeter.q1", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.q1
				    }
				},
				{
					measurement: util.format("%s.heatmeter.v1", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.v1
				    }
				},
				{
					measurement: util.format("%s.heatmeter.m1", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.m1
				    }
				},
				{
					measurement: util.format("%s.heatmeter.p1", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.p1
				    }
				},
				{
					measurement: util.format("%s.heatmeter.t1", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.t1
				    }
				},
				{
					measurement: util.format("%s.heatmeter.t2", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.t2
				    }
				}
			]);
		}
	});
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

gpio.open(serialDevicePowerPin, "output");
var daq_job = schedule.scheduleJob("*/10 * * * *", function() {
	try {		
		gpio.write(serialDevicePowerPin, 0);
		port1.open();		

		console.log(util.format(logMessage2, "OK"));
	} catch (err) {
		console.log(util.format(logMessage2, "FAILED"));
	}	
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////