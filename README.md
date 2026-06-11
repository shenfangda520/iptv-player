<div align="center">

<img src="src-tauri/icons/icon.png" width="100" alt="Logo">

# IPTV Player

**A lightweight, cross-platform IPTV player built with Tauri 2**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)
[![Tauri 2](https://img.shields.io/badge/Tauri-2.x-orange.svg?style=flat-square)](https://tauri.app)
[![Rust](https://img.shields.io/badge/Rust-stable-black.svg?style=flat-square)](https://rust-lang.org)
[![Release](https://img.shields.io/github/v/release/shenfangda520/iptv-player?style=flat-square&color=green)](https://github.com/shenfangda520/iptv-player/releases)

[English](#features) · [中文](#功能特性)

[Download](https://github.com/shenfangda520/iptv-player/releases) · [Report Bug](https://github.com/shenfangda520/iptv-player/issues) · [Request Feature](https://github.com/shenfangda520/iptv-player/issues)

</div>

---

## Features

IPTV Player is a modern, open-source IPTV client built with [Tauri 2](https://tauri.app/). It combines a Rust backend for performance with a lightweight HTML5 frontend, delivering a native desktop and mobile experience in under 5MB.

Comes pre-loaded with [iptv-org](https://iptv-org.github.io/iptv/) — access **8,000+** free TV channels worldwide, no configuration needed.

## Screenshots

<div align="center">

<!-- Add screenshots here -->

</div>

## Features

| Feature | Description |
|:-------:|:------------|
| 📂 **Channel Browser** | Browse 30+ categories: News, Sports, Music, Movies, Kids, and more |
| ⭐ **Favorites** | Bookmark channels for instant access |
| 🕐 **Watch History** | Auto-saves your last 50 watched channels |
| 🔍 **Instant Search** | Filter channels by name or category in real-time |
| 📋 **Playlist Management** | Import M3U/M3U8 URLs or local files |
| ▶️ **Smooth Playback** | HLS streaming powered by HTML5 Video |
| 🌙 **Dark Theme** | Eye-friendly dark UI by default |
| ⌨️ **Keyboard Shortcuts** | Space, Arrow keys, Esc — full control without mouse |
| 📦 **Tiny Footprint** | ~5MB installer, launches in milliseconds |

## 功能特性

| 功能 | 说明 |
|:----:|:-----|
| 📂 **分类浏览** | 按新闻、体育、音乐、电影等 30+ 分类浏览频道 |
| ⭐ **频道收藏** | 一键收藏常用频道，快速访问 |
| 🕐 **播放历史** | 自动记录最近播放，最多保存 50 条 |
| 🔍 **实时搜索** | 按频道名称、分组名称实时过滤 |
| 📋 **播放列表管理** | 支持 M3U/M3U8 URL 加载和本地文件导入 |
| ▶️ **流畅播放** | 基于 HTML5 Video，支持 HLS 流媒体 |
| 🌙 **暗色主题** | 默认深色 UI，护眼舒适 |
| ⌨️ **快捷键** | 空格播放/暂停、↑↓切换频道、Esc退出全屏 |
| 📦 **极小体积** | 安装包约 5MB，启动秒开 |

## Download

| Platform | Format | Requirements |
|:--------:|:------:|:-------------|
| <img src="https://img.shields.io/badge/-macOS-black?style=flat-square&logo=apple" width="100"> | `.dmg` | macOS 11+ (Apple Silicon) |
| <img src="https://img.shields.io/badge/-Windows-blue?style=flat-square&logo=windows" width="100"> | `.exe` / `.msi` | Windows 10+ (x64) |
| <img src="https://img.shields.io/badge/-Linux-yellow?style=flat-square&logo=linux" width="100"> | `.deb` / `.AppImage` | Ubuntu 20.04+ / Most distros |
| <img src="https://img.shields.io/badge/-Android-green?style=flat-square&logo=android" width="100"> | `.apk` | Android 7.0+ (API 24) |

⬇️ **[Download Latest Release](https://github.com/shenfangda520/iptv-player/releases/latest)**

## Build from Source

### Prerequisites

- [Node.js](https://nodejs.org/) ≥ 18
- [Rust](https://rustup.rs/) (stable)
- [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

### Desktop

```bash
# Clone the repository
git clone https://github.com/shenfangda520/iptv-player.git
cd iptv-player

# Install dependencies
npm ci

# Development
npm run dev

# Production build
npm run build
```

### Android

```bash
# Initialize Android project
npx tauri android init

# Build APK
npx tauri android build --apk
```

## Preloaded Sources

The app ships with local playlist files — works offline, no setup required:

| Source | File |
|:------:|:----:|
| International | `src/playlists/international.m3u` |
| 国内频道 | `src/playlists/domestic.m3u` |

You can also add custom M3U/M3U8 URLs in-app.

## Tech Stack

| Layer | Technology |
|:-----:|:-----------|
| Frontend | HTML5 · CSS3 · Vanilla JavaScript |
| Backend | Rust · Tauri 2 |
| Networking | reqwest (HTTP client) |
| Playback | HTML5 Video · HLS.js |
| Build | GitHub Actions CI/CD |

## Architecture

```
iptv-player/
├── src/                          # Frontend
│   ├── index.html                # Entry point
│   ├── styles.css                # Styles
│   ├── main.js                   # Application logic
│   └── playlists/                # Local M3U files
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   └── lib.rs                # Tauri commands
│   ├── Cargo.toml                # Rust dependencies
│   ├── tauri.conf.json           # Tauri configuration
│   └── capabilities/             # Permission config
├── .github/
│   └── workflows/
│       └── build.yml             # CI/CD pipeline
├── package.json
└── README.md
```

## Keyboard Shortcuts

| Key | Action |
|:---:|:-------|
| `Space` | Play / Pause |
| `↑` | Previous channel |
| `↓` | Next channel |
| `Esc` | Exit fullscreen / Close modal |

## License

[MIT License](LICENSE) © [shenfangda520](https://github.com/shenfangda520)

---

<div align="center">

**If this project helps you, consider giving it a ⭐**

</div>
