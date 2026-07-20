# eli3xir.github.io

我的个人主页，由 [GitHub Pages](https://pages.github.com/) 托管。

在线地址：<https://eli3xir.github.io>

## 本地预览

无需构建，直接用浏览器打开 `index.html` 即可；也可以起个本地服务：

```bash
# Python
python -m http.server 8000
# 然后访问 http://localhost:8000
```

## 文件结构

```
├── index.html   # 页面结构：关于我 / 项目 / 联系
├── style.css    # 样式（响应式，支持深浅色主题）
└── main.js      # 主题切换 + 页脚年份
```

## 部署

本仓库名为 `<用户名>.github.io`，推送到 `main` 分支后 GitHub Pages 自动发布，无需额外配置。

```bash
git add -A
git commit -m "更新内容"
git push
```
