<!--
{
  "title": "打造nodejs命令行工具",
  "createdAt": "2018-03-20 00:38:31",
  "categories": ["nodejs"],
  "tags": ["js", "nodejs", "cli", "tool"]
}
-->

前端工程化当中，大家都使用过很多的 nodejs 的命令行工具，最常用的 npm ，新建项目的脚手架 [vue-cli](https://github.com/vuejs/vue-cli)、[create-react-app](https://github.com/facebook/create-react-app) 等。彩色文字、对话式的交互、loading 动画等，都让人感觉高大上。在浏览器的世界，渲染呈现不同的文字、图像，大家都比较熟悉，但是对于命令行的操作，我只停留在写 log 的阶段。如何控制文字颜色、控制光标位置、清除之前的输出？当然有一些现成的库可以做到，我还是想去探究下原理。研究一下发现，这些都跟一个叫 [ANSI转义序列, ANSI escape code](https://zh.wikipedia.org/wiki/ANSI%E8%BD%AC%E4%B9%89%E5%BA%8F%E5%88%97) 的标准有关。

<!-- more -->

# ANSI转义序列

在开始之前，还是要先介绍一下 [ANSI转义序列, ANSI escape code](https://zh.wikipedia.org/wiki/ANSI%E8%BD%AC%E4%B9%89%E5%BA%8F%E5%88%97) ，以下摘自维基百科。

> `ANSI转义序列` 是一种带内信号的转义序列标准，用于控制视频文本终端上的光标位置、颜色和其他选项。大多数ANSI转义序列是嵌入文本中以ESC转义字符和"["字符开始的字节序列。终端会把这些字节序列解释为相应的指令，而不是普通的字符编码。

维基百科说的比较明白，ANSI转义序列是一个命令行转义控制符的标准，第一个字节是 `ASCII` 字符 `ESC` （码点是27，十六进制 0x1B），第二个字节则是 `0x40` - `0x5F` （ASCII @A–Z[\]^_）范围内的字符。往命令行输出这样的序列，就是在发送特定的命令，命令的含义由第二个字节控制，我下面就列几个命令：

| 序列 | 名称 |
|:---:|:---:|
| ESC X | SOS - 字符串开始 |
| ESC \ | ST - 字符串终止 |
| ESC [ | CSI - 控制序列导入器 |

其中 `ESC` 在 js 中用 unicode 来表示的话，就是 `\u001B` 。

而我今天主要讲的是 `CSI` 命令，即 `\u001B[`， 我也列几个：

| 序列 | 作用 |
|:---:|:---:|
| CSI `n` A | 光标上移 `n` 格 |
| CSI `n` C | 光标前移 `n` 格 |
| CSI `n`; `m` H | 光标移动到第 `n` 行，第 `m` 列 |
| CSI `n` K | 擦除第 `n` 行 |
| CSI `n` m | SGR – 选择图形再现 |

这下就更清楚了，就拿光标上移来说吧，以下代码光标上移 1 格：

```javascript
console.log('\u001B[1A')
```

这些是光标的操作，这里 `SGR` 命令又得展开讲一下，涉及到后面的文字颜色等问题，其中的 `n` 可以有很多个选项，我列几个：

| n | 作用 |
|:---:|:---:|
| 0 | 重置 |
| 3 | 斜体 |
| 4 | 下划线 |
| 9 | 划除 |
| 30-37 | 设置文字前景色 |
| 39 | 默认文字前景色 |
| 40-47 | 设置文字背景颜色 |
| 49 | 默认文字背景颜色 |

比如说下面的代码就是输出带下划线的字符 `1`，然后重置，以免接下来的输出都带下划线：

```javascript
console.log('\u001B[4m' + '1' + '\u001B[0m')
```

多个参数可以用 `;` 隔开，比如同时设置下划线、斜体和删除线（可能看不到这么多效果，因为有兼容性问题，是不是很熟悉的问题 :) ），然后重置：

```javascript
console.log('\u001B[3;4;9m' + '1' + '\u001B[0m')
```

这是基础知识，接下一个个详细探讨，灵活运用。

# 颜色

## 3位/4位

最开始时是3位颜色，也就是8种，后面扩到4位，共16种。颜色的代码比较少，可以直接查表，比如下面是输出红色背景、绿色文字的 Hello World，然后重置为默认的前景背景色：

```javascript
console.log('\u001B[41;32m' + 'Hello World' + '\u001B[49;39m')
```

> 设置了特定效果之后，立刻重置是个好习惯，整屏大红大绿还是比较辣眼睛的 :)

## 8位

后来流行 256 色，也就是 8 位。因为是扩展的，语法特别点：`38;5;$color` 、 `48;5;$color` ， 其中 38 与 48 分别是设置前景色与背景色，`$color` 为 0-255 区间的颜色， 具体颜色值意义可以查表。示例：

```javascript
// 设置前景色为：200
console.log('\u001B[38;5;200m' + 'Hello World' + '\u001B[39m')
// 设置背景色为：200
console.log('\u001B[48;5;200m' + 'Hello World' + '\u001B[49m')
```

## 24位

接下来就是 24 位真彩色了，语法跟 8 位的有点相似：`38;2;$r;$g;$b` 、 `48;2;$r;$g;$b` ，其中 `$r`、`$g`、`$b` 分别是0-255 区间红绿蓝颜色值，38、48 分别是设置前景色与背景色。示例：

```javascript
// 设置前景色为：rgb(20, 80, 140)
console.log('\u001B[38;2;20;80;140m' + 'Hello World' + '\u001B[39m')
// 设置背景色为：rgb(20, 80, 140)
console.log('\u001B[48;2;20;80;140m' + 'Hello World' + '\u001B[49m')
```

## 封装库

对于命令行设置文字颜色的封装库，推荐 [chalk](https://github.com/chalk/chalk) ，以上的颜色设置可能在各个操作系统的不同版本上支持程度不同，chalk 会为你转换为兼容的最接近的颜色，其它特性各位看官可以去翻翻 wiki 或源代码。

# 光标操作

光标的操作其实与设置颜色差不多，也属于 CSI 系列，以下列几个例子：

```javascript
// 隐藏光标
console.log('\u001B[?25l');
// 恢复光标
console.log('\u001B[?25h');
// 上移 n 格
console.log(`\u001B[${n}A`);
// 擦除 n 行
console.log(`\u001B[${n}K`);
// 向上滚动 n 行
console.log(`\u001B[${n}S`);
```

详细的使用可以去维基百科查表，我粗略看了一遍，可以实现隐藏/显示光标、上下左右移动光标、清除行/屏幕内容、获取/存储/复位光标、上下滚动等功能。

如果你想要现成的封装库的话，可以看看 [ansi-escapes](https://github.com/sindresorhus/ansi-escapes) 。nodejs 的 [readline](https://nodejs.org/dist/latest-v8.x/docs/api/readline.html) 模块也有相关的封装。

# 动画

命令行下动画的实现，其实和你熟悉的差不多，通过频繁地擦除与输出变化的内容，给你的眼睛营造动画的感觉。找一些特别形状的字符，快速地切换，形成有规律的图像变化，再配合颜色的设定，目的即达成。

下面演示一个简单的动画：

```javascript
// 当前帧
var now = 0;
// 动画帧
var frames = ["⠋", "⠙", "⠴", "⠦"];
// 频率
var interval = 80;
// 先隐藏光标，不然不太好看
process.stdout.write('\u001B[?25l');
// 设置定时器
setInterval(function () {
  // 擦除行内容
  process.stdout.write('\u001B[1K');
  // 回到起始位置，不然输出不在同一个点上
  process.stdout.write('\u001B[1G');
  // 输出帧
  process.stdout.write(frames[now]);
  // 更新
  if (++now >= frames.length) now = 0;
}, interval);

// ctrl + c
process.on('SIGINT', function () {
  // 擦除行内容
  process.stdout.write('\u001B[1K');
  // 最后恢复光标
  process.stdout.write('\u001B[?25h');
  // 结束进程
  process.exit(0);
});
```

> 这里不用 `console.log` 的原因是它会自动加上换行符 `\n`，标准输出是个 [可写流](https://nodejs.org/dist/latest-v8.x/docs/api/stream.html#stream_writable_streams)，自己动手调用 `write` 方法写数据即可。

结束脚本的时候请按下 <kbd>ctrl</kbd> + <kbd>c</kbd> ，要是遇到了 bug （可能 [发生](https://stackoverflow.com/questions/10021373/what-is-the-windows-equivalent-of-process-onsigint-in-node-js) 在 windows 上）：结束程序后光标一直看不见，你应该会知道怎么把光标显示回来的 :) 。

封装库可以试一下 [ora](https://github.com/sindresorhus/ora) 。

# 交互式命令行

作为命令行工具，与用户交互是很必要的功能，比如让用户输入信息/选择选项等。

了解完上面介绍的颜色、动画、光标操作后，渲染内容方面其实已经差不多，与用户交互还需要获取用户输入。熟悉 nodejs 的同学，应该很快就意识到，命令行输入即标准输入 `process.stdin` ，是一个 [可读流](https://nodejs.org/dist/latest-v8.x/docs/api/stream.html#stream_readable_streams) 。监听标准输入的 `data` 事件即可。

```javascript
process.stdin.on('data', function (data) {
  console.log(data);
});
```

运行一下，发现输出的是 [buffer](https://nodejs.org/dist/latest-v8.x/docs/api/buffer.html) 。翻翻 [文档](https://nodejs.org/dist/latest-v8.x/docs/api/stream.html#stream_event_data) ，可读流在没有设置编码方式的时候，默认是给 buffer 的，我们设置一下编码方式为 `utf-8`。

```javascript
process.stdin.setEncoding('utf-8');
process.stdin.on('data', function (data) {
  console.log(data);
});
```

这是好像可以了，但其实还有个问题，这样只有在用户敲了回车之后才能响应。而我们要与用户交互的话，很多时候是想在用户按下任意键时就开始响应，比如这种场景是：我们在屏幕上输出好几个选项，在用户用方向键切换选项后，我们给用户选中的选项变色，让用户知道现在选中了哪个选项。

怎么办呢？方法肯定有的，查看 [文档](https://nodejs.org/dist/latest-v8.x/docs/api/tty.html)。

> 当 Node.js 检测到正运行在一个文本终端（TTY）的上下文中时，则 process.stdin 默认会被初始化为一个 tty.ReadStream 实例，且 process.stdout 和 process.stderr 默认会被初始化为一个 tty.WriteStream 实例。

`process.stdin` 作为 `tty.ReadStream` 的实例，继承了 `setRawMode` 方法。调用此方法可以打开或关闭命令行的原始模式，在原始模式下，输入的每个字符均触发 `data` 事件。

下面的示例检测用户是否按下 <kbd>↑</kbd> 按键：

```javascript
process.stdin.setEncoding('utf-8');
process.stdin.setRawMode(true);
process.stdin.on('data', function (data) {
  // up arrow
  if (data === '\u001B[A') {
    console.log('up arrow pressed!');
  }
  // ctrl c
  if (data === '\u0003') {
    console.log('bye!');
    process.exit(0);
  }
});
```

这样判断按键有点原始，比较晦涩，可以借助 readline 模块的 [emitKeypressEvents](https://nodejs.org/dist/latest-v8.x/docs/api/readline.html#readline_readline_emitkeypressevents_stream_interface) 方法，让标准输入流产生 `keypress` 事件：

```javascript
const readline = require('readline');
process.stdin.setRawMode(true);
process.stdin.setEncoding('utf-8');
readline.emitKeypressEvents(process.stdin);
process.stdin.on('keypress', function (key, data) {
  console.log(key, data);
  if (data.name === 'c' && data.ctrl) {
    process.exit(0);
  }
});
```

封装库可以看看 [Inquirer.js](https://github.com/SBoudrias/Inquirer.js) ，其实 nodejs 的 readline 模块也有相关函数。

# 命令行参数

nodejs 的命令行参数放在 `process.argv` 数组里，第一个是 node 的路径，第二个是脚本文件的路径，第三个开始是自定义参数。这个比较容易理解，比如你这样运行你的脚本 `node app.js --config=config.json` ，在 `app.js` 里，`process.argv[2]` 就是 `--config=config.json` ，然后你自己处理一下，就知道设置了什么参数。

使用 [commander.js](https://github.com/tj/commander.js/) 、[yargs](https://github.com/yargs/yargs) 等封装库可以玩得更溜。

# 总结

开始介绍了一下ANSI转义序列；然后顺势讲了设置命令行文字颜色、光标位置、动画以及监听键盘事件的实现；最后提及了命令行参数的知识。主要介绍一下原理性的东西，虽然有提到第三方库，但是并没有介绍怎么用，大家可以自行查看文档（或参考 [此文章](http://www.ruanyifeng.com/blog/2015/05/command-line-with-node.html) ）。希望对酷炫的命令行充满好奇的同学有点帮助。

参考：

- [ANSI转义序列](https://zh.wikipedia.org/wiki/ANSI%E8%BD%AC%E4%B9%89%E5%BA%8F%E5%88%97)
- [stream](https://nodejs.org/dist/latest-v8.x/docs/api/stream.html)、[process](https://nodejs.org/dist/latest-v8.x/docs/api/process.html)、[readline](https://nodejs.org/dist/latest-v8.x/docs/api/readline.html)、[tty](https://nodejs.org/dist/latest-v8.x/docs/api/tty.html)

（完）
