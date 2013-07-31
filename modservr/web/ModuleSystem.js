(function() {

	var moduleDefinitions = {};
	var incompleteExports = {};
	var moduleExports = {};

	function defineModule(id, definition) {
		moduleDefinitions[id] = definition;
	}

	function deRel(context, path) {
		var result = (context === "") ? [] : context.split("/");
		var working = path.split("/");
		var item;
		while (item = working.shift()) {
			if (item === "..") {
				result.pop();
			} else if (item !== ".") {
				result.push(item);
			}
		}
		return result.join("/");
	}

	function require(context, id) {
		id = deRel(context, id);

		if (moduleExports[id] != null) { return moduleExports[id]; }

		if (incompleteExports[id] != null) {
			// there is a circular dependency, we do the best we can
			// in the circumstances.
			return incompleteExports[id].exports;
		}

		var definition = moduleDefinitions[id];
		if (definition == null) { throw new Error("No definition for module " + id); }

		var module = { exports: {} };
		Object.defineProperty(module, 'id', {
			value: id,
			configurable: false, writable: false, enumerable: true
		});
		incompleteExports[id] = module;
		var definitionContext = id.substring(0, id.lastIndexOf("/"));
		definition.call(module, require.bind(null, definitionContext), module, module.exports);
		moduleExports[id] = module.exports;
		delete incompleteExports[id];

		return moduleExports[id];
	}

	var global = (new Function("return this;"))();
	global.defineModule = defineModule;
	global.require = require.bind(null, "");
	global.require.modules = moduleExports;
})();

