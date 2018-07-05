# phantom-worker


## Quick Start
### 1. Clone and Start via pm2
```bash
git clone https://github.com/kelp404/phantom-worker.git
cd phantom-worker
pm2 start process.json
```

### 2. Create a task to render the page
```js
const device = require('device');
const phantomWorker = require('phantom-worker');

exports.baseView = function (req, res, next) {
  if (device(req.headers['user-agent']).type === 'bot') {
    // Render the html for bots.
    phantomWorker.render({
      url: req.protocol + '://' + req.get('host') + req.originalUrl,
      isRemoveCompletedJob: true
    }).then(function(content){
      res.send(content);
    });
    return;
  }
};
```

**You also can create the task by yourself.**
```js
const device = require('device');
const kue = require('kue');

const queue = kue.createQueue({
  redis: {
    host: 'localhost',
    port: 6379,
    db: 2
  }
});

exports.baseView = function (req, res, next) {
  if (device(req.headers['user-agent']).type === 'bot') {
    // Render the html for bots.
    const job = queue.create('phantom-worker', {
      url: req.protocol + '://' + req.get('host') + req.originalUrl
    });
    job.on('complete', function (content) {
      job.remove();
      res.send(content);
    });
    job.save(function(error) {
      if (error) {
        next(new Error(error));
      }
    });
    return;
  }
};
```


## Config
phantom-worker use [config](https://www.npmjs.com/package/config).
You can add your config for your `NODE_ENV`.
/config/production.js
```js
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
    readContentAfter: 0, // minute seconds. If it is 0 checkContentScript will bee executed.
    checkContentInterval: 200,  // minute seconds
    checkContentRetryTimes: 50,
    checkContentScript: "function(){return document.getElementsByClassName('nprogress-busy').length <= 0}",
    redis: {
      host: 'localhost',
      port: 6379,
      password: '',
      db: 2
    }
  }
};
```

### checkContentScript
If your web use [NProgress](https://github.com/rstacruz/nprogress).
You can use this script to check the client site render is done.
```js
function(){
  return document.getElementsByClassName('nprogress-busy').length <= 0;
}
```
