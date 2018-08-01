(function() {
  var config, utils;

  config = require('config');

  utils = require('./lib/utils');

  exports.render = function(args = {}) {
    return new Promise(function(resolve, reject) {
      var job, queue;
      /*
      @param args {object}
        url: {string}
        isRemoveCompletedJob: {bool}
      @return {promise<{string}>}
      */
      if (args.config == null) {
        args.config = {};
      }
      queue = utils.getTaskQueue();
      job = queue.create(config.phantomWorker.name, {
        url: args.url
      });
      job.on('complete', function(content) {
        if (args.isRemoveCompletedJob) {
          job.remove();
        }
        return resolve(content);
      });
      job.on('failed', function(error) {
        return reject(error);
      });
      return job.save(function(error) {
        if (error) {
          return reject(error);
        }
      });
    });
  };

}).call(this);
