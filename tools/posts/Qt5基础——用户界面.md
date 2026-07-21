---
title: Qt5基础——用户界面
categories:
  - 技术
  - C++
tags:
  - 基础
  - C++
  - Qt
description: 实现一个简单“修改用户信息”的Qt界面，通过简单实例的编写，熟悉Qt中常用控件的创建和使用方法、信号与槽机制的使用以及界面布局管理的方式方法。
abbrlink: 17245
date: 2021-04-15 00:00:00
updated: 2021-05-21
---

## 开始Qt

### Linux下安装Qt开发环境

- 更新软件

  ```bash
  sudo apt update
  ```

- 安装C++环境（若已安装可跳过）

  ```bash
  sudo apt install build-essential
  ```

- 安装Qt

  ```bash
  sudo apt install -y qtcreator qt5-default
  ```

### 新建Qt工程

- 打开Qt Creator

     ```bash
     qtcreator
     ```

- 创建新工程项目`New Project`

- 然后左边选择 `Application`，右边选择 `Qt Widgets Application`，单击 `Choose`

- 设置当前编译工具链环境（全选）

- 进行主界面类创建

  选择整体界面继承基类，因为本项目使用对话框类 `QDialog` 为主界面，故类名命名为 `Content` ，基类选择 `QDialog` ，取消“创建界面”复选框的选中状态完成项目创建。

- 汇总项目管理

  如果此项目位于git仓库中，可以添加到版本控制系统。

### 主界面类设计

导航页面使用 Content 类实现。打开 `content.h` 头文件，修改 `Content` 类继承自 `QFrame` 类，类声明中包含自定义的三个页面类对象、两个按钮对象以及一个堆栈窗体对象，在 `Content` 类头文件中定义类成员变量，添加如下代码：

```cpp
//添加的头文件
#include <QStackedWidget>
#include <QPushButton>
#include "baseinfo.h"
#include "contact.h"
#include "detail.h"

class Content : public QFrame
{
    Q_OBJECT
public:
    Content(QWidget *parent=0);
    ~Content();
    QStackedWidget *stack;//堆栈窗体对象声明
    QPushButton *AmendBtn;//修改按钮声明
    QPushButton *CloseBtn;//关闭按钮声明
    BaseInfo *baseInfo;//基本信息窗口类
    Contact *contact;//联系方式窗口类
    Detail *detail;//详细信息窗口类
};
```

在头文件中声明了部分需要用到的 Qt 控件类，`QPushButton` 按钮控件类声明指针，在源文件中只需要使用 `new` 进行对应对象的创建即可。

打开 `content.cpp` 文件，添加如下代码：

```cpp
#include "content.h"

Content::Content(QWidget *parent) : QFrame(parent)
{
    stack = new QStackedWidget(this);//创建一个QStackedWidget对象
    //对堆栈窗口的显示风格进行设置
    stack->setFrameStyle(QFrame::Panel | QFrame::Raised);
    //插入三个页面
    baseInfo = new BaseInfo();
    contact = new Contact();
    detail = new Detail();
    stack->addWidget(baseInfo);
    stack->addWidget(contact);
    stack->addWidget(detail);
    //创建两个按钮
    AmendBtn = new QPushButton(tr("Amend"));
    CloseBtn = new QPushButton(tr("Close"));
    QHBoxLayout *BtnLayout = new QHBoxLayout;
    BtnLayout->addStretch(1);
    BtnLayout->addWidget(AmendBtn);
    BtnLayout->addWidget(CloseBtn);

    //整体布局
    QVBoxLayout *RightLayout = new QVBoxLayout(this);
    RightLayout->setMargin(10);
    RightLayout->setSpacing(6);
    RightLayout->addWidget(stack);
    RightLayout->addLayout(BtnLayout);
}

Content::~Content()
{
}
```

其中：

- `baseInfo = new BaseInfo();` 到 `stack->addWidget(detail);` 这段代码是在堆栈窗口中顺序插入”基本信息“、”联系方式“以及”详细资料“三个页面。
- `AmendBtn = new QPushButton(tr("Amend"));` 到 `BtnLayout->addWidget(CloseBtn);` 这段代码用于创建两个按钮，并利用 `QHBoxLayout` 对其进行布局。

### “显示用户的详细资料”子界面设计

其中需要用到 `QPushButton` 、`Qlabel` 等控件，这里添加新的 `QWidget` 类，完成“显示用户的详细资料”子界面的设计。

在 Qt 工程中添加新的类的方式如下：

- 添加该工程的提供主要显示用户基本信息界面的函数所在的文件，在 `Example` 项目名上单击鼠标右键，在弹出的快捷菜单中选择 `添加新文件...` 菜单项。
- 在弹出的对话框中选择 `C++ Class` 选项，单击 `Choose...` 按钮。
- 弹出对话框，在 `Class name` 后面的文本框中输入类的名称 `BaseInfo` ，在 `Base class` 后面的下拉列表框中选择基类名 `QWidget` ，添加 `baseinfo.h` 头文件和 `baseinfo.cpp` 源文件。
- 选择下一步后，默认当前选择，直接点击完成即可。

打开 `baseinfo.h` 头文件，添加代码如下：

```cpp
//添加头文件
#include <QLabel>
#include <QLineEdit>
#include <QTextEdit>
#include <QGridLayout>
#include <QComboBox>
#include <QPushButton>

class BaseInfo : public QWidget
{
    Q_OBJECT
public:
    explicit BaseInfo(QWidget *parent = 0);
signals:

public slots:
private:
    //左侧
    QLabel *UserNameLabel;//用户名标签
    QLabel *NameLabel;//姓名标签
    QLabel *SexLabel;//性别标签
    QLabel *DepartmentLabel;//部门标签
    QLabel *AgeLabel;//年龄标签
    QLabel *OtherLabel;//备注标签
    QLineEdit *UserNameLineEdit;//用户名输入文本控件
    QLineEdit *NameLineEdit;//姓名输入文本控件
    QComboBox *SexComboBox;//性别选择ComboBox控件
    QTextEdit *DepartmentTextEdit;//部门文本输入控件
    QLineEdit *AgeLineEdit;//年龄文本输入控件
    QGridLayout *LeftLayout;//左侧布局管理对象
    //右侧
    QLabel *HeadLabel;//头像标签
    QLabel *HeadIconLabel;//头像图片显示控件
    QPushButton *UpdateHeadBtn;//更新按钮控件
    QHBoxLayout *TopRightLayout;//右侧上半部分布局管理对象
    QLabel *IntroductionLabel;//个人介绍标签
    QTextEdit *IntroductionTextEdit;//个人介绍文本输入控件
    QVBoxLayout *RightLayout;//右侧整体布局管理对象
};
```

打开 `baseinfo.cpp` 文件，添加如下代码：

```cpp
#include "baseinfo.h"

BaseInfo::BaseInfo(QWidget *parent) : QWidget(parent)
{
    //构建“显示用户详细资料”左侧部分控件创建及布局
    UserNameLabel = new QLabel(tr("User:"));
    UserNameLineEdit = new QLineEdit;
    NameLabel = new QLabel(tr("Name:"));
    NameLineEdit = new QLineEdit;
    SexLabel = new QLabel(tr("Sex:"));
    SexComboBox = new QComboBox;
    SexComboBox->addItem(tr("Man"));
    SexComboBox->addItem(tr("Woman"));
    DepartmentLabel = new QLabel(tr("Department:"));
    DepartmentTextEdit = new QTextEdit;
    AgeLabel = new QLabel(tr("Age:"));
    AgeLineEdit = new QLineEdit;
    OtherLabel = new QLabel(tr("Other:"));
    OtherLabel->setFrameStyle(QFrame::Panel | QFrame::Sunken);

    //新建左侧布局管理器，将前面创建好的控件添加到布局管理器中对应坐标的部分。
    LeftLayout = new QGridLayout();
    LeftLayout->addWidget(UserNameLabel, 0, 0);
    LeftLayout->addWidget(UserNameLineEdit, 0, 1);
    LeftLayout->addWidget(NameLabel, 1, 0);
    LeftLayout->addWidget(NameLineEdit, 1, 1);
    LeftLayout->addWidget(SexLabel, 2, 0);
    LeftLayout->addWidget(SexComboBox, 2, 1);
    LeftLayout->addWidget(DepartmentLabel, 3, 0);
    LeftLayout->addWidget(DepartmentTextEdit, 3, 1);
    LeftLayout->addWidget(AgeLabel, 4, 0);
    LeftLayout->addWidget(AgeLineEdit, 4, 1);
    LeftLayout->addWidget(OtherLabel, 5, 0, 1, 2);
    LeftLayout->setColumnStretch(0,1);
    LeftLayout->setColumnStretch(1,3);

    //构建“显示用户详细资料”右侧部分控件创建及布局
    HeadLabel = new QLabel(tr("Head:"));
    HeadIconLabel = new QLabel;
    QPixmap icon("312.png");
    HeadIconLabel->setPixmap(icon);
    HeadIconLabel->resize(icon.width(), icon.height());
    UpdateHeadBtn = new QPushButton(tr("Update"));
    TopRightLayout = new QHBoxLayout();
    TopRightLayout->setSpacing(20);
    TopRightLayout->addWidget(HeadLabel);
    TopRightLayout->addWidget(HeadIconLabel);
    TopRightLayout->addWidget(UpdateHeadBtn);
    IntroductionLabel = new QLabel(tr("Introduction:"));
    IntroductionTextEdit = new QTextEdit;
    //新建右侧布局管理器，将右侧需要的控件添加到布局管理器中对应坐标的部分。
    RightLayout = new QVBoxLayout();
    RightLayout->setMargin(10);
    RightLayout->addLayout(TopRightLayout);
    RightLayout->addWidget(IntroductionLabel);
    RightLayout->addWidget(IntroductionTextEdit);

    //新建整个界面全局布局管理器，将完成基本设置，将左侧布局和右侧布局添加进来完成全局布局显示。
    QGridLayout *mainLayout = new QGridLayout(this);
    mainLayout->setMargin(15);//设置控件与窗体的左右边距
    mainLayout->setSpacing(10);//设置各个控件之间的上下间距
    mainLayout->addLayout(LeftLayout, 0, 0);
    mainLayout->addLayout(RightLayout, 0, 1);
    mainLayout->setSizeConstraint(QLayout::SetFixedSize);
}
```
### 子界面类设计

#### “显示用户的联系方式”子界面设计

参考前面“修改用户基本信息”子界面的创建方式再次添加新的 `qwidget` 类，完成“显示用户的联系方式”子界面的设计，在子界面中添加对应的 `QPushButton` 、 `Qlabel` 等控件。

在 `Example` 项目名上单击鼠标右键，在弹出的快捷菜单中选择 `添加新文件...` 菜单项，在弹出的对话框中选择 `C++ Class` 选项，单击 `Choose...` 按钮，弹出对话框，在 `Class name` 后面的文本框中输入类的名称 `Contact`，在 `Base class` 后面的下拉列表框中选择基类类名 `QWidget`。

打开 `contact.h` 头文件，添加如下代码：

```cpp
//添加头文件

#include <QLabel>
#include <QGridLayout>
#include <QLineEdit>
#include <QCheckBox>

class Contact : public QWidget
{
    Q_OBJECT
public:
    explicit Contact(QWidget *parent = 0);
signals:

public slots:
private:
    QLabel *EmailLabel;//电子邮件标签
    QLineEdit *EmailLineEdit;//电子邮件编辑控件
    QLabel *AddrLabel;//联系地址标签
    QLineEdit *AddrLineEdit;//联系地址文本编辑控件
    QLabel *CodeLabel;//邮政编码标签
    QLineEdit *CodeLineEdit;//邮政编码文本编辑控件
    QLabel *MoviTelLabel;//移动电话标签
    QLineEdit *MoviTelLineEdit;//移动电话文本编辑控件
    QCheckBox *MoviTelCheckBook;//是否选择“接收留言”复选框
    QLabel *ProTelLabel;//办公电话标签
    QLineEdit *ProTelLineEdit;//办公电话文本编辑控件
    QGridLayout *mainLayout;//全局布局管理器
};
```

打开 `contact.cpp` 文件，添加如下代码：

```cpp
#include "contact.h"

Contact::Contact(QWidget *parent) : QWidget(parent)
{
    //新建电子邮件标签及文本编辑框
    EmailLabel = new QLabel(tr("Email:"));
    EmailLineEdit = new QLineEdit;
    //新建联系地址标签及文本编辑框
    AddrLabel = new QLabel(tr("Addr:"));
    AddrLineEdit = new QLineEdit;
    //新建邮政编码标签及文本编辑框
    CodeLabel = new QLabel(tr("Code:"));
    CodeLineEdit = new QLineEdit;
    //新建移动电话标签及文本编辑框
    MoviTelLabel = new QLabel(tr("MoviTel:"));
    MoviTelLineEdit = new QLineEdit;
    MoviTelCheckBook = new QCheckBox(tr("MoviTelCheck"));
    //新建办公电话标签及文本编辑框
    ProTelLabel = new QLabel(tr("ProTel:"));
    ProTelLineEdit = new QLineEdit;

    //新建全局布局管理器，将上面新建的各个控件添加进来，完成当前界面的布局管理。
    mainLayout = new QGridLayout(this);
    mainLayout->setMargin(15);
    mainLayout->setSpacing(10);
    mainLayout->addWidget(EmailLabel, 0, 0);
    mainLayout->addWidget(EmailLineEdit, 0, 1);
    mainLayout->addWidget(AddrLabel, 1, 0);
    mainLayout->addWidget(AddrLineEdit, 1, 1);
    mainLayout->addWidget(CodeLabel, 2, 0);
    mainLayout->addWidget(CodeLineEdit, 2, 1);
    mainLayout->addWidget(MoviTelLabel, 3, 0);
    mainLayout->addWidget(MoviTelLineEdit, 3, 1);
    mainLayout->addWidget(MoviTelCheckBook, 3, 2);
    mainLayout->addWidget(ProTelLabel, 4, 0);
    mainLayout->addWidget(ProTelLineEdit, 4, 1);
    mainLayout->setSizeConstraint(QLayout::SetFixedSize);
}
```

#### “修改用户基本信息”子界面设计

再次添加新的类文件，完成“显示用户的详细资料”子界面的设计，在子界面中添加对应的 `QPushButton`、 `Qlabel` 等控件。

添加主要显示用户的详细资料界面的函数所在的文件，在 `Example` 项目名上单击鼠标右键，在弹出的快捷菜单中选择 `添加新文件...` 菜单项，在弹出的对话框中选择 `C++ Class` 选项，单击 `Choose...` 按钮，弹出对话框，在 `Class name` 后面的文本框中输入类的名称 `Detail`，在 `Base class` 后面的下拉列表框中选择基类类名 `QWidget`。

打开 `detail.h` 头文件，添加如下代码：

```cpp
#include <QLabel>
#include <QComboBox>
#include <QLineEdit>
#include <QTextEdit>
#include <QGridLayout>

class Detail : public QWidget
{
    Q_OBJECT
public:
    explicit Detail(QWidget *parent = 0);
signals:

public slots:
private:
    QLabel *NationalLabel;//地址标签
    QComboBox *NationalComboBox;//地址选择控件
    QLabel *ProvinceLabel;//省份标签
    QComboBox *ProvinceComboBox;//省份选择控件
    QLabel *CityLabel;//城市标签
    QLineEdit *CityLineEdit;//城市文本编辑框
    QLabel *IntroductLabel;//个人说明标签
    QTextEdit *IntroductTextEdit;//个人说明文本编辑框
    QGridLayout *mainLayout;//全局布局管理对象
};
```

打开 `detail.cpp` 文件，添加如下代码：

```cpp
#include "detail.h"

Detail::Detail(QWidget *parent) : QWidget(parent)
{
    NationalLabel = new QLabel(tr("National:"));
    //新建国家/地址选择控件QComboBox，向该控件中添加三个可选项。
    NationalComboBox = new QComboBox;
    NationalComboBox->insertItem(0, tr("PRC"));
    NationalComboBox->insertItem(1, tr("UK"));
    NationalComboBox->insertItem(1, tr("USA"));
    ProvinceLabel = new QLabel(tr("Province:"));
    //新建省份选择控件QComboBox，向该控件中添加三个可选项。
    ProvinceComboBox = new QComboBox;
    ProvinceComboBox->insertItem(0, tr("JiangSu"));
    ProvinceComboBox->insertItem(0, tr("ShanDong"));
    ProvinceComboBox->insertItem(0, tr("ZheJiang"));
    CityLabel = new QLabel(tr("City:"));
    CityLineEdit = new QLineEdit;
    IntroductLabel = new QLabel(tr("Introduct:"));
    IntroductTextEdit = new QTextEdit;
    mainLayout = new QGridLayout(this);
    mainLayout->setMargin(15);
    mainLayout->setSpacing(10);
    mainLayout->addWidget(NationalLabel, 0, 0);
    mainLayout->addWidget(NationalComboBox, 0, 1);
    mainLayout->addWidget(ProvinceLabel, 1, 0);
    mainLayout->addWidget(ProvinceComboBox, 1, 1);
    mainLayout->addWidget(CityLabel, 2, 0);
    mainLayout->addWidget(CityLineEdit, 2, 1);
    mainLayout->addWidget(IntroductLabel, 3, 0);
    mainLayout->addWidget(IntroductTextEdit, 3, 1);

}
```

### 编写程序主函数

在程序主函数中将各个子界面和导航页面组合到一起，利用 Qt5 的布局管理完成整个程序界面的布局设计。

下面编写该工程的入口函数，打开 `main.cpp` 文件，添加如下代码：

```cpp
#include "content.h"
#include <QApplication>
#include <QTextCodec>
#include <QSplitter>
#include <QListWidget>

int main(int argc, char *argv[])
{
    QApplication a(argc, argv);
    QFont font("AR PL KaitiM GB", 12);//设置整个程序采用的字体和字号
    a.setFont(font);
    //新建一个水平分割窗口对象，作为主布局框
    QSplitter *splitterMain = new QSplitter(Qt::Horizontal, 0);
    splitterMain->setOpaqueResize(true);
    //新建列表界面，并添加对应三个界面的名称。
    QListWidget *list = new QListWidget(splitterMain);
    list->insertItem(0, QObject::tr("BaseInfo"));
    list->insertItem(0, QObject::tr("Contact"));
    list->insertItem(0, QObject::tr("Detail"));
    Content *content = new Content(splitterMain);

    //使用Qt的信号槽机制将列表界面中的选择改变事件和对应界面显示响应进行连接，这样在左侧界面进行选择
    //后，右侧会显示选择对应的页面。
    QObject::connect(list, SIGNAL(currentRowChanged(int)), content->stack, SLOT(setCurrentIndex(int)));
    //设置主布局框即水平分割窗口的标题
    splitterMain->setWindowTitle(QObject::tr("Modify User Message"));
    //设置主布局框即水平分割窗口的最小尺寸
    splitterMain->setMinimumSize(splitterMain->minimumSize());
    //设置主布局框即水平分割窗口的最大尺寸
    splitterMain->setMaximumSize(splitterMain->maximumSize());
    splitterMain->show();//显示主布局框，其上面的控件一同显示
    return a.exec();
}
```

其中：

- `QListWidget *list = new QListWidget(splitterMain);` 在新建的水平分割窗的左侧窗口中插入以 `QListWidget` 作为条目选择框，并在此依次插入 `BaseInfo` 、`Contact` 以及 `Detail` 条目。
- `Content *content = new Content(splitterMain);` 在新建的水平分割窗的右侧窗口中插入 Content 类对象。
- `QObject::connect(list, SIGNAL(currentRowChanged(int), content->stack, SLOT(setCurrentIndex(int)));` 连接列表框的 `currentRowChanged()` 信号与堆栈窗口的 `setCurrentIndex()` 槽函数。

选择 `构建` -> `构建项目 Example` 菜单项。为了能在界面中显示图片，需要代码中使用到的图片放置到编译后执行程序存放的目录中去。

### 用户界面效果图

#### 英文版

![image-20210521011131849](https://gitee.com/buptsg2019/picgo/raw/master/20210521011139.png)

![image-20210521011324396](https://gitee.com/buptsg2019/picgo/raw/master/20210521011324.png)

![image-20210521011336571](https://gitee.com/buptsg2019/picgo/raw/master/20210521011336.png)

#### 中文版

![image-20210521011429389](https://gitee.com/buptsg2019/picgo/raw/master/20210521011429.png)

![image-20210521011439947](https://gitee.com/buptsg2019/picgo/raw/master/20210521011439.png)

![image-20210521011452563](https://gitee.com/buptsg2019/picgo/raw/master/20210521011452.png)
