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
    phantomWorker.render({url: req.protocol + '://' + req.get('host') + req.originalUrl})
    .then(function(content){
      res.send(content);
    });
  }
}
```
