
var schedule = require("node-schedule");
var Influx = require("influx");
var SerialPort = require('serialport');
var util = require("util");
var TC05 = require("./helpers/tc05").TC05;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var influxHost = "192.168.1.111";
var influxDatabase = "garant";
var influxDatabaseUser = "daq";
var influxDatabasePassword = "influx";
var influxNode = "ozh42"
var serialDevice1 = "/dev/ttyUSB0";
var deviceAddress = 1;

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
				fw_version: Influx.FieldType.INTEGER,
				operating_hours: Influx.FieldType.INTEGER,
				error_0: Influx.FieldType.INTEGER,
				error_1: Influx.FieldType.INTEGER,
				error_2: Influx.FieldType.INTEGER,
				error_3: Influx.FieldType.INTEGER,
				error_4: Influx.FieldType.INTEGER,
				error_5: Influx.FieldType.INTEGER,
				error_6: Influx.FieldType.INTEGER,
				error_7: Influx.FieldType.INTEGER
			}
		},
		{
			measurement: util.format("%s.heatmeter.g", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		},
		{
			measurement: util.format("%s.heatmeter.q", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		},
		{
			measurement: util.format("%s.heatmeter.v", influxNode),
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

	tc05.getDeviceType(readHandler, writeHandler, deviceAddress, function (err, data) {
		port1.close();

		if (err) {
		    console.log(util.format(logMessage1, "FAILED"));		    
		} else {
			console.log(util.format(logMessage1, "OK"));
			//console.log(util.format("\t\\- Device serial: %d, fw: %d, errors: %d", data.device_serial, data.fw_version, data.errors.length));

			console.log(data);

			/*influx.writePoints([
				{
					measurement: util.format("%s.heatmeter.info", influxNode),
				    fields: {
				    	device_type: "tem05m1",
				    	device_serial: data.device_serial,
				    	device_date: data.date.toString(),					
						fw_version: data.fw_version,
						operating_hours: data.operating_hours,
						error_0: (data.errors.indexOf("t_sensor_failure") > -1) ? 1 : 0,
						error_1: (data.errors.indexOf("flow_or_pressure_sensor_failure") > -1) ? 1 : 0,
						error_2: (data.errors.indexOf("g1_under_min") > -1) ? 1 : 0,
						error_3: (data.errors.indexOf("g2_under_min") > -1) ? 1 : 0,
						error_4: (data.errors.indexOf("g1_over_max") > -1) ? 1 : 0,
						error_5: (data.errors.indexOf("g2_over_max") > -1) ? 1 : 0,
						error_6: (data.errors.indexOf("dt_under_min") > -1) ? 1 : 0,
						error_7: (data.errors.indexOf("power_failure") > -1 ? 1 : 0)
				    }
				},
				{
					measurement: util.format("%s.heatmeter.g", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.g1
				    }
				},
				{
					measurement: util.format("%s.heatmeter.q", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.q1
				    }
				},
				{
					measurement: util.format("%s.heatmeter.v", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.v1
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
			]);*/
		}
	});
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var daq_job = schedule.scheduleJob("*/10 * * * *", function() {
	try {
		port1.open();
		console.log(util.format(logMessage2, "OK"));
	} catch (err) {
		console.log(util.format(logMessage2, "FAILED"));
	}	
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////