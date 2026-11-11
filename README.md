# 个人作品集网站

纯手写 HTML / CSS / JavaScript，无框架、无依赖，双击就能打开。

## 文件结构

```
portfolio/
├── index.html        首页（简介、技能、时间线）
├── projects.html     项目页
├── about.html        关于页
├── assets/
│   ├── style.css     全部样式（含深色模式、响应式）
│   └── main.js       主题切换 + 当前页高亮
└── README.md
```

## 本地预览

直接双击 `index.html` 即可。
如果想模拟线上环境，在这个目录下执行：

```bash
python -m http.server 8000
```

然后浏览器打开 `http://localhost:8000`。

## 改成你自己的信息

全文搜索并替换这几处：

| 占位 | 换成 |
|---|---|
| `你的名字` | 你的真名 |
| `you@example.com` | 你的邮箱 |
| `https://github.com/` | 你的 GitHub 主页 |
| `【换成你的页面截图】` | 你的项目截图（放 `assets/` 下，用 `<img>` 引入） |

技能进度条的宽度在 `index.html` 里，直接改 `style="width: 75%"` 的数字。

## 部署到 GitHub Pages（免费，10 分钟）

1. 注册 GitHub，新建仓库，名字比如 `portfolio`，选 Public。
2. 把 `portfolio` 文件夹里的所有文件上传（网页端拖拽即可）。
3. 进入仓库 Settings → Pages → Source 选 `main` 分支、`/ (root)`，保存。
4. 等 1–2 分钟，访问 `https://你的用户名.github.io/portfolio/`。

## 部署到 Vercel（更简单）

1. 注册 Vercel，用 GitHub 账号登录。
2. New Project → 选刚才的仓库 → Deploy，不用改任何配置。
3. 拿到 `xxx.vercel.app` 的域名。

## 答辩时怎么讲

- **响应式**：`style.css` 最后的 `@media (max-width: 768px)`，手机上导航换行、栅格变单列。
- **深色模式**：`:root` 定义变量，`html[data-theme="dark"]` 覆盖，JS 只改一个属性。
- **怎么记住选择**：`localStorage` 存主题，刷新不丢。
- **为什么不用框架**：三个静态页面，用框架是过度设计；先把基础打牢。

## 已知不足（可以主动说）

- 项目卡片还是占位图，没有真实截图
- 没有做无障碍（键盘导航、对比度）
- 没有构建流程，改一处要手动同步三个页面

主动列不足，比被问出来好。
