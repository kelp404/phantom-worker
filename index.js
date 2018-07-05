(function() {
  var config, q, utils;

  config = require('config');

  q = require('q');

  utils = require('./lib/utils');

  exports.render = function(args) {
    var deferred, job, queue;
    if (args == null) {
      args = {};
    }

    /*
    @param args {object}
      url: {string}
      isRemoveCompletedJob: {bool}
    @return {promise<{string}>}
     */
    if (args.config == null) {
      args.config = {};
    }
    deferred = q.defer();
    queue = utils.getTaskQueue();
    job = queue.create(config.phantomWorker.name, {
      url: args.url
    });
    job.on('complete', function(content) {
      if (args.isRemoveCompletedJob) {
        job.remove();
      }
      return deferred.resolve(content);
    });
    job.on('failed', function(error) {
      return deferred.reject(error);
    });
    job.save(function(error) {});
    return deferred.promise;
  };

}).call(this);
