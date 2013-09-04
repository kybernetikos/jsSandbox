function Pair(first, second) {
	if (first > second) { throw new Error("wrong order"); }
	this.first = first;
	this.second = second;
	this.score = 0;
}
Pair.prototype.add = function(winner, score) {
	if (winner === this.first) {
		this.score += score;
	} else {
		this.score -= score;
	}
};
Pair.prototype.toString = function() {
	return this.first + "," + this.second;
};
Pair.prototype.getScoreFor = function(option) {
	if (option === this.first) {
		return this.score;
	}
	return -this.score;
};
Pair.prototype.winner = function() {
	if (this.score >= 0) { return this.first; }
	return this.second;
};
Pair.prototype.loser = function() {
	if (this.score >= 0) { return this.second; }
	return this.first;
};
function Preferences(options) {
	this.relationship = {};
	this.options = options;
	this.allPairs = [];
}

Preferences.prototype.getPair = function(option1, option2) {
	var names = [option1, option2].sort();
	var key = names.join(",");
	if (this.relationship[key] === undefined) {
		var pair = new Pair(names[0], names[1]);
		this.relationship[key] = pair;
		this.allPairs.push(pair);
	}
	return this.relationship[key];
};

Preferences.prototype.registerPreference = function(numberOfPeople, preferredSet, lessPreferredSet) {
	if (Array.isArray(preferredSet) === false) {
		preferredSet = [preferredSet];
	}
	if (Array.isArray(lessPreferredSet) === false) {
		lessPreferredSet = [lessPreferredSet];
	}
	for (var i = 0; i < preferredSet.length; ++i) {
		for (var j = 0; j < lessPreferredSet.length; ++j) {
			var preferred = preferredSet[i];
			var lessPreferred = lessPreferredSet[j];

			if (this.options.indexOf(preferred) < 0) { throw new Error("Bad option " + preferred + " should be one of " + this.options.join(", ")); }
			if (this.options.indexOf(lessPreferred) < 0) { throw new Error("Bad option " + lessPreferred + " should be one of " + this.options.join(", ")); }

			var pair = this.getPair(preferred, lessPreferred);
			pair.add(preferred, numberOfPeople);
		}
	}
};

Preferences.prototype.vote = function(numberOfPeople) {
	function remove(arr, val) {
		if (Array.isArray(val)) {
			for (var i = 0; i < val.length; ++i) {
				remove(arr, val[i]);
			}
		} else {
			arr.splice(arr.indexOf(val), 1);
		}
	}

	var remainingOptions = this.options.slice();

	var choices = Array.prototype.slice.call(arguments, 1);

	for (var i = 0; i < choices.length; ++i) {
		remove(remainingOptions, choices[i]);
	}

	choices.push(remainingOptions);

	for (i = 0; i < choices.length; ++i) {
		for (var j = i + 1; j < choices.length; ++j) {
			this.registerPreference(numberOfPeople, choices[i], choices[j]);
		}
	}
};

Preferences.prototype.scoreMatrix = function() {
	var matrix = {};

	for (var i = 0; i < this.options.length; ++i) {
		var option = this.options[i];

		var row = {};
		matrix[option] = row;

		for (var j = 0; j < this.options.length; ++j) {
			var otherOption = this.options[j];
			if (otherOption === option) { continue; }
			var pair = this.getPair(option, otherOption);
			var score = pair.getScoreFor(option);
			row[otherOption] = score;
		}
	}

	return matrix;
};

Preferences.prototype.graph = function() {
	// returns the victory graph as calculated by Ranked Pairs
	// http://en.wikipedia.org/wiki/Ranked_Pairs
	var pairs = this.allPairs.slice().sort(function(a, b) {return Math.abs(b.score) - Math.abs(a.score); } );
	var pathMatrix = {};
	for (var i = 0; i < pairs.length; ++i) {
		var pair = pairs[i];
		var winner = pair.winner();
		var loser = pair.loser();
		var winRow = pathMatrix[winner] || (pathMatrix[winner] = {});
		var loseRow = pathMatrix[loser] || (pathMatrix[loser] = {});

		var cycle = false;
		var optionsTheLoserBeats = [];
		for (var key in loseRow) {
			if (loseRow[key] > 0) {
				// the winner must beat everything the loser beats or there is a cycle;
				if (winRow[key] < 0) {
					cycle = true;
					break;
				}
				optionsTheLoserBeats.push(key);
			}
		}
		var optionsTheWinnerLosesTo = [];
		for (key in winRow) {
			if (winRow[key] < 0) {
				// the loser must lose to everything the winner loses to or there is a cycle,
				if (loseRow[key] > 1) {
					cycle = true;
					break;
				}
				optionsTheWinnerLosesTo.push(key);
			}
		}

		if (cycle === false) {
			var j;
			winRow[loser] = 1;
			for (j = 0; j < optionsTheLoserBeats.length; ++j) {
				winRow[optionsTheLoserBeats[j]] = 1;
                pathMatrix[optionsTheLoserBeats[j]][winner] = -1;
			}
			loseRow[winner] = -1;
			for (j = 0; j < optionsTheWinnerLosesTo.length; ++j) {
				loseRow[optionsTheWinnerLosesTo[j]] = -1;
                pathMatrix[optionsTheWinnerLosesTo[j]][loser] = 1;
			}
		}

	}

	return pathMatrix;
};

Preferences.prototype.combinedRanking = function() {
	// returns the victory ranking as calculated by Ranked Pairs
	// http://en.wikipedia.org/wiki/Ranked_Pairs

	var graph = this.graph();
	function winCount(option) {
		var row = graph[option];
		var score = 0;
		for (var key in row) {
			if (row[key] === 1) {
				score++;
			}
		}
		return score;
	}
	var results = [];
	for (var option in graph) {
		var score = winCount(option);
		if (results[score] === undefined) { results[score] = []; }
		results[score].push(option);
	}
	var collapsedResult = [];
	for (var i = results.length - 1; i >= 0; --i) {
		var group = results[i];
		if (group !== undefined) {
			if (group.length === 1) {
				collapsedResult.push(group[0]);
			} else {
				collapsedResult.push(group);
			}
		}
	}
	return collapsedResult;
};

pref = new Preferences(["A", "B", "C", "X"]);
pref.vote(68, ["A", "X"], "B");
pref.vote(72, "B", "C");
pref.vote(52, "C", ["A", "X"]);
pref.vote(1, "X", "C");
console.log(pref.graph());
console.log(pref.combinedRanking());
