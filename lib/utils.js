(function() {
  var config, kue, q, redis;

  config = require('config');

  kue = require('kue');

  q = require('q');

  redis = require('redis');

  exports._redisPhantomCache = null;

  exports.getRedisPhantomCache = function() {

    /*
    Get the redis client for phantom cache.
    @returns {redis}
     */
    if (exports._redisPhantomCache) {
      return exports._redisPhantomCache;
    }
    exports._redisPhantomCache = redis.createClient(config.phantomWorker.redis);
    return exports._redisPhantomCache;
  };

  exports._queue = null;

  exports.getTaskQueue = function() {

    /*
    Get the task queue.
    @return {Queue}
     */
    if (exports._queue) {
      return exports._queue;
    }
    exports._queue = kue.createQueue({
      redis: {
        host: config.phantomWorker.redis.host,
        port: config.phantomWorker.redis.port,
        auth: config.phantomWorker.redis.password,
        db: config.phantomWorker.redis.db
      }
    });
    return exports._queue;
  };

  exports.getPageContentWhenDone = function(page) {

    /*
    @param page {phantom.Page}
    @return {promise<{string}>}
     */
    var checkRenderStatus, deferred;
    deferred = q.defer();
    checkRenderStatus = function(times) {
      if (times == null) {
        times = 1;
      }
      return page.evaluateJavaScript(config.phantomWorker.checkContentScript).then(function(isDone) {
        if (isDone) {
          return page.property('content').then(function(content) {
            return deferred.resolve(content);
          });
        } else if (times >= config.phantomWorker.checkContentRetryTimes) {
          return deferred.reject(new Error("Content did not completed in " + (config.phantomWorker.checkContentInterval * config.phantomWorker.checkContentRetryTimes / 1000) + "s."));
        } else {
          return setTimeout(function() {
            return checkRenderStatus(times + 1);
          }, config.phantomWorker.checkContentInterval);
        }
      })["catch"](function(error) {
        return deferred.reject(error);
      });
    };
    checkRenderStatus();
    return deferred.promise;
  };

  exports.cleanScriptTags = function(html) {

    /*
    @param html {string}
    @return {string}
     */
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

}).call(this);
