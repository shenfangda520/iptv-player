const { invoke } = window.__TAURI__?.core ?? {};
const { open } = window.__TAURI__?.dialog ?? {};
const { readTextFile } = window.__TAURI__?.fs ?? {};
const { openUrl } = window.__TAURI__?.opener ?? {};

const STORAGE_KEY_PLAYLISTS = 'iptv_playlists';
const STORAGE_KEY_SIDEBAR = 'iptv_sidebar_collapsed';
const STORAGE_KEY_FAVORITES = 'iptv_favorites';
const STORAGE_KEY_CURRENT = 'iptv_current';
const STORAGE_KEY_RECENT = 'iptv_recent';
const STORAGE_KEY_SETTINGS = 'iptv_settings';
const STORAGE_KEY_UNREACHABLE = 'iptv_unreachable_channels';

const CATEGORY_MAP = {
  'News': { emoji: '📰', label: '新闻' },
  'Entertainment': { emoji: '🎭', label: '娱乐' },
  'Music': { emoji: '🎵', label: '音乐' },
  'Sports': { emoji: '⚽', label: '体育' },
  'Movies': { emoji: '🎬', label: '电影' },
  'Kids': { emoji: '🧸', label: '少儿' },
  'Education': { emoji: '📚', label: '教育' },
  'Documentary': { emoji: '🎞️', label: '纪录片' },
  'Religious': { emoji: '🙏', label: '宗教' },
  'Culture': { emoji: '🎨', label: '文化' },
  'General': { emoji: '📺', label: '综合' },
  'Lifestyle': { emoji: '🏠', label: '生活' },
  'Comedy': { emoji: '😂', label: '喜剧' },
  'Series': { emoji: '📀', label: '剧集' },
  'Animation': { emoji: '🎌', label: '动漫' },
  'Science': { emoji: '🔬', label: '科学' },
  'Weather': { emoji: '🌤️', label: '天气' },
  'Auto': { emoji: '🚗', label: '汽车' },
  'Business': { emoji: '💼', label: '商业' },
  'Cooking': { emoji: '🍳', label: '美食' },
  'Family': { emoji: '👨‍👩‍👧‍👦', label: '家庭' },
  'Fashion': { emoji: '👗', label: '时尚' },
  'Health': { emoji: '🏥', label: '健康' },
  'Outdoor': { emoji: '🏕️', label: '户外' },
  'Pets': { emoji: '🐾', label: '宠物' },
  'Public': { emoji: '🏛️', label: '公共' },
  'Relax': { emoji: '🧘', label: '休闲' },
  'Shopping': { emoji: '🛍️', label: '购物' },
  'Travel': { emoji: '✈️', label: '旅游' },
  'Undefined': { emoji: '📁', label: '其他' },
};

const DEFAULT_EMOJI = '📺';
const DEFAULT_PLAYLISTS = [
  {
    name: '国际频道',
    url: 'playlists/international.m3u',
    legacyUrls: ['https://iptv-org.github.io/iptv/index.m3u'],
  },
  {
    name: '国内频道',
    url: 'playlists/domestic.m3u',
    legacyUrls: [
      'https://raw.githubusercontent.com/Jsnzkpg/Jsnzkpg/Jsnzkpg/Jsnzkpg1.m3u',
      'https://gh.aptv.app/https://raw.githubusercontent.com/Jsnzkpg/Jsnzkpg/Jsnzkpg/Jsnzkpg1.m3u',
      'https://add.aptv.app/https://gh.aptv.app/https://raw.githubusercontent.com/Jsnzkpg/Jsnzkpg/Jsnzkpg/Jsnzkpg1.m3u',
    ],
  },
];

let allChannels = [];
let filteredChannels = [];
let playlists = [];
let favorites = new Set();
let recentChannels = [];
let currentPlaylist = '';
let currentView = 'all';
let currentCategory = null;
let currentChannel = null;
let settings = { autoplayNext: false, hideUnreachable: false };
let unreachableChannels = new Set();
let lastConnectivityStats = null;

function loadStorage(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function toast(message, type = 'info') {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const el = document.createElement('div');
  el.className = `toast toast-${type}`;
  el.textContent = message;
  document.body.appendChild(el);

  requestAnimationFrame(() => el.classList.add('show'));
  window.setTimeout(() => {
    el.classList.remove('show');
    window.setTimeout(() => el.remove(), 260);
  }, 2600);
}

function parseM3U(content) {
  const lines = content.split(/\r?\n/);
  const channels = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+)$/);
      const name = nameMatch ? nameMatch[1].trim() : 'Unknown';

      const groupMatch = line.match(/group-title="([^"]*)"/);
      const group = groupMatch ? groupMatch[1] : '';

      const logoMatch = line.match(/tvg-logo="([^"]*)"/);
      const logo = logoMatch ? logoMatch[1] : '';

      let url = '';
      i++;
      while (i < lines.length) {
        const l = lines[i].trim();
        if (l === '' || l.startsWith('#')) { i++; continue; }
        url = l;
        break;
      }

      if (url && !url.startsWith('#')) {
        const groups = group ? group.split(';').map(g => g.trim()).filter(Boolean) : ['未分类'];
        channels.push({ name, groups, logo, url, id: `${name}-${url}`.hashCode() });
      }
    }
    i++;
  }
  return channels;
}

String.prototype.hashCode = function() {
  let hash = 0;
  for (let i = 0; i < this.length; i++) {
    hash = ((hash << 5) - hash) + this.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
};

const SVG_STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2.5l2.9 5.9 6.5.95-4.7 4.6 1.1 6.5L12 17.4l-5.8 3.05 1.1-6.5-4.7-4.6 6.5-.95z"/></svg>';
const SVG_TRASH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>';
const SVG_CHEVRON_LEFT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>';

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function showLoading(text = '加载中...') {
  document.getElementById('loading-text').textContent = text;
  document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
  document.getElementById('loading-overlay').classList.add('hidden');
}

function getCategoryInfo(groupName) {
  return CATEGORY_MAP[groupName] || { emoji: DEFAULT_EMOJI, label: groupName || '其他' };
}

function getAllCategories() {
  const catMap = new Map();
  allChannels
    .filter(ch => !settings.hideUnreachable || !unreachableChannels.has(ch.id))
    .forEach(ch => {
    ch.groups.forEach(g => {
      if (!catMap.has(g)) catMap.set(g, 0);
      catMap.set(g, catMap.get(g) + 1);
    });
  });
  return [...catMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count, ...getCategoryInfo(name) }));
}

function renderCategoryGrid() {
  const container = document.getElementById('category-grid');
  const cats = getAllCategories();

  if (cats.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <div class="empty-state-icon">📂</div>
        <div class="empty-state-text">暂无分类，请先添加播放列表</div>
      </div>`;
    return;
  }

  container.innerHTML = cats.map((c, i) => `
    <div class="category-card ${currentCategory === c.name ? 'active' : ''}"
         data-category="${escapeHtml(c.name)}"
         style="animation: fade-up 0.45s cubic-bezier(0.22,1,0.36,1) both; animation-delay: ${Math.min(i * 22, 380)}ms">
      <div class="category-emoji">${c.emoji}</div>
      <div class="category-name">${escapeHtml(c.label)}</div>
      <div class="category-count">${c.count} 频道</div>
    </div>
  `).join('');
}

function renderChannelList() {
  const container = document.getElementById('channel-list');
  const search = document.getElementById('search-input').value.toLowerCase().trim();

  filteredChannels = allChannels.filter(ch => {
    if (settings.hideUnreachable && unreachableChannels.has(ch.id)) return false;

    if (currentView === 'favorites') {
      if (!favorites.has(ch.id)) return false;
    } else if (currentView === 'recent') {
      return recentChannels.some(r => r.id === ch.id);
    } else if (currentCategory) {
      if (!ch.groups.includes(currentCategory)) return false;
    }

    if (search) {
      return ch.name.toLowerCase().includes(search) ||
             ch.groups.some(g => g.toLowerCase().includes(search));
    }
    return true;
  });

  if (currentView === 'recent') {
    filteredChannels = recentChannels.filter(ch =>
      filteredChannels.some(fc => fc.id === ch.id)
    );
  }

  if (filteredChannels.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📺</div>
        <div class="empty-state-text">${
          allChannels.length === 0 ? '暂无频道，请先添加播放列表' :
          settings.hideUnreachable && unreachableChannels.size > 0 ? '已隐藏连通失败的频道' :
          currentView === 'favorites' ? '还没有收藏的频道' :
          currentView === 'recent' ? '还没有播放记录' :
          '没有匹配的频道'
        }</div>
      </div>`;
    return;
  }

  container.innerHTML = filteredChannels.map((ch, i) => {
    const isActive = currentChannel && currentChannel.id === ch.id;
    const isFav = favorites.has(ch.id);
    const iconHtml = ch.logo
      ? `<img src="${escapeHtml(ch.logo)}" alt="" loading="lazy" onerror="this.parentElement.textContent='📺'" />`
      : '📺';
    const stagger = i < 24
      ? ` class="channel-item animate-in ${isActive ? 'active' : ''} ${isFav ? 'is-fav' : ''}" style="animation-delay:${i * 18}ms"`
      : ` class="channel-item ${isActive ? 'active' : ''} ${isFav ? 'is-fav' : ''}"`;

    return `
      <div${stagger} data-id="${ch.id}">
        <div class="channel-icon">${iconHtml}</div>
        <div class="channel-info">
          <div class="channel-name">${escapeHtml(ch.name)}</div>
          <div class="channel-group">${escapeHtml(ch.groups.join(' / '))}</div>
        </div>
        <span class="channel-fav" data-fav-id="${ch.id}">${SVG_STAR}</span>
      </div>
    `;
  }).join('');
}

function renderPlaylistSelect() {
  const select = document.getElementById('playlist-select');
  select.innerHTML = '<option value="">选择播放列表</option>' +
    playlists.map(p => `<option value="${escapeHtml(p.id)}" ${p.id === currentPlaylist ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('');
}

function renderSavedPlaylists() {
  const container = document.getElementById('saved-playlists');
  if (playlists.length === 0) {
    container.innerHTML = '<div class="empty-state"><div class="empty-state-text">暂无播放列表</div></div>';
    return;
  }
  container.innerHTML = playlists.map(p => `
    <div class="saved-playlist-item">
      <div style="flex:1;min-width:0">
        <div class="name">${escapeHtml(p.name)}</div>
        <div class="url">${escapeHtml(p.builtin ? '内置本地播放列表' : (p.url || p.path || '本地文件'))}</div>
      </div>
      <div class="actions">
        <button class="del-btn" data-del-id="${p.id}" title="删除">${SVG_TRASH}</button>
      </div>
    </div>
  `).join('');
}

function updateCounts() {
  const visibleChannels = settings.hideUnreachable
    ? allChannels.filter(ch => !unreachableChannels.has(ch.id))
    : allChannels;
  document.getElementById('count-all').textContent = visibleChannels.length;
  document.getElementById('count-fav').textContent = visibleChannels.filter(ch => favorites.has(ch.id)).length;
  updateConnectivitySummary();
}

function updateNowPlaying() {
  const nameEl = document.getElementById('now-playing-name');
  const mobileTitle = document.getElementById('mobile-current-title');
  const favBtn = document.getElementById('btn-fav-toggle');
  const placeholder = document.getElementById('no-channel-placeholder');
  const bar = document.getElementById('now-playing');

  if (currentChannel) {
    nameEl.textContent = `${currentChannel.name} · ${currentChannel.groups.join(' / ')}`;
    if (mobileTitle) mobileTitle.textContent = currentChannel.name;
    favBtn.classList.toggle('active', favorites.has(currentChannel.id));
    bar.classList.add('playing');
    placeholder.style.display = 'none';
  } else {
    nameEl.textContent = '未选择频道';
    if (mobileTitle) mobileTitle.textContent = '选择频道';
    favBtn.classList.remove('active');
    bar.classList.remove('playing');
    placeholder.style.display = 'flex';
  }
}

function switchView(view, category = null) {
  currentView = view;
  currentCategory = category;

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navBtn = document.querySelector(`.nav-item[data-view="${view}"]`);
  if (navBtn) navBtn.classList.add('active');

  const catPanel = document.getElementById('category-panel');
  const chPanel = document.getElementById('channel-panel');

  if (view === 'categories' && !category) {
    catPanel.classList.remove('hidden');
    chPanel.classList.add('hidden');
    renderCategoryGrid();
  } else {
    catPanel.classList.add('hidden');
    chPanel.classList.remove('hidden');

    const listHeader = chPanel.querySelector('.back-btn');
    if (listHeader) listHeader.remove();

    if (category) {
      const backBtn = document.createElement('button');
      backBtn.className = 'back-btn';
      backBtn.innerHTML = `${SVG_CHEVRON_LEFT} 返回分类 · <strong>${getCategoryInfo(category).emoji} ${getCategoryInfo(category).label}</strong>`;
      backBtn.addEventListener('click', () => switchView('categories'));
      chPanel.insertBefore(backBtn, chPanel.firstChild);
    }

    renderChannelList();
  }
}

function isMobile() {
  return window.innerWidth <= 900;
}

function toggleSidebar(force) {
  const app = document.getElementById('app');
  const collapsed = app.classList.toggle('sidebar-collapsed', force);
  // 移动端抽屉状态不持久化，桌面端记住用户偏好
  if (!isMobile()) saveStorage(STORAGE_KEY_SIDEBAR, collapsed);
}

function toggleFullscreen() {
  const container = document.getElementById('video-container');
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }
  container.requestFullscreen().catch(() => {
    const video = document.getElementById('video-player');
    if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
  });
}

function playChannel(channel) {
  currentChannel = channel;
  const video = document.getElementById('video-player');
  video.src = channel.url;
  video.load();
  video.play().catch(() => {});

  recentChannels = recentChannels.filter(r => r.id !== channel.id);
  recentChannels.unshift(channel);
  if (recentChannels.length > 50) recentChannels = recentChannels.slice(0, 50);
  saveStorage(STORAGE_KEY_RECENT, recentChannels);

  updateNowPlaying();
  renderChannelList();
  saveStorage(STORAGE_KEY_CURRENT, channel);

  if (isMobile()) toggleSidebar(true);
}

function toggleFavorite(channelId) {
  if (favorites.has(channelId)) favorites.delete(channelId);
  else favorites.add(channelId);
  saveStorage(STORAGE_KEY_FAVORITES, [...favorites]);
  updateCounts();
  renderChannelList();
  updateNowPlaying();
}

function extractName(url) {
  const preset = DEFAULT_PLAYLISTS.find(p => p.url === url || p.legacyUrls?.includes(url));
  if (preset) return preset.name;

  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || u.hostname;
  } catch { return url.substring(0, 40); }
}

function isRemoteUrl(url) {
  return /^https?:\/\//i.test(url);
}

function normalizePlaylistUrl(url) {
  const trimmed = url.trim();
  const addPrefix = 'https://add.aptv.app/';
  const ghPrefix = 'https://gh.aptv.app/';

  if (trimmed.startsWith(addPrefix)) {
    return normalizePlaylistUrl(trimmed.slice(addPrefix.length));
  }
  if (trimmed.startsWith(ghPrefix)) {
    return normalizePlaylistUrl(trimmed.slice(ghPrefix.length));
  }
  if (trimmed.startsWith('aptv://add?')) {
    try {
      const parsed = new URL(trimmed);
      const nestedUrl = parsed.searchParams.get('url');
      if (nestedUrl) return normalizePlaylistUrl(nestedUrl);
    } catch {}
  }

  const preset = DEFAULT_PLAYLISTS.find(p => p.url === trimmed || p.legacyUrls?.includes(trimmed));
  if (preset) return preset.url;

  return trimmed;
}

function ensureDefaultPlaylists() {
  let changed = false;
  DEFAULT_PLAYLISTS.forEach(source => {
    const id = source.url.hashCode();
    const existing = playlists.find(p => p.id === id || p.url === source.url || source.legacyUrls?.includes(p.url));
    if (existing) {
      if (existing.name !== source.name || existing.url !== source.url || existing.id !== id) {
        existing.id = id;
        existing.name = source.name;
        existing.url = source.url;
        existing.builtin = true;
        changed = true;
      }
    } else {
      playlists.push({ id, name: source.name, url: source.url, channelCount: 0, builtin: true });
      changed = true;
    }
  });
  const builtinUrls = new Set(DEFAULT_PLAYLISTS.flatMap(source => [source.url, ...(source.legacyUrls || [])]));
  const seenBuiltinUrls = new Set();
  playlists = playlists.filter(playlist => {
    if (!builtinUrls.has(playlist.url)) return true;
    if (seenBuiltinUrls.has(playlist.url)) {
      changed = true;
      return false;
    }
    seenBuiltinUrls.add(playlist.url);
    return true;
  });
  if (changed) saveStorage(STORAGE_KEY_PLAYLISTS, playlists);
}

function openExternalUrl(url) {
  if (openUrl) {
    openUrl(url).catch(() => window.open(url, '_blank', 'noopener,noreferrer'));
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function openSettingsModal() {
  document.getElementById('settings-modal').classList.remove('hidden');
  renderSavedPlaylists();
  updateConnectivitySummary();
}

function updateConnectivitySummary() {
  const summary = document.getElementById('connectivity-summary');
  if (!summary) return;

  if (allChannels.length === 0) {
    summary.textContent = '当前没有可检测的频道。';
    return;
  }

  if (lastConnectivityStats) {
    summary.textContent = `上次测试：${lastConnectivityStats.ok}/${lastConnectivityStats.total} 可用，已记录 ${unreachableChannels.size} 个不通过频道。`;
    return;
  }

  if (unreachableChannels.size > 0) {
    summary.textContent = `已记录 ${unreachableChannels.size} 个不通过频道，可开启隐藏。`;
    return;
  }

  summary.textContent = '测试当前播放列表的频道连通性，失败频道可自动隐藏。';
}

async function testConnectivity() {
  if (!window.__TAURI__ || !invoke) {
    toast('连通率测试需要在 Tauri 应用内运行', 'error');
    return;
  }
  if (allChannels.length === 0) {
    toast('请先加载播放列表', 'error');
    return;
  }

  const btn = document.getElementById('btn-test-connectivity');
  const previousText = btn.textContent;
  btn.disabled = true;
  btn.textContent = '测试中...';
  showLoading(`正在测试 ${allChannels.length} 个频道...`);

  try {
    const results = await invoke('test_channel_connectivity', {
      channels: allChannels.map(({ id, url }) => ({ id, url })),
    });
    const failed = results.filter(r => !r.ok).map(r => r.id);
    unreachableChannels = new Set(failed);
    saveStorage(STORAGE_KEY_UNREACHABLE, [...unreachableChannels]);

    const okCount = results.length - failed.length;
    lastConnectivityStats = {
      total: results.length,
      ok: okCount,
      failed: failed.length,
      testedAt: Date.now(),
    };
    settings.lastConnectivityStats = lastConnectivityStats;
    saveStorage(STORAGE_KEY_SETTINGS, settings);

    updateCounts();
    renderChannelList();
    hideLoading();
    toast(`连通率 ${Math.round((okCount / results.length) * 100)}%，已隐藏 ${failed.length} 个失败频道`, 'success');
  } catch (e) {
    hideLoading();
    toast('连通率测试失败: ' + e.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = previousText;
  }
}

async function loadPlaylistFromUrl(url) {
  showLoading('正在加载播放列表...');
  try {
    url = normalizePlaylistUrl(url);
    let content;
    if (isRemoteUrl(url) && window.__TAURI__ && invoke) {
      content = await invoke('fetch_playlist', { url });
    } else {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      content = await resp.text();
    }
    const channels = parseM3U(content);
    if (channels.length === 0) throw new Error('没有解析到可播放频道');
    const id = url.hashCode();
    const existing = playlists.find(p => p.id === id);
    if (!existing) {
      playlists.push({ id, name: extractName(url), url, channelCount: channels.length });
      saveStorage(STORAGE_KEY_PLAYLISTS, playlists);
    } else {
      existing.channelCount = channels.length;
      if (!existing.name || existing.name === extractName(existing.url || '')) existing.name = extractName(url);
      saveStorage(STORAGE_KEY_PLAYLISTS, playlists);
    }
    allChannels = channels;
    currentPlaylist = id;
    renderPlaylistSelect();
    renderSavedPlaylists();
    updateCounts();
    switchView('categories');
    hideLoading();
    toast(`已加载 ${channels.length} 个频道`, 'success');
    return channels.length;
  } catch (e) {
    hideLoading();
    throw e;
  }
}

async function loadPlaylistFromFile(filePath) {
  showLoading('读取文件...');
  try {
    if (!readTextFile) throw new Error('当前环境不支持直接读取本地路径');
    const content = await readTextFile(filePath);
    const channels = parseM3U(content);
    if (channels.length === 0) throw new Error('没有解析到可播放频道');
    const name = filePath.split(/[/\\]/).pop();
    const id = 'file-' + filePath.hashCode();
    const existing = playlists.find(p => p.id === id);
    if (!existing) {
      playlists.push({ id, name, url: '', path: filePath, channelCount: channels.length });
      saveStorage(STORAGE_KEY_PLAYLISTS, playlists);
    } else {
      existing.channelCount = channels.length;
      saveStorage(STORAGE_KEY_PLAYLISTS, playlists);
    }
    allChannels = channels;
    currentPlaylist = id;
    renderPlaylistSelect();
    renderSavedPlaylists();
    updateCounts();
    switchView('categories');
    hideLoading();
    toast(`已导入 ${channels.length} 个频道`, 'success');
    return channels.length;
  } catch (e) {
    hideLoading();
    throw e;
  }
}

function init() {
  playlists = loadStorage(STORAGE_KEY_PLAYLISTS, []);
  ensureDefaultPlaylists();
  favorites = new Set(loadStorage(STORAGE_KEY_FAVORITES, []));
  recentChannels = loadStorage(STORAGE_KEY_RECENT, []);
  unreachableChannels = new Set(loadStorage(STORAGE_KEY_UNREACHABLE, []));
  settings = { ...settings, ...loadStorage(STORAGE_KEY_SETTINGS, {}) };
  lastConnectivityStats = settings.lastConnectivityStats || null;
  document.getElementById('chk-autoplay').checked = settings.autoplayNext;
  document.getElementById('chk-hide-unreachable').checked = settings.hideUnreachable;

  if (isMobile() || loadStorage(STORAGE_KEY_SIDEBAR, false)) {
    document.getElementById('app').classList.add('sidebar-collapsed');
  }

  renderPlaylistSelect();
  renderSavedPlaylists();
  updateNowPlaying();
  updateCounts();
  switchView('categories');

  if (allChannels.length === 0) {
    loadPlaylistFromUrl(DEFAULT_PLAYLISTS[0].url).catch(() => {});
  }

  document.getElementById('video-player').addEventListener('ended', () => {
    if (!settings.autoplayNext) return;
    const idx = filteredChannels.findIndex(c => c.id === currentChannel?.id);
    if (idx >= 0 && idx < filteredChannels.length - 1) {
      playChannel(filteredChannels[idx + 1]);
    }
  });

  document.getElementById('video-player').addEventListener('error', () => {
    if (currentChannel) {
      document.getElementById('now-playing-name').textContent = `播放失败: ${currentChannel.name}`;
      toast('当前频道播放失败，请尝试其他源', 'error');
    }
  });
}

// ── Events ──
document.addEventListener('DOMContentLoaded', () => {
  init();

  document.getElementById('search-input').addEventListener('input', () => {
    if (currentView === 'categories' && !currentCategory) {
      if (document.getElementById('search-input').value.trim()) {
        switchView('all');
      } else {
        renderCategoryGrid();
      }
      return;
    }
    renderChannelList();
  });

  document.getElementById('channel-list').addEventListener('click', (e) => {
    const favEl = e.target.closest('[data-fav-id]');
    if (favEl) { toggleFavorite(favEl.dataset.favId); return; }

    const item = e.target.closest('.channel-item');
    if (item) {
      const ch = filteredChannels.find(c => c.id === item.dataset.id);
      if (ch) playChannel(ch);
    }
  });

  document.getElementById('category-grid').addEventListener('click', (e) => {
    const card = e.target.closest('.category-card');
    if (card) switchView('categories', card.dataset.category);
  });

  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      if (view === 'categories') switchView('categories');
      else switchView(view);
    });
  });

  document.getElementById('playlist-select').addEventListener('change', async (e) => {
    const id = e.target.value;
    if (!id) return;
    const pl = playlists.find(p => p.id === id);
    if (!pl) return;
    currentPlaylist = id;
    if (pl.url) await loadPlaylistFromUrl(pl.url);
    else if (pl.path) await loadPlaylistFromFile(pl.path);
    else if (pl.content) {
      const channels = parseM3U(pl.content);
      allChannels = channels;
      renderPlaylistSelect();
      updateCounts();
      switchView('categories');
      toast(`已加载 ${channels.length} 个频道`, 'success');
    }
  });

  document.getElementById('btn-collapse').addEventListener('click', () => toggleSidebar(true));
  document.getElementById('btn-expand').addEventListener('click', () => toggleSidebar(false));
  document.getElementById('scrim').addEventListener('click', () => toggleSidebar(true));

  document.getElementById('btn-settings').addEventListener('click', openSettingsModal);
  document.getElementById('btn-mobile-settings').addEventListener('click', openSettingsModal);

  document.getElementById('btn-close-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });

  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('settings-modal').classList.add('hidden');
  });

  document.getElementById('btn-load-url').addEventListener('click', async () => {
    const url = normalizePlaylistUrl(document.getElementById('input-playlist-url').value);
    if (!url) return;
    try {
      await loadPlaylistFromUrl(url);
      document.getElementById('input-playlist-url').value = '';
    } catch (e) { toast('加载失败: ' + e.message, 'error'); }
  });

  document.getElementById('input-playlist-url').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('btn-load-url').click();
  });

  document.getElementById('btn-import-file').addEventListener('click', async () => {
    if (window.__TAURI__) {
      const selected = await open({
        multiple: false,
        filters: [{ name: 'M3U', extensions: ['m3u', 'm3u8', 'txt'] }]
      });
      if (selected) {
        try { await loadPlaylistFromFile(selected); }
        catch (e) { toast('读取文件失败: ' + e.message, 'error'); }
      }
    } else {
      document.getElementById('file-input').click();
    }
  });

  document.getElementById('file-input').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const channels = parseM3U(text);
    if (channels.length === 0) {
      toast('没有解析到可播放频道', 'error');
      return;
    }
    const id = 'file-' + file.name.hashCode();
    const existing = playlists.find(p => p.id === id);
    if (!existing) playlists.push({ id, name: file.name, url: '', content: text, channelCount: channels.length });
    else {
      existing.content = text;
      existing.channelCount = channels.length;
    }
    saveStorage(STORAGE_KEY_PLAYLISTS, playlists);
    allChannels = channels;
    currentPlaylist = id;
    renderPlaylistSelect();
    renderSavedPlaylists();
    updateCounts();
    switchView('categories');
    toast(`已导入 ${channels.length} 个频道`, 'success');
  });

  document.getElementById('saved-playlists').addEventListener('click', (e) => {
    const delBtn = e.target.closest('[data-del-id]');
    if (delBtn) {
      const id = delBtn.dataset.delId;
      playlists = playlists.filter(p => p.id !== id);
      saveStorage(STORAGE_KEY_PLAYLISTS, playlists);
      renderSavedPlaylists();
      renderPlaylistSelect();
      if (currentPlaylist === id) {
        allChannels = [];
        currentPlaylist = '';
        updateCounts();
        switchView('categories');
      }
    }
  });

  document.getElementById('chk-autoplay').addEventListener('change', (e) => {
    settings.autoplayNext = e.target.checked;
    saveStorage(STORAGE_KEY_SETTINGS, settings);
    toast(settings.autoplayNext ? '已开启自动连播' : '已关闭自动连播', 'success');
  });

  document.getElementById('chk-hide-unreachable').addEventListener('change', (e) => {
    settings.hideUnreachable = e.target.checked;
    saveStorage(STORAGE_KEY_SETTINGS, settings);
    updateCounts();
    renderChannelList();
    toast(settings.hideUnreachable ? '已隐藏连通失败频道' : '已显示全部频道', 'success');
  });

  document.getElementById('btn-test-connectivity').addEventListener('click', testConnectivity);

  document.getElementById('btn-fav-toggle').addEventListener('click', () => {
    if (currentChannel) toggleFavorite(currentChannel.id);
  });

  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    toggleFullscreen();
  });
  document.getElementById('btn-video-fullscreen').addEventListener('click', toggleFullscreen);
  document.getElementById('video-container').addEventListener('dblclick', (e) => {
    if (e.target.closest('button')) return;
    toggleFullscreen();
  });

  document.getElementById('btn-add-playlist').addEventListener('click', openSettingsModal);
  document.getElementById('btn-mobile-menu').addEventListener('click', () => {
    if (currentView !== 'categories' && allChannels.length > 0) switchView('categories');
    toggleSidebar(false);
  });

  document.querySelectorAll('[data-open-url]').forEach(btn => {
    btn.addEventListener('click', () => openExternalUrl(btn.dataset.openUrl));
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      toggleSidebar();
    }
    if (e.key === 'Escape') {
      document.getElementById('settings-modal').classList.add('hidden');
      if (document.fullscreenElement) document.exitFullscreen();
    }
    if (e.key.toLowerCase() === 'f' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      toggleFullscreen();
    }
    if (e.key === ' ' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      const video = document.getElementById('video-player');
      if (video.paused) video.play(); else video.pause();
    }
    if (e.key === 'ArrowDown' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      const idx = filteredChannels.findIndex(c => c.id === currentChannel?.id);
      if (idx >= 0 && idx < filteredChannels.length - 1) playChannel(filteredChannels[idx + 1]);
    }
    if (e.key === 'ArrowUp' && document.activeElement.tagName !== 'INPUT') {
      e.preventDefault();
      const idx = filteredChannels.findIndex(c => c.id === currentChannel?.id);
      if (idx > 0) playChannel(filteredChannels[idx - 1]);
    }
  });
});
