# 香江小账本

给来香港交换的学生用的离线记账小程序。手机浏览器打开即可用，支持添加到主屏幕当 App 使用，数据只保存在本机浏览器，不需要注册、不上传、不联网。

## 功能

- 记支出：金额、币种（港币 HKD / 人民币 CNY）、日期、分类、备注
- 分类：为内地来港交换生预设 11 类（餐饮、交通、住宿、日用、购物、学习、通讯、娱乐、医疗、旅行、其他），可自定义增删改
- 统计：总支出、日均支出、笔数、最大单笔、环比上期，分类占比环形图、近 6 月趋势、星期分布
- 时段切换：本周 / 本月 / 上月 / 近 3 月 / 近 6 月 / 自定义区间
- 汇率：联网时自动更新最新 CNY→HKD 汇率，也可点「联网刷新」手动获取；断网可手动输入（默认 1.08），历史记录保留记账当时的汇率
- 数据：本地存储，可导出 / 导入 JSON 备份，可清空
- PWA：可安装到主屏幕，安装后可完全离线使用

## 技术

纯 HTML / CSS / JavaScript，无框架、无构建步骤、无第三方依赖。图表用 SVG 和 CSS 手绘，数据用 `localStorage`，离线能力由 Service Worker 提供。

## 本地运行

任意静态服务器均可，例如：

```powershell
python -m http.server 8080
```

然后访问 <http://localhost:8080>。注意 Service Worker 需要 `http://localhost` 或 HTTPS 环境才能注册，直接双击 `index.html`（`file://`）可以打开但无法启用离线缓存。

## 部署到手机

把整个目录上传到任意静态托管即可，推荐免费的 GitHub Pages（自带 HTTPS）：

1. 新建 GitHub 仓库，把本目录文件推上去
2. 仓库 Settings → Pages → 选择 main 分支根目录 → 保存
3. 手机浏览器打开生成的 `https://用户名.github.io/仓库名/`
4. 安卓 Chrome：菜单「安装应用 / 添加到主屏幕」；iPhone Safari：分享 → 「添加到主屏幕」

也可以直接拖到 Netlify Drop / Vercel 等平台。

## 使用提示

- 汇率在「我的 → 汇率设置」查看和修改：联网打开会自动更新，点「🔄 联网刷新」可立即获取；没有网络时手动填入，例如 1 CNY = 1.07 HKD 就填 `1.07`
- 汇率数据来自免费的 open.er-api.com，仅在点刷新时请求一次，不涉及任何个人数据
- 「我的 → 统计显示币种」决定所有统计和列表用什么货币展示，HKD 和 CNY 之间可随时切换
- 数据存在浏览器里：清除浏览器数据会丢失记录，换手机前先在「我的 → 数据」导出备份，新手机上导入即可
- 更新代码后，如果手机还显示旧版本，等几秒刷新一次（Service Worker 会自动更新缓存）

## 目录

```text
index.html            页面结构
styles.css            样式
app.js                全部业务逻辑
sw.js                 Service Worker 离线缓存
manifest.webmanifest  PWA 清单
icons/                应用图标
scripts/generate-icons.ps1  重新生成应用图标的脚本
scripts/smoke-test.js       无浏览器冒烟测试（node scripts/smoke-test.js）
scripts/check-selectors.js  检查脚本引用的元素 ID 与样式类是否齐全
```

## 开发校验

```powershell
node scripts/check-selectors.js
node scripts/smoke-test.js
```

`smoke-test.js` 用轻量 DOM 桩跑一遍「初始化 → 保存记录 → 渲染统计」链路，用于改动后的快速回归检查。

## 可扩展方向

收入记账、预算与超支提醒、自动联网汇率、CSV 导出、多设备同步等都可以后续再加。
