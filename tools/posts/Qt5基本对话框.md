---
title: Qt5基本对话框
categories:
  - 技术
  - C++
tags:
  - Qt
  - 基础
abbrlink: 30723
date: 2021-05-26 15:46:03
description:
---

### Qt基本对话框

构建一个关于 Qt5 常用到的对话框综合实例，在实例中可以通过按下对应的 `QPushButton` 控件打开一系列对应的 Qt5 基本对话框显示，进而认识并熟悉关于 Qt5 中的常用基本对话框。

在这个实例中，主要具有几部分：

- “标准文件对话框”
- “标准颜色对话框”
- “标准字体对话框”
- “标准输入对话框”
- “消息对话框”

其中“标准输入对话框”和“消息对话框”又分别有几个不同的类型。所以在这个实例中，对于“标准输入对话框”和“消息对话框”会另外采用添加新类的方式构建单独的界面显示，其它部分都会统一添加到主界面 `Dialog 类` 成员中。

### 项目创建

- 打开 `QtCreator` 开发环境界面，点击 `New Project` 进行新工程创建
- 左侧选择 `Application` ，右侧选择 `Qt Widgets Application` 进行新工程创建
- 添加项目名称为 `DialogDemo` ，选择项目存放路径 `/home/shiyanlou/Code`，勾选设为默认的项目路径，然后选择下一步
- 选择项目编译工具链，这里全选即可
- 构建项目主界面类，类名为 `Dialog` ，基类选择 `QDialog` ，取消“创建界面”复选框的选中状态，点击下一步

### Qt标准文件对话框类

Qt5 中标准文件对话框的使用主要依赖 `QFileDialog` 类，其中关于打开并显示标准文件对话框是使用该类的 `getOpenFileName()` 静态成员函数，该函数返回用户选择的文件名，当用户选择文件时，返回被选中的文件的文件名，当选择 `取消(Cancel)` 按键时返回一个空串。具体形参描述说明如下：

```cpp
QString QFileDialog::getOpenFileName
(
    QWidget *parent = 0,    //标准文件对话框的父窗口
    const QString &caption = QString(),    //标准文件对话框的标题名
    const QString &dir = QString(),        //指定打开时的默认目录路径
    const QString &fileter = QString(),    //参数选择对文件进行过滤显示，多种过滤器之间使用 “;;” 隔开
    QString *selectedFileter = 0,        //用户选择的过滤器通过此参数返回
    Options    options = 0,        //选择显示文件名的格式，默认是同时显示目录和文件名
);
```

在实例中需要实现点击 `fileBtn` 按钮后弹出标准文件对话框并完成文件名称的选择获取，将返回的结果显示到对应的文件名称显示控件 `fileLineEdit` 中。

在 `dialog.h` 文件中的 `Dialog` 类定义中添加如下代码：

```cpp
#ifndef DIALOG_H
#define DIALOG_H

#include <QDialog>
#include <QPushButton>
#include <QGridLayout>
#include <QFileDialog>
#include <QColorDialog>
#include <QLineEdit>
#include <QFont>
#include <QFontDialog>

class Dialog : public QDialog
{
    Q_OBJECT

public:
    Dialog(QWidget *parent = 0);
    ~Dialog();

private slots:
    void showFile();    //文件对话框槽函数

private:
    QPushButton *fileBtn;   //文件标准对话框按钮
    QLineEdit *fileLineEdit;    //文件对话框返回字符串显示控件

    QGridLayout *mainLayout;    //主界面布局管理
};
#endif // DIALOG_H
```

在 `dialog.cpp` 源文件中实现相应的控件初始化和对应的槽函数实现，相关具体代码如下：

```cpp
#include "dialog.h"

Dialog::Dialog(QWidget *parent)
{
    //文件对话框相关控件
    fileBtn = new QPushButton;
    fileBtn->setText(tr("File Dialog Demo"));
    fileLineEdit = new QLineEdit;

    mainLayout = new QGridLayout(this);
    //文件相关布局
    mainLayout->addWidget(fileBtn, 0, 0);
    mainLayout->addWidget(fileLineEdit, 0, 1);

    connect(fileBtn, SIGNAL(clicked()), this, SLOT(showFile()));
}

void Dialog::showFile()
{
    //显示标准文件对话框
    QString fileName = QFileDialog::getOpenFileName(this, "Open File Dialog", "/", "C++ files(*.cpp);;C files(*.c);;Head files(*.h)");
    fileLineEdit->setText(fileName);
}

Dialog::~Dialog()
{}
```

### Qt5标准颜色对话框类

在 Qt5 中的颜色类 `QColorDialog` 提供了 Qt 对颜色选择对话框的相关支持，通过该类的静态成员函数 `getColor()` 可以打开标准颜色对话框并进行颜色的选择，返回一个 `QColor` 类型的被选中的颜色值。

具体的函数参数说明如下：

```cpp
QColor getColor
(
    const QColor &initial = Qt::white,        //指定默认选中的颜色为白色
    QWideget *parent = 0                    //指定标准颜色对话框的父窗口
);
```

在使用过程中，可以通过 `QColor::isValid()` 函数判断用户选择的颜色是否有效，如果用户在颜色选择界面点击 `Cancel` 则返回 `false` 。

在实例中添加标准颜色对话框的相关控件及功能，在 `dialog.h` 头文件中的 `Dialog` 类定义中添加以下内容。

```cpp
class Dialog : public QDialog
{

private slots:
    ....
    void showColor();   //颜色对话框槽函数
private:
    ....
    QPushButton *colorBtn;  //标准颜色对话框按钮
    QFrame *colorFrame; //颜色显示控件
};
```

接下来在 `dialog.cpp` 源文件中添加对应的控件构造初始化及槽函数实现，内容如下：

```cpp
#include "dialog.h"

Dialog::Dialog(QWidget *parent)
{
    ...
    //颜色对话框相关控件
    colorBtn = new QPushButton;
    colorBtn->setText(tr("Color Dialog Demo"));
    colorFrame = new QFrame;
    colorFrame->setFrameShape(QFrame::Box);
    colorFrame->setAutoFillBackground(true);
    ...
    mainLayout = new QGridLayout(this);
    ...
    //颜色相关布局
    mainLayout->addWidget(colorBtn, 1, 0);
    mainLayout->addWidget(colorFrame, 1, 1);
    ......

    connect(colorBtn, SIGNAL(clicked()), this, SLOT(showColor()));
}

void Dialog::showColor()
{
    //显示颜色选择对话框
    QColor color = QColorDialog::getColor(Qt::blue);
    if(color.isValid())
    {
        colorFrame->setPalette(QPalette(color));
    }
}
```

### Qt5标准字体对话框类

在 Qt5 中的颜色类 `QFontDialog` 提供了 Qt 对字体选择对话框的相关支持，通过该类的静态成员函数 `getFont()` 可以打开标准字体对话框并进行字体相关的参数设定，返回一个 `QFont` 类型的被选中的字体。

具体的函数参数说明如下：

```cpp
QFont getFont
(
    bool *ok,        //若用户选择 OK， 则该参数将设为 true 并返回被设定的字体，否则设为 false ，此时返回默认字体。
    QWidget *parent = 0,    //标准字体对话框的父窗口
);
```

在实例中添加标准字体对话框的相关控件及功能，在 `dialog.h` 头文件中的 `Dialog` 类定义中添加以下内容：

```cpp
class Dialog : public QDialog
{
private slots:
    ...
    void showFont();    //字体对话框槽函数
private:
    ...
    QPushButton *fontBtn;   //字体选择对话框按钮
    QLineEdit *fontLineEdit;    //字体显示控件
};
```

接下来在 `dialog.cpp` 源文件中添加对应的控件构造初始化及槽函数实现，内容如下：

```cpp
#include "dialog.h"

Dialog::Dialog(QWidget *parent)
{
    ...
    //字体对话框相关控件
    fontBtn = new QPushButton;
    fontBtn->setText(tr("Font Dialog Demo"));
    fontLineEdit = new QLineEdit;
    fontLineEdit->setText(tr("Hello World!"));
    ...
    //字体相关布局
    mainLayout->addWidget(fontBtn, 2, 0);
    mainLayout->addWidget(fontLineEdit, 2, 1);
    ......
    ......

    connect(fontBtn, SIGNAL(clicked()), this, SLOT(showFont()));
}

void Dialog::showFont()
{
    //显示字体选择对话框
    bool ok;
    QFont font = QFontDialog::getFont(&ok);
    if(ok)
    {
        fontLineEdit->setFont(font);
    }
}
```

### Qt5标准输入对话框类

通过构建输入对话框相关操作可以了解关于标准字符串输入对话框、标准条目选择对话框、标准 int 类型输入对话框以及标准 double 类型输入对话框的函数说明及创建步骤。

Qt5 中对于标准输入对话框提供了四种数据类型的输入，包括字符串、下拉列表框条目选择、 int 数据类型和 double 数据类型。所以在实例中，我们以之前的 `Dialog` 界面为父窗口，添加一个新的 `InputDlg` 类创建输入对话框的界面显示。

在 `DialogDemo` 项目名上单击鼠标右键，在弹出的快捷菜单中选择 `添加新文件...`菜单项，如下图：

