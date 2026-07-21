---
title: Qt5网络通信——UDP网络聊天室
categories:
  - 技术
  - C++
tags:
  - Qt
  - UDP
  - Socket
abbrlink: 23398
date: 2021-06-16 01:44:38
description:
---

### 服务端程序构建

下面是设计服务端的显示界面，实际上作为网络聊天室的服务端是不需要界面的，但为了方便我们实验调试和使用，这里设计如下界面：

![avatar](/assets/img/948c4f300f38.png)

可以看出，服务端的界面实际上主要用来显示当前客户端链接状态以及对服务端启动、停止、更改 IP 端口等管理操作。

首先，创建 Qt 工程 `UdpServerDemo` 。

因为需要用到网络通信的模块功能，所以打开 `UdpServerDemo.pro` 工程文件，添加如下内容：

```C++
QT += network
```

为了方便进行网络通信，设计数据通信使用的数据结构体，需要添加新的头文件 `base.h` 。

此时，项目中添加了一个新文件 `base.h` ，添加代码如下：

```C++
#ifndef BASE_H
#define BASE_H

#define     N   128

enum MsgKey{
    LOGIN,      //登录消息
    CHAT,       //正常发送信息
    QUIT        //退出消息
};

typedef struct{
    int key;
    char name[N];
    char data[N];
}MSG_t;


#endif // BASE_H
```

接下来，打开主界面头文件 `mainwidget.h` ，添加如下代码：

```C++
#ifndef MAINWIDGET_H
#define MAINWIDGET_H

#include <QWidget>
#include <QTextEdit>
#include <QLabel>
#include <QLineEdit>
#include <QVBoxLayout>
#include <QPushButton>
#include <QUdpSocket>
#include <QTimer>
#include <QList>
#include <QVector>
#include <QHostAddress>
#include "base.h"

class mainWidget : public QWidget
{
    Q_OBJECT

public:
    mainWidget(QWidget *parent = 0);
    ~mainWidget();
    int msgProcess(MSG_t &msg, QHostAddress &recvAddres, int recvPort);       //消息处理
    void doLogin(MSG_t &msg, QHostAddress &recvAddres, int recvPort); //处理登录信息
    void doChat(MSG_t &msg, QHostAddress &recvAddres, int recvPort);  //处理正常消息
    void doQuit(MSG_t &msg, QHostAddress &recvAddres, int recvPort);  //处理退出信息
    void sendMsg(QString &sendmsg); //向当前所有客户端发送消息 sendmsg
    bool isInList(QHostAddress &recvAddres, int recvPort); //判断当前是否已有该客户端在聊天室列表中，存在返回 true, 不存在返回 false

public slots:
    void closeBtnClicked();
    void msgRecv(); //UDP 接收到数据处理

private:
    QLabel      *MsgLabel;  //消息框标签
    QTextEdit   *MsgEdit;   //消息框
    QPushButton *closeBtn;
    QVBoxLayout *mainLayout;

    MSG_t     recvMsg;
    struct ClientAdressPort{
        QHostAddress adress;
        int port;
    };

    QList<ClientAdressPort *> *ClientList;  //存放客户端信息容器
    QList<ClientAdressPort *>::iterator it; //遍历操作迭代器对象

    int port;
    QUdpSocket *udpSocket;
    QTimer      *timer;
};
#endif // MAINWIDGET_H
```

然后在源文件 `mainwidget.cpp` 中实现界面初始化及关联事件的实现代码，注意这里对网络服务操作的相关代码部分，具体如下：

```C++
#include "mainwidget.h"
#include <QHostAddress>
#include <QMessageBox>
#include <QDebug>

mainWidget::mainWidget(QWidget *parent)
    : QWidget(parent)
{
    setWindowTitle(tr("UDP Server"));

    MsgLabel = new QLabel(tr("Msg :"), this);
    MsgEdit = new QTextEdit(this);
    closeBtn = new QPushButton(tr("Close"), this);

    mainLayout = new QVBoxLayout(this);
    mainLayout->addWidget(MsgLabel);
    mainLayout->addWidget(MsgEdit);
    mainLayout->addWidget(closeBtn);

    connect(closeBtn, SIGNAL(clicked()), this, SLOT(closeBtnClicked()));

    //创建并初始化客户端地址信息链表容器。
    ClientList = new QList<ClientAdressPort *>;
    ClientList->clear();

    port = 8888;    //初始化绑定端口数据
    udpSocket = new QUdpSocket(this);

    connect(udpSocket, SIGNAL(readyRead()), this, SLOT(msgRecv()));

    bool result = udpSocket->bind(port);
    if(!result)
    {
        //端口绑定失败，弹出消息框，通常失败原因是当前绑定的端口被占用。
        QMessageBox::information(this, tr("error"), tr("udp socket create error!"));
        return ;
    }

}

mainWidget::~mainWidget()
{
}

void mainWidget::closeBtnClicked()
{
    close();
}


void mainWidget::sendMsg(QString &sendmsg)
{
    if(ClientList->isEmpty())
    {
        qDebug() << "current not client!";
        return;
    }
    for(it = ClientList->begin(); it != ClientList->end(); ++it)
    {
        udpSocket->writeDatagram(sendmsg.toLatin1(), sendmsg.length(), (*it)->adress, (*it)->port);
    }
}

void mainWidget::msgRecv()
{
    QHostAddress recvAddress;
    int recvPort = 0;
    int ret = 0;
    while(udpSocket->hasPendingDatagrams())
    {
        ret = udpSocket->readDatagram((char *)&recvMsg, (qint64)sizeof(recvMsg), &recvAddress, (quint16 *)&recvPort);
        if(ret < 0)
        {
            //recv error
            memset(&recvMsg, 0, sizeof(recvMsg));
            return;
        }
        msgProcess(recvMsg, recvAddress, recvPort);
    }
}

bool mainWidget::isInList(QHostAddress &recvAddres, int recvPort)
{
    if(ClientList->isEmpty())
    {
        return false;
    }
    for(it = ClientList->begin(); it != ClientList->end(); ++it)
    {
        if((*it)->adress == recvAddres && (*it)->port == recvPort)
        {
            return true;
        }
    }
    return false;
}

int mainWidget::msgProcess(MSG_t &msg, QHostAddress &recvAddres, int recvPort)
{
    QString textString;
    switch (msg.key) {
    case LOGIN:
        doLogin(msg, recvAddres, recvPort);
        textString = QString(tr("Login: %1 ")).arg(msg.name);
        break;
    case CHAT:
        doChat(msg, recvAddres, recvPort);
        textString = QString(tr("chat: %1 : %2")).arg(msg.name).arg(msg.data);
        break;
    case QUIT:
        doQuit(msg, recvAddres, recvPort);
        textString = QString(tr("quit: %1 ")).arg(msg.name);
        break;
    default:
        //出错
        qDebug() << "recv msg key error!";
        MsgEdit->append(tr("recv msg key error!"));
        return -1;
    }
    MsgEdit->append(textString);
    return  0;
}

void mainWidget::doLogin(MSG_t &msg, QHostAddress &recvAddres, int recvPort)
{
    ClientAdressPort *client = new ClientAdressPort;
    client->adress = recvAddres;
    client->port = recvPort;
    ClientList->append(client);

    QString WelcomMsg = QString("Welcome %1 !").arg(msg.name);
    //向所有用户发送 欢迎消息
    sendMsg(WelcomMsg);
    MsgEdit->append(WelcomMsg);
}

void mainWidget::doChat(MSG_t &msg, QHostAddress &recvAddres, int recvPort)
{
    if(!isInList(recvAddres, recvPort))
    {
        qDebug() << "client not login!";
        QString errMsg = QString("Sorry, You are not login!");
        udpSocket->writeDatagram(errMsg.toLatin1(), errMsg.length(), recvAddres, recvPort);
        return ;
    }
    QString sendmsg = QString("%1 :").arg(msg.name) + QString(msg.data);
    sendMsg(sendmsg);
    MsgEdit->append(sendmsg);
}

void mainWidget::doQuit(MSG_t &msg, QHostAddress &recvAddres, int recvPort)
{
    if(!isInList(recvAddres, recvPort))
    {
        qDebug() << "client not login!";
        QString errMsg = QString("Sorry, You are not login!");
        udpSocket->writeDatagram(errMsg.toLatin1(), errMsg.length(), recvAddres, recvPort);
        return ;
    }
    QString sendmsg = QString("%1 quit chat!").arg(msg.name);
    sendMsg(sendmsg);
    MsgEdit->append(sendmsg);

    //遍历，去掉其中的退出客户端信息
    for(it = ClientList->begin(); it != ClientList->end(); ++it)
    {
        if( recvAddres == ((*it)->adress) && recvPort == ((*it)->port))
        {
            ClientAdressPort *quitClient = ClientList->at(it - ClientList->begin());
            ClientList->removeOne(*it);
            delete quitClient;
        }
    }
}
```

其中：

- `udpSocket = new QUdpSocket(this);` 创建一个 udpsocket 连接对象，此时仅仅创建了 socket 网络套接字操作对象，并没有进行任何的 UDP 网络操作。
- `bool result = udpSocket->bind(port);` 将创建好的 socket 与端口绑定。此时进行 UDP 消息发送和接收时都是通过该端口进行。
- `connect(udpSocket, SIGNAL(readyRead()), this, SLOT(msgRecv()));` 将 `udpSocket` 对象中的接收消息信号 `readyRead()` 和处理消息槽函数 `msgRecv()`进行关联，这样在服务器接收到 `8888` 端口的 UDP 网络数据时就会触发信号进而 `msgRecv()` 进行具体处理。
- `udpSocket->hasPendingDatagrams()` QUdpSocket 类成员函数 `hasPendingDatagrams()` 用来判断当前是否有缓存的接收数据。
- `udpSocket->readDatagram((char *)&recvMsg, (qint64)sizeof(recvMsg), &recvAddress, (quint16 *)&recvPort);` QUdpSocket 类成员函数 `readDatagram()` 用来读取当前接收到的缓存数据，第三个参数和第四个参数可以接收到发送数据方的 IP 地址及端口信息，这样就可以提取对方信息进行消息回复，因为 UDP 通信是不建立连接的，所以只有知道对方的通信地址信息才能正常发送数据。
- `udpSocket->writeDatagram(sendmsg.toLatin1(), sendmsg.length(), (*it)->adress, (*it)->port);` QUdpSocket 类成员函数 `writeDatagram()` 用来发送数据，需要提供接收方的 IP 地址及端口号信息。
- 在本实例中，采用 `QList` 链表容器存储客户端通信地址信息，方便处理操作。

以上都编写完成后，构建运行程序，如果编程出现以下错误，是因为在项目文件 `UdpServerDemo.pro` 中没有在 QT 中添加 `network` 。修改成 `QT += core gui network` 后再次编译即可。

### 客户端程序构建

接下来就需要设计客户端界面，客户端的主要任务就是在与服务器进行链接后能够发送文字消息并且将从服务器返回的消息进行显示，所以客户端设计成如下界面：

![avatar](/assets/img/c3304ba7b145.png)

首先，创建 Qt 工程 `UdpClientDemo`。

此时，完成项目工程的创建后，在 `UdpClientDemo.pro` 工程文件同样添加上 `QT += network` ，并且添加与服务端进行数据通信使用的数据结构体定义文件 `base.h` ，参考服务端添加步骤进行添加，内容一致如下：

```C++
#ifndef BASE_H
#define BASE_H

#define     N   128

enum MsgKey{
    LOGIN,      //登录消息
    CHAT,       //正常发送信息
    QUIT        //退出消息
};

typedef struct{
    int key;
    char name[N];
    char data[N];
}MSG_t;


#endif // BASE_H
```

接下来打开主界面头文件 `mainwidget.h` ，添加如下代码：

```C++
#ifndef MAINWIDGET_H
#define MAINWIDGET_H

#include <QWidget>
#include <QTextEdit>
#include <QLabel>
#include <QLineEdit>
#include <QVBoxLayout>
#include <QHBoxLayout>
#include <QPushButton>
#include <QUdpSocket>
#include <QHostAddress>
#include <QTimer>
#include "base.h"


class mainWidget : public QWidget
{
    Q_OBJECT

public:
    mainWidget(QWidget *parent = 0);
    ~mainWidget();

public slots:
    void CloseBtnClicked();
    void dataRecv();
    void doLogin();
    void doChat();
    void doQuit();

private:
    QTextEdit   *ReceiveTextEdit;
    QLineEdit   *SendLineEdit;

    QLabel      *nameLabel;
    QLineEdit   *nameLineEdit;
    QLabel      *portLabel;
    QLineEdit   *portLineEdit;
    QLabel      *ServerAddressLabel;
    QLineEdit   *ServerAddressLineEdit;
    QLabel      *ServerPortLabel;
    QLineEdit   *ServerPortLineEdit;

    QPushButton *LoginBtn;
    QPushButton *ChatBtn;
    QPushButton *QuitBtn;
    QPushButton *CloseBtn;
    QHBoxLayout *mainLayout;


    QHostAddress    ServerAddress;
    int             Serverport;

    int             Clientport;
    MSG_t sendmsg;

    QUdpSocket *udpSocket;
};
#endif // MAINWIDGET_H
```

然后在源文件 `mainwidget.cpp` 中实现界面初始化及关联事件的实现代码，注意这里对网络服务操作的相关代码部分，具体如下：

```C++
#include "mainwidget.h"
#include <QMessageBox>
#include <QThread>
#include <QDebug>

mainWidget::mainWidget(QWidget *parent)
    : QWidget(parent)
{
    setWindowTitle(tr("UDP Client"));

    //左侧布局
    ReceiveTextEdit = new QTextEdit(this);
    ChatBtn = new QPushButton(tr("Chat"), this);
    SendLineEdit = new QLineEdit();
    QGridLayout *left = new QGridLayout();
    left->addWidget(ReceiveTextEdit, 0, 0, 4, 4);
    left->addWidget(SendLineEdit, 4, 0, 1, 3);
    left->addWidget(ChatBtn, 4, 3, 1, 1);


    //右侧布局
    nameLabel = new QLabel(tr("Name:"));
    nameLineEdit = new QLineEdit();
    portLabel = new QLabel(tr("MyPort:"));
    portLineEdit = new QLineEdit();
    portLineEdit->setInputMask("9999");
    ServerAddressLabel = new QLabel(tr("Server Address:"));
    ServerAddressLineEdit = new QLineEdit();
    ServerAddressLineEdit->setInputMask("000.000.000.000;");
    ServerPortLabel = new QLabel(tr("Server Port:"));
    ServerPortLineEdit = new QLineEdit();
    ServerPortLineEdit->setInputMask("9999");
    LoginBtn = new QPushButton(tr("Login"));
    QuitBtn = new QPushButton(tr("Quit"));
    CloseBtn = new QPushButton(tr("Close"));
    QGridLayout *right = new QGridLayout();
    right->addWidget(nameLabel, 0, 0);
    right->addWidget(nameLineEdit, 0, 1);
    right->addWidget(portLabel, 1, 0);
    right->addWidget(portLineEdit, 1, 1);
    right->addWidget(ServerAddressLabel, 2, 0);
    right->addWidget(ServerAddressLineEdit, 2, 1);
    right->addWidget(ServerPortLabel, 3, 0);
    right->addWidget(ServerPortLineEdit, 3, 1);
    right->addWidget(LoginBtn, 4, 0);
    right->addWidget(QuitBtn, 4, 1);
    right->addWidget(CloseBtn, 5, 0, 1, 2);

    //总体布局
    mainLayout = new QHBoxLayout(this);
    mainLayout->addLayout(left);
    mainLayout->addLayout(right);

    connect(CloseBtn, SIGNAL(clicked()), this, SLOT(CloseBtnClicked()));
    connect(LoginBtn, SIGNAL(clicked()), this, SLOT(doLogin()));
    connect(QuitBtn, SIGNAL(clicked()), this, SLOT(doQuit()));
    connect(ChatBtn, SIGNAL(clicked()), this, SLOT(doChat()));

    //初始化各个按键
    LoginBtn->setEnabled(true);
    CloseBtn->setEnabled(true);
    ChatBtn->setEnabled(false);
    QuitBtn->setEnabled(false);
    portLineEdit->setText(tr("5555"));
    ServerAddressLineEdit->setText(tr("127.0.0.1"));
    ServerPortLineEdit->setText(tr("8888"));


}

mainWidget::~mainWidget()
{
}

void mainWidget::CloseBtnClicked()
{
    close();
}

void mainWidget::dataRecv()
{
    while(udpSocket->hasPendingDatagrams())
    {
        QByteArray datagram;
        datagram.resize(udpSocket->pendingDatagramSize());
        udpSocket->readDatagram(datagram.data(), datagram.size());

        QString msg = datagram.data();
//        ReceiveTextEdit->insertPlainText(msg);
        ReceiveTextEdit->append(msg);
    }
}

void mainWidget::doLogin()
{
    if(ServerPortLineEdit->text().isEmpty() || ServerAddressLineEdit->text().isEmpty())
    {
        QMessageBox::information(this, tr("error"), tr("Server infomation is NULL!"));
        return ;
    }
    ServerAddress = QHostAddress(ServerAddressLineEdit->text());
    Serverport = ServerPortLineEdit->text().toInt();
    if(portLineEdit->text().isEmpty())
    {
        QMessageBox::information(this, tr("error"), tr("My Port infomation is NULL!"));
        return ;
    }
    Clientport = portLineEdit->text().toInt();

    if(nameLineEdit->text().isEmpty())
    {
        QMessageBox::information(this, tr("error"), tr("My Name infomation is NULL!"));
        return ;
    }

    //发送注册登录信息
    udpSocket = new QUdpSocket(this);
    connect(udpSocket, SIGNAL(readyRead()), this, SLOT(dataRecv()));
    bool result = udpSocket->bind(Clientport);
    if(!result)
    {
        QMessageBox::information(this, tr("error"), tr("udp socket create error!"));
        return ;
    }
    LoginBtn->setEnabled(false);
    QuitBtn->setEnabled(true);
    ChatBtn->setEnabled(true);
    memcpy(sendmsg.name, nameLineEdit->text().toLatin1(), nameLineEdit->text().length());
    sendmsg.key = LOGIN;

    //发送给服务器
    qDebug() << "send Login data!";
    udpSocket->writeDatagram((char *)&sendmsg, sizeof(sendmsg), ServerAddress, Serverport);
}

void mainWidget::doChat()
{
    if(SendLineEdit->text().isEmpty())
    {
        QMessageBox::information(this, tr("error"), tr("Send Msg is NULL!"));
        return ;
    }
    sendmsg.key = CHAT;
    memset(sendmsg.data, 0, sizeof(sendmsg.data));
    memcpy(sendmsg.data, SendLineEdit->text().toLatin1(), SendLineEdit->text().length());

    //发送给服务器
    qDebug() << "send Login data!";
    udpSocket->writeDatagram((char *)&sendmsg, sizeof(sendmsg), ServerAddress, Serverport);
}

void mainWidget::doQuit()
{
    sendmsg.key = QUIT;
    memset(sendmsg.data, 0, sizeof(sendmsg.data));

    //发送给服务器
    qDebug() << "send Login data!";
    udpSocket->writeDatagram((char *)&sendmsg, sizeof(sendmsg), ServerAddress, Serverport);

    //等待服务端做出反馈后再显示到画面上
    QThread::msleep(500);
    QuitBtn->setEnabled(false);
    ChatBtn->setEnabled(false);
    LoginBtn->setEnabled(true);
    udpSocket->close();
}
```

其中：

- `QUdpSocket` 操作流程与服务器类似，因为在 UDP 通信中不建立连接，所以客户端和服务端进行消息发送和接收操作类似。
- 需要注意在 `doQuit()` 退出聊天室函数中，完成消息发送和界面响应后需要调用 `udpSocket->close();` 关闭当前已经绑定端口的 udpSocket 对象。如果不关闭的话，当前端口依然会被占用，当再次调用 `udpSocket->bind(Clientport);` 就会因为端口不可用而失败。

### 服务端与客户端同时执行

在 UDP 服务端和 UDP 客户端程序都构建完成后，进入构建完成后的可执行文件目录下。

首先运行 UDP 服务端程序，在终端界面中进入可执行目录，并执行。

此时，UDP 服务器已经在运行了，以同样的方式启动 UDP 客户端程序。需要注意，网络聊天室就是多人的聊天应用，所以需要启动多个客户端程序来进行试验，需要在执行命令后使用 `&` 将程序放入后台运行。

接下来，将三个客户端分别填写需要的信息，因为是本机，所以通信地址统一使用本地环回地址 `127.0.0.1` ，服务端监听端口为 `8888` ，客户端端口可以随意设置，但是不要使用当前已经被使用的端口。

可以看到，已经能够正式使用聊天室的功能了，多个客户端之间都可以同时发送消息并且接收对方的消息了。
