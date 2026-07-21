---
title: Qt5网络通信——TCP网络聊天室
categories:
  - 技术
  - C++
tags:
  - Qt
  - TCP
  - Socket
abbrlink: 38533
date: 2021-06-16 02:02:11
description:
---

### 服务端程序构建

设计和前一个实验类似的服务端显示界面，如下图所示：

![avatar](/blog/assets/img/b00be7506cfa.png)

实际上作为网络聊天室的服务端运行流程与前一个实验的 UDP 服务器管理方式类似，在 TCP 服务器内建立一个 `TcpServer` 类作为 TCP 服务器的类，在该类中包含一个 `TcpServerSocket` 链表容器，通过这个链表来管理当前与服务器建立连接的客户端，并与之进行数据交互。

首先，创建 Qt 工程 `TcpServerDemo` 。

在 `TcpServerDemo.pro` 工程文件中添加如下内容：

```C++
QT += network
```

首先添加界面控件的相关代码，打开主界面类的头文件 `mainwidget.h` ，添加如下代码：

```C++
#ifndef MAINWIDGET_H
#define MAINWIDGET_H

#include <QWidget>
#include <QListWidget>
#include <QLabel>
#include <QLineEdit>
#include <QPushButton>
#include <QGridLayout>
#include <QTcpServer>
#include <QTcpSocket>

class mainWidget : public QWidget
{
    Q_OBJECT

public:
    mainWidget(QWidget *parent = 0);
    ~mainWidget();

private:
    QListWidget *ContentListWidegt;
    QLabel      *PortLabel;
    QLineEdit   *PortLineEdit;
    QPushButton *CreateBtn;
    QPushButton *QuitBtn;
    QPushButton *CloseBtn;
    QGridLayout *mainLayout;

};
#endif // MAINWIDGET_H
```

打开 `mainwidget.cpp` 源文件，添加如下代码：

```C++
#include "mainwidget.h"

mainWidget::mainWidget(QWidget *parent)
    : QWidget(parent)
{
    setWindowTitle(tr("TCP Server"));

    ContentListWidegt = new QListWidget;
    PortLabel = new QLabel(tr("Port:"));
    PortLineEdit = new QLineEdit;
    PortLineEdit->setInputMask("9999");
    CreateBtn = new QPushButton(tr("Create Room"));
    QuitBtn = new QPushButton(tr("Quit Room"));
    CloseBtn = new QPushButton(tr("Close"));

    //布局
    mainLayout = new QGridLayout(this);
    mainLayout->addWidget(ContentListWidegt, 0, 0, 1, 2);
    mainLayout->addWidget(PortLabel, 1, 0);
    mainLayout->addWidget(PortLineEdit, 1, 1);
    mainLayout->addWidget(CreateBtn, 2, 0);
    mainLayout->addWidget(QuitBtn, 2, 1);
    mainLayout->addWidget(CloseBtn, 3, 0, 1, 2);

}

mainWidget::~mainWidget()
{
}
```

构建运行项目。

界面设计好后，就需要向项目中添加 TCP 服务器相关的类文件，添加新类文件，在 `Base class` 后面设置继承的基类名称为 `QTcpSocket` ，勾选 `Include Object` 复选框，在 `Class name` 后面的文本框输入新建的新类名称 `TcpServerSocket` 。

添加新类文件后，打开新添加的头文件 `tcpserversocket.h` ，添加如下代码：

```C++
#ifndef TCPSERVERSOCKET_H
#define TCPSERVERSOCKET_H

#include <QObject>
#include <QTcpSocket>


class TcpServerSocket : public QTcpSocket
{
    Q_OBJECT
public:
    TcpServerSocket(QObject *parent);

signals:
    void updateServer(QString, int);
    void disconnected(int);

protected slots:
    void dataReceived();
    void slotDisconnected();


};

#endif // TCPSERVERSOCKET_H
```

打开类源文件 `tcpserversocket.cpp` ，添加代码如下：

```C++
#include "tcpserversocket.h"

#define RECVLENGTH    1024

TcpServerSocket::TcpServerSocket(QObject *parent)
{
    connect(this, SIGNAL(readyRead()), this, SLOT(dataReceived()));
    connect(this, SIGNAL(disconnect()), this, SLOT(slotDisconnected()));
}

void TcpServerSocket::dataReceived()
{
    while(bytesAvailable() > 0)
    {
        int length = bytesAvailable();
        char buf[RECVLENGTH];
        read(buf, RECVLENGTH);
        QString msg = QString(buf);
        emit updateServer(msg, length);
    }
}


void TcpServerSocket::slotDisconnected()
{
    emit disconnected(this->socketDescriptor());
}
```

上面构建的这个类作为最基本的客户端连接类对象使用，接下来需要添加服务器管理设计类，使用之前类似的方式进行类文件添加，添加类名 `TcpServer` 继承基类 `QTcpServer` ，添加类后，打开添加后的类文件 `tcpserver.h` ，添加代码如下：

```C++
#ifndef TCPSERVER_H
#define TCPSERVER_H

#include <QObject>
#include <QTcpServer>
#include <QList>
#include "tcpserversocket.h"

class TcpServer : public QTcpServer
{
    Q_OBJECT
public:
    TcpServer(QObject *parent, int port);
    QList<TcpServerSocket *> tcpServerSocketList;

signals:
    void updateServer(QString, int);
public slots:
    void updateClients(QString, int);
    void slotDistconnected(int);

protected:
    void incomingConnection(qintptr handle) override;

};

#endif // TCPSERVER_H
```

在向源文件 `tcpserver.cpp` 中添加以下代码：

```C++
#include "tcpserver.h"

TcpServer::TcpServer(QObject *parent, int port): QTcpServer(parent)
{
    listen(QHostAddress::Any, port);
}


//将连接成功的客户端保存下来
void TcpServer::incomingConnection(qintptr handle)
{
    TcpServerSocket *tcpserversocket = new TcpServerSocket(this);

    connect(tcpserversocket, SIGNAL(updateServer(QString, int)), this, SLOT(updateClients(QString, int)));
    connect(tcpserversocket, SIGNAL(disconnected(int)), this, SLOT(slotDistconnected(int)));

    tcpserversocket->setSocketDescriptor(handle);
    tcpServerSocketList.append(tcpserversocket);
}

void TcpServer::updateClients(QString msg, int length)
{
    emit updateServer(msg, length);
    for(int i = 0; i < tcpServerSocketList.count(); i++)
    {
        TcpServerSocket *item = tcpServerSocketList.at(i);
        if(item->write(msg.toLatin1(), length) != length)
        {
            continue;
        }
    }
}

void TcpServer::slotDistconnected(int descriptor)
{
    for(int i = 0; i < tcpServerSocketList.count(); i++)
    {
        TcpServerSocket *item = tcpServerSocketList.at(i);
        if(item->socketDescriptor() == descriptor)
        {
            tcpServerSocketList.removeAt(i);
            return ;
        }
    }
    return ;
}
```

在设计完服务管理类后，向主界面类中添加对应的成员变量和相关事件关联，打开 `mainwidget.h` 头文件，向类中添加如下代码：

```C++
...
#include "tcpserver.h"

class mainWidget : public QWidget
{
    Q_OBJECT
    ...
public slots:
    void slotCreateServer();
    void slotQuit();
    void slotClose();
    void updateServer(QString, int);

private:
    ...
    int         port;
    TcpServer   *server;

};
#endif // MAINWIDGET_H
```

然后在源文件 `mainwidget.cpp` 中添加对应的变量初始化和函数实现，具体如下：

```C++
#include "mainwidget.h"

mainWidget::mainWidget(QWidget *parent)
    : QWidget(parent)
{
    setWindowTitle(tr("TCP Server"));

    ContentListWidegt = new QListWidget;
    PortLabel = new QLabel(tr("Port:"));
    PortLineEdit = new QLineEdit;
    PortLineEdit->setInputMask("9999");
    CreateBtn = new QPushButton(tr("Create Room"));
    QuitBtn = new QPushButton(tr("Quit Room"));
    CloseBtn = new QPushButton(tr("Close"));

    //布局
    mainLayout = new QGridLayout(this);
    mainLayout->addWidget(ContentListWidegt, 0, 0, 1, 2);
    mainLayout->addWidget(PortLabel, 1, 0);
    mainLayout->addWidget(PortLineEdit, 1, 1);
    mainLayout->addWidget(CreateBtn, 2, 0);
    mainLayout->addWidget(QuitBtn, 2, 1);
    mainLayout->addWidget(CloseBtn, 3, 0, 1, 2);

    port = 8888;
    PortLineEdit->setText(QString::number(port));
    connect(CreateBtn, SIGNAL(clicked()), this, SLOT(slotCreateServer()));
    connect(QuitBtn, SIGNAL(clicked()), this, SLOT(slotQuit()));
    connect(CloseBtn, SIGNAL(clicked()), this, SLOT(slotClose()));
    CreateBtn->setEnabled(true);
    QuitBtn->setEnabled(false);
    CloseBtn->setEnabled(true);
}

mainWidget::~mainWidget()
{
}

void mainWidget::slotCreateServer()
{
    server = new TcpServer(this, port);
    connect(server, SIGNAL(updateServer(QString, int)), this, SLOT(updateServer(QString, int)));
    CreateBtn->setEnabled(false);
    QuitBtn->setEnabled(true);
}

void mainWidget::updateServer(QString msg, int length)
{
    ContentListWidegt->addItem(msg.left(length));
}

void mainWidget::slotQuit()
{
    server->close();
    CreateBtn->setEnabled(true);
}

void mainWidget::slotClose()
{
    close();
}
```

若编译时出现warning，可以在`.pro`文件中添加：

```C++
CONFIG += c++11
```

### 构建客户端程序

设计与之对应的客户端显示界面，如下图所示：

![avatar](/blog/assets/img/415d208d9433.png)

首先，创建 Qt 工程 `TcpClientDemo`。

同样，在项目文件 `TcpClientDemo.pro` 中添加如下内容：

```C++
QT += network
```

首先添加界面控件的相关代码，打开主界面类的头文件 `mainwidget.h` ，添加如下代码：

```C++
#ifndef MAINWIDGET_H
#define MAINWIDGET_H

#include <QWidget>
#include <QListWidget>
#include <QPushButton>
#include <QLineEdit>
#include <QLabel>
#include <QGridLayout>
#include <QHostAddress>
#include <QTcpSocket>

class mainWidget : public QWidget
{
    Q_OBJECT

public:
    mainWidget(QWidget *parent = 0);
    ~mainWidget();

public slots:
    void slotEnter();
    void slotConnected();
    void slotDisconnected();
    void dataReceived();
    void slotSend();

private:
    QListWidget *contentListWidget;
    QLineEdit   *sendLineEdit;
    QPushButton *sendBtn;
    QLabel      *userNameLabel;
    QLineEdit   *userNameLineEdit;
    QLabel      *serverIpLabel;
    QLineEdit   *serverIpLineEdit;
    QLabel      *portLabel;
    QLineEdit   *portLineEdit;
    QPushButton *enterBtn;
    QGridLayout *mainLayout;

    bool        status;
    int         port;
    QHostAddress    *serverIp;
    QString         userName;
    QTcpSocket      *tcpsocket;
};
#endif // MAINWIDGET_H
```

打开 `mainwidget.cpp` 源文件，添加如下代码：

```C++
#include "mainwidget.h"
#include <QMessageBox>
#include <QHostInfo>
#include <QDebug>

mainWidget::mainWidget(QWidget *parent)
    : QWidget(parent)
{
    setWindowTitle(tr("Tcp Client"));
    contentListWidget = new QListWidget;
    sendLineEdit = new QLineEdit;
    sendBtn = new QPushButton(tr("Send"));
    userNameLabel = new QLabel(tr("Name:"));
    userNameLineEdit = new QLineEdit;
    serverIpLabel = new QLabel(tr("Server Ip:"));
    serverIpLineEdit = new QLineEdit;
    portLabel = new QLabel(tr("Port:"));
    portLineEdit = new QLineEdit;
    portLineEdit->setInputMask("9999");
    enterBtn = new QPushButton(tr("Enter"));

    //总体布局
    mainLayout = new QGridLayout(this);
    mainLayout->addWidget(contentListWidget, 0 , 0, 1, 2);
    mainLayout->addWidget(sendLineEdit, 1, 0);
    mainLayout->addWidget(sendBtn, 1, 1);
    mainLayout->addWidget(userNameLabel, 2, 0);
    mainLayout->addWidget(userNameLineEdit, 2, 1);
    mainLayout->addWidget(serverIpLabel, 3, 0);
    mainLayout->addWidget(serverIpLineEdit, 3, 1);
    mainLayout->addWidget(portLabel, 4, 0);
    mainLayout->addWidget(portLineEdit, 4, 1);
    mainLayout->addWidget(enterBtn, 5, 0);

    status = false;
    port = 8010;
    portLineEdit->setText(QString::number(port));
    serverIp = new QHostAddress();

    connect(enterBtn, SIGNAL(clicked()), this, SLOT(slotEnter()));
    connect(sendBtn, SIGNAL(clicked()), this, SLOT(slotSend()));
    sendBtn->setEnabled(false);

}

mainWidget::~mainWidget()
{
}

void mainWidget::slotEnter()
{
    if(!status)
    {
        //完成输入合法性检验
        QString ip = serverIpLineEdit->text();
        if(!serverIp->setAddress(ip))
        {
            QMessageBox::information(this, tr("error"), tr("Server ip address error!"));
            return;
        }
        if(userNameLineEdit->text() == "")
        {
            QMessageBox::information(this, tr("error"), tr("User name error!"));
            return;
        }
        //获取端口
        port = portLineEdit->text().toInt();
        userName = userNameLineEdit->text();

        //创建一个 QTcpSocket 对象，将信号和槽关联起来
        tcpsocket = new QTcpSocket(this);
        connect(tcpsocket, SIGNAL(connected()), this, SLOT(slotConnected()));
        connect(tcpsocket, SIGNAL(disconnected()), this, SLOT(slotDisconnected()));
        connect(tcpsocket, SIGNAL(readyRead()), this, SLOT(dataReceived()));
        tcpsocket->connectToHost(*serverIp, port);
        status = true;
    }
    else {
        int length = 0;
        QString msg = userName + tr(": Leave Chat Room!");
        if((length = tcpsocket->write(msg.toLatin1(), msg.length())) != msg.length())
        {
            qDebug() << "length error!";
            return;
        }
        tcpsocket->disconnectFromHost();
        status = false;
    }
}

void mainWidget::slotConnected()
{
    sendBtn->setEnabled(true);
    enterBtn->setText(tr("Quit"));
    int length = 0;
    QString msg = userName + tr(": Enter Chat Room!");
    if((length = tcpsocket->write(msg.toLatin1(), msg.length())) != msg.length())
    {
        //发送信息不完全，不作处理
        return;
    }
}

void mainWidget::slotSend()
{
    if(sendLineEdit->text() == "")
    {
        //发送消息为空
        return ;
    }
    QString msg = userName + tr(" : ") + sendLineEdit->text();
    tcpsocket->write(msg.toLatin1(), msg.length());
    sendLineEdit->clear();
}

void mainWidget::slotDisconnected()
{
    sendBtn->setEnabled(false);
    enterBtn->setText(tr("Enter Chat Room"));
}

void mainWidget::dataReceived()
{
    //处理接收数据
    while (tcpsocket->bytesAvailable() > 0) {
        //有效数据
        QByteArray datagram;
        datagram.resize(tcpsocket->bytesAvailable());
        tcpsocket->read(datagram.data(), datagram.size());
        QString msg = datagram.data();
        contentListWidget->addItem(msg.left(datagram.size()));
    }
}
```

构建运行项目。

### 服务端和客户端同时执行

在 TCP 服务端和 TCP 客户端程序都构建完成后，进入构建完成后的可执行文件目录下。

首先运行 TCP 服务端程序，在终端界面中进入可执行目录，并执行。

此时，TCP 服务器已经在运行了，以同样的方式启动 TCP 客户端程序。需要注意，网络聊天室就是多人的聊天应用，所以需要启动多个客户端程序来进行试验，在执行命令后使用 `&` 将程序放入后台运行。

接下来，将三个客户端分别填写需要的信息，因为是本机，所以通信地址统一使用本地环回地址 `127.0.0.1` ，服务端监听端口为 `8888` ，具体如下（需要先点击服务端 Server 中的 `Create Room` 按钮创建房间，然后客户端 Client 才能加入房间）。

可以看到，已经能够正式使用聊天室的功能了，多个客户端之间都可以同时发送消息并且接收对方的消息了。

