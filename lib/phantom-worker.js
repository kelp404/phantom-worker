(function() {
  var Log, bluebird, config, log, phantom, queue, redis, utils;

  bluebird = require('bluebird');

  config = require('config');

  Log = require('log');

  phantom = require('phantom');

  utils = require('./utils');

  log = new Log(Log.INFO);

  redis = utils.getRedisPhantomCache();

  bluebird.promisifyAll(redis);

  queue = utils.getTaskQueue();


  /*
  pm2 gracefulReload flow:
  0s: start the new process
  2s: pm2 send the `shutdown` message to the old process
  10s: the old process be killed
   */

  setTimeout(function() {
    queue.process(config.phantomWorker.name, config.phantomWorker.concurrentQuantity, function(job, done) {

      /*
      @param job.data {object}
        url: {string}
       */
      var cacheKey, phantomInstance;
      phantomInstance = null;
      cacheKey = "" + config.phantomWorker.contentCacheRedisPrefix + job.data.url;
      return redis.getAsync(cacheKey).then(function(reply) {
        if (reply) {
          done(null, reply);
          throw null;
        }
        return phantom.create(config.phantomWorker.phantomArguments);
      }).then(function(instance) {
        phantomInstance = instance;
        return instance.createPage();
      }).then(function(page) {
        return Promise.all([page, page.open(job.data.url)]);
      }).then(function(arg) {
        var emitContent, page, status;
        page = arg[0], status = arg[1];
        emitContent = function(content) {
          phantomInstance.exit();
          if (config.phantomWorker.isCleanAllScriptTags) {
            content = utils.cleanScriptTags(content);
          }
          redis.setex(cacheKey, config.phantomWorker.contentCacheTTL, content, function(err) {
            if (err) {
              return log.error(err);
            }
          });
          return done(null, content);
        };
        if (status === 'success') {
          if (config.phantomWorker.readContentAfter > 0) {
            return setTimeout(function() {
              return page.property('content').then(emitContent)["catch"](function(error) {
                if (phantomInstance != null) {
                  phantomInstance.exit();
                }
                log.error(error, job.data);
                return done(error);
              });
            }, config.phantomWorker.readContentAfter);
          } else {
            return utils.getPageContentWhenDone(page).then(emitContent);
          }
        } else {
          return page.property('content').then(emitContent);
        }
      })["catch"](function(error) {
        if (phantomInstance != null) {
          phantomInstance.exit();
        }
        if (error) {
          log.error(error, job.data);
          return done(error);
        }
      });
    });
    return log.info('phantom-worker is ready');
  }, 10000);

  process.on('message', function(message) {
    if (message !== 'shutdown') {
      return;
    }
    log.info('phantom-worker is shutting down');
    return queue.shutdown(2000, function(error) {});
  });

}).call(this);
