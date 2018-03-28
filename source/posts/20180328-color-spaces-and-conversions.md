<!--
{
  "id": "B1xXLs_qG",
  "title": "各种颜色类型及其间的转换",
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

作为前端，写 css 时经常遇到颜色的设置。常见颜色格式有 [CSS 命名颜色](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value#Color_keywords)、rgb、hex、hsl，不常用的 hwb、cmyk等，还有一些不能在 css 里用的，比如 lab、xyz。这篇文章简单介绍一下各种颜色类型，以及他们之间的转换。

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
| lch | `lch(81, 106, 137)` | 否 |

> 这里没有提及透明度，透明度应该是独立于颜色的，下面在介绍涉及 CSS 的颜色类型时会简单提一下透明度的设置。

# rgb

## 简介

RGB 即红绿蓝，也被称为三原色。RGB 颜色模型是一种 [加色模型](https://zh.wikipedia.org/wiki/%E5%8A%A0%E8%89%B2%E6%B3%95)，将红绿蓝三种色按不同的比例相加，可以产生不同的色彩。显示器就是用此原理显示绚丽的图案。

![红绿蓝](https://baffinlee.duapp.com/20180328-rgb.png)

## 在 CSS 中使用

红绿蓝的比例，有多种表示方式。在 CSS 里面，可以为 0% ~ 100% d的百分比或者 0 ~ 255 的数字或者 16 进制，比如：

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

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sum = max + min;
  const delta = max - min;

  r = r / 255;
  g = g / 255;
  b = b / 255;

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

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  r = r / 255;
  g = g / 255;
  b = b / 255;

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

# hex

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

# hsl

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
hsla(120, 50%, 50%, 0.3);
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
    r = hue2rgb(t1, t2, hue + 1/3);
    g = hue2rgb(t1, t2, hue);
    b = hue2rgb(t1, t2, hue - 1/3);
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

# hsv

## 简介

HSV 即色相（hue），饱和度（saturation），以及亮度（brightness），也叫 HSB。

待续...
