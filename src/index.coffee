config = require 'config'
utils = require './lib/utils'


exports.render = (args = {}) -> new Promise (resolve, reject) ->
  ###
  @param args {object}
    url: {string}
    isRemoveCompletedJob: {bool}
  @return {promise<{string}>}
  ###
  args.config ?= {}
  queue = utils.getTaskQueue()
  job = queue.create config.phantomWorker.name,
    url: args.url
  job.on 'complete', (content) ->
    job.remove() if args.isRemoveCompletedJob
    resolve content
  job.on 'failed', (error) ->
    reject error
  job.save (error) ->
    reject(error) if error
