// ─── CALENDAR PICKER ───
const calState = {
  start: { year: 0, month: 0, value: null },
  end:   { year: 0, month: 0, value: null }
};

function toggleCal(which) {
  const popup = document.getElementById(`${which}-cal`);
  const display = document.getElementById(`${which}-display`);
  const isOpen = popup.classList.contains('show');
  // close all
  ['start','end'].forEach(w => {
    document.getElementById(`${w}-cal`).classList.remove('show');
    document.getElementById(`${w}-display`).classList.remove('open');
  });
  if (!isOpen) {
    popup.classList.add('show');
    display.classList.add('open');
    renderCal(which);
  }
}

document.addEventListener('click', e => {
  if (!e.target.closest('.date-picker-wrap')) {
    ['start','end'].forEach(w => {
      document.getElementById(`${w}-cal`).classList.remove('show');
      document.getElementById(`${w}-display`).classList.remove('open');
    });
  }
});

function renderCal(which) {
  const s = calState[which];
  const popup = document.getElementById(`${which}-cal`);
  const today = new Date();
  const year = s.year || today.getFullYear();
  const month = s.month !== undefined ? s.month : today.getMonth();
  s.year = year; s.month = month;

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrev = new Date(year, month, 0).getDate();

  const startVal = calState.start.value;
  const endVal   = calState.end.value;

  const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const dowLabels = ['日','月','火','水','木','金','土'];

  let cells = '';
  dowLabels.forEach(d => cells += `<div class="cal-dow">${d}</div>`);

  // prev month trailing days
  for (let i = 0; i < firstDay; i++) {
    const day = daysInPrev - firstDay + 1 + i;
    cells += `<div class="cal-day other-month">${day}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const isToday = dateStr === today.toISOString().split('T')[0];
    const isSelected = dateStr === startVal || dateStr === endVal;
    const inRange = startVal && endVal && dateStr > startVal && dateStr < endVal;
    let cls = 'cal-day';
    if (isToday) cls += ' today';
    if (isSelected) cls += ' selected';
    else if (inRange) cls += ' in-range';
    cells += `<div class="${cls}" onclick="selectDate('${which}','${dateStr}')">${d}</div>`;
  }

  // next month leading days
  const totalCells = firstDay + daysInMonth;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  for (let i = 1; i <= remaining; i++) {
    cells += `<div class="cal-day other-month">${i}</div>`;
  }

  popup.innerHTML = `
    <div class="cal-nav">
      <button class="cal-arrow" onclick="moveCal('${which}',-1,event)">&#8249;</button>
      <div class="cal-month-label">${year}年 ${monthNames[month]}</div>
      <button class="cal-arrow" onclick="moveCal('${which}',1,event)">&#8250;</button>
    </div>
    <div class="cal-grid">${cells}</div>
  `;
}

function moveCal(which, dir, event) {
  if (event) event.stopPropagation();
  const s = calState[which];
  s.month += dir;
  if (s.month > 11) { s.month = 0; s.year++; }
  if (s.month < 0)  { s.month = 11; s.year--; }
  renderCal(which);
}

function selectDate(which, dateStr) {
  calState[which].value = dateStr;
  document.getElementById(`proj-${which}`).value = dateStr;
  const label = document.getElementById(`${which}-label`);
  const [y, m, d] = dateStr.split('-');
  label.textContent = `${y}年${parseInt(m)}月${parseInt(d)}日`;
  document.getElementById(`${which}-display`).classList.add('has-val');
  // re-render both for range highlight
  renderCal(which);
  if (which === 'start') {
    // auto-close start, open end if no end selected
    if (!calState.end.value) {
      toggleCal('end');
    } else {
      toggleCal('start');
    }
  } else {
    toggleCal('end');
  }
}

// ─── STATE ───
const ROLE_COLORS = {
  // 共通管理系
  'PM':                   '#7c6bff',
  'プロデューサー':        '#e879f9',
  'プランナー':            '#c084fc',
  // ディレクション系
  'ディレクター':          '#818cf8',
  'アートディレクター':    '#f472b6',
  'テクニカルディレクター':'#38bdf8',
  'クリエイティブディレクター': '#a78bfa',
  // 制作・デザイン系
  'デザイナー':            '#2dd4bf',
  'コピーライター':        '#a3e635',
  'フォトグラファー':      '#fbbf24',
  'イラストレーター':      '#fb923c',
  // 映像系
  '監督':                  '#f43f5e',
  'カメラマン':            '#ef4444',
  'エディター':            '#f97316',
  'カラリスト':            '#eab308',
  'サウンドデザイナー':    '#84cc16',
  '音楽プロデューサー':    '#10b981',
  'キャスティング':        '#06b6d4',
  'スタイリスト':          '#8b5cf6',
  // Web系
  'フロントエンド':        '#60a5fa',
  'バックエンド':          '#3ecf8e',
  'インフラ':              '#f59e0b',
  'QA':                   '#fb7185',
  // その他
  'その他':               '#9090a8',
};

const PHASE_COLORS = {
  '要件定義': { bg: 'rgba(91,78,245,0.10)',  border: 'rgba(91,78,245,0.30)',  text: '#5b4ef5' },
  '設計':     { bg: 'rgba(37,99,235,0.10)',  border: 'rgba(37,99,235,0.30)',  text: '#2563eb' },
  '実装':     { bg: 'rgba(5,150,105,0.10)',  border: 'rgba(5,150,105,0.30)',  text: '#059669' },
  'テスト':   { bg: 'rgba(219,39,119,0.10)', border: 'rgba(219,39,119,0.30)', text: '#db2777' },
  'リリース': { bg: 'rgba(217,119,6,0.10)',  border: 'rgba(217,119,6,0.30)',  text: '#d97706' },
  'その他':   { bg: 'rgba(107,114,128,0.10)',border: 'rgba(107,114,128,0.30)',text: '#6b7280' }
};

let members = [];
let selectedCategories = [];
let customRoles = []; // 「その他」で追加したカスタムロール
let generatedData = null;

const CATEGORIES = [
  'MVVの作成',
  'ロゴ制作',
  'Webサイト制作',
  '動画制作',
  'CM制作',
  'ブランディング',
  'その他',
];

// カテゴリーごとの推奨ロール（職能に合わせて定義）
const CATEGORY_ROLES = {
  'MVVの作成':    ['プランナー', 'ディレクター', 'コピーライター'],
  'ロゴ制作':     ['アートディレクター', 'デザイナー', 'コピーライター'],
  'Webサイト制作':['プロデューサー', 'ディレクター', 'アートディレクター', 'デザイナー', 'コピーライター', 'フロントエンド'],
  '動画制作':     ['プロデューサー', 'ディレクター', '監督', 'カメラマン', 'エディター', 'カラリスト', 'サウンドデザイナー'],
  'CM制作':       ['プロデューサー', 'クリエイティブディレクター', 'プランナー', '監督', 'カメラマン', 'エディター', 'カラリスト', 'コピーライター', 'キャスティング', 'スタイリスト'],
  'ブランディング':['プランナー', 'アートディレクター', 'デザイナー', 'コピーライター'],
  'その他':       [],
};

// ─── CATEGORY CHIPS ───
function initCategoryChips() {
  const wrap = document.getElementById('category-chips');
  wrap.innerHTML = '';
  CATEGORIES.forEach(cat => {
    const chip = document.createElement('div');
    chip.className = 'category-chip' + (selectedCategories.includes(cat) ? ' selected' : '');
    chip.innerHTML = `<span class="chip-check">${selectedCategories.includes(cat) ? '✓' : ''}</span>${cat}`;
    chip.onclick = () => toggleCategory(cat);
    wrap.appendChild(chip);
  });

  // 「その他」が選択されている場合はカスタムロール入力UIを表示
  const customArea = document.getElementById('custom-role-area');
  if (customArea) {
    customArea.style.display = selectedCategories.includes('その他') ? 'block' : 'none';
  }
}

function toggleCategory(cat) {
  if (selectedCategories.includes(cat)) {
    selectedCategories = selectedCategories.filter(c => c !== cat);
  } else {
    selectedCategories.push(cat);
  }
  initCategoryChips();
  autoSetMembersFromCategories();
}

// 選択カテゴリーから推奨ロールを集めてメンバーを自動セット
function autoSetMembersFromCategories() {
  const recommendedRoles = [];
  selectedCategories.forEach(cat => {
    (CATEGORY_ROLES[cat] || []).forEach(r => {
      if (!recommendedRoles.includes(r)) recommendedRoles.push(r);
    });
  });
  // カスタムロールも含める
  customRoles.forEach(r => { if (!recommendedRoles.includes(r)) recommendedRoles.push(r); });

  if (!recommendedRoles.length) return;
  const existingRoles = members.map(m => m.role);
  recommendedRoles.forEach(role => {
    if (!existingRoles.includes(role)) {
      if (!ROLES.includes(role)) ROLES.push(role);
      if (!ROLE_COLORS[role]) ROLE_COLORS[role] = '#9090a8';
      addMember('', role, 100);
    }
  });
}

// カスタムロール追加（「その他」選択時）
function addCustomRole() {
  const input = document.getElementById('custom-role-input');
  const val = input ? input.value.trim() : '';
  if (!val) return;
  if (!customRoles.includes(val)) {
    customRoles.push(val);
    if (!ROLES.includes(val)) ROLES.push(val);
    if (!ROLE_COLORS[val]) ROLE_COLORS[val] = '#9090a8';
    addMember('', val, 100);
  }
  if (input) input.value = '';
  renderCustomRoleTags();
}

function removeCustomRole(role) {
  customRoles = customRoles.filter(r => r !== role);
  renderCustomRoleTags();
  // メンバーからも削除
  members = members.filter(m => m.name || m.role !== role);
  renderMembers();
}

function renderCustomRoleTags() {
  const tagWrap = document.getElementById('custom-role-tags');
  if (!tagWrap) return;
  tagWrap.innerHTML = '';
  customRoles.forEach(role => {
    const tag = document.createElement('div');
    tag.className = 'tech-tag';
    tag.style.cssText += ';background:rgba(144,144,168,0.12);border-color:rgba(144,144,168,0.3);color:#9090a8;';
    tag.innerHTML = `${role}<button onclick="removeCustomRole('${role}')">×</button>`;
    tagWrap.appendChild(tag);
  });
}

// ─── SNAPSHOT ───
const SNAP_KEY = 'pf_snapshots';

// ─── SUPABASE CONFIG ───
const SUPABASE_URL = 'https://voqsfzvxlgywavtxfquk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvcXNmenZ4bGd5d2F2dHhmcXVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4NzMxMzMsImV4cCI6MjA5MDQ0OTEzM30.wAeKaIoTRfnG0kk0jJFuVokzLrvMQp0LUYIHy1vQovU';

// ユーザーキー（このHTMLファイル固有の固定キー）
const FILE_USER_KEY = 'pf_' + 'voqsfzvxlgywavtxfquk_default';
function getUserKey() {
  return FILE_USER_KEY;
}

// Supabaseにプロジェクトを保存（upsert）
async function saveToSupabase(snap) {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        user_key: getUserKey(),
        snap_id: String(snap.id),
        project_name: snap.data?.projectName || '無題',
        data: snap,
        saved_at: new Date().toISOString()
      })
    });
    return res.ok;
  } catch (e) {
    console.warn('Supabase保存失敗:', e);
    return false;
  }
}

// Supabaseからプロジェクト一覧を取得
async function loadFromSupabase() {
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_key=eq.${getUserKey()}&order=saved_at.desc&limit=50`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.map(r => r.data);
  } catch (e) {
    console.warn('Supabase読み込み失敗:', e);
    return null;
  }
}

// Supabaseから特定プロジェクトを削除
async function deleteFromSupabase(snapId) {
  try {
    await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_key=eq.${getUserKey()}&data->>id=eq.${snapId}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      }
    );
  } catch (e) {
    console.warn('Supabase削除失敗:', e);
  }
}

function getSnapshots() {
  try { return JSON.parse(localStorage.getItem(SNAP_KEY) || '[]'); } catch { return []; }
}
function saveSnapshots(snaps) {
  localStorage.setItem(SNAP_KEY, JSON.stringify(snaps));
}
// 削除済みIDを記録してクラウド同期時の復活を防ぐ
function getDeletedIds() {
  try { return new Set(JSON.parse(localStorage.getItem('pf_deleted_ids') || '[]')); } catch { return new Set(); }
}
function addDeletedId(id) {
  const ids = getDeletedIds();
  ids.add(id);
  localStorage.setItem('pf_deleted_ids', JSON.stringify([...ids].slice(-500)));
}

async function saveSnapshot() {
  if (!generatedData) return;
  const snaps = getSnapshots();
  const now   = new Date();
  const label = `${generatedData.projectName || '無題'} — ${now.getFullYear()}/${now.getMonth()+1}/${now.getDate()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  const snap  = {
    id:        now.getTime(),
    label,
    savedAt:   now.toISOString(),
    data:      JSON.parse(JSON.stringify(generatedData)),
    recurring: JSON.parse(JSON.stringify(recurringList)),
    categories: [...selectedCategories],
  };
  snaps.unshift(snap);
  if (snaps.length > 20) snaps.pop();
  saveSnapshots(snaps);

  // Supabaseにも保存
  const ok = await saveToSupabase(snap);
  showSyncStatus(ok ? 'cloud' : 'local');

  renderSnapshotList();
  renderDashboard();
  flashSaveBtn();
}

// 同期ステータス表示
function showSyncStatus(status) {
  const existing = document.getElementById('sync-status');
  if (existing) existing.remove();
  const el = document.createElement('div');
  el.id = 'sync-status';
  const isCloud = status === 'cloud';
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:${isCloud?'rgba(5,150,105,0.9)':'rgba(107,114,128,0.9)'};color:#fff;font-family:'DM Mono',monospace;font-size:11px;padding:8px 16px;border-radius:20px;z-index:9999;display:flex;align-items:center;gap:6px;box-shadow:0 4px 16px rgba(0,0,0,.2);`;
  el.innerHTML = isCloud
    ? `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M13 10.5a3 3 0 00-2.5-5.4A5 5 0 003 8.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M6 11l2 2 2-2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 13V8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>クラウドに保存しました`
    : `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" stroke-width="1.4"/><path d="M5 3V1M11 3V1" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>ローカルに保存しました`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

// 起動時にSupabaseからデータを同期
async function syncFromSupabase() {
  const cloudSnaps = await loadFromSupabase();
  if (!cloudSnaps || !cloudSnaps.length) return;

  const localSnaps = getSnapshots();
  const localIds   = new Set(localSnaps.map(s => s.id));
  const deletedIds = getDeletedIds(); // ローカルで削除済みのIDは復活させない

  // クラウドにあってローカルにないものを追加（削除済みは除外）
  let added = 0;
  cloudSnaps.forEach(snap => {
    if (!localIds.has(snap.id) && !deletedIds.has(snap.id)) {
      localSnaps.push(snap);
      added++;
    }
  });

  if (added > 0) {
    localSnaps.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
    saveSnapshots(localSnaps.slice(0, 50));
    renderSnapshotList();
    renderDashboard();
    showSyncBadge(added);
  }
}

function showSyncBadge(count) {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(91,78,245,0.9);color:#fff;font-family:'DM Mono',monospace;font-size:11px;padding:8px 16px;border-radius:20px;z-index:9999;display:flex;align-items:center;gap:6px;box-shadow:0 4px 16px rgba(0,0,0,.2);`;
  el.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 1 0 1.5-3.9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 4v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>クラウドから ${count}件 同期しました`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}


function loadSnapshot(id) {
  const snaps = getSnapshots();
  const snap  = snaps.find(s => s.id === id);
  if (!snap) return;
  generatedData      = snap.data;
  recurringList      = snap.recurring || [];
  selectedCategories = snap.categories || [];
  renderResult(true); // スケジュール日付を保持する
  showPanel(2);
  // 現在のタブを維持
  const activeTab = document.querySelector('.main-tab.active');
  if (activeTab && activeTab.id === 'tab-gantt') renderGantt();
}

function deleteSnapshot(id, e) {
  e.stopPropagation();
  const snaps = getSnapshots().filter(s => s.id !== id);
  saveSnapshots(snaps);
  addDeletedId(id);        // 削除済みとして記録
  deleteFromSupabase(id);  // クラウドからも削除
  renderSnapshotList();
  renderDashboard();
}

function renderSnapshotList() {
  const list = document.getElementById('project-history-list');
  if (!list) return;
  const snaps = getSnapshots();
  list.innerHTML = '';

  if (!snaps.length) {
    list.innerHTML = `<div style="font-size:11px;color:var(--text3);padding:4px 2px;text-align:center;">保存なし</div>`;
    return;
  }

  // 案件名ごとに最新スナップを1件ずつ表示（スナップは新しい順）
  const seen = new Set();
  snaps.forEach(snap => {
    const name = snap.data.projectName || '無題';
    const ts = new Date(snap.savedAt);
    const tsStr = `${ts.getMonth()+1}/${ts.getDate()} ${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}`;

    const item = document.createElement('div');
    item.style.cssText = `display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;cursor:pointer;transition:background .15s;position:relative;`;
    item.addEventListener('mouseenter', () => item.style.background='var(--bg3)');
    item.addEventListener('mouseleave', () => item.style.background='transparent');
    item.addEventListener('click', () => {
      confirmLeave(() => { loadSnapshot(snap.id); closeSidebar(); });
    });

    // アクティブ中の案件はハイライト
    const isCurrent = generatedData && generatedData.projectName === name;

    item.innerHTML = `
      <div style="width:8px;height:8px;border-radius:50%;background:${isCurrent?'var(--accent)':'var(--border2)'};flex-shrink:0;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:${isCurrent?'600':'400'};color:${isCurrent?'var(--accent)':'var(--text)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);margin-top:1px;">${tsStr} 保存</div>
      </div>
      <button onclick="deleteSnapshot(${snap.id},event)" style="display:none;">×</button>`;

    if (!seen.has(name)) {
      // 最新1件を表示
      list.appendChild(item);
      seen.add(name);
    }

    // すべてのスナップを展開できるボタン（最初の案件名のみ）
  });
}

function flashSaveBtn() {
  const btn = document.getElementById('save-snap-btn');
  if (!btn) return;
  btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg> 保存しました`;
  btn.style.background = 'var(--green)';
  setTimeout(() => {
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 2h9l3 3v9a1 1 0 01-1 1H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3"/><rect x="4" y="9" width="8" height="5" rx=".5" stroke="currentColor" stroke-width="1.3"/><rect x="5" y="2" width="5" height="3" rx=".5" stroke="currentColor" stroke-width="1.3"/></svg> 現在の状態を保存`;
    btn.style.background = 'var(--accent)';
  }, 1800);
}

// Step2表示時に保存ボタンを表示
function showSaveBtn() {
  // 設定ポップアップ内のsave-snap-btnは常時表示のため何もしない
}


function init() {
  initPalette();

  const today = new Date();
  const end = new Date(); end.setDate(today.getDate() + 60);

  calState.start.year = today.getFullYear();
  calState.start.month = today.getMonth();
  calState.end.year = end.getFullYear();
  calState.end.month = end.getMonth();

  addMember('', 'PM', 100);
  initCategoryChips();
  renderSnapshotList();
  renderDashboard();
  // Supabaseから同期
  syncFromSupabase();
}

// ─── MEMBERS ───
let memberIdx = 0;
const ROLES = [
  'PM', 'プロデューサー', 'プランナー',
  'ディレクター', 'アートディレクター', 'クリエイティブディレクター', 'テクニカルディレクター',
  'デザイナー', 'コピーライター', 'フォトグラファー', 'イラストレーター',
  '監督', 'カメラマン', 'エディター', 'カラリスト', 'サウンドデザイナー', '音楽プロデューサー', 'キャスティング', 'スタイリスト',
  'フロントエンド', 'バックエンド', 'インフラ', 'QA',
  'その他',
];
const DEFAULT_ROLES = ['PM'];

function addMember(name = '', role = '', rate = 100) {
  const idx = memberIdx++;
  const defaultRole = DEFAULT_ROLES[members.length] || 'フロントエンド';
  members.push({ id: idx, name, role: role || defaultRole, rate });
  renderMembers();
}

function removeMember(id) {
  members = members.filter(m => m.id !== id);
  renderMembers();
}

function clearAllMembers() {
  members = [];
  memberIdx = 0;
  renderMembers();
}

function updateMember(id, field, val) {
  const m = members.find(m => m.id === id);
  if (m) {
    m[field] = val;
    if (field === 'name' || field === 'role') renderMemberAvatar(id);
  }
}

function renderMemberAvatar(id) {
  const m = members.find(m => m.id === id);
  if (!m) return;
  const av = document.querySelector(`[data-member-id="${id}"] .avatar`);
  if (av) {
    av.style.background = ROLE_COLORS[m.role] || ROLE_COLORS['その他'];
    av.textContent = getInitials(m.name, m.role);
  }
}

function getInitials(name, role) {
  if (name) return name.slice(0, 2);
  return role ? role.slice(0, 1) : '?';
}

function renderMembers() {
  const list = document.getElementById('member-list');
  list.innerHTML = '';
  members.forEach(m => {
    const color = ROLE_COLORS[m.role] || ROLE_COLORS['その他'];
    const div = document.createElement('div');
    div.className = 'member-card';
    div.dataset.memberId = m.id;
    div.innerHTML = `
      <div class="avatar" style="background:${color}">${getInitials(m.name, m.role)}</div>
      <input type="text" placeholder="名前" value="${m.name}"
        oninput="updateMember(${m.id},'name',this.value)" />
      <select onchange="updateMember(${m.id},'role',this.value)">
        ${ROLES.map(r => `<option value="${r}" ${r === m.role ? 'selected' : ''}>${r}</option>`).join('')}
      </select>
      <div style="display:flex;align-items:center;gap:8px;">
        <input type="range" min="20" max="100" step="20" value="${m.rate}"
          style="flex:1;accent-color:var(--accent)"
          oninput="updateMember(${m.id},'rate',+this.value);this.nextElementSibling.textContent=this.value+'%'" />
        <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text3);width:32px">${m.rate}%</span>
      </div>
      <button class="btn-icon" onclick="removeMember(${m.id})">×</button>
    `;
    list.appendChild(div);
  });
}

// ─── PANEL NAV ───
// ─── PROJECT SETTINGS POPUP ───
// ─── RESTORE MODAL ───
function openRestoreModal() {
  document.getElementById('proj-settings-popup').style.display = 'none';
  const modal = document.getElementById('restore-modal');
  const list  = document.getElementById('restore-list');
  list.innerHTML = '';

  const snaps = getSnapshots();
  const curName = generatedData?.projectName || '';
  // 同じプロジェクト名のスナップを全件表示（全プロジェクトも含める）
  const targets = snaps.filter(s => s.data.projectName === curName);

  if (!targets.length) {
    list.innerHTML = `<div style="text-align:center;color:var(--text3);font-size:13px;padding:24px 0;">保存されたバージョンがありません</div>`;
  } else {
    targets.forEach((snap, i) => {
      const ts = new Date(snap.savedAt);
      const tsStr = `${ts.getFullYear()}/${ts.getMonth()+1}/${ts.getDate()} ${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}`;
      const taskCount = snap.data.members?.reduce((s, m) => s + (m.tasks?.length||0), 0) || 0;
      const isLatest = i === 0;

      const item = document.createElement('div');
      item.style.cssText = `display:flex;align-items:center;gap:12px;padding:12px 14px;border:1px solid var(--border);border-radius:9px;cursor:pointer;transition:all .15s;background:var(--bg2);`;
      item.addEventListener('mouseenter', () => { item.style.borderColor='var(--accent)'; item.style.background='var(--bg3)'; });
      item.addEventListener('mouseleave', () => { item.style.borderColor='var(--border)'; item.style.background='var(--bg2)'; });

      item.innerHTML = `
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;">
            <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text2);">${tsStr}</span>
            ${isLatest ? `<span style="font-family:'DM Mono',monospace;font-size:9px;background:var(--accent-glow);color:var(--accent);border:1px solid var(--accent);border-radius:4px;padding:1px 5px;">最新</span>` : ''}
          </div>
          <div style="font-size:12px;color:var(--text3);">${taskCount}タスク · ${snap.data.members?.length||0}メンバー</div>
        </div>
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style="flex-shrink:0;color:var(--text3);"><path d="M2 8a6 6 0 1 0 1.5-3.9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 4v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

      item.addEventListener('click', () => {
        closeRestoreModal();
        showConfirm(
          `${tsStr} のバージョンに復元しますか？\n現在の状態は上書きされます。`,
          '復元する', '#5b4ef5',
          () => { loadSnapshot(snap.id); }
        );
      });
      list.appendChild(item);
    });
  }

  modal.style.display = 'flex';
}

function closeRestoreModal() {
  document.getElementById('restore-modal').style.display = 'none';
}


function showConfirm(message, okLabel, okColor, onOk, { saveBtn = false, onSave = null } = {}) {
  const dialog  = document.getElementById('custom-confirm');
  document.getElementById('custom-confirm-msg').textContent = message;
  const okBtn   = document.getElementById('custom-confirm-ok');
  const saveEl  = document.getElementById('custom-confirm-save');

  okBtn.textContent = okLabel;
  okBtn.style.background = okColor;
  okBtn.onmouseover = () => okBtn.style.filter = 'brightness(.88)';
  okBtn.onmouseout  = () => okBtn.style.filter = 'none';

  // 保存ボタンの表示切替
  saveEl.style.display = saveBtn ? '' : 'none';

  dialog.style.display = 'flex';
  const close = () => { dialog.style.display = 'none'; };

  okBtn.onclick   = () => { close(); onOk(); };
  saveEl.onclick  = () => { close(); onSave && onSave(); };
  document.getElementById('custom-confirm-cancel').onclick = close;
  document.getElementById('custom-confirm-overlay').onclick = close;
}

function toggleProjectSettingsPopup(e) {
  e.stopPropagation();
  const popup = document.getElementById('proj-settings-popup');
  if (popup.style.display === 'flex') { popup.style.display = 'none'; return; }
  popup.style.display = 'flex';
  setTimeout(() => {
    document.addEventListener('click', function h(ev) {
      if (popup.contains(ev.target)) return;
      popup.style.display = 'none';
      document.removeEventListener('click', h);
    });
  }, 0);
}

function resetScheduleDates() {
  document.getElementById('proj-settings-popup').style.display = 'none';
  if (!generatedData) return;

  const modal = document.getElementById('schedule-reset-modal');
  modal.style.display = 'flex';

  const close = () => { modal.style.display = 'none'; };

  document.getElementById('schedule-reset-overlay').onclick = close;
  document.getElementById('srm-cancel-btn').onclick = close;

  // DOM・membersを復元してAI生成を呼ぶ共通処理
  const restoreAndGenerate = () => {
    const d = generatedData;
    document.getElementById('proj-name').value  = d.projectName || '';
    document.getElementById('proj-desc').value  = d.projectDesc || d.projectName || '';
    document.getElementById('proj-start').value = d.startDate   || '';
    document.getElementById('proj-end').value   = d.endDate     || '';
    const clientEl = document.getElementById('proj-client');
    if (clientEl) clientEl.value = d.client || '';
    const defs = d.memberDefs && d.memberDefs.length
      ? d.memberDefs
      : (d.members || []).map(m => ({ name: m.name, role: m.role, rate: 100 }));
    members = [];
    memberIdx = 0;
    defs.forEach(m => addMember(m.name, m.role, m.rate || 100));
  };

  // スケジュールはそのまま、タスクを引き直す
  document.getElementById('srm-tasks-only-btn').onclick = () => {
    close();
    const savedSchedule = generatedData.scheduleItems
      ? generatedData.scheduleItems.map(i => ({ id: i.id, startDate: i.startDate, endDate: i.endDate }))
      : null;
    restoreAndGenerate();
    // generateTasks完了後にスケジュール日付を復元するためフラグを持たせる
    generatedData._keepScheduleDates = savedSchedule;
    generateTasks();
  };

  // スケジュールもタスクも引き直す
  document.getElementById('srm-ai-btn').onclick = () => {
    close();
    restoreAndGenerate();
    generateTasks();
  };

  // タスクはそのまま、スケジュールはゼロにする
  document.getElementById('srm-blank-btn').onclick = () => {
    close();
    if (generatedData.scheduleItems) {
      generatedData.scheduleItems.forEach(item => {
        item.startDate = null;
        item.endDate   = null;
        if (item.children) item.children.forEach(c => { c.startDate = null; c.endDate = null; });
      });
    }
    renderGantt();
  };
}

function confirmRedesign() {
  document.getElementById('proj-settings-popup').style.display = 'none';
  showConfirm(
    'プロジェクト設計をやり直しますか？\n現在の入力内容は保持されますが、生成済みのタスクはリセットされます。',
    'やり直す', '#5b4ef5',
    () => { generatedData = null; showPanel(1); }
  );
}

function confirmDeleteProject() {
  document.getElementById('proj-settings-popup').style.display = 'none';
  const name = generatedData?.projectName || 'このプロジェクト';
  showConfirm(
    `「${name}」を削除しますか？\nこの操作は取り消せません。`,
    '削除する', '#dc2626',
    () => {
      if (generatedData) {
        const allSnaps = getSnapshots();
        // 削除するスナップの ID を記録してクラウド同期で復活しないようにする
        allSnaps.filter(s => s.data.projectName === generatedData.projectName).forEach(s => {
          addDeletedId(s.id);
          deleteFromSupabase(s.id);
        });
        const remaining = allSnaps.filter(s => s.data.projectName !== generatedData.projectName);
        saveSnapshots(remaining);
      }
      generatedData = null;
      recurringList = [];
      selectedCategories = [];
      document.getElementById('proj-name').value = '';
      document.getElementById('proj-desc').value = '';
      const clientEl = document.getElementById('proj-client');
      if (clientEl) clientEl.value = '';
      members = []; memberIdx = 0;
      addMember('', 'PM', 100);
      initCategoryChips();
      renderMembers();
      renderSnapshotList();
      showPanel(1);
    }
  );
}


// ─── AUTO LINK ───
function autoLinkEditor(el) {
  const URL_RE = /(?<!\w)(https?:\/\/[^\s<>"']+)/g;
  // テキストノードのみ走査してリンク化（既存<a>タグは触らない）
  const walk = node => {
    if (node.nodeType === 3) {
      const text = node.textContent;
      if (!URL_RE.test(text)) return;
      URL_RE.lastIndex = 0;
      const span = document.createElement('span');
      let last = 0, m;
      URL_RE.lastIndex = 0;
      while ((m = URL_RE.exec(text)) !== null) {
        if (m.index > last) span.appendChild(document.createTextNode(text.slice(last, m.index)));
        const a = document.createElement('a');
        a.href = m[1];
        a.textContent = m[1];
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.style.cssText = `color:var(--accent);text-decoration:underline;cursor:pointer;word-break:break-all;`;
        span.appendChild(a);
        last = m.index + m[1].length;
      }
      if (last < text.length) span.appendChild(document.createTextNode(text.slice(last)));
      node.parentNode.replaceChild(span, node);
    } else if (node.nodeType === 1 && node.tagName !== 'A') {
      Array.from(node.childNodes).forEach(walk);
    }
  };
  Array.from(el.childNodes).forEach(walk);
}


function renderDashboard() {
  const grid  = document.getElementById('dashboard-grid');
  const empty = document.getElementById('dashboard-empty');
  if (!grid) return;
  grid.innerHTML = '';

  const snaps = getSnapshots();
  // 案件名ごとに最新スナップを1件抽出
  const seen = new Map();
  snaps.forEach(snap => {
    const name = snap.data.projectName || '無題';
    if (!seen.has(name)) seen.set(name, snap);
  });

  const projects = [...seen.values()];

  if (!projects.length) {
    grid.style.display = 'none';
    empty.style.display = 'block';
    return;
  }
  grid.style.display = 'grid';
  empty.style.display = 'none';

  projects.forEach(snap => {
    const d  = snap.data;
    const ts = new Date(snap.savedAt);
    const tsStr = relativeTime(ts);
    const cat = (d.categories || []).join(' / ') || '';
    const taskCount = (d.members || []).reduce((s, m) => s + (m.tasks||[]).length, 0);
    const totalDays = d.totalDays || 0;

    const card = document.createElement('div');
    card.className = 'proj-card';
    card.addEventListener('click', () => {
      confirmLeave(() => { loadSnapshot(snap.id); showPanel(2); });
    });

    // サムネイル（ミニガント風ビジュアル）
    const thumb = document.createElement('div');
    thumb.className = 'proj-card-thumb';
    thumb.appendChild(makeMiniGantt(d));

    // カテゴリバッジ
    if (cat) {
      const badge = document.createElement('div');
      badge.style.cssText = `position:absolute;top:10px;left:10px;background:rgba(91,78,245,.15);border:1px solid rgba(91,78,245,.25);color:var(--accent);border-radius:5px;padding:2px 8px;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.5px;`;
      badge.textContent = cat.length > 20 ? cat.slice(0,18)+'…' : cat;
      thumb.appendChild(badge);
    }

    const body = document.createElement('div');
    body.className = 'proj-card-body';
    body.innerHTML = `
      <div class="proj-card-name">${d.projectName || '無題'}</div>
      <div class="proj-card-meta" style="margin-bottom:10px;">${tsStr}に保存</div>
      <div style="display:flex;gap:12px;">
        <div style="display:flex;align-items:center;gap:4px;font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" stroke-width="1.3"/><path d="M1 13c0-2.76 2.24-5 5-5s5 2.24 5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>
          ${(d.members||[]).length}名
        </div>
        <div style="display:flex;align-items:center;gap:4px;font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="11" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M1 7h14M5 1v4M11 1v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
          ${totalDays}日
        </div>
        <div style="display:flex;align-items:center;gap:4px;font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="6" height="2" rx=".5" fill="currentColor"/><rect x="1" y="7" width="9" height="2" rx=".5" fill="currentColor"/><rect x="1" y="11" width="4" height="2" rx=".5" fill="currentColor"/></svg>
          ${taskCount}タスク
        </div>
      </div>`;

    card.appendChild(thumb);
    card.appendChild(body);
    grid.appendChild(card);
  });
}

// ミニガントサムネイル（SVG）
function makeMiniGantt(d) {
  const W = 320, H = 160;
  const members = d.members || [];
  const phases  = d.phases || ['要件定義','設計','実装','テスト','リリース'];
  const COLORS  = ['#5b4ef5','#2563eb','#059669','#db2777','#d97706','#f97316','#6b7280'];
  const phaseColor = {};
  phases.forEach((p, i) => { phaseColor[p] = COLORS[i % COLORS.length]; });

  const totalDays = d.totalDays || 60;
  const rowH = 14;
  const gap  = 5;
  const labelW = 60;
  const barAreaW = W - labelW - 12;

  let bars = '';
  let y = 16;
  members.forEach((m, mi) => {
    if (y > H - 10) return;
    const col = ['#7c6bff','#ec4899','#f59e0b','#14b8a6','#f97316','#3b82f6','#059669'][mi % 7];
    // メンバーラベル
    const init = (m.name||m.role||'?').slice(0,2);
    bars += `<circle cx="${labelW-14}" cy="${y+rowH/2}" r="7" fill="${col}" opacity=".9"/>`;
    bars += `<text x="${labelW-14}" y="${y+rowH/2+4}" text-anchor="middle" font-size="6" fill="#fff" font-family="sans-serif">${init}</text>`;
    (m.tasks||[]).slice(0,6).forEach(t => {
      if (y > H - 10) return;
      const startOff = totalDays > 0 ? Math.round(daysBetweenSafe(d.startDate, t.startDate) / totalDays * barAreaW) : 0;
      const barW     = totalDays > 0 ? Math.max(4, Math.round((t.days||3) / totalDays * barAreaW)) : 8;
      const x        = labelW + Math.max(0, startOff);
      const c        = phaseColor[t.phase] || col;
      bars += `<rect x="${x}" y="${y}" width="${Math.min(barW, barAreaW - startOff)}" height="${rowH}" rx="3" fill="${c}" opacity=".85"/>`;
      y += rowH + gap;
    });
    y += 4;
  });

  const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.cssText = 'position:absolute;inset:0;';
  svg.innerHTML = `
    <rect width="${W}" height="${H}" fill="var(--bg3)"/>
    ${Array.from({length:8},(_,i)=>`<line x1="${labelW + i*(barAreaW/8)}" y1="0" x2="${labelW + i*(barAreaW/8)}" y2="${H}" stroke="var(--border)" stroke-width=".5"/>`).join('')}
    ${bars}`;
  return svg;
}

function daysBetweenSafe(a, b) {
  try { return Math.max(0, (new Date(b) - new Date(a)) / 86400000); } catch { return 0; }
}

function relativeTime(date) {
  const diff = Date.now() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return '今日';
  if (days === 1) return '昨日';
  if (days < 7)  return `${days}日前`;
  if (days < 30) return `${Math.floor(days/7)}週間前`;
  return `${Math.floor(days/30)}か月前`;
}


let mtgSidePanelOpen = false;
function toggleMtgSidePanel() {
  mtgSidePanelOpen = !mtgSidePanelOpen;
  const panel = document.getElementById('mtg-side-panel');
  const btn   = document.getElementById('mtg-side-btn');
  if (panel) panel.style.width = mtgSidePanelOpen ? '320px' : '0';
  if (btn) {
    btn.style.borderColor = mtgSidePanelOpen ? 'var(--accent)' : 'var(--border2)';
    btn.style.color       = mtgSidePanelOpen ? 'var(--accent)' : 'var(--text2)';
    btn.style.background  = mtgSidePanelOpen ? 'var(--accent-glow)' : 'var(--bg3)';
  }
  if (mtgSidePanelOpen) renderMtgList();
}

// ─── TAB SYSTEM ───
const EXTRA_TABS = {
  sheet: {
    label: 'Wiki',
    icon: `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.3"/><path d="M5 6h6M5 8.5h4M5 11h5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/></svg>`,
    init: initSheetTab
  }
};
let activeDynamicTabs = [];

function openAddTabMenu(e) {
  e.stopPropagation();
  document.querySelectorAll('.add-tab-menu').forEach(m => m.remove());
  const menu = document.createElement('div');
  menu.className = 'add-tab-menu';
  menu.style.cssText = `position:fixed;z-index:500;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:6px;box-shadow:0 8px 32px rgba(0,0,0,.15);min-width:180px;`;
  const btn = document.getElementById('add-tab-btn');
  const rect = btn.getBoundingClientRect();
  menu.style.left = rect.left + 'px';
  menu.style.top  = (rect.bottom + 6) + 'px';
  const lbl = document.createElement('div');
  lbl.style.cssText = `font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);letter-spacing:.8px;text-transform:uppercase;padding:4px 10px 6px;`;
  lbl.textContent = 'タブを追加';
  menu.appendChild(lbl);
  Object.entries(EXTRA_TABS).forEach(([key, def]) => {
    const already = activeDynamicTabs.includes(key);
    const item = document.createElement('button');
    item.style.cssText = `display:flex;align-items:center;gap:8px;width:100%;padding:8px 12px;background:${already?'var(--bg3)':'transparent'};border:none;border-radius:6px;cursor:${already?'default':'pointer'};font-family:'DM Sans',sans-serif;font-size:13px;color:${already?'var(--text3)':'var(--text)'};text-align:left;`;
    item.innerHTML = def.icon + `<span>${def.label}</span>` + (already?'<span style="margin-left:auto;font-size:10px;color:var(--text3);">追加済み</span>':'');
    if (!already) {
      item.addEventListener('mouseenter',()=>item.style.background='var(--bg3)');
      item.addEventListener('mouseleave',()=>item.style.background='transparent');
      item.onclick = () => { menu.remove(); addDynamicTab(key); };
    }
    menu.appendChild(item);
  });
  document.body.appendChild(menu);
  setTimeout(()=>document.addEventListener('click',()=>menu.remove(),{once:true}),0);
}

function addDynamicTab(key) {
  if (activeDynamicTabs.includes(key)) { switchTab(key); return; }
  activeDynamicTabs.push(key);
  const def = EXTRA_TABS[key];
  const dynTabs = document.getElementById('dynamic-tabs');
  const btn = document.createElement('button');
  btn.className = 'main-tab';
  btn.id = `tab-${key}`;
  btn.innerHTML = def.icon + `<span>${def.label}</span>`;
  btn.onclick = () => switchTab(key);
  dynTabs.appendChild(btn);
  if (!document.getElementById(`view-${key}`)) {
    const view = document.createElement('div');
    view.id = `view-${key}`;
    view.className = 'tab-view';
    view.style.cssText = 'padding-right:56px;';
    document.getElementById('dynamic-tab-views').appendChild(view);
  }
  def.init(key);
  switchTab(key);
}

// ─── 課題リスト ───
const ISSUE_TYPES    = ['質問', '確認', 'バグ', '依頼', 'その他'];
const ISSUE_STATUSES = ['新規', '対応中', '解決済み'];

const ISSUE_TYPE_STYLE = {
  '質問':   { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb' },
  '確認':   { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  'バグ':   { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
  '依頼':   { bg: 'rgba(168,85,247,0.12)',  color: '#9333ea' },
  'その他': { bg: 'rgba(156,163,175,0.12)', color: '#6b7280' },
};
const ISSUE_STATUS_STYLE = {
  '新規':    { bg: 'rgba(156,163,175,0.12)', color: '#6b7280',  border: 'rgba(156,163,175,0.3)'  },
  '対応中':  { bg: 'rgba(37,99,235,0.10)',   color: '#2563eb',  border: 'rgba(37,99,235,0.28)'   },
  '解決済み':{ bg: 'rgba(5,150,105,0.10)',   color: '#059669',  border: 'rgba(5,150,105,0.28)'   },
};

function getIssues() {
  if (!generatedData.issues) generatedData.issues = [];
  return generatedData.issues;
}

function addIssue() {
  const issues = getIssues();
  issues.push({
    id: Date.now() + Math.random(),
    resolved: false,
    title: '',
    detail: '',
    page: '',
    type: '確認',
    status: '新規',
    assigneeMi: null,
    deadline: '',
  });
  renderIssueList();
  // 新行のタイトルセルにフォーカス
  setTimeout(() => {
    const inputs = document.querySelectorAll('.issue-title-input');
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  }, 40);
}

function removeIssue(id) {
  if (!generatedData.issues) return;
  generatedData.issues = generatedData.issues.filter(i => i.id !== id);
  renderIssueList();
}

function renderIssueList() {
  const body = document.getElementById('issues-body');
  if (!body) return;
  body.innerHTML = '';
  const issues = getIssues();

  // ── ヘッダーバー ──
  const topBar = document.createElement('div');
  topBar.style.cssText = `display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;`;
  const resolvedCount = issues.filter(i => i.resolved).length;
  topBar.innerHTML = `
    <div>
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:18px;color:var(--text);">課題リスト</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);margin-top:3px;letter-spacing:.5px;">${issues.length}件 · 解決済み ${resolvedCount}件</div>
    </div>`;
  body.appendChild(topBar);

  // ── テーブル ──
  const table = document.createElement('div');
  table.className = 'issue-table';

  // ヘッダー行
  const COLS = `32px 1fr 180px 100px 72px 90px 130px 100px 32px`;
  const head = document.createElement('div');
  head.className = 'issue-head';
  head.style.gridTemplateColumns = COLS;
  head.innerHTML = `
    <div></div>
    <div class="issue-hcell">対応・確認事項</div>
    <div class="issue-hcell">詳細メモ</div>
    <div class="issue-hcell">ページ / 箇所</div>
    <div class="issue-hcell">タイプ</div>
    <div class="issue-hcell">ステータス</div>
    <div class="issue-hcell">担当者</div>
    <div class="issue-hcell">期限日</div>
    <div></div>`;
  table.appendChild(head);

  // データ行
  issues.forEach((issue, idx) => {
    table.appendChild(makeIssueRow(issue, idx, COLS));
  });

  // フッター「追加」行
  const footer = document.createElement('div');
  footer.className = 'issue-footer-row';
  footer.addEventListener('click', addIssue);
  footer.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> アイテムを追加する`;
  table.appendChild(footer);

  body.appendChild(table);
}

function makeIssueRow(issue, idx, COLS) {
  const ss  = ISSUE_STATUS_STYLE[issue.status] || ISSUE_STATUS_STYLE['新規'];
  const ts  = ISSUE_TYPE_STYLE[issue.type]   || ISSUE_TYPE_STYLE['その他'];
  const row = document.createElement('div');
  row.className = 'issue-row' + (issue.resolved ? ' issue-resolved' : '');
  row.style.gridTemplateColumns = COLS;
  row.dataset.id = issue.id;

  // ── チェック ──
  const checkCell = document.createElement('div');
  checkCell.className = 'issue-cell issue-check-cell';
  const check = document.createElement('button');
  check.className = 'issue-check' + (issue.resolved ? ' done' : '');
  check.innerHTML = issue.resolved
    ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.5l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`
    : '';
  check.addEventListener('click', e => {
    e.stopPropagation();
    issue.resolved = !issue.resolved;
    issue.status = issue.resolved ? '解決済み' : '対応中';
    renderIssueList();
  });
  checkCell.appendChild(check);

  // ── タイトル ──
  const titleCell = document.createElement('div');
  titleCell.className = 'issue-cell';
  const titleInp = document.createElement('input');
  titleInp.type = 'text';
  titleInp.value = issue.title;
  titleInp.placeholder = '確認事項を入力…';
  titleInp.className = 'issue-title-input';
  if (issue.resolved) titleInp.style.textDecoration = 'line-through';
  titleInp.addEventListener('input', () => { issue.title = titleInp.value; });
  titleInp.addEventListener('click', e => e.stopPropagation());
  titleCell.appendChild(titleInp);

  // ── 詳細メモ ──
  const detailCell = document.createElement('div');
  detailCell.className = 'issue-cell issue-detail-cell';
  const detailInp = document.createElement('input');
  detailInp.type = 'text';
  detailInp.value = issue.detail;
  detailInp.placeholder = '詳細…';
  detailInp.className = 'issue-detail-input';
  detailInp.addEventListener('input', () => { issue.detail = detailInp.value; });
  detailInp.addEventListener('click', e => e.stopPropagation());
  detailCell.appendChild(detailInp);

  // ── ページ / 箇所 ──
  const pageCell = document.createElement('div');
  pageCell.className = 'issue-cell issue-detail-cell';
  const pageInp = document.createElement('input');
  pageInp.type = 'text';
  pageInp.value = issue.page;
  pageInp.placeholder = 'TOP / 検索…';
  pageInp.className = 'issue-detail-input';
  pageInp.addEventListener('input', () => { issue.page = pageInp.value; });
  pageInp.addEventListener('click', e => e.stopPropagation());
  pageCell.appendChild(pageInp);

  // ── タイプ（クリックでポップアップ）──
  const typeCell = document.createElement('div');
  typeCell.className = 'issue-cell issue-tag-cell';
  const typeTag = document.createElement('button');
  typeTag.className = 'issue-tag';
  typeTag.style.cssText = `background:${ts.bg};color:${ts.color};`;
  typeTag.textContent = issue.type || 'タイプ';
  typeTag.addEventListener('click', e => {
    e.stopPropagation();
    showIssuePopup(typeTag, ISSUE_TYPES, issue.type, val => {
      issue.type = val;
      renderIssueList();
    }, ISSUE_TYPE_STYLE);
  });
  typeCell.appendChild(typeTag);

  // ── ステータス ──
  const statusCell = document.createElement('div');
  statusCell.className = 'issue-cell issue-tag-cell';
  const statusTag = document.createElement('button');
  statusTag.className = 'issue-status-tag';
  statusTag.style.cssText = `background:${ss.bg};color:${ss.color};border-color:${ss.border};`;
  statusTag.textContent = issue.status || 'ステータス';
  statusTag.addEventListener('click', e => {
    e.stopPropagation();
    showIssuePopup(statusTag, ISSUE_STATUSES, issue.status, val => {
      issue.status = val;
      issue.resolved = (val === '解決済み');
      renderIssueList();
    }, ISSUE_STATUS_STYLE);
  });
  statusCell.appendChild(statusTag);

  // ── 担当者 ──
  const assigneeCell = document.createElement('div');
  assigneeCell.className = 'issue-cell issue-assignee-cell';
  const members = generatedData?.members || [];
  const assigneeBtn = document.createElement('button');
  assigneeBtn.className = 'issue-assignee-btn';
  if (issue.assigneeMi !== null && members[issue.assigneeMi]) {
    const m = members[issue.assigneeMi];
    const mColor = ROLE_COLORS[m.role] || ROLE_COLORS['その他'];
    const initials = (m.name || m.role).slice(0, 2);
    assigneeBtn.innerHTML = `<div class="avatar" style="width:18px;height:18px;font-size:7px;background:${mColor};">${initials}</div><span>${m.name || m.role}</span>`;
  } else {
    assigneeBtn.innerHTML = `<span style="color:var(--text3);">— 未割当</span>`;
  }
  assigneeBtn.addEventListener('click', e => {
    e.stopPropagation();
    showAssigneePopup(assigneeBtn, members, issue.assigneeMi, mi => {
      issue.assigneeMi = mi;
      renderIssueList();
    });
  });
  assigneeCell.appendChild(assigneeBtn);

  // ── 期限日 ──
  const dlCell = document.createElement('div');
  dlCell.className = 'issue-cell issue-dl-cell';
  const dlBtn = document.createElement('button');
  dlBtn.className = 'issue-dl-btn';
  if (issue.deadline) {
    const dlDate = new Date(issue.deadline);
    const today  = new Date(); today.setHours(0,0,0,0);
    const diff   = Math.ceil((dlDate - today) / 86400000);
    const color  = diff < 0 ? '#dc2626' : diff <= 3 ? '#d97706' : 'var(--text2)';
    dlBtn.innerHTML = `<span style="color:${color};">${issue.deadline}</span>`;
  } else {
    dlBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3 1v2M7 1v2M1 4.5h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  }
  dlBtn.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.dl-picker-wrap').forEach(el => el.remove());
    const wrap = document.createElement('div');
    wrap.className = 'dl-picker-wrap';
    wrap.style.cssText = `position:fixed;z-index:600;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);display:flex;align-items:center;gap:8px;`;
    const rect = dlBtn.getBoundingClientRect();
    wrap.style.left = Math.min(rect.left, window.innerWidth - 220) + 'px';
    wrap.style.top  = (rect.bottom + 6) + 'px';
    const inp = document.createElement('input');
    inp.type = 'date'; inp.value = issue.deadline || '';
    inp.style.cssText = `background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none;`;
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'クリア';
    clearBtn.style.cssText = `background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:4px 8px;border-radius:4px;white-space:nowrap;`;
    clearBtn.onclick = ev => { ev.stopPropagation(); issue.deadline = ''; wrap.remove(); renderIssueList(); };
    inp.addEventListener('change', () => { issue.deadline = inp.value; wrap.remove(); renderIssueList(); });
    inp.addEventListener('click', ev => ev.stopPropagation());
    wrap.appendChild(inp); wrap.appendChild(clearBtn);
    wrap.addEventListener('click', ev => ev.stopPropagation());
    document.body.appendChild(wrap);
    setTimeout(() => inp.click(), 50);
    setTimeout(() => document.addEventListener('click', () => wrap.remove(), { once: true }), 100);
  });
  dlCell.appendChild(dlBtn);

  // ── 削除 ──
  const delCell = document.createElement('div');
  delCell.className = 'issue-cell issue-del-cell';
  const delBtn = document.createElement('button');
  delBtn.className = 'issue-del-btn';
  delBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  delBtn.addEventListener('click', e => { e.stopPropagation(); removeIssue(issue.id); });
  delCell.appendChild(delBtn);

  row.appendChild(checkCell);
  row.appendChild(titleCell);
  row.appendChild(detailCell);
  row.appendChild(pageCell);
  row.appendChild(typeCell);
  row.appendChild(statusCell);
  row.appendChild(assigneeCell);
  row.appendChild(dlCell);
  row.appendChild(delCell);
  return row;
}

function showIssuePopup(anchor, options, current, onSelect, styleMap) {
  document.querySelectorAll('.issue-popup').forEach(p => p.remove());
  const popup = document.createElement('div');
  popup.className = 'issue-popup';
  const rect = anchor.getBoundingClientRect();
  popup.style.left = Math.min(rect.left, window.innerWidth - 150) + 'px';
  popup.style.top  = (rect.bottom + 4) + 'px';
  options.forEach(opt => {
    const st  = styleMap?.[opt];
    const btn = document.createElement('button');
    btn.className = 'issue-popup-opt';
    if (st) btn.style.cssText = `background:${opt === current ? st.bg : 'transparent'};color:${st.color};`;
    else    btn.style.cssText = `background:${opt === current ? 'var(--bg3)' : 'transparent'};color:var(--text);`;
    if (st) {
      btn.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${st.color};flex-shrink:0;display:inline-block;"></span>${opt}`;
    } else {
      btn.textContent = opt;
    }
    btn.addEventListener('mouseenter', () => { if (st) btn.style.background = st.bg; else btn.style.background = 'var(--bg3)'; });
    btn.addEventListener('mouseleave', () => { if (opt !== current) btn.style.background = 'transparent'; });
    btn.addEventListener('click', e => { e.stopPropagation(); popup.remove(); onSelect(opt); });
    popup.appendChild(btn);
  });
  document.body.appendChild(popup);
  popup.addEventListener('click', e => e.stopPropagation());
  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 0);
}

function showAssigneePopup(anchor, members, currentMi, onSelect) {
  document.querySelectorAll('.issue-popup').forEach(p => p.remove());
  const popup = document.createElement('div');
  popup.className = 'issue-popup';
  const rect = anchor.getBoundingClientRect();
  popup.style.left = Math.min(rect.left, window.innerWidth - 170) + 'px';
  popup.style.top  = (rect.bottom + 4) + 'px';

  // 未割当
  const noneBtn = document.createElement('button');
  noneBtn.className = 'issue-popup-opt';
  noneBtn.style.cssText = `background:${currentMi === null ? 'var(--bg3)' : 'transparent'};color:var(--text3);`;
  noneBtn.textContent = '— 未割当';
  noneBtn.addEventListener('click', e => { e.stopPropagation(); popup.remove(); onSelect(null); });
  popup.appendChild(noneBtn);

  members.forEach((m, mi) => {
    const mColor = ROLE_COLORS[m.role] || ROLE_COLORS['その他'];
    const initials = (m.name || m.role).slice(0, 2);
    const btn = document.createElement('button');
    btn.className = 'issue-popup-opt';
    btn.style.cssText = `background:${mi === currentMi ? 'var(--bg3)' : 'transparent'};color:var(--text);`;
    btn.innerHTML = `<div class="avatar" style="width:16px;height:16px;font-size:6px;background:${mColor};flex-shrink:0;">${initials}</div><span>${m.name || m.role}</span>`;
    btn.addEventListener('mouseenter', () => btn.style.background = 'var(--bg3)');
    btn.addEventListener('mouseleave', () => { if (mi !== currentMi) btn.style.background = 'transparent'; });
    btn.addEventListener('click', e => { e.stopPropagation(); popup.remove(); onSelect(mi); });
    popup.appendChild(btn);
  });

  document.body.appendChild(popup);
  popup.addEventListener('click', e => e.stopPropagation());
  setTimeout(() => document.addEventListener('click', () => popup.remove(), { once: true }), 0);
}

// ─── WIKI ───
// wikiBlocks: { id, type:'text'|'link'|'divider', content }
function getWikiBlocks() {
  if (!generatedData.wikiBlocks) generatedData.wikiBlocks = [];
  return generatedData.wikiBlocks;
}

function renderWiki() {
  const body = document.getElementById('wiki-body');
  if (!body) return;
  body.innerHTML = '';
  const blocks = getWikiBlocks();

  // ヘッダー
  const header = document.createElement('div');
  header.style.cssText = `display:flex;align-items:center;justify-content:space-between;margin-bottom:24px;`;
  header.innerHTML = `
    <div>
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:18px;color:var(--text);">Wiki</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);margin-top:3px;letter-spacing:.5px;">プロジェクト資料・リンク・メモ</div>
    </div>
    <div style="display:flex;gap:6px;">
      <button onclick="addWikiBlock('text')"    class="wiki-add-btn">＋ テキスト</button>
      <button onclick="addWikiBlock('link')"    class="wiki-add-btn">＋ リンク</button>
      <button onclick="addWikiBlock('divider')" class="wiki-add-btn">― 区切り</button>
    </div>`;
  body.appendChild(header);

  if (!blocks.length) {
    const empty = document.createElement('div');
    empty.style.cssText = `text-align:center;padding:60px 0;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:13px;`;
    empty.textContent = 'テキスト・リンク・区切り線を追加できます';
    body.appendChild(empty);
    return;
  }

  const list = document.createElement('div');
  list.style.cssText = `display:flex;flex-direction:column;gap:10px;`;
  blocks.forEach((block, i) => {
    list.appendChild(makeWikiBlock(block, i));
  });
  body.appendChild(list);
}

function addWikiBlock(type) {
  const blocks = getWikiBlocks();
  const id = Date.now() + Math.random();
  if (type === 'text')    blocks.push({ id, type: 'text',    content: '' });
  if (type === 'link')    blocks.push({ id, type: 'link',    url: '', label: '' });
  if (type === 'divider') blocks.push({ id, type: 'divider', label: '' });
  renderWiki();
  // 新しいブロックにフォーカス
  setTimeout(() => {
    const inputs = document.querySelectorAll('#wiki-body [data-wiki-focus]');
    const last = inputs[inputs.length - 1];
    if (last) last.focus();
  }, 50);
}

function removeWikiBlock(id) {
  if (!generatedData.wikiBlocks) return;
  generatedData.wikiBlocks = generatedData.wikiBlocks.filter(b => b.id !== id);
  renderWiki();
}

function makeWikiBlock(block, i) {
  const wrap = document.createElement('div');
  wrap.className = 'wiki-block';
  wrap.dataset.id = block.id;

  // 削除ボタン（ホバーで表示）
  const del = document.createElement('button');
  del.className = 'wiki-del-btn';
  del.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2l8 8M10 2L2 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
  del.addEventListener('click', () => removeWikiBlock(block.id));
  wrap.appendChild(del);

  if (block.type === 'divider') {
    wrap.classList.add('wiki-block-divider');
    const labelInp = document.createElement('input');
    labelInp.type = 'text';
    labelInp.value = block.label || '';
    labelInp.placeholder = 'セクション名（省略可）';
    labelInp.className = 'wiki-divider-label';
    labelInp.setAttribute('data-wiki-focus', '1');
    labelInp.addEventListener('input', () => {
      getWikiBlocks()[i].label = labelInp.value;
    });
    const line = document.createElement('div');
    line.className = 'wiki-divider-line';
    wrap.appendChild(labelInp);
    wrap.appendChild(line);

  } else if (block.type === 'text') {
    wrap.classList.add('wiki-block-text');
    const ta = document.createElement('textarea');
    ta.value = block.content || '';
    ta.placeholder = '概要・メモ・説明文を入力…';
    ta.className = 'wiki-text-area';
    ta.setAttribute('data-wiki-focus', '1');
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
      getWikiBlocks()[i].content = ta.value;
    });
    wrap.appendChild(ta);
    // 初期高さ
    setTimeout(() => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; }, 0);

  } else if (block.type === 'link') {
    wrap.classList.add('wiki-block-link');
    const labelInp = document.createElement('input');
    labelInp.type = 'text';
    labelInp.value = block.label || '';
    labelInp.placeholder = 'ラベル（例：デザインカンプ）';
    labelInp.className = 'wiki-link-label';
    labelInp.setAttribute('data-wiki-focus', '1');
    labelInp.addEventListener('input', () => { getWikiBlocks()[i].label = labelInp.value; });

    const urlInp = document.createElement('input');
    urlInp.type = 'url';
    urlInp.value = block.url || '';
    urlInp.placeholder = 'https://…';
    urlInp.className = 'wiki-link-url';
    urlInp.addEventListener('input', () => { getWikiBlocks()[i].url = urlInp.value; });

    const openBtn = document.createElement('a');
    openBtn.className = 'wiki-link-open';
    openBtn.href = block.url || '#';
    openBtn.target = '_blank';
    openBtn.rel = 'noopener noreferrer';
    openBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    openBtn.title = '開く';
    urlInp.addEventListener('input', () => { openBtn.href = urlInp.value || '#'; });

    const linkIcon = document.createElement('div');
    linkIcon.className = 'wiki-link-icon';
    linkIcon.innerHTML = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M7 3H3a1 1 0 00-1 1v9a1 1 0 001 1h9a1 1 0 001-1v-4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><path d="M9 1h6v6M15 1L8 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

    wrap.appendChild(linkIcon);
    wrap.appendChild(labelInp);
    wrap.appendChild(urlInp);
    wrap.appendChild(openBtn);
  }

  return wrap;
}

// ─── Wiki（旧sheet互換用） ───
function initSheetTab(key) {
  const view = document.getElementById(`view-${key}`);
  if (!view) return;
  view.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
      <div>
        <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:16px;color:var(--text);">Wiki</div>
        <div style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text3);margin-top:3px;">スプレッドシートのURLを登録</div>
      </div>
    </div>
    <div style="background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:20px;margin-bottom:20px;">
      <div style="font-size:12px;color:var(--text2);margin-bottom:10px;font-family:'DM Sans',sans-serif;">スプレッドシートのURLを貼り付け</div>
      <div style="display:flex;gap:8px;">
        <input id="sheet-url-input" type="text" placeholder="https://docs.google.com/spreadsheets/d/..."
          style="flex:1;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:10px 12px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none;box-sizing:border-box;"
          onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border2)'"
          onkeydown="if(event.key==='Enter')registerSheet()">
        <button onclick="registerSheet()" style="background:var(--accent);color:#fff;border:none;border-radius:6px;padding:10px 18px;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;cursor:pointer;white-space:nowrap;flex-shrink:0;"
          onmouseover="this.style.background='var(--accent2)'" onmouseout="this.style.background='var(--accent)'">登録</button>
      </div>
    </div>
    <div id="sheet-card-area"></div>`;
}

function registerSheet() {
  const input = document.getElementById('sheet-url-input');
  const area  = document.getElementById('sheet-card-area');
  if (!input || !area || !input.value.trim()) return;

  const url = input.value.trim();
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (!idMatch) {
    area.innerHTML = `<div style="color:#dc2626;font-size:12px;padding:8px 0;">Googleスプレッドシートの正しいURLを入力してください</div>`;
    return;
  }
  const sheetId = idMatch[1];
  const thumbUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/preview`;

  // 登録されたシートをlocalStorageに保存
  const d = generatedData;
  if (d) {
    if (!d.sheets) d.sheets = [];
    if (!d.sheets.find(s => s.url === url)) {
      d.sheets.push({ url, sheetId, name: 'スプレッドシート', addedAt: new Date().toISOString() });
    }
  }

  renderSheetCards();
  input.value = '';
}

function renderSheetCards() {
  const area = document.getElementById('sheet-card-area');
  if (!area) return;
  const sheets = generatedData?.sheets || [];

  if (!sheets.length) {
    area.innerHTML = `<div style="text-align:center;color:var(--text3);padding:60px;font-family:'DM Sans',sans-serif;font-size:13px;">
      URLを登録するとここに表示されます
    </div>`;
    return;
  }

  area.innerHTML = '';
  sheets.forEach((sheet, i) => {
    const card = document.createElement('div');
    card.style.cssText = `display:flex;align-items:center;gap:16px;background:var(--bg2);border:1px solid var(--border);border-radius:10px;padding:16px 20px;margin-bottom:10px;transition:border-color .2s;`;
    card.addEventListener('mouseenter', () => card.style.borderColor = 'var(--accent)');
    card.addEventListener('mouseleave', () => card.style.borderColor = 'var(--border)');

    // アイコン
    card.innerHTML = `
      <div style="width:40px;height:40px;background:rgba(16,163,127,0.12);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="2" width="16" height="16" rx="2" stroke="#10a37f" stroke-width="1.5"/><path d="M2 7h16M2 12h16M7 7v9M12 7v9" stroke="#10a37f" stroke-width="1.3" stroke-linecap="round"/></svg>
      </div>
      <div style="flex:1;min-width:0;">
        <div style="font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" id="sheet-name-${i}">${sheet.name || 'スプレッドシート'}</div>
        <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sheet.url}</div>
      </div>
      <div style="display:flex;gap:8px;flex-shrink:0;">
        <button onclick="window.open('${sheet.url}','_blank')" style="display:flex;align-items:center;gap:5px;background:var(--accent);color:#fff;border:none;border-radius:6px;padding:7px 14px;font-family:'Syne',sans-serif;font-weight:700;font-size:12px;cursor:pointer;"
          onmouseover="this.style.background='var(--accent2)'" onmouseout="this.style.background='var(--accent)'">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 10L10 2M10 2H5M10 2v5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          開く
        </button>
        <button onclick="removeSheet(${i})" style="background:none;border:1px solid var(--border);border-radius:6px;padding:7px 10px;color:var(--text3);cursor:pointer;font-size:12px;"
          onmouseover="this.style.borderColor='#dc2626';this.style.color='#dc2626'" onmouseout="this.style.borderColor='var(--border)';this.style.color='var(--text3)'">×</button>
      </div>`;
    area.appendChild(card);
  });
}

function removeSheet(i) {
  if (generatedData?.sheets) {
    generatedData.sheets.splice(i, 1);
    renderSheetCards();
  }
}

// ─── 未保存チェック ───
function hasUnsavedChanges() {
  if (!generatedData) return false;
  const snaps = getSnapshots();
  const last = snaps.find(s => s.data.projectName === generatedData.projectName);
  return !last;
}

function confirmLeave(onOk) {
  if (!generatedData || !hasUnsavedChanges()) { onOk(); return; }
  showConfirm(
    '現在のプロジェクトに未保存の変更があります。\n保存しないで移動しますか？',
    '移動する', '#d97706',
    onOk,
    {
      saveBtn: true,
      onSave: () => { saveSnapshot(); onOk(); }
    }
  );
}

function toggleSidebar() {
  const sb  = document.getElementById('sidebar');
  const ov  = document.getElementById('sidebar-overlay');
  const btn = document.getElementById('sidebar-toggle');
  const isOpen = sb.classList.contains('open');
  if (isOpen) {
    sb.classList.remove('open');
    ov.classList.remove('show');
  } else {
    sb.classList.add('open');
    ov.classList.add('show');
    if (generatedData) showSaveBtn();
    renderSnapshotList();
  }
}
function closeSidebar() {
  document.getElementById('sidebar')?.classList.remove('open');
  document.getElementById('sidebar-overlay')?.classList.remove('show');
}

function showPanel(n) {
  const doShow = () => {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-step').forEach(s => s.classList.remove('active'));
    document.getElementById(`panel-${n}`)?.classList.add('active');
    document.getElementById(`nav-${n}`)?.classList.add('active');
    // アイコンレールのアクティブ状態
    document.querySelectorAll('#icon-rail .rail-btn').forEach((b,i) => b.classList.toggle('active', i === n));
    if (n > 1) {
      document.getElementById('nav-1')?.classList.add('done');
      showSaveBtn();
    }
    if (n === 0) renderDashboard();
    closeSidebar();
  };
  if (n === 1 && generatedData) {
    confirmLeave(doShow);
  } else {
    doShow();
  }
}

function setLayout(layout, btn) {
  document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const board = document.getElementById('member-board');
  board.className = `member-board layout-${layout} active`;
}

// ─── DEMO DATA ───
function fillDemo() {
  document.getElementById('proj-name').value = 'ECサイトリニューアル';
  document.getElementById('proj-client').value = '株式会社テックショップ';
  document.getElementById('proj-desc').value = '既存ECサイトのフルリニューアル。React+TypeScriptでSPA化し、Go製APIサーバーと連携。決済（Stripe）・在庫管理・推薦エンジン統合が必要。パフォーマンス改善とSEO対応も含む。';

  const today2 = new Date();
  const end2 = new Date(); end2.setDate(today2.getDate() + 90);
  const startStr = today2.toISOString().split('T')[0];
  const endStr = end2.toISOString().split('T')[0];
  selectDate('start', startStr);
  selectDate('end', endStr);

  selectedCategories = ['Webサイト制作', 'MVVの作成', 'ロゴ制作'];
  initCategoryChips();

  members = [];
  memberIdx = 0;
  const demoMembers = [
    { name: '田中 一郎', role: 'PM', rate: 100 },
    { name: '鈴木 翔太', role: 'プロデューサー', rate: 100 },
    { name: '佐藤 美咲', role: 'ディレクター', rate: 100 },
    { name: '山田 健二', role: 'アートディレクター', rate: 100 },
    { name: '中村 さくら', role: 'デザイナー', rate: 80 },
    { name: '小林 陽介', role: 'フロントエンド', rate: 100 },
    { name: '高橋 理奈', role: 'コピーライター', rate: 80 },
  ];
  demoMembers.forEach(m => addMember(m.name, m.role, m.rate));
}

// ─── VALIDATION ───
function validate() {
  const name = document.getElementById('proj-name').value.trim();
  const desc = document.getElementById('proj-desc').value.trim();
  const start = document.getElementById('proj-start').value;
  const end = document.getElementById('proj-end').value;
  return name && desc && start && end && members.length > 0;
}

// ─── AI GENERATION ───
async function generateTasks() {
  const errEl = document.getElementById('step1-error');
  if (!validate()) { errEl.classList.add('show'); return; }
  errEl.classList.remove('show');

  const overlay  = document.getElementById('loading');
  const progress = document.getElementById('loading-progress');
  const subtitle = document.getElementById('loading-subtitle');
  const elapsed  = document.getElementById('loading-elapsed');
  overlay.classList.add('show');

  const steps = ['ls-1','ls-2','ls-3','ls-4'];
  const stepLabels = [
    '案件概要・メンバー情報を解析中…',
    'ロール別タスクを生成中…',
    'フェーズ・スケジュールを最適化中…',
    'プロジェクトを構築中…'
  ];
  const stepProgress = [15, 40, 70, 90];

  steps.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.className = 'loading-step';
  });

  // 経過時間タイマー
  const startTime = Date.now();
  const elapsedTimer = setInterval(() => {
    const sec = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed) elapsed.textContent = `${sec}秒経過`;
  }, 1000);

  let stepIdx = 0;
  const stepTimer = setInterval(() => {
    if (stepIdx > 0) {
      const prevEl = document.getElementById(steps[stepIdx-1]);
      if (prevEl) {
        prevEl.className = 'loading-step done';
        prevEl.querySelector('.step-icon').textContent = '✓';
      }
    }
    if (stepIdx < steps.length) {
      const curEl = document.getElementById(steps[stepIdx]);
      if (curEl) curEl.className = 'loading-step active';
      if (subtitle) subtitle.textContent = stepLabels[stepIdx];
      if (progress) progress.style.width = stepProgress[stepIdx] + '%';
      stepIdx++;
    }
  }, 1200);

  const finishLoading = (immediate = false) => {
    clearInterval(stepTimer);
    clearInterval(elapsedTimer);
    steps.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.className = 'loading-step done';
        const icon = el.querySelector('.step-icon');
        if (icon) icon.textContent = '✓';
      }
    });
    if (progress) progress.style.width = '100%';
    if (subtitle) subtitle.textContent = immediate ? 'フォールバックデータを使用します' : '完了しました！';
    const delay = immediate ? 0 : 400;
    setTimeout(() => overlay.classList.remove('show'), delay);
  };

  const projName   = document.getElementById('proj-name').value.trim();
  const projDesc   = document.getElementById('proj-desc').value.trim();
  const projClient = document.getElementById('proj-client')?.value.trim() || '';
  const start      = document.getElementById('proj-start').value;
  const end        = document.getElementById('proj-end').value;
  const totalDays  = daysBetween(start, end) + 1;
  const categories = [...selectedCategories];
  const mainCat    = categories[0] || 'その他';

  // フェーズ定義
  const CAT_PHASES_LOCAL = {
    'Webサイト制作':  ['要件定義', 'IA・設計', 'デザイン', '実装・コーディング', 'テスト', 'リリース'],
    '動画制作':       ['企画・構成', 'スクリプト', '撮影', '編集・CG', '納品'],
    'CM制作':         ['オリエン', '企画・コンテ', 'プリプロ', '撮影', 'ポスプロ', '納品'],
    'ロゴ制作':       ['ヒアリング', 'コンセプト', 'デザイン案', '修正・調整', '納品'],
    'MVVの作成':      ['ヒアリング', '調査・分析', 'ドラフト作成', 'レビュー', '確定・展開'],
    'ブランディング':  ['調査・分析', 'コンセプト設計', 'VI開発', 'ガイドライン策定', '展開'],
  };
  const phases = CAT_PHASES_LOCAL[mainCat] || ['企画', '制作', '確認', '納品'];

  const memberList = members.filter(m => m.name || m.role).map(m =>
    `・${m.name || '（名前未設定）'}（${m.role}、稼働率${m.rate}%）`
  ).join('\n');

  const prompt = `あなたは15年以上の経験を持つシニアプロジェクトマネージャーです。以下の情報をもとに、現場で実際に使えるレベルの詳細なプロジェクトスケジュールを生成してください。

## プロジェクト情報
- プロジェクト名：${projName}
- クライアント：${projClient || '未定'}
- カテゴリ：${categories.join('・')}
- 概要：${projDesc || '（概要なし）'}
- 期間：${start} 〜 ${end}（${totalDays}日間）
- フェーズ：${phases.join(' → ')}

## メンバー
${memberList}

## 生成ルール（厳守）
1. **タスク名の具体性**：「◯◯の作成」ではなく「トップページワイヤーフレームの作成・レビュー」のように成果物と工程を明示する。プロジェクト名・概要から固有名詞を抽出して使う
2. **タスク数**：稼働率100%のメンバーは6〜10タスク、稼働率50%以下は3〜5タスク
3. **サブタスク（children）**：各タスクには必ず2〜4件のサブタスクを設定する。サブタスクはタスクの具体的な作業工程を表す（例：「調査→ドラフト→社内レビュー→納品」）
4. **description**：そのタスクで何をどのように行うか、完了条件・注意点を2〜3文で記載する
5. **days（所要日数）**：親タスクのdaysはサブタスクのdays合計と一致させる。フェーズ期間に収まるよう設定
6. **フェーズ整合性**：フェーズの順序に沿って依存関係を持たせる。同一フェーズ内でも前工程→後工程の順に並べる
7. **ロール適合**：各メンバーのロールと稼働率に合ったタスクのみ割り当てる（ディレクターに実装タスクを割り当てない等）

## カテゴリ別の重点タスク例
- Webサイト制作：競合調査・サイトマップ設計・ワイヤーフレーム・デザインカンプ・コーディング・CMS構築・ブラウザテスト・SEO設定・コンテンツ入稿・公開作業
- 動画制作：企画書作成・絵コンテ制作・ロケハン・撮影・素材整理・粗編集・本編集・音楽選定・MA・カラーグレーディング・納品データ書き出し
- ブランディング：市場調査・競合分析・ペルソナ設計・コンセプト立案・ネーミング・VI設計・ロゴデザイン・ガイドライン作成・社内展開資料作成

## 出力形式（JSONのみ、前後に説明文を付けない）
{
  "projectName": "${projName}",
  "members": [
    {
      "name": "メンバー名",
      "role": "ロール名",
      "tasks": [
        {
          "name": "具体的なタスク名（固有名詞・成果物名を含む）",
          "phase": "フェーズ名（上記フェーズのいずれか）",
          "days": 数字,
          "priority": "todo",
          "description": "このタスクで行うこと・完了条件・注意点を2〜3文で記述",
          "children": [
            {
              "name": "サブタスク名（具体的な作業工程）",
              "phase": "親と同じフェーズ名",
              "days": 数字,
              "priority": "todo",
              "description": "サブタスクの詳細"
            }
          ]
        }
      ]
    }
  ]
}`;

  // 30秒タイムアウト
  const controller = new AbortController();
  const timeoutId  = setTimeout(() => controller.abort(), 30000);

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: 'あなたはプロジェクト管理の専門家です。指示されたJSON形式のみを出力し、前後に説明文・コードブロック記号（```）を一切付けないでください。',
        messages: [{ role: 'user', content: prompt }]
      })
    });
    clearTimeout(timeoutId);

    clearInterval(stepTimer);
    clearInterval(elapsedTimer);
    steps.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'loading-step done';
    });
    overlay.classList.remove('show');

    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();
    const text = data.content?.[0]?.text || '';

    // JSONを抽出してパース
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('JSON not found');
    const parsed = JSON.parse(jsonMatch[0]);

    // generatedDataを構築
    generatedData = {
      projectName: parsed.projectName || projName,
      projectDesc: projDesc,
      client: projClient,
      memberDefs: members.map(m => ({ name: m.name, role: m.role, rate: m.rate })),
      tagline: '',
      startDate: start,
      endDate: end,
      phases,
      totalDays,
      categories,
      members: parsed.members.map(m => ({
        name: m.name || '',
        role: m.role || 'その他',
        tasks: (m.tasks || []).map(t => ({
          name: t.name || '未設定',
          phase: t.phase || phases[0],
          days: Math.max(1, parseInt(t.days) || 3),
          priority: 'todo',
          description: t.description || '',
          startDate: null,
          endDate: null,
          children: (t.children || []).map(c => ({
            id: Date.now() + Math.random(),
            name: c.name || '未設定',
            phase: c.phase || t.phase || phases[0],
            days: Math.max(1, parseInt(c.days) || 1),
            priority: 'todo',
            description: c.description || '',
            startDate: null,
            endDate: null,
            children: []
          }))
        }))
      }))
    };
    generatedData.totalTasks = generatedData.members.reduce((s, m) => s + m.tasks.length, 0);

    // 「スケジュールはそのまま、タスクを引き直す」の場合、生成後にスケジュール日付を復元
    if (generatedData._keepScheduleDates) {
      const dateMap = {};
      generatedData._keepScheduleDates.forEach(s => { dateMap[s.id] = s; });
      if (generatedData.scheduleItems) {
        generatedData.scheduleItems.forEach(item => {
          if (dateMap[item.id]) {
            item.startDate = dateMap[item.id].startDate;
            item.endDate   = dateMap[item.id].endDate;
          }
        });
      }
      delete generatedData._keepScheduleDates;
    }

    renderResult();
    showPanel(2);

  } catch (err) {
    clearTimeout(timeoutId);
    finishLoading(true);
    console.warn('AI生成失敗、フォールバック使用:', err);
    useFallbackData();
  }
}

// ─── FALLBACK ───
function useFallbackData() {
  const projName = document.getElementById('proj-name').value.trim() || 'プロジェクト';
  const start = document.getElementById('proj-start').value;
  const end = document.getElementById('proj-end').value;

  const taskTemplates = {
    'PM': [
      { name: 'キックオフMTG準備・実施', phase: '要件定義', days: 3, priority: 'todo', description: 'プロジェクト開始のキックオフミーティングを実施する' },
      { name: '要件定義書作成・レビュー', phase: '要件定義', days: 5, priority: 'todo', description: '要件定義書をステークホルダーとレビューする' },
      { name: 'スケジュール・体制管理', phase: '設計', days: 3, priority: 'todo', description: 'プロジェクト全体のスケジュールと体制を整備する' },
      { name: '進捗報告・リスク管理', phase: '実装', days: 10, priority: 'todo', description: '週次で進捗を報告しリスクを管理する' },
      { name: 'クライアント最終確認', phase: 'リリース', days: 2, priority: 'todo', description: '成果物のクライアント最終確認を実施する' },
    ],
    'プランナー': [
      { name: 'プロジェクト戦略立案', phase: '要件定義', days: 4, priority: 'todo', description: 'プロジェクトの目的・ゴール・戦略を策定する' },
      { name: 'ターゲット・コンセプト設計', phase: '要件定義', days: 3, priority: 'todo', description: 'ターゲットユーザーとプロジェクトコンセプトを定義する' },
      { name: 'KPI・成果指標設定', phase: '設計', days: 2, priority: 'todo', description: 'プロジェクトの成果を測るKPIを設定する' },
      { name: 'コンテンツ設計・構成案', phase: '設計', days: 4, priority: 'todo', description: '各成果物のコンテンツ構成案を作成する' },
      { name: '効果測定・レポート', phase: 'リリース', days: 3, priority: 'todo', description: '成果物の効果測定とレポートを作成する' },
    ],
    'プロデューサー': [
      { name: 'プロジェクト全体統括', phase: '要件定義', days: 3, priority: 'todo', description: 'プロジェクト全体の方向性と品質を統括する' },
      { name: '予算・スケジュール管理', phase: '設計', days: 5, priority: 'todo', description: '予算配分とスケジュールを管理する' },
      { name: '外部パートナー調整', phase: '実装', days: 4, priority: 'todo', description: '外部ベンダー・パートナーとの連携を調整する' },
      { name: '中間プレゼン準備・実施', phase: '実装', days: 3, priority: 'todo', description: 'クライアントへの中間プレゼンを準備・実施する' },
      { name: '最終納品・引き渡し', phase: 'リリース', days: 2, priority: 'todo', description: '成果物の最終納品と引き渡しを実施する' },
    ],
    'ディレクター': [
      { name: 'ディレクション方針策定', phase: '要件定義', days: 3, priority: 'todo', description: 'プロジェクトの制作方針とトンマナを策定する' },
      { name: '制作進行管理', phase: '実装', days: 8, priority: 'todo', description: '各制作パートの進行を管理する' },
      { name: 'クリエイティブレビュー', phase: '実装', days: 5, priority: 'todo', description: '各制作物のクリエイティブ品質をレビューする' },
      { name: 'クライアント窓口対応', phase: '実装', days: 4, priority: 'todo', description: 'クライアントとの窓口として進捗を共有する' },
      { name: '修正対応・品質確認', phase: 'テスト', days: 4, priority: 'todo', description: '修正対応と最終品質確認を実施する' },
    ],
    'アートディレクター': [
      { name: 'ビジュアルコンセプト策定', phase: '設計', days: 4, priority: 'todo', description: 'プロジェクトのビジュアルコンセプトとトーンを策定する' },
      { name: 'デザインシステム構築', phase: '設計', days: 5, priority: 'todo', description: 'カラー・タイポ・コンポーネントのデザインシステムを構築する' },
      { name: 'ビジュアルデザイン制作', phase: '実装', days: 8, priority: 'todo', description: '各成果物のビジュアルデザインを制作する' },
      { name: 'デザインレビュー・修正', phase: 'テスト', days: 4, priority: 'todo', description: 'デザインのレビューと修正対応を行う' },
    ],
    'テクニカルディレクター': [
      { name: '技術要件定義', phase: '要件定義', days: 3, priority: 'todo', description: 'システム・技術スタックの要件を定義する' },
      { name: 'システム設計・アーキテクチャ', phase: '設計', days: 5, priority: 'todo', description: 'システム全体のアーキテクチャを設計する' },
      { name: '技術的課題の解決', phase: '実装', days: 6, priority: 'todo', description: '実装中の技術的課題を特定・解決する' },
      { name: 'コードレビュー', phase: '実装', days: 4, priority: 'todo', description: '開発メンバーのコードをレビューする' },
      { name: '本番環境リリース監修', phase: 'リリース', days: 2, priority: 'todo', description: '本番リリース作業を技術面から監修する' },
    ],
    'フロントエンド': [
      { name: 'UIコンポーネント設計', phase: '設計', days: 4, priority: 'todo', description: '再利用可能なUIコンポーネントを設計する' },
      { name: 'ページ実装', phase: '実装', days: 8, priority: 'todo', description: '各ページをコーディング・実装する' },
      { name: 'レスポンシブ対応', phase: '実装', days: 3, priority: 'todo', description: 'スマートフォン・タブレット向けの対応を行う' },
      { name: 'ブラウザ動作確認', phase: 'テスト', days: 3, priority: 'todo', description: '各ブラウザでの動作確認を実施する' },
    ],
    'バックエンド': [
      { name: 'API設計・ドキュメント作成', phase: '設計', days: 4, priority: 'todo', description: 'APIの設計とドキュメントを作成する' },
      { name: 'サーバーサイド実装', phase: '実装', days: 8, priority: 'todo', description: 'バックエンドAPIを実装する' },
      { name: 'DB設計・構築', phase: '設計', days: 3, priority: 'todo', description: 'データベーススキーマを設計・構築する' },
      { name: '単体テスト作成', phase: 'テスト', days: 4, priority: 'todo', description: 'API各エンドポイントの単体テストを作成する' },
    ],
    'インフラ': [
      { name: 'インフラ設計', phase: '設計', days: 4, priority: 'todo', description: 'サーバー・ネットワーク構成を設計する' },
      { name: '環境構築', phase: '実装', days: 5, priority: 'todo', description: '開発・本番環境を構築する' },
      { name: '本番環境デプロイ', phase: 'リリース', days: 2, priority: 'todo', description: '本番環境へのデプロイ作業を実施する' },
    ],
    'QA': [
      { name: 'テスト計画書作成', phase: 'テスト', days: 3, priority: 'todo', description: '全体のテスト計画と観点一覧を作成する' },
      { name: '機能テスト実施', phase: 'テスト', days: 6, priority: 'todo', description: '全機能に対して機能テストを実施する' },
      { name: 'バグ管理・追跡', phase: 'テスト', days: 4, priority: 'todo', description: '発見したバグを管理し修正状況を追跡する' },
    ],
    'デザイナー': [
      { name: 'ワイヤーフレーム作成', phase: '設計', days: 4, priority: 'todo', description: '主要画面のワイヤーフレームを作成する' },
      { name: 'UIデザイン制作', phase: '実装', days: 6, priority: 'todo', description: '各画面のUIデザインを制作する' },
      { name: 'デザイン修正対応', phase: 'テスト', days: 3, priority: 'todo', description: 'フィードバックをもとにデザインを修正する' },
    ],
    'その他': [
      { name: 'ドキュメント整備', phase: '実装', days: 3, priority: 'todo', description: '設計・運用ドキュメントを整備する' },
      { name: 'レビュー対応', phase: '実装', days: 4, priority: 'todo', description: 'レビュー指摘事項に対応する' },
    ]
  };

  const memberResults = members.map(m => {
    const templates = taskTemplates[m.role] || taskTemplates['その他'];
    return {
      name: m.name || m.role,
      role: m.role,
      tasks: templates.map(t => ({ ...t })) // ディープコピーで参照を切る
    };
  });

  // カテゴリに合わせたフェーズ・タグライン
  const CATEGORY_PHASES = {
    'Webサイト制作':   ['要件定義', 'IA・設計', 'デザイン', '実装・コーディング', 'テスト', 'リリース'],
    '動画制作':        ['企画・構成', 'スクリプト', '撮影', '編集・CG', '納品'],
    'CM制作':          ['オリエン', '企画・コンテ', 'プリプロ', '撮影', 'ポスプロ', '納品'],
    'ロゴ制作':        ['ヒアリング', 'コンセプト', 'デザイン案', '修正・調整', '納品'],
    'MVVの作成':       ['ヒアリング', '調査・分析', 'ドラフト作成', 'レビュー', '確定・展開'],
    'ブランディング':   ['調査・分析', 'コンセプト設計', 'VI開発', 'ガイドライン策定', '展開'],
  };
  const CATEGORY_TAGLINES = {
    'Webサイト制作':   '要件定義・IA・デザイン・実装・素材制作',
    '動画制作':        '企画・脚本・撮影・編集・MA・納品',
    'CM制作':          '企画・コンテ・プリプロ・撮影・ポスプロ・オンエア',
    'ロゴ制作':        'コンセプト・スケッチ・デザイン・商標確認・納品',
    'MVVの作成':       'ミッション・ビジョン・バリュー策定・言語化・社内展開',
    'ブランディング':   'リサーチ・コンセプト・VI・ガイドライン・展開',
  };
  const mainCat = selectedCategories.find(c => CATEGORY_PHASES[c]) || selectedCategories[0] || '';
  const phases  = CATEGORY_PHASES[mainCat] || ['要件定義', '設計', '実装', 'テスト', 'リリース'];
  const taglines = selectedCategories.map(c => CATEGORY_TAGLINES[c]).filter(Boolean);
  const tagline  = taglines.join(' / ') || '';

  generatedData = {
    projectName: projName,
    tagline,
    startDate: start,
    endDate: end,
    phases,
    totalTasks: memberResults.reduce((s, m) => s + m.tasks.length, 0),
    totalDays: Math.round((new Date(end) - new Date(start)) / 86400000) || 60,
    members: memberResults
  };

  renderResult();
  showPanel(2);
}

// ─── 定例 ───
let recurringList = []; // { name, dow(0-6), time, color }
let selectedRecColor = '#f59e0b';

const REC_COLORS = ['#f59e0b','#f472b6','#60a5fa','#3ecf8e','#ff6b6b','#a78bfa','#2dd4bf'];
const DOW_LABELS = ['日','月','火','水','木','金','土'];

function openRecurringDialog() {
  const overlay = document.getElementById('recurring-overlay');
  overlay.style.display = 'flex';
  renderRecColorOpts();
  renderRecurringList();
}

function closeRecurringDialog() {
  document.getElementById('recurring-overlay').style.display = 'none';
}

function renderRecColorOpts() {
  const wrap = document.getElementById('rec-color-opts');
  wrap.innerHTML = '';
  REC_COLORS.forEach(c => {
    const dot = document.createElement('div');
    dot.style.cssText = `width:20px;height:20px;border-radius:50%;background:${c};cursor:pointer;border:2px solid ${c===selectedRecColor?'#fff':'transparent'};transition:transform .15s;box-sizing:border-box;`;
    dot.title = c;
    dot.addEventListener('click', () => {
      selectedRecColor = c;
      renderRecColorOpts();
    });
    dot.addEventListener('mouseover', () => dot.style.transform='scale(1.2)');
    dot.addEventListener('mouseout',  () => dot.style.transform='scale(1)');
    wrap.appendChild(dot);
  });
}

function renderRecurringList() {
  const list = document.getElementById('recurring-list');
  list.innerHTML = '';
  if (!recurringList.length) {
    list.innerHTML = `<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px;">定例はまだ登録されていません</div>`;
    return;
  }
  recurringList.forEach((r, i) => {
    const row = document.createElement('div');
    row.style.cssText = `display:flex;align-items:center;gap:10px;background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px 14px;`;
    row.innerHTML = `
      <div style="width:10px;height:10px;border-radius:50%;background:${r.color};flex-shrink:0;"></div>
      <div style="flex:1;">
        <div style="font-size:13px;color:var(--text);font-weight:500;">${r.name}</div>
        <div style="font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;">毎週${DOW_LABELS[r.dow]}曜日 ${r.time}</div>
      </div>
      <button onclick="removeRecurring(${i})" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:2px 6px;border-radius:4px;transition:color .15s;" onmouseover="this.style.color='#ff6b6b'" onmouseout="this.style.color='var(--text3)'">×</button>`;
    list.appendChild(row);
  });
}

function addRecurring() {
  const name = document.getElementById('rec-name').value.trim() || '定例MTG';
  const dow  = +document.getElementById('rec-dow').value;
  const time = document.getElementById('rec-time').value || '10:00';
  recurringList.push({ name, dow, time, color: selectedRecColor });
  document.getElementById('rec-name').value = '';
  renderRecurringList();
  // タスク期限をこの定例に合わせて調整
  adjustTasksToRecurring();
  // ガントを再描画
  renderGantt();
}

function removeRecurring(i) {
  recurringList.splice(i, 1);
  renderRecurringList();
  renderGantt();
}

// タスクの終了日を「直前の定例日」に合わせて前倒し調整
function adjustTasksToRecurring() {
  if (!recurringList.length || !generatedData) return;
  const d = generatedData;

  d.members.forEach(m => {
    m.tasks.forEach(t => {
      if (!t.endDate) return;
      const originalEnd = parseDate(t.endDate);

      // 全定例の「直前発生日」（endDate以前で最も近い曜日）を求める
      let bestDate = null;
      recurringList.forEach(r => {
        // endDate から遡って r.dow の曜日を探す
        const candidate = new Date(originalEnd);
        const diff = (candidate.getDay() - r.dow + 7) % 7;
        candidate.setDate(candidate.getDate() - diff);
        // startDateより前にならないようにチェック
        if (candidate >= parseDate(t.startDate)) {
          if (!bestDate || candidate > bestDate) bestDate = candidate;
        }
      });

      if (bestDate) {
        t.endDate = toDateStr(bestDate);
        // days を再計算
        const dur = daysBetween(t.startDate, t.endDate);
        t.days = Math.max(1, dur + 1);
      }
    });
  });
}

// 子・孫タスクのガント行を再帰的に追加
function renderChildRows(mi, parentPath, parentTask, dates, d, COL_W, ROW_H, LABEL_W, color, gtLeftBody, gtRightBody, depth) {
  if (!parentTask.children || !parentTask.children.length) return;
  if (parentTask._collapsed) return;
  parentTask.children.forEach((child, ci) => {
    if (child.excludeFromSchedule || child.priority === 'done') return;
    if (!child.startDate) { child.startDate = d.startDate; child.endDate = addDays(d.startDate, (child.days||1)-1); }
    const childPath = [...parentPath, ci];
    const {lRow, rRow} = makeChildRowPair(mi, childPath, child, dates, d, COL_W, ROW_H, LABEL_W, depth);
    gtLeftBody.appendChild(lRow);
    gtRightBody.appendChild(rRow);
    if (depth < 2) renderChildRows(mi, childPath, child, dates, d, COL_W, ROW_H, LABEL_W, color, gtLeftBody, gtRightBody, depth+1);
  });
}

function makeChildRowPair(mi, path, t, dates, d, COL_W, ROW_H, LABEL_W, depth) {
  const barColor  = getBarColor(t.phase);
  const gridW     = dates.length * COL_W;
  const indentPx  = depth * 14;
  const phaseColor = (PHASE_COLORS[t.phase] || PHASE_COLORS['その他']).text;
  const startOff  = Math.max(0, daysBetween(d.startDate, t.startDate));
  const barDays   = Math.max(1, daysBetween(t.startDate, t.endDate) + 1);

  // ── 左行（ラベル）──
  const lRow = document.createElement('div');
  lRow.style.cssText = `position:relative;display:flex;align-items:center;gap:5px;padding:0 8px 0 ${6+indentPx}px;height:${ROW_H}px;border-bottom:1px solid var(--border);border-left:2px solid ${phaseColor}55;box-sizing:border-box;background:var(--bg2);`;

  const dot = document.createElement('div');
  dot.style.cssText = `width:5px;height:5px;border-radius:50%;background:${phaseColor};flex-shrink:0;`;

  const nameSpan = document.createElement('span');
  nameSpan.textContent = t.name;
  nameSpan.style.cssText = `font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;cursor:text;`;
  nameSpan.title = 'クリックで編集';
  nameSpan.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type='text'; input.value=t.name;
    input.style.cssText=`flex:1;background:var(--bg3);border:1px solid var(--accent);border-radius:4px;padding:2px 6px;font-size:11px;color:var(--text);font-family:'DM Sans',sans-serif;outline:none;min-width:0;`;
    nameSpan.replaceWith(input); input.focus(); input.select();
    const commit = () => {
      const v = input.value.trim() || t.name;
      getTaskByPath(mi, path).name = v;
      nameSpan.textContent = v;
      input.replaceWith(nameSpan);
      // バーラベルも更新
      const barLabel = rRow.querySelector('span');
      if (barLabel) barLabel.textContent = v;
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e2 => { if(e2.key==='Enter'){e2.preventDefault();input.blur();} if(e2.key==='Escape'){input.value=t.name;input.blur();} });
  });

  // サブタスク追加ボタン（深さ2まで）
  const addSubBtn = document.createElement('button');
  addSubBtn.title = 'サブタスクを追加';
  addSubBtn.style.cssText = `flex-shrink:0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;line-height:1;padding:1px 3px;border-radius:3px;transition:all .15s;opacity:0.2;`;
  addSubBtn.textContent = '＋';
  addSubBtn.addEventListener('mouseenter', () => { addSubBtn.style.color='var(--accent)'; addSubBtn.style.opacity='1'; });
  addSubBtn.addEventListener('mouseleave', () => { addSubBtn.style.color='var(--text3)'; addSubBtn.style.opacity='0.2'; });
  addSubBtn.addEventListener('click', e => {
    e.stopPropagation();
    const task = getTaskByPath(mi, path);
    if (!task.children) task.children = [];
    task.children.push({ name:'サブタスク', phase:task.phase, days:1, priority:'todo', description:'', children:[], startDate:null, endDate:null });
    renderGantt();
    syncMemberUI();
  });

  // 削除ボタン
  const delBtn = document.createElement('button');
  delBtn.title = '削除';
  delBtn.style.cssText = `flex-shrink:0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;line-height:1;padding:1px 3px;border-radius:3px;transition:all .15s;opacity:0.2;`;
  delBtn.textContent = '×';
  delBtn.addEventListener('mouseenter', () => { delBtn.style.color='#dc2626'; delBtn.style.opacity='1'; });
  delBtn.addEventListener('mouseleave', () => { delBtn.style.color='var(--text3)'; delBtn.style.opacity='0.2'; });
  delBtn.addEventListener('click', e => {
    e.stopPropagation();
    removeTaskByPath(mi, path);
    renderGantt();
    syncMemberUI();
  });

  lRow.appendChild(dot);
  lRow.appendChild(nameSpan);
  if (depth < 2) lRow.appendChild(addSubBtn);
  lRow.appendChild(delBtn);

  // ── 右行（グリッド＋バー）──
  const rRow = document.createElement('div');
  rRow.style.cssText = `position:relative;width:${gridW}px;height:${ROW_H}px;border-bottom:1px solid var(--border);box-sizing:border-box;overflow:hidden;`;

  dates.forEach((dt,di) => {
    const off=isOffDay(dt); const isT=dt===toDateStr(new Date());
    const isMStart=dt.endsWith('-01')||dt===d.startDate;
    const cell=document.createElement('div');
    cell.style.cssText=`position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${isT?'rgba(91,78,245,0.06)':off?'rgba(0,0,0,0.03)':'var(--bg2)'};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
    rRow.appendChild(cell);
  });

  // バー本体
  const bar = document.createElement('div');
  bar.style.cssText = `position:absolute;height:16px;top:50%;transform:translateY(-50%);border-radius:4px;background:${barColor};opacity:.8;left:${startOff*COL_W+1}px;width:${barDays*COL_W-2}px;display:flex;align-items:center;padding:0 5px 0 6px;cursor:grab;user-select:none;box-sizing:border-box;z-index:2;transition:box-shadow .15s;`;

  const resizeHandleLeft = document.createElement('div');
  resizeHandleLeft.style.cssText = `position:absolute;left:0;top:0;bottom:0;width:10px;cursor:ew-resize;border-radius:4px 0 0 4px;background:rgba(255,255,255,.25);z-index:3;`;

  const barLabel = document.createElement('span');
  barLabel.textContent = t.name;
  barLabel.style.cssText = `font-size:9px;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;flex:1;padding-left:3px;`;

  const resizeHandle = document.createElement('div');
  resizeHandle.style.cssText = `position:absolute;right:0;top:0;bottom:0;width:5px;cursor:ew-resize;border-radius:0 4px 4px 0;background:rgba(255,255,255,.2);`;

  bar.appendChild(resizeHandleLeft);
  bar.appendChild(barLabel);
  bar.appendChild(resizeHandle);

  bar.addEventListener('mouseenter', () => bar.style.boxShadow='0 2px 8px rgba(0,0,0,.25)');
  bar.addEventListener('mouseleave', () => bar.style.boxShadow='none');
  rRow.appendChild(bar);

  // ドラッグ・リサイズをDOMに追加後に設定
  setupChildBarDrag(bar, resizeHandle, resizeHandleLeft, mi, path, COL_W, d.startDate);

  return { lRow, rRow };
}

function setupChildBarDrag(bar, resizeHandle, resizeHandleLeft, mi, path, COL_W, projectStart) {
  const tooltip = document.getElementById('gt-tooltip');
  const ttName  = document.getElementById('gt-tt-name');
  const ttDates = document.getElementById('gt-tt-dates');

  const showTip = () => {
    const t = getTaskByPath(mi, path);
    if (!t || !ttName) return;
    ttName.textContent = t.name;
    ttDates.textContent = `${t.startDate} 〜 ${t.endDate}（${t.days}日）`;
    if (tooltip) tooltip.style.display = 'block';
  };
  bar.addEventListener('mouseenter', showTip);
  bar.addEventListener('mousemove', e => { if(tooltip){tooltip.style.left=(e.clientX+14)+'px';tooltip.style.top=(e.clientY-10)+'px';} });
  bar.addEventListener('mouseleave', () => { if(tooltip) tooltip.style.display='none'; });

  // ── LEFT RESIZE ──
  if (resizeHandleLeft) {
    resizeHandleLeft.addEventListener('mousedown', e => {
      e.preventDefault(); e.stopPropagation();
      const startX    = e.clientX;
      const origLeft  = parseInt(bar.style.left);
      const origWidth = parseInt(bar.style.width);
      let lastLeft = origLeft;
      const onMove = e2 => {
        const dx      = e2.clientX - startX;
        const col     = Math.round((origLeft + dx) / COL_W);
        const newLeft = Math.max(0, col * COL_W);
        const newWidth = Math.max(COL_W - 2, origWidth + (origLeft - newLeft));
        if (newLeft === lastLeft) return;
        lastLeft = newLeft;
        bar.style.left  = newLeft + 'px';
        bar.style.width = newWidth + 'px';
        const t = getTaskByPath(mi, path);
        if (!t) return;
        t.startDate = addDays(projectStart, Math.round(newLeft / COL_W));
        t.days      = Math.round((newWidth + 2) / COL_W);
        t.endDate   = addDays(t.startDate, t.days - 1);
        showTip();
      };
      const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  // ── ドラッグ（移動）──
  bar.addEventListener('mousedown', e => {
    if (e.target === resizeHandle || e.target === resizeHandleLeft) return;
    e.preventDefault();
    bar.style.cursor = 'grabbing';
    const startX   = e.clientX;
    const origLeft = parseInt(bar.style.left);

    const onMove = e2 => {
      const dx = e2.clientX - startX;
      const colDelta = Math.round(dx / COL_W);
      const newLeft = Math.max(0, origLeft + colDelta * COL_W);
      bar.style.left = newLeft + 'px';
      const t = getTaskByPath(mi, path);
      if (!t) return;
      const offsetDays = Math.round(newLeft / COL_W);
      const newStart = addDays(projectStart, offsetDays);
      const dur = daysBetween(t.startDate, t.endDate);
      t.startDate = newStart;
      t.endDate   = addDays(newStart, dur);
      t.days = dur + 1;
      showTip();
    };
    const onUp = () => {
      bar.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // ── リサイズ（延長・短縮）──
  resizeHandle.addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation();
    const startX    = e.clientX;
    const origWidth = parseInt(bar.style.width);

    const onMove = e2 => {
      const dx = e2.clientX - startX;
      const colDelta = Math.round(dx / COL_W);
      const newWidth = Math.max(COL_W - 2, origWidth + colDelta * COL_W);
      bar.style.width = newWidth + 'px';
      const t = getTaskByPath(mi, path);
      if (!t) return;
      const newDays = Math.round((newWidth + 2) / COL_W);
      t.days    = newDays;
      t.endDate = addDays(t.startDate, newDays - 1);
      showTip();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ガントに定例ラインを描画（renderGantt内から呼ぶ）
function drawRecurringLines(gtBody, dates, COL_W, ROW_H) {
  if (!recurringList.length) return;

  const recLane = document.getElementById('gt-rec-lane');
  gtBody.style.position = 'relative';

  recurringList.forEach((r, ri) => {
    if (!r.overrides) r.overrides = {};

    dates.forEach((dt, di) => {
      const dow = parseDate(dt).getDay();
      if (dow !== r.dow) return;
      if (r.overrides[dt] === null) return;

      const movedTo  = r.overrides[dt];
      const targetDt = movedTo || dt;
      const targetDi = dates.indexOf(targetDt);
      if (targetDi < 0) return;

      const xCenter = targetDi * COL_W + Math.floor(COL_W / 2);

      // ── 縦線：gtBody に描画（pointer-events:none でタスク操作の邪魔をしない）──
      const line = document.createElement('div');
      line.style.cssText = `position:absolute;left:${xCenter}px;top:0;width:0;height:100%;border-left:2px dashed ${r.color};opacity:.4;pointer-events:none;z-index:1;`;
      gtBody.appendChild(line);

      // ── ラベルピル：gt-rec-lane（ヘッダー直下）に描画 ──
      if (!recLane) return;
      recLane.style.pointerEvents = 'auto';

      const pill = document.createElement('div');
      pill.style.cssText = `
        position:absolute;
        left:${xCenter + 3}px;
        top:4px;
        display:inline-flex;align-items:center;gap:4px;
        background:var(--bg2);
        border:1px solid ${r.color};
        border-radius:20px;
        padding:2px 8px 2px 5px;
        font-size:9px;
        font-family:'DM Mono',monospace;
        color:${r.color};
        white-space:nowrap;
        z-index:30;
        cursor:pointer;
        box-shadow:0 2px 8px rgba(0,0,0,.4);
        transition:box-shadow .15s,opacity .15s;
        pointer-events:auto;
      `;
      pill.innerHTML = `<span style="width:5px;height:5px;border-radius:50%;background:${r.color};flex-shrink:0;display:inline-block;"></span>${r.name} ${r.time}${movedTo ? ' ⚡' : ''}`;
      pill.title = 'ドラッグで移動 / クリックで詳細';

      // ── ドラッグで日付移動 ──
      let isDragging = false;
      pill.addEventListener('mousedown', e => {
        e.preventDefault();
        e.stopPropagation();
        closeLinePopup();
        const startX   = e.clientX;
        const startCol = targetDi;
        let lastCol    = startCol;

        const onMove = e2 => {
          const dx    = e2.clientX - startX;
          const delta = Math.round(dx / COL_W);
          const newCol = Math.max(0, Math.min(dates.length - 1, startCol + delta));
          if (newCol === lastCol) return;
          lastCol = newCol;
          isDragging = true;
          pill.style.outline = `2px solid ${r.color}`;

          // ピルをプレビュー移動
          pill.style.left = (newCol * COL_W + Math.floor(COL_W / 2) + 3) + 'px';

          // 縦線のプレビュー（対象ラインを動かす）
          const lineEl = pill._lineEl;
          if (lineEl) lineEl.style.left = (newCol * COL_W + Math.floor(COL_W / 2)) + 'px';
        };

        const onUp = e2 => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          pill.style.outline = '';

          if (!isDragging) {
            // クリック扱い
            openLinePopup(ri, dt, targetDt, pill, dates);
          } else {
            // ドラッグ確定
            const dx = e2.clientX - startX;
            const delta = Math.round(dx / COL_W);
            const newCol = Math.max(0, Math.min(dates.length - 1, startCol + delta));
            const newDt  = dates[newCol];
            if (!recurringList[ri].overrides) recurringList[ri].overrides = {};
            if (newDt === dt) {
              delete recurringList[ri].overrides[dt];
            } else {
              recurringList[ri].overrides[dt] = newDt;
            }
            renderGantt();
          }
          isDragging = false;
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // クリックイベントはmousedownのonUpで処理するため不要（削除）
      recLane.appendChild(pill);

      // 縦線の参照をpillに持たせる（ドラッグプレビュー用）
      pill._lineEl = line;
    });
  });
}

// 定例ラインのポップアップ（日付変更カレンダー・スキップ・リセット）
let activeLinePopup = null;
function openLinePopup(ri, originalDt, currentDt, anchor, dates) {
  closeLinePopup();
  const r = recurringList[ri];

  const popup = document.createElement('div');
  popup.id = 'line-popup';
  popup.style.cssText = `position:fixed;background:var(--bg2);border:1px solid var(--border2);border-radius:12px;padding:16px;z-index:500;box-shadow:0 16px 48px rgba(0,0,0,.6);width:260px;font-family:'DM Sans',sans-serif;`;

  const rect = anchor.getBoundingClientRect();
  const left = Math.min(Math.max(rect.left, 8), window.innerWidth - 276);
  const top  = Math.min(rect.bottom + 6, window.innerHeight - 340);
  popup.style.left = left + 'px';
  popup.style.top  = top  + 'px';

  // タイトル
  const title = document.createElement('div');
  title.style.cssText = `font-family:'Syne',sans-serif;font-weight:600;font-size:13px;color:var(--text);margin-bottom:12px;display:flex;align-items:center;gap:6px;`;
  title.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${r.color};display:inline-block;flex-shrink:0;"></span>${r.name} — ${r.time}`;
  popup.appendChild(title);

  // ── カレンダー式日付選択 ──
  const calLabel = document.createElement('div');
  calLabel.style.cssText = `font-size:10px;color:var(--text3);letter-spacing:.6px;text-transform:uppercase;font-family:'DM Mono',monospace;margin-bottom:8px;`;
  calLabel.textContent = 'この回の日付を変更';
  popup.appendChild(calLabel);

  // ミニカレンダー
  const calWrap = document.createElement('div');
  calWrap.style.cssText = `background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:10px;margin-bottom:12px;`;

  let calYear, calMonth;
  const baseDt = parseDate(currentDt);
  calYear  = baseDt.getFullYear();
  calMonth = baseDt.getMonth();

  const MONTH_JP = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
  const DOW_JP2  = ['日','月','火','水','木','金','土'];

  function buildMiniCal() {
    calWrap.innerHTML = '';
    const nav = document.createElement('div');
    nav.style.cssText = `display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;`;
    const prevBtn = document.createElement('button');
    prevBtn.textContent = '‹';
    prevBtn.style.cssText = `background:none;border:none;color:var(--text2);cursor:pointer;font-size:16px;padding:0 4px;`;
    prevBtn.addEventListener('click', e => { e.stopPropagation(); calMonth--; if(calMonth<0){calMonth=11;calYear--;} buildMiniCal(); });
    const nextBtn = document.createElement('button');
    nextBtn.textContent = '›';
    nextBtn.style.cssText = prevBtn.style.cssText;
    nextBtn.addEventListener('click', e => { e.stopPropagation(); calMonth++; if(calMonth>11){calMonth=0;calYear++;} buildMiniCal(); });
    const mLabel = document.createElement('span');
    mLabel.style.cssText = `font-family:'Syne',sans-serif;font-size:12px;font-weight:600;color:var(--text);`;
    mLabel.textContent = `${calYear}年 ${MONTH_JP[calMonth]}`;
    nav.appendChild(prevBtn); nav.appendChild(mLabel); nav.appendChild(nextBtn);
    calWrap.appendChild(nav);

    const grid = document.createElement('div');
    grid.style.cssText = `display:grid;grid-template-columns:repeat(7,1fr);gap:1px;`;
    DOW_JP2.forEach((d,i) => {
      const h = document.createElement('div');
      h.style.cssText = `text-align:center;font-size:9px;color:${i===0?'#dc2626':i===6?'#2563eb':'var(--text3)'};padding:2px 0;font-family:'DM Mono',monospace;`;
      h.textContent = d; grid.appendChild(h);
    });

    const firstDow = new Date(calYear, calMonth, 1).getDay();
    for (let i=0; i<firstDow; i++) {
      const empty = document.createElement('div'); grid.appendChild(empty);
    }
    const daysInMonth = new Date(calYear, calMonth+1, 0).getDate();
    for (let day=1; day<=daysInMonth; day++) {
      const dtStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const inRange = dates.includes(dtStr);
      const isSelected = dtStr === currentDt;
      const off = isOffDay(dtStr);
      const cell = document.createElement('div');
      cell.style.cssText = `text-align:center;font-size:10px;padding:3px 0;border-radius:4px;box-sizing:border-box;
        color:${isSelected?'#fff':off?'var(--text3)':'var(--text2)'};
        background:${isSelected?r.color:'transparent'};
        opacity:${inRange?1:.3};
        cursor:${inRange?'pointer':'default'};
        font-family:'DM Mono',monospace;`;
      cell.textContent = day;
      if (inRange) {
        cell.addEventListener('mouseenter', () => { if (!isSelected) cell.style.background='var(--border2)'; });
        cell.addEventListener('mouseleave', () => { if (!isSelected) cell.style.background='transparent'; });
        cell.addEventListener('click', e => {
          e.stopPropagation();
          if (!recurringList[ri].overrides) recurringList[ri].overrides = {};
          recurringList[ri].overrides[originalDt] = dtStr === originalDt ? undefined : dtStr;
          if (recurringList[ri].overrides[originalDt] === undefined) delete recurringList[ri].overrides[originalDt];
          closeLinePopup();
          renderGantt();
        });
      }
      grid.appendChild(cell);
    }
    calWrap.appendChild(grid);
  }

  buildMiniCal();
  popup.appendChild(calWrap);

  // ── ボタン群 ──
  const btnWrap = document.createElement('div');
  btnWrap.style.cssText = `display:flex;flex-direction:column;gap:6px;`;

  const skipBtn = makePopupBtn('この回をスキップ', '#f59e0b', () => {
    if (!recurringList[ri].overrides) recurringList[ri].overrides = {};
    recurringList[ri].overrides[originalDt] = null;
    closeLinePopup(); renderGantt();
  });
  btnWrap.appendChild(skipBtn);

  if (r.overrides && r.overrides[originalDt] !== undefined) {
    const resetBtn = makePopupBtn('この回をリセット', '#9090a8', () => {
      delete recurringList[ri].overrides[originalDt];
      closeLinePopup(); renderGantt();
    });
    btnWrap.appendChild(resetBtn);
  }

  popup.appendChild(btnWrap);
  popup.addEventListener('click', e => e.stopPropagation());
  document.body.appendChild(popup);
  activeLinePopup = popup;

  setTimeout(() => { document.addEventListener('click', closeLinePopup, { once: true }); }, 0);
}

function makePopupBtn(label, color, onClick) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = `background:transparent;border:1px solid ${color}33;border-radius:6px;padding:7px 12px;color:${color};font-size:12px;cursor:pointer;text-align:left;transition:background .15s;font-family:'DM Sans',sans-serif;`;
  btn.addEventListener('mouseenter', () => btn.style.background = `${color}18`);
  btn.addEventListener('mouseleave', () => btn.style.background = 'transparent');
  btn.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  return btn;
}

function closeLinePopup() {
  if (activeLinePopup) { activeLinePopup.remove(); activeLinePopup = null; }
}

// ─── TAB SWITCH ───
function switchTab(tab) {
  document.querySelectorAll('.main-tab').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.add('active');
  document.getElementById(`view-${tab}`).classList.add('active');
  if (tab === 'gantt')  { renderPhaseLegend(); if (currentGanttView==='phase') renderGanttByPhase(); else renderGantt(); }
  if (tab === 'member') {
    syncMemberUI();
    const row = document.getElementById('member-subtabs-row');
    if (row) {
      row.classList.remove('slide-in');
      void row.offsetWidth; // reflow
      row.classList.add('slide-in');
    }
  }
  if (tab === 'mtg')    { renderMtgList(); }
  if (tab === 'wiki')   { renderWiki(); }
  if (tab === 'issues') { renderIssueList(); }
}

// ─── GANTT ───
function getBarColor(phase) {
  if (PHASE_BAR_COLORS[phase]) return PHASE_BAR_COLORS[phase];
  // 未登録フェーズは動的に割り当て
  const newColor = PHASE_DEFAULT_COLORS[Object.keys(PHASE_BAR_COLORS).length % PHASE_DEFAULT_COLORS.length];
  PHASE_BAR_COLORS[phase] = newColor;
  return newColor;
}

const PHASE_DEFAULT_COLORS = ['#5b4ef5','#2563eb','#059669','#db2777','#d97706','#f97316','#6b7280'];

let PHASE_BAR_COLORS = {
  '要件定義': '#5b4ef5',
  '設計':     '#2563eb',
  '実装':     '#059669',
  'テスト':   '#db2777',
  'リリース': '#d97706',
  'その他':   '#6b7280'
};

// カテゴリのフェーズでPHASE_BAR_COLORSを再初期化
let _deletedPhases = new Set(); // 削除済みフェーズを記憶

function initPhaseBarColors() {
  const phases = generatedData?.phases || [];

  // タスクに使われているphase名も収集（削除済みは除く）
  const usedPhases = new Set();
  (generatedData?.members || []).forEach(m =>
    (m.tasks || []).forEach(t => {
      if (t.phase && !_deletedPhases.has(t.phase)) usedPhases.add(t.phase);
    })
  );

  const allPhases = [...phases].filter(p => !_deletedPhases.has(p));
  usedPhases.forEach(p => { if (!allPhases.includes(p)) allPhases.push(p); });

  const newColors = {};
  allPhases.forEach((p, i) => {
    newColors[p] = PHASE_BAR_COLORS[p] || PHASE_DEFAULT_COLORS[i % PHASE_DEFAULT_COLORS.length];
  });
  PHASE_BAR_COLORS = newColors;
}

// フェーズ凡例（カラーピッカー付き・フェーズ名インライン編集対応）を描画
function deletePhase(phase) {
  document.querySelectorAll('.phase-ghost-picker').forEach(el => el.remove());
  _deletedPhases.add(phase);
  delete PHASE_BAR_COLORS[phase];
  if (generatedData) generatedData.phases = (generatedData.phases||[]).filter(p=>p!==phase);
  renderPhaseLegend();
  renderGantt();
}

function openPhasePicker(phase, swatchEl) {
  // 既存ピッカーを全消ししてから新規作成
  document.querySelectorAll('.phase-ghost-picker').forEach(el => el.remove());
  const picker = document.createElement('input');
  picker.type = 'color';
  picker.className = 'phase-ghost-picker';
  picker.value = PHASE_BAR_COLORS[phase] || '#5b4ef5';
  picker.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;opacity:0;';
  // pickerにフェーズ名を記憶させる
  picker.dataset.forPhase = phase;
  document.body.appendChild(picker);
  picker.oninput = () => {
    // pickerが記憶しているフェーズがまだ存在するか確認
    const p = picker.dataset.forPhase;
    if (!(p in PHASE_BAR_COLORS)) return;
    PHASE_BAR_COLORS[p] = picker.value;
    // スウォッチをDOMで探して更新
    const sw = document.querySelector('[data-swatch-phase="'+CSS.escape(p)+'"]');
    if (sw) sw.style.background = picker.value;
    document.querySelectorAll('[data-phase="'+p+'"]').forEach(b => b.style.background = picker.value);
  };
  picker.onchange = () => renderGantt();
  picker.click();
}

function updateGanttPeriod() {
  if (!generatedData) return;
  const s = document.getElementById('gantt-start-input')?.value;
  const e = document.getElementById('gantt-end-input')?.value;
  if (s) generatedData.startDate = s;
  if (e) generatedData.endDate   = e;
  if (currentGanttView === 'phase') renderGanttByPhase();
  else renderGantt();
}

function renderPhaseLegend() {
  initPhaseBarColors();
  const wrap = document.getElementById('phase-legend');
  if (!wrap) return;
  // 期間インプットを同期
  const si = document.getElementById('gantt-start-input');
  const ei = document.getElementById('gantt-end-input');
  if (si && generatedData?.startDate) si.value = generatedData.startDate;
  if (ei && generatedData?.endDate)   ei.value = generatedData.endDate;
  document.querySelectorAll('.phase-ghost-picker').forEach(el => el.remove());
  wrap.innerHTML = '';

  Object.entries(PHASE_BAR_COLORS).forEach(([phase, color]) => {
    const item = document.createElement('span');
    item.style.cssText = 'display:inline-flex;align-items:center;gap:4px;margin-right:12px;white-space:nowrap;';

    // スウォッチ — data-swatch-phase で特定
    const swatch = document.createElement('span');
    swatch.setAttribute('data-swatch-phase', phase);
    swatch.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:2px;background:'+color+';border:1px solid rgba(0,0,0,.2);cursor:pointer;flex-shrink:0;';
    swatch.onclick = function(e) {
      e.stopPropagation();
      openPhasePicker(phase, this);
    };

    // フェーズ名
    const nameEl = document.createElement('span');
    nameEl.textContent = phase;
    nameEl.style.cssText = 'font-size:11px;color:var(--text2);cursor:text;font-family:\'DM Sans\',sans-serif;';
    nameEl.onclick = function(e) {
      e.stopPropagation();
      // ピッカーを閉じる
      document.querySelectorAll('.phase-ghost-picker').forEach(el => el.remove());
      const input = document.createElement('input');
      input.value = phase;
      input.style.cssText = 'font-size:11px;color:var(--text);background:var(--bg2);border:1px solid var(--accent);border-radius:3px;padding:1px 4px;outline:none;width:80px;';
      item.replaceChild(input, nameEl);
      input.focus(); input.select();
      const commit = () => {
        const newName = input.value.trim() || phase;
        if (newName !== phase) {
          const entries = Object.entries(PHASE_BAR_COLORS);
          PHASE_BAR_COLORS = {};
          entries.forEach(([p,c]) => { PHASE_BAR_COLORS[p===phase?newName:p]=c; });
          if (generatedData) {
            generatedData.phases = (generatedData.phases||[]).map(p=>p===phase?newName:p);
            generatedData.members.forEach(m=>m.tasks.forEach(t=>{if(t.phase===phase)t.phase=newName;}));
            if (generatedData.scheduleItems) generatedData.scheduleItems.forEach(s=>{if(s.phase===phase)s.phase=newName;});
          }
          renderPhaseLegend(); renderGantt();
        } else { renderPhaseLegend(); }
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', function(e2){
        if(e2.key==='Enter'){e2.preventDefault();input.blur();}
        if(e2.key==='Escape'){input.value=phase;input.blur();}
      });
    };

    // 削除ボタン
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '×';
    delBtn.style.cssText = 'background:none;border:none;font-size:11px;color:#bbb;cursor:pointer;padding:0 2px;line-height:1;';
    delBtn.onmouseenter = function(){ this.style.color='#dc2626'; };
    delBtn.onmouseleave = function(){ this.style.color='#bbb'; };
    delBtn.onclick = function(e) {
      e.stopPropagation();
      deletePhase(phase);
    };

    item.appendChild(swatch);
    item.appendChild(nameEl);
    item.appendChild(delBtn);
    wrap.appendChild(item);
  });

  // ＋追加
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '＋';
  addBtn.style.cssText = 'background:none;border:1px dashed var(--border2);border-radius:4px;color:var(--text3);cursor:pointer;font-size:11px;padding:1px 7px;';
  addBtn.onmouseenter = function(){ this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'; };
  addBtn.onmouseleave = function(){ this.style.borderColor='var(--border2)'; this.style.color='var(--text3)'; };
  addBtn.onclick = function(e) {
    e.stopPropagation();
    const self = this;
    self.style.display = 'none';
    const inp = document.createElement('input');
    inp.placeholder = 'フェーズ名';
    inp.style.cssText = 'font-size:11px;color:var(--text);background:var(--bg2);border:1px solid var(--accent);border-radius:4px;padding:2px 6px;outline:none;width:90px;';
    wrap.appendChild(inp);
    inp.focus();
    const commit = () => {
      const trimmed = inp.value.trim();
      inp.remove(); self.style.display='';
      if (trimmed && !PHASE_BAR_COLORS[trimmed]) {
        const idx = Object.keys(PHASE_BAR_COLORS).length;
        PHASE_BAR_COLORS[trimmed] = PHASE_DEFAULT_COLORS[idx % PHASE_DEFAULT_COLORS.length];
        if (generatedData) generatedData.phases = [...(generatedData.phases||[]), trimmed];
      }
      renderPhaseLegend();
    };
    inp.addEventListener('blur', commit);
    inp.addEventListener('keydown', function(e2){
      if(e2.key==='Enter'){e2.preventDefault();inp.blur();}
      if(e2.key==='Escape'){inp.value='';inp.blur();}
    });
  };
  wrap.appendChild(addBtn);
}
// ── 行ドラッグ（メンバー内タスク並べ替え）──
let dragState = null;

function setupRowDrag(row, mi, ti) {
  const handle = row.querySelector('.row-drag-handle');
  if (!handle) return;

  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();

    const gtLeftBody = document.getElementById('gt-left-body');
    const gtRightBody = document.getElementById('gt-right-body');
    if (!gtLeftBody) return;

    const startY   = e.clientY;
    const rowH     = row.getBoundingClientRect().height;
    const origRect = row.getBoundingClientRect();

    // ゴースト（半透明コピー）
    const ghost = row.cloneNode(true);
    ghost.style.cssText += `;position:fixed;left:${origRect.left}px;top:${origRect.top}px;width:${origRect.width}px;opacity:.55;pointer-events:none;z-index:999;box-shadow:0 8px 24px rgba(0,0,0,.5);border-radius:6px;`;
    document.body.appendChild(ghost);

    row.style.opacity = '0.25';

    dragState = { mi, ti, ghost, row, startY, origRect };

    const onMove = e2 => {
      const dy = e2.clientY - startY;
      ghost.style.top = (origRect.top + dy) + 'px';

      // ドロップ対象を探す（同じ mi のタスク行）
      const allTaskRows = [...gtLeftBody.querySelectorAll(`[data-mi="${mi}"][data-ti]`)];
      let targetTi = null;
      allTaskRows.forEach(r => {
        if (r === row) return;
        const rect = r.getBoundingClientRect();
        if (e2.clientY > rect.top && e2.clientY < rect.bottom) {
          targetTi = +r.dataset.ti;
        }
      });
      // ハイライト
      allTaskRows.forEach(r => r.style.outline = '');
      if (targetTi !== null) {
        const targetRow = allTaskRows.find(r => +r.dataset.ti === targetTi);
        if (targetRow) targetRow.style.outline = '2px solid var(--accent)';
      }
      dragState.targetTi = targetTi;
    };

    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      ghost.remove();
      row.style.opacity = '';
      // ハイライト解除
      document.querySelectorAll('#gt-left-body [data-mi][data-ti]').forEach(r => r.style.outline = '');

      if (dragState.targetTi !== null && dragState.targetTi !== ti) {
        // tasks配列を並び替え
        const tasks = generatedData.members[mi].tasks;
        const [moved] = tasks.splice(ti, 1);
        tasks.splice(dragState.targetTi, 0, moved);
        renderGantt();
      }
      dragState = null;
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// タスクにstart/endDateを付与（フェーズ別期間配分・依存関係考慮）
function assignTaskDates() {
  const d = generatedData;
  if (!d) return;

  const totalDays = Math.max(1, daysBetween(d.startDate, d.endDate) + 1);
  const phases = d.phases && d.phases.length ? d.phases : ['企画', '制作', '確認', '納品'];
  const phaseCount = phases.length;

  // ── 公開日逆算・ウォーターフォール型フェーズスロット ──
  // 各フェーズは前フェーズが OVERLAP(25%)進んだ時点で開始（重なりあり）
  const OVERLAP = 0.25;
  const slotUnit = Math.floor(totalDays / (phaseCount - OVERLAP * (phaseCount - 1)));

  const phaseSlots = {};
  phases.forEach((p, i) => {
    // 前から: i番目フェーズの開始 = startDate + i * slotUnit * (1 - OVERLAP)
    const startOffset = Math.round(i * slotUnit * (1 - OVERLAP));
    const endOffset   = startOffset + slotUnit - 1;
    phaseSlots[p] = {
      start: addDays(d.startDate, Math.min(startOffset, totalDays - 1)),
      end:   i === phaseCount - 1 ? d.endDate : addDays(d.startDate, Math.min(endOffset, totalDays - 1))
    };
  });
  // 先頭はstartDate固定、末尾はendDate固定
  phases[0] && (phaseSlots[phases[0]].start = d.startDate);
  phases[phaseCount-1] && (phaseSlots[phases[phaseCount-1]].end = d.endDate);

  // ── 各メンバーのタスクに日付を割り当て ──
  d.members.forEach(m => {
    const phaseGroups = {};
    phases.forEach(p => { phaseGroups[p] = []; });
    m.tasks.forEach(t => {
      if (t.excludeFromSchedule) return;
      const p = t.phase || phases[0];
      if (!phaseGroups[p]) phaseGroups[p] = [];
      phaseGroups[p].push(t);
    });

    phases.forEach(phase => {
      const tasks = phaseGroups[phase];
      if (!tasks || !tasks.length) return;
      const slot = phaseSlots[phase];
      if (!slot) return;
      const slotDays = Math.max(1, daysBetween(slot.start, slot.end) + 1);
      const totalTaskDays = tasks.reduce((s, t) => s + (t.days || 3), 0);

      let cursor = slot.start;
      tasks.forEach(t => {
        if (t.startDate && t.endDate) { cursor = addDays(t.endDate, 1); return; }
        const scaled = Math.max(1, Math.round((t.days || 3) / totalTaskDays * slotDays));
        t.startDate = cursor > slot.end ? slot.end : cursor;
        t.endDate   = addDays(t.startDate, scaled - 1);
        if (t.endDate > slot.end) t.endDate = slot.end;
        t.days = Math.max(1, daysBetween(t.startDate, t.endDate) + 1);
        cursor = addDays(t.endDate, 1);

        if (t.children && t.children.length) {
          const cp = Math.max(1, Math.floor(t.days / t.children.length));
          t.children.forEach((c, ci) => {
            if (c.startDate && c.endDate) return;
            c.startDate = addDays(t.startDate, ci * cp);
            c.endDate   = ci === t.children.length - 1 ? t.endDate : addDays(t.startDate, (ci + 1) * cp - 1);
            c.days = Math.max(1, daysBetween(c.startDate, c.endDate) + 1);
          });
        }
      });
    });
  });
}
// ─── 祝日 ───
const JP_HOLIDAYS = new Set([
  // 2025
  '2025-01-01','2025-01-13','2025-02-11','2025-02-23','2025-02-24',
  '2025-03-20','2025-04-29','2025-05-03','2025-05-04','2025-05-05','2025-05-06',
  '2025-07-21','2025-08-11','2025-09-15','2025-09-22','2025-09-23',
  '2025-10-13','2025-11-03','2025-11-23','2025-11-24',
  // 2026
  '2026-01-01','2026-01-12','2026-02-11','2026-02-23',
  '2026-03-20','2026-04-29','2026-05-03','2026-05-04','2026-05-05','2026-05-06',
  '2026-07-20','2026-08-11','2026-09-21','2026-09-22','2026-09-23',
  '2026-10-12','2026-11-03','2026-11-23',
  // 2027
  '2027-01-01','2027-01-11','2027-02-11','2027-02-23',
  '2027-03-21','2027-04-29','2027-05-03','2027-05-04','2027-05-05',
  '2027-07-19','2027-08-11','2027-09-20','2027-09-23',
  '2027-10-11','2027-11-03','2027-11-23',
]);
function isHoliday(dateStr) { return JP_HOLIDAYS.has(dateStr); }
function isOffDay(dateStr) {
  const dow = parseDate(dateStr).getDay();
  return dow === 0 || dow === 6 || isHoliday(dateStr);
}


function toDateStr(d) {
  return d.toISOString().split('T')[0];
}
function parseDate(s) {
  const [y,mo,day] = s.split('-').map(Number);
  return new Date(y, mo-1, day);
}
function daysBetween(a, b) {
  return Math.round((parseDate(b) - parseDate(a)) / 86400000);
}
function addDays(dateStr, n) {
  const d = parseDate(dateStr);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}


// ─── SCHEDULE DATA (スケジュール独立管理) ───
function initScheduleItems() {
  const d = generatedData;
  if (!d) return;
  // カンバンのtasksからscheduleItemsを初期生成（初回のみ）
  if (d.scheduleItems) return;
  d.scheduleItems = [];
  d.members.forEach((m, mi) => {
    m.tasks.forEach((t, ti) => {
      if (t.excludeFromSchedule) return;
      d.scheduleItems.push({
        id: Date.now() + Math.random(),
        name: t.name,
        phase: t.phase || (d.phases && d.phases[0]) || '',
        days: t.days || 3,
        startDate: t.startDate || null,
        endDate: t.endDate || null,
        assigneeName: m.name || m.role,
        assigneeMi: mi,
        kanbanLinked: true // カンバン連携済み
      });
    });
  });
}

// スケジュールにアイテムを追加（ダイアログなし）
function addScheduleItem(phase) {
  const d = generatedData;
  if (!d) return;
  if (!d.scheduleItems) d.scheduleItems = [];
  const newItem = {
    id: Date.now() + Math.random(),
    name: '新しいタスク',
    phase: phase || (d.phases && d.phases[0]) || '',
    days: 3,
    startDate: null,
    endDate: null,
    children: []
  };
  d.scheduleItems.push(newItem);
  assignScheduleDates();
  renderGantt();
}

// scheduleItemsに日付を割り当て
function assignScheduleDates() {
  const d = generatedData;
  if (!d || !d.scheduleItems) return;
  const items = d.scheduleItems;
  const phases = d.phases && d.phases.length ? d.phases : ['企画','制作','確認','納品'];
  const totalDays = Math.max(1, daysBetween(d.startDate, d.endDate) + 1);
  const OVERLAP = 0.25;
  const slotUnit = Math.floor(totalDays / (phases.length - OVERLAP * (phases.length - 1)));

  const phaseSlots = {};
  phases.forEach((p, i) => {
    const startOffset = Math.round(i * slotUnit * (1 - OVERLAP));
    const endOffset   = startOffset + slotUnit - 1;
    phaseSlots[p] = {
      start: addDays(d.startDate, Math.min(startOffset, totalDays - 1)),
      end:   i === phases.length - 1 ? d.endDate : addDays(d.startDate, Math.min(endOffset, totalDays - 1))
    };
  });
  if (phases[0]) phaseSlots[phases[0]].start = d.startDate;
  if (phases[phases.length-1]) phaseSlots[phases[phases.length-1]].end = d.endDate;

  const phaseGroups = {};
  phases.forEach(p => { phaseGroups[p] = []; });
  items.forEach(item => {
    const p = item.phase || phases[0];
    if (!phaseGroups[p]) phaseGroups[p] = [];
    phaseGroups[p].push(item);
  });

  phases.forEach(phase => {
    const group = phaseGroups[phase];
    if (!group || !group.length) return;
    const slot = phaseSlots[phase];
    if (!slot) return;
    const slotDays = Math.max(1, daysBetween(slot.start, slot.end) + 1);
    const totalTaskDays = group.reduce((s, t) => s + (t.days || 3), 0);
    let cursor = slot.start;
    group.forEach(item => {
      if (item.startDate && item.endDate) { cursor = addDays(item.endDate, 1); return; }
      const scaled = Math.max(1, Math.round((item.days || 3) / totalTaskDays * slotDays));
      item.startDate = cursor > slot.end ? slot.end : cursor;
      item.endDate   = addDays(item.startDate, scaled - 1);
      if (item.endDate > slot.end) item.endDate = slot.end;
      item.days = Math.max(1, daysBetween(item.startDate, item.endDate) + 1);
      cursor = addDays(item.endDate, 1);
    });
  });
}

// ── スケジュールの子タスク再帰描画（サブ・孫タスク対応）──
function renderScheduleChildren(children, parentItem, depth, d, dates, gridW, COL_W, ROW_H, phaseColor, phase, gtLeftBody, gtRightBody, container) {
  const MAX_DEPTH = 2;
  const indent = depth * 14;
  const bgAlpha = depth === 1 ? 'var(--bg3)' : '#ede8df';
  const barAlpha = depth === 1 ? 'cc' : 'ff';
  const rowH = ROW_H - depth * 4;
  const tooltip = container.querySelector('#gt-tooltip');
  const ttName  = container.querySelector('#gt-tt-name');
  const ttDates = container.querySelector('#gt-tt-dates');

  children.forEach((child, ci) => {
    // 子バーの範囲（孫がある場合は孫の範囲で自動更新）
    let cEffStart = child.startDate || d.startDate;
    let cEffEnd   = child.endDate   || addDays(cEffStart, (child.days||2)-1);
    if (child.children && child.children.length) {
      const gs = child.children.map(g=>g.startDate).filter(Boolean);
      const ge = child.children.map(g=>g.endDate).filter(Boolean);
      if (gs.length) cEffStart = gs.reduce((a,b)=>a<b?a:b);
      if (ge.length) cEffEnd   = ge.reduce((a,b)=>a>b?a:b);
    }
    const cOff = Math.max(0, daysBetween(d.startDate, cEffStart));
    const cDays = Math.max(1, daysBetween(cEffStart, cEffEnd)+1);
    const cW  = Math.max(4, Math.min(cDays*COL_W-2, Math.max(4, gridW-cOff*COL_W-2)));
    const cBarLabelId = `sched-bar-${parentItem.id}-d${depth}-${ci}`;

    // 左行
    const lcRow = document.createElement('div');
    lcRow.style.cssText = `display:flex;align-items:center;gap:4px;padding:0 6px 0 ${6+indent}px;height:${rowH}px;border-bottom:1px solid var(--border);border-left:${depth+1}px solid ${phaseColor}${depth===1?'66':'44'};background:${bgAlpha};box-sizing:border-box;`;

    const cHandle = document.createElement('div');
    cHandle.style.cssText=`width:10px;flex-shrink:0;cursor:grab;display:flex;flex-direction:column;gap:2px;align-items:center;opacity:0.2;`;
    cHandle.innerHTML='<span style="display:block;width:7px;height:1px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:7px;height:1px;background:var(--text3);border-radius:1px;"></span>';
    lcRow.addEventListener('mouseenter',()=>cHandle.style.opacity='0.6');
    lcRow.addEventListener('mouseleave',()=>cHandle.style.opacity='0.2');

    // 孫タスク（depth=2）は別タスクへの移動ドラッグ対応
    if (depth === 2) {
      cHandle.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        lcRow.style.opacity = '0.4';
        const indicator = document.createElement('div');
        indicator.style.cssText = 'height:2px;background:var(--accent);border-radius:1px;margin:0 4px;box-shadow:0 0 6px rgba(91,78,245,.5);position:relative;z-index:100;';
        let dropTarget = null; // { item, side: 'before'|'child' }

        const onMove = ev => {
          indicator.remove();
          // 全スケジュール行を走査
          const allRows = [...gtLeftBody.querySelectorAll('[data-sched-id],[data-sched-phase]')];
          let best = null;
          for (const row of allRows) {
            const rect = row.getBoundingClientRect();
            if (ev.clientY >= rect.top && ev.clientY < rect.bottom) {
              best = row; break;
            }
          }
          if (best) {
            const rect = best.getBoundingClientRect();
            if (ev.clientY < rect.top + rect.height / 2) {
              gtLeftBody.insertBefore(indicator, best);
              dropTarget = { row: best, side: 'before' };
            } else {
              gtLeftBody.insertBefore(indicator, best.nextSibling);
              dropTarget = { row: best, side: 'after' };
            }
          }
        };

        const onUp = () => {
          lcRow.style.opacity = '1';
          indicator.remove();
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);

          if (!dropTarget) return;
          const targetId    = dropTarget.row.getAttribute('data-sched-id');
          const targetPhase = dropTarget.row.getAttribute('data-sched-phase');

          // 孫を親から取り除く
          const idx = parentItem.children.indexOf(child);
          if (idx < 0) return;
          parentItem.children.splice(idx, 1);

          // ドロップ先を特定して追加
          if (targetId) {
            // 別の親タスクのidを持つ行 → そのタスクのchildrenに追加
            const targetItem = d.scheduleItems.find(x => String(x.id) === String(targetId));
            if (targetItem) {
              if (!targetItem.children) targetItem.children = [];
              targetItem.children.push(child);
            }
          } else if (targetPhase) {
            // フェーズヘッダー行 → scheduleItemsのそのフェーズに直接追加（サブではなくトップレベル）
            child.phase = targetPhase;
            d.scheduleItems.push(child);
          }
          renderGantt();
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    }

    const cName = document.createElement('span');
    cName.contentEditable='true'; cName.textContent=child.name;
    cName.style.cssText=`font-size:12px;color:var(--text2);flex:1;outline:none;white-space:nowrap;overflow:hidden;cursor:text;`;
    cName.addEventListener('input',()=>{
      const v=cName.textContent.trim()||child.name; child.name=v;
      const bl=document.getElementById(cBarLabelId); if(bl) bl.textContent=v;
    });
    cName.addEventListener('blur',()=>renderGantt());
    cName.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();cName.blur();}});

    // サブ追加（孫まで：depth < MAX_DEPTH）
    const addGrandBtn = depth < MAX_DEPTH ? document.createElement('button') : null;
    if (addGrandBtn) {
      addGrandBtn.type='button'; addGrandBtn.textContent='＋';
      addGrandBtn.style.cssText=`background:none;border:1px dashed var(--border2);border-radius:3px;color:var(--text3);cursor:pointer;font-size:8px;padding:1px 4px;flex-shrink:0;opacity:0;transition:opacity .15s;`;
      lcRow.addEventListener('mouseenter',()=>addGrandBtn.style.opacity='1');
      lcRow.addEventListener('mouseleave',()=>addGrandBtn.style.opacity='0');
      addGrandBtn.onmouseenter=()=>{addGrandBtn.style.borderColor='var(--accent)';addGrandBtn.style.color='var(--accent)';};
      addGrandBtn.onmouseleave=()=>{addGrandBtn.style.borderColor='var(--border2)';addGrandBtn.style.color='var(--text3)';};
      addGrandBtn.onclick=e=>{
        e.stopPropagation();
        if(!child.children) child.children=[];
        child.children.push({id:Date.now()+Math.random(),name:'孫タスク',phase:child.phase||phase,days:1,startDate:null,endDate:null,children:[]});
        assignScheduleDates(); renderGantt();
      };
    }

    const cDel = document.createElement('button');
    cDel.type='button'; cDel.textContent='×';
    cDel.style.cssText=`background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:0 2px;opacity:0;flex-shrink:0;`;
    lcRow.addEventListener('mouseenter',()=>cDel.style.opacity='1');
    lcRow.addEventListener('mouseleave',()=>cDel.style.opacity='0');
    cDel.onmouseenter=()=>cDel.style.color='#dc2626';
    cDel.onmouseleave=()=>cDel.style.color='var(--text3)';
    cDel.onclick=e=>{ e.stopPropagation(); parentItem.children.splice(ci,1); renderGantt(); };

    lcRow.appendChild(cHandle);
    lcRow.appendChild(cName);
    if (addGrandBtn) lcRow.appendChild(addGrandBtn);
    lcRow.appendChild(cDel);

    // 右行・バー
    const rcRow = document.createElement('div');
    rcRow.style.cssText=`width:${gridW}px;height:${rowH}px;border-bottom:1px solid var(--border);position:relative;background:${bgAlpha};`;

    const cBar = document.createElement('div');
    cBar.setAttribute('data-phase',phase);
    cBar.style.cssText=`position:absolute;left:${cOff*COL_W+1}px;top:3px;width:${Math.max(4,cW)}px;height:${rowH-8}px;background:${phaseColor}${barAlpha};border-radius:2px;display:flex;align-items:center;padding:0 4px;overflow:visible;cursor:grab;user-select:none;`;

    const cBarLabel = document.createElement('span');
    cBarLabel.id=cBarLabelId;
    cBarLabel.style.cssText=`font-size:11px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;flex:1;`;
    cBarLabel.textContent=child.name;
    cBar.appendChild(cBarLabel);

    const cResize = document.createElement('div');
    cResize.style.cssText=`position:absolute;right:0;top:0;width:6px;height:100%;cursor:ew-resize;background:rgba(255,255,255,0.2);border-radius:0 2px 2px 0;`;
    cBar.appendChild(cResize);

    // バードラッグ（相対移動）
    cBar.addEventListener('mousedown', e=>{
      if(e.target===cResize) return;
      e.preventDefault(); tooltip.style.display='none'; cBar.style.cursor='grabbing';
      const startX   = e.clientX;
      const origLeft = parseInt(cBar.style.left);
      let lastDelta  = 0;
      const onMove=ev=>{
        const cd = Math.round((ev.clientX - startX) / COL_W);
        lastDelta = cd;
        cBar.style.left = Math.max(0, origLeft + cd * COL_W) + 'px';
      };
      const onUp=()=>{
        cBar.style.cursor='grab';
        document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp);
        if(lastDelta===0) return;
        const origStart = child.startDate || d.startDate;
        const origEnd   = child.endDate   || addDays(origStart, (child.days||2)-1);
        child.startDate = addDays(origStart, lastDelta);
        child.endDate   = addDays(origEnd,   lastDelta);
        child.days = Math.max(1, daysBetween(child.startDate, child.endDate)+1);
        renderGantt();
      };
      document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
    });

    // リサイズ
    cResize.addEventListener('mousedown',e=>{
      e.preventDefault(); e.stopPropagation();
      const sx=e.clientX, ow=parseInt(cBar.style.width);
      const onMove=ev=>{ cBar.style.width=Math.max(COL_W,ow+Math.round((ev.clientX-sx)/COL_W)*COL_W)+'px'; };
      const onUp=ev=>{
        document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp);
        const cd=Math.round((ev.clientX-sx)/COL_W); if(cd===0) return;
        child.days   =Math.max(1,(child.days||2)+cd);
        child.endDate=addDays(child.startDate||d.startDate,child.days-1);
        renderGantt();
      };
      document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
    });

    // ツールチップ
    cBar.addEventListener('mouseenter',e=>{ ttName.textContent=child.name; ttDates.textContent=`${cEffStart} 〜 ${cEffEnd}（${cDays}日）`; tooltip.style.display='block'; });
    cBar.addEventListener('mousemove',e=>{ tooltip.style.left=(e.clientX+12)+'px'; tooltip.style.top=(e.clientY-10)+'px'; });
    cBar.addEventListener('mouseleave',()=>{ tooltip.style.display='none'; });

    rcRow.appendChild(cBar);

    // 左右同時追加
    gtLeftBody.appendChild(lcRow);
    gtRightBody.appendChild(rcRow);

    // 孫タスクを再帰描画
    if (child.children && child.children.length) {
      renderScheduleChildren(child.children, child, depth+1, d, dates, gridW, COL_W, ROW_H, phaseColor, phase, gtLeftBody, gtRightBody, container);
    }
  });
}


let currentGanttView = 'member';

function switchGanttView(view) {
  currentGanttView = view;
  const btnM = document.getElementById('gantt-tab-member');
  const btnP = document.getElementById('gantt-tab-phase');
  if (btnM && btnP) {
    btnM.style.background = view==='member' ? 'var(--bg2)' : 'transparent';
    btnM.style.color      = view==='member' ? 'var(--text)' : 'var(--text3)';
    btnM.style.boxShadow  = view==='member' ? '0 1px 2px rgba(0,0,0,.07)' : 'none';
    btnP.style.background = view==='phase'  ? 'var(--bg2)' : 'transparent';
    btnP.style.color      = view==='phase'  ? 'var(--text)' : 'var(--text3)';
    btnP.style.boxShadow  = view==='phase'  ? '0 1px 2px rgba(0,0,0,.07)' : 'none';
  }
  renderPhaseLegend();
  if (view === 'phase') renderGanttByPhase();
  else renderGantt();
}

function renderGanttByPhase() {
  const d = generatedData;
  if (!d) return;
  assignTaskDates();

  const COL_W  = 28;
  const ROW_H  = 36;
  const LABEL_W = 220;
  const today  = toDateStr(new Date());
  const totalDays = daysBetween(d.startDate, d.endDate) + 1;

  const dates = [];
  for (let i = 0; i < totalDays; i++) {
    const dd = parseDate(d.startDate);
    dd.setDate(dd.getDate() + i);
    dates.push(toDateStr(dd));
  }

  const monthGroups = [];
  let curMG = null;
  dates.forEach(dt => {
    const [y, m] = dt.split('-');
    const key = `${y}-${m}`;
    if (!curMG || curMG.key !== key) {
      curMG = { key, label: `${parseInt(y)}年${parseInt(m)}月`, count: 0 };
      monthGroups.push(curMG);
    }
    curMG.count++;
  });

  const gridW = dates.length * COL_W;
  const container = document.getElementById('gantt-container');
  container.innerHTML = `
    <div id="gt-tooltip" style="position:fixed;display:none;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;padding:8px 12px;font-size:12px;color:var(--text);z-index:200;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:220px;">
      <div id="gt-tt-name" style="font-weight:500;margin-bottom:3px;"></div>
      <div id="gt-tt-dates" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);"></div>
    </div>
    <div style="display:flex;flex:1;min-height:0;overflow:hidden;">
      <div id="gt-left" style="width:${LABEL_W}px;min-width:${LABEL_W}px;flex-shrink:0;border-right:1px solid var(--border2);display:flex;flex-direction:column;min-height:0;">
        <div id="gt-left-head" style="flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--border);">
          <div style="height:22px;border-bottom:1px solid var(--border);"></div>
          <div style="height:22px;border-bottom:1px solid var(--border);display:flex;">
            ${monthGroups.map(mg=>`<div style="width:${mg.count*COL_W}px;min-width:${mg.count*COL_W}px;padding:4px 8px;font-family:'Syne',sans-serif;font-size:11px;font-weight:600;color:var(--text2);border-right:1px solid var(--border2);white-space:nowrap;box-sizing:border-box;background:var(--bg2);">${mg.label}</div>`).join('')}
          </div>
          <div style="height:18px;border-bottom:1px solid var(--border);"></div>
        </div>
        <div id="gt-left-body" style="flex:1;overflow-y:scroll;overflow-x:hidden;scrollbar-width:none;"></div>
      </div>
      <div id="gt-right" style="flex:1;min-width:0;overflow:auto;display:flex;flex-direction:column;">
        <div id="gt-right-head" style="flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10;width:${gridW}px;">
          <div style="display:flex;height:22px;border-bottom:1px solid var(--border);">
            ${dates.map((dt,di)=>{ const isMStart=dt.endsWith('-01')||dt===d.startDate; return `<div style="width:${COL_W}px;min-width:${COL_W}px;border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;"></div>`; }).join('')}
          </div>
          <div style="display:flex;height:22px;border-bottom:1px solid var(--border);">
            ${dates.map((dt,di)=>{ const [,m2,day]=dt.split('-'); const isFirst=day==='01'||dt===d.startDate; return `<div style="width:${COL_W}px;min-width:${COL_W}px;text-align:center;font-family:'DM Mono',monospace;font-size:9px;padding:3px 0;color:var(--text3);border-left:${isFirst?'1px solid var(--border2)':'none'};box-sizing:border-box;">${isFirst?parseInt(m2)+'月':''}</div>`; }).join('')}
          </div>
          <div style="display:flex;height:18px;border-bottom:1px solid var(--border);">
            ${dates.map((dt,di)=>{ const DOW_JP=['日','月','火','水','木','金','土']; const dow=parseDate(dt).getDay(); const off=isOffDay(dt); const isT=dt===today; const col=isT?'var(--accent)':dow===0||isHoliday(dt)?'#dc2626':dow===6?'#2563eb':'var(--text3)'; return `<div style="width:${COL_W}px;min-width:${COL_W}px;text-align:center;font-family:'DM Mono',monospace;font-size:8px;padding:1px 0 3px;color:${col};">${DOW_JP[dow]}</div>`; }).join('')}
          </div>
        </div>
        <div id="gt-right-body" style="position:relative;width:${gridW}px;"></div>
      </div>
    </div>`;

  const gtLeftBody  = container.querySelector('#gt-left-body');
  const gtRightBody = container.querySelector('#gt-right-body');
  const gtRight     = container.querySelector('#gt-right');

  let syncingScroll = false;
  gtRight.addEventListener('scroll', () => {
    if (syncingScroll) return; syncingScroll = true;
    gtLeftBody.scrollTop = gtRight.scrollTop; syncingScroll = false;
  }, {passive:true});
  gtLeftBody.addEventListener('scroll', () => {
    if (syncingScroll) return; syncingScroll = true;
    gtRight.scrollTop = gtLeftBody.scrollTop; syncingScroll = false;
  }, {passive:true});

  // フェーズごとにタスクを収集
  // d.phases + タスクが実際に持つphase名の両方をカバー
  const allTaskPhases = new Set();
  d.members.forEach(m => m.tasks.forEach(t => { if (!t.excludeFromSchedule && t.phase) allTaskPhases.add(t.phase); }));

  // d.phasesの順番を優先し、それ以外のphaseを後ろに追加
  const phases = [...(d.phases||[])];
  allTaskPhases.forEach(p => { if (!phases.includes(p)) phases.push(p); });

  const phaseTaskMap = {};
  phases.forEach(p => { phaseTaskMap[p] = []; });
  d.members.forEach((m, mi) => {
    m.tasks.forEach((t, ti) => {
      if (t.excludeFromSchedule) return;
      const p = t.phase || 'その他';
      if (!phaseTaskMap[p]) phaseTaskMap[p] = [];
      phaseTaskMap[p].push({ m, mi, t, ti });
    });
  });

  // ── フェーズ追加ボタン（全フェーズの前に追加ボタン用変数を準備） ──
  phases.forEach((phase, phaseIdx) => {
    const tasks = phaseTaskMap[phase] || [];
    const phaseColor = getBarColor(phase);

    // フェーズヘッダー行（ドラッグハンドル付き）
    const lPhaseRow = document.createElement('div');
    lPhaseRow.style.cssText = `display:flex;align-items:center;background:var(--bg2);border-bottom:1px solid var(--border);min-height:34px;padding:0 10px 0 6px;gap:6px;`;
    lPhaseRow.setAttribute('data-phase-row', phase);

    // ドラッグハンドル
    const phaseHandle = document.createElement('div');
    phaseHandle.style.cssText = `width:14px;flex-shrink:0;cursor:grab;display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;opacity:0.2;padding:4px 0;`;
    phaseHandle.innerHTML = '<span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span>';
    lPhaseRow.addEventListener('mouseenter', () => phaseHandle.style.opacity = '0.5');
    lPhaseRow.addEventListener('mouseleave', () => phaseHandle.style.opacity = '0.2');

    // フェーズ色ドット＋名前
    const phaseDot = document.createElement('div');
    phaseDot.style.cssText = `width:10px;height:10px;border-radius:2px;background:${phaseColor};flex-shrink:0;`;
    const phaseNameEl = document.createElement('div');
    phaseNameEl.style.cssText = `font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--text2);flex:1;`;
    phaseNameEl.textContent = phase;

    // タスク追加ボタン
    const phaseAddBtn = document.createElement('button');
    phaseAddBtn.textContent = '＋ タスク追加';
    phaseAddBtn.style.cssText = `background:transparent;border:1px dashed var(--border2);border-radius:4px;padding:2px 8px;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:10px;cursor:pointer;transition:all .15s;flex-shrink:0;`;
    phaseAddBtn.onmouseenter = function(){ this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'; };
    phaseAddBtn.onmouseleave = function(){ this.style.borderColor='var(--border2)'; this.style.color='var(--text3)'; };
    phaseAddBtn.onclick = function() {
      if (!generatedData?.members?.length) return;
      generatedData.members[0].tasks.push({
        name: '新しいタスク', phase, days: 3, priority: 'todo',
        description: '', startDate: null, endDate: null, children: []
      });
      renderGanttByPhase();
      syncMemberUI();
    };

    lPhaseRow.appendChild(phaseHandle);
    lPhaseRow.appendChild(phaseDot);
    lPhaseRow.appendChild(phaseNameEl);
    lPhaseRow.appendChild(phaseAddBtn);
    gtLeftBody.appendChild(lPhaseRow);

    // ── フェーズ行ドラッグ並び替え ──
    phaseHandle.addEventListener('mousedown', e => {
      e.preventDefault();
      lPhaseRow.style.opacity = '0.4';
      const indicator = document.createElement('div');
      indicator.style.cssText = 'height:2px;background:var(--accent);border-radius:1px;box-shadow:0 0 6px rgba(91,78,245,.5);';
      let insertIdx = phaseIdx;

      const onMove = ev => {
        indicator.remove();
        const allHeaders = [...gtLeftBody.querySelectorAll('[data-phase-row]')];
        let targetEl = null;
        for (const row of allHeaders) {
          const rect = row.getBoundingClientRect();
          if (ev.clientY < rect.top + rect.height / 2) { targetEl = row; break; }
        }
        const targetPhase = targetEl ? targetEl.getAttribute('data-phase-row') : null;
        insertIdx = targetPhase ? phases.indexOf(targetPhase) : phases.length;
        if (targetEl) gtLeftBody.insertBefore(indicator, targetEl);
        else {
          const last = allHeaders[allHeaders.length - 1];
          if (last) gtLeftBody.insertBefore(indicator, last.nextSibling);
        }
      };

      const onUp = () => {
        lPhaseRow.style.opacity = '1';
        indicator.remove();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const fromIdx = phases.indexOf(phase);
        if (fromIdx === insertIdx || fromIdx === insertIdx - 1) return;
        // d.phasesを並び替え
        const newPhases = [...phases];
        newPhases.splice(fromIdx, 1);
        const toIdx = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
        newPhases.splice(toIdx, 0, phase);
        d.phases = newPhases;
        // PHASE_BAR_COLORSも同じ順序に
        const newColors = {};
        newPhases.forEach(p => { newColors[p] = PHASE_BAR_COLORS[p]; });
        PHASE_BAR_COLORS = newColors;
        renderGanttByPhase();
        renderPhaseLegend();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    const rPhaseRow = document.createElement('div');
    rPhaseRow.style.cssText = `width:${gridW}px;height:34px;background:var(--bg2);border-bottom:1px solid var(--border);position:relative;`;
    dates.forEach((dt, di) => {
      const off = isOffDay(dt); const isT = dt===today;
      const isMStart = dt.endsWith('-01')||dt===d.startDate;
      const cell = document.createElement('div');
      cell.style.cssText = `position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${isT?'rgba(91,78,245,0.06)':off?'rgba(0,0,0,0.03)':'var(--bg2)'};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
      rPhaseRow.appendChild(cell);
    });
    gtRightBody.appendChild(rPhaseRow);

    if (!tasks.length) {
      // タスクなし行
      const lEmpty = document.createElement('div');
      lEmpty.style.cssText = `height:${ROW_H}px;padding:0 14px;display:flex;align-items:center;border-bottom:1px solid var(--border);`;
      lEmpty.innerHTML = `<span style="font-size:11px;color:var(--text3);">タスクなし</span>`;
      gtLeftBody.appendChild(lEmpty);
      const rEmpty = document.createElement('div');
      rEmpty.style.cssText = `width:${gridW}px;height:${ROW_H}px;border-bottom:1px solid var(--border);`;
      gtRightBody.appendChild(rEmpty);
      return;
    }

    tasks.forEach(({ m, mi, t, ti }) => {
      // startDateが未設定の場合はプロジェクト開始日を使う
      const startDate = t.startDate || d.startDate;
      const endDate   = t.endDate   || addDays(startDate, (t.days||1) - 1);
      const memberColor = ROLE_COLORS[m.role] || ROLE_COLORS['その他'];
      const initials = (m.name||m.role).slice(0,2);
      const startOff = Math.max(0, daysBetween(d.startDate, startDate));
      const barDays  = Math.max(1, daysBetween(startDate, endDate) + 1);
      const barW     = Math.min(barDays * COL_W - 2, gridW - startOff * COL_W - 2);

      // 左：タスク名（メンバー名を小さく添える）
      const lRow = document.createElement('div');
      lRow.style.cssText = `position:relative;display:flex;align-items:center;gap:6px;padding:0 8px 0 24px;height:${ROW_H}px;border-bottom:1px solid var(--border);border-left:2px solid ${phaseColor}55;box-sizing:border-box;background:var(--bg2);`;
      lRow.innerHTML = `
        <span style="font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;" title="${t.name}">${t.name}</span>
        <span style="font-size:9px;color:var(--text3);font-family:'DM Mono',monospace;flex-shrink:0;white-space:nowrap;">${m.name||m.role}</span>`;
      gtLeftBody.appendChild(lRow);

      // 右：バー
      const rRow = document.createElement('div');
      rRow.style.cssText = `width:${gridW}px;height:${ROW_H}px;border-bottom:1px solid var(--border);position:relative;overflow:hidden;`;
      dates.forEach((dt, di) => {
        const off = isOffDay(dt); const isT = dt===today;
        const isMStart = dt.endsWith('-01')||dt===d.startDate;
        const cell = document.createElement('div');
        cell.style.cssText = `position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${isT?'rgba(91,78,245,0.06)':off?'rgba(0,0,0,0.03)':'transparent'};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
        rRow.appendChild(cell);
      });

      const bar = document.createElement('div');
      bar.style.cssText = `position:absolute;left:${startOff*COL_W+1}px;top:6px;width:${barW}px;height:${ROW_H-12}px;background:${phaseColor};border-radius:3px;display:flex;align-items:center;padding:0 6px;box-sizing:border-box;overflow:hidden;cursor:default;`;
      bar.setAttribute('data-phase', phase);

      const barLabel = document.createElement('span');
      barLabel.style.cssText = `font-size:12px;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'DM Sans',sans-serif;`;
      barLabel.textContent = m.name || m.role;
      bar.appendChild(barLabel);

      // ツールチップ
      const ttName  = container.querySelector('#gt-tt-name');
      const ttDates = container.querySelector('#gt-tt-dates');
      const tooltip = container.querySelector('#gt-tooltip');
      bar.addEventListener('mouseenter', e => {
        ttName.textContent  = `[${m.name||m.role}] ${t.name}`;
        ttDates.textContent = `${startDate} 〜 ${endDate}（${t.days||1}日）`;
        tooltip.style.display = 'block';
      });
      bar.addEventListener('mousemove', e => {
        tooltip.style.left = (e.clientX + 12) + 'px';
        tooltip.style.top  = (e.clientY - 10) + 'px';
      });
      bar.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });

      rRow.appendChild(bar);
      gtRightBody.appendChild(rRow);
    });
  });

  // ── 最下部：フェーズ追加ボタン ──
  const lAddPhase = document.createElement('div');
  lAddPhase.style.cssText = `display:flex;align-items:center;padding:8px 14px;border-bottom:1px solid var(--border);`;
  const addPhaseBtn = document.createElement('button');
  addPhaseBtn.style.cssText = `display:flex;align-items:center;gap:6px;background:transparent;border:1px dashed var(--border2);border-radius:6px;padding:5px 14px;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:11px;cursor:pointer;transition:all .15s;width:100%;`;
  addPhaseBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>タグラインを追加`;
  addPhaseBtn.onmouseenter = function(){ this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'; };
  addPhaseBtn.onmouseleave = function(){ this.style.borderColor='var(--border2)'; this.style.color='var(--text3)'; };
  addPhaseBtn.onclick = () => {
    const name = prompt('新しいタグライン名を入力してください');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (d.phases.includes(trimmed)) return;
    // d.phasesとPHASE_BAR_COLORSに追加
    d.phases.push(trimmed);
    const idx = Object.keys(PHASE_BAR_COLORS).length;
    PHASE_BAR_COLORS[trimmed] = PHASE_DEFAULT_COLORS[idx % PHASE_DEFAULT_COLORS.length];
    renderGanttByPhase();
    renderPhaseLegend();
  };
  lAddPhase.appendChild(addPhaseBtn);
  gtLeftBody.appendChild(lAddPhase);

  const rAddPhase = document.createElement('div');
  rAddPhase.style.cssText = `width:${gridW}px;height:42px;border-bottom:1px solid var(--border);`;
  gtRightBody.appendChild(rAddPhase);

  drawRecurringLines(gtRightBody, dates, COL_W, ROW_H);
}

function renderGantt() {
  const d = generatedData;
  if (!d) return;

  // スクロール位置を保存
  const prevRight = document.getElementById('gt-right');
  const savedScrollLeft = prevRight ? prevRight.scrollLeft : 0;
  const savedScrollTop  = prevRight ? prevRight.scrollTop  : 0;

  assignTaskDates();
  renderPhaseLegend();

  const COL_W = 28;
  const ROW_H = 36;
  const LABEL_W = 220;
  const today = toDateStr(new Date());
  const totalDays = daysBetween(d.startDate, d.endDate) + 1;

  const dates = [];
  for (let i = 0; i < totalDays; i++) {
    const dd = parseDate(d.startDate);
    dd.setDate(dd.getDate() + i);
    dates.push(toDateStr(dd));
  }

  // 月グループ
  const monthGroups = [];
  let curMG = null;
  dates.forEach(dt => {
    const [y, m] = dt.split('-');
    const key = `${y}-${m}`;
    if (!curMG || curMG.key !== key) {
      curMG = { key, label: `${parseInt(y)}年${parseInt(m)}月`, count: 0 };
      monthGroups.push(curMG);
    }
    curMG.count++;
  });

  const gridW = dates.length * COL_W;

  // ── コンテナHTML：左ペイン（固定）＋右ペイン（横スクロール）──
  const container = document.getElementById('gantt-container');
  container.innerHTML = `
    <div id="gt-tooltip" style="position:fixed;display:none;background:var(--bg2);border:1px solid var(--border2);border-radius:6px;padding:8px 12px;font-size:12px;color:var(--text);z-index:200;pointer-events:none;box-shadow:0 8px 24px rgba(0,0,0,.4);max-width:220px;">
      <div id="gt-tt-name" style="font-weight:500;margin-bottom:3px;"></div>
      <div id="gt-tt-dates" style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);"></div>
    </div>
    <div style="display:flex;flex:1;min-height:0;overflow:hidden;">
      <!-- 左ペイン：ラベル列（固定） -->
      <div id="gt-left" style="width:${LABEL_W}px;min-width:${LABEL_W}px;flex-shrink:0;border-right:1px solid var(--border2);display:flex;flex-direction:column;min-height:0;">
        <!-- ヘッダー空白 -->
        <div id="gt-left-head" style="flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--border);">
          <div style="height:22px;border-bottom:1px solid var(--border);"></div><!-- 月行 -->
          <div style="height:22px;border-bottom:1px solid var(--border);"></div><!-- 日行 -->
          <div style="height:18px;"></div><!-- 曜日行 -->
          <div style="height:24px;border-top:1px solid var(--border);background:var(--bg2);"></div><!-- 定例レーン -->
        </div>
        <!-- タスクラベル -->
        <div id="gt-left-body" style="flex:1;overflow-y:scroll;overflow-x:hidden;scrollbar-width:none;min-height:0;"></div>
      </div>
      <!-- 右ペイン：グリッド（横スクロール） -->
      <div id="gt-right" style="flex:1;overflow-x:auto;overflow-y:scroll;display:flex;flex-direction:column;min-height:0;">
        <!-- グリッドヘッダー -->
        <div id="gt-right-head" style="flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:20;">
          <!-- 月行 -->
          <div style="display:flex;width:${gridW}px;border-bottom:1px solid var(--border);background:var(--bg2);">
            ${monthGroups.map(mg => `<div style="width:${mg.count*COL_W}px;min-width:${mg.count*COL_W}px;padding:4px 8px;font-family:'Syne',sans-serif;font-size:11px;font-weight:600;color:var(--text2);border-right:1px solid var(--border2);white-space:nowrap;box-sizing:border-box;background:var(--bg2);">${mg.label}</div>`).join('')}
          </div>
          <!-- 日行 -->
          <div style="display:flex;width:${gridW}px;border-bottom:1px solid var(--border);">
            ${dates.map(dt => {
              const off = isOffDay(dt);
              const isT = dt===today;
              const isMStart = dt.endsWith('-01')||dt===d.startDate;
              const bg = isT ? 'rgba(91,78,245,0.08)' : off ? 'rgba(0,0,0,0.04)' : 'transparent';
              const col = isT ? 'var(--accent)' : 'var(--text3)';
              return `<div style="width:${COL_W}px;min-width:${COL_W}px;text-align:center;font-family:'DM Mono',monospace;font-size:9px;padding:3px 0 1px;color:${col};opacity:${off&&!isT?.5:1};background:${bg};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;">${parseInt(dt.split('-')[2])}</div>`;
            }).join('')}
          </div>
          <!-- 曜日行 -->
          <div style="display:flex;width:${gridW}px;">
            ${dates.map(dt => {
              const dow = parseDate(dt).getDay();
              const off = isOffDay(dt);
              const isT = dt===today;
              const DOW_JP = ['日','月','火','水','木','金','土'];
              const isMStart = dt.endsWith('-01')||dt===d.startDate;
              const col = isT ? 'var(--accent)' : dow===0||isHoliday(dt) ? '#dc2626' : dow===6 ? '#2563eb' : 'var(--text3)';
              const bg = isT ? 'rgba(91,78,245,0.06)' : off ? 'rgba(0,0,0,0.03)' : 'transparent';
              return `<div style="width:${COL_W}px;min-width:${COL_W}px;text-align:center;font-family:'DM Mono',monospace;font-size:8px;padding:1px 0 3px;color:${col};opacity:${off&&!isT?.5:1};background:${bg};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;">${DOW_JP[dow]}</div>`;
            }).join('')}
          </div>
          <!-- 定例ラベルレーン -->
          <div id="gt-rec-lane" style="position:relative;width:${gridW}px;height:24px;border-top:1px solid var(--border);overflow:visible;"></div>
        </div>
        <!-- グリッドボディ -->
        <div id="gt-right-body" style="position:relative;width:${gridW}px;"></div>
      </div>
    </div>
  `;

  const gtLeftBody  = container.querySelector('#gt-left-body');
  const gtRightBody = container.querySelector('#gt-right-body');
  const gtRight     = container.querySelector('#gt-right');

  // 左右の縦スクロールを同期（右が主、左が追従）
  let syncingScroll = false;
  gtRight.addEventListener('scroll', () => {
    if (syncingScroll) return;
    syncingScroll = true;
    gtLeftBody.scrollTop = gtRight.scrollTop;
    syncingScroll = false;
  }, {passive:true});
  gtLeftBody.addEventListener('scroll', () => {
    if (syncingScroll) return;
    syncingScroll = true;
    gtRight.scrollTop = gtLeftBody.scrollTop;
    syncingScroll = false;
  }, {passive:true});

  // ── scheduleItemsをフェーズ別に描画 ──
  initScheduleItems();
  assignScheduleDates();

  const phases = d.phases && d.phases.length ? d.phases : ['企画','制作','確認','納品'];
  const items = d.scheduleItems || [];

  // フェーズ別グループ化
  const phaseItemMap = {};
  phases.forEach(p => { phaseItemMap[p] = []; });
  items.forEach(item => {
    const p = item.phase || phases[0];
    if (!phaseItemMap[p]) phaseItemMap[p] = [];
    phaseItemMap[p].push(item);
  });

  phases.forEach((phase, phaseIdx) => {
    const phaseItems = phaseItemMap[phase] || [];
    const phaseColor = getBarColor(phase);

    // フェーズヘッダー行（ドラッグハンドル付き）
    const lPhaseRow = document.createElement('div');
    lPhaseRow.style.cssText = `display:flex;align-items:center;background:var(--bg2);border-bottom:1px solid var(--border);min-height:34px;padding:0 10px 0 6px;gap:6px;`;
    lPhaseRow.setAttribute('data-phase-row', phase);

    // ドラッグハンドル
    const phaseHandle = document.createElement('div');
    phaseHandle.style.cssText = `width:14px;flex-shrink:0;cursor:grab;display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;opacity:0.2;`;
    phaseHandle.innerHTML = '<span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span>';
    lPhaseRow.addEventListener('mouseenter', () => phaseHandle.style.opacity = '0.5');
    lPhaseRow.addEventListener('mouseleave', () => phaseHandle.style.opacity = '0.2');

    // フェーズ色・名前・＋ボタン
    const phaseDot = document.createElement('div');
    phaseDot.style.cssText = `width:10px;height:10px;border-radius:2px;background:${phaseColor};flex-shrink:0;`;
    const phaseNameEl = document.createElement('div');
    phaseNameEl.style.cssText = `font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--text2);flex:1;`;
    phaseNameEl.textContent = phase;

    const phaseAddBtn = document.createElement('button');
    phaseAddBtn.textContent = '＋';
    phaseAddBtn.title = 'スケジュールにタスクを追加';
    phaseAddBtn.style.cssText = `background:transparent;border:1px dashed var(--border2);border-radius:4px;padding:1px 7px;color:var(--text3);font-size:11px;cursor:pointer;flex-shrink:0;transition:all .15s;`;
    phaseAddBtn.onmouseenter = function(){ this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'; };
    phaseAddBtn.onmouseleave = function(){ this.style.borderColor='var(--border2)'; this.style.color='var(--text3)'; };
    phaseAddBtn.onclick = function(e) { e.stopPropagation(); addScheduleItem(phase); };

    lPhaseRow.appendChild(phaseHandle);
    lPhaseRow.appendChild(phaseDot);
    lPhaseRow.appendChild(phaseNameEl);
    lPhaseRow.appendChild(phaseAddBtn);
    gtLeftBody.appendChild(lPhaseRow);

    // ── フェーズ行ドラッグ並び替え ──
    phaseHandle.addEventListener('mousedown', e => {
      e.preventDefault();
      lPhaseRow.style.opacity = '0.4';
      const indicator = document.createElement('div');
      indicator.style.cssText = 'height:2px;background:var(--accent);border-radius:1px;box-shadow:0 0 6px rgba(91,78,245,.5);';
      let insertIdx = phaseIdx;
      const onMove = ev => {
        indicator.remove();
        const allHeaders = [...gtLeftBody.querySelectorAll('[data-phase-row]')];
        let targetEl = null;
        for (const row of allHeaders) {
          const rect = row.getBoundingClientRect();
          if (ev.clientY < rect.top + rect.height / 2) { targetEl = row; break; }
        }
        const targetPhase = targetEl ? targetEl.getAttribute('data-phase-row') : null;
        insertIdx = targetPhase ? phases.indexOf(targetPhase) : phases.length;
        if (targetEl) gtLeftBody.insertBefore(indicator, targetEl);
        else {
          const allH = gtLeftBody.querySelectorAll('[data-phase-row]');
          const last = allH[allH.length - 1];
          if (last) gtLeftBody.insertBefore(indicator, last.nextSibling);
        }
      };
      const onUp = () => {
        lPhaseRow.style.opacity = '1';
        indicator.remove();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        const fromIdx = phases.indexOf(phase);
        if (fromIdx === insertIdx || fromIdx === insertIdx - 1) return;
        const newPhases = [...phases];
        newPhases.splice(fromIdx, 1);
        const toIdx = insertIdx > fromIdx ? insertIdx - 1 : insertIdx;
        newPhases.splice(toIdx, 0, phase);
        d.phases = newPhases;
        const newColors = {};
        newPhases.forEach(p => { newColors[p] = PHASE_BAR_COLORS[p]; });
        PHASE_BAR_COLORS = newColors;
        renderGantt();
        renderPhaseLegend();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    const rPhaseRow = document.createElement('div');
    rPhaseRow.style.cssText = `width:${gridW}px;height:34px;background:var(--bg2);border-bottom:1px solid var(--border);position:relative;`;
    dates.forEach((dt,di)=>{
      const off=isOffDay(dt);const isT=dt===today;const isMStart=dt.endsWith('-01')||dt===d.startDate;
      const cell=document.createElement('div');
      cell.style.cssText=`position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${isT?'rgba(91,78,245,0.06)':off?'rgba(0,0,0,0.03)':'var(--bg2)'};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
      rPhaseRow.appendChild(cell);
    });
    gtRightBody.appendChild(rPhaseRow);

    if (!phaseItems.length) {
      const lE=document.createElement('div'); lE.style.cssText=`height:${ROW_H}px;padding:0 14px;display:flex;align-items:center;border-bottom:1px solid var(--border);`;
      lE.innerHTML=`<span style="font-size:11px;color:var(--text3);">タスクなし</span>`; gtLeftBody.appendChild(lE);
      const rE=document.createElement('div'); rE.style.cssText=`width:${gridW}px;height:${ROW_H}px;border-bottom:1px solid var(--border);`; gtRightBody.appendChild(rE);
      return;
    }

    phaseItems.forEach((item, ii) => {
      const startDate = item.startDate || d.startDate;
      const endDate   = item.endDate   || addDays(startDate, (item.days||3)-1);
      const startOff  = Math.max(0, daysBetween(d.startDate, startDate));
      const barDays   = Math.max(1, daysBetween(startDate, endDate)+1);
      const barW      = Math.min(barDays*COL_W-2, gridW-startOff*COL_W-2);

      // ── 左行：ハンドル・タスク名・サブ追加・削除 ──
      const lRow = document.createElement('div');
      lRow.style.cssText = `position:relative;display:flex;align-items:center;gap:5px;padding:0 6px 0 4px;height:${ROW_H}px;border-bottom:1px solid var(--border);border-left:2px solid ${phaseColor}55;box-sizing:border-box;background:var(--bg2);`;
      lRow.setAttribute('data-sched-id', item.id);
      lRow.setAttribute('data-sched-phase', phase);

      // ドラッグハンドル
      const handle = document.createElement('div');
      handle.style.cssText = `width:12px;flex-shrink:0;cursor:grab;display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;opacity:0.25;`;
      handle.innerHTML = '<span style="display:block;width:8px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:8px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:8px;height:1.5px;background:var(--text3);border-radius:1px;"></span>';
      lRow.addEventListener('mouseenter', () => handle.style.opacity = '0.6');
      lRow.addEventListener('mouseleave', () => handle.style.opacity = '0.25');

      // タスク名（インライン編集）
      const nameEl = document.createElement('span');
      nameEl.contentEditable = 'true';
      nameEl.textContent = item.name;
      nameEl.style.cssText = `font-size:11px;color:var(--text2);flex:1;outline:none;white-space:nowrap;overflow:hidden;cursor:text;min-width:0;`;
      const barLabelId = `bar-label-${item.id}`;
      nameEl.addEventListener('input', () => { 
        const v = nameEl.textContent.trim() || item.name;
        item.name = v;
        const bl = document.getElementById(barLabelId);
        if (bl) bl.textContent = v;
      });
      nameEl.addEventListener('blur', () => renderGantt());
      nameEl.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();nameEl.blur();} });

      // ＋サブタスク
      const addSubBtn = document.createElement('button');
      addSubBtn.type='button'; addSubBtn.textContent='＋サブ';
      addSubBtn.style.cssText=`background:none;border:1px dashed var(--border2);border-radius:4px;color:var(--text3);cursor:pointer;font-size:9px;padding:1px 5px;flex-shrink:0;opacity:0;transition:opacity .15s;white-space:nowrap;`;
      lRow.addEventListener('mouseenter',()=>addSubBtn.style.opacity='1');
      lRow.addEventListener('mouseleave',()=>addSubBtn.style.opacity='0');
      addSubBtn.onmouseenter=()=>{addSubBtn.style.borderColor='var(--accent)';addSubBtn.style.color='var(--accent)';};
      addSubBtn.onmouseleave=()=>{addSubBtn.style.borderColor='var(--border2)';addSubBtn.style.color='var(--text3)';};
      addSubBtn.onclick=e=>{
        e.stopPropagation();
        if(!item.children) item.children=[];
        item.children.push({id:Date.now()+Math.random(),name:'サブタスク',phase:item.phase,days:2,startDate:null,endDate:null,children:[]});
        assignScheduleDates(); renderGantt();
      };

      // × 削除
      const delBtn = document.createElement('button');
      delBtn.type='button'; delBtn.textContent='×';
      delBtn.style.cssText=`background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:0 2px;flex-shrink:0;opacity:0;transition:opacity .15s;`;
      lRow.addEventListener('mouseenter',()=>delBtn.style.opacity='1');
      lRow.addEventListener('mouseleave',()=>delBtn.style.opacity='0');
      delBtn.onmouseenter=()=>delBtn.style.color='#dc2626';
      delBtn.onmouseleave=()=>delBtn.style.color='var(--text3)';
      delBtn.onclick=e=>{
        e.stopPropagation();
        d.scheduleItems.splice(d.scheduleItems.indexOf(item),1);
        renderGantt();
      };

      lRow.appendChild(handle); lRow.appendChild(nameEl); lRow.appendChild(addSubBtn); lRow.appendChild(delBtn);

      // ── ドラッグ並び替え ──
      handle.addEventListener('mousedown', e => {
        e.preventDefault();
        lRow.style.opacity='0.4';
        const indicator = document.createElement('div');
        indicator.style.cssText='height:2px;background:var(--accent);border-radius:1px;margin:0 4px;box-shadow:0 0 6px rgba(91,78,245,.5);';
        let insertBeforeId = null;

        const onMove = ev => {
          indicator.remove();
          const phaseRows = [...gtLeftBody.querySelectorAll(`[data-sched-phase="${phase}"]`)].filter(r=>r!==lRow);
          let target = null;
          for(const r of phaseRows){
            const rect=r.getBoundingClientRect();
            if(ev.clientY < rect.top+rect.height/2){target=r;break;}
          }
          if(target){ gtLeftBody.insertBefore(indicator,target); insertBeforeId=target.getAttribute('data-sched-id'); }
          else{
            const last=phaseRows[phaseRows.length-1];
            if(last&&last.nextSibling) gtLeftBody.insertBefore(indicator,last.nextSibling);
            else if(last) gtLeftBody.appendChild(indicator);
            insertBeforeId=null;
          }
        };
        const onUp=()=>{
          lRow.style.opacity='1'; indicator.remove();
          document.removeEventListener('mousemove',onMove);
          document.removeEventListener('mouseup',onUp);
          const fromIdx=d.scheduleItems.indexOf(item);
          if(fromIdx<0) return;
          d.scheduleItems.splice(fromIdx,1);
          if(insertBeforeId){
            const toIdx=d.scheduleItems.findIndex(x=>String(x.id)===String(insertBeforeId));
            if(toIdx>=0) d.scheduleItems.splice(toIdx,0,item);
            else d.scheduleItems.push(item);
          } else {
            // 同フェーズの末尾に挿入
            const lastPhaseIdx = d.scheduleItems.reduce((acc,x,i)=>x.phase===phase?i:acc,-1);
            d.scheduleItems.splice(lastPhaseIdx+1,0,item);
          }
          renderGantt();
        };
        document.addEventListener('mousemove',onMove);
        document.addEventListener('mouseup',onUp);
      });

      // ── サブタスクがある場合、親バーの範囲を自動計算 ──
      let effectiveStart = item.startDate || startDate;
      let effectiveEnd   = item.endDate   || endDate;
      if (item.children && item.children.length) {
        const childStarts = item.children.map(c => c.startDate).filter(Boolean);
        const childEnds   = item.children.map(c => c.endDate  ).filter(Boolean);
        if (childStarts.length) effectiveStart = childStarts.reduce((a,b) => a < b ? a : b);
        if (childEnds.length)   effectiveEnd   = childEnds.reduce((a,b)   => a > b ? a : b);
      }
      const effectiveOff  = Math.max(0, Math.min(dates.length - 1, daysBetween(d.startDate, effectiveStart)));
      const effectiveDays = Math.max(1, Math.min(dates.length - effectiveOff, daysBetween(effectiveStart, effectiveEnd) + 1));
      const effectiveBarW = Math.max(4, effectiveDays * COL_W - 2);

      // ── 右：親バー（先に描画行を作成しておく） ──
      const rRow = document.createElement('div');
      rRow.style.cssText = `width:${gridW}px;height:${ROW_H}px;border-bottom:1px solid var(--border);position:relative;overflow:hidden;`;
      dates.forEach((dt,di)=>{
        const off=isOffDay(dt);const isT=dt===today;const isMStart=dt.endsWith('-01')||dt===d.startDate;
        const cell=document.createElement('div');
        cell.style.cssText=`position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${isT?'rgba(91,78,245,0.06)':off?'rgba(0,0,0,0.03)':'transparent'};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
        rRow.appendChild(cell);
      });

      const bar = document.createElement('div');
      bar.setAttribute('data-phase',phase);
      bar.style.cssText=`position:absolute;left:${effectiveOff*COL_W+1}px;top:6px;width:${Math.max(4,effectiveBarW)}px;height:${ROW_H-12}px;background:${phaseColor};border-radius:3px;box-sizing:border-box;overflow:visible;cursor:grab;user-select:none;`;

      // バーのテキストはバーの右横に表示
      const barLabel=document.createElement('span');
      barLabel.id = barLabelId;
      barLabel.style.cssText=`position:absolute;left:${effectiveOff*COL_W+1+Math.max(4,effectiveBarW)+6}px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text2);white-space:nowrap;font-family:'DM Sans',sans-serif;pointer-events:none;`;
      barLabel.textContent=item.name;
      rRow.appendChild(barLabel);

      // リサイズハンドル（左端）
      const resizeHandleLeft = document.createElement('div');
      resizeHandleLeft.style.cssText=`position:absolute;left:0;top:0;width:10px;height:100%;cursor:ew-resize;background:rgba(255,255,255,0.25);border-radius:3px 0 0 3px;z-index:3;`;
      bar.appendChild(resizeHandleLeft);
      resizeHandleLeft.addEventListener('mousedown', ev => {
        ev.preventDefault(); ev.stopPropagation();
        const startX = ev.clientX;
        const origLeft = parseInt(bar.style.left);
        const origWidth = parseInt(bar.style.width);
        const onMove = ev2 => {
          const dx = ev2.clientX - startX;
          const newLeft = Math.max(0, Math.round((origLeft + dx) / COL_W) * COL_W);
          const newWidth = Math.max(COL_W, origWidth + (origLeft - newLeft));
          bar.style.left = newLeft + 'px';
          bar.style.width = newWidth + 'px';
          if (barLabel) barLabel.style.left = (newLeft + newWidth + 6) + 'px';
          item.startDate = addDays(d.startDate, Math.round(newLeft / COL_W));
          item.days = Math.round(newWidth / COL_W);
          item.endDate = addDays(item.startDate, item.days - 1);
          if (ttName) { ttName.textContent = item.name; ttDates.textContent = `${item.startDate} 〜 ${item.endDate}（${item.days}日）`; tooltip.style.display='block'; }
        };
        const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); if (tooltip) tooltip.style.display='none'; renderGantt(); };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
      // リサイズハンドル（右端）
      const resizeHandle = document.createElement('div');
      resizeHandle.style.cssText=`position:absolute;right:0;top:0;width:10px;height:100%;cursor:ew-resize;background:rgba(255,255,255,0.25);border-radius:0 3px 3px 0;z-index:3;`;
      bar.appendChild(resizeHandle);

      // ツールチップ
      const tooltip=container.querySelector('#gt-tooltip');
      const ttName=container.querySelector('#gt-tt-name');
      const ttDates=container.querySelector('#gt-tt-dates');
      bar.addEventListener('mouseenter',e=>{ ttName.textContent=item.name; ttDates.textContent=`${effectiveStart} 〜 ${effectiveEnd}（${effectiveDays}日）`; tooltip.style.display='block'; });
      bar.addEventListener('mousemove',e=>{ tooltip.style.left=(e.clientX+12)+'px'; tooltip.style.top=(e.clientY-10)+'px'; });
      bar.addEventListener('mouseleave',()=>{ tooltip.style.display='none'; });

      // ── バードラッグ移動（グリッドスナップ・ずれなし）──
      bar.addEventListener('mousedown', e => {
        if (e.target === resizeHandle) return;
        e.preventDefault();
        tooltip.style.display='none';
        bar.style.cursor='grabbing';
        const origLeft = parseInt(bar.style.left);
        // マウスがバー内のどのcolにいるかを計算してスナップ基準点を決定
        const barRect  = bar.getBoundingClientRect();
        const mouseColInBar = Math.floor((e.clientX - barRect.left) / COL_W);
        const snapBaseX = e.clientX - (e.clientX - barRect.left) % COL_W;
        const startX = snapBaseX;
        let lastDelta = 0;
        const onMove = ev => {
          const dx       = ev.clientX - startX;
          const colDelta = Math.round(dx / COL_W);
          lastDelta      = colDelta;
          const newLeft  = Math.max(0, origLeft + colDelta * COL_W);
          bar.style.left = newLeft + 'px';
          if (barLabel) barLabel.style.left = (newLeft + parseInt(bar.style.width) + 6) + 'px';
        };
        const onUp = () => {
          bar.style.cursor = 'grab';
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          if (lastDelta === 0) return;
          item.startDate = addDays(effectiveStart, lastDelta);
          item.endDate   = addDays(effectiveEnd,   lastDelta);
          item.days = Math.max(1, daysBetween(item.startDate, item.endDate) + 1);
          if (item.children) item.children.forEach(c => {
            if (c.startDate) c.startDate = addDays(c.startDate, lastDelta);
            if (c.endDate)   c.endDate   = addDays(c.endDate,   lastDelta);
          });
          renderGantt();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // ── バーリサイズ（右端） ──
      resizeHandle.addEventListener('mousedown', e => {
        e.preventDefault(); e.stopPropagation();
        const startX = e.clientX;
        const origWidth = parseInt(bar.style.width);
        const onMove = ev => {
          const newW = Math.max(COL_W, origWidth + Math.round((ev.clientX-startX)/COL_W)*COL_W);
          bar.style.width = newW + 'px';
          if (barLabel) barLabel.style.left = (parseInt(bar.style.left) + newW + 6) + 'px';
        };
        const onUp = ev => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          const newW = parseInt(bar.style.width);
          const newDays = Math.max(1, Math.round((newW + 2) / COL_W));
          // effectiveStart基準でendDateを確定（子タスクによるずれを防ぐ）
          const eStart = effectiveStart;
          const newEndDate = addDays(eStart, newDays - 1);
          if (newEndDate === item.endDate && newDays === item.days) return;
          item.startDate = eStart; // 明示的に保存してassignScheduleDatesの再計算を防ぐ
          item.endDate   = newEndDate;
          item.days      = newDays;
          renderGantt();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      rRow.appendChild(bar);

      // ── 左：親タスク行を先に追加、右：親バー行を先に追加 ──
      gtLeftBody.appendChild(lRow);
      gtRightBody.appendChild(rRow);

      // ── サブタスク行を親の後に追加（再帰で孫まで対応） ──
      if (item.children && item.children.length) {
        renderScheduleChildren(item.children, item, 1, d, dates, gridW, COL_W, ROW_H, phaseColor, phase, gtLeftBody, gtRightBody, container);
      }
    });

    // ── フェーズ末尾：タスク追加ボタン行 ──
    const lAddRow = document.createElement('div');
    lAddRow.style.cssText = `display:flex;align-items:center;padding:4px 10px;border-bottom:1px solid var(--border);min-height:32px;`;
    const addItemBtn = document.createElement('button');
    addItemBtn.style.cssText = `display:flex;align-items:center;gap:5px;background:transparent;border:1px dashed var(--border2);border-radius:5px;padding:3px 10px;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:11px;cursor:pointer;transition:all .15s;width:100%;`;
    addItemBtn.innerHTML = `<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>タスクを追加`;
    addItemBtn.onmouseenter = function(){ this.style.borderColor=phaseColor; this.style.color=phaseColor; };
    addItemBtn.onmouseleave = function(){ this.style.borderColor='var(--border2)'; this.style.color='var(--text3)'; };
    addItemBtn.onclick = e => { e.stopPropagation(); addScheduleItem(phase); };
    lAddRow.appendChild(addItemBtn);
    gtLeftBody.appendChild(lAddRow);

    const rAddRow = document.createElement('div');
    rAddRow.style.cssText = `width:${gridW}px;min-height:32px;border-bottom:1px solid var(--border);background:transparent;`;
    gtRightBody.appendChild(rAddRow);
  });

  // ── 最下部：タグライン追加ボタン ──
  const lAddPhase = document.createElement('div');
  lAddPhase.style.cssText = `display:flex;align-items:center;padding:8px 14px;`;
  const addPhaseBtn = document.createElement('button');
  addPhaseBtn.style.cssText = `display:flex;align-items:center;gap:6px;background:transparent;border:1px dashed var(--border2);border-radius:6px;padding:6px 14px;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:11px;cursor:pointer;transition:all .15s;width:100%;`;
  addPhaseBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>タグラインを追加`;
  addPhaseBtn.onmouseenter = function(){ this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'; };
  addPhaseBtn.onmouseleave = function(){ this.style.borderColor='var(--border2)'; this.style.color='var(--text3)'; };
  addPhaseBtn.onclick = () => {
    const name = prompt('新しいタグライン名を入力してください');
    if (!name || !name.trim()) return;
    const trimmed = name.trim();
    if (d.phases.includes(trimmed)) { alert('同じ名前のタグラインがすでに存在します'); return; }
    d.phases.push(trimmed);
    const idx = Object.keys(PHASE_BAR_COLORS).length;
    PHASE_BAR_COLORS[trimmed] = PHASE_DEFAULT_COLORS[idx % PHASE_DEFAULT_COLORS.length];
    renderGantt();
    renderPhaseLegend();
  };
  lAddPhase.appendChild(addPhaseBtn);
  gtLeftBody.appendChild(lAddPhase);
  const rAddPhase = document.createElement('div');
  rAddPhase.style.cssText = `width:${gridW}px;height:42px;`;
  gtRightBody.appendChild(rAddPhase);

  // 定例ラインを描画
  drawRecurringLines(gtRightBody, dates, COL_W, ROW_H);
  // ── 公開日（プロジェクト終了日）の赤ライン ──
  const _endIdx = dates.indexOf(d.endDate);
  if (_endIdx >= 0) {
    const _deadlineLine = document.createElement('div');
    _deadlineLine.style.cssText = `position:absolute;left:${_endIdx * COL_W + COL_W/2 - 1}px;top:0;width:2px;height:100%;background:rgba(220,38,38,0.75);z-index:50;pointer-events:none;`;
    gtRightBody.appendChild(_deadlineLine);
    const _recLane = document.getElementById('gt-rec-lane');
    if (_recLane) {
      const _pill = document.createElement('div');
      _pill.style.cssText = `position:absolute;left:${_endIdx * COL_W - 18}px;top:4px;background:#dc2626;color:#fff;font-family:'DM Mono',monospace;font-size:9px;padding:2px 6px;border-radius:3px;white-space:nowrap;z-index:60;`;
      _pill.textContent = '公開日';
      _recLane.appendChild(_pill);
    }
  }

  // スクロール位置を復元
  const newRight = document.getElementById('gt-right');
  if (newRight) {
    newRight.scrollLeft = savedScrollLeft;
    newRight.scrollTop  = savedScrollTop;
  }
}

function makeTaskRowPair(mi, ti, dates, d, COL_W, ROW_H, LABEL_W, memberColor) {
  const t = generatedData.members[mi].tasks[ti];
  const barColor = getBarColor(t.phase);
  const priColor = t.priority==='high'?'#dc2626':t.priority==='mid'?'#d97706':'#059669';
  const startOff = Math.max(0, daysBetween(d.startDate, t.startDate));
  const barDays  = Math.max(1, daysBetween(t.startDate, t.endDate) + 1);
  const gridW    = dates.length * COL_W; // ← スコープ内で計算

  // ── 左行（ラベル） ──
  const lRow = document.createElement('div');
  lRow.dataset.mi = mi; lRow.dataset.ti = ti;
  lRow.style.cssText = `display:flex;align-items:center;gap:6px;padding:0 10px 0 6px;height:${ROW_H}px;border-bottom:1px solid var(--border);box-sizing:border-box;background:var(--bg2);`;

  const handle = document.createElement('div');
  handle.className = 'row-drag-handle';
  handle.style.cssText = `flex-shrink:0;cursor:grab;color:var(--text3);padding:0 2px;display:flex;flex-direction:column;gap:2px;`;
  handle.innerHTML = `<div style="width:10px;height:1.5px;background:currentColor;border-radius:1px;"></div><div style="width:10px;height:1.5px;background:currentColor;border-radius:1px;"></div><div style="width:10px;height:1.5px;background:currentColor;border-radius:1px;"></div>`;
  handle.addEventListener('mouseover', () => handle.style.color='var(--text2)');
  handle.addEventListener('mouseout',  () => handle.style.color='var(--text3)');

  const dot = document.createElement('div');
  dot.style.cssText = `width:6px;height:6px;border-radius:50%;background:${priColor};flex-shrink:0;`;

  const nameSpan = document.createElement('span');
  nameSpan.textContent = t.name;
  nameSpan.title = t.name;
  nameSpan.style.cssText = `font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;cursor:text;`;
  nameSpan.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type='text'; input.value=generatedData.members[mi].tasks[ti].name;
    input.style.cssText=`flex:1;background:var(--bg3);border:1px solid var(--accent);border-radius:4px;padding:2px 6px;font-size:12px;color:var(--text);font-family:'DM Sans',sans-serif;outline:none;min-width:0;`;
    nameSpan.replaceWith(input); input.focus(); input.select();
    const commit = () => {
      const newName = input.value.trim() || generatedData.members[mi].tasks[ti].name;
      generatedData.members[mi].tasks[ti].name = newName;
      nameSpan.textContent=newName; nameSpan.title=newName;
      input.replaceWith(nameSpan);
      const barLabel = document.querySelector(`#gt-right-body [data-bar-mi="${mi}"][data-bar-ti="${ti}"] span`);
      if (barLabel) barLabel.textContent = newName;
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => {
      if (e.key==='Enter') { e.preventDefault(); input.blur(); }
      if (e.key==='Escape') { input.value=generatedData.members[mi].tasks[ti].name; input.blur(); }
    });
  });

  const delBtn = document.createElement('button');
  delBtn.textContent='×'; delBtn.title='削除';
  delBtn.style.cssText=`flex-shrink:0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;line-height:1;padding:1px 3px;border-radius:3px;transition:all .15s;opacity:0.2;`;
  delBtn.addEventListener('mouseover',()=>{delBtn.style.color='#dc2626';delBtn.style.opacity='1';});
  delBtn.addEventListener('mouseout', ()=>{delBtn.style.color='var(--text3)';delBtn.style.opacity='0.2';});
  delBtn.addEventListener('click', ()=>removeGanttTask(mi,ti));

  // サブタスク追加ボタン
  const addSubBtn = document.createElement('button');
  addSubBtn.title = 'サブタスクを追加';
  addSubBtn.textContent = '＋';
  addSubBtn.style.cssText = `flex-shrink:0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;line-height:1;padding:1px 3px;border-radius:3px;transition:all .15s;opacity:0.2;`;
  addSubBtn.addEventListener('mouseover', ()=>{addSubBtn.style.color='var(--accent)';addSubBtn.style.opacity='1';});
  addSubBtn.addEventListener('mouseout',  ()=>{addSubBtn.style.color='var(--text3)';addSubBtn.style.opacity='0.2';});
  addSubBtn.addEventListener('click', e => {
    e.stopPropagation();
    const task = generatedData.members[mi].tasks[ti];
    if (!task.children) task.children = [];
    task.children.push({ name:'サブタスク', phase:task.phase, days:1, priority:'todo', description:'', children:[], startDate:null, endDate:null });
    renderGantt();
    syncMemberUI();
  });

  const hasChildren = t.children && t.children.length > 0;

  // 折り畳みボタン（子がある場合のみ）
  if (hasChildren) {
    const collapseBtn = document.createElement('button');
    collapseBtn.title = '子タスクを格納';
    const isCollapsed = !!t._collapsed;
    collapseBtn.style.cssText = `flex-shrink:0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:9px;line-height:1;padding:1px 3px;border-radius:3px;transition:all .15s;transform:rotate(${isCollapsed?'-90':'0'}deg);`;
    collapseBtn.innerHTML = `<svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    collapseBtn.addEventListener('click', e => {
      e.stopPropagation();
      generatedData.members[mi].tasks[ti]._collapsed = !generatedData.members[mi].tasks[ti]._collapsed;
      renderGantt();
    });
    lRow.appendChild(collapseBtn);
  }

  lRow.appendChild(handle); lRow.appendChild(dot); lRow.appendChild(nameSpan); lRow.appendChild(addSubBtn); lRow.appendChild(delBtn);

  // ── 右行（グリッド＋バー） ──
  const rRow = document.createElement('div');
  rRow.dataset.barMi = mi; rRow.dataset.barTi = ti;
  rRow.style.cssText = `position:relative;width:${gridW}px;height:${ROW_H}px;border-bottom:1px solid var(--border);box-sizing:border-box;overflow:hidden;`;

  dates.forEach((dt,di) => {
    const off=isOffDay(dt); const isT=dt===toDateStr(new Date());
    const isMStart=dt.endsWith('-01')||dt===d.startDate;
    const cell=document.createElement('div');
    cell.style.cssText=`position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${isT?'rgba(91,78,245,0.06)':off?'rgba(0,0,0,0.03)':'var(--bg2)'};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
    rRow.appendChild(cell);
  });

  const barH = hasChildren ? 14 : 22;
  const bar = document.createElement('div');
  bar.style.cssText=`position:absolute;height:${barH}px;top:50%;transform:translateY(-50%);border-radius:5px;background:${barColor};left:${startOff*COL_W+1}px;width:${barDays*COL_W-2}px;display:flex;align-items:center;padding:0 6px;cursor:grab;user-select:none;box-sizing:border-box;z-index:2;transition:box-shadow .15s;opacity:${hasChildren?'.75':'1'};`;
  bar.dataset.phase=t.phase;
  bar.innerHTML=`<div class="gantt-bar-resize-left" style="position:absolute;left:0;top:0;bottom:0;width:9px;cursor:ew-resize;border-radius:5px 0 0 5px;background:rgba(255,255,255,.25);"></div><span style="font-size:10px;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;flex:1;padding-left:4px;">${t.name}</span><div class="gantt-bar-resize" style="position:absolute;right:0;top:0;bottom:0;width:7px;cursor:ew-resize;border-radius:0 5px 5px 0;background:rgba(255,255,255,.15);"></div>`;
  bar.addEventListener('mouseenter',()=>bar.style.boxShadow='0 2px 10px rgba(0,0,0,.4)');
  bar.addEventListener('mouseleave',()=>bar.style.boxShadow='none');
  rRow.appendChild(bar);

  setupBarDrag(bar, mi, ti, COL_W, d.startDate);
  setupRowDrag(lRow, mi, ti);
  return { lRow, rRow };
}

function deleteMemberFromGantt(mi) {
  const m = generatedData?.members[mi];
  if (!m) return;
  showConfirm(
    `「${m.name}」とそのタスクをすべて削除しますか？`,
    '削除する', '#dc2626',
    () => {
      generatedData.members.splice(mi, 1);
      renderGantt();
      syncMemberUI();
    }
  );
}

function addGanttTask(mi) {
  const d = generatedData;
  const m = d.members[mi];
  const lastTask = m.tasks[m.tasks.length - 1];
  const newStart = lastTask ? addDays(lastTask.endDate, 1) : d.startDate;
  const newEnd   = addDays(newStart, 4);
  m.tasks.push({ name:'新しいタスク', phase:'実装', days:5, priority:'todo', description:'', startDate:newStart, endDate:newEnd, children:[] });
  renderGantt();
  syncMemberUI();
}

function removeGanttTask(mi, ti) {
  generatedData.members[mi].tasks.splice(ti, 1);
  renderGantt();
  syncMemberUI();
}

function setupBarDrag(bar, mi, ti, COL_W, projectStart) {
  const tooltip = document.getElementById('gt-tooltip');
  const ttName  = document.getElementById('gt-tt-name');
  const ttDates = document.getElementById('gt-tt-dates');

  const showTip = () => {
    const t = generatedData.members[mi].tasks[ti];
    if (!t || !ttName) return;
    ttName.textContent = t.name;
    ttDates.textContent = `${t.startDate} 〜 ${t.endDate}（${t.days}日）`;
    tooltip.style.display = 'block';
  };
  bar.addEventListener('mouseenter', showTip);
  bar.addEventListener('mousemove', e => {
    if (!tooltip) return;
    tooltip.style.left = (e.clientX + 14) + 'px';
    tooltip.style.top  = (e.clientY - 10) + 'px';
  });
  bar.addEventListener('mouseleave', () => { if (tooltip) tooltip.style.display = 'none'; });

  const resizeHandle      = bar.querySelector('.gantt-bar-resize');
  const resizeHandleLeft  = bar.querySelector('.gantt-bar-resize-left');

  // ── LEFT RESIZE（開始日を動かす）──
  resizeHandleLeft.addEventListener('mousedown', e => {
    e.preventDefault(); e.stopPropagation();
    const startX     = e.clientX;
    const origLeft   = parseInt(bar.style.left);
    const origWidth  = parseInt(bar.style.width);
    let lastLeft = origLeft;
    const onMove = e2 => {
      const dx       = e2.clientX - startX;
      const rawLeft  = origLeft + dx;
      const col      = Math.round(rawLeft / COL_W);
      const newLeft  = Math.max(0, col * COL_W);
      const widthDiff = origLeft - newLeft;
      const newWidth  = Math.max(COL_W - 2, origWidth + widthDiff);
      if (newLeft === lastLeft) return;
      lastLeft = newLeft;
      bar.style.left  = newLeft + 'px';
      bar.style.width = newWidth + 'px';
      const t = generatedData.members[mi].tasks[ti];
      if (!t) return;
      const offsetDays = Math.round(newLeft / COL_W);
      t.startDate = addDays(projectStart, offsetDays);
      t.days      = Math.round((newWidth + 2) / COL_W);
      t.endDate   = addDays(t.startDate, t.days - 1);
      showTip();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // ── DRAG（移動）──
  bar.addEventListener('mousedown', e => {
    if (e.target === resizeHandle || e.target === resizeHandleLeft) return;
    e.preventDefault();
    bar.style.cursor = 'grabbing';
    const origLeft = parseInt(bar.style.left);
    const startX   = e.clientX;
    let lastLeft   = origLeft;

    const onMove = e2 => {
      const dx      = e2.clientX - startX;
      const rawLeft = origLeft + dx;
      const col     = Math.round(rawLeft / COL_W);
      const newLeft = Math.max(0, col * COL_W);
      if (newLeft === lastLeft) return;
      lastLeft = newLeft;
      bar.style.left = newLeft + 'px';
      const t = generatedData.members[mi].tasks[ti];
      if (!t) return;
      const offsetDays = Math.round(newLeft / COL_W);
      const newStart = addDays(projectStart, offsetDays);
      const dur = daysBetween(t.startDate, t.endDate);
      t.startDate = newStart;
      t.endDate   = addDays(newStart, dur);
      t.days = dur + 1;
      showTip();
    };
    const onUp = () => {
      bar.style.cursor = 'grab';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });

  // ── RESIZE（延長・短縮）──
  resizeHandle.addEventListener('mousedown', e => {
    e.preventDefault();
    e.stopPropagation();
    const startX    = e.clientX;
    const origWidth = parseInt(bar.style.width);

    const onMove = e2 => {
      const dx = e2.clientX - startX;
      const colDelta = Math.round(dx / COL_W);
      const newWidth = Math.max(COL_W - 2, origWidth + colDelta * COL_W);
      bar.style.width = newWidth + 'px';
      const t = generatedData.members[mi].tasks[ti];
      if (!t) return;
      const newDays = Math.round((newWidth + 2) / COL_W);
      t.days    = newDays;
      t.endDate = addDays(t.startDate, newDays - 1);
      showTip();
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

// ─── EXCEL EXPORT ───
function exportExcel() {
  const d = generatedData;
  if (!d) return;
  assignTaskDates();

  // SheetJSを動的ロード
  if (typeof XLSX === 'undefined') {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
    s.onload = () => doExport(d);
    document.head.appendChild(s);
  } else {
    doExport(d);
  }
}

function doExport(d) {
  const wb = XLSX.utils.book_new();

  // ── Sheet1: タスク一覧 ──
  const taskRows = [['メンバー', 'ロール', 'タスク名', 'フェーズ', '優先度', '開始日', '終了日', '工数(日)', '説明']];
  const priLabel = { high: '高', mid: '中', low: '低' };
  d.members.forEach(m => {
    m.tasks.forEach(t => {
      taskRows.push([
        m.name, m.role, t.name, t.phase,
        priLabel[t.priority] || t.priority,
        t.startDate, t.endDate, t.days, t.description || ''
      ]);
    });
  });
  const ws1 = XLSX.utils.aoa_to_sheet(taskRows);

  // 列幅設定
  ws1['!cols'] = [
    {wch:14},{wch:18},{wch:24},{wch:10},{wch:6},
    {wch:12},{wch:12},{wch:8},{wch:36}
  ];

  // ヘッダー行スタイル
  const headerStyle = { font:{bold:true}, fill:{fgColor:{rgb:'1A1A24'}}, alignment:{horizontal:'center'} };
  ['A1','B1','C1','D1','E1','F1','G1','H1','I1'].forEach(ref => {
    if (ws1[ref]) ws1[ref].s = headerStyle;
  });

  XLSX.utils.book_append_sheet(wb, ws1, 'タスク一覧');

  // ── Sheet2: ガントチャート ──
  const totalDays = daysBetween(d.startDate, d.endDate) + 1;
  const dates = [];
  for (let i = 0; i < totalDays; i++) {
    const dd = parseDate(d.startDate);
    dd.setDate(dd.getDate() + i);
    dates.push(toDateStr(dd));
  }

  // 月ヘッダー行
  const monthRow = [''];
  const dayRow2  = ['タスク'];
  const monthGroups2 = [];
  let curMonth = null;
  dates.forEach(dt => {
    const [y, m] = dt.split('-');
    const key = `${y}-${m}`;
    if (!curMonth || curMonth.key !== key) {
      curMonth = { key, label: `${parseInt(y)}年${parseInt(m)}月`, count: 0 };
      monthGroups2.push(curMonth);
    }
    curMonth.count++;
    dayRow2.push(parseInt(dt.split('-')[2]));
  });
  let colIdx = 1;
  monthGroups2.forEach(mg => {
    monthRow.push(mg.label);
    for (let i = 1; i < mg.count; i++) monthRow.push('');
    colIdx += mg.count;
  });

  const ganttData = [monthRow, dayRow2];

  d.members.forEach(m => {
    // メンバー行
    const memberRow = new Array(dates.length + 1).fill('');
    memberRow[0] = `▶ ${m.name}（${m.role}）`;
    ganttData.push(memberRow);

    m.tasks.forEach(t => {
      const row = new Array(dates.length + 1).fill('');
      row[0] = t.name;
      const startOff = Math.max(0, daysBetween(d.startDate, t.startDate));
      const endOff = Math.min(dates.length - 1, daysBetween(d.startDate, t.endDate));
      for (let i = startOff; i <= endOff; i++) {
        row[i + 1] = '■';
      }
      ganttData.push(row);
    });
  });

  const ws2 = XLSX.utils.aoa_to_sheet(ganttData);
  ws2['!cols'] = [{wch:24}, ...dates.map(() => ({wch:3}))];

  XLSX.utils.book_append_sheet(wb, ws2, 'ガントチャート');

  // ダウンロード
  const projName = (d.projectName || 'project').replace(/[/\\?%*:|"<>]/g, '_');
  XLSX.writeFile(wb, `${projName}_スケジュール.xlsx`);
}

// ─── PROJECT TITLE EDIT ───
function editProjectTitle() {
  const el = document.getElementById('result-project-name');
  if (!el || el.querySelector('input')) return;
  const cur = generatedData ? generatedData.projectName : el.textContent;
  const input = document.createElement('input');
  input.type = 'text';
  input.value = cur;
  input.style.cssText = `font-family:'Noto Sans JP','Hiragino Sans','Yu Gothic',sans-serif;font-weight:800;font-size:26px;letter-spacing:-.5px;color:var(--text);background:transparent;border:none;border-bottom:2px solid var(--accent);outline:none;width:100%;padding:0;`;
  el.innerHTML = '';
  el.appendChild(input);
  input.focus(); input.select();
  const commit = () => {
    const v = input.value.trim() || cur;
    if (generatedData) generatedData.projectName = v;
    el.textContent = v;
  };
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { input.value = cur; input.blur(); }
  });
}

// ─── RENDER RESULT ───
function renderResult(keepSchedule = false) {
  const d = generatedData;
  _deletedPhases = new Set();
  if (!keepSchedule) d.scheduleItems = null; // 新規生成時のみリセット

  const nameEl = document.getElementById('result-project-name');
  if (nameEl) nameEl.textContent = d.projectName;
  const badgeEl = document.getElementById('result-badge');
  if (badgeEl) badgeEl.textContent =
    selectedCategories.length ? selectedCategories.slice(0,2).join(' / ') : 'プロジェクト';

  // カテゴリに基づいてフェーズ・タグラインを常に上書き
  const CAT_TL = {
    'Webサイト制作':  '要件定義・IA・デザイン・実装・素材制作',
    '動画制作':       '企画・脚本・撮影・編集・MA・納品',
    'CM制作':         '企画・コンテ・プリプロ・撮影・ポスプロ・オンエア',
    'ロゴ制作':       'コンセプト・スケッチ・デザイン・商標確認・納品',
    'MVVの作成':      'ミッション・ビジョン・バリュー策定・言語化・社内展開',
    'ブランディング':  'リサーチ・コンセプト・VI・ガイドライン・展開',
  };
  const CAT_PHASES = {
    'Webサイト制作':  ['要件定義', 'IA・設計', 'デザイン', '実装・コーディング', 'テスト', 'リリース'],
    '動画制作':       ['企画・構成', 'スクリプト', '撮影', '編集・CG', '納品'],
    'CM制作':         ['オリエン', '企画・コンテ', 'プリプロ', '撮影', 'ポスプロ', '納品'],
    'ロゴ制作':       ['ヒアリング', 'コンセプト', 'デザイン案', '修正・調整', '納品'],
    'MVVの作成':      ['ヒアリング', '調査・分析', 'ドラフト作成', 'レビュー', '確定・展開'],
    'ブランディング':  ['調査・分析', 'コンセプト設計', 'VI開発', 'ガイドライン策定', '展開'],
  };
  const tagline = selectedCategories.map(c => CAT_TL[c]).filter(Boolean).join(' / ') || d.tagline || '';
  d.tagline = tagline;
  const mainCat = selectedCategories.find(c => CAT_PHASES[c]);
  if (mainCat) {
    d.phases = CAT_PHASES[mainCat];
    const catPhases = CAT_PHASES[mainCat];
    const memberCount = d.members.length;

    // メンバー単位でフェーズを割り当て（1メンバー=1フェーズ）
    d.members.forEach((m, mi) => {
      const phase = catPhases[Math.floor(mi / memberCount * catPhases.length)];
      m.tasks.forEach(t => { t.phase = phase; });
    });
  }

  const clientEl2 = document.getElementById('result-client-name');
  if (clientEl2) {
    const clientVal = document.getElementById('proj-client')?.value || '';
    clientEl2.textContent = clientVal ? `クライアント：${clientVal}` : '';
  }

  // Stats — タブバー横のインラインテキスト
  const statsRow = document.getElementById('stats-row');
  const totalTasks = d.totalTasks || d.members.reduce((s, m) => s + m.tasks.length, 0);
  const totalDays = d.totalDays || Math.round((new Date(d.endDate) - new Date(d.startDate)) / 86400000);
  const todayStr = toDateStr(new Date());
  const elapsedDays = d.startDate <= todayStr
    ? Math.min(totalDays, Math.round((new Date(todayStr) - new Date(d.startDate)) / 86400000) + 1)
    : 0;
  const elapsedText = elapsedDays > 0 ? `${elapsedDays}日目 / ${totalDays}日` : `開始前 / ${totalDays}日`;

  if (statsRow) statsRow.innerHTML = `
    <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text3);">${d.projectName || ''}</span>
    <span style="font-family:'DM Mono',monospace;font-size:11px;color:var(--text3);margin-left:10px;padding-left:10px;border-left:1px solid var(--border2);">${elapsedText}</span>
  `;

  // Board
  syncMemberUI();
  if (mtgPanelOpen) renderMtgList();
}

// ─── SUB TAB (カンバン / MTGメモ) ───
let currentSubTab = 'kanban';
function switchSubTab(tab) {
  currentSubTab = 'kanban'; // カンバンのみ
}

// 旧パネル関数（互換）
let mtgPanelOpen = false;
function toggleMtgPanel() { switchSubTab(currentSubTab === 'mtg' ? 'kanban' : 'mtg'); }

// ─── MTG MEMO ───
let mtgEntries = []; // [{ id, date, title, decisions:[], checks:[], tasks:[{text,memberId,done}] }]

function addMtgEntry() {
  const today = toDateStr(new Date());
  const entry = {
    id: Date.now(),
    date: today,
    title: 'MTG',
    open: true,
    decisions: [''],
    checks: [''],
    tasks: []
  };
  mtgEntries.unshift(entry);
  renderMtgList();
}

function renderMtgList() {
  const list = document.getElementById('mtg-list');
  if (!list) return;
  list.innerHTML = '';
  if (!mtgEntries.length) {
    list.innerHTML = `<div style="text-align:center;color:var(--text3);font-size:12px;padding:24px 0;">「新しいMTG」から記録を追加</div>`;
    return;
  }
  mtgEntries.forEach((entry, ei) => renderMtgEntry(list, entry, ei));
}

function renderMtgEntry(container, entry, ei) {
  const wrap = document.createElement('div');
  wrap.style.cssText = `border:1px solid var(--border);border-radius:8px;overflow:hidden;background:linear-gradient(145deg, color-mix(in srgb, white 62%, var(--bg) 38%) 0%, color-mix(in srgb, white 28%, var(--bg) 72%) 100%);`;

  // ── ヘッダー（トグル） ──
  const head = document.createElement('div');
  head.style.cssText = `display:flex;align-items:center;gap:8px;padding:12px 14px;cursor:pointer;user-select:none;`;
  head.addEventListener('click', () => {
    entry.open = !entry.open;
    body.style.display = entry.open ? 'block' : 'none';
    arrow.style.transform = entry.open ? 'rotate(180deg)' : 'rotate(0deg)';
  });

  const arrow = document.createElement('span');
  const initDeg = entry.open ? '180' : '0';
  arrow.style.cssText = `font-size:12px;color:var(--text3);transition:transform .2s;display:inline-block;transform:rotate(${initDeg}deg);flex-shrink:0;`;
  arrow.textContent = '▾';

  // 日付（編集可）
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = entry.date;
  dateInput.style.cssText = `font-family:'DM Mono',monospace;font-size:12px;color:var(--text2);background:transparent;border:1px solid transparent;border-radius:4px;outline:none;cursor:pointer;width:120px;flex-shrink:0;padding:1px 4px;transition:border-color .15s;`;
  dateInput.addEventListener('mouseenter', () => dateInput.style.borderColor='var(--border2)');
  dateInput.addEventListener('mouseleave', () => { if(document.activeElement!==dateInput) dateInput.style.borderColor='transparent'; });
  dateInput.addEventListener('focus', () => dateInput.style.borderColor='var(--accent)');
  dateInput.addEventListener('blur',  () => dateInput.style.borderColor='transparent');
  dateInput.addEventListener('click', e => e.stopPropagation());
  dateInput.addEventListener('change', () => { entry.date = dateInput.value; });

  // タイトル（編集可）
  const titleEl = document.createElement('input');
  titleEl.type = 'text';
  titleEl.value = entry.title;
  titleEl.placeholder = 'MTGタイトル';
  titleEl.style.cssText = `flex:1;font-family:'Syne',sans-serif;font-weight:700;font-size:14px;color:var(--text);background:transparent;border:none;outline:none;min-width:0;`;
  titleEl.addEventListener('click', e => e.stopPropagation());
  titleEl.addEventListener('input', () => { entry.title = titleEl.value; });

  // 削除ボタン
  const delBtn = document.createElement('button');
  delBtn.textContent = '×';
  delBtn.style.cssText = `background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:1px 4px;border-radius:3px;flex-shrink:0;`;
  delBtn.addEventListener('click', e => { e.stopPropagation(); mtgEntries.splice(ei, 1); renderMtgList(); });
  delBtn.addEventListener('mouseenter', () => delBtn.style.color='#dc2626');
  delBtn.addEventListener('mouseleave', () => delBtn.style.color='var(--text3)');

  head.appendChild(arrow); head.appendChild(dateInput); head.appendChild(titleEl); head.appendChild(delBtn);
  wrap.appendChild(head);

  // ── ボディ ──
  const body = document.createElement('div');
  body.style.cssText = `display:${entry.open?'block':'none'};border-top:1px solid var(--border);`;

  const SECTIONS = [
    { key: 'decisions', label: '✅ 決定事項', color: 'var(--green)' },
    { key: 'checks',    label: '❓ 確認事項', color: 'var(--yellow,#d97706)' },
  ];

  SECTIONS.forEach(sec => {
    const secWrap = document.createElement('div');
    secWrap.style.cssText = `padding:10px 12px 6px;border-bottom:1px solid var(--border);`;

    const secLabel = document.createElement('div');
    secLabel.style.cssText = `font-family:'Syne',sans-serif;font-weight:700;font-size:14px;letter-spacing:.2px;color:${sec.color};margin-bottom:10px;`;
    secLabel.textContent = sec.label;
    secWrap.appendChild(secLabel);

    const renderItems = () => {
      Array.from(secWrap.querySelectorAll('.mtg-item')).forEach(el => el.remove());
      entry[sec.key].forEach((text, idx) => {
        const row = document.createElement('div');
        row.className = 'mtg-item';
        row.style.cssText = `display:flex;align-items:flex-start;gap:6px;margin-bottom:5px;`;
        const bullet = document.createElement('span');
        bullet.style.cssText = `flex-shrink:0;margin-top:8px;width:5px;height:5px;border-radius:50%;background:${sec.color};display:inline-block;`;
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.placeholder = '記入してください';
        ta.rows = 1;
        ta.style.cssText = `flex:1;background:transparent;border:none;outline:none;resize:none;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text);line-height:1.7;overflow:hidden;`;
        ta.addEventListener('input', () => {
          entry[sec.key][idx] = ta.value;
          ta.style.height = 'auto';
          ta.style.height = ta.scrollHeight + 'px';
        });
        ta.addEventListener('keydown', e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            entry[sec.key].splice(idx + 1, 0, '');
            renderItems();
            // 次の行にフォーカス
            setTimeout(() => {
              const items = secWrap.querySelectorAll('.mtg-item textarea');
              if (items[idx + 1]) items[idx + 1].focus();
            }, 0);
          }
          if (e.key === 'Backspace' && ta.value === '' && entry[sec.key].length > 1) {
            e.preventDefault();
            entry[sec.key].splice(idx, 1);
            renderItems();
            setTimeout(() => {
              const items = secWrap.querySelectorAll('.mtg-item textarea');
              if (items[Math.max(0, idx - 1)]) items[Math.max(0, idx - 1)].focus();
            }, 0);
          }
        });
        setTimeout(() => { ta.style.height = ta.scrollHeight + 'px'; }, 0);
        row.appendChild(bullet); row.appendChild(ta);
        secWrap.appendChild(row);
      });
    };
    renderItems();
    body.appendChild(secWrap);
  });

  // ── タスクセクション ──
  const taskSec = document.createElement('div');
  taskSec.style.cssText = `padding:10px 12px 10px;`;

  const taskLabel = document.createElement('div');
  taskLabel.style.cssText = `font-family:'Syne',sans-serif;font-weight:700;font-size:14px;letter-spacing:.2px;color:var(--accent);margin-bottom:10px;`;
  taskLabel.textContent = '📋 タスク';
  taskSec.appendChild(taskLabel);

  const renderTaskItems = () => {
    Array.from(taskSec.querySelectorAll('.mtg-task-item')).forEach(el => el.remove());
    entry.tasks.forEach((task, ti) => {
      const row = document.createElement('div');
      row.className = 'mtg-task-item';
      row.style.cssText = `display:flex;align-items:center;gap:6px;margin-bottom:8px;`;

      // チェックボックス
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.checked = task.done || false;
      cb.style.cssText = `flex-shrink:0;accent-color:var(--accent);cursor:pointer;width:15px;height:15px;`;
      cb.addEventListener('change', () => { task.done = cb.checked; });

      // タスク名
      const nameInput = document.createElement('input');
      nameInput.type = 'text';
      nameInput.value = task.text;
      nameInput.placeholder = 'タスク名';
      nameInput.style.cssText = `flex:1;background:transparent;border:none;border-bottom:1px solid var(--border);outline:none;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text);padding:3px 0;min-width:0;${task.done?'text-decoration:line-through;color:var(--text3);':''}`;
      nameInput.addEventListener('input', () => { task.text = nameInput.value; });

      // 担当者選択
      const memberSel = document.createElement('select');
      memberSel.style.cssText = `background:var(--bg2);border:1px solid var(--border2);border-radius:5px;color:var(--text2);font-family:'DM Sans',sans-serif;font-size:12px;padding:3px 6px;cursor:pointer;max-width:100px;outline:none;flex-shrink:0;`;
      const blankOpt = document.createElement('option');
      blankOpt.value = ''; blankOpt.textContent = '担当-';
      memberSel.appendChild(blankOpt);
      (generatedData?.members || []).forEach((m, mi) => {
        const opt = document.createElement('option');
        opt.value = mi;
        opt.textContent = m.name || m.role;
        if (task.memberId === mi) opt.selected = true;
        memberSel.appendChild(opt);
      });
      memberSel.addEventListener('change', () => {
        task.memberId = memberSel.value === '' ? null : parseInt(memberSel.value);
      });

      // カンバンに追加ボタン
      const addToBoard = document.createElement('button');
      addToBoard.title = 'カンバンボードに追加';
      addToBoard.style.cssText = `flex-shrink:0;background:none;border:1px solid var(--accent);border-radius:5px;color:var(--accent);cursor:pointer;font-size:10px;padding:3px 8px;font-family:'DM Sans',sans-serif;white-space:nowrap;transition:all .15s;font-weight:500;`;
      addToBoard.textContent = 'カンバンに追加';
      addToBoard.addEventListener('mouseenter', () => { addToBoard.style.background='var(--accent)'; addToBoard.style.color='#fff'; });
      addToBoard.addEventListener('mouseleave', () => { addToBoard.style.background='none'; addToBoard.style.color='var(--accent)'; });
      addToBoard.addEventListener('click', () => {
        const mi = task.memberId;
        if (mi === null || mi === undefined || !generatedData?.members[mi]) {
          alert('担当者を選択してください');
          return;
        }
        const taskName = task.text.trim() || 'MTGタスク';
        generatedData.members[mi].tasks.push({
          name: taskName,
          phase: 'その他',
          days: 1,
          priority: 'todo',
          description: `MTGメモより: ${entry.title} (${entry.date})`,
          startDate: null, endDate: null,
          children: []
        });
        syncMemberUI();
        // ボタンを一時的に「追加済」に
        addToBoard.textContent = '✓ 追加しました';
        addToBoard.style.background = '#059669';
        addToBoard.style.color = '#fff';
        addToBoard.style.borderColor = '#059669';
        setTimeout(() => {
          addToBoard.textContent = '→追加';
          addToBoard.style.background = 'none';
          addToBoard.style.color = 'var(--accent)';
          addToBoard.style.borderColor = 'var(--accent)';
        }, 1800);
      });

      // 削除
      const delT = document.createElement('button');
      delT.textContent = '×';
      delT.style.cssText = `flex-shrink:0;background:none;border:none;color:var(--text3);cursor:pointer;font-size:12px;padding:1px 2px;`;
      delT.addEventListener('click', () => { entry.tasks.splice(ti, 1); renderTaskItems(); });
      delT.addEventListener('mouseenter', () => delT.style.color='#dc2626');
      delT.addEventListener('mouseleave', () => delT.style.color='var(--text3)');

      row.appendChild(cb); row.appendChild(nameInput); row.appendChild(memberSel); row.appendChild(addToBoard); row.appendChild(delT);
      taskSec.appendChild(row);
    });

    // タスク追加ボタン
    const existingAddBtn = taskSec.querySelector('.mtg-add-task');
    if (existingAddBtn) existingAddBtn.remove();
    const addTaskBtn = document.createElement('button');
    addTaskBtn.className = 'mtg-add-task';
    addTaskBtn.textContent = '＋ タスクを追加';
    addTaskBtn.style.cssText = `background:transparent;border:1px dashed var(--border2);border-radius:5px;padding:4px 10px;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:11px;cursor:pointer;width:100%;margin-top:2px;transition:all .15s;`;
    addTaskBtn.addEventListener('mouseenter', () => { addTaskBtn.style.borderColor='var(--accent)'; addTaskBtn.style.color='var(--accent)'; });
    addTaskBtn.addEventListener('mouseleave', () => { addTaskBtn.style.borderColor='var(--border2)'; addTaskBtn.style.color='var(--text3)'; });
    addTaskBtn.addEventListener('click', () => {
      entry.tasks.push({ text: '', memberId: null, done: false });
      renderTaskItems();
      // 最後のtextareaにフォーカス
      setTimeout(() => {
        const inputs = taskSec.querySelectorAll('.mtg-task-item input[type=text]');
        if (inputs.length) inputs[inputs.length - 1].focus();
      }, 0);
    });
    taskSec.appendChild(addTaskBtn);
  };
  renderTaskItems();
  body.appendChild(taskSec);

  // ── その他メモ（リッチエディタ）──
  const memoSec = document.createElement('div');
  memoSec.style.cssText = `padding:8px 12px 14px;border-top:1px solid var(--border);`;

  const memoLabel = document.createElement('div');
  memoLabel.style.cssText = `font-family:'Syne',sans-serif;font-weight:700;font-size:14px;letter-spacing:.2px;color:var(--text3);margin-bottom:8px;`;
  memoLabel.textContent = '📝 その他メモ';

  // ツールバー
  const toolbar = document.createElement('div');
  toolbar.style.cssText = `display:flex;gap:2px;margin-bottom:6px;flex-wrap:wrap;`;
  const toolBtns = [
    { label: '•', title: '箇条書き', cmd: 'insertUnorderedList' },
    { label: '1.', title: '番号リスト', cmd: 'insertOrderedList' },
    { label: '⇥', title: 'インデント', cmd: 'indent' },
    { label: '⇤', title: '戻す', cmd: 'outdent' },
    { label: 'B', title: '太字', cmd: 'bold', style: 'font-weight:700;' },
    { label: '—', title: '区切り線', cmd: 'insertHorizontalRule' },
  ];
  toolBtns.forEach(({ label, title, cmd, style }) => {
    const tb = document.createElement('button');
    tb.title = title;
    tb.textContent = label;
    tb.style.cssText = `background:var(--bg3);border:1px solid var(--border);border-radius:4px;padding:3px 8px;font-family:'DM Mono',monospace;font-size:11px;cursor:pointer;color:var(--text2);transition:all .1s;${style||''}`;
    tb.addEventListener('mouseenter', () => tb.style.borderColor='var(--accent)');
    tb.addEventListener('mouseleave', () => tb.style.borderColor='var(--border)');
    tb.addEventListener('mousedown', e => {
      e.preventDefault();
      document.execCommand(cmd, false, null);
      editor.focus();
    });
    toolbar.appendChild(tb);
  });

  // エディタ
  const editor = document.createElement('div');
  editor.contentEditable = 'true';
  editor.style.cssText = `min-height:80px;max-height:320px;overflow-y:auto;overflow-x:hidden;background:#fdf8f0;border:1px solid var(--border);border-radius:8px;padding:10px 20px 10px 20px;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--text);line-height:1.7;outline:none;transition:border-color .15s;word-break:break-word;box-sizing:border-box;`;

  // リスト・インデントのCSS注入
  if (!document.getElementById('memo-editor-style')) {
    const st = document.createElement('style');
    st.id = 'memo-editor-style';
    st.textContent = `
      [contenteditable] ul, [contenteditable] ol { padding-left: 1.6em; margin: 2px 0; }
      [contenteditable] li { margin: 1px 0; }
      [contenteditable] blockquote { margin-left: 1.4em; padding-left: 8px; border-left: 3px solid var(--border2); color: var(--text2); }
      [contenteditable][data-placeholder]:empty::before { content: attr(data-placeholder); color: var(--text3); pointer-events: none; }
    `;
    document.head.appendChild(st);
  }

  if (entry.memo) editor.innerHTML = entry.memo;
  else editor.setAttribute('data-placeholder', '自由にメモを記述してください…');
  editor.addEventListener('blur',  () => editor.style.borderColor='var(--border)');
  editor.addEventListener('input', () => { entry.memo = editor.innerHTML; });

  // ショートカットキー
  editor.addEventListener('keydown', e => {
    const cmd = e.metaKey || e.ctrlKey;
    // Cmd/Ctrl + Shift + 8 → 箇条書きリスト
    if (cmd && e.shiftKey && (e.key === '8' || e.key === '*')) {
      e.preventDefault();
      document.execCommand('insertUnorderedList', false, null);
      return;
    }
    // Cmd/Ctrl + Shift + 7 → 番号リスト
    if (cmd && e.shiftKey && e.key === '7') {
      e.preventDefault();
      document.execCommand('insertOrderedList', false, null);
      return;
    }
    // Tab → インデント、Shift+Tab → アウトデント
    if (e.key === 'Tab') {
      e.preventDefault();
      const sel = window.getSelection();
      const node = sel?.anchorNode;
      // リスト内ならnative indent/outdent
      const inList = node && (node.parentElement?.closest('li') || node.closest?.('li'));
      if (inList) {
        document.execCommand(e.shiftKey ? 'outdent' : 'indent', false, null);
      } else {
        // リスト外：スペース4つ挿入でインデント表現
        if (!e.shiftKey) {
          document.execCommand('insertText', false, '\u00a0\u00a0\u00a0\u00a0');
        }
      }
      return;
    }
    // Cmd/Ctrl + B → 太字
    if (cmd && e.key === 'b') {
      e.preventDefault();
      document.execCommand('bold', false, null);
      return;
    }
  });

  // スペース・Enterでオートリンク変換
  editor.addEventListener('keyup', e => {
    if (e.key === ' ' || e.key === 'Enter') {
      autoLinkEditor(editor);
      entry.memo = editor.innerHTML;
    }
  });

  memoSec.appendChild(memoLabel);
  memoSec.appendChild(toolbar);
  memoSec.appendChild(editor);
  body.appendChild(memoSec);

  wrap.appendChild(body);
  container.appendChild(wrap);
}



// ─── MEMBER SUB TABS ───
let currentMemberTab = 'kanban';

function switchMemberTab(tab) {
  currentMemberTab = tab;
  const tabs = ['kanban','status','done'];
  tabs.forEach(t => {
    const btn = document.getElementById(`mtab-${t}`);
    const view = document.getElementById(`subview-${t}`);
    const isActive = t === tab;
    if (btn) {
      btn.style.background = isActive ? 'rgba(0,0,0,0.10)' : 'transparent';
      btn.style.color = isActive ? 'var(--text)' : 'var(--text3)';
    }
    if (view) view.style.display = isActive ? 'block' : 'none';
  });
  const legend = document.getElementById('kanban-legend');
  if (legend) legend.style.display = tab === 'kanban' ? 'flex' : 'none';

  if (tab === 'done')   renderMemberDoneView();
  if (tab === 'status') renderStatusKanban();
}

function renderMemberListView() {
  const d = generatedData;
  const container = document.getElementById('member-list-view');
  if (!d || !container) return;
  container.innerHTML = '';

  const STATUS_ORDER = { doing: 0, todo: 1 };
  const STATUS_LABEL = { doing: '作業中', todo: '作業前' };
  const STATUS_COLOR = { doing: '#2563eb', todo: '#9ca3af' };

  // 全メンバーのアクティブタスクを収集
  const rows = [];
  d.members.forEach((m, mi) => {
    const color = ROLE_COLORS[m.role] || ROLE_COLORS['その他'];
    m.tasks.filter(t => t.priority !== 'done' && !t.excludeFromSchedule).forEach((t, _) => {
      rows.push({ m, mi, t, color });
    });
  });
  // ソート：作業中→作業前
  rows.sort((a, b) => (STATUS_ORDER[a.t.priority]??1) - (STATUS_ORDER[b.t.priority]??1));

  if (!rows.length) {
    container.innerHTML = `<div style="text-align:center;color:var(--text3);padding:40px;font-size:14px;">作業中・作業前のタスクはありません</div>`;
    return;
  }

  const table = document.createElement('div');
  table.style.cssText = `display:flex;flex-direction:column;gap:0;border:1px solid var(--border);border-radius:var(--r);overflow:hidden;background:var(--bg2);`;

  rows.forEach((row, idx) => {
    const { m, mi, t, color } = row;
    const initials = (m.name||m.role).slice(0,2);
    const statusColor = STATUS_COLOR[t.priority] || '#9ca3af';
    const statusLabel = STATUS_LABEL[t.priority] || '作業前';
    const pc = PHASE_BAR_COLORS[t.phase] || '#6b7280';

    const item = document.createElement('div');
    item.style.cssText = `display:flex;align-items:center;gap:12px;padding:10px 16px;border-bottom:1px solid var(--border);border-left:3px solid ${statusColor};transition:background .15s;cursor:default;${idx%2===0?'':'background:var(--bg3)'}`;
    item.addEventListener('mouseenter', () => item.style.background = 'rgba(91,78,245,.04)');
    item.addEventListener('mouseleave', () => item.style.background = idx%2===0 ? '' : 'var(--bg3)');

    item.innerHTML = `
      <div class="avatar" style="background:${color};width:24px;height:24px;font-size:9px;flex-shrink:0;">${initials}</div>
      <div style="font-size:12px;color:var(--text3);font-family:'DM Mono',monospace;white-space:nowrap;width:80px;overflow:hidden;text-overflow:ellipsis;flex-shrink:0;">${m.name||m.role}</div>
      <div style="flex:1;font-size:13px;color:var(--text);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.name}</div>
      <div style="font-size:10px;font-family:'DM Mono',monospace;padding:2px 8px;border-radius:8px;background:${pc}22;color:${pc};white-space:nowrap;flex-shrink:0;">${t.phase||''}</div>
      <div style="display:flex;align-items:center;gap:4px;flex-shrink:0;">
        <div style="width:6px;height:6px;border-radius:50%;background:${statusColor};"></div>
        <span style="font-size:11px;color:${statusColor};font-family:'DM Mono',monospace;">${statusLabel}</span>
      </div>`;
    table.appendChild(item);
  });

  // 最後のborderを消す
  const last = table.lastElementChild;
  if (last) last.style.borderBottom = 'none';

  container.appendChild(table);
}

function renderMemberDoneView() { renderDebugListView(); }

function renderDebugListView() {
  const d = generatedData;
  const container = document.getElementById('member-done-view');
  if (!d || !container) return;
  container.innerHTML = '';

  // 全タスクをフラットに収集
  const rows = [];
  d.members.forEach((m, mi) => {
    const mColor = ROLE_COLORS[m.role] || ROLE_COLORS['その他'];
    m.tasks.forEach((t, ti) => {
      rows.push({ m, mi, t, ti, mColor });
    });
  });

  if (!rows.length) {
    container.innerHTML = `<div style="text-align:center;color:var(--text3);padding:40px;font-size:14px;">タスクがありません</div>`;
    return;
  }

  const STATUS_STYLES_DL = {
    todo:  { label:'作業前', bg:'rgba(156,163,175,0.14)', color:'#6b7280',   border:'rgba(156,163,175,0.3)' },
    doing: { label:'作業中', bg:'rgba(37,99,235,0.10)',   color:'#2563eb',   border:'rgba(37,99,235,0.25)' },
    done:  { label:'完了',   bg:'rgba(5,150,105,0.10)',   color:'#059669',   border:'rgba(5,150,105,0.25)' },
  };

  const wrap = document.createElement('div');
  wrap.style.cssText = `border:none;border-radius:var(--r);overflow:hidden;background:linear-gradient(145deg,color-mix(in srgb,white 52%,var(--bg) 48%) 0%,color-mix(in srgb,white 18%,var(--bg) 82%) 100%);box-shadow:0 2px 12px rgba(0,0,0,0.06);`;

  // ヘッダー行
  const head = document.createElement('div');
  head.style.cssText = `display:grid;grid-template-columns:32px 1fr 160px 100px 88px 88px 140px 110px;align-items:center;gap:0;padding:0 16px;border-bottom:1px solid rgba(0,0,0,0.06);background:transparent;height:36px;`;
  head.innerHTML = `
    <div></div>
    <div class="dl-head-cell">対応・確認事項</div>
    <div class="dl-head-cell">詳細</div>
    <div class="dl-head-cell">フェーズ</div>
    <div class="dl-head-cell">ステータス</div>
    <div class="dl-head-cell">期限日</div>
    <div class="dl-head-cell">担当者</div>
    <div class="dl-head-cell" style="justify-content:flex-end;"></div>`;
  wrap.appendChild(head);

  rows.forEach(({ m, mi, t, ti, mColor }, idx) => {
    const ss = STATUS_STYLES_DL[t.priority] || STATUS_STYLES_DL.todo;
    const pc = PHASE_BAR_COLORS[t.phase] || '#6b7280';
    const initials = (m.name || m.role).slice(0, 2);
    const commentCount = (t.comments || []).reduce((s, c) => s + 1 + (c.replies?.length||0), 0);
    const subCount = (t.children || []).length;
    const isDone = t.priority === 'done';

    // 期限
    let dlHtml = `<span style="color:var(--text3);font-size:11px;font-family:'DM Mono',monospace;">—</span>`;
    if (t.deadline) {
      const dlDate = new Date(t.deadline);
      const today  = new Date(); today.setHours(0,0,0,0);
      const diff   = Math.ceil((dlDate - today) / 86400000);
      const dlColor = diff < 0 ? '#dc2626' : diff <= 3 ? '#d97706' : 'var(--text3)';
      dlHtml = `<span style="color:${dlColor};font-size:11px;font-family:'DM Mono',monospace;">${t.deadline}</span>`;
    }

    const row = document.createElement('div');
    row.style.cssText = `display:grid;grid-template-columns:32px 1fr 160px 100px 88px 88px 140px 110px;align-items:center;gap:0;padding:0 16px;border-bottom:1px solid rgba(0,0,0,0.05);min-height:44px;cursor:pointer;transition:background .2s;${isDone ? 'opacity:0.5;' : ''}`;
    row.addEventListener('mouseenter', () => row.style.background = 'linear-gradient(145deg,color-mix(in srgb,white 86%,var(--bg) 14%) 0%,color-mix(in srgb,white 52%,var(--bg) 48%) 100%)');
    row.addEventListener('mouseleave', () => row.style.background = '');
    row.addEventListener('click', () => openCommentPanel(mi, [ti]));

    // done トグル
    const checkCell = document.createElement('div');
    checkCell.style.cssText = `display:flex;align-items:center;justify-content:center;`;
    const checkBtn = document.createElement('button');
    checkBtn.style.cssText = `width:18px;height:18px;border-radius:50%;border:1.5px solid ${isDone ? '#059669' : 'var(--border2)'};background:${isDone ? '#059669' : 'transparent'};cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s;flex-shrink:0;`;
    checkBtn.innerHTML = isDone ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5.5l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
    checkBtn.addEventListener('click', e => {
      e.stopPropagation();
      t.priority = isDone ? 'todo' : 'done';
      syncMemberUI(); renderDebugListView();
    });
    checkCell.appendChild(checkBtn);

    // タスク名セル
    const nameCell = document.createElement('div');
    nameCell.style.cssText = `display:flex;align-items:center;gap:6px;padding:8px 0;min-width:0;`;
    nameCell.innerHTML = `
      <span style="font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;${isDone ? 'text-decoration:line-through;color:var(--text3);' : ''}">${t.name}</span>
      ${commentCount > 0 ? `<span style="display:inline-flex;align-items:center;gap:2px;font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);flex-shrink:0;"><svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M2 2h8a1 1 0 011 1v5a1 1 0 01-1 1H7l-2 2v-2H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>${commentCount}</span>` : ''}`;

    // 詳細セル
    const detailCell = document.createElement('div');
    detailCell.style.cssText = `display:flex;align-items:center;gap:5px;padding:0 8px;`;
    if (t.description) {
      detailCell.innerHTML = `<span style="font-size:11px;color:var(--text3);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.description.slice(0,30)}${t.description.length>30?'…':''}</span>`;
    } else if (subCount > 0) {
      detailCell.innerHTML = `<svg width="12" height="12" viewBox="0 0 16 16" fill="none" style="color:var(--text3);flex-shrink:0;"><path d="M4 4h8M4 8h6M4 12h4" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg><span style="font-size:10px;color:var(--text3);font-family:'DM Mono',monospace;">${subCount}件</span>`;
    } else {
      detailCell.innerHTML = `<span style="color:var(--border2);font-size:11px;">—</span>`;
    }

    // フェーズセル
    const phaseCell = document.createElement('div');
    phaseCell.style.cssText = `display:flex;align-items:center;padding:0 8px;`;
    if (t.phase) {
      phaseCell.innerHTML = `<span style="font-size:10px;font-family:'DM Mono',monospace;padding:2px 8px;border-radius:8px;background:${pc}22;color:${pc};white-space:nowrap;">${t.phase}</span>`;
    }

    // ステータスセル
    const statusCell = document.createElement('div');
    statusCell.style.cssText = `display:flex;align-items:center;padding:0 4px;`;
    statusCell.innerHTML = `<span style="font-size:10px;font-family:'DM Mono',monospace;padding:2px 8px;border-radius:8px;background:${ss.bg};color:${ss.color};border:1px solid ${ss.border};white-space:nowrap;">${ss.label}</span>`;

    // 期限セル
    const dlCell = document.createElement('div');
    dlCell.style.cssText = `display:flex;align-items:center;padding:0 4px;`;
    dlCell.innerHTML = dlHtml;

    // 担当者セル
    const assigneeCell = document.createElement('div');
    assigneeCell.style.cssText = `display:flex;align-items:center;gap:6px;padding:0 4px;`;
    assigneeCell.innerHTML = `
      <div class="avatar" style="background:${mColor};width:20px;height:20px;font-size:8px;flex-shrink:0;">${initials}</div>
      <span style="font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name||m.role}</span>`;

    // 詳細ボタン
    const actionCell = document.createElement('div');
    actionCell.style.cssText = `display:flex;align-items:center;justify-content:flex-end;gap:4px;`;
    const openBtn = document.createElement('button');
    openBtn.style.cssText = `display:inline-flex;align-items:center;gap:3px;background:none;border:1px solid var(--border2);border-radius:5px;padding:3px 8px;font-size:10px;font-family:'DM Mono',monospace;color:var(--text3);cursor:pointer;opacity:0;transition:opacity .15s;white-space:nowrap;`;
    openBtn.textContent = '詳細';
    openBtn.addEventListener('click', e => { e.stopPropagation(); openCommentPanel(mi, [ti]); });
    row.addEventListener('mouseenter', () => openBtn.style.opacity = '1');
    row.addEventListener('mouseleave', () => openBtn.style.opacity = '0');
    actionCell.appendChild(openBtn);

    row.appendChild(checkCell);
    row.appendChild(nameCell);
    row.appendChild(detailCell);
    row.appendChild(phaseCell);
    row.appendChild(statusCell);
    row.appendChild(dlCell);
    row.appendChild(assigneeCell);
    row.appendChild(actionCell);
    wrap.appendChild(row);
  });

  // 追加行
  const addRow = document.createElement('div');
  addRow.style.cssText = `display:flex;align-items:center;gap:8px;padding:10px 16px;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:background .15s;border-top:1px solid var(--border);`;
  addRow.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1v10M1 6h10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> アイテムを追加する`;
  addRow.addEventListener('mouseenter', () => addRow.style.background = 'var(--bg3)');
  addRow.addEventListener('mouseleave', () => addRow.style.background = '');
  addRow.addEventListener('click', () => {
    const mi = 0;
    d.members[mi]?.tasks.push({ name:'新しいタスク', phase:'実装', days:3, priority:'todo', description:'', startDate:null, endDate:null, children:[] });
    syncMemberUI(); renderDebugListView();
  });
  wrap.appendChild(addRow);

  container.appendChild(wrap);
}


function renderStatusKanban() {
  const d = generatedData;
  const container = document.getElementById('status-kanban-view');
  if (!d || !container) return;
  container.innerHTML = '';

  const STATUS_DEFS = [
    { key: 'todo',  label: '作業前', color: '#9ca3af', bg: 'rgba(156,163,175,0.08)' },
    { key: 'doing', label: '作業中', color: '#2563eb', bg: 'rgba(37,99,235,0.08)'   },
    { key: 'done',  label: '完了',   color: '#059669', bg: 'rgba(5,150,105,0.08)'   },
  ];

  const wrap = document.createElement('div');
  wrap.style.cssText = `display:flex;gap:16px;align-items:flex-start;`;

  let dragSrc = null; // { mi, ti }

  STATUS_DEFS.forEach(({ key, label, color, bg }) => {
    const tasks = [];
    d.members.forEach((m, mi) => {
      const mColor = ROLE_COLORS[m.role] || ROLE_COLORS['その他'];
      m.tasks.filter(t => t.priority === key && (key === 'done' || !t.excludeFromSchedule)).forEach(t => {
        tasks.push({ m, mi, t, ti: m.tasks.indexOf(t), mColor });
      });
    });

    const col = document.createElement('div');
    col.dataset.status = key;
    col.style.cssText = `flex:1;min-width:0;background:linear-gradient(145deg,color-mix(in srgb,white 52%,var(--bg) 48%) 0%,color-mix(in srgb,white 18%,var(--bg) 82%) 100%);border:none;border-radius:var(--r);overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);transition:box-shadow .15s;`;

    // drag-over: 列の縦エリア全体でアクティブ
    col.addEventListener('dragenter', e => {
      e.preventDefault();
      col.style.background = `linear-gradient(145deg, color-mix(in srgb, ${color} 12%, white 88%) 0%, color-mix(in srgb, ${color} 6%, var(--bg) 94%) 100%)`;
      col.style.boxShadow = `0 0 0 2px ${color}55, 0 2px 12px rgba(0,0,0,0.06)`;
    });
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) {
        col.style.background = `linear-gradient(145deg,color-mix(in srgb,white 52%,var(--bg) 48%) 0%,color-mix(in srgb,white 18%,var(--bg) 82%) 100%)`;
        col.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
      }
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.style.background = `linear-gradient(145deg,color-mix(in srgb,white 52%,var(--bg) 48%) 0%,color-mix(in srgb,white 18%,var(--bg) 82%) 100%)`;
      col.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
      if (!dragSrc) return;
      const { mi, ti } = dragSrc;
      const targetStatus = col.dataset.status;
      const task = generatedData.members[mi]?.tasks[ti];
      if (task && task.priority !== targetStatus) {
        task.priority = targetStatus;
        renderStatusKanban();
        syncMemberUI();
      }
      dragSrc = null;
    });

    const colHead = document.createElement('div');
    colHead.style.cssText = `display:flex;align-items:center;gap:8px;padding:14px 16px;border-bottom:none;background:transparent;`;
    colHead.innerHTML = `
      <div style="width:7px;height:7px;border-radius:50%;background:${color};flex-shrink:0;"></div>
      <span style="font-family:'Syne',sans-serif;font-weight:600;font-size:12px;color:var(--text2);">${label}</span>
      <span id="status-count-${key}" style="margin-left:auto;font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);padding:1px 8px;">${tasks.length}</span>`;
    col.appendChild(colHead);

    const list = document.createElement('div');
    list.style.cssText = `display:flex;flex-direction:column;gap:0;min-height:60px;`;

    if (!tasks.length) {
      const empty = document.createElement('div');
      empty.style.cssText = `padding:28px 16px;text-align:center;color:var(--text3);font-size:12px;font-family:'DM Sans',sans-serif;`;
      empty.textContent = 'タスクはありません';
      list.appendChild(empty);
    } else {
      tasks.forEach(({ m, mi, t, ti, mColor }, idx) => {
        const pc = PHASE_BAR_COLORS[t.phase] || '#6b7280';
        const initials = (m.name || m.role).slice(0, 2);
        const item = document.createElement('div');
        item.draggable = true;
        item.style.cssText = `display:flex;align-items:center;gap:10px;padding:9px 14px;margin:0 10px 6px;border-radius:10px;border:none;background:linear-gradient(145deg,color-mix(in srgb,white 72%,var(--bg) 28%) 0%,color-mix(in srgb,white 38%,var(--bg) 62%) 100%);transition:background .2s,opacity .15s;cursor:grab;`;
        item.addEventListener('mouseenter', () => item.style.background = 'linear-gradient(145deg,color-mix(in srgb,white 86%,var(--bg) 14%) 0%,color-mix(in srgb,white 52%,var(--bg) 48%) 100%)');
        item.addEventListener('mouseleave', () => item.style.background = 'linear-gradient(145deg,color-mix(in srgb,white 72%,var(--bg) 28%) 0%,color-mix(in srgb,white 38%,var(--bg) 62%) 100%)');
        item.addEventListener('dragstart', e => {
          dragSrc = { mi, ti };
          item.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => {
          item.style.opacity = '1';
          dragSrc = null;
          document.querySelectorAll('[data-status]').forEach(c => c.style.boxShadow = '');
        });
        // 期限バッジ
        let dlBadge = '';
        if (t.deadline) {
          const dlDate = new Date(t.deadline);
          const today2  = new Date(); today2.setHours(0,0,0,0);
          const diff2   = Math.ceil((dlDate - today2) / 86400000);
          const dlColor2 = diff2 < 0 ? '#dc2626' : diff2 <= 3 ? '#d97706' : 'var(--text3)';
          dlBadge = `<span style="font-family:'DM Mono',monospace;font-size:9px;color:${dlColor2};white-space:nowrap;flex-shrink:0;">${t.deadline}</span>`;
        }
        item.innerHTML = `
          <div class="avatar" style="background:${mColor};width:22px;height:22px;font-size:8px;flex-shrink:0;">${initials}</div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.name}</div>
            <div style="font-size:10px;color:var(--text3);font-family:'DM Mono',monospace;margin-top:1px;">${m.name || m.role}</div>
          </div>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;">
            <div style="font-size:9px;font-family:'DM Mono',monospace;padding:2px 7px;border-radius:8px;background:${pc}22;color:${pc};white-space:nowrap;">${t.phase||''}</div>
            ${dlBadge}
          </div>`;
        item.addEventListener('click', () => openCommentPanel(mi, [ti]));
        list.appendChild(item);
      });
    }

    col.appendChild(list);
    wrap.appendChild(col);
  });

  container.appendChild(wrap);
}


let openMemberIdx = null;

let _kanbanTaskDrag = null; // { mi, ti } — タスクのメンバー間ドラッグ状態

function renderMemberBoard() {
  const d = generatedData;
  if (!d) return;
  const board = document.getElementById('member-board');
  if (!board) return;
  board.innerHTML = '';

  d.members.forEach((m, mi) => {
    const color    = ROLE_COLORS[m.role] || ROLE_COLORS['その他'];
    const initials = m.name ? m.name.slice(0,2) : m.role.slice(0,1);
    const allTasks = flattenTasks(m.tasks);
    const taskCount = allTasks.length;

    const col = document.createElement('div');
    col.className = 'member-col';

    // ヘッダー
    const header = document.createElement('div');
    header.className = 'member-col-header';
    header.style.cursor = 'grab';
    header.setAttribute('draggable', 'true');
    header.innerHTML = `
      <div class="avatar" style="background:${color};width:32px;height:32px;font-size:12px;flex-shrink:0;">${initials}</div>
      <div class="member-col-info">
        <div class="member-col-name">${m.name || m.role}</div>
        <div class="member-col-role">${m.role}</div>
      </div>`;

    // 削除ボタン
    const memberDelBtn = document.createElement('button');
    memberDelBtn.type = 'button';
    memberDelBtn.textContent = '×';
    memberDelBtn.title = `${m.name || m.role}を削除`;
    memberDelBtn.style.cssText = `background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;padding:2px 4px;margin-left:auto;opacity:0.4;transition:opacity .15s,color .15s;flex-shrink:0;`;
    memberDelBtn.onmouseenter = function(){ this.style.opacity='1'; this.style.color='#dc2626'; };
    memberDelBtn.onmouseleave = function(){ this.style.opacity='0.4'; this.style.color='var(--text3)'; };
    memberDelBtn.onclick = function(e) {
      e.stopPropagation();
      const name = generatedData.members[mi]?.name || generatedData.members[mi]?.role || 'このメンバー';
      showConfirm(`「${name}」とそのタスクをすべて削除しますか？`, '削除する', '#dc2626', () => {
        generatedData.members.splice(mi, 1);
        syncMemberUI();
      });
    };
    header.appendChild(memberDelBtn);

    // ── ドラッグ並び替え ──
    col.setAttribute('data-mi', mi);
    header.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', String(mi));
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => col.classList.add('dragging'), 0);
    });
    header.addEventListener('dragend', () => {
      col.classList.remove('dragging');
      document.querySelectorAll('.member-drop-line').forEach(el => el.remove());
    });
    col.addEventListener('dragover', e => {
      e.preventDefault();
      document.querySelectorAll('.member-drop-line').forEach(el => el.remove());
      const line = document.createElement('div');
      line.className = 'member-drop-line';
      const rect = col.getBoundingClientRect();
      const board = col.parentElement;
      if (e.clientX < rect.left + rect.width / 2) {
        board.insertBefore(line, col);
      } else {
        board.insertBefore(line, col.nextSibling);
      }
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) {
        // ラインはdragoverで管理するためここでは消さない
      }
    });
    col.addEventListener('dragover', e => {
      // タスクドラッグ中は列並び替えDnDをスキップ
      if (_kanbanTaskDrag) { e.preventDefault(); return; }
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      if (_kanbanTaskDrag) return; // タスクdropはtaskListで処理
      const fromMi = parseInt(e.dataTransfer.getData('text/plain'));
      const toMi   = parseInt(col.getAttribute('data-mi'));
      document.querySelectorAll('.member-drop-line').forEach(el => el.remove());
      if (fromMi === toMi || isNaN(fromMi) || isNaN(toMi)) return;
      const rect = col.getBoundingClientRect();
      const insertBefore = e.clientX < rect.left + rect.width / 2;
      const members = generatedData.members;
      const [moved] = members.splice(fromMi, 1);
      const adjustedTo = fromMi < toMi ? toMi - 1 : toMi;
      members.splice(insertBefore ? adjustedTo : adjustedTo + 1, 0, moved);
      renderMemberBoard();
    });

    col.appendChild(header);

    // タスクリスト
    const taskList = document.createElement('div');
    taskList.className = 'task-list';

    // ── タスクのメンバー間ドラッグ受け入れ ──
    taskList.addEventListener('dragover', e => {
      if (!_kanbanTaskDrag || _kanbanTaskDrag.mi === mi) return;
      e.preventDefault();
      e.stopPropagation();
      taskList.style.outline = `2px dashed var(--accent)`;
      taskList.style.outlineOffset = '-2px';
    });
    taskList.addEventListener('dragleave', e => {
      if (!taskList.contains(e.relatedTarget)) {
        taskList.style.outline = '';
        taskList.style.outlineOffset = '';
      }
    });
    taskList.addEventListener('drop', e => {
      e.preventDefault();
      e.stopPropagation();
      taskList.style.outline = '';
      taskList.style.outlineOffset = '';
      if (!_kanbanTaskDrag || _kanbanTaskDrag.mi === mi) return;
      const { mi: fromMi, ti: fromTi } = _kanbanTaskDrag;
      const task = generatedData.members[fromMi].tasks.splice(fromTi, 1)[0];
      delete task.startDate; delete task.endDate;
      generatedData.members[mi].tasks.push(task);
      _kanbanTaskDrag = null;
      syncMemberUI();
    });

    const done   = m.tasks.filter(t => t.priority === 'done');
    const excl   = m.tasks.filter(t => t.priority !== 'done' && t.excludeFromSchedule);
    // 作業中→作業前の順でソート（スケジュールのindexは保持）
    const STATUS_ORDER = { doing: 0, todo: 1 };
    const active = m.tasks
      .filter(t => t.priority !== 'done' && !t.excludeFromSchedule)
      .sort((a, b) => (STATUS_ORDER[a.priority]??1) - (STATUS_ORDER[b.priority]??1));

    if (excl.length > 0) {
      if (m._scopeCollapsed === undefined) m._scopeCollapsed = false;
      const scopeItems = [];
      const scopeLabel = makeSectionLabel('スコープ', false, () => {
        m._scopeCollapsed = !m._scopeCollapsed;
        scopeItems.forEach(el => { el.style.display = m._scopeCollapsed ? 'none' : ''; });
        const chevron = scopeLabel.querySelector('.scope-chevron');
        if (chevron) chevron.style.transform = m._scopeCollapsed ? 'rotate(-90deg)' : 'rotate(0deg)';
      }, m._scopeCollapsed);
      taskList.appendChild(scopeLabel);
      excl.forEach(t => {
        const el = makeMemberTaskItem(mi, m.tasks.indexOf(t), 0, null);
        el.querySelector('.task-item')?.classList.add(`status-${t.priority||'todo'}`);
        if (m._scopeCollapsed) el.style.display = 'none';
        taskList.appendChild(el);
        scopeItems.push(el);
      });
      if (active.length > 0) taskList.appendChild(makeSectionLabel('タスク', true));
    }
    active.forEach(t => {
      const ti = m.tasks.indexOf(t);
      const el = makeMemberTaskItem(mi, ti, 0, null);
      el.querySelector('.task-item')?.classList.add(`status-${t.priority||'todo'}`);
      // メンバー間 & 列内ドラッグ
      el.draggable = true;
      el.style.cursor = 'grab';
      el.addEventListener('dragstart', e => {
        _kanbanTaskDrag = { mi, ti };
        e.dataTransfer.setData('text/x-pf-task', `${mi}-${ti}`);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => { el.style.opacity = '0.35'; }, 0);
      });
      el.addEventListener('dragend', () => {
        el.style.opacity = '';
        _kanbanTaskDrag = null;
        document.querySelectorAll('.task-list').forEach(tl => { tl.style.outline=''; tl.style.outlineOffset=''; });
        document.querySelectorAll('.kanban-drop-line').forEach(l => l.remove());
      });
      // 列内並び替え: ドラッグオーバーで仕切り線を表示
      el.addEventListener('dragover', e => {
        if (!_kanbanTaskDrag || _kanbanTaskDrag.mi !== mi || _kanbanTaskDrag.ti === ti) return;
        e.preventDefault(); e.stopPropagation();
        document.querySelectorAll('.kanban-drop-line').forEach(l => l.remove());
        const rect = el.getBoundingClientRect();
        const isBefore = e.clientY < rect.top + rect.height / 2;
        const line = document.createElement('div');
        line.className = 'kanban-drop-line';
        line.style.cssText = `height:2px;background:var(--accent);border-radius:1px;margin:0 12px;`;
        if (isBefore) el.parentNode.insertBefore(line, el);
        else el.parentNode.insertBefore(line, el.nextSibling);
        el.dataset.dropBefore = isBefore ? '1' : '0';
      });
      el.addEventListener('dragleave', () => {
        document.querySelectorAll('.kanban-drop-line').forEach(l => l.remove());
      });
      el.addEventListener('drop', e => {
        e.preventDefault(); e.stopPropagation();
        document.querySelectorAll('.kanban-drop-line').forEach(l => l.remove());
        if (!_kanbanTaskDrag || _kanbanTaskDrag.mi !== mi || _kanbanTaskDrag.ti === ti) return;
        const { ti: fromTi } = _kanbanTaskDrag;
        const isBefore = el.dataset.dropBefore !== '0';
        const tasks = generatedData.members[mi].tasks;
        const [moved] = tasks.splice(fromTi, 1);
        const newIdx = tasks.indexOf(t);
        tasks.splice(isBefore ? newIdx : newIdx + 1, 0, moved);
        _kanbanTaskDrag = null;
        syncMemberUI();
      });
      taskList.appendChild(el);
    });

    const addBtn = document.createElement('button');
    addBtn.style.cssText = `background:transparent;border:1px dashed var(--border2);border-radius:var(--r2);padding:8px 12px;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;width:calc(100% - 24px);margin:0 12px 12px;transition:all .15s;text-align:center;`;
    addBtn.textContent = '＋ タスクを追加';
    addBtn.addEventListener('mouseenter', () => { addBtn.style.borderColor='var(--accent)'; addBtn.style.color='var(--accent)'; });
    addBtn.addEventListener('mouseleave', () => { addBtn.style.borderColor='var(--border2)'; addBtn.style.color='var(--text3)'; });
    addBtn.addEventListener('click', () => {
      d.members[mi].tasks.push({ name:'新しいタスク', phase:'実装', days:3, priority:'todo', description:'', startDate:null, endDate:null, children:[] });
      syncMemberUI();
    });

    col.appendChild(taskList);
    col.appendChild(addBtn);

    // 完了アコーディオン
    if (done.length > 0) {
      const accordion = document.createElement('div');
      accordion.style.cssText = `border-top:1px solid var(--border);`;
      const accHeader = document.createElement('button');
      accHeader.style.cssText = `width:100%;display:flex;align-items:center;gap:7px;padding:9px 14px;background:transparent;border:none;cursor:pointer;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.8px;color:var(--text3);text-transform:uppercase;`;
      const accBody = document.createElement('div');
      accBody.style.cssText = `padding:0 12px 8px;display:none;flex-direction:column;gap:8px;`;
      done.forEach(t => {
        const el = makeMemberTaskItem(mi, m.tasks.indexOf(t), 0, null);
        el.querySelector('.task-item')?.classList.add('status-done');
        accBody.appendChild(el);
      });
      let open = false;
      const updateHeader = () => {
        const deg = open ? '180' : '0';
        accHeader.innerHTML = `<span style="display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;border-radius:50%;background:#059669;color:#fff;font-size:9px;flex-shrink:0;">✓</span>完了 ${done.length}件<span style="margin-left:auto;font-size:10px;display:inline-block;transform:rotate(${deg}deg);">▾</span>`;
        accBody.style.display = open ? 'flex' : 'none';
      };
      updateHeader();
      accHeader.addEventListener('click', () => { open = !open; updateHeader(); });
      accordion.appendChild(accHeader);
      accordion.appendChild(accBody);
      col.appendChild(accordion);
    }

    board.appendChild(col);
  });
}

function syncMemberUI() {
  renderMemberBoard();
  if (currentMemberTab === 'list') renderMemberListView();
  if (currentMemberTab === 'done') renderDebugListView();
}

function openMemberPanel() {}
function closeMemberPanel() {}
function renderMemberPanelBody() {}

// ─── PROJECT RAIL ───
function toggleProjectRail() {
  const panel = document.getElementById('proj-rail-panel');
  const overlay = document.getElementById('proj-rail-overlay');
  const isOpen = panel.style.left === '54px';
  if (isOpen) {
    closeProjectRail();
  } else {
    renderProjRailList();
    panel.style.left = '54px';
    overlay.style.display = 'block';
    document.getElementById('rail-proj').classList.add('active');
  }
}

function closeProjectRail() {
  const panel = document.getElementById('proj-rail-panel');
  const overlay = document.getElementById('proj-rail-overlay');
  panel.style.left = '-220px';
  overlay.style.display = 'none';
  document.getElementById('rail-proj').classList.remove('active');
}

// ─── PALETTE PICKER ───
const PALETTES = [
  { key: 'lime',   label: 'Lime'   },
  { key: 'warm',   label: 'Warm'   },
  { key: 'snow',   label: 'Snow'   },
  { key: 'forest', label: 'Forest' },
  { key: 'dusk',   label: 'Dusk'   },
  { key: 'violet', label: 'Violet' },
];
const PALETTE_KEY = 'pf_palette';

function setPalette(key) {
  const root = document.documentElement;
  // 'lime' はデフォルト（属性なし）
  if (key === 'lime') {
    root.removeAttribute('data-palette');
  } else {
    root.setAttribute('data-palette', key);
  }
  localStorage.setItem(PALETTE_KEY, key);
  document.querySelectorAll('.pp-item').forEach((btn, i) => {
    btn.classList.toggle('active', PALETTES[i]?.key === key);
  });
  const popup = document.getElementById('palette-picker-popup');
  if (popup) popup.classList.remove('show');
  document.getElementById('rail-palette')?.classList.remove('active');
}

function togglePalettePicker() {
  const popup = document.getElementById('palette-picker-popup');
  const btn   = document.getElementById('rail-palette');
  if (!popup) return;
  const isOpen = popup.classList.contains('show');
  popup.classList.toggle('show', !isOpen);
  btn?.classList.toggle('active', !isOpen);
  if (!isOpen) {
    const cur = localStorage.getItem(PALETTE_KEY) || 'lime';
    document.querySelectorAll('.pp-item').forEach((el, i) => {
      el.classList.toggle('active', PALETTES[i]?.key === cur);
    });
    setTimeout(() => {
      document.addEventListener('click', function closePP(e) {
        if (!popup.contains(e.target) && e.target.id !== 'rail-palette') {
          popup.classList.remove('show');
          btn?.classList.remove('active');
        }
        document.removeEventListener('click', closePP);
      });
    }, 0);
  }
}

function initPalette() {
  const saved = localStorage.getItem(PALETTE_KEY) || 'lime';
  if (saved !== 'lime') document.documentElement.setAttribute('data-palette', saved);
}

function renderProjRailList() {
  const list = document.getElementById('proj-rail-list');
  if (!list) return;
  const snaps = getSnapshots();
  list.innerHTML = '';

  if (!snaps.length) {
    const empty = document.createElement('div');
    empty.style.cssText = `font-size:11px;color:var(--text3);text-align:center;padding:24px 8px;font-family:'DM Sans',sans-serif;`;
    empty.textContent = '保存済みプロジェクトはありません';
    list.appendChild(empty);
    return;
  }

  // 案件名ごとに最新スナップを1件ずつ表示
  const seen = new Set();
  snaps.forEach(snap => {
    const name = snap.data?.projectName || '無題';
    if (seen.has(name)) return;
    seen.add(name);

    const isCurrent = generatedData && generatedData.projectName === name;
    const ts = new Date(snap.savedAt);
    const tsStr = `${ts.getMonth()+1}/${ts.getDate()} ${String(ts.getHours()).padStart(2,'0')}:${String(ts.getMinutes()).padStart(2,'0')}`;

    const item = document.createElement('div');
    item.style.cssText = `display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:7px;cursor:pointer;transition:background .15s;${isCurrent ? 'background:var(--accent-glow);' : ''}`;
    item.addEventListener('mouseenter', () => { if (!isCurrent) item.style.background = 'var(--bg3)'; });
    item.addEventListener('mouseleave', () => { if (!isCurrent) item.style.background = 'transparent'; });
    item.addEventListener('click', () => {
      confirmLeave(() => {
        loadSnapshot(snap.id);
        closeProjectRail();
      });
    });

    item.innerHTML = `
      <div style="width:6px;height:6px;border-radius:50%;background:${isCurrent ? 'var(--accent)' : 'var(--border2)'};flex-shrink:0;margin-top:1px;"></div>
      <div style="flex:1;min-width:0;">
        <div style="font-size:12px;font-weight:${isCurrent ? '600' : '400'};color:${isCurrent ? 'var(--accent)' : 'var(--text)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'DM Sans',sans-serif;">${name}</div>
        <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);margin-top:1px;">${tsStr}</div>
      </div>`;

    list.appendChild(item);
  });
}





function flattenTasks(tasks) {
  const result = [];
  (tasks || []).forEach(t => {
    result.push(t);
    if (t.children && t.children.length) result.push(...flattenTasks(t.children));
  });
  return result;
}

function makeSectionLabel(text, isTop = false, onToggle = null, collapsed = false) {
  const el = document.createElement('div');
  el.style.cssText = `font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);padding:${isTop?'8':'4'}px 2px 2px;display:flex;align-items:center;gap:6px;${onToggle ? 'cursor:pointer;user-select:none;' : ''}`;
  const chevronHtml = onToggle ? `<span class="scope-chevron" style="display:inline-block;transition:transform .2s;transform:rotate(${collapsed?'-90':'0'}deg);flex-shrink:0;">▾</span>` : '';
  el.innerHTML = `${chevronHtml}<span>${text}</span><span style="flex:1;height:1px;background:var(--border);display:inline-block;"></span>`;
  if (onToggle) el.addEventListener('click', onToggle);
  return el;
}

function getTaskByPath(mi, path) {
  let t = generatedData.members[mi].tasks[path[0]];
  for (let i = 1; i < path.length; i++) t = t.children[path[i]];
  return t;
}

function removeTaskByPath(mi, path) {
  if (path.length === 1) {
    generatedData.members[mi].tasks.splice(path[0], 1);
  } else {
    const parent = getTaskByPath(mi, path.slice(0, -1));
    parent.children.splice(path[path.length - 1], 1);
  }
  generatedData.members[mi].tasks.forEach(t => flattenTasks([t]).forEach(tk => { delete tk.startDate; delete tk.endDate; }));
}

// depth: 0=親 / 1=子 / 2=孫、 path: タスクインデックスの配列
function makeMemberTaskItem(mi, ti, depth, parentPath) {
  const d = generatedData;
  const path = parentPath ? [...parentPath, ti] : [ti];
  const taskRef = getTaskByPath(mi, path);
  if (!taskRef) return document.createTextNode('');

  const pc = PHASE_COLORS[taskRef.phase] || PHASE_COLORS['その他'];
  const excluded = !!taskRef.excludeFromSchedule;

  const STATUS_STYLES = {
    todo:  { bg:'rgba(156,163,175,0.12)', border:'rgba(156,163,175,0.4)', text:'#6b7280', label:'作業前' },
    doing: { bg:'rgba(37,99,235,0.10)',   border:'rgba(37,99,235,0.35)', text:'#2563eb', label:'作業中' },
    done:  { bg:'rgba(5,150,105,0.10)',   border:'rgba(5,150,105,0.35)', text:'#059669', label:'完了'   },
  };
  const ss = STATUS_STYLES[taskRef.priority] || STATUS_STYLES.todo;

  const item = document.createElement('div');
  item.style.cssText = `position:relative;`;

  // スケジュール外タスクはコンパクト表示
  if (excluded) {
    const compactCard = document.createElement('div');
    compactCard.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 28px 5px 12px;border:1px solid var(--border);border-radius:6px;background:var(--bg3);position:relative;`;

    const nameText = document.createElement('span');
    nameText.contentEditable = 'true';
    nameText.style.cssText = `font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;outline:none;cursor:text;`;
    nameText.textContent = taskRef.name;
    nameText.addEventListener('input', () => { getTaskByPath(mi,path).name = nameText.textContent.trim() || taskRef.name; });
    nameText.addEventListener('click', e => e.stopPropagation());

    // スケジュール復帰ボタン
    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.title = 'スケジュールに戻す';
    restoreBtn.style.cssText = `position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:1px 3px;opacity:0;transition:opacity .15s;`;
    restoreBtn.textContent = '↩';
    compactCard.addEventListener('mouseenter', () => { restoreBtn.style.opacity='1'; });
    compactCard.addEventListener('mouseleave', () => { restoreBtn.style.opacity='0'; });
    restoreBtn.addEventListener('click', e => {
      e.stopPropagation();
      getTaskByPath(mi, path).excludeFromSchedule = false;
      syncMemberUI();
    });

    compactCard.appendChild(nameText);
    compactCard.appendChild(restoreBtn);
    item.appendChild(compactCard);
    return item;
  }

  const indentPx = depth * 14;
  // 子タスク（depth>0）はコンパクトインデント表示
  if (depth > 0) {
    const compactChild = document.createElement('div');
    compactChild.style.cssText = `display:flex;align-items:center;gap:6px;padding:4px 24px 4px ${10+indentPx}px;border-left:2px solid ${pc.text}44;background:var(--bg3);position:relative;border-radius:0 4px 4px 0;margin-left:${indentPx}px;`;
    const childName = document.createElement('span');
    childName.contentEditable = 'true';
    childName.style.cssText = `font-size:11px;color:var(--text2);flex:1;outline:none;white-space:nowrap;overflow:hidden;cursor:text;`;
    childName.textContent = taskRef.name;
    childName.addEventListener('input', () => { getTaskByPath(mi,path).name = childName.textContent.trim() || taskRef.name; });
    const childDel = document.createElement('button');
    childDel.type='button'; childDel.textContent='×';
    childDel.style.cssText=`position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;opacity:0;`;
    compactChild.addEventListener('mouseenter',()=>childDel.style.opacity='1');
    compactChild.addEventListener('mouseleave',()=>childDel.style.opacity='0');
    childDel.onclick=e=>{ e.stopPropagation(); removeTaskByPath(mi,path); syncMemberUI(); };
    compactChild.appendChild(childName); compactChild.appendChild(childDel);
    item.appendChild(compactChild);
    // 孫タスクも再帰
    if (taskRef.children && taskRef.children.length) {
      taskRef.children.forEach((_,ci) => item.appendChild(makeMemberTaskItem(mi,ci,depth+1,path)));
    }
    return item;
  }

  const card = document.createElement('div');
  card.className = 'task-item';
  card.style.cssText = `padding:10px 32px 10px 14px;`;

  // タスク名
  const nameEl = document.createElement('div');
  nameEl.className = 'task-name';
  nameEl.style.cssText = `cursor:text;font-size:${depth>0?'12':'13'}px;`;
  nameEl.textContent = taskRef.name;
  nameEl.addEventListener('click', e => {
    e.stopPropagation();
    const input = document.createElement('input');
    input.type='text'; input.value=taskRef.name;
    input.style.cssText=`width:100%;background:var(--bg2);border:1px solid var(--accent);border-radius:4px;padding:3px 7px;font-size:13px;color:var(--text);font-family:'DM Sans',sans-serif;outline:none;`;
    nameEl.replaceWith(input); input.focus(); input.select();
    const commit = () => { const v=input.value.trim()||taskRef.name; getTaskByPath(mi,path).name=v; nameEl.textContent=v; input.replaceWith(nameEl); };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e2 => { if(e2.key==='Enter'){e2.preventDefault();input.blur();} if(e2.key==='Escape'){input.value=taskRef.name;input.blur();} });
  });

  // フェーズバッジ
  const badge = document.createElement('div');
  badge.className = 'phase-badge';
  badge.style.cssText = `background:${pc.bg};border:1px solid ${pc.border};color:${pc.text};cursor:pointer;`;
  badge.textContent = taskRef.phase;
  badge.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.phase-popup').forEach(p=>p.remove());
    const popup = document.createElement('div');
    popup.className = 'phase-popup';
    popup.style.cssText = `position:fixed;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:8px;z-index:500;box-shadow:0 8px 32px rgba(0,0,0,.15);display:flex;flex-direction:column;gap:4px;min-width:120px;`;
    const rect = badge.getBoundingClientRect();
    popup.style.left = Math.min(rect.left, window.innerWidth-140)+'px';
    popup.style.top  = Math.min(rect.bottom+4, window.innerHeight-240)+'px';
    Object.entries(PHASE_COLORS).forEach(([phase, colors]) => {
      const opt = document.createElement('button');
      opt.style.cssText = `display:flex;align-items:center;gap:7px;padding:6px 10px;border:none;background:${phase===taskRef.phase?colors.bg:'transparent'};border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--text);width:100%;`;
      opt.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${colors.text};flex-shrink:0;display:inline-block;"></span>${phase}`;
      opt.addEventListener('mouseenter',()=>opt.style.background=colors.bg);
      opt.addEventListener('mouseleave',()=>opt.style.background=phase===taskRef.phase?colors.bg:'transparent');
      opt.addEventListener('click', ev => { ev.stopPropagation(); getTaskByPath(mi,path).phase=phase; popup.remove(); syncMemberUI(); });
      popup.appendChild(opt);
    });
    document.body.appendChild(popup); popup.addEventListener('click',e=>e.stopPropagation());
    setTimeout(()=>document.addEventListener('click',()=>popup.remove(),{once:true}),0);
  });

  const top = document.createElement('div');
  top.className = 'task-item-top';

  // 締め切りバッジ（カード右上・アイコンのみ）
  if (taskRef.deadline) {
    const dlBadge = document.createElement('div');
    const dlDate = new Date(taskRef.deadline);
    const today  = new Date(); today.setHours(0,0,0,0);
    const diff   = Math.ceil((dlDate - today) / 86400000);
    const isOver = diff < 0;
    const isSoon = diff >= 0 && diff <= 3;
    const color  = isOver ? '#dc2626' : isSoon ? '#d97706' : 'var(--text3)';
    const bg     = isOver ? 'rgba(220,38,38,0.12)' : isSoon ? 'rgba(217,119,6,0.12)' : 'rgba(156,163,175,0.10)';
    const border = isOver ? 'rgba(220,38,38,0.28)' : isSoon ? 'rgba(217,119,6,0.28)' : 'var(--border)';
    const tip    = isOver ? `${Math.abs(diff)}日超過 (${taskRef.deadline})` : diff === 0 ? `今日 (${taskRef.deadline})` : `${diff}日後 (${taskRef.deadline})`;
    dlBadge.title = tip;
    dlBadge.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:5px;flex-shrink:0;background:${bg};color:${color};border:1px solid ${border};cursor:default;`;
    dlBadge.innerHTML = `<svg width="12" height="12" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3 1v2M7 1v2M1 4.5h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
    top.appendChild(dlBadge);
  }

  top.appendChild(nameEl);
  // メタ行
  const meta = document.createElement('div');
  meta.className = 'task-meta';

  // ステータスボタン
  const statusBtn = document.createElement('div');
  statusBtn.style.cssText = `display:inline-flex;align-items:center;gap:4px;background:${ss.bg};border:1px solid ${ss.border};border-radius:10px;padding:2px 9px;font-family:'DM Mono',monospace;font-size:9px;color:${ss.text};cursor:pointer;white-space:nowrap;`;
  statusBtn.innerHTML = `<span style="width:5px;height:5px;border-radius:50%;background:${ss.text};flex-shrink:0;display:inline-block;"></span>${ss.label}`;
  statusBtn.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.status-popup').forEach(p=>p.remove());
    const popup = document.createElement('div');
    popup.className = 'status-popup';
    popup.style.cssText = `position:fixed;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:6px;z-index:500;box-shadow:0 8px 32px rgba(0,0,0,.15);display:flex;flex-direction:column;gap:3px;min-width:110px;`;
    const rect = statusBtn.getBoundingClientRect();
    popup.style.left = Math.min(rect.left, window.innerWidth-130)+'px';
    popup.style.top  = Math.min(rect.bottom+4, window.innerHeight-140)+'px';
    Object.entries(STATUS_STYLES).forEach(([key,style]) => {
      const opt = document.createElement('button');
      opt.style.cssText = `display:flex;align-items:center;gap:7px;padding:6px 10px;border:none;background:${key===taskRef.priority?style.bg:'transparent'};border-radius:6px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--text);width:100%;`;
      opt.innerHTML = `<span style="width:8px;height:8px;border-radius:50%;background:${style.text};flex-shrink:0;display:inline-block;"></span>${style.label}`;
      opt.addEventListener('mouseenter',()=>opt.style.background=style.bg);
      opt.addEventListener('mouseleave',()=>opt.style.background=key===taskRef.priority?style.bg:'transparent');
      opt.addEventListener('click', ev => { ev.stopPropagation(); getTaskByPath(mi,path).priority=key; popup.remove(); syncMemberUI(); });
      popup.appendChild(opt);
    });
    document.body.appendChild(popup); popup.addEventListener('click',e=>e.stopPropagation());
    setTimeout(()=>document.addEventListener('click',()=>popup.remove(),{once:true}),0);
  });


  // サブタスク追加（深さ2まで）
  meta.appendChild(statusBtn);
  // フェーズをステータス横に表示
  meta.appendChild(badge);
  // 締め切り設定ボタン
  const dlBtn = document.createElement('button');
  dlBtn.type = 'button';
  dlBtn.title = '締め切りを設定';
  if (taskRef.deadline) {
    const _dlDate = new Date(taskRef.deadline);
    const _today  = new Date(); _today.setHours(0,0,0,0);
    const _diff   = Math.ceil((_dlDate - _today) / 86400000);
    const _isOver = _diff < 0;
    const _isSoon = _diff >= 0 && _diff <= 3;
    const _dlColor = _isOver ? '#dc2626' : _isSoon ? '#d97706' : 'var(--text3)';
    dlBtn.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:transparent;border:1px dashed var(--border2);border-radius:6px;cursor:pointer;color:${_dlColor};transition:all .15s;flex-shrink:0;`;
    dlBtn.title = `締め切り: ${taskRef.deadline}`;
  } else {
    dlBtn.style.cssText = `display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;background:transparent;border:1px dashed var(--border2);border-radius:6px;cursor:pointer;color:var(--text3);transition:all .15s;flex-shrink:0;`;
    dlBtn.title = '締め切りを設定';
  }
  dlBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3 1v2M7 1v2M1 4.5h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>`;
  dlBtn.addEventListener('click', e => {
    e.stopPropagation();
    document.querySelectorAll('.dl-picker-wrap').forEach(el=>el.remove());
    const wrap = document.createElement('div');
    wrap.className = 'dl-picker-wrap';
    wrap.style.cssText = `position:fixed;z-index:600;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);display:flex;align-items:center;gap:8px;`;
    const rect = dlBtn.getBoundingClientRect();
    wrap.style.left = Math.min(rect.left, window.innerWidth-220)+'px';
    wrap.style.top  = (rect.bottom+6)+'px';

    const inp = document.createElement('input');
    inp.type = 'date';
    inp.value = taskRef.deadline || '';
    inp.style.cssText = `background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none;cursor:pointer;`;

    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'クリア';
    clearBtn.style.cssText = `background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:4px 8px;border-radius:4px;white-space:nowrap;`;
    clearBtn.onmouseenter = () => clearBtn.style.color='#dc2626';
    clearBtn.onmouseleave = () => clearBtn.style.color='var(--text3)';
    clearBtn.onclick = e2 => {
      e2.stopPropagation();
      getTaskByPath(mi, path).deadline = '';
      wrap.remove();
      syncMemberUI();
    };

    inp.addEventListener('change', () => {
      getTaskByPath(mi, path).deadline = inp.value;
      wrap.remove();
      syncMemberUI();
    });
    inp.addEventListener('click', e2 => e2.stopPropagation());

    wrap.appendChild(inp);
    wrap.appendChild(clearBtn);
    wrap.addEventListener('click', e2 => e2.stopPropagation());
    document.body.appendChild(wrap);

    // 少し待ってからpickerを開く
    setTimeout(() => inp.click(), 50);
    setTimeout(() => document.addEventListener('click', () => wrap.remove(), {once:true}), 100);
  });

  // コメント数バッジ（コメントがある時のみ表示）
  const commentCount = (taskRef.comments || []).reduce((s, c) => s + 1 + (c.replies?.length || 0), 0);
  if (commentCount > 0) {
    const cntBadge = document.createElement('span');
    cntBadge.style.cssText = `display:inline-flex;align-items:center;gap:3px;margin-left:auto;font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);flex-shrink:0;`;
    cntBadge.innerHTML = `<svg width="10" height="10" viewBox="0 0 12 12" fill="none"><path d="M2 2h8a1 1 0 011 1v5a1 1 0 01-1 1H7l-2 2v-2H2a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>${commentCount}`;
    meta.appendChild(cntBadge);
  }

  // 削除ボタン
  const delBtn = document.createElement('button');
  delBtn.textContent = '×';
  delBtn.style.cssText = `position:absolute;top:8px;right:8px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;line-height:1;padding:2px 4px;border-radius:3px;transition:color .15s;opacity:0;`;
  delBtn.addEventListener('mouseenter',()=>delBtn.style.color='#dc2626');
  delBtn.addEventListener('mouseleave',()=>delBtn.style.color='var(--text3)');
  delBtn.addEventListener('click', e => { e.stopPropagation(); removeTaskByPath(mi, path); syncMemberUI(); });
  card.addEventListener('mouseenter',()=>delBtn.style.opacity='1');
  card.addEventListener('mouseleave',()=>delBtn.style.opacity='0');

  // カード全体クリックでパネルを開く
  card.style.cursor = 'pointer';
  card.addEventListener('click', e => {
    if (e.defaultPrevented) return;
    openCommentPanel(mi, path);
  });

  card.appendChild(top);
  card.appendChild(meta);
  card.appendChild(delBtn);
  item.appendChild(card);

  // 子タスクを再帰描画
  if (taskRef.children && taskRef.children.length > 0) {
    const childWrap = document.createElement('div');
    childWrap.style.cssText = `display:flex;flex-direction:column;gap:5px;margin-top:5px;`;
    taskRef.children.forEach((_, ci) => {
      childWrap.appendChild(makeMemberTaskItem(mi, ci, depth+1, path));
    });
    item.appendChild(childWrap);
  }

  return item;
}

// ─── COMMENT PANEL ───
let _commentTarget = null; // { mi, path, replyTo: commentId | null }

function openCommentPanel(mi, path) {
  _commentTarget = { mi, path, replyTo: null };
  const task = getTaskByPath(mi, path);
  const m = generatedData.members[mi];
  document.getElementById('comment-panel-title').textContent = task.name;
  document.getElementById('comment-panel-meta').textContent = (m.name || m.role) + '  ·  ' + (task.phase || '');
  renderTaskDetailSection(mi, path);
  renderCommentList();
  document.getElementById('comment-panel').classList.add('open');
  document.getElementById('comment-overlay').classList.add('show');
}

function renderTaskDetailSection(mi, path) {
  const sec = document.getElementById('task-detail-section');
  sec.innerHTML = '';
  const task = getTaskByPath(mi, path);
  const d = generatedData;
  const excluded = !!task.excludeFromSchedule;

  // ── タスク名 ──
  const nameBlock = document.createElement('div');
  nameBlock.className = 'td-block';
  nameBlock.innerHTML = `<div class="td-label">タスク名</div>`;
  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = task.name || '';
  nameInput.placeholder = 'タスク名を入力';
  nameInput.style.cssText = `width:100%;background:transparent;border:none;border-bottom:1px solid var(--border2);outline:none;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;color:var(--text);padding:4px 0;transition:border-color .15s;box-sizing:border-box;`;
  nameInput.addEventListener('focus', () => nameInput.style.borderColor='var(--accent)');
  nameInput.addEventListener('blur',  () => nameInput.style.borderColor='var(--border2)');
  nameInput.addEventListener('input', () => {
    getTaskByPath(mi, path).name = nameInput.value;
    syncMemberUI();
  });
  nameBlock.appendChild(nameInput);
  sec.appendChild(nameBlock);

  // ── 担当者変更 ──
  const assigneeBlock = document.createElement('div');
  assigneeBlock.className = 'td-block';
  assigneeBlock.innerHTML = `<div class="td-label">担当者</div>`;
  const assigneeRow = document.createElement('div');
  assigneeRow.style.cssText = `display:flex;flex-wrap:wrap;gap:6px;`;
  d.members.forEach((m, idx) => {
    const mColor = ROLE_COLORS[m.role] || ROLE_COLORS['その他'];
    const initials = m.name ? m.name.slice(0, 2) : m.role.slice(0, 1);
    const isActive = idx === mi;
    const chip = document.createElement('button');
    chip.style.cssText = `display:inline-flex;align-items:center;gap:6px;padding:3px 10px 3px 4px;border:1.5px solid ${isActive ? mColor : 'var(--border2)'};border-radius:20px;background:${isActive ? mColor + '18' : 'transparent'};cursor:pointer;transition:all .15s;`;
    chip.innerHTML = `<div class="avatar" style="width:18px;height:18px;font-size:7px;background:${mColor};flex-shrink:0;">${initials}</div><span style="font-size:11px;font-family:'DM Sans',sans-serif;color:${isActive ? 'var(--text)' : 'var(--text3)'};">${m.name || m.role}</span>`;
    chip.addEventListener('click', () => {
      if (idx === mi) return; // 同じメンバーはスキップ
      // タスクを移動
      const [moved] = d.members[mi].tasks.splice(path[0], 1);
      delete moved.startDate; delete moved.endDate;
      const newTi = d.members[idx].tasks.push(moved) - 1;
      syncMemberUI();
      // パネルを新しいメンバー・インデックスで開き直す
      openCommentPanel(idx, [newTi]);
    });
    assigneeRow.appendChild(chip);
  });
  assigneeBlock.appendChild(assigneeRow);
  sec.appendChild(assigneeBlock);

  // ── スコープ ──
  const scopeBlock = document.createElement('div');
  scopeBlock.className = 'td-block';
  scopeBlock.innerHTML = `<div class="td-label">スコープ</div>`;
  const scopeBtn = document.createElement('button');
  scopeBtn.className = 'td-scope-btn' + (excluded ? ' active' : '');
  scopeBtn.innerHTML = excluded
    ? `<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5h6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>スコープから除外中`
    : `<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><rect x="1" y="3" width="8" height="6" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3 1v3M7 1v3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>スコープに追加`;
  scopeBtn.addEventListener('click', () => {
    const t = getTaskByPath(mi, path);
    t.excludeFromSchedule = !t.excludeFromSchedule;
    flattenTasks(d.members[mi].tasks).forEach(tk => { if(!tk.excludeFromSchedule){delete tk.startDate;delete tk.endDate;} });
    syncMemberUI();
    renderTaskDetailSection(mi, path);
  });
  scopeBlock.appendChild(scopeBtn);
  sec.appendChild(scopeBlock);

  // ── 期限 ──
  const dlBlock = document.createElement('div');
  dlBlock.className = 'td-block';
  dlBlock.innerHTML = `<div class="td-label">期限</div>`;
  const dlBtn = document.createElement('button');
  dlBtn.className = 'td-dl-btn';
  const today = new Date(); today.setHours(0,0,0,0);
  if (task.deadline) {
    const dlDate = new Date(task.deadline);
    const diff = Math.ceil((dlDate - today) / 86400000);
    const color = diff < 0 ? '#dc2626' : diff <= 3 ? '#d97706' : 'var(--text2)';
    const label = diff < 0 ? `${Math.abs(diff)}日超過` : diff === 0 ? '今日' : `${diff}日後`;
    dlBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3 1v2M7 1v2M1 4.5h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg><span style="color:${color}">${task.deadline}（${label}）</span><span style="font-size:9px;color:var(--text3);margin-left:4px;">変更</span>`;
  } else {
    dlBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 10 10" fill="none"><rect x="1" y="2" width="8" height="7" rx="1" stroke="currentColor" stroke-width="1.2"/><path d="M3 1v2M7 1v2M1 4.5h8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>期限を設定`;
  }
  dlBtn.addEventListener('click', () => {
    document.querySelectorAll('.dl-picker-wrap').forEach(el=>el.remove());
    const wrap = document.createElement('div');
    wrap.className = 'dl-picker-wrap';
    wrap.style.cssText = `position:fixed;z-index:600;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.15);display:flex;align-items:center;gap:8px;`;
    const rect = dlBtn.getBoundingClientRect();
    wrap.style.left = Math.min(rect.left, window.innerWidth-220)+'px';
    wrap.style.top  = (rect.bottom+6)+'px';
    const inp = document.createElement('input');
    inp.type = 'date'; inp.value = task.deadline || '';
    inp.style.cssText = `background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:6px 10px;color:var(--text);font-family:'DM Mono',monospace;font-size:12px;outline:none;cursor:pointer;`;
    const clearBtn = document.createElement('button');
    clearBtn.textContent = 'クリア';
    clearBtn.style.cssText = `background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:4px 8px;border-radius:4px;white-space:nowrap;`;
    clearBtn.onmouseover = () => clearBtn.style.color='#dc2626';
    clearBtn.onmouseout  = () => clearBtn.style.color='var(--text3)';
    clearBtn.onclick = e => { e.stopPropagation(); getTaskByPath(mi,path).deadline=''; wrap.remove(); syncMemberUI(); renderTaskDetailSection(mi,path); };
    inp.addEventListener('change', () => { getTaskByPath(mi,path).deadline=inp.value; wrap.remove(); syncMemberUI(); renderTaskDetailSection(mi,path); });
    inp.addEventListener('click', e => e.stopPropagation());
    wrap.appendChild(inp); wrap.appendChild(clearBtn);
    wrap.addEventListener('click', e => e.stopPropagation());
    document.body.appendChild(wrap);
    setTimeout(() => inp.click(), 50);
    setTimeout(() => document.addEventListener('click', () => wrap.remove(), {once:true}), 100);
  });
  dlBlock.appendChild(dlBtn);
  sec.appendChild(dlBlock);

  // ── サブタスク ──
  const subBlock = document.createElement('div');
  subBlock.className = 'td-block';
  subBlock.innerHTML = `<div class="td-label">サブタスク</div>`;
  const subList = document.createElement('div');
  subList.className = 'td-subtask-list';
  const children = task.children || [];
  children.forEach((child, ci) => {
    const row = document.createElement('div');
    row.className = 'td-subtask-row';
    const check = document.createElement('button');
    check.className = 'td-subtask-check' + (child.priority === 'done' ? ' done' : '');
    check.innerHTML = child.priority === 'done' ? `<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M2 5.5l2.5 2.5 3.5-4" stroke="white" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>` : '';
    check.addEventListener('click', e => {
      e.stopPropagation();
      const t = getTaskByPath(mi, path);
      t.children[ci].priority = t.children[ci].priority === 'done' ? 'todo' : 'done';
      syncMemberUI(); renderTaskDetailSection(mi, path);
    });
    const nameInp = document.createElement('input');
    nameInp.type = 'text'; nameInp.value = child.name;
    nameInp.className = 'td-subtask-name';
    nameInp.style.textDecoration = child.priority === 'done' ? 'line-through' : 'none';
    nameInp.style.color = child.priority === 'done' ? 'var(--text3)' : 'var(--text2)';
    nameInp.addEventListener('change', () => { getTaskByPath(mi,path).children[ci].name = nameInp.value || child.name; syncMemberUI(); });
    nameInp.addEventListener('click', e => e.stopPropagation());
    const delSub = document.createElement('button');
    delSub.style.cssText = `background:none;border:none;color:var(--text3);cursor:pointer;font-size:13px;padding:1px 3px;opacity:0;transition:opacity .15s;flex-shrink:0;`;
    delSub.textContent = '×';
    delSub.addEventListener('mouseenter', () => delSub.style.color='#dc2626');
    delSub.addEventListener('mouseleave', () => delSub.style.color='var(--text3)');
    delSub.addEventListener('click', e => { e.stopPropagation(); getTaskByPath(mi,path).children.splice(ci,1); syncMemberUI(); renderTaskDetailSection(mi,path); });
    row.addEventListener('mouseenter', () => delSub.style.opacity='1');
    row.addEventListener('mouseleave', () => delSub.style.opacity='0');
    row.appendChild(check); row.appendChild(nameInp); row.appendChild(delSub);
    subList.appendChild(row);
  });
  const addSubBtn = document.createElement('button');
  addSubBtn.className = 'td-add-sub-btn';
  addSubBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg> サブタスクを追加`;
  addSubBtn.addEventListener('click', e => {
    e.stopPropagation();
    const t = getTaskByPath(mi, path);
    if (!t.children) t.children = [];
    t.children.push({ name:'サブタスク', phase:t.phase, days:1, priority:'todo', description:'', children:[] });
    syncMemberUI(); renderTaskDetailSection(mi, path);
  });
  subBlock.appendChild(subList);
  subBlock.appendChild(addSubBtn);
  sec.appendChild(subBlock);

  // ── 概要メモ ──
  const memoBlock = document.createElement('div');
  memoBlock.className = 'td-block';
  memoBlock.style.paddingBottom = '14px';
  memoBlock.innerHTML = `<div class="td-label">概要メモ</div>`;
  const memo = document.createElement('textarea');
  memo.className = 'td-memo';
  memo.placeholder = 'タスクの概要・備考を入力…';
  memo.value = task.description || '';
  memo.addEventListener('input', () => { getTaskByPath(mi,path).description = memo.value; });
  memo.addEventListener('click', e => e.stopPropagation());
  memoBlock.appendChild(memo);
  sec.appendChild(memoBlock);
}

function closeCommentPanel() {
  document.getElementById('comment-panel').classList.remove('open');
  document.getElementById('comment-overlay').classList.remove('show');
  _commentTarget = null;
}

function renderCommentList() {
  if (!_commentTarget) return;
  const task = getTaskByPath(_commentTarget.mi, _commentTarget.path);
  const comments = task.comments || [];
  const list = document.getElementById('comment-list');
  list.innerHTML = '';

  if (!comments.length) {
    list.innerHTML = `<div style="text-align:center;color:var(--text3);font-size:12px;font-family:'DM Sans',sans-serif;padding:32px 0;">まだコメントはありません</div>`;
    return;
  }

  comments.forEach(c => {
    const thread = document.createElement('div');
    thread.className = 'comment-thread';
    thread.appendChild(makeCommentBubble(c, false));

    if (c.replies && c.replies.length) {
      const repliesWrap = document.createElement('div');
      repliesWrap.className = 'comment-replies';
      c.replies.forEach(r => repliesWrap.appendChild(makeCommentBubble(r, true)));
      thread.appendChild(repliesWrap);
    }
    list.appendChild(thread);
  });

  list.scrollTop = list.scrollHeight;
}

function makeCommentBubble(c, isReply) {
  const wrap = document.createElement('div');
  wrap.className = `comment-bubble${isReply ? ' comment-reply-bubble' : ''}`;

  const av = document.createElement('div');
  av.className = 'avatar';
  av.style.cssText = `width:28px;height:28px;font-size:10px;flex-shrink:0;background:var(--accent);`;
  av.textContent = (c.author || 'Me').slice(0, 2);

  const body = document.createElement('div');
  body.className = 'comment-bubble-body';

  const d = new Date(c.at);
  const timeStr = `${d.getMonth()+1}/${d.getDate()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  body.innerHTML = `
    <div class="comment-bubble-header">
      <span class="comment-author">${c.author || 'Me'}</span>
      <span class="comment-time">${timeStr}</span>
    </div>
    <div class="comment-text">${c.text.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`;

  if (!isReply) {
    const replyBtn = document.createElement('button');
    replyBtn.className = 'comment-reply-btn';
    replyBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 3h6a2 2 0 010 4H4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><path d="M3 5L1 3l2-2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>返信`;
    replyBtn.addEventListener('click', () => {
      _commentTarget.replyTo = c.id;
      const ta = document.getElementById('comment-textarea');
      ta.placeholder = `「${c.text.slice(0,20)}…」に返信`;
      ta.focus();
    });
    body.appendChild(replyBtn);
  }

  wrap.appendChild(av);
  wrap.appendChild(body);
  return wrap;
}

function submitComment() {
  if (!_commentTarget) return;
  const ta = document.getElementById('comment-textarea');
  const text = ta.value.trim();
  if (!text) return;

  const task = getTaskByPath(_commentTarget.mi, _commentTarget.path);
  if (!task.comments) task.comments = [];

  const entry = {
    id: Date.now(),
    author: 'Me',
    text,
    at: new Date().toISOString(),
  };

  if (_commentTarget.replyTo) {
    const parent = task.comments.find(c => c.id === _commentTarget.replyTo);
    if (parent) {
      if (!parent.replies) parent.replies = [];
      parent.replies.push(entry);
    } else {
      task.comments.push({ ...entry, replies: [] });
    }
    _commentTarget.replyTo = null;
    ta.placeholder = 'コメントを入力… (Ctrl+Enter で送信)';
  } else {
    task.comments.push({ ...entry, replies: [] });
  }

  ta.value = '';
  renderCommentList();
  // バッジ更新
  syncMemberUI();
}

init();
