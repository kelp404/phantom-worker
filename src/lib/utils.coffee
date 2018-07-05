config = require 'config'
kue = require 'kue'
q = require 'q'
redis = require 'redis'


exports._redisPhantomCache = null
exports.getRedisPhantomCache = ->
  ###
  Get the redis client for phantom cache.
  @returns {redis}
  ###
  return exports._redisPhantomCache if exports._redisPhantomCache
  exports._redisPhantomCache = redis.createClient config.phantomWorker.redis
  exports._redisPhantomCache
exports._queue = null
exports.getTaskQueue = ->
  ###
  Get the task queue.
  @return {Queue}
  ###
  return exports._queue if exports._queue
  exports._queue = kue.createQueue
    redis:
      host: config.phantomWorker.redis.host
      port: config.phantomWorker.redis.port
      auth: config.phantomWorker.redis.password
      db: config.phantomWorker.redis.db
  exports._queue

exports.getPageContentWhenDone = (page) ->
  ###
  @param page {phantom.Page}
  @return {promise<{string}>}
  ###
  deferred = q.defer()
  checkRenderStatus = (times = 1) ->
    page.evaluateJavaScript config.phantomWorker.checkContentScript
    .then (isDone) ->
      if isDone
        page.property('content').then (content) ->
          deferred.resolve content
      else if times >= config.phantomWorker.checkContentRetryTimes
        deferred.reject new Error("Content did not completed in #{config.phantomWorker.checkContentInterval * config.phantomWorker.checkContentRetryTimes / 1000}s.")
      else
        setTimeout ->
          checkRenderStatus times + 1
        , config.phantomWorker.checkContentInterval
    .catch (error) ->
      deferred.reject error
  checkRenderStatus()
  deferred.promise

exports.cleanScriptTags = (html) ->
  ###
  @param html {string}
  @return {string}
  ###
  html.replace /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''
