(function() {
  var config, kue, redis;

  config = require('config');

  kue = require('kue');

  redis = require('redis');

  exports._redisPhantomCache = null;

  exports.getRedisPhantomCache = function() {
    if (exports._redisPhantomCache) {
      /*
      Get the redis client for phantom cache.
      @returns {redis}
      */
      return exports._redisPhantomCache;
    }
    exports._redisPhantomCache = redis.createClient(config.phantomWorker.redis);
    return exports._redisPhantomCache;
  };

  exports._queue = null;

  exports.getTaskQueue = function() {
    if (exports._queue) {
      /*
      Get the task queue.
      @return {Queue}
      */
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
    return new Promise(function(resolve, reject) {
      /*
      @param page {phantom.Page}
      @return {promise<{string}>}
      */
      var checkRenderStatus;
      checkRenderStatus = function(times = 1) {
        return page.evaluateJavaScript(config.phantomWorker.checkContentScript).then(function(isDone) {
          if (isDone) {
            return page.property('content').then(function(content) {
              return resolve(content);
            });
          } else if (times >= config.phantomWorker.checkContentRetryTimes) {
            return reject(new Error(`Content did not completed in ${config.phantomWorker.checkContentInterval * config.phantomWorker.checkContentRetryTimes / 1000}s.`));
          } else {
            return setTimeout(function() {
              return checkRenderStatus(times + 1);
            }, config.phantomWorker.checkContentInterval);
          }
        }).catch(function(error) {
          return reject(error);
        });
      };
      checkRenderStatus();
    });
  };

  exports.cleanScriptTags = function(html) {
    /*
    @param html {string}
    @return {string}
    */
    return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  };

}).call(this);
