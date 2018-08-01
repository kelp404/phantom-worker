bluebird = require 'bluebird'
config = require 'config'
Log = require 'log'
phantom = require 'phantom'
utils = require './utils'


log = new Log(Log.INFO)
redis = utils.getRedisPhantomCache()
bluebird.promisifyAll redis
queue = utils.getTaskQueue()

###
pm2 gracefulReload flow:
0s: start the new process
2s: pm2 send the `shutdown` message to the old process
10s: the old process be killed
###

setTimeout ->
  queue.process config.phantomWorker.name, config.phantomWorker.concurrentQuantity, (job, done) ->
    ###
    @param job.data {object}
      url: {string}
    ###
    phantomInstance = null
    cacheKey = "#{config.phantomWorker.contentCacheRedisPrefix}#{job.data.url}"

    redis.getAsync(cacheKey).then (reply) ->
      if reply
        done null, reply
        throw null
      phantom.create config.phantomWorker.phantomArguments
    .then (instance) ->
      phantomInstance = instance
      instance.createPage()
    .then (page) ->
      Promise.all [
        page
        page.open job.data.url
      ]
    .then ([page, status]) ->
      emitContent = (content) ->
        phantomInstance.exit()
        if config.phantomWorker.isCleanAllScriptTags
          content = utils.cleanScriptTags content
        redis.setex cacheKey, config.phantomWorker.contentCacheTTL, content, (err) ->
          log.error(err) if err
        done null, content

      if status is 'success'
        if config.phantomWorker.readContentAfter > 0
          # read the content after ...
          setTimeout ->
            page.property('content').then emitContent
            .catch (error) ->
              phantomInstance?.exit()
              log.error error, job.data
              done error
          , config.phantomWorker.readContentAfter
        else
          # read the content when it was done
          utils.getPageContentWhenDone(page).then emitContent
      else
        page.property('content').then emitContent
    .catch (error) ->
      phantomInstance?.exit()
      if error
        log.error error, job.data
        done error
  log.info 'phantom-worker is ready'
, 10000

process.on 'message', (message) ->
  return if message isnt 'shutdown'
  # pm2 gracefulReload
  log.info 'phantom-worker is shutting down'
  queue.shutdown 2000, (error) ->
