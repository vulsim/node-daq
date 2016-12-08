
var fs = require("fs");
var Tem05m1 = require("./helpers/tem05m1").Tem05m1;

fs.readFile('./344.bin', function (err, rawData) {
	if (err) {
		console.log(err);
		return;
	}

	this.journal = {
		"information": function(message) {
			console.log("INFO\t" + message);
		},

		"warning": function(message) {
			console.log("WARN\t" + message);
		},

		"error": function(message) {
			console.log("ERROR\t" + message);
		}
	};

	 

	var tem05m1 = new Tem05m1("Tem05m1", this);

	tem05m1.getOperatingParams(function (timeout, readCallback) {
		readCallback(null, rawData);
	}, null, function (err, data) {
		if (err) {
		    console.log(err);
		    return;
		}

	  	console.log(data);
	});
});