config = require 'config'
kue = require 'kue'
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

exports.getPageContentWhenDone = (page) -> new Promise (resolve, reject) ->
  ###
  @param page {phantom.Page}
  @return {promise<{string}>}
  ###
  checkRenderStatus = (times = 1) ->
    page.evaluateJavaScript config.phantomWorker.checkContentScript
    .then (isDone) ->
      if isDone
        page.property('content').then (content) ->
          resolve content
      else if times >= config.phantomWorker.checkContentRetryTimes
        reject new Error("Content did not completed in #{config.phantomWorker.checkContentInterval * config.phantomWorker.checkContentRetryTimes / 1000}s.")
      else
        setTimeout ->
          checkRenderStatus times + 1
        , config.phantomWorker.checkContentInterval
    .catch (error) ->
      reject error
  checkRenderStatus()
  return

exports.cleanScriptTags = (html) ->
  ###
  @param html {string}
  @return {string}
  ###
  html.replace /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''
