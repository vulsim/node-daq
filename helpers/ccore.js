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

var CCore = Class.Inherit("CCore", Object, function (name, context) {
	
	Class.Construct(this, name);
	this.context = context;

	return this;
});

CCore.prototype.nop = function(cb) {
	SimpleCall(this.context, cb, this.context.core.nop);
};

CCore.prototype.glist = function(cb) {
	SimpleCall(this.context, cb, this.context.core.glist);
};

CCore.prototype.gsub = function(group, cb) {
	SimpleCall(this.context, [group, cb], this.context.core.gsub);
};

CCore.prototype.gusub = function(group, cb) {
	SimpleCall(this.context, cb, this.context.core.nop);
};

CCore.prototype.clist = function(cb) {
	SimpleCall(this.context, cb, this.context.core.clist);
};

CCore.prototype.cread = function(group, channel, cb) {
	SimpleCall(this.context, [group, channel, cb], this.context.core.cread);
};

CCore.prototype.cwrite = function(group, channel, value, cb) {
	SimpleCall(this.context, [group, channel, value, cb], this.context.core.cwrite);
};

CCore.prototype.cpub = function(group, channel, value, cb) {
	SimpleCall(this.context, [group, channel, value, cb], this.context.core.cpub);
};

CCore.prototype.cupub = function(group, channel, cb) {
	SimpleCall(this.context, [group, channel, cb], this.context.core.cupub);
};

CCore.prototype.csub = function(group, channel, cb) {
	SimpleCall(this.context, [group, channel, cb], this.context.core.csub);
};

CCore.prototype.cusub = function(group, channel, cb) {
	SimpleCall(this.context, [group, channel, cb], this.context.core.cusub);
};

//////////////////////////////////////////////////////////////////////////////////////////////////////////////////

module.exports.CCore = CCore;
