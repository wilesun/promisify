var lodash = require('lodash');

function Context(resolve, reject, custom) {
  this.resolve = resolve;
  this.reject = reject;
  this.custom = custom;
}

function callback(ctx, err, result) {
  if (typeof ctx.custom === 'function') {
    var cust = function() {
      return ctx.custom.apply(cust, arguments);
    };
    cust.resolve = ctx.resolve;
    cust.reject = ctx.reject;
    cust.call(null, err, result);
  } else {
    if (err) {
      return ctx.reject(err);
    }
    ctx.resolve(result);
  }
}

var promisify = function(original, custom, thisArgs) {
  return function() {
    var args = Array.prototype.slice.call(arguments);
    return new Promise(function(resolve, reject) {
      var ctx = new Context(resolve, reject, custom);
      args.push(callback.bind(null, ctx));
      original.apply(thisArgs ? thisArgs : original, args);
    });
  };
};

Promise.promisify = Promise.promisify || promisify;

Promise.promisifyRight = function(func) {
  return Promise.promisify(lodash.partialRight.apply(this, arguments));
};

Promise.delay = function(timeout) {
    return new Promise(function(resolve) {
      setTimeout(resolve, timeout);
    });
  }
  //https://github.com/jaz303/promise-debounce
Promise.debounce = function(fn, wait, ctx) {
  var allResolves = [];
  var allRejects = [];
  var debounced = lodash.debounce(function() {
    Promise.resolve(fn.apply(ctx, arguments)).then(function(result) {
      allResolves.forEach(function(resolve) {
        resolve(result);
      });
    }, function(err) {
      allRejects.forEach(function(reject) {
        reject(err);
      });
    });
  }, wait);
  return function() {
    debounced.apply(this, arguments);
    return new Promise(function(resolve, reject) {
      allResolves.push(resolve);
      allRejects.push(reject);
    });
  }
}

Promise.prototype.callback = function(cb) {
  return this.then(function(data) {
    cb && cb(null, data);
    return data;
  }, function(data) {
    cb && cb(data);
    throw data;
  });
};

Promise.prototype.finally = function finallyPolyfill(callback) {
  var constructor = this.constructor;
  return this.then(function(value) {
    return constructor.resolve(callback()).then(function() {
      return value;
    });
  }, function(reason) {
    return constructor.resolve(callback()).then(function() {
      throw reason;
    });
  });
};

Promise.prototype.callbackNoReturn = function(cb) {
  return this.then(function(data) {
    cb && cb(null);
    return data;
  }, function(data) {
    cb && cb(data);
    throw data;
  });
};

Promise.eachSeries = function(array, func) {
  var sequence = Promise.resolve([]);
  var items = [];
  array.forEach(function(item) {
    sequence = sequence.then(function() {
      var ret = func(item);
      items.push(ret);
      return ret;
    });
  });
  return sequence.then(function() {
    return Promise.all(items);
  });
};

Promise.assertTrue = function(expr, errMsg) {
  return expr ? Promise.resolve() : Promise.reject(errMsg);
}

Promise.assertNull = function(expr, errMsg) {
  return expr == null ? Promise.resolve() : Promise.reject(expr + errMsg);
}