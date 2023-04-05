<!--
{
  "title": "一次性密码",
  "createdAt": "2018-05-30 11:37:03",
  "categories": ["算法"]
}
-->

一次性密码，（One Time Password，简称 `OTP`），又称动态密码或单次有效密码。常见的二次验证程序，比如 [Google Authenticator](https://zh.wikipedia.org/wiki/Google%E8%BA%AB%E4%BB%BD%E9%AA%8C%E8%AF%81%E5%99%A8) 使用的就是 [OTP](https://zh.wikipedia.org/wiki/%E4%B8%80%E6%AC%A1%E6%80%A7%E5%AF%86%E7%A2%BC)。`OTP` 分两种，一种是基于时间的一次性密码，（Time-based One-Time Password，简称 `TOTP`；另一种是基于记次的一次性密码，（HMAC-based One-Time Password，简称 `HOTP`）。

<!-- more -->

# OTP

`OTP` 的核心在于：客户端与服务端在配对时，协商好算法、密钥和可变数，这个可变数可以是基于时间的或基于次数的，下面会说到。在算法、密钥、可变数都一致的情况下，客户端与服务端会产生一致的一次性密码。

`OTP` 的好处在于，它是可变的，不像常规密码是不变的。这个特性可以有效避免重放攻击和暴力破解，也能避免用户在不同系统使用同一密码带来的不安全性。

# TOTP

`TOTP` 的标准是 [RFC6238](https://tools.ietf.org/html/rfc6238)，主要由以下几个参数构成：

## 加密哈希算法

默认使用 `sha-1` 作为加密哈希算法，也可以为 `sha-256`、`sha-512` 等。

## T0

`T0` 为开始时间戳，默认为 [UNIX 时间戳](https://zh.wikipedia.org/wiki/UNIX%E6%97%B6%E9%97%B4) 的开始，即 1970 年 1 月 1 日 0 时 0 分 0 秒。

## TS

`TS` 为密码变化的时间间隔，默认是 `30` 秒，也可以为 `60` 秒等。

## TC

`TC` 即 `T0` 到现在的 `TS` 数量，即 `Math.floor((NOW - T0) / TS)`。

## 密钥 K

密钥对于每个用户应该是不同的。

## 密码长度

因为一次性密码是用来给用户输入的，最终生成的密码长度不宜过长，默认是 `6` 位数字，也可以是 `8` 位等。

`一次性密码 = 加密哈希算法(K, TC)`

客户端与服务端配对时，协商好这些参数，就能各自生成一次性密码了。不过这里还有两个问题：

1. 时间同步的问题。客户端与服务端可能时间不同步，或者因为网络原因导致时间不一致，当时间差值大于 `TS` 时，双方产生的一次性密码就不一致。解决方法是：服务端应该尝试 `TC = TC +- W`，以兼容时间超前或延后的问题。也就是说，假如 `TC` 是 `10`，`W` 是 `5` 时，那 `TC` 为 `5 ~ 15` 的范围内产生的密码，服务端都会接受，并且在密码验证成功后，服务端应设置一个 `offset` 偏量，以同步时间。当然这个 `W` 参数不宜过大，这样会不安全；也不宜过小，这样解决不了时间不同步的问题。

2. 暴力破解的问题。因为一次性密码为了方便用户输入，一般只取 `6` 位数字，那 `30` 秒内其实只有 `1000000` 种可能值，这很容易被暴力破解。服务端应该设置一个最大尝试次数来避免暴力破解，比如在 `30` 秒内，只让尝试 `5` 次，这样就比较安全了。

# HOTP

了解 `TOTP` 之后，`HOTP` 就比较好理解了。

`HOTP` 的标准是 [RFC4266](https://tools.ietf.org/html/rfc4266)，主要参数有：加密哈希算法、密钥 K，计数器 C。

`一次性密码 = 加密哈希算法(K, C)`

不像 `TOTP` 基于时间，时间会自动流逝，`HOTP` 基于次数是要双方共同维护的。客户端每生成一个密码，计数器加一；服务端每验证一个密码，计数器加一。

`HOTP` 同样有两个问题：

1. 计数器同步的问题。由于客户端请求生成密码后，不一定会用来认证，这样客户端的计数器很可能超前于服务端。为了解决这个问题，服务端应尝试 `C = C + W` 来兼容这个问题。比如当前服务端计数器 `C` 为 `10`，`W` 取 `5` 时，`C` 在 `10 ~ 15` 范围内生成的密码服务端都应该接受，并且验证成功后需要同步计数器。当然如果客户端生成密码的按钮被小孩子发现，按了几十上百次，那就只能一首凉凉送给你了 :)。

2. 暴力破解的问题。

# OTP 的应用

二次验证码是 `OTP` 最普遍的运用，这里要说一下二次验证的典型：谷歌身份验证器（`Google Authenticator`）。

`OTP` 客户端与服务端协商参数的交互过程是很麻烦的，如果要用户把参数一个个输入来配对，那估计没人想用了。

于是 `Google Authenticator` 定义了一个 [URI schemm](https://github.com/google/google-authenticator/wiki/Key-Uri-Format) 来解决这个问题，形如:

`otpauth://TYPE/LABEL?PARAMETERS`

其中：

`TYPE`：可以是 `totp` 或 `hotp`。

`LABEL`: 用来指明用户，可以是一个账户，比如 `user@example.com`，或者前缀加上账户，比如 `Example:user@example.com`。

`PARAMETERS`: 其它参数

```
secret：必须，base32编码的密钥。
issuer: 推荐，跟账户前缀一样，用来解决多个人用同一个账户的问题。
algorithm: 可选，哈希算法，默认是 SHA1，还可以是 SHA256 、SHA512。
digits: 可选，密码长度，默认是 6。
counter: TYPE 是 hotp 时必须指定，计数器。
period: TYPE 是 totp 时可选，时间周期，默认 30 秒。
```

`uri` 中特殊字符应该 `url encode` 一下，完整的 `uri` 形如：

`otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example`

`otpauth://hotp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example&counter=1`

光有 `URI schemm` 还不够，要让用户输入这么长的字符还是很困难的，生成一个二维码就好很多了，扫一扫就能配对。

示例二维码：

![qrcode](../images/20180530-otp-qrcode.png)

# 总结

介绍了一下 TOTP 与 HOTP，以及 Google Authenticator 的原理。没有很具体地讲算法，想了解的话可以查看相关代码实现。

参考：

* [Google Authenticator](https://zh.wikipedia.org/wiki/Google%E8%BA%AB%E4%BB%BD%E9%AA%8C%E8%AF%81%E5%99%A8)
* [OTP](https://zh.wikipedia.org/wiki/%E4%B8%80%E6%AC%A1%E6%80%A7%E5%AF%86%E7%A2%BC)
* [TOTP](https://zh.wikipedia.org/wiki/%E5%9F%BA%E4%BA%8E%E6%97%B6%E9%97%B4%E7%9A%84%E4%B8%80%E6%AC%A1%E6%80%A7%E5%AF%86%E7%A0%81%E7%AE%97%E6%B3%95)
* [HOTP](https://en.wikipedia.org/wiki/HMAC-based_One-time_Password_algorithm)

（完）


