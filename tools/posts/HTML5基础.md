---
title: HTML5基础
categories:
  - 技术
  - 基础
tags:
  - 基础
  - Web
  - HTML
abbrlink: 13914
date: 2021-04-17 00:00:00
description:
---

## HTML概述

HTML（超文本标记语言）是一种用于创建网页的标准标记语言。 HTML 不需要编译，可以直接由浏览器执行，它的解析依赖于浏览器的内核。 它不是一种编程语言，而是一种标记语言。

> 前端语言常常见到ML，这是Markup Language（标记语言）的缩写。我们所熟知的HTML就是Hyper Text Markup Language的缩写，意为“超文本标记语言”。

### HTML网页结构

```html
<!DOCTYPE html>
<html>
  <head>
    <title>HTML 简介</title>
  </head>
  <body></body>
</html>
```

- `<!DOCTYPE html>` 是文档声明头，告诉浏览器，本文档处理的是 HTML 文档。
- `html` 标签即根元素，此处表示文档的开始。
- `head` 标签是网页的头部，设置网页的相关信息。
- `title` 标签设置网页标题。
- `body` 标签定义文档的主体，也即主要内容。

### HTML注释

在 HTML 中满足以下格式的内容即为注释，被注释的内容将不会被渲染和显示。

```html
<!-- 在此处写注释 -->
```

## HTML常用标签

HTML 标签是 HTML 语言中最基本的单位。HTML 标签的大小写无关，例如 `<body>`和 `<BODY>` 表示的意思是一样的，推荐使用小写。

#### 双标签（双标记）

双标记也称体标记，是指由开始和结束两个标记符组成的标记。其基本语法格式如下：

```
<标记名></标记名>
```

常见的双标签有：

```html
<html></html>
<head></head>
<title></title>
<body></body>
<h1></h1>
<p></p>
<div></div>
<span></span>
<a></a>
<ul></ul>
```

#### 单标签（单标记）

单标记也称空标记，是指用一个标记符号即可完整地描述某个功能的标记。其基本语法格式如下：

```
<标记名/>
```

常见的单标签有：

```html
<br />
<!--换行-->
<hr />
<!--水平分隔线-->
<meta />
<img />
```

#### 标签的关系

- 嵌套关系

```html
<head>
  <title> </title>
</head>
```

- 并列关系

```html
<head></head>
<body></body>
```

### HTML元素

HTML 元素指的是从开始标签（start tag）到结束标签（end tag）的所有代码。

### HTML标签

#### h 系类标签

`h` 标签有六种 `h1`，`h2`，`h3`，`h4`，`h5`，`h6`，代表不同层级的标题。

```html
<!DOCTYPE html>
<html>
    <body>
        <h1>一级标题</h1>
        <h2>二级标题</h2>
        <h3>三级标题</h3>
        <h4>四级标题</h4>
        <h5>五级标题</h5>
        <h6>六级标题</h6>
    </body>
</html>
```

<!DOCTYPE html>
<html>
    <body>
        <h1>一级标题</h1>
        <h2>二级标题</h2>
        <h3>三级标题</h3>
        <h4>四级标题</h4>
        <h5>五级标题</h5>
        <h6>六级标题</h6>
    </body>
</html>

#### p 标签

`p` 标签是文本标签，通常用来表示段落。

```html
<!DOCTYPE html>
<html>
    <body>
        <p>段落文字</p>
        <p>段落文字</p>
    </body>
</html>
```

<!DOCTYPE html>
<html>
    <body>
        <p>段落文字</p>
        <p>段落文字</p>
    </body>
</html>