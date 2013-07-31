/**
 * Sets up the prototype chain for inheritance.
 *
 * As well as setting up the prototype chain, this also copies so called 'static'
 * definitions from the superclass to the subclass, makes sure that constructor
 * will return the correct thing, and provides a 'superclass' property.
 *
 * @throws Error if the prototype has been modified before extend is called.
 *
 * @param classdef {function} The constructor of the subclass.
 * @param superclass {function} The constructor of the superclass.
 */
function extend(classdef, superclass) {
	if (typeof classdef !== 'function') { throw new TypeError("Subclass was not a function, was of type " + (typeof classdef)); }
	if (typeof superclass !== 'function') { throw new TypeError("Superclass was not a function, was of type "+ (typeof superclass)); }
	for (var key in classdef.prototype) {
		throw new Error("Subclass prototype has already been modified - contains property '"+key+"'.");
	}

	for (var staticProperty in superclass) {
		if (superclass.hasOwnProperty(staticProperty)) {
			classdef[staticProperty] = superclass[staticProperty];
		}
	}
	classdef.prototype = Object.create(superclass.prototype, {
		constructor: {
			enumerable: false,
			value: classdef
		},
		superclass: {
			enumerable: false,
			value: superclass.prototype
		}
	});
}

/**
 * Returns an array of all of the properties on protocol that are not on classdef
 * or are of a different type on classdef.
 * @private
 */
function missingAttributes(classdef, protocol) {
	var result = [], obj = classdef.prototype, requirement = protocol.prototype;
	for (var item in requirement) {
		if (typeof obj[item] !== typeof requirement[item]) {
			result.push(item);
		}
	}
	return result;
}

/**
 * Declares that the provided class implements the provided protocol.
 *
 * This involves checking that it does in fact implement the protocol and updating an
 * internal list of interfaces attached to the class definition.
 *
 * It should be called after implementations are provided, i.e. at the end of the class definition.
 *
 * @throws Error if there are any attributes on the protocol that are not matched on the class definition.
 *
 * @param classdef {function} A constructor that should create objects matching the protocol.
 * @param protocol {function} A constructor representing an interface that the class should implement.
 */
function implement(classdef, protocol) {
	if (typeof classdef !== 'function') { throw new TypeError("Implementing class was not a constructor, was of type " + typeof(classdef)); }
	if (typeof protocol !== 'function') { throw new TypeError("Protocol was not a constructor, was of type " + typeof(protocol)); }
	var missing = missingAttributes(classdef, protocol);
	if (missing.length > 0) {
		throw new Error("Class did not implement all required attributes of the protocol.  Attributes missing: " + missing.join("', '"));
	}
}


/**
 * Does duck typing to determine if an instance object implements a protocol.
 * The protocol may be either an adhoc protocol, in which case it is an object
 * or it can be a formal protocol in which case it's a function.
 *
 * In an adhoc protocol, you can use Number, Object, String and Boolean to indicate
 * the type required on the instance.
 *
 * @param instance {!Object}
 * @param protocol {function|!Object}
 * @returns {boolean}
 */
function fulfills(instance, protocol) {
	var requirement = typeof protocol === 'function' ? protocol.prototype : protocol;
	for (var item in requirement) {
		var type = typeof instance[item];
		var required = requirement[item];
		if (type !== typeof required) {
			if (type === 'number' && required === Number) {
				return true;
			} else if (type === 'object' && required === Object) {
				return true;
			} else if (type === 'string' && required === String) {
				return true;
			} else if (type === 'boolean' && required === Boolean) {
				return true;
			}
			return false;
		}
	}
	return true;
}

/**
 * Copies everything that doesn't already exist on the child
 * from potentially many mixins to the destination.
 *
 * @param child {Object} the destination that properties should be copied to. May not be null or undefined.
 * @param mix... {Object} the objects containing properties to mix in.
 * @return child the object after the properties have been added.  Allows for chaining.  Will not be null or undefined;
 */
function assign(child, mix) {
	if (child == null) { throw new Error("Child cannot be null."); }
	var i, len, property, ingredient;
	for (i = 1, len = arguments.length; i < len; ++i) {
		ingredient = arguments[i];
		for (property in ingredient) {
			//noinspection JSUnfilteredForInLoop
			if (child.hasOwnProperty(property) === false) {
				//noinspection JSUnfilteredForInLoop
				child[property] = ingredient[property];
			}
		}
	}
	return child;
}

exports.extend = extend;
exports.implement = implement;
exports.fulfills = fulfills;
exports.assign = assign;
exports.statics = assign;
exports.properties = function(child, attributes) {
	return assign(child.prototype, attributes);
};