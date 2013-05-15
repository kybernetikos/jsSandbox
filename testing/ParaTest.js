// TestRecord

function TestRecord(func, time, result, errors) {
	this.func = func;
	this.time = time;
	this.result = result;
	this.errors = errors;
}

// RunRecord

function RunRecord(data) {
	this.data = data;
	this.tests = [];
}
RunRecord.prototype.addTestRecord = function(record) {
	this.tests.push(record);
};
RunRecord.prototype.toString = function() {
	return "[ "+this.tests.join(", ")+" ]";
}

// Deviation

function Deviation(func, input, expectedWasError, expectedValue, actualWasError, actualValue) {
	this.func = func;
	this.input = input;
	this.expectedWasError = expectedWasError;
	this.expectedValue = expectedValue;
	this.actualWasError = actualWasError;
	this.actualValue = actualValue;
}
Deviation.prototype.toString = function() {
	return "<<Deviation input=["+this.input.join(",")+"] expected"+(this.expectedWasError?" error":"")+"="+this.expectedValue+" got"+(this.actualWasError?" error":"")+"="+this.actualValue+">>";
};
Deviation.prototype.throw = function() {
	var inputStr = "["+this.input.join(",")+"]";
	throw new Error("Unexpected behaviour for input "
							+ inputStr + ": "
							+ "Expected"+(this.expectedWasError?" error":"")+" "+this.expectedValue+", "
							+ "got"+(this.actualWasError?" error":"")+" "+this.actualValue+" "
							+ "in function "+(this.func.name || this.func.toString())+".");
};


// Statistics

function Statistics() {
	this.min = Number.MAX_VALUE;
	this.max = Number.MIN_VALUE;
	this.count = 0;
	this.total = 0;
	this.totalSq = 0;
}

Statistics.prototype.calculate = function() {
	var n = this.count, sum = this.total, sumOfSquaredValues = this.totalSq, mean = sum / n;

	var varianceNumerator = sumOfSquaredValues - (2 * sum * mean) + (n * mean * mean);
	var populationVariance =  varianceNumerator / n;
	var sampleVariance = varianceNumerator / (n - 1);

	return {
		mean: mean, min: this.min, max: this.max, n: this.count,
		total: this.total,
		sample: {
			variance: sampleVariance,
			stdDev: Math.sqrt(sampleVariance)
		},
		population: {
			variance: populationVariance,
			stdDev: Math.sqrt(populationVariance)
		}
	};
};

Statistics.prototype.add = function(item) {
	this.min = Math.min(this.min, item);
	this.max = Math.max(this.max, item);
	this.count++;
	this.total += item;
	this.totalSq += item * item;
};

Statistics.prototype.toString = function() {
	return JSON.stringify(this.calculate());
};

// DeviationList

function DeviationList() {
	this.deviations = [];
}
DeviationList.prototype.add = function(deviation) {
	this.deviations.push(deviation);
};
DeviationList.prototype.toString = function() {
	return "[Deviation list, count="+this.deviations.length+"]";
};
DeviationList.prototype.throw = function() {
	if (this.deviations.length > 0) {
		this.deviations[0].throw();
	}
};

// TestResult

function TestResult(testRecords) {
	this.testRecords = testRecords;
}
TestResult.prototype.times = function() {
	var result = [];
	for (var testRun = 0; testRun < this.testRecords.length; ++testRun) {
		var currentRunResult = this.testRecords[testRun].tests;
		for (var i = 0; i < currentRunResult.length; ++i) {
			var testResult = currentRunResult[i];
			var analysisResult = result[i] || new Statistics();
			analysisResult.add(testResult.time);
			result[i] = analysisResult;
		}
	}
	return result;
};
TestResult.prototype.differences = function(resultEq, errorEq) {
	resultEq = resultEq || function(a, b) {return a == b};
	errorEq = errorEq || function(e1, e2) {return e1.name == e2.name};

	var deviations = [];

	for (var runNo = 0; runNo < this.testRecords.length; ++runNo) {
		var run = this.testRecords[runNo];
		var data = run.data;
		var canonicalResult = run.tests[0].result;
		var canonicalError = run.tests[0].errors;

		for (var testNo = 0; testNo < run.tests.length; ++testNo) {
			var test = run.tests[testNo];
			for (var i = 0; i < data.length; ++i) {
				if (canonicalError[i]) {
					if (errorEq(canonicalError[i], test.errors[i]) == false) {
						deviations[testNo] = deviations[testNo] || new DeviationList();
						deviations[testNo].add(new Deviation(test.func, data[i], true, canonicalError[i], test.errors[i] !== undefined, test.errors[i] || test.result[i]));
					}
				} else {
					if (resultEq(canonicalResult[i], test.result[i]) == false) {
						deviations[testNo] = deviations[testNo] || new DeviationList();
						deviations[testNo].add(new Deviation(test.func, data[i], false, canonicalResult[i], test.errors[i] !== undefined, test.errors[i] || test.result[i]));
					}
				}
			}
		}
	}
	return deviations;
};

TestResult.prototype.check = function(resultEq, errorEq) {
	var deviations = this.differences(resultEq, errorEq);
	for (var i = 1; i < deviations.length; ++i) {
		if (deviations[i]) {
			deviations[i].throw();
		}
	}
};

// Tester

function Tester(dataGenerator, dataPoints, runs) {
	var EMPTY_ARRAY = [];

	runs = runs || 1;
	dataPoints = dataPoints || 10000;
	dataGenerator = dataGenerator || function() {return EMPTY_ARRAY};

	this.test = function() {
		function generateTestData() {
			var inputData = [];
			for (var i = 0; i < dataPoints; ++i) {
				inputData[i] = dataGenerator();
				if (Object.prototype.toString.call(inputData[i]) !== "[object Array]") {
					inputData[i] = [ inputData[i] ];
				}
			}
			return inputData;
		}

		function timeRun(func, data) {
			var start, elapsed, result = [], errors = [], last = data.length - 1;
			start = Date.now();
			for (var i = last; i >= 0; --i) {
				try {
					result[i] = func.apply(null, data[i]);
				} catch (e) {
					errors[i] = e;
				}
			}
			elapsed = Date.now() - start;
			return new TestRecord(func, elapsed, result, errors);
		}

		var runResults = [];

		for (var currentRun = 0; currentRun < runs; ++currentRun) {
			var data = generateTestData();
			var runRecord = new RunRecord(data);
			var records = [];
			for (var i = 0; i < arguments.length; ++i) {
				runRecord.addTestRecord(timeRun(arguments[i], data));
			}
			runResults.push(runRecord);
		}
		return new TestResult(runResults);
	};
}

if (typeof module !== 'undefined') {
	module.exports = Tester;
}