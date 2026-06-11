# IPTV Player

跨平台 IPTV 播放器，支持 macOS、Windows、Android。

基于 [Tauri 2](https://tauri.app/) + Rust + Vanilla JS 构建。

## 功能

- 📂 分类浏览 — 按新闻/音乐/体育/电影等分类查看频道
- ⭐ 收藏频道 — 快速访问常用频道
- 🕐 最近播放 — 自动记录播放历史
- 🔍 搜索 — 按频道名和分组搜索
- 📋 M3U/M3U8 播放列表 — 支持 URL 加载和本地文件导入
- ▶️ 视频播放 — 支持 HLS 流媒体播放
- ⌨️ 快捷键 — 空格暂停、↑↓切换频道、Esc退出全屏
- 🌙 暗色主题

## 内置订阅源

- [iptv-org/iptv](https://iptv-org.github.io/iptv/index.m3u) — 全球 8000+ 免费电视频道

## 开发

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://rustup.rs/)
- [Tauri Prerequisites](https://tauri.app/start/prerequisites/)

### 运行

```bash
npm install
npm run tauri dev
```

### 构建

```bash
npm run tauri build
```

构建产物：
- macOS: `src-tauri/target/release/bundle/dmg/`
- Windows: `src-tauri/target/release/bundle/msi/`
- Android: `npm run tauri android build`

## 项目结构

```
iptv-player/
├── src/                # 前端 (HTML/CSS/JS)
│   ├── index.html
│   ├── styles.css
│   └── main.js
├── src-tauri/          # Rust 后端
│   ├── src/
│   │   ├── lib.rs      # Tauri 命令
│   │   └── main.rs
│   ├── Cargo.toml
│   └── tauri.conf.json
└── package.json
```

## License

MIT
