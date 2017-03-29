'use strict';

exports.__esModule = true;
exports.defaultEqualityCheck = defaultEqualityCheck;
exports.defaultMemoize = defaultMemoize;
exports.createSelectorCreator = createSelectorCreator;
exports.createStructuredSelector = createStructuredSelector;
function defaultEqualityCheck(a, b) {
  return a === b;
}

function areArgumentsShallowlyEqual(equalityCheck, prev, next) {
  if (prev === null || next === null || prev.length !== next.length) {
    return false;
  }

  // Do this in a for loop (and not a `forEach` or an `every`) so we can determine equality as fast as possible.
  var length = prev.length;
  for (var i = 0; i < length; i++) {
    if (!equalityCheck(prev[i], next[i])) {
      return false;
    }
  }

  return true;
}

function defaultMemoize(func) {
  var equalityCheck = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : defaultEqualityCheck;
  var cacheSize = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1;

  if (cacheSize < 1) throw new Error('cacheSize must be greater than zero!');

  var argsArr = void 0,
      resultsArr = void 0,
      resultsLength = void 0,
      lastIndex = void 0,
      endIndex = void 0,
      lastCacheHitIndex = void 0,
      i = void 0,
      j = void 0;

  var clearCache = function clearCache() {
    argsArr = [];
    resultsArr = [];
    for (i = 0; i < cacheSize; i++) {
      // Must set to null for the test in areArgumentsShallowlyEqual.
      argsArr[i] = null;
      resultsArr[i] = null;
    }
    resultsLength = 0;
    lastIndex = cacheSize;
    endIndex = cacheSize;
    lastCacheHitIndex = cacheSize - 1;
  };
  clearCache();

  // we reference arguments instead of spreading them for performance reasons
  var memoizedResultFunc = function memoizedResultFunc() {
    // Check the most recent cache hit first
    if (areArgumentsShallowlyEqual(equalityCheck, argsArr[lastCacheHitIndex], arguments)) {
      argsArr[lastCacheHitIndex] = arguments;
      return resultsArr[lastCacheHitIndex];
    }

    // Search from newest to oldest, skipping the last cache hit
    for (i = lastIndex; i < endIndex; i++) {
      if (i === lastCacheHitIndex) continue;

      // Use modulus to cycle through the array
      j = i % cacheSize;
      if (areArgumentsShallowlyEqual(equalityCheck, argsArr[j], arguments)) {
        lastCacheHitIndex = j;
        argsArr[j] = arguments;
        return resultsArr[j];
      }
    }

    if (lastIndex === 0) {
      lastIndex = cacheSize - 1;
    } else {
      if (resultsLength < cacheSize) resultsLength++;
      lastIndex--;
    }
    endIndex = lastIndex + resultsLength;
    lastCacheHitIndex = lastIndex;

    // Apply arguments instead of spreading for performance.
    resultsArr[lastIndex] = func.apply(null, arguments);

    // Must set arguments after result, in case result func throws an error.
    argsArr[lastIndex] = arguments;

    return resultsArr[lastIndex];
  };

  memoizedResultFunc.getArgsArr = function () {
    return argsArr;
  };
  memoizedResultFunc.getResultsArr = function () {
    return resultsArr;
  };
  memoizedResultFunc.getLastIndex = function () {
    return lastIndex;
  };
  memoizedResultFunc.getLastCacheHitIndex = function () {
    return lastCacheHitIndex;
  };
  memoizedResultFunc.getResultsLength = function () {
    return resultsLength;
  };
  memoizedResultFunc.clearCache = clearCache;

  return memoizedResultFunc;
}

function getDependencies(funcs) {
  var dependencies = Array.isArray(funcs[0]) ? funcs[0] : funcs;

  if (!dependencies.every(function (dep) {
    return typeof dep === 'function';
  })) {
    var dependencyTypes = dependencies.map(function (dep) {
      return typeof dep;
    }).join(', ');
    throw new Error('Selector creators expect all input-selectors to be functions, ' + ('instead received the following types: [' + dependencyTypes + ']'));
  }

  return dependencies;
}

function createSelectorCreator(memoize) {
  for (var _len = arguments.length, memoizeOptions = Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    memoizeOptions[_key - 1] = arguments[_key];
  }

  return function () {
    for (var _len2 = arguments.length, funcs = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      funcs[_key2] = arguments[_key2];
    }

    var recomputations = 0;
    var resultFunc = funcs.pop();
    var dependencies = getDependencies(funcs);

    var memoizedResultFunc = memoize.apply(undefined, [function () {
      recomputations++;
      // apply arguments instead of spreading for performance.
      return resultFunc.apply(null, arguments);
    }].concat(memoizeOptions));

    // If a selector is called with the exact same arguments we don't need to traverse our dependencies again.
    var selector = defaultMemoize(function () {
      var params = [];
      var length = dependencies.length;

      for (var i = 0; i < length; i++) {
        // apply arguments instead of spreading and mutate a local list of params for performance.
        params.push(dependencies[i].apply(null, arguments));
      }

      // apply arguments instead of spreading for performance.
      return memoizedResultFunc.apply(null, params);
    });

    selector.resultFunc = resultFunc;
    selector.memoizedResultFunc = memoizedResultFunc;
    if (typeof memoizedResultFunc.clearCache === 'function') selector.clearCache = memoizedResultFunc.clearCache;
    selector.recomputations = function () {
      return recomputations;
    };
    selector.resetRecomputations = function () {
      recomputations = 0;
    };
    return selector;
  };
}

var createSelector = exports.createSelector = createSelectorCreator(defaultMemoize);
var createSelectorWithCacheSize = exports.createSelectorWithCacheSize = function createSelectorWithCacheSize(cacheSize) {
  for (var _len3 = arguments.length, args = Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
    args[_key3 - 1] = arguments[_key3];
  }

  return createSelectorCreator(defaultMemoize, defaultEqualityCheck, cacheSize).apply(undefined, args);
};

function createStructuredSelector(selectors) {
  var selectorCreator = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : createSelector;

  if (typeof selectors !== 'object') {
    throw new Error('createStructuredSelector expects first argument to be an object ' + ('where each property is a selector, instead received a ' + typeof selectors));
  }
  var objectKeys = Object.keys(selectors);
  return selectorCreator(objectKeys.map(function (key) {
    return selectors[key];
  }), function () {
    for (var _len4 = arguments.length, values = Array(_len4), _key4 = 0; _key4 < _len4; _key4++) {
      values[_key4] = arguments[_key4];
    }

    return values.reduce(function (composition, value, index) {
      composition[objectKeys[index]] = value;
      return composition;
    }, {});
  });
}