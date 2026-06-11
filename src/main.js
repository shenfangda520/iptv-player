const { invoke } = window.__TAURI__.core;
const { open } = window.__TAURI__.dialog;
const { readTextFile } = window.__TAURI__.fs;

const STORAGE_KEY_PLAYLISTS = 'iptv_playlists';
const STORAGE_KEY_FAVORITES = 'iptv_favorites';
const STORAGE_KEY_CURRENT = 'iptv_current';
const STORAGE_KEY_RECENT = 'iptv_recent';

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
const DEFAULT_PLAYLIST_URL = 'https://iptv-org.github.io/iptv/index.m3u';

let allChannels = [];
let filteredChannels = [];
let playlists = [];
let favorites = new Set();
let recentChannels = [];
let currentPlaylist = '';
let currentView = 'all';
let currentCategory = null;
let currentChannel = null;

function loadStorage(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function saveStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
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
  allChannels.forEach(ch => {
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

  container.innerHTML = cats.map(c => `
    <div class="category-card ${currentCategory === c.name ? 'active' : ''}"
         data-category="${escapeHtml(c.name)}">
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
          currentView === 'favorites' ? '还没有收藏的频道' :
          currentView === 'recent' ? '还没有播放记录' :
          '没有匹配的频道'
        }</div>
      </div>`;
    return;
  }

  container.innerHTML = filteredChannels.map(ch => {
    const isActive = currentChannel && currentChannel.id === ch.id;
    const isFav = favorites.has(ch.id);
    const iconHtml = ch.logo
      ? `<img src="${escapeHtml(ch.logo)}" alt="" onerror="this.parentElement.textContent='📺'" />`
      : '📺';

    return `
      <div class="channel-item ${isActive ? 'active' : ''} ${isFav ? 'is-fav' : ''}"
           data-id="${ch.id}">
        <div class="channel-icon">${iconHtml}</div>
        <div class="channel-info">
          <div class="channel-name">${escapeHtml(ch.name)}</div>
          <div class="channel-group">${escapeHtml(ch.groups.join(' / '))}</div>
        </div>
        <span class="channel-fav" data-fav-id="${ch.id}">
          ${isFav ? '★' : '☆'}
        </span>
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
        <div class="url">${escapeHtml(p.url || '本地文件')}</div>
      </div>
      <div class="actions">
        <button class="del-btn" data-del-id="${p.id}" title="删除">🗑</button>
      </div>
    </div>
  `).join('');
}

function updateCounts() {
  document.getElementById('count-all').textContent = allChannels.length;
  document.getElementById('count-fav').textContent = favorites.size;
}

function updateNowPlaying() {
  const nameEl = document.getElementById('now-playing-name');
  const favBtn = document.getElementById('btn-fav-toggle');
  const placeholder = document.getElementById('no-channel-placeholder');

  if (currentChannel) {
    nameEl.textContent = `${currentChannel.name} - ${currentChannel.groups.join(' / ')}`;
    favBtn.textContent = favorites.has(currentChannel.id) ? '★' : '☆';
    placeholder.style.display = 'none';
  } else {
    nameEl.textContent = '未选择频道';
    favBtn.textContent = '☆';
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
      backBtn.innerHTML = `← 返回分类 · <strong>${getCategoryInfo(category).emoji} ${getCategoryInfo(category).label}</strong>`;
      backBtn.addEventListener('click', () => switchView('categories'));
      chPanel.insertBefore(backBtn, chPanel.firstChild);
    }

    renderChannelList();
  }
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
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] || u.hostname;
  } catch { return url.substring(0, 40); }
}

async function loadPlaylistFromUrl(url) {
  showLoading('正在加载播放列表...');
  try {
    let content;
    if (window.__TAURI__) {
      content = await invoke('fetch_playlist', { url });
    } else {
      const resp = await fetch(url);
      content = await resp.text();
    }
    const channels = parseM3U(content);
    const id = url.hashCode();
    const existing = playlists.find(p => p.id === id);
    if (!existing) {
      playlists.push({ id, name: extractName(url), url, channelCount: channels.length });
      saveStorage(STORAGE_KEY_PLAYLISTS, playlists);
    }
    allChannels = channels;
    currentPlaylist = id;
    renderPlaylistSelect();
    updateCounts();
    switchView('categories');
    hideLoading();
    return channels.length;
  } catch (e) {
    hideLoading();
    throw e;
  }
}

async function loadPlaylistFromFile(filePath) {
  showLoading('读取文件...');
  try {
    const content = await readTextFile(filePath);
    const channels = parseM3U(content);
    const name = filePath.split(/[/\\]/).pop();
    const id = 'file-' + name.hashCode();
    const existing = playlists.find(p => p.id === id);
    if (!existing) {
      playlists.push({ id, name, url: '', channelCount: channels.length });
      saveStorage(STORAGE_KEY_PLAYLISTS, playlists);
    }
    allChannels = channels;
    currentPlaylist = id;
    renderPlaylistSelect();
    updateCounts();
    switchView('categories');
    hideLoading();
    return channels.length;
  } catch (e) {
    hideLoading();
    throw e;
  }
}

function init() {
  playlists = loadStorage(STORAGE_KEY_PLAYLISTS, []);
  favorites = new Set(loadStorage(STORAGE_KEY_FAVORITES, []));
  recentChannels = loadStorage(STORAGE_KEY_RECENT, []);

  renderPlaylistSelect();
  renderSavedPlaylists();
  updateNowPlaying();
  updateCounts();
  switchView('categories');

  if (allChannels.length === 0 && playlists.length === 0) {
    loadPlaylistFromUrl(DEFAULT_PLAYLIST_URL).catch(() => {});
  }

  document.getElementById('video-player').addEventListener('ended', () => {
    const idx = filteredChannels.findIndex(c => c.id === currentChannel?.id);
    if (idx >= 0 && idx < filteredChannels.length - 1) {
      playChannel(filteredChannels[idx + 1]);
    }
  });

  document.getElementById('video-player').addEventListener('error', () => {
    if (currentChannel) {
      document.getElementById('now-playing-name').textContent = `⚠ 播放失败: ${currentChannel.name}`;
    }
  });
}

// ── Events ──
document.addEventListener('DOMContentLoaded', () => {
  init();

  document.getElementById('search-input').addEventListener('input', () => {
    if (currentView === 'categories' && !currentCategory) return;
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
  });

  document.getElementById('btn-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.remove('hidden');
    renderSavedPlaylists();
  });

  document.getElementById('btn-close-settings').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.add('hidden');
  });

  document.getElementById('settings-modal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) document.getElementById('settings-modal').classList.add('hidden');
  });

  document.getElementById('btn-load-url').addEventListener('click', async () => {
    const url = document.getElementById('input-playlist-url').value.trim();
    if (!url) return;
    try {
      await loadPlaylistFromUrl(url);
      document.getElementById('input-playlist-url').value = '';
    } catch (e) { alert('加载失败: ' + e.message); }
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
        catch (e) { alert('读取文件失败: ' + e.message); }
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
    const id = 'file-' + file.name.hashCode();
    playlists.push({ id, name: file.name, url: '', channelCount: channels.length });
    saveStorage(STORAGE_KEY_PLAYLISTS, playlists);
    allChannels = channels;
    currentPlaylist = id;
    renderPlaylistSelect();
    updateCounts();
    switchView('categories');
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
        switchView('categories');
      }
    }
  });

  document.getElementById('btn-fav-toggle').addEventListener('click', () => {
    if (currentChannel) toggleFavorite(currentChannel.id);
  });

  document.getElementById('btn-fullscreen').addEventListener('click', () => {
    const container = document.getElementById('video-container');
    if (document.fullscreenElement) document.exitFullscreen();
    else container.requestFullscreen().catch(() => {});
  });

  document.getElementById('btn-add-playlist').addEventListener('click', () => {
    document.getElementById('settings-modal').classList.remove('hidden');
    renderSavedPlaylists();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.getElementById('settings-modal').classList.add('hidden');
      if (document.fullscreenElement) document.exitFullscreen();
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
