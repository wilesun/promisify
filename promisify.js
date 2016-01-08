var lodash = require('lodash');

function Context(resolve, reject, custom) {
    this.resolve = resolve;
    this.reject = reject;
    this.custom = custom;
}

// Default callback function - rejects on truthy error, otherwise resolves
function callback(ctx, err, result) {
    if (typeof ctx.custom === 'function') {
        var cust = function () {
            // Bind the callback to itself, so the resolve and reject
            // properties that we bound are available to the callback.
            // Then we push it onto the end of the arguments array.
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

Promise.promisify = Promise.promisify || function (original, custom, thisArgs) {
        return function () {
            // Parse out the original arguments
            var args = Array.prototype.slice.call(arguments);
            // Return the promisified function
            return new Promise(function (resolve, reject) {
                // Create a Context object
                var ctx = new Context(resolve, reject, custom);
                // Append the callback bound to the context
                args.push(callback.bind(null, ctx));
                // Call the function
                original.apply(thisArgs ? thisArgs : original, args);
            });
        };
    };

Promise.promisifyRight = function (func) {
    return Promise.promisify(lodash.partialRight.apply(this, arguments));
};

Promise.delay = function (timeout) {
    return new Promise(function (resolve) {
        setTimeout(resolve, timeout);
    });
};
//https://github.com/jaz303/promise-debounce
Promise.debounce = function (fn, wait, ctx) {
    var allResolves = [];
    var allRejects = [];
    var debounced = lodash.debounce(function () {
        Promise.resolve(fn.apply(ctx, arguments)).then(function (result) {
            allResolves.forEach(function (resolve) {
                resolve(result);
            });
        }, function (err) {
            allRejects.forEach(function (reject) {
                reject(err);
            });
        });
    }, wait);
    return function () {
        debounced.apply(this, arguments);
        return new Promise(function (resolve, reject) {
            allResolves.push(resolve);
            allRejects.push(reject);
        });
    }
};

Promise.fromCallbak = function (err, data) {
    if (err) return Promise.reject(err);
    return Promise.resolve(data);
};

Promise.eachSeries = function (array, func) {
    var sequence = Promise.resolve([]);
    var items = [];
    lodash.forEach(array, function (item) {
        sequence = sequence.then(function () {
            var ret = func(item);
            items.push(ret);
            return ret;
        });
    });
    return sequence.then(function () {
        return Promise.all(items);
    });
};

Promise.allCatch = function (promises) {
    return Promise.all(promises.map(function (promise) {
        return promise.then(function (v) {
            return {value: v};
        }).catch(function (e) {
            return {error: e};
        });
    })).then(function (result) {
        var errors = result.map(function (r) {
            return r.error;
        });
        if (lodash.reject(errors, lodash.isUndefined).length > 0) {
            return Promise.reject(errors);
        }
        return lodash.pluck(result, 'value');
    });
};

var EventEmiter = function () {
    var _events = {};

    function addChain(event, options, func) {
        if (typeof(options) == 'function') {
            func = options;
            options = {};
        }
        var judgers = _events[event];
        if (!judgers) {
            judgers = [];
            _events[event] = judgers;
        }
        func.order = options.order;
        judgers.push(func);
        judgers = lodash.sortBy(judgers, function (judger) {
            return judger.order && judger.order.last ? 1 : 0;
        });
        _events[event] = judgers;
        return function () {
            var index = _events[event].indexOf(func);
            if (index >= 0)
                _events[event].splice(index, 1);
        };
    }

    function clearChain(events) {
        lodash.forEach(arguments, function (event) {
            delete _events[event];
        });
    }

    function callAsyncChain(event, args) {
        var judgers = _events[event];
        if (!judgers) {
            return Promise.resolve();
        }
        var self = this;
        return Promise.eachSeries(judgers, function (judger) {
            return judger.apply(self, (args || []));
        });
    }

    function callAsyncOrChain(event, args) {
        var judgers = _events[event];
        if (!judgers) {
            return Promise.resolve(false);
        }
        var self = this;
        var seq = judgers.reduce(function (seq, judger) {
            return seq.then(function (result) {
                if (result) {
                    return result;
                }
                return judger.apply(self, args);
            });
        }, Promise.resolve(false));
        return seq;
    }

    function callAsyncAndChain(event, args) {
        var judgers = _events[event];
        if (!judgers) {
            return Promise.resolve(true);
        }
        var self = this;
        var seq = judgers.reduce(function (seq, judger) {
            return seq.then(function (result) {
                if (!result) {
                    return result;
                }
                return judger.apply(self, args);
            });
        }, Promise.resolve(true));
        return seq;
    }

    return {
        emit: callAsyncChain,
        emitOr: callAsyncOrChain,
        emitAnd: callAsyncAndChain,
        on: addChain,
        clear: clearChain
    }
};

Promise.emitter = EventEmiter();

Promise.prototype.callback = function (cb) {
    return this.then(function (data) {
        cb && (data == undefined ? cb(null) : cb(null, data));
        return data;
    }, function (data) {
        cb && cb(data);
        throw data;
    });
};

Promise.prototype.finally = function finallyPolyfill(callback) {
    var constructor = this.constructor;

    return this.then(function (value) {
        return constructor.resolve(callback()).then(function () {
            return value;
        });
    }, function (reason) {
        return constructor.resolve(callback()).then(function () {
            throw reason;
        });
    });
};

Promise.prototype.callbackNoReturn = function (cb) {
    return this.then(function (data) {
        cb && cb(null);
        return data;
    }, function (data) {
        cb && cb(data);
        throw data;
    });
};
