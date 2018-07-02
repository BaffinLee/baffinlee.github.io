<!--
{
  "id": "SyUQ3umfQ",
  "title": "深入 Egg.js：项目启动流程",
  "slug": "dive-into-eggjs-start-app",
  "comments": true,
  "createdAt": "2018-06-29 17:30:05",
  "publishedAt": "2018-06-29 17:30:05",
  "updatedAt": "2018-06-29 17:30:05",
  "categories": ["nodejs"],
  "tags": ["eggjs"],
  "series": "深入 Egg.js"
}
-->

最近有个小项目，在调研使用哪个 `Node.js` 后端框架，考虑到完善程度以及社区活跃性，最终我选择了 [Egg.js](https://eggjs.org) 。带着好奇心，我粗略看了一下 `Egg.js` 的源代码，在此分享一下。考虑到涉及的东西比较多，准备分开几篇文章来写：项目启动流程、处理请求和优雅重启。

<!-- more -->

# 启动脚本

启动脚本有三种方式：开发环境使用 `egg-bin` 启动、生产环境使用 `egg-script` 启动、自定义启动。

## 开发环境使用 egg-bin 启动

1. `dev` 环境： 处理传入的参数，比如文件位置、监听端口、`worker` 数量等，然后 `startCluster`。
2. `debug` 环境：继承 `dev` 环境处理参数的逻辑，并且给启动参数加上 `--inspect` 参数（此参数用与启动 `master` 进程，后续的 `agent` 与 `worker` 由 `master` 进程设置相应参数启动），启动一个 `inspector proxy` 代理，这样调试的时候直接与代理交互就行，不用关心 `worker` 的数量、端口以及重启等问题。注意此时代理并不知道真正的 `worker` 的调试端口，所以只是监听事件，等 `worker` 启动后发消息过来时，便自动代理 worker 的调试端口。然后 `startCluster`。

## 生产环境使用 egg-script 启动

生产环境比开发环境需要注意更多的东西。 `egg-script` 有 `start` 和 `stop` 两个命令，顾名思义，`start` 命令是来启动。我们主要关注 `start` 命令。首先，依然是处理传入的参数，开发环境中日志默认输出到控制台，生产环境的日志会默认输出到文件。

然后如果指定的 `deamon` 作为守护进程启动的话，需要做特殊处理：

```javascript
// see https://github.com/eggjs/egg-scripts/blob/82f4125245ddde5378401d04404b89fb27c86765/lib/cmd/start.js#L142-L166

if (isDaemon) {
  const [ stdout, stderr ] = yield [ getRotatelog(argv.stdout), getRotatelog(argv.stderr) ];
  options.stdio = [ 'ignore', stdout, stderr, 'ipc' ];
  options.detached = true;

  const child = this.child = spawn('node', eggArgs, options);
  this.isReady = false;
  child.on('message', msg => {
    /* istanbul ignore else */
    if (msg && msg.action === 'egg-ready') {
      this.isReady = true;
      this.logger.info('%s started on %s', this.frameworkName, msg.data.address);
      child.unref();
      child.disconnect();
      process.exit(0);
    }
  });

  // check start status
  yield this.checkStatus(argv);
} else {
  // signal event had been handler at common-bin helper
  this.helper.spawn('node', eggArgs, options);
}
```

注意这里使用的是 `child_process` 模块的 `spawn` 创建子进程，而不是 `fork`。为了成为守护进程，分别设置了 `stdio` 与 `detach` 参数，然后在子进程 `ready` 后，断开与父进程的 `ipc` 通道，断开引用，退出父进程。

父进程在启动子进程后，还会不停地查询子进程是否 `ready`，如果超过特定时间子进程还没 `ready` ，或者错误日志被写入了内容，说明其中出了问题，报错。

```javascript
// see https://github.com/eggjs/egg-scripts/blob/82f4125245ddde5378401d04404b89fb27c86765/lib/cmd/start.js#L186-L231

* checkStatus({ stderr, timeout, 'ignore-stderr': ignoreStdErr }) {
  let count = 0;
  let hasError = false;
  let isSuccess = true;
  timeout = timeout / 1000;
  while (!this.isReady) {
    try {
      const stat = yield fs.stat(stderr);
      if (stat && stat.size > 0) {
        hasError = true;
        break;
      }
    } catch (_) {
      // nothing
    }

    if (count >= timeout) {
      this.logger.error('Start failed, %ds timeout', timeout);
      isSuccess = false;
      break;
    }

    yield sleep(1000);
    this.logger.log('Wait Start: %d...', ++count);
  }

  if (hasError) {
    try {
      const [ stdout ] = yield exec('tail -n 100 ' + stderr);
      this.logger.error('Got error when startup: ');
      this.logger.error(stdout);
    } catch (_) {
      // nothing
    }
    isSuccess = ignoreStdErr;
    this.logger.error('Start got error, see %s', stderr);
    this.logger.error('Or use `--ignore-stderr` to ignore stderr at startup.');
  }

  if (!isSuccess) {
    this.child.kill('SIGTERM');
    yield sleep(1000);
    process.exit(1);
  }
}
```

子进程中调用 `startCluster` 启动。

## 自定义启动

`Egg.js` 是一个灵活的框架，你可以通过下面的代码这样自定义启动，不过如果你不知道自己在干嘛的话，还是老实地使用 `egg-script` 启动吧 :)。

```javascript
require('egg').startCluster(options);
```

# egg-cluster 启动

以上启动脚本调用 `startCluster` 方法后，`egg-cluster` 模块便接管了接下来的事项。

## 启动 Master 进程

启动脚本的进程我们叫它 `parent` 进程，`parent` 进程启动的子进程是 `master` 进程（如果你使用自定义启动，则没有 `parent` 进程，自己就是 `master` 进程）。关系图如下，具体参见 [Egg 文档](https://eggjs.org/zh-cn/core/cluster-and-ipc.html)：

```
                +--------+
                | Parent |
                +--------+
                    ^ 
                    |
                    |
                    |
                    v
                +--------+          +-------+
                | Master |<-------->| Agent |
                +--------+          +-------+
                ^   ^    ^
               /    |     \
             /      |       \
           /        |         \
         v          v          v
+----------+   +----------+   +----------+
| Worker 1 |   | Worker 2 |   | Worker 3 |
+----------+   +----------+   +----------+
```

`parent` 进程在 `master` 进程成功启动后，即完成使命，光荣退出（`deamon` 模式下是这样，其它模式下不会，比如 `debug` 环境下继续维护远程调试的代理）。

`master` 进程负责管理接下来启动的 `app` 与 `agent` 进程，并且是通信的中心枢纽。`master` 进程继承了 `EventEmitter` 类，他本身主要通过监听事件与发出事件来完成任务，这样就没有难看的 `callback hell`。

## 启动 Agent 进程

`master` 进程首先启动 `agent` 进程。`agent` 进程是用来干嘛的呢？我第一次看到这个的时候我也很困惑，按理说有 `master` 和 `worker` 进程不就好了吗，`agent` 进程似乎是多余的。当然我还是太年轻，大家可以去看看 [Egg 文档](https://eggjs.org/zh-cn/core/cluster-and-ipc.html) 关于 `agent` 进程的设计：

> Agent 好比是 Master 给其他 Worker 请的一个『秘书』，它不对外提供服务，只给 App Worker 打工，专门处理一些公共事务。

这里确实能让你感受到 `Egg.js 为企业级框架和应用而生` 这句话的道理，`Egg.js` 团队在业务中遇到的坑，都总结做出方案贡献到了框架里。

`agent` 进程启动后，发送 `agent-start` 事件给 `master`，`master` 进程监听了这个事件，并且在处理函数中启动 `worker` 进程。

```javascript
// see https://github.com/eggjs/egg-cluster/blob/b3c0e39d82197cd898f04a0101897e87b574161f/lib/master.js#L98-L133

this.on('agent-exit', this.onAgentExit.bind(this));
this.on('agent-start', this.onAgentStart.bind(this));
this.on('app-exit', this.onAppExit.bind(this));
this.on('app-start', this.onAppStart.bind(this));
this.on('reload-worker', this.onReload.bind(this));

// fork app workers after agent started
this.once('agent-start', this.forkAppWorkers.bind(this));

// ...

detectPort((err, port) => {
  /* istanbul ignore if */
  if (err) {
    err.name = 'ClusterPortConflictError';
    err.message = '[master] try get free port error, ' + err.message;
    this.logger.error(err);
    process.exit(1);
  }
  this.options.clusterPort = port;
  this.forkAgentWorker();
});
```

## 启动 Worker 进程

`egg-cluster` 使用 [cfork](https://github.com/node-modules/cfork) 来启动 `worker` 进程，`cfork` 会自动做出错时的 `refork` 操作。值得注意的是，在 `worker` 进程没启动成功之前，自动 `refork` 逻辑会关闭掉，直到 `worker` 进程都 `ready` 后才打开，这样可以避免 `worker` 进程启动时发生错误无限自动重启的问题（PM2也有相关参数避免这个问题）。

```javascript
// see https://github.com/eggjs/egg-cluster/blob/b3c0e39d82197cd898f04a0101897e87b574161f/lib/master.js#L229-L262

forkAppWorkers() {
  this.appStartTime = Date.now();
  this.isAllAppWorkerStarted = false;
  this.startSuccessCount = 0;

  const args = [ JSON.stringify(this.options) ];
  this.log('[master] start appWorker with args %j', args);
  cfork({
    exec: appWorkerFile,
    args,
    silent: false,
    count: this.options.workers,
    // don't refork in local env
    refork: this.isProduction,
  });

  let debugPort = process.debugPort;
  cluster.on('fork', worker => {
    worker.disableRefork = true;
    this.workerManager.setWorker(worker);
    worker.on('message', msg => {
      if (typeof msg === 'string') msg = { action: msg, data: msg };
      msg.from = 'app';
      this.messenger.send(msg);
    });
    this.log('[master] app_worker#%s:%s start, state: %s, current workers: %j',
      worker.id, worker.process.pid, worker.state, Object.keys(cluster.workers));

    // send debug message, due to `brk` scence, send here instead of app_worker.js
    if (this.options.isDebug) {
      debugPort++;
      this.messenger.send({ to: 'parent', from: 'app', action: 'debug', data: { debugPort, pid: worker.process.pid } });
    }
  });

  // ...
}
```

`worker` 进程启动后，会发送 `app-start` 事件给 `master`，调用 `onAppStart` 处理函数。`onAppStart` 主要做了两件事

1. 统计成功启动的 `worker` 数量；
2. 如果设置了 `sticky` 选项（一般在使用 `websocket` 时需要设置），做不同的处理。

如果不需要 `sticky` 模式，用 `nodejs` 的 `cluster` 模块启动 `worker`，每个 `worker` 可以监听到同一个端口，处理请求。当然这只是表象，实际上是 `cluster` 模块为你监听了那个端口，然后用某个调度算法（比如 `round-robin`）把请求分配给 `worker` 处理。

而 `sticky` 模式则不是这样。为什么要 `sticky` 模式呢？ `HTTP` 协议是无状态的，每个请求进入不同的 `worker` 处理的话，结果应该是一致（如果你的 `session` 不是依赖本地缓存的话）。而 `websocket` 则是有状态，连接是全双工的，如果 `client A` 本来连接了 `worker B`，而下次又由 `worker C` 处理的话，就会出问题。`sticky` 模式正是要解决这个问题，它会把 `client A` 的请求始终分配给 `worker B`。

上代码看看`sticky` 模式是怎么实现的：

```javascript
// see https://github.com/eggjs/egg-cluster/blob/b3c0e39d82197cd898f04a0101897e87b574161f/lib/master.js#L153-L168

startMasterSocketServer(cb) {
  // Create the outside facing server listening on our port.
  require('net').createServer({ pauseOnConnect: true }, connection => {
    // We received a connection and need to pass it to the appropriate
    // worker. Get the worker for this connection's source IP and pass
    // it the connection.

    /* istanbul ignore next */
    if (!connection.remoteAddress) {
      connection.close();
    } else {
      const worker = this.stickyWorker(connection.remoteAddress);
      worker.send('sticky-session:connection', connection);
    }
  }).listen(this[REALPORT], cb);
}
```

`master` 进程监听了 `REALPORT`，当请求进来时，它会通过消息把 `connection` 传递给 `worker` 处理。怎么确定通知哪个 `worker` 处理请求呢？继续看代码：

```javascript
// see https://github.com/eggjs/egg-cluster/blob/b3c0e39d82197cd898f04a0101897e87b574161f/lib/master.js#L170-L183

stickyWorker(ip) {
  const workerNumbers = this.options.workers;
  const ws = this.workerManager.listWorkerIds();

  let s = '';
  for (let i = 0; i < ip.length; i++) {
    if (!isNaN(ip[i])) {
      s += ip[i];
    }
  }
  s = Number(s);
  const pid = ws[s % workerNumbers];
  return this.workerManager.getWorker(pid);
}
```

上面的源代码可以看出，`master` 进程是通过请求中客户端的 `ip` 来确定该请求由哪个 `worker` 处理。

再看 `worker` 所做的事情，区别处理了 `http` 与 `https` 两种情况：

```javascript
// see https://github.com/eggjs/egg-cluster/blob/b3c0e39d82197cd898f04a0101897e87b574161f/lib/app_worker.js#L36-L45

let server;
if (options.https) {
  const httpsOptions = Object.assign({}, options.https, {
    key: fs.readFileSync(options.https.key),
    cert: fs.readFileSync(options.https.cert),
  });
  server = require('https').createServer(httpsOptions, app.callback());
} else {
  server = require('http').createServer(app.callback());
}
```

然后区别处理了 `sticky` 模式与否：

```javascript
// see https://github.com/eggjs/egg-cluster/blob/b3c0e39d82197cd898f04a0101897e87b574161f/lib/app_worker.js#L55-L81

if (options.sticky) {
  server.listen(0, '127.0.0.1');
  // Listen to messages sent from the master. Ignore everything else.
  process.on('message', (message, connection) => {
    if (message !== 'sticky-session:connection') {
      return;
    }

    // Emulate a connection event on the server by emitting the
    // event with the connection the master sent us.
    server.emit('connection', connection);
    connection.resume();
  });
} else {
  if (listenConfig.path) {
    server.listen(listenConfig.path);
  } else {
    if (typeof port !== 'number') {
      consoleLogger.error('[app_worker] port should be number, but got %s(%s)', port, typeof port);
      process.exit(1);
    }
    const args = [ port ];
    if (listenConfig.hostname) args.push(listenConfig.hostname);
    debug('listen options %s', args);
    server.listen(...args);
  }
}
```

正如前文所述，非 `sticky` 模式下，`worker` 直接监听到同一个端口；而 `sticky` 模式下，`worker` 监听随机端口，当然这些随机端口不会有请求进来，`worker` 其实在等待 `master` 发消息过来，然后自己主动触发 `connection` 事件，这样就能假装有请求进来，然后走正常逻辑。

至此，`worker` 启动完成，接下来是 `app` 的初始化。

# APP 初始化

## 加载文件

[Egg 文档](https://eggjs.org/zh-cn/advanced/loader.html) 也有相应说明。

- 加载 `plugin`；
- 加载 `config`；
- 加载 `extend`；
- 加载 `app.js`、`agent.js`；
- 加载 `service`；
- 加载 `middleware`；
- 加载 `controller`；
- 加载 `router`；

## 生命周期

> Egg提供了应用启动(`beforeStart`), 启动完成(`ready`), 关闭(`beforeClose`)这三个生命周期方法。

```
   init master process
           ⬇
init agent worker process
           ⬇
loader.load | beforeStart
           ⬇
 await agent worker ready
           ⬇
   call ready callback
           ⬇
init app worker processes
           ⬇
loader.load | beforeStart
           ⬇
 await app workers ready
           ⬇
   call ready callback
           ⬇
send egg-ready to master,
    agent,app workers
```

# 总结

简要地介绍了一下 `Egg.js` 的启动流程，涉及的源代码有点多，可能有些地方讲得不准确，欢迎指正。接下来应该还会写一篇分析 `Egg.js` 处理请求的流程的文章。

参考：

* [Egg.js](https://eggjs.org)
* [Loader](https://eggjs.org/zh-cn/advanced/loader.html)
* [多进程模型和进程间通讯](https://eggjs.org/zh-cn/core/cluster-and-ipc.html)
* [egg-cluster](https://github.com/eggjs/egg-cluster)
* [egg-script](https://github.com/eggjs/egg-scripts)
* [egg-bin](https://github.com/eggjs/egg-bin)

（完）
