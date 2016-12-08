var Class = require("../core/class");
var Object = require("../core/object");

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var SimpleCall = function (context, params, cbBridge) {
	
	if (typeof(cbBridge) == undefined) {
		return;
	}
	
	Function.call.apply(cbBridge, [].concat(context, params));
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var CJournal = Class.Inherit("CJournal", Object, function (name, context) {
	
	Class.Construct(this, name);
	this.context = context;

	return this;
});

CJournal.prototype.information = function(message) {
	SimpleCall(this.context, message, this.context.journal.information);
};

CJournal.prototype.warning = function(message) {
	SimpleCall(this.context, message, this.context.journal.warning);
};

CJournal.prototype.error = function(message) {
	SimpleCall(this.context, message, this.context.journal.error);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports.CJournal = CJournal;
