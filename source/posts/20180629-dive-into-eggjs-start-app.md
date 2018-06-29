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

`parent` 进程在 `master` 进程成功启动后，即完成使命，光荣退出（`deamon` 模式下，其它模式下不会，比如 `debug` 环境下继续维护远程调试的代理）。

`master` 进程负责管理接下来启动的 `app` 与 `agent` 进程。`master` 进程继承了 `EventEmitter` 类，他本身主要通过监听事件与发出事件来完成任务，这样就没有可怕的回调了。

## 启动 Agent 进程

`master` 进程首先启动 `agent` 进程。`agent` 进程是用来干嘛的呢？我第一次看到这个的时候我也很困惑，按理说有 `master` 和 `worker` 进程不就好了吗，`agent` 进程似乎是多余的。当然我还是太年轻，大家可以去看看 [Egg 文档](https://eggjs.org/zh-cn/core/cluster-and-ipc.html) 关于 `agent` 进程的设计：

> Agent 好比是 Master 给其他 Worker 请的一个『秘书』，它不对外提供服务，只给 App Worker 打工，专门处理一些公共事务。

这里确实能让你感受到 `Egg.js 为企业级框架和应用而生` 这句话的道理，`Egg.js` 团队在业务中遇到的坑，都总结做出方案贡献到了框架里。

`agent` 进程启动后，发送 `agent-start` 事件给 `master`，`master` 进程监听了这个事件，并且在处理函数中启动 `worker` 进程。

## 启动 Worker 进程

（未完）
