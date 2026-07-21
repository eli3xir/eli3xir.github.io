---
title: Trie树详解
categories:
  - 技术
  - 算法
tags:
  - 算法
  - 数据结构
  - 树
abbrlink: 20358
date: 2021-06-02 00:49:50
description:
---

### Trie树简介

Trie树，又叫字典树，因为它的搜索快捷的特性被单词搜索系统使用，故又称单词查找树。它是一种树形结构的数据结构。之所以快速，是因为它用空间代替了速度。

字典树（Trie）可以保存一些字符串->值的对应关系。基本上，它跟 Java 的 HashMap 功能相同，都是 key-value 映射，只不过 Trie 的 key 只能是字符串。

Trie 的强大之处就在于它的时间复杂度。它的插入和查询时间复杂度都为 $O(k)$ ，其中 $k$ 为 key 的长度，与 Trie 中保存了多少个元素无关。Hash 表号称是 $O(1)$ 的，但在计算 hash 的时候就肯定会是 $O(k)$ ，而且还有碰撞之类的问题；Trie 的缺点是空间消耗很高。

至于Trie树的实现，可以用数组，也可以用指针动态分配。推荐使用数组，比较方便。

Trie树，又称单词查找树或键树，是一种树形结构，是一种哈希树的变种。典型应用是用于统计和排序大量的字符串（但不仅限于字符串），所以经常被搜索引擎系统用于文本词频统计。它的优点是：最大限度地减少无谓的字符串比较，查询效率比哈希表高。

Trie的核心思想是**空间换时间**。利用字符串的公共前缀来降低查询时间的开销以达到提高效率的目的。

### Trie树特性

1. 根节点不包含字符，除根节点外每一个节点都只包含一个字符。
2. 从根节点到某一节点，路径上经过的字符连接起来，为该节点对应的字符串。
3. 每个节点的所有子节点包含的字符都不相同。
4. 如果字符的种数为$n$，则每个结点的出度为$n$，这也是空间换时间的体现，浪费了很多的空间。
5. 插入查找的复杂度为$O(n)$，$n$为字符串长度。

### Trie树基本思想（以字母树为例）

#### 1. 插入过程

对于一个单词，从根开始，沿着单词的各个字母所对应的树中的节点分支向下走，直到单词遍历完，将最后的节点标记为红色，表示该单词已插入Trie树。

#### 2. 查询过程

同样的，从根开始按照单词的字母顺序向下遍历Trie树，一旦发现某个节点标记不存在或者单词遍历完成而最后的节点未标记为红色，则表示该单词不存在，若最后的节点标记为红色，表示该单词存在。

![img](/blog/assets/img/2b1e5362befa.jpg)

（图片来自百度百科）

### Trie树数据结构

利用串构建一个字典树，这个字典树保存了串的公共前缀信息，因此可以降低查询操作的复杂度。

下面以英文单词构建的字典树为例，这棵Trie树中每个结点包括26个孩子结点，因为总共有26个英文字母（假设单词都是小写字母组成）。

 则可声明包含Trie树的结点信息的结构体：

```c
typedef struct Trie_node

{

	int count;          // 统计单词前缀出现的次数

	struct Trie_node* next[26];  // 指向各个子树的指针

	bool exist;          // 标记该结点处是否构成单词 

}TrieNode , *Trie;
```

其中next是一个指针数组，存放着指向各个孩子结点的指针。

如给出字符串`"ab"`、`"acb"`、`"abc"`、`"a"`、`"abd"`，根据该字符串序列构建一棵Trie树。则构建的树如下：

![image-20210602010309683](/blog/assets/img/a19859d0e363.png)

Trie树的根结点不包含任何信息，第一个字符串为`"abc"`，第一个字母为`'a'`，因此根结点中数组`next`下标为`'a'-97`的值不为`NULL`，其他同理，构建的Trie树如图所示，红色结点表示在该处可以构成一个单词。很显然，如果要查找单词"abc"是否存在，查找长度则为$O(len)$，$len$为要查找的字符串的长度。而若采用一般的逐个匹配查找，则查找长度为$O(len*n)$，$n$为字符串的个数。显然基于Trie树的查找效率要高很多。

### Trie树查找域名

```c
int trieParser(char ch)
{
    if (ch >= 'A' && ch <= 'Z')
        ch = 'a' + ch - 'A';
    if (ch >= 'a' && ch <= 'z')
        return ch - 'a';
    if (ch >= '0' && ch <= '9')
        return ch - '0' + 26;
    if (ch == '-')
        return 36;
    if (ch == '.')
        return 37;
    return -1;
}

// Trie树数据结构
typedef struct Trie
{
    struct Trie *children[38];
    bool isEnd;
} Trie;

// 创建Trie树，返回指针
Trie *trieCreate()
{
    Trie *ret = (Trie *)malloc(sizeof(Trie));
    memset(ret->children, 0, sizeof(ret->children));
    ret->isEnd = false;
    printf("%s called\n", __FUNCTION__);
    return ret;
}

// 插入新字符串
void trieInsert(Trie *obj, char *word)
{
    int n = strlen(word);
    for (int i = 0; i < n; i++)
    {
        int ch = trieParser(word[i]);
        if (ch == -1)
        {
        }
        if (obj->children[ch] == NULL)
        {
            obj->children[ch] = trieCreate();
        }
        obj = obj->children[ch];
    }
    obj->isEnd = true;
    printf("%s called\n", __FUNCTION__);
}

// 查找完整字符串是否存在
bool trieSearch(Trie *obj, char *word)
{
    int n = strlen(word);
    for (int i = 0; i < n; i++)
    {
        int ch = trieParser(word[i]);
        if (obj->children[ch] == NULL)
        {
            return false;
        }
        obj = obj->children[ch];
    }
    return obj->isEnd;
}

// 查找字符串前缀是否存在
bool trieStartWith(Trie *obj, char *prefix)
{
    int n = strlen(prefix);
    for (int i = 0; i < n; i++)
    {
        int ch = trieParser(prefix[i]);
        if (obj->children[ch] == NULL)
        {
            return false;
        }
        obj = obj->children[ch];
    }
    return true;
}

// 释放Trie树
void trieFree(Trie *obj)
{
    for (int i = 0; i < 38; i++)
    {
        if (obj->children[i])
        {
            trieFree(obj->children[i]);
        }
    }
    free(obj);
    printf("%s called\n", __FUNCTION__);
}
```

