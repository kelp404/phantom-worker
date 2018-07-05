config = require 'config'
q = require 'q'
utils = require './lib/utils'


exports.render = (args = {}) ->
  ###
  @param args {object}
    url: {string}
    isRemoveCompletedJob: {bool}
  @return {promise<{string}>}
  ###
  args.config ?= {}
  deferred = q.defer()
  queue = utils.getTaskQueue()
  job = queue.create config.phantomWorker.name,
    url: args.url
  job.on 'complete', (content) ->
    job.remove() if args.isRemoveCompletedJob
    deferred.resolve content
  job.on 'failed', (error) ->
    deferred.reject error
  job.save (error) ->
  deferred.promise
