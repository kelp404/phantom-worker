module.exports = {
  phantomWorker: {
    name: 'phantom-worker',
    isCleanAllScriptTags: true,  // Remove all <script> in the html when it is true.
    concurrentQuantity: 2,  // How many PhantomJS work in the same time?
    contentCacheTTL: 86400,  // 24 hrs = 86400s
    contentCacheRedisPrefix: 'c:',
    phantomArguments: [
      '--load-images=no',
      '--disk-cache=yes',
      '--disk-cache-path=/tmp/phantom-worker'
    ],
    readContentAfter: 1000, // minute seconds. If it is 0 checkContentScript will bee executed.
    checkContentInterval: 200,  // minute seconds
    checkContentRetryTimes: 50,
    checkContentScript: "function(){return document.getElementsByClassName('nprogress-busy').length <= 0}",
    redis: {
      host: 'localhost',
      port: '6379',
      password: '',
      db: 2
    }
  }
};
