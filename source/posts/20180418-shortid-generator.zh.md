<!--
{
  "title": "short ID gen",
  "createdAt": "2018-04-18 11:20:37",
  "categories": ["算法"]
}
-->

1111

<!-- more -->

我们的需求主要有四个：唯一、不可预测、短、url 友好，以下我们逐个分析一下。

# URL 友好

因为要生成短链，生成的 id 要放在 url 里使用，所以 url 友好是必须的。url 友好意味着生成的 id 里没有需要转义的字符，根据 [规范](https://zh.wikipedia.org/wiki/%E7%99%BE%E5%88%86%E5%8F%B7%E7%BC%96%E7%A0%81)，只有以下 66 个字符：

```
ABCDEFGHIJKLMNOPQRSTUVWXYZ
abcdefghijklmnopqrstuvwxyz
0123456789
-_.~
```

# 尽量短

如果我们只用 0 ~ 9 的数字，每位有 10 种可能，六位最多能表示 `10^6` = `1000000` 种可能。这样就很浪费了不是吗？我们有 66 个字符可以用，全用上去的话，每位有 66 种可能，六位最多能表示 `66^6` = `82653950016` 种可能。

所以要生成的 id 尽可能短的话，使用的字符要足够多，像 [UUID](https://zh.wikipedia.org/wiki/%E9%80%9A%E7%94%A8%E5%94%AF%E4%B8%80%E8%AF%86%E5%88%AB%E7%A0%81) 使用 32 个 16 进制的字符表示的方式，在长度上其实就没什么性价比了，因为你用大约 21 个 64 进制的字符就能实现。确实也有一个库 [Nano ID](https://github.com/ai/nanoid) 在做这件事，不过 UUID 还是有许多可取之处的，比如完全随机的 v4 版本，做到了真正的不可预测，这个等下会讲。

# 唯一

唯一性的保证，有个简单的解决方案，就是递增，但是这样会让 id 变得可预测。时间戳方案也是延续递增的思想，不过会存在时间戳的碰撞问题，即某个时间戳需要生成多个 id 时，单纯的时间戳就不可靠了。还有就是 [哈希函数](https://zh.wikipedia.org/wiki/%E6%95%A3%E5%88%97%E5%87%BD%E6%95%B8) 的方案了，哈希函数依然会有碰撞的问题。对于碰撞，一般会加上序号或者随机数来保证唯一。

# 不可预测

可预测在很多时候可能没什么问题，但是当 id 的值暴露了你的用户或订单数量，或者被不怀好意的人猜到了别人的 id 进而实施攻击，那就是个大问题了。

怎么保证不可预测呢？那就要添加随机数。常用的 `Math.random()` 随机数函数由于不是为密码安全而设计的，虽然快速，但是会存在 [安全问题](https://stackoverflow.com/questions/5651789/is-math-random-cryptographically-secure)。我们需要考虑使用浏览器上的 [Web Crypto API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Crypto_API) 或 nodejs 里的 [crypto 模块](https://nodejs.org/dist/latest-v8.x/docs/api/crypto.html) 来生成随机数。

# [shortid 库](https://github.com/dylang/shortid)

接下来我们来看一下它是怎么做的。

short id 可以分为三个模块，alphabet 管理字符集，负责打散它和找出某个位置对应的字符，可以重设字符集；encode 模块负责产生随机数，对指定的数进行随机处理，使得不可预测；build 模块负责管理算法的版本号、集群 ID （cluster）、时间戳以及时间戳重复时的序号。

版本号、集群 ID、时间戳、序号四个元素组合，可以保持唯一性；经过随机处理之后，可以保持不可预测性；然后去 64 位的字符集中查找相应的字符，字符集足够大并且对 url 友好。

核心代码如下：

```javascript
function build () {
  var str = '';

  str = str + encode(alphabet.lookup, version);
  str = str + encode(alphabet.lookup, clusterWorkerId);
  if (counter > 0) {
      str = str + encode(alphabet.lookup, counter);
  }
  str = str + encode(alphabet.lookup, seconds);

  return str;
}
```

其中有些亮点需要说明一下：

* 算法版本号确保以后的扩展性，这个在 UUID 中也有体现
* 集群 ID 作为一个 feature 以支持分布式的 id 生成器
* 时间戳一般是 UTC 时间的 1970 年到现在的（毫）秒数，但是这样会很长，shortid（2.2.8 版本）里面是以 2016 年的某个时间（过去的时间）到现在的（毫）秒数作为时间戳，这样可以产生短小的时间戳，你也可以把时间戳当做跨平台的递增 id。当然这样只是曲线救国，随着时间的流逝，时间戳还是会越来越长。这时候版本号就派上用场了，你可以隔几年就同时更新一下时间戳基数和版本号
* 短时间内生成大量 id ，则会造成时间戳重复，这时候就需要加上序号
* 随机数生成尽量用浏览器上的 [Web Crypto API](https://developer.mozilla.org/zh-CN/docs/Web/API/Web_Crypto_API) 或 nodejs 里的 [crypto 模块](https://nodejs.org/dist/latest-v8.x/docs/api/crypto.html) 。

shortid 在不可预测上做了许多努力。

首先，字符集会被打散。

然后，按理说，`version + clusterWorkerId + counter + seconds` 会产生一个确定的数，这样便可以预测，于是有了随机处理的环节。核心代码如下：

```javascript
function encode(lookup, number) {
    var loopCounter = 0;
    var done;

    var str = '';

    while (!done) {
        str = str + lookup( ( (number >> (4 * loopCounter)) & 0x0f ) | randomByte() );
        done = number < (Math.pow(16, loopCounter + 1 ) );
        loopCounter++;
    }

    return str;
}
```

源代码的意思：short id 在生成的最终 id 里，每个字符其实只代表 `1 ~ 16` 共 16 种，然后用随机数生成器随机生成 `1 ~ 4` 的数，相乘，最后去 64 个字符组成的字符集里选字符。所以虽然每位是确定的数字，但是有 4 个字符可以随机选。我们以以下信息为例进行说明。

```javascript
// 版本号
version = 1;
// 集群 id
clusterWorkerId = 2;
// 时间戳序号
counter = 3;
// 时间戳
seconds = 100;
// 打散的字符集
shuffledAlphabet = 'XF4SKlgAJ71EvPwyma9cipB5sCYe_Uux-RoqdIj0DMTtnfQ68VOWbrZHGz23kLNh';
```

比如版本号是 1 ，那它可以随机选 `0, 16, 32, 48` 位置的字符：`X, m, -, 8`；集群 id 是 2，那它可以随机选 `1, 17, 33, 49` 位置的字符：`F, a, R, V`。

你可以运行以下代码，因为 `version + clusterWorkerId + counter + seconds` 里面 `version, clusterWorkerId, seconds` 三个是不变的，所以输出的字符里，除了代表 `counter` 的，都是在固定的 4 个字符里面随机选：

```javascript
// npm i shortid
const shortid = require('shortid');
let count = 100;
while (count--) {
  console.log(shortid.generate());
}
/*
r1Dvp0H3M
rylDvaRShG
rkWwP6CBhG
S1MvwTAH2M
B1QwvaRBnz
H14PDaRS2M
SyrDPpCrnf
B18PPTAHnf
HkwDDa0Bhz
rJdvPTCShz
HJFvPTRB2z
BkqvvTRBnz
HJsvwpCr3G
By3vP60B3f
BkTvwpCr3G
BJ0ww6RShG
HJJxwP60rhf
rklgDvp0S2M
Hk-lwD6RHhM
r1zxwwaCrhf
SJ7gPvpRr2z
ByElvPT0HhG
r1rlvP6RSnf
rJIgPva0r2G
HkDlvva0Bhz
r1_gDv60rhG
HktgPwaRBnz
SyqewvT0HnG
H1jevwaCB3G
HkneDP6CHhG
B1agvwT0SnG
...
*/
```

总结一下这个库的弊端：

数据量足够大的话，是可以分析出 `0 ~ 15` 分别有哪几个字符可以选，但是这样还是有 `4^id长度` 种可能，也算一定程度的不可预测。另外从生成的 id 反推其原始信息也很可能实现。而且当你打散或重设字符集之后，有可能会重复，只是概率非常非常低。

由于随机性处理，生成的 id 其实只有 `16^id长度` 种可能，而不是 `64^id长度` 种。但是可以保证唯一。

另外，shortid 不能保证生成 id 的长度，而且长度是随着时间的增长和并发量的增大而增大的。如果你要把生成的 id 写入数据库，可能要考虑这个问题。

# 总结

简单介绍了一下短 id 的生成要考虑的问题，以及 shortid 库的原理、亮点及弊端。

参考：

* [shortid](https://github.com/dylang/shortid)
* [nanoid](https://github.com/ai/nanoid)
* [uuid](https://zh.wikipedia.org/zh-hans/通用唯一识别码)

（完）
