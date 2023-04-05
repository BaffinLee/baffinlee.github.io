<!--
{
  "title": "使用 axios 的 adapter 优雅地 mock 数据",
  "createdAt": "2018-07-03 14:21:45",
  "categories": ["前端"],
  "tags": ["js"]
}
-->

前端开发阶段经常需要 `mock` 数据，这时候我们会用 [Mock.js](http://mockjs.com/) 或者自己搭一个代理服务器进行数据的 `mock`。在项目中使用 [axios](https://github.com/axios/axios) 进行 `ajax` 请求之后，我发现了一种优雅的 `mock` 数据的方式：使用 `axios` 的 `adapter` 机制。

<!-- more -->

先介绍一下常用的 mock 数据方案：

# Mock.js

`Mock.js` 的原理是使用封装了自己逻辑的 `XMLHttpRequest` 对象替换掉了浏览器内置的 `XMLHttpRequest` 对象，以此加入匹配 `url` 进行 `mock` 数据的逻辑。

```javascript
// see https://github.com/nuysoft/Mock/blob/c4d7cba01900b5c5bb8e3d474c8f5d07810ab72e/src/mock.js#L57-L58

// 拦截 XHR
if (XHR) window.XMLHttpRequest = XHR
```

`Mock.js` 的优点很明显：

1. 非常容易上手；
2. 而且自带了随机数据生成的功能，用得比较多。

当然也是有缺点的：

1. 替换了浏览器内置的 `XMLHttpRequest` 对象，虽然说大部分情况下不会出什么问题，但是一旦发生问题，便是很隐晦的问题，难以排查；
2. 如果没注意开发与线上环境的区分的话，会把随机数据打包进入生产环境里，增大文件体积；
3. 另外，现在又有了一个新的方式来进行 `ajax` 请求，[fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)，难道又要自己封装一个 `fetch` 去替换掉浏览器默认的，来实现拦截请求做 `mock` 数据的逻辑？

# 代理服务器

代理服务器即搭建一个测试数据的服务器，或者在实际服务器前面设一个代理，匹配到了特定的 `url` 就响应 `mock` 数据，没匹配就透传。

代理服务器的优点有：

1. 灵活，可以自由地控制 `mock` 数据，特别是现在流行前端学习使用 `nodejs` 做全栈，适合前端去折腾；
2. 方便集中管理，可以整个公司或团队搭建一个 `mock` 数据服务器，作为一项服务提供给前端开发，前端开发可以去服务后台设置需要 `mock` 的 `url` 和具体数据。

# Axios Adapter

关于 `axios` 的 `adapter` 机制，可以看看 [官方文档](https://github.com/axios/axios/tree/master/lib/adapters) 。

简单来说，`axios` 的请求是交给 `adapter` 去实现的。默认有两个 `adapter`，在浏览器环境是 `xhr` 即 `XMLHttpRequest`，在 nodejs 上是 `http` 模块。这样就实现了兼容两个平台，并且提供一致的 api。而且 `adapter` 是可以由用户实现的，这就给我们 `mock` 数据提供了完美的途径。`adapter` 示例：

```javascript
axios({
  url: '',
  adapter: function myAdapter(config) {
    return new Promise(function(resolve, reject) {
      if (someLogic) {
        resolve({
          data: responseData,
          status: request.status,
          statusText: request.statusText,
          headers: responseHeaders,
          config: config,
          request: request
        });
      } else {
        reject(new Error());
      }
    });
  }
});
```

我们只需要在开发环境，把 `adapter` 设为我们自己的实现，在里面加入 `mock` 逻辑。以下是示例代码：

```javascript
import axios from 'axios';

const instance = axios.create();

// mock services for dev
if (process.env.NODE_ENV === 'development') {
  instance.defaults.originAdapter = instance.defaults.adapter;
  instance.defaults.adapter = (config) => {
    // 判断是否需要 mock
    if (config.url === 'test') {
      return config.originAdapter(config);
    }
    return new Promise((resolve, reject) => {
      // 从文件获取 mock 数据
      import('./mock/test.js').then((res) => {
        resolve({
          data: res,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {},
        });
      }).catch((err) => {
        reject(err);
      });
    });
  };
}

export default instance;
```

# 总结

使用 `axios` 的 `adapter` 机制来实现 `mock` 数据的需求，既有 `Mock.js` 的简单容易上手的优点，又不需要替换浏览器内置的 `XMLHttpRequest` 对象，比较优雅。顺便一提，`axios` 的设计很值得学习，实例化、默认配置项、interceptor 和 adapter 机制都设计得很优雅，几乎在能自定义的地方都给了用户自由定制的方式，非常棒。

参考：

* [axios](https://github.com/axios/axios)
* [mockjs](http://mockjs.com)
* [adapter](https://github.com/axios/axios/tree/master/lib/adapters)

（完）
