
var Influx = require("influx");
var SerialPort = require('serialport');
var util = require("util");
var Mhz19 = require("./helpers/mhz19").Mhz19;

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var influxHost = "192.168.94.174";
var influxDatabase = "instinctools";
var influxDatabaseUser = "daq";
var influxDatabasePassword = "influx";
var influxNode = "univermag_room14"
var serialDevice1 = "/dev/tty.usbserial";
var pollInterval = 60 * 1000;
var nSensorSerial = 4001;

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
			measurement: util.format("%s.sensor.info", influxNode),
			tags: [],
			fields: {
				device_type: Influx.FieldType.STRING,
				device_serial: Influx.FieldType.INTEGER,
				device_date: Influx.FieldType.STRING
			}
		},
		{
			measurement: util.format("%s.sensor.co2", influxNode),
			tags: [],
			fields: {
				device_serial: Influx.FieldType.INTEGER,
				value: Influx.FieldType.FLOAT
			}
		}
	]
});

var rawReadBuffer1 = null;

var mhz19 = new Mhz19("Mhz19", nSensorSerial, {
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
			setTimeout(function() {
				try {
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

	mhz19.getGasConcentration(readHandler, writeHandler, function (err, data) {
		port1.close();

		if (err) {
		    console.log(util.format(logMessage1, "FAILED"));		    
		} else {
			console.log(util.format(logMessage1, "OK"));
			console.log(util.format("\t\\- Device serial: %d, CO2: %dppm", data.device_serial, data.cppm));

			influx.writePoints([
				{
					measurement: util.format("%s.sensor.info", influxNode),
				    fields: {
				    	device_type: "mhz19",
				    	device_serial: data.device_serial,
				    	device_date: data.date.toString()
				    }
				},
				{
					measurement: util.format("%s.sensor.co2", influxNode),
				    fields: { 
				    	device_serial: data.device_serial,
						value: data.cppm
				    }
				}
			]);
		}
	});
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var daq = function () {
	try {
		port1.open();
		console.log(util.format(logMessage2, "OK"));
	} catch (err) {
		console.log(util.format(logMessage2, "FAILED"));
	}
}

setImmediate(function() {
	daq();
	setInterval(function() {
		daq();
	}, pollInterval);
});

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
