<!--
{
  "id": "B1xXLs_qG",
  "title": "各种颜色类型及之间的转换",
  "slug": "color-spaces-and-conversions",
  "comments": true,
  "createdAt": "2018-03-28 13:20:24",
  "publishedAt": "2018-03-28 13:20:24",
  "updatedAt": "2018-03-28 13:20:24",
  "categories": ["设计"],
  "tags": ["颜色"],
  "series": ""
}
-->

作为前端，写 css 时经常遇到颜色的设置。常见颜色格式有 [CSS 命名颜色](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#Color_keywords)、rgb、hex、hsl，不常用的 hwb、cmyk等，还有一些不能在 css 里用的，比如 lab、xyz。这篇文章简单介绍一下各种颜色类型，以及它们之间的转换。

<!-- more -->

# 总览

先看看下文会提及的颜色类型的简单对比：

| 名称 | 示例 | 能否用于 CSS |
|:---:|:---:|:---:|
| rgb | `rgb(11, 22, 33)` | 是 |
| hex | `#rgb` / `#rrggbb` | 是 |
| hsl | `hsl(210, 100%, 60%)` | 是 |
| CSS 命名颜色 | `white` | 是 |
| hwb | `hwb(54, 57%, 5%)` | [CSS 4 提案](https://www.w3.org/TR/css-color-4) |
| cmyk | `cmyk(16, 25, 0, 8)` | [CSS 4 提案](https://www.w3.org/TR/css-color-4) |
| hsv | `hsv(114, 40%, 90%)` | 否 |
| xyz | `xyz(20, 59, 42)` | 否 |
| lab | `lab(81, -78, 72)` | 否 |

> 这里没有提及透明度，透明度应该是独立于颜色的，下面在介绍涉及 CSS 的颜色类型时会一并提及透明度的设置。

# RGB

## 简介

RGB 即红绿蓝，也被称为三原色。RGB 颜色模型是一种 [加色模型](https://zh.wikipedia.org/wiki/%E5%8A%A0%E8%89%B2%E6%B3%95)，将红绿蓝三种色按不同的比例相加，可以产生不同的色彩。显示器就是用此原理显示绚丽的图案。

![红绿蓝](https://baffinlee.duapp.com/20180328-rgb.png)

## 在 CSS 中使用

红绿蓝的比例，有多种表示方式。在 CSS 里面，可以为 0% ~ 100% 的百分比或者 0 ~ 255 的数字或者 16 进制，比如：

```css
color: rgb(25, 25, 25);
color: rgb(10%, 10%, 10%);
```

CSS 还支持同时设置透明度，值为 0 ~ 1 的小数：

```css
color: rgba(25, 25, 25， 0.3);
color: rgba(10%, 10%, 10%, 0.3);
```

RGB 颜色模式好处在于容易理解、对计算机友好，但是颜色值对人类来说并不直观。

## 转换

rgb => hex：

```javascript
function rgb2hex (r, g, b) {
  const addZero = str => (str.length < 2 ? `0${str}` : str);
  const red = addZero(Number(r).toString(16));
  const green = addZero(Number(g).toString(16));
  const blue = addZero(Number(b).toString(16));
  return `#${red}${green}${blue}`;
} 
```

rgb => hsl，[参考](https://zh.wikipedia.org/wiki/HSL%E5%92%8CHSV%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4#%E4%BB%8EHSL%E5%88%B0RGB%E7%9A%84%E8%BD%AC%E6%8D%A2)：

```javascript
function rgb2hsl (r, g, b) {
  let h = 0;
  let s = 0;
  let l = 0;

  r = r / 255;
  g = g / 255;
  b = b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sum = max + min;
  const delta = max - min;

  if (max === min) h = 0;
  else if (max === r && g >= b) h = 60 * ((g - b) / delta);
  else if (max === r && g < b) h = 60 * ((g - b) / delta) + 360;
  else if (max === g) h = 60 * ((b - r) / delta) + 120;
  else if (max === b) h = 60 * ((r - g) / delta) + 240;

  l = sum / 2;

  if (l === 0 || max === min) s = 0;
  else if (0 < l && l <= 0.5) s = delta / sum;
  else if (l > 0.5) s = delta / (2 - sum);

  return {
    h,
    s: s * 100,
    l: l * 100
  };
}
```

rgb => hsv，[参考](https://zh.wikipedia.org/wiki/HSL%E5%92%8CHSV%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4#%E4%BB%8EHSL%E5%88%B0RGB%E7%9A%84%E8%BD%AC%E6%8D%A2)：

```javascript
function rgb2hsv (r, g, b) {
  let h = 0;
  let s = 0;
  let v = 0;

  r = r / 255;
  g = g / 255;
  b = b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  if (max === min) h = 0;
  else if (max === r && g >= b) h = 60 * ((g - b) / delta);
  else if (max === r && g < b) h = 60 * ((g - b) / delta) + 360;
  else if (max === g) h = 60 * ((b - r) / delta) + 120;
  else if (max === b) h = 60 * ((r - g) / delta) + 240;

  if (max === 0) s = 0;
  else s = delta / max;

  v = max;

  return {
    h,
    s: s * 100,
    v: v * 100
  };
}
```

rgb => cmyk，[参考](https://zh.wikipedia.org/wiki/%E5%8D%B0%E5%88%B7%E5%9B%9B%E5%88%86%E8%89%B2%E6%A8%A1%E5%BC%8F#%E4%BB%8E%E4%B8%89%E5%8E%9F%E5%85%89%E5%90%91%E5%9B%9B%E5%88%86%E8%89%B2%E8%BD%AC%E6%8D%A2)： 

```javascript
function rgb2cmyk (r, g, b) {
  let c = 0;
  let m = 0;
  let y = 0;
  let k = 0;

  r /= 255;
  g /= 255;
  b /= 255;

  c = 1 - r;
  m = 1 - g;
  y = 1 - b;
  k = Math.min(c, m, y);

  if (k === 1) {
    c = 0;
    m = 0;
    y = 0;
    k = 1;
  } else {
    c = (c - k) / (1 - k);
    m = (m - k) / (1 - k);
    y = (y - k) / (1 - k);
  }

  return {
    c: c * 100,
    m: m * 100,
    y: y * 100,
    k: k * 100
  };
}
```

rgb => xyz，[参考](https://en.wikipedia.org/wiki/SRGB#The_reverse_transformation)：

```javascript
function rgb2xyz (r, g, b) {
  let x = 0;
  let y = 0;
  let z = 0;

  r /= 255;
  g /= 255;
  b /= 255;

  // 假定是 sRGB 色彩空间
  r = r <= 0.04045 ? (r / 12.92) : Math.pow((r + 0.055) / 1.055, 2.4);
  g = g <= 0.04045 ? (g / 12.92) : Math.pow((g + 0.055) / 1.055, 2.4);
  b = b <= 0.04045 ? (b / 12.92) : Math.pow((b + 0.055) / 1.055, 2.4);

  x = (r * 0.4124) + (g * 0.3576) + (b * 0.1805);
  y = (r * 0.2126) + (g * 0.7152) + (b * 0.0722);
  z = (r * 0.0193) + (g * 0.1192) + (b * 0.9505);

  return {
    x: x * 100,
    y: y * 100,
    z: z * 100
  };
}
```

# HEX

## 简介

RGB 颜色模型可以表示为 16 进制，可以分别用单个数字或两个数字表示，CSS 中需要在前面加上 `#` 号：

```css
color: #3ea;
color: #33eeaa;
```

需要透明度时，值为 0 ~ 255 的数，用 16 进制表示，跟在最后：

```css
color: #3ea9;
color: #33eeaa99;
```

## 转换

hex => rgb：

```javascript
function hex2rgb (hex) {
  const res = /^#?([a-f0-9]{6}|[a-f0-9]{3})$/i.exec(hex);
  let str = '';

  if (!res) return [0, 0, 0];

  str = res[1];

  if (str.length === 3) {
    str = str.split('').map(char => (char + char)).join('');
  }

  return {
    r: parseInt(str.substr(0, 2), 16),
    g: parseInt(str.substr(2, 2), 16),
    b: parseInt(str.substr(4, 2), 16)
  };
}
```

# HSL

## 简介

HSL 即色相（hue），饱和度（saturation），以及亮度（lightness）。

![hsl](https://baffinlee.duapp.com/20180328-hsl-1.png)

色相，代表人眼所能感知的颜色范围。将这些颜色分布在圆上，用圆心角来选择颜色，比如：60° 是黄色，120° 是绿色。有些 hsl 取色器中不是用圆来表示色相，而是直线，也代表 0° ~ 360°。

饱和度，即颜色的纯度，用百分比表示。往颜色里混入灰色，100% 代表颜色纯净，没加灰色；0% 代表全是灰色。

亮度（明度），指颜色明亮程度，用百分比表示。50% 时无添加，50% => 0%，加入的黑色逐渐增加，变暗；50% => 100%，加入的白色逐渐增加，变亮。

下图是 windows 画图程序的取色器，色盘里左右代表色相，上下代表饱和度，最右边的滑条上下表示亮度。

![hsl 取色器](https://baffinlee.duapp.com/20180328-hsl.png)


## 在 css 中使用

```css
hsl(120, 50%, 50%);
hsla(120, 50%, 50%, 0.3); /* 透明度 0.3 */
```

## 转换

hsl => rgb，[参考](https://zh.wikipedia.org/wiki/HSL%E5%92%8CHSV%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4#%E4%BB%8EHSL%E5%88%B0RGB%E7%9A%84%E8%BD%AC%E6%8D%A2)：

```javascript
function hsl2rgb (h, s, l) {
  let r = 0;
  let g = 0;
  let b = 0;
  let t1 = 0;
  let t2 = 0;

  const hue2rgb = (t1, t2, hue) => {
    if (hue < 0) hue += 1;
    if (hue >= 1) hue -= 1;
    if (hue < 1/6) return (t2 - t1) * (hue * 6) + t1;
    else if (hue < 1/2) return t2;
    else if (hue < 2/3) return (t2 - t1) * (4 - (hue * 6)) + t1;
    else return t1;
  };

  h = h / 360;
  s = s / 100;
  l = l / 100;

  if (s === 0) {
    r = g = b = l;
  } else {
    t2 = (l <= 0.5) ? (l * (s + 1)) : (l + s - (l * s));
    t1 = (l * 2) - t2;
    r = hue2rgb(t1, t2, h + 1/3);
    g = hue2rgb(t1, t2, h);
    b = hue2rgb(t1, t2, h - 1/3);
  }

  return {
    r: r * 255,
    g: g * 255,
    b: b * 255
  };
}
```

hsl => hsv，[参考](https://zh.wikipedia.org/wiki/HSL%E5%92%8CHSV%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4#%E4%BB%8EHSL%E5%88%B0RGB%E7%9A%84%E8%BD%AC%E6%8D%A2)：

```javascript
function hsl2hsv (h, s, l) {
  let max = 0;
  let min = 0;
  let v = 0;

  s = s / 100;
  l = l / 100;

  if (l === 0) {
    max = min = 0;
  } else if (s === 0) {
    max = min = l;
  } else if (l > 0.5) {
    max = ((2 * l) + (s * (2 - (2 * l)))) / 2;
    min = ((2 * l) - (s * (2 - (2 * l)))) / 2;
  } else if (0 < l && l <= 0.5) {
    max = ((2 * l) + (s * 2 * l)) / 2;
    min = ((2 * l) - (s * 2 * l)) / 2;
  }

  if (max === 0) s = 0;
  else s = (max - min) / max;

  v = max;

  return {
    h,
    s: s * 100,
    v: v * 100
  };
}
```

# HSV

## 简介

HSV 即色相（hue），饱和度（saturation），以及明度（brightness），也叫 HSB。

![hsv](https://baffinlee.duapp.com/20180328-hsv.png)

色相的意义与 HSL 的一致。

饱和度代表颜色中混入黑色的量，用百分比表示，0% 代表全是黑色；100% 代表是纯色，无黑色。

明度（亮度）代表颜色中混入白色的量，0% 代表全是白色；100% 代表是纯色，无白色。

下图是 PhotoShop 中的 HSV 取色器，色盘左右方向是明度变化，上下方向是饱和度变化，右边滑块上下是色相变化。

![hsv 取色器](https://baffinlee.duapp.com/20180328-hsv-1.png)

## 转换

hsv => rgb，[参考](https://zh.wikipedia.org/wiki/HSL%E5%92%8CHSV%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4#%E4%BB%8EHSV%E5%88%B0RGB%E7%9A%84%E8%BD%AC%E6%8D%A2)：

```javascript
function hsv2rgb (h, s, v) {
  let p = 0;
  let q = 0;
  let t = 0;
  let h1 = 0;
  let f = 0;
  let rgb = [];

  s = s / 100;
  v = v / 100;

  h1 = Math.floor(h / 60);
  f = h / 60 - h1;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);

  if (h1 === 0) rgb = [v, t, p];
  else if (h1 === 1) rgb = [q, v, p];
  else if (h1 === 2) rgb = [p, v, t];
  else if (h1 === 3) rgb = [p, q, v];
  else if (h1 === 4) rgb = [t, p, v];
  else if (h1 === 5) rgb = [v, p, q];

  return {
    r: rgb[0] * 255,
    g: rgb[1] * 255,
    b: rgb[2] * 255
  };
}
```

hsv => hsl，[参考](https://zh.wikipedia.org/wiki/HSL%E5%92%8CHSV%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4#%E4%BB%8EHSL%E5%88%B0RGB%E7%9A%84%E8%BD%AC%E6%8D%A2)：

```javascript
function hsv2hsl (h, s, v) {
  let max = 0;
  let min = 0;
  let l = 0;

  s /= 100;
  v /= 100;

  max = v;
  min = (1 - s) * v;

  l = (max + min) / 2;

  if (l === 0 || max === min) s = 0;
  else if (0 < l && l <= 0.5) s = (max - min) / (2 * l);
  else if (l > 0.5) s = (max - min) / (2 - 2 * l);

  return {
    h,
    s: s * 100,
    l: l * 100
  };
}
```

hsv => hwb，[参考](https://en.wikipedia.org/wiki/HWB_color_model)：

```javascript
function hsv2hwb (h, s, v) {
  const w = ((100 - s) * v) / 100;
  const b = 100 - v;
  return {
    h,
    w,
    b
  };
}
```

# CSS 命名颜色

## 简介

CSS 规范中定义了许多有名字的颜色，比如 `white` 是白色，即 `rgb(255, 255, 255)` 或 `#ffffff`，详细列表见 [MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#colors_table)。

# HWB

## 简介

HWB 即色相（hue），白色（white），以及黑色（black）。

色相与 HSL 中的一致。

白色即颜色中添加白色的比例，用百分比表示，0% 即无白色，100% 即全白色。

黑色即颜色中添加黑色的比例，用百分比表示，0% 即无黑色，100% 即全黑色。

> 注意：如果白色与黑色之和大于 100%，将会等比缩小至和为 100%，此时只是显示灰色，色相的值被忽略。

## 在 CSS 中使用

HWB 是 [CSS 4 草案](https://www.w3.org/TR/css-color-4/) 中的推荐颜色类型，现在（2018-03-29）主流的浏览器尚未支持，如果草案通过的话，相信未来会被浏览器支持。

在 CSS 中使用 HWB 颜色的示例：

```css
color: hwb(120, 50%, 30%);
color: hwb(120, 50%, 30%, 0.4); /* 透明度 0.4 */
```

## 转换

hwb => rgb，[参考](https://www.w3.org/TR/css-color-4/#hwb-to-rgb)：

```javascript
function hwb2rgb (h, w, b) {
  const rgb = hsl2rgb(h, 100, 50);

  w = w / 100;
  b = b / 100;

  if (w + b > 1) {
    w /= (w + b);
    b /= (w + b);
  }

  for (const key in rgb) {
    rgb[key] /= 255;
    rgb[key] *= (1 - w - b);
    rgb[key] += w;
  }

  return {
    r: rgb.r * 255,
    g: rgb.g * 255,
    b: rgb.b * 255
  };
}
```

hwb => hsv，[参考](https://en.wikipedia.org/wiki/HWB_color_model)：

```javascript
function hwb2hsv (h, w, b) {
  let v = 0;
  let s = 0;

  if (w + b > 100) {
    w *= (100 / (w + b));
    b *= (100 / (w + b));
  }

  v = 100 - b;
  s = 100 - (w / v) * 100;

  return {
    h,
    s,
    v
  };
}
```

# CMYK

## 简介

CMYK 印刷四分色模式是彩色印刷时采用的一种色彩模式，原理是三原色（青色、洋红色、黄色）与黑色四种颜色叠加， 是一种 [减色模型](https://zh.wikipedia.org/wiki/%E6%B8%9B%E8%89%B2%E6%B3%95)。CMYK 模式仅有 101^4 共 1030402 种色彩，RGB 有 256^3 共 16777216 种色彩。

![](https://baffinlee.duapp.com/20180328-cmyk.png)

## 在 CSS 中使用

CMYK 是 [CSS 4 草案](https://www.w3.org/TR/css-color-4/) 中的推荐颜色类型，现在（2018-03-29）主流的浏览器尚未支持，如果草案通过的话，相信未来会被浏览器支持。

以下是在 CSS 中使用 CMYK 函数的示例：

```css
color: device-cmyk(20%, 81%, 81%, 30%);
color: device-cmyk(20%, 81%, 81%, 30%, 0.3); /* 透明度 0.3 */
```

## 转换

cmyk => rgb，[参考](https://zh.wikipedia.org/wiki/%E5%8D%B0%E5%88%B7%E5%9B%9B%E5%88%86%E8%89%B2%E6%A8%A1%E5%BC%8F#%E4%BB%8E%E5%9B%9B%E5%88%86%E8%89%B2%E5%90%91%E4%B8%89%E5%8E%9F%E5%85%89%E8%BD%AC%E6%8D%A2)： 

```javascript
function cmyk2rgb (c, m, y, k) {
  let r = 0;
  let g = 0;
  let b = 0;

  c /= 100;
  m /= 100;
  y /= 100;
  k /= 100;

  r = 1 - (c * (1 - k) + k);
  g = 1 - (m * (1 - k) + k);
  b = 1 - (y * (1 - k) + k);

  return {
    r: r * 255,
    g: g * 255,
    b: b * 255
  };
}
```

# LAB

## 简介

LAB 是 CIE L\*a\*b\*（CIELAB）的简称，由 [国际照明委员会](https://zh.wikipedia.org/wiki/%E5%9B%BD%E9%99%85%E7%85%A7%E6%98%8E%E5%A7%94%E5%91%98%E4%BC%9A) 以描述人眼所见的所有颜色为目的，基于 XYZ 色彩空间创建的。Lab颜色被设计来接近人类视觉，它致力于感知均匀性。

其中：

L 代表光的强度，0 最暗，为黑色；100 最亮，为白色。

A 代表红色和蓝色之间的位置，负值指绿色；正值指红色。

B 代表黄色和蓝色之间的位置，负值指蓝色；正值指黄色。

## 转换

lab => xyz，[参考](https://zh.wikipedia.org/wiki/Lab%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4#XYZ%E4%B8%8ECIE_L*a*b*(CIELAB)%E7%9A%84%E8%BD%AC%E6%8D%A2)：

```javascript
function lab2xyz (l, a, b) {
  const xn = 95.047;
  const yn = 100;
  const zn = 108.883;

  const g = 6 / 29;

  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - b / 200;

  let x = 0;
  let y = 0;
  let z = 0;

  x = fx > g ? Math.pow(fx, 3) : (fx - 16 / 116) * 3 * Math.pow(g, 2);
  y = fy > g ? Math.pow(fy, 3) : (fy - 16 / 116) * 3 * Math.pow(g, 2);
  z = fz > g ? Math.pow(fz, 3) : (fz - 16 / 116) * 3 * Math.pow(g, 2);

  x *= xn;
  y *= yn;
  z *= zn;

  return {
    x,
    y,
    z
  };
}
```

# XYZ

## 简介

CIE 1931 XYZ色彩空间是由 [国际照明委员会](https://zh.wikipedia.org/wiki/%E5%9B%BD%E9%99%85%E7%85%A7%E6%98%8E%E5%A7%94%E5%91%98%E4%BC%9A) 于 1931 年创立的。它以人类对色彩的感知表示颜色，XYZ 是三色刺激值，分别代表红色、蓝色、绿色所导出的参数。

## 转换

xyz => lab，[参考](https://zh.wikipedia.org/wiki/Lab%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4#XYZ%E4%B8%8ECIE_L*a*b*(CIELAB)%E7%9A%84%E8%BD%AC%E6%8D%A2)：

```javascript
function xyz2lab (x, y, z) {
  const xn = 95.047;
  const yn = 100;
  const zn = 108.883;

  const g = Math.pow(6 / 29, 3);
  const fn = (n) => ((1 / 3) * Math.pow(29 / 6, 2) * n + (16 / 116));

  let fx = 0;
  let fy = 0;
  let fz = 0;
  let l = 0;
  let a = 0;
  let b = 0;

  x /= xn;
  y /= yn;
  z /= zn;

  fx = x > g ? Math.pow(x, 1 / 3) : fn(x);
  fy = y > g ? Math.pow(y, 1 / 3) : fn(y);
  fz = z > g ? Math.pow(z, 1 / 3) : fn(z);

  l = (116 * fx) - 16;
  a = 500 * (fx - fy);
  b = 200 * (fy - fz);

  return {
    l,
    a,
    b
  };
}
```

xyz => rgb，[参考](https://en.wikipedia.org/wiki/SRGB#The_forward_transformation_.28CIE_XYZ_to_sRGB.29)：

```javascript
function xyz2rgb (x, y, z) {
  let r = 0;
  let g = 0;
  let b = 0;

  const fn = (n) => (1.055 * Math.pow(n, 1 / 2.4) - 0.055);

  x /= 100;
  y /= 100;
  z /= 100;

  r = (x * 3.2406) + (y * -1.5372) + (z * -0.4986);
  g = (x * -0.9689) + (y * 1.8758) + (z * 0.0415);
  b = (x * 0.0557) + (y * -0.2040) + (z * 1.0570);
  
  // 假定转到 sRGB 色彩空间
  r = r <= 0.0031308 ? 12.92 * r : fn(r);
  g = g <= 0.0031308 ? 12.92 * g : fn(g);
  b = b <= 0.0031308 ? 12.92 * b : fn(b);

  r = Math.min(Math.max(0, r), 1);
  g = Math.min(Math.max(0, g), 1);
  b = Math.min(Math.max(0, b), 1);

  return {
    r: r * 255,
    g: g * 255,
    b: b * 255
  };
}
```

# 总结

本文简单地介绍了一下各种颜色格式，以及之间的转换。需要注意的是，有些转换并没有提供，比如 rgb => lab，这时候需要先转换到中间值才能完成转换，比如 rgb => xyz => lab。转换代码中的数值一般是 0 ~ 255 或 0 ~ 100 范围的，使用时请按需修改，使之映射到你需要的范围。另外，文中代码示例基本上只是按照公式来写，并没有处理输入值的合法与否等工程问题，也没有做性能优化，实际运用到生产环境时请按需修改。

关于成熟的封装库，可以考虑 [color.js](https://github.com/Qix-/color)，文中部分代码也是参考此库的源代码。

参考：

- [color.js](https://github.com/Qix-/color)
- [CSS 4 提案](https://www.w3.org/TR/css-color-4)
- [三原色光模式](https://zh.wikipedia.org/wiki/%E4%B8%89%E5%8E%9F%E8%89%B2%E5%85%89%E6%A8%A1%E5%BC%8F)
- [HSL和HSV色彩空间](https://zh.wikipedia.org/wiki/HSL%E5%92%8CHSV%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4)
- [HWB 颜色模型](https://en.wikipedia.org/wiki/HWB_color_model)
- [印刷四分色模式](https://zh.wikipedia.org/wiki/印刷四分色模式)
- [sRGB色彩空间](https://zh.wikipedia.org/wiki/SRGB%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4)
- [CIE1931色彩空间](https://zh.wikipedia.org/wiki/CIE1931%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4)
- [Lab色彩空间](https://zh.wikipedia.org/wiki/Lab%E8%89%B2%E5%BD%A9%E7%A9%BA%E9%97%B4)

（完）
