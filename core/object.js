var Class = require("./class");

var Object = function (name) { 
	
	return Class.Construct(this, name);
};

Object.prototype.index = 0;
Object.prototype.name = "Object";
Object.prototype.namespace = "";

module.exports = Object;