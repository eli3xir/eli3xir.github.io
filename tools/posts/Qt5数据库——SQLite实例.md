---
title: Qt5数据库——SQLite实例
categories:
  - 技术
  - C++
tags:
  - Qt
  - SQLite
  - 数据库
abbrlink: 10886
date: 2021-05-22 20:18:36
description:
---

## 数据库基本概念

### 数据和数据库

利用计算机进行数据处理，首先需要将信息以数据形式存储到计算机中，而数据是可以被计算机接收和处理的符号，所以根据数据信息的不同，可以将数据分为不同的种类，如数字、文字、图片、表格、音频等等。

数据库 `DataBase` ，其实就是存放数据的仓库，主要特点是将数据按照数据模型组织分类，是高度结构化的，同一个数据库可以供多个用户共享并且具有一定的安全性。

实际开发中用到的数据库几乎都是关系型的，而关系型数据库就是按照二维表结构方式组织的数据集合，二维表是由行和列组成的，表的行称为元组，列称为属性，对表的操作称为关系运算，主要的关系运算有投影、选择和连接等等。

### 数据库管理系统

数据库管理系统 `DBMS(DataBase Management System)` ，是位于用户应用程序和操作系统之间的数据库管理系统软件，主要功能就是组织、存储和管理数据，使得能够高效访问和维护数据，即提供数据定义、数据操作、数据控制和数据维护等功能。常用到的数据库管理系统有 `Oracle` 、 `Microsoft SQL Server` 和 `MySQL`等。

在实际应用中，数据库系统通常分为桌面型和网络型两类：

桌面型数据库系统是指：只在本机运行、不与其它计算机交换数据的系统，常用于小型信息管理系统，这类数据库系统的典型代表是 VFP 和 Access 。

网络型数据库系统是指：能够通过计算机网络进行数据共享和交换的系统，常用于构建较复杂的 C/S 结构或 B/S 结构的分布式应用系统，大多数数据库系统均属于此类，如 `Oracle` 、`Microsoft SQL Server` 等。

### 结构化查询语言 SQL

目前，许多关系型数据库供应商都在自己的数据库中支持 SQL 语言，如 Access 、 MySQL 、 Oracle 和 Microsoft SQL Server 等，其中大部分数据库遵守的是 SQL-89 标准。 SQL 语言由以下三部分组成：

- **数据定义语言** `Data Description Language, DDL` ，用于执行数据库定义的任务，对数据库及数据库中的各种对象进行创建、删除和修改等操作。数据库对象主要包括表、默认约束、规则、视图、触发器和存储过程等。
- **数据操作语言** `Data Manipulation Language, DML` ，用于操作数据库中各种对象，检索和修改数据。
- **数据控制语言** `Data Control Language, DCL` ，用于安全管理，确定哪些用户可以查看或修改数据库中的数据。

### 表和视图

**表**：

- **表结构**：每个数据库包含若干个表，每个表又具有一定的结构，称为表的 “型”。表型也就是指组成表的各列的名称和数据类型。
- **记录**：每个表包含若干行数据，这些都是表的值，表中一行数据称为一条记录，所以表也是记录的有限集合。
- **字段**：每条记录由若干个数据项构成，将构成记录的每个数据项称为字段。字段包含的属性有字段名、字段数据类型、字段长度以及是否为关键字等等。
- **关键字**：若表中记录的某一字段或字段组合能够唯一标志记录，则称该字段或字段组合为候选关键字。若一个表有多个候选关键字，则选定其中一个为主关键字，也称为主键；当一个表仅有唯一的一个候选关键字时，该候选关键字就是主关键字。

**视图**：

- 视图是从一个或多个表导出的表。

视图与表不同，它是一个续表，即视图所对应的数据不进行实际存储，数据库中只存储视图的定义。对视图的数据进行操作时，系统根据视图的定义操作与视图相关联的基本表。视图一经定义后，就可以像表一样被查询、修改、删除和更新。使用视图具有便于数据共享、简化用户权限管理和屏蔽数据库的复杂性等优点。

## 常用SQL命令

### SELECT 数据查询

`SELECT` 查询是 SQL 语言的核心，与 SQL 子句结合，可以完成各类复杂的查询操作。在数据库应用中，最常用的操作就是查询操作。完备的 `SELECT` 语句很复杂，主要子句如下：

```sql
SELECT [DISTINCT] [别名.] 字段名或表达式 [AS 列标题] \
FROM table_soruce \
[WHERE search_condition] \
[GROUP BY group_by_expression] \
[ORDER BY order_expression [ASC | DESC]]
```

其中：

- `SELECT` 语句和 `FROM` 语句是必不可少的。
- `WHERE` 语句定义了查询条件，且 `WHERE` 子句必须紧跟 `FROM` 子句之后，基本格式为：`WHERE <search_condition>` 。
- `GROUP BY` 子句和 `ORDER BY` 子句分别对查询结果分组和排序。

### 数据操作

#### `INSERT` 插入数据语句

`INSERT` 语句可以添加一条或多条记录到一个表中。它有两种语法形式：

```SQL
INSERT INTO target [IN externaldatabase] (fields_list) \
{DEFAULT VALUES | VALUES(DEFAULT | expression_list)}

INSERT INTO target [IN externaldatabase] fields_list \
{SELECT ...| EXECUTE ...}
```

其中：

- `target` 是要插入记录的表或视图的名称， `externaldatabase` 是外部数据库的路径和名称。
- `expression_list` 是需要插入的字段值表达式列表，其个数应与记录的字段个数一致，若指定要插入值的字段 `fields_list` ，则应与 `field_list` 的字段个数一致。

#### `DELETE` 删除语句

`DELETE` 用于从一个或多个表中删除记录，其语法格式如下：

```SQL
DELETE FROM table_names [WHERE ...]
```

#### `UPDATE` 更新数据语句

`UPDATE` 语句用于更新表中的记录，其基本语法格式如下：

```SQL
UPDATE table_name \
SET field_1=expression_1[,Field_2=expression_2...] \
[FROM table1_name | view1_name[, table2_name | view2_name...]] \
[WHERE ...]
```

其中：

- `Field` 是需要更新的字段，而 `expression` 表示要更新字段的新值表达式。

## Qt5数据库操作

### QtSql模块

Qt 提供的 QtSql 模块实现了对数据库的访问，同时提供了一套与平台和具体所用数据库均无关的调用接口。 Qt 的这个模块为不同层次的用户提供了丰富多样的数据库操作类：

- 对于习惯使用 SQL 语法的用户，可以直接通过 `QSqlQuery` 类提供的方式执行任意的 SQL 语句来操作数据库；
- 对于习惯使用较高层数据库接口而希望避免 SQL 语句的用户， Qt 中的 `QSqlTableModel` 和 `QSqlRelationalTableModel` 类则提供了合适的抽象调用方式。

除了调用大型的通用数据库，Qt 还提供了一种进程内数据库 SQLite ，这是一个轻量级数据库，无需额外的安装配置并且支持大部分的 `ANSI SQL92` 标准。对于通用大型数据库在 Qt 中的使用与小型数据库方法类似，以下是Qt数据库的具体操作。

### 创建终端Qt工程

使用数据库的实例只需要用到终端输出就可以，所以就选择创建一个终端输出的项目，创建 Qt 工程 `SqliteDemo` ，创建步骤如下：

- 打开 `QtCreator` 开发环境界面，进行新项目创建，选择 `New Project` 选项
- 左边选择 `Appliction` ，然后选择 `Qt Console Application` 进行项目创建
- 添加项目名称为 `SqliteDemo` ，选择项目存放路径
- 选择项目编译工具链（全选即可）

最后项目创建完成，但是还需要在工程中添加数据库。



Qt 使用 SQLite 需要在 `SqliteDemo.pro` 项目文件中添加：

```
QT += core sql
```

### 测试代码

打开 `main.cpp` 文件，添加如下代码：

```cpp
#include <QCoreApplication>
#include <QTextCodec>
#include <QtSql/QSqlDatabase>
#include <QtSql/QSqlQuery>
#include <QTime>
#include <QtSql/QSqlError>
#include <QtDebug>
#include <QtSql/QSqlDriver>
#include <QtSql/QSqlRecord>


int main(int argc, char *argv[])
{
    QCoreApplication a(argc, argv);
    //设置中文显示
    QTextCodec::setCodecForLocale(QTextCodec::codecForLocale());

    QSqlDatabase db = QSqlDatabase::addDatabase("QSQLITE");
    db.setHostName("easybook-testdemo");    //设置数据库主机名
    db.setDatabaseName("qtDB.db");      //设置数据库名称
    db.setUserName("zhangsan");         //设置数据库用户名
    db.setPassword("123123");           //设置用户名的密码
    bool success = db.open();      //打开连接
    if(!success)
    {
        QSqlError lastError = db.lastError();
        qDebug() << lastError.driverText() << QString(QObject::tr("Open Connect!"));
    }

    //创建数据库表
    QSqlQuery query;
    success = query.exec("CREATE TABLE automobile ("
                    "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                    "attribute VARCHAR(40) NOT NULL, "
                    "type VARCHAR(40) NOT NULL, "
                    "kind VARCHAR(40) NOT NULL, "
                    "nation INTEGER, "
                    "carnumber INTEGER, "
                    "elevaltor INTEGER, "
                    "distance INTEGER, "
                    "oil INTEGER, "
                    "temperature INTEGER)");

    if(success)
        qDebug() << QObject::tr("Data Base Table Create Success!");
    else
        qDebug() << QObject::tr("Create Fail") << query.lastError().driverText();

    //查询
    query.exec("select * from automobile");
    QSqlRecord rec = query.record();
    qDebug() << QObject::tr("automobile Table Keys Numbers:") << rec.count();

    //插入数据
    QTime t;
    t.start();
    query.prepare("insert into automobile values(?,?,?,?,?,?,?,?,?,?)");

    long records = 100;
    for(int i = 0; i < records; i++)
    {
        query.bindValue(0, i);
        query.bindValue(1, "silun");
        query.bindValue(2, "jiaoche");
        query.bindValue(3, "fukang");
        query.bindValue(4, rand()%100);
        query.bindValue(5, rand()%10000);
        query.bindValue(6, rand()%300);
        query.bindValue(7, rand()%200000);
        query.bindValue(8, rand()%52);
        query.bindValue(9, rand()%100);

        success = query.exec();
        if(!success)
        {
            QSqlError lastError = query.lastError();
            qDebug() << lastError.driverText() << QString(QObject::tr("Insert Fail"));
        }
    }
    qDebug() << QObject::tr("Insert %1 Count, Times：%2 ms").arg(records).arg(t.elapsed());

    //排序
    t.restart();
    success = query.exec("select * from automobile order by id desc");
    if(success)
        qDebug() << QObject::tr("Sort %1 Count, Times：%2 ms").arg(records).arg(t.elapsed());
    else
        qDebug() << QObject::tr("Sort Fail!");

    //更新记录
    t.restart();
    for(int i = 0; i < records; i++)
    {
        query.clear();
        query.prepare(QString("update automobile set attribute=?,type=?,"
                              "kind=?,nation=?,"
                              "carnumber=?,elevaltor=?,"
                              "distance=?,oil=?,"
                              "temperature=? where id = %1").arg(i));
        query.bindValue(0, "silun");
        query.bindValue(1, "jiaoche");
        query.bindValue(2, "fukang");
        query.bindValue(3, rand()%100);
        query.bindValue(4, rand()%10000);
        query.bindValue(5, rand()%300);
        query.bindValue(6, rand()%200000);
        query.bindValue(7, rand()%52);
        query.bindValue(8, rand()%100);
        success = query.exec();
        if(!success)
        {
            QSqlError lastError = query.lastError();
            qDebug() << lastError.driverText() << QString(QObject::tr("Update Fail"));
        }
    }

    qDebug() << QObject::tr("Update %1 Count, Times：%2 ms").arg(records).arg(t.elapsed());

    //删除
    t.restart();
    query.exec("delete from automobile where id=15");

    //输出操作耗时
    qDebug() << QObject::tr("Delete one count, Times：%1 ms").arg(t.elapsed());


    return a.exec();
}
```

