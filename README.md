<div align="center">

# IPTV Player

**轻量级跨平台 IPTV 播放器**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.x-green.svg)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-2021-orange.svg)](https://rust-lang.org)
[![Platform](https://img.shields.io/badge/Platform-macOS%20%7C%20Windows%20%7C%20Android-lightgrey.svg)]()

[下载安装包](https://github.com/shenfangda520/iptv-player/releases) · [报告问题](https://github.com/shenfangda520/iptv-player/issues)

</div>

---

## 简介

IPTV Player 是一款基于 [Tauri 2](https://tauri.app/) 构建的轻量级 IPTV 流媒体播放器。前端使用原生 HTML/CSS/JS，后端使用 Rust，确保极致的性能和极小的安装包体积。

内置 [iptv-org](https://iptv-org.github.io/iptv/) 订阅源，开箱即用，支持 8000+ 全球免费电视频道。

## 功能特性

| 功能 | 说明 |
|------|------|
| 📂 分类浏览 | 按新闻、音乐、体育、电影等 30+ 分类浏览频道 |
| ⭐ 频道收藏 | 一键收藏常用频道，快速访问 |
| 🕐 播放历史 | 自动记录最近播放，最多保存 50 条 |
| 🔍 实时搜索 | 按频道名称、分组名称实时过滤 |
| 📋 播放列表管理 | 支持 M3U/M3U8 URL 加载和本地文件导入 |
| ▶️ 流媒体播放 | 基于 HTML5 Video，支持 HLS 流媒体 |
| 🎨 暗色主题 | 默认深色 UI，护眼舒适 |
| ⌨️ 快捷键 | 空格播放/暂停、↑↓切换频道、Esc退出全屏 |
| 📦 极小体积 | 安装包约 5MB，启动秒开 |

## 截图

<div align="center">

<!-- ![Screenshot](docs/screenshot.png) -->

</div>

## 下载安装

前往 [Releases](https://github.com/shenfangda520/iptv-player/releases) 页面下载最新版本：

| 平台 | 格式 | 说明 |
|------|------|------|
| macOS | `.dmg` | Apple Silicon (M1/M2/M3/M4) |
| Windows | `.msi` | Windows 10+ (x64) |
| Android | `.apk` | Android 7.0+ (API 24) |

### 从源码构建

**环境要求**

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://rustup.rs/) (stable)
- [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

**Desktop**

```bash
git clone https://github.com/shenfangda520/iptv-player.git
cd iptv-player
npm install
npm run tauri dev      # 开发模式
npm run tauri build    # 构建安装包
```

**Android**

```bash
npm run tauri android init
npm run tauri android build
```

## 内置订阅源

应用首次启动时自动加载以下订阅源：

- [iptv-org/iptv](https://iptv-org.github.io/iptv/index.m3u) — 全球 8000+ 免费电视频道

也可以在设置中添加自定义 M3U/M3U8 播放列表。

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | HTML5 · CSS3 · Vanilla JavaScript |
| 后端 | Rust · Tauri 2 |
| 网络 | reqwest (HTTP 客户端) |
| 播放 | HTML5 Video · HLS.js |

## 项目结构

```
iptv-player/
├── src/                        # 前端资源
│   ├── index.html              # 主页面
│   ├── styles.css              # 样式
│   └── main.js                 # 业务逻辑
├── src-tauri/                  # Rust 后端
│   ├── src/
│   │   ├── lib.rs              # Tauri 命令定义
│   │   └── main.rs             # 入口
│   ├── Cargo.toml              # Rust 依赖
│   ├── tauri.conf.json         # Tauri 配置
│   └── capabilities/           # 权限配置
├── package.json
└── README.md
```

## 快捷键

| 按键 | 功能 |
|------|------|
| `Space` | 播放 / 暂停 |
| `↑` | 上一个频道 |
| `↓` | 下一个频道 |
| `Esc` | 退出全屏 / 关闭弹窗 |

## 许可证

[MIT License](LICENSE)
