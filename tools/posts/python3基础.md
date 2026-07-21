---
title: python3基础
categories:
  - 技术
  - 基础
tags:
  - python
katex: true
abbrlink: 38365
date: 2021-02-08 00:00:00
update: 2021-02-22 00:00:00
---

> 本文借鉴自：
>
> _Python for you and me_ : http://pymbook.readthedocs.io/en/latest/
>
> _Python tutorial_ : http://www.pythondoc.com/pythontutorial3/index.html

## 开始Python

### 解释器

在终端键入`python`或`python3`进入交互模式：

```python
>>> print("Hello World")
Hello World
```

退出解释器：快捷键`Ctrl + D`或键入`exit()`。

### 脚本文件

可以使用任何编辑器来编辑.py文件，这里以Vim为例：

```shell
vim helloworld.py
```

即可用Vim创建并打开新的脚本文件。

![document-uid731737labid7100timestamp1531381084391](https://gitee.com/sg2019/picgo/raw/master/document-uid731737labid7100timestamp1531381084391.png)

`i`键进入插入模式，键入代码，`Esc + :wq`即可保存退出。

```python
#!/usr/bin/env python3
print("Hello World")
```

**注意**：为了让shell使用Python解释器执行，要在代码前加`#!`，称为_Shebang_。

运行前用`chmod`命令来变更文件或目录的权限，否则会提示权限不足，可执行权限`+x`，即：

```shell
$ chmod +x helloworld.py
```

然后即可正常执行脚本文件：

```shell
./helloworld.py
```

**注意**：如果程序中没有`#!/usr/bin/env python3`，则需要键入`python3 helloworld.py`执行，否则会执行bash脚本报错。

### 代码风格

不正确的空格缩进Python解释器会抛出错误：

```python
>>> a = 1
>>>   a = 1
  File "<stdin>", line 1
    a = 1
    ^
IndentationError: unexpected indent
```

- 空格和制表符不要混用
- 函数间空一行，类之间空两行
- 赋值运算符、比较运算符周围要加空格，`,`、`:`（字典）后要加空格

### 注释

单行注释以`#`开头（并注意后加空格），多行注释位于`` ``` ``之间。

```python
# FIXME -- fix these code later
# TODO -- in future you have to do this
```



## 变量和数据类型

### 关键字和标识符

在解释器中可查看：

```python
>>> help()
help> keywords
```

### 从键盘读入

函数`input()`用于从键盘读取输入，`print()`用于输出。

### 字符串格式化

`str.format()`函数用于格式化字符串，其中`str`是需要格式化的字符串，其中可以加`{}`，`{}`和其中的替换字段会被替换为参数。

比如：

- `{:5d}`场宽为5的整数

- `{:3.2f}`场宽为3，保留2位的浮点数

### 单行定义多个变量赋值

Python中元组（_tuple_）这一数据类型，使得多个变量可以同时赋值。赋值语句的右值进行了封装，左值进行了拆封。既然左值和右值都可以为多个变量（使用`,`创建元组），那么经典的交换就直接写为：

```python
a, b = b, a  # 交换两个数值
```

## 运算符和表达式

### 运算符

- 只要有任意一个操作数是浮点数，结果就是浮点数

- `/`除不尽时，结果为浮点数

- 整除符号`//`，求余`%`

- `divmod(a, b)`返回元组`a//b, a%b`，可以用`*`运算符拆封元组

关系运算符不变，逻辑运算符使用关键字`and`、`or`、`not`，也是短路运算符。例如：

```python
>>> 0 or 3
3
>>> 0 and 3
0
```

### 类型转换

Python是强类型语言，有如下类型转换函数：整数`int()`，浮点数`float()`，字符串`str()`。注意如果`int()`参数为浮点数的字符串会报错。

## 控制流 if - else

### if语句

```python
if exp1:
	A
elif exp2:
	B
else
	C
```

注意`else if`简写为`elif`。

### 真值检测

`if x:`比`if x == True`要更好，因为Python中许多值都具有布尔意义。

## 循环

### while循环

举例说明，打印100以内Fibonacci数列的值：

```python
#!/usr/bin/env python3
a, b = 0, 1
while b < 100:
    print(b)
    a, b = b, a + b
```

如果不想每次循环时都换行，可以改变`print()`的另一个参数`end`：

```python
print(b, end = ' ')
```

这样Fibonacci数项间将以空格隔开。如果要打印分割线，则：

```python
print('-' * 40)
```

字符串与整数相乘表示，字符串复制多次拼接，得到新的字符串。

可以在循环中加入控制流，用`break`语句跳出循环，或者用`continue`语句进入下一次循环。有时可能会看到`pass`语句，它位于循环末尾，只起占位符的作用。

### 列表

列表很像数组，但列表的元素可以是不同类型。它可以写成中括号中间一列逗号分隔开的值的形式：

```python
arr = ["sg2019", 2021, 2.23, True]
```

列表的索引从0开始编号，但索引可以为负数，表示从末尾向前数。

### 切片

切片用于取出列表的一个子列表，比如以上面的列表为例：

```python
>>> arr[0:-1]
["sg2019", 2021, 2.23]
>>> arr[:]
["sg2019", 2021, 2.23, True]
```

切片表示一个左闭右开的区间，比如说`arr[0:-1]`，就等价于`arr[0:4]`，即左闭右开区间$[0,4)$。

