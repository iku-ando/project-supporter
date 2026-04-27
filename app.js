// ─── SUPABASE AUTH（Magic Link）───
const AUTH_URL = 'https://vnqxwywryyfvvyrmzbqw.supabase.co';
const AUTH_KEY = 'sb_publishable_aolqKf_Ro0UkXx025oUg6w_-pZtgtBZ';

let sbClient = null;
let currentUser = null; // { id, email, display_name }
let currentProjectRole = null; // 'master'|'editor'|'viewer'|null
let appReady = false;

function initAuth() {
  if (!window.supabase) { console.warn('Supabase JS未ロード'); _showApp(); return; }
  sbClient = window.supabase.createClient(AUTH_URL, AUTH_KEY);

  sbClient.auth.onAuthStateChange(async (event, session) => {
    // INITIAL_SESSION: リロード時の既存セッション / SIGNED_IN: 新規ログイン
    if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
      currentUser = {
        id: session.user.id,
        email: session.user.email,
        display_name: session.user.user_metadata?.display_name
          || session.user.email.split('@')[0]
      };
      await _ensureProfile();
      await _acceptPendingInvitations();
      updateAuthUI();
      _hideLoginModal();
      _showApp();
    } else if (event === 'INITIAL_SESSION' && !session) {
      // セッションなしの初回ロード
      _showLoginModal();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      currentProjectRole = null;
      appReady = false;
      updateAuthUI();
      _showLoginModal();
    }
  });

  // 既存セッション確認（リロード時）
  sbClient.auth.getSession().then(({ data: { session } }) => {
    if (!session) _showLoginModal();
  });
}

async function _ensureProfile() {
  if (!currentUser || !sbClient) return;
  try {
    const { data } = await sbClient.from('profiles').select('display_name').eq('id', currentUser.id).single();
    if (!data) {
      await sbClient.from('profiles').insert({ id: currentUser.id, email: currentUser.email, display_name: currentUser.display_name });
    } else if (data.display_name) {
      currentUser.display_name = data.display_name;
    }
  } catch {}
}

async function signOut() {
  if (sbClient) {
    await sbClient.auth.signOut();
    showToast('サインアウトしました');
    showPanel(1);
  }
}

function updateAuthUI() {
  const btn = document.getElementById('rail-user');
  if (!btn) return;
  if (currentUser) {
    const initials = (currentUser.display_name || currentUser.email).slice(0, 2).toUpperCase();
    btn.innerHTML = `<div style="width:28px;height:28px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;">${initials}</div>`;
    btn.title = `${currentUser.display_name}（${currentUser.email}）\nクリックでサインアウト`;
    btn.onclick = () => { if (confirm('サインアウトしますか？')) signOut(); };
  } else {
    btn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
    btn.title = 'ログイン';
    btn.onclick = _showLoginModal;
  }
}

// ─── ログイン画面 ───
function _showLoginModal() {
  // 共有URLではログイン不要
  if (new URLSearchParams(location.search).get('share')) return;
  let modal = document.getElementById('auth-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'auth-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;background:var(--bg);display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
      <div style="width:420px;max-width:90vw;background:var(--bg2);border:1px solid var(--border);border-radius:16px;padding:44px 40px;box-shadow:0 8px 48px rgba(0,0,0,.12);">
        <div style="font-family:'Syne',sans-serif;font-size:24px;font-weight:700;color:var(--text);margin-bottom:4px;">Project Supporter</div>
        <div style="font-size:13px;color:var(--text3);margin-bottom:36px;font-family:'DM Sans',sans-serif;">メールアドレスにログインリンクを送信します</div>
        <div id="_auth-form">
          <div style="margin-bottom:14px;">
            <label style="display:block;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);margin-bottom:6px;">メールアドレス</label>
            <input id="_auth-email" type="email" placeholder="your@email.com"
              style="width:100%;padding:11px 14px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:14px;box-sizing:border-box;outline:none;transition:border-color .15s;"
              onfocus="this.style.borderColor='var(--accent)'"
              onblur="this.style.borderColor='var(--border)'"
              onkeydown="if(event.key==='Enter') sendAuthEmail()">
          </div>
          <button onclick="sendAuthEmail()" id="_auth-btn"
            style="width:100%;padding:12px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-family:'Syne',sans-serif;font-size:14px;font-weight:600;cursor:pointer;transition:opacity .15s;"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            ログインリンクを送信
          </button>
          <div id="_auth-msg" style="margin-top:10px;font-size:12px;color:#dc2626;text-align:center;min-height:16px;"></div>
        </div>
        <div id="_auth-sent" style="display:none;text-align:center;padding:8px 0;">
          <div style="width:52px;height:52px;border-radius:50%;background:rgba(91,78,245,.1);display:flex;align-items:center;justify-content:center;margin:0 auto 18px;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </div>
          <div style="font-family:'Syne',sans-serif;font-size:17px;font-weight:700;color:var(--text);margin-bottom:8px;">メールを確認してください</div>
          <div style="font-size:13px;color:var(--text3);line-height:1.7;font-family:'DM Sans',sans-serif;">送信されたリンクをクリックすると<br>ログインが完了します</div>
          <button onclick="document.getElementById('_auth-sent').style.display='none';document.getElementById('_auth-form').style.display='';"
            style="margin-top:24px;background:none;border:1px solid var(--border2);border-radius:6px;padding:8px 20px;font-size:12px;color:var(--text3);cursor:pointer;font-family:'DM Sans',sans-serif;">
            別のアドレスで試す
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }
  modal.style.display = 'flex';
}

function _hideLoginModal() {
  const modal = document.getElementById('auth-modal');
  if (modal) modal.style.display = 'none';
}

async function sendAuthEmail() {
  const input = document.getElementById('_auth-email');
  const btn   = document.getElementById('_auth-btn');
  const msg   = document.getElementById('_auth-msg');
  const email = input?.value?.trim() || '';
  if (!email || !email.includes('@')) { msg.textContent = '有効なメールアドレスを入力してください'; return; }
  btn.disabled = true; btn.textContent = '送信中...';
  try {
    const { error } = await sbClient.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: location.origin + location.pathname }
    });
    if (error) throw error;
    document.getElementById('_auth-form').style.display = 'none';
    document.getElementById('_auth-sent').style.display = '';
  } catch {
    msg.textContent = '送信に失敗しました。しばらく待ってから再試行してください。';
    btn.disabled = false; btn.textContent = 'ログインリンクを送信';
  }
}

// ─── アプリ起動（ログイン後に呼ぶ）───
function _showApp() {
  if (appReady) return;
  appReady = true;
  renderSnapshotList();
  showPanel(0); // panel-0をactiveにしてrenderDashboard()も呼ぶ
  syncFromSupabase();
}

// ─── メンバー管理・招待 ───

// プロジェクトの現在のメンバー一覧を取得
async function loadProjectMembers(projectId) {
  if (!sbClient || !projectId) return [];
  try {
    const { data } = await sbClient
      .from('project_members')
      .select('user_id, email, role, created_at')
      .eq('project_id', projectId)
      .order('created_at');
    return data || [];
  } catch { return []; }
}

// メンバーを招待（invitationsテーブルに記録 → ログイン時に自動承認）
async function inviteMember(email, role) {
  if (!sbClient || !currentUser || !generatedData?.projectId) return { error: '設定エラー' };
  const projectId = generatedData.projectId;
  try {
    // INSERTを使用（upsertのUPDATEパスがRLSでブロックされハングする問題を回避）
    // 招待相手が Project Supporter にサインアップ/ログインした際に自動承認される
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('タイムアウト：ネットワークまたは権限の問題が発生しました')), 10000)
    );
    const insertPromise = sbClient.from('invitations').insert({
      project_id:  projectId,
      email,
      role,
      invited_by:  currentUser.id,
      status:      'pending'
    });
    const { error } = await Promise.race([insertPromise, timeoutPromise]);
    // 23505 = unique violation（すでに招待済み）→ 成功として扱う
    if (error && error.code !== '23505') throw error;
    return { status: 'invited' };
  } catch (e) {
    return { error: e.message || '招待に失敗しました' };
  }
}

// メンバーをプロジェクトから削除（master のみ可）
async function removeMember(userId) {
  if (!sbClient || !isMasterRole || !generatedData?.projectId) return false;
  if (userId === currentUser?.id) { showToast('自分自身は削除できません'); return false; }
  try {
    await sbClient.from('project_members')
      .delete()
      .eq('project_id', generatedData.projectId)
      .eq('user_id', userId);
    return true;
  } catch { return false; }
}

// ログイン時：保留中の招待を自動承認
async function _acceptPendingInvitations() {
  if (!sbClient || !currentUser) return;
  try {
    const { data: invites } = await sbClient
      .from('invitations')
      .select('*')
      .eq('email', currentUser.email)
      .eq('status', 'pending');
    if (!invites?.length) return;
    for (const inv of invites) {
      await sbClient.from('project_members').upsert({
        project_id: inv.project_id,
        user_id:    currentUser.id,
        email:      currentUser.email,
        role:       inv.role
      }, { onConflict: 'project_id,user_id', ignoreDuplicates: true });
      await sbClient.from('invitations').update({ status: 'accepted' }).eq('id', inv.id);
    }
    if (invites.length > 0) showToast(`${invites.length}件のプロジェクトに参加しました`);
  } catch {}
}

// メンバー管理モーダルを表示
async function showMemberModal() {
  const projectId = generatedData?.projectId;
  if (!projectId) { showToast('先にプロジェクトを保存してください'); return; }

  // 既存モーダルを削除
  document.getElementById('member-modal')?.remove();

  const modal = document.createElement('div');
  modal.id = 'member-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:8000;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;';
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  modal.innerHTML = `
    <div style="width:480px;max-width:92vw;max-height:80vh;background:var(--bg2);border:1px solid var(--border);border-radius:14px;display:flex;flex-direction:column;box-shadow:0 8px 48px rgba(0,0,0,.18);overflow:hidden;">
      <div style="padding:20px 24px 16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">
        <div style="font-family:'Syne',sans-serif;font-size:15px;font-weight:700;color:var(--text);">メンバー管理</div>
        <button onclick="document.getElementById('member-modal').remove()" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:18px;line-height:1;padding:2px 6px;">×</button>
      </div>
      <div style="padding:20px 24px;overflow-y:auto;flex:1;">
        <div id="member-list-wrap">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:10px;">現在のメンバー</div>
          <div id="member-list" style="display:flex;flex-direction:column;gap:6px;">
            <div style="font-size:12px;color:var(--text3);">読み込み中...</div>
          </div>
        </div>
        <div style="margin-top:24px;border-top:1px solid var(--border);padding-top:20px;">
          <div style="font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:12px;">メンバーを招待</div>
          <div style="display:flex;gap:8px;margin-bottom:8px;">
            <input id="invite-email" type="email" placeholder="メールアドレス"
              style="flex:1;padding:9px 12px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;transition:border-color .15s;"
              onfocus="this.style.borderColor='var(--accent)'" onblur="this.style.borderColor='var(--border)'"
              onkeydown="if(event.key==='Enter') submitInvite()">
            <select id="invite-role"
              style="padding:9px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;font-size:13px;outline:none;cursor:pointer;">
              <option value="editor">編集</option>
              <option value="viewer">閲覧</option>
              <option value="master">マスター</option>
            </select>
          </div>
          <button onclick="submitInvite()"
            style="width:100%;padding:10px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;transition:opacity .15s;"
            onmouseover="this.style.opacity='.85'" onmouseout="this.style.opacity='1'">
            招待する
          </button>
          <div id="invite-msg" style="margin-top:8px;font-size:12px;text-align:center;min-height:16px;"></div>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);

  // メンバー一覧をロード
  _renderMemberList(projectId);
}

async function _renderMemberList(projectId) {
  const listEl = document.getElementById('member-list');
  if (!listEl) return;
  const members = await loadProjectMembers(projectId);
  if (!members.length) {
    listEl.innerHTML = `<div style="font-size:12px;color:var(--text3);">メンバーがいません</div>`;
    return;
  }
  const roleLabel = { master: 'マスター', editor: '編集', viewer: '閲覧' };
  const roleColor = { master: 'var(--accent)', editor: 'var(--green)', viewer: 'var(--text3)' };
  listEl.innerHTML = members.map(m => {
    const isMe = m.user_id === currentUser?.id;
    const initials = m.email.slice(0, 2).toUpperCase();
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:8px;background:var(--bg3);border:1px solid var(--border);">
        <div style="width:30px;height:30px;border-radius:50%;background:var(--accent);color:#fff;display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-size:11px;font-weight:700;flex-shrink:0;">${initials}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.email}${isMe ? ' <span style="font-size:10px;color:var(--text3);">（あなた）</span>' : ''}</div>
        </div>
        <span style="font-family:'DM Mono',monospace;font-size:10px;color:${roleColor[m.role]||'var(--text3)'};background:${roleColor[m.role]||'var(--text3)'}1a;padding:2px 8px;border-radius:4px;flex-shrink:0;">${roleLabel[m.role]||m.role}</span>
        ${isMasterRole && !isMe ? `<button onclick="_doRemoveMember('${m.user_id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;padding:2px 4px;border-radius:4px;transition:color .15s;" onmouseover="this.style.color='#dc2626'" onmouseout="this.style.color='var(--text3)'" title="削除">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>` : ''}
      </div>`;
  }).join('');
}

async function _doRemoveMember(userId) {
  if (!confirm('このメンバーをプロジェクトから削除しますか？')) return;
  const ok = await removeMember(userId);
  if (ok) {
    showToast('メンバーを削除しました');
    _renderMemberList(generatedData?.projectId);
  }
}

async function submitInvite() {
  const email = document.getElementById('invite-email')?.value?.trim() || '';
  const role  = document.getElementById('invite-role')?.value || 'editor';
  const msg   = document.getElementById('invite-msg');
  if (!email || !email.includes('@')) { msg.textContent = '有効なメールアドレスを入力してください'; msg.style.color='#dc2626'; return; }

  const btn = document.querySelector('#member-modal button[onclick="submitInvite()"]');
  if (btn) { btn.disabled = true; btn.textContent = '処理中...'; }

  const result = await inviteMember(email, role);

  if (btn) { btn.disabled = false; btn.textContent = '招待する'; }

  if (result.error) {
    msg.textContent = result.error;
    msg.style.color = '#dc2626';
  } else if (result.status === 'added') {
    msg.textContent = `${email} をプロジェクトに追加しました`;
    msg.style.color = 'var(--green)';
    document.getElementById('invite-email').value = '';
    _renderMemberList(generatedData?.projectId);
  } else {
    msg.textContent = `${email} を招待リストに登録しました。対象の方が Project Supporter にサインアップ後、自動でプロジェクトに追加されます`;
    msg.style.color = 'var(--green)';
    document.getElementById('invite-email').value = '';
  }
}

// ─── プロジェクト権限システム ───

// generatedDataにprojectIdがなければUUIDを付与
function ensureProjectId() {
  if (!generatedData) return null;
  if (!generatedData.projectId) generatedData.projectId = generateUUID();
  // 所有者キーが未設定なら付与（ロール判定に使用）
  if (currentUser && !generatedData.ownerKey) generatedData.ownerKey = getUserKey();
  return generatedData.projectId;
}

// ロールに応じてisGuestMode / isMasterRoleを設定
function applyRolePermissions(role) {
  currentProjectRole = role;
  if (role === 'viewer') {
    isGuestMode  = true;
    isMasterRole = false;
  } else if (role === 'editor') {
    isGuestMode  = false;
    isMasterRole = false;
  } else {
    // 'master' または null（未登録→マスター扱い）
    isGuestMode  = false;
    isMasterRole = true;
  }
}

// project_membersからロードしてパーミッションを適用
async function loadProjectRole(projectId) {
  if (!sbClient || !currentUser) {
    applyRolePermissions(null); // 未ログイン → フル操作
    return;
  }
  if (!projectId) {
    applyRolePermissions('master'); // 新規プロジェクト → マスター
    return;
  }

  // 自分が保存したプロジェクト（ownerKey が一致）は常にmaster
  // これによりproject_membersテーブルの状態に依存せず所有者を判定できる
  if (generatedData?.ownerKey && generatedData.ownerKey === getUserKey()) {
    applyRolePermissions('master');
    _registerAsMaster(projectId); // project_membersにも反映
    return;
  }

  try {
    const { data } = await sbClient
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', currentUser.id)
      .single();
    if (data) {
      applyRolePermissions(data.role);
    } else {
      // 未登録 → 後方互換でマスターに設定して登録
      applyRolePermissions('master');
      _registerAsMaster(projectId);
    }
  } catch {
    applyRolePermissions('master');
  }
}

// プロジェクトのオーナー（master）として登録・強制修正
async function _registerAsMaster(projectId) {
  if (!sbClient || !currentUser || !projectId) return;
  try {
    await sbClient.from('project_members').upsert({
      project_id: projectId,
      user_id:    currentUser.id,
      email:      currentUser.email,
      role:       'master'
    }, { onConflict: 'project_id,user_id' }); // ignoreDuplicates なし → 誤ったロールを上書き修正
  } catch {}
}

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
    const isToday = dateStr === toDateStr(today);
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

// ─── SUPABASE CONFIG（auth projectに統合）───
const SUPABASE_URL = AUTH_URL;  // 'https://vnqxwywryyfvvyrmzbqw.supabase.co'
const SUPABASE_KEY = AUTH_KEY;  // sb_publishable_...

// ユーザーキー（ログイン済みならユーザーID）
function getUserKey() {
  return currentUser ? 'user_' + currentUser.id : 'pf_anonymous';
}

// 認証済みトークンを含むヘッダーを返す
async function _getAuthHeaders(extra) {
  let token = SUPABASE_KEY;
  if (sbClient) {
    const { data: { session } } = await sbClient.auth.getSession();
    if (session?.access_token) token = session.access_token;
  }
  return { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}`, ...extra };
}

// Supabaseにプロジェクトを保存（upsert）
async function saveToSupabase(snap) {
  if (!currentUser) return false;
  try {
    const headers = await _getAuthHeaders({
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    });
    const res = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_key:     getUserKey(),
        snap_id:      String(snap.id),
        project_id:   snap.data?.projectId || null,  // メンバーアクセス用
        project_name: snap.data?.projectName || '無題',
        data:         snap,
        saved_at:     new Date().toISOString()
      })
    });
    return res.ok;
  } catch (e) {
    console.warn('Supabase保存失敗:', e);
    return false;
  }
}

// Supabaseからプロジェクト一覧を取得（自分のプロジェクト＋招待参加プロジェクト）
async function loadFromSupabase() {
  if (!currentUser) return null;
  try {
    const headers = await _getAuthHeaders();

    // 1. 自分のプロジェクト
    const res1 = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_key=eq.${encodeURIComponent(getUserKey())}&order=saved_at.desc&limit=50`,
      { headers }
    );
    // snap_id が 'share_' で始まる行は共有用なのでプロジェクト一覧から除外
    const ownRows = (res1.ok ? await res1.json() : [])
      .filter(r => !String(r.snap_id || '').startsWith('share_'));

    // 2. メンバーとして参加しているプロジェクト
    let memberRows = [];
    if (sbClient) {
      const { data: memberships } = await sbClient
        .from('project_members')
        .select('project_id')
        .eq('user_id', currentUser.id);

      if (memberships?.length) {
        const ownIds = new Set(ownRows.map(r => r.project_id).filter(Boolean));
        const memberIds = memberships
          .map(m => m.project_id)
          .filter(id => id && !ownIds.has(id));

        if (memberIds.length) {
          const res2 = await fetch(
            `${SUPABASE_URL}/rest/v1/projects?project_id=in.(${memberIds.join(',')})&order=saved_at.desc`,
            { headers }
          );
          memberRows = res2.ok ? await res2.json() : [];
        }
      }
    }

    // snap_idで重複排除して返す
    const seen = new Set();
    return [...ownRows, ...memberRows]
      .filter(r => { if (seen.has(r.snap_id)) return false; seen.add(r.snap_id); return true; })
      .map(r => r.data);

  } catch (e) {
    console.warn('Supabase読み込み失敗:', e);
    return null;
  }
}

// Supabaseから特定プロジェクトを削除
async function deleteFromSupabase(snapId) {
  if (!currentUser) return;
  try {
    const headers = await _getAuthHeaders();
    await fetch(
      `${SUPABASE_URL}/rest/v1/projects?user_key=eq.${encodeURIComponent(getUserKey())}&snap_id=eq.${snapId}`,
      { method: 'DELETE', headers }
    );
  } catch (e) {
    console.warn('Supabase削除失敗:', e);
  }
}

// ─── 共有URL機能 ───

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });
}

async function saveSharedProject(token, snap) {
  try {
    // saveToSupabase と同じ upsert 方式（DELETE不要・RLS問題を回避）
    const headers = await _getAuthHeaders({
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    });
    const snapId = 'share_' + token;
    const res = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_key:     getUserKey(),
        snap_id:      snapId,
        project_name: snap.data?.projectName || '無題',
        data:         snap,
        saved_at:     new Date().toISOString()
      })
    });
    if (!res.ok) console.warn('共有保存失敗:', res.status, await res.text());
    return res.ok;
  } catch (e) {
    console.warn('共有保存失敗:', e);
    return false;
  }
}

async function loadSharedProject(token) {
  try {
    const headers = await _getAuthHeaders();
    // snap_id = 'share_xxx' で検索（user_keyに依存しない）
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?snap_id=eq.share_${token}&limit=1`,
      { headers }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length ? rows[0].data : null;
  } catch (e) {
    console.warn('共有読み込み失敗:', e);
    return null;
  }
}

async function issueShareUrl() {
  if (!generatedData) return;
  document.getElementById('proj-settings-popup').style.display = 'none';

  const modal   = document.getElementById('share-url-modal');
  const content = document.getElementById('share-url-content');
  modal.style.display = 'flex';

  // ローディング表示
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;color:var(--text2);font-family:'DM Sans',sans-serif;font-size:13px;padding:4px 0;">
      <svg style="animation:spin .8s linear infinite;flex-shrink:0;" width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      URLを生成中...
    </div>`;

  // 既存トークン再利用 or 新規生成（URLは即座に表示）
  if (!generatedData.shareToken) generatedData.shareToken = generateUUID();
  const token    = generatedData.shareToken;
  const shareUrl = `${location.origin}${location.pathname}?share=${token}`;

  // URLを即座に表示し、保存はバックグラウンドで行う
  content.innerHTML = `
    <div style="margin-bottom:14px;">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:7px;">共有URL</div>
      <div style="display:flex;gap:6px;">
        <input id="share-url-input" value="${shareUrl}" readonly
          style="flex:1;min-width:0;background:var(--bg);border:1px solid var(--border2);border-radius:7px;padding:8px 10px;font-family:'DM Mono',monospace;font-size:11px;color:var(--text2);outline:none;cursor:text;"
          onclick="this.select()">
        <button id="share-copy-btn" onclick="copyShareUrl()"
          style="flex-shrink:0;background:var(--accent);color:#fff;border:none;border-radius:7px;padding:8px 16px;font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .15s;"
          onmouseover="this.style.background='var(--accent2)'" onmouseout="this.style.background='var(--accent)'">コピー</button>
      </div>
    </div>
    <div id="share-save-status" style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--text3);line-height:1.7;margin-bottom:16px;display:flex;align-items:center;gap:6px;">
      <svg style="animation:spin .8s linear infinite;flex-shrink:0;" width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      リンクを準備中...
    </div>
    <button onclick="issueShareUrl()"
      style="display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:9px 12px;background:transparent;border:1px solid var(--border2);border-radius:7px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--text2);transition:background .15s;box-sizing:border-box;"
      onmouseover="this.style.background='var(--bg3)'" onmouseout="this.style.background='transparent'">
      <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 8a6 6 0 1 0 1.5-3.9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M2 4v4h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      現在の状態でURLを更新する
    </button>`;

  // バックグラウンドで保存（await しない → UIをブロックしない）
  const snap = {
    id:         token,
    savedAt:    new Date().toISOString(),
    data:       generatedData,
    recurring:  recurringList,
    categories: selectedCategories
  };
  saveSharedProject(token, snap).then(ok => {
    const statusEl = document.getElementById('share-save-status');
    if (!statusEl) return; // モーダルが既に閉じられた
    if (ok) {
      statusEl.textContent = 'このURLを知っているメンバーがアクセスできます。プロジェクトのスナップショットが共有されます。';
    } else {
      statusEl.innerHTML = '<span style="color:#dc2626;">共有データの保存に失敗しました。ページをリロードして再試行してください。</span>';
    }
  });
}

function copyShareUrl() {
  const input = document.getElementById('share-url-input');
  const btn   = document.getElementById('share-copy-btn');
  if (!input || !btn) return;
  navigator.clipboard.writeText(input.value).then(() => {
    btn.textContent = 'コピー済み ✓';
    btn.style.background = '#10b981';
    setTimeout(() => { btn.textContent = 'コピー'; btn.style.background = 'var(--accent)'; }, 2000);
  }).catch(() => {
    input.select(); document.execCommand('copy');
    btn.textContent = 'コピー済み ✓';
    btn.style.background = '#10b981';
    setTimeout(() => { btn.textContent = 'コピー'; btn.style.background = 'var(--accent)'; }, 2000);
  });
}

// ─── ガントスケジュール共有URL機能 ───

// ガントチャートのみを公開共有（保存するたびに自動更新）
async function saveGanttShare(projectId) {
  if (!sbClient || !currentUser || !projectId || !generatedData) return false;
  try {
    const snapId = 'share_gantt_' + projectId;
    const snap   = {
      id:         snapId,
      savedAt:    new Date().toISOString(),
      data:       generatedData,
      recurring:  recurringList,
      categories: selectedCategories
    };
    // sbClientを直接使用（_getAuthHeadersのgetSession競合を回避）
    const { error } = await sbClient.from('projects').upsert({
      user_key:     getUserKey(),
      snap_id:      snapId,
      project_id:   projectId,
      project_name: generatedData?.projectName || '無題',
      data:         snap,
      saved_at:     new Date().toISOString()
    }, { onConflict: 'snap_id' });
    if (error) { console.warn('ガント共有保存失敗:', error); return false; }
    return true;
  } catch (e) {
    console.warn('ガント共有保存失敗:', e);
    return false;
  }
}

async function loadGanttShare(projectId) {
  try {
    // 認証不要・anonキーのみで取得（share_rows_public_readポリシーが許可）
    const headers = { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` };
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/projects?snap_id=eq.share_gantt_${projectId}&select=data&limit=1`,
      { headers }
    );
    if (!res.ok) return null;
    const rows = await res.json();
    return rows.length ? rows[0].data : null;
  } catch (e) {
    console.warn('ガント共有読み込み失敗:', e);
    return null;
  }
}

async function handleGanttShareLoad(projectId) {
  // データ取得前にすぐ panel-2 を表示してローディングを出す
  showPanel(2);
  applyGanttOnlyUI();
  const container = document.getElementById('gantt-container');
  if (container) {
    container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:240px;gap:12px;color:var(--text3);">
      <svg style="animation:spin .9s linear infinite;flex-shrink:0;" width="18" height="18" viewBox="0 0 16 16" fill="none">
        <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      </svg>
      <span style="font-family:'DM Sans',sans-serif;font-size:13px;">データを読み込んでいます…</span>
    </div>`;
  }

  const snap = await loadGanttShare(projectId);
  history.replaceState({}, '', location.pathname);

  if (snap && snap.data) {
    generatedData      = snap.data;
    recurringList      = snap.recurring  || [];
    selectedCategories = snap.categories || [];
    renderResult(true);
    renderGantt();
  } else {
    if (container) container.innerHTML = '';
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:32px 36px;max-width:340px;width:90%;box-shadow:0 24px 64px rgba(0,0,0,.18);z-index:9999;text-align:center;';
    el.innerHTML = `
      <div style="font-size:36px;margin-bottom:14px;">📅</div>
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:var(--text);margin-bottom:8px;">スケジュールが見つかりません</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text2);margin-bottom:22px;line-height:1.6;">このリンクは無効か、まだ公開されていない可能性があります。</div>
      <button onclick="this.parentElement.remove()" style="padding:9px 28px;background:var(--accent);border:none;border-radius:7px;color:#fff;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">閉じる</button>`;
    document.body.appendChild(el);
  }
}

// ガントチャートのみ表示するUI（閲覧者向け）
function applyGanttOnlyUI() {
  // アイコンレールを非表示・メインのパディングを縮小
  const iconRail = document.getElementById('icon-rail');
  if (iconRail) iconRail.style.display = 'none';
  const mainEl = document.querySelector('.main');
  if (mainEl) mainEl.style.paddingLeft = '24px';

  // タブコントロール行ごと非表示（margin-bottom も含めて消す）
  const tabControlsRow = document.getElementById('tab-controls-row');
  if (tabControlsRow) tabControlsRow.style.display = 'none';
  const mainTabsWrap = document.getElementById('main-tabs-wrap');
  if (mainTabsWrap) mainTabsWrap.style.display = 'none';
  // 個別タブも念のため非表示
  ['tab-wiki', 'tab-member', 'tab-mtg', 'tab-issues', 'tab-gantt'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  });
  document.querySelectorAll('.tab-notch').forEach(el => el.style.display = 'none');
  const dynTabs = document.getElementById('dynamic-tabs');
  if (dynTabs) dynTabs.style.display = 'none';

  // 設定ボタン・統計行を非表示
  const settingsBtn = document.getElementById('proj-settings-btn');
  if (settingsBtn) settingsBtn.style.display = 'none';
  const statsRow = document.getElementById('stats-row');
  if (statsRow) statsRow.style.display = 'none';

  // ガント共有ボタン・定例セットボタンを非表示（閲覧者には不要）
  const ganttShareBtn = document.getElementById('gantt-share-btn');
  if (ganttShareBtn) ganttShareBtn.style.display = 'none';

  // 定例をセットボタンを非表示
  document.querySelectorAll('.gantt-toolbar button').forEach(btn => {
    if (btn.id !== 'gantt-zoom-in' && btn.id !== 'gantt-zoom-out') {
      btn.style.display = 'none';
    }
  });

  // 日付入力を読み取り専用に
  ['gantt-start-input', 'gantt-end-input'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.readOnly = true; el.style.pointerEvents = 'none'; }
  });

  // プロジェクトタイトルのクリック編集を無効化
  const titleEl = document.getElementById('result-project-name');
  if (titleEl) { titleEl.style.cursor = 'default'; titleEl.onclick = null; }

  // 読み取り専用バッジを追加
  const titleWrap = document.querySelector('#panel-2 > div:first-child');
  if (titleWrap) {
    const badge = document.createElement('div');
    badge.style.cssText = 'margin-top:6px;';
    badge.innerHTML = `<span style="font-family:'DM Mono',monospace;font-size:9px;letter-spacing:1.5px;text-transform:uppercase;color:var(--text3);background:var(--border);padding:3px 8px;border-radius:4px;">スケジュール / 読み取り専用</span>`;
    titleWrap.appendChild(badge);
  }

  // ガントタブに切り替え
  switchTab('gantt');
}

// ガントスケジュール共有URLを発行するモーダルを開く
async function issueGanttShareUrl() {
  if (!generatedData) return;
  if (!currentUser) { showToast('ログインが必要です'); return; }

  const projectId = ensureProjectId();
  if (!projectId) return;

  const modal   = document.getElementById('gantt-share-modal');
  const content = document.getElementById('gantt-share-content');
  if (!modal || !content) return;
  modal.style.display = 'flex';

  const shareUrl = `${location.origin}/g/${projectId}/latest`;

  // URLを即座に表示
  content.innerHTML = `
    <div style="margin-bottom:14px;">
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:7px;">スケジュール共有URL</div>
      <div style="display:flex;gap:6px;">
        <input id="gantt-share-url-input" value="${shareUrl}" readonly
          style="flex:1;min-width:0;background:var(--bg);border:1px solid var(--border2);border-radius:7px;padding:8px 10px;font-family:'DM Mono',monospace;font-size:11px;color:var(--text2);outline:none;cursor:text;"
          onclick="this.select()">
        <button id="gantt-share-copy-btn" onclick="copyGanttShareUrl()"
          style="flex-shrink:0;background:var(--accent);color:#fff;border:none;border-radius:7px;padding:8px 16px;font-family:'Syne',sans-serif;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;transition:background .15s;"
          onmouseover="this.style.background='var(--accent2)'" onmouseout="this.style.background='var(--accent)'">コピー</button>
      </div>
    </div>
    <div id="gantt-share-status" style="font-family:'DM Sans',sans-serif;font-size:12px;color:var(--text3);line-height:1.7;display:flex;align-items:center;gap:6px;">
      <svg style="animation:spin .8s linear infinite;flex-shrink:0;" width="12" height="12" viewBox="0 0 16 16" fill="none">
        <path d="M8 2a6 6 0 0 1 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
      </svg>
      データを準備中...
    </div>`;

  // 「常に最新」フラグをセット
  generatedData.ganttShareActive = true;

  // バックグラウンドで保存
  saveGanttShare(projectId).then(ok => {
    const statusEl = document.getElementById('gantt-share-status');
    if (!statusEl) return;
    if (ok) {
      statusEl.textContent = 'スケジュールのみが表示されます。保存するたびに自動で最新状態に更新されます。';
    } else {
      statusEl.innerHTML = '<span style="color:#dc2626;">保存に失敗しました。再試行してください。</span>';
      generatedData.ganttShareActive = false;
    }
  });
}

function copyGanttShareUrl() {
  const input = document.getElementById('gantt-share-url-input');
  const btn   = document.getElementById('gantt-share-copy-btn');
  if (!input || !btn) return;
  navigator.clipboard.writeText(input.value).then(() => {
    btn.textContent = 'コピー済み ✓';
    btn.style.background = '#10b981';
    setTimeout(() => { btn.textContent = 'コピー'; btn.style.background = 'var(--accent)'; }, 2000);
  }).catch(() => {
    input.select(); document.execCommand('copy');
    btn.textContent = 'コピー済み ✓';
    btn.style.background = '#10b981';
    setTimeout(() => { btn.textContent = 'コピー'; btn.style.background = 'var(--accent)'; }, 2000);
  });
}

// ゲストモード時のUI調整（左メニューを共有プロジェクトのみに制限）
function applyGuestModeUI(projectName) {
  // 新規プロジェクト / ホームボタンを非表示
  const railNew  = document.getElementById('rail-new');
  const railHome = document.getElementById('rail-home');
  if (railNew)  railNew.style.display  = 'none';
  if (railHome) railHome.style.display = 'none';

  // サイドバーの新規・ホームナビを非表示
  const nav1 = document.getElementById('nav-1');
  if (nav1) nav1.style.display = 'none';

  // プロジェクト一覧を「このプロジェクトのみ」に置き換え
  renderSnapshotList();

  // proj-rail-panel の「新規プロジェクト」ボタンを非表示
  const railPanel = document.getElementById('proj-rail-panel');
  if (railPanel) {
    const newBtn = railPanel.querySelector('button');
    if (newBtn) newBtn.style.display = 'none';
  }

  // 共有中バナーをアイコンレールの下部に追加
  const iconRail = document.getElementById('icon-rail');
  if (iconRail && !document.getElementById('guest-badge')) {
    const badge = document.createElement('div');
    badge.id = 'guest-badge';
    badge.title = '共有リンクで閲覧中';
    badge.style.cssText = 'width:38px;height:38px;border-radius:9px;background:rgba(16,185,129,.15);border:1px solid rgba(16,185,129,.3);display:flex;align-items:center;justify-content:center;flex-shrink:0;cursor:default;';
    badge.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 2h4v4M10 6l4-4M7 4H3a1 1 0 00-1 1v8a1 1 0 001 1h10a1 1 0 001-1v-4" stroke="#10b981" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    iconRail.insertBefore(badge, iconRail.firstChild.nextSibling);
  }
}

async function handleSharedProjectLoad(token) {
  const snap = await loadSharedProject(token);
  if (snap && snap.data) {
    generatedData      = snap.data;
    recurringList      = snap.recurring  || [];
    selectedCategories = snap.categories || [];
    renderResult(true);
    showPanel(2);
    applyGuestModeUI(generatedData.projectName || '共有プロジェクト');
    // 読み込み完了トースト
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:rgba(91,78,245,.92);color:#fff;font-family:\'DM Mono\',monospace;font-size:11px;padding:10px 18px;border-radius:20px;z-index:9999;display:flex;align-items:center;gap:8px;box-shadow:0 4px 16px rgba(0,0,0,.2);';
    el.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2.5 8l4 4 7-8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>共有リンクからプロジェクトを読み込みました`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
    // URLをきれいにする（?share=... を除去）
    history.replaceState({}, '', location.pathname);
  } else {
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:var(--bg2);border:1px solid var(--border2);border-radius:14px;padding:32px 36px;max-width:340px;width:90%;box-shadow:0 24px 64px rgba(0,0,0,.18);z-index:9999;text-align:center;';
    el.innerHTML = `
      <div style="font-size:36px;margin-bottom:14px;">🔍</div>
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:15px;color:var(--text);margin-bottom:8px;">リンクが見つかりません</div>
      <div style="font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text2);margin-bottom:22px;line-height:1.6;">この共有URLは無効か、期限切れの可能性があります。</div>
      <button onclick="this.parentElement.remove()" style="padding:9px 28px;background:var(--accent);border:none;border-radius:7px;color:#fff;font-family:'Syne',sans-serif;font-size:13px;font-weight:600;cursor:pointer;">閉じる</button>`;
    document.body.appendChild(el);
    history.replaceState({}, '', location.pathname);
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
  // projectIdを確保してからスナップショット作成
  ensureProjectId();
  // 所有者キーを埋め込み（ロール判定に使用）
  if (currentUser) generatedData.ownerKey = getUserKey();
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

  // Supabaseにも保存 + 初回保存時はmasterとして登録
  const ok = await saveToSupabase(snap);
  _registerAsMaster(generatedData.projectId);
  showSyncStatus(ok ? 'cloud' : 'local');

  // ガント共有が有効ならバックグラウンドで最新データを更新
  if (ok && generatedData?.ganttShareActive && generatedData?.projectId) {
    saveGanttShare(generatedData.projectId);
  }

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


async function loadSnapshot(id) {
  const snaps = getSnapshots();
  const snap  = snaps.find(s => s.id === id);
  if (!snap) return;
  generatedData      = snap.data;
  recurringList      = snap.recurring || [];
  selectedCategories = snap.categories || [];
  // 保存済みフェーズカラーを復元
  if (generatedData?.phaseColors) {
    Object.assign(PHASE_BAR_COLORS, generatedData.phaseColors);
  }
  // ロールをロードしてからレンダリング
  await loadProjectRole(generatedData?.projectId);
  renderResult(true);
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

  // ゲストモード：現在の共有プロジェクト名のみ表示
  if (isGuestMode) {
    const name = generatedData?.projectName || '共有プロジェクト';
    list.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:8px;background:var(--accent-glow);">
        <div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;"></div>
        <div style="font-size:13px;font-weight:600;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);padding:6px 14px;">共有リンクで閲覧中</div>`;
    return;
  }

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

  // ガントスケジュール共有URL（/g/:projectId/latest または ?gantt=projectId）
  const pathMatch = location.pathname.match(/^\/g\/([^\/]+)\/latest\/?$/);
  const ganttId = pathMatch ? pathMatch[1] : new URLSearchParams(location.search).get('gantt');
  if (ganttId) {
    isGuestMode = true;
    handleGanttShareLoad(ganttId);
    return;
  }

  // 共有URLは認証不要でそのまま開く
  const shareToken = new URLSearchParams(location.search).get('share');
  if (shareToken) {
    isGuestMode = true;
    handleSharedProjectLoad(shareToken);
    return;
  }

  // 通常起動：認証チェック → _showApp() はログイン後に呼ばれる
  initAuth();
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

  if (isGuestMode) {
    grid.style.display = 'none';
    if (empty) empty.style.display = 'none';
    return;
  }

  grid.innerHTML = '';

  const snaps = getSnapshots();
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

  // 花がボードに浮かぶレイアウト
  grid.style.cssText = 'display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-end;gap:40px 52px;padding:48px 20px 32px;';
  empty.style.display = 'none';

  projects.forEach(snap => {
    const d = snap.data;
    const tsStr = relativeTime(new Date(snap.savedAt));

    const item = document.createElement('div');
    item.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:8px;cursor:pointer;';
    item.addEventListener('click', () => { confirmLeave(() => { loadSnapshot(snap.id); showPanel(2); }); });

    // 花SVG（単体・背景なし）
    const svg = makeFlowerSvg(d);
    // ホバーで花（茎+頭）だけがふわっと上に動く
    const flowerAnim = svg.querySelector('.flower-anim');
    item.addEventListener('mouseenter', () => { if (flowerAnim) flowerAnim.style.transform = 'translateY(-10px)'; });
    item.addEventListener('mouseleave', () => { if (flowerAnim) flowerAnim.style.transform = ''; });
    item.appendChild(svg);

    // プロジェクト名
    const name = document.createElement('div');
    name.style.cssText = `font-family:'Noto Sans JP',sans-serif;font-weight:700;font-size:12px;color:var(--text);text-align:center;max-width:110px;line-height:1.5;`;
    name.textContent = d.projectName || '無題';
    item.appendChild(name);

    // 保存日時
    const meta = document.createElement('div');
    meta.style.cssText = `font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);letter-spacing:.3px;`;
    meta.textContent = tsStr;
    item.appendChild(meta);

    grid.appendChild(item);
  });
}

// 単体花SVG（ボードに浮かぶ用・背景なし）
function makeFlowerSvg(d) {
  const W = 130, H = 250;

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function seededRand(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
  }

  const seed = hashCode(d.projectName || 'default');
  const rand = seededRand(seed);

  // 花の色（参照画像トーン：白・クリーム系の花弁 × 濃いグリーンの茎）
  const flowerColors = [
    { petal:'#FFFFFF', center:'#C8952A' },   // 白 × ゴールド
    { petal:'#F5F0E8', center:'#3D7A50' },   // クリーム × グリーン
    { petal:'#FFFFFF', center:'#B86C2A' },   // 白 × アンバー
    { petal:'#EAF0EA', center:'#4A7A3A' },   // 淡グリーン × 濃グリーン
    { petal:'#FFFFFF', center:'#7A5C14' },   // 白 × ダークゴールド
    { petal:'#F0EDE6', center:'#5A7A2C' },   // 温白 × オリーブグリーン
    { petal:'#E8EDE8', center:'#3A6870' },   // 淡グリーン × ティール
  ];
  const col      = flowerColors[seed % flowerColors.length];
  const stemCol  = '#2D6A3F';   // 濃いグリーン
  const leafCol  = '#1F5530';   // さらに濃いグリーン
  const vaseCol  = '#FFFFFF';   // 白い花瓶

  // レイアウト寸法
  const cx    = W / 2;         // 水平中心
  const cy    = 72;            // 花の中心Y（上に余白を確保してホバー時に切れない）
  const vTop  = 152;           // 花瓶の口Y（茎を長く）
  const vBot  = 228;           // 花瓶の底Y
  const tilt  = ((seed % 9) - 4) * 1.6;  // 自然な傾き

  // ── 茎（花頭下〜花瓶の口の少し中まで） ──
  const sway = ((seed % 5) - 2) * 5;
  const stem = `<path d="M${cx},${cy+26} C${cx+sway},${cy+60} ${cx-sway*0.5},${vTop+14} ${cx},${vTop+14}" stroke="${stemCol}" stroke-width="8" stroke-linecap="round" fill="none"/>`;

  // ── 葉 ──
  const ly   = cy + 65;
  const ldir = (seed % 2 === 0) ? 1 : -1;
  const leaf = `<path d="M${cx+ldir*3},${ly} C${cx+ldir*36},${ly-18} ${cx+ldir*30},${ly+13} ${cx+ldir*3},${ly+8}Z" fill="${leafCol}"/>`;

  // ── 花の頭（3種） ──
  const type = seed % 3;
  let head = '';
  if (type === 0) {
    const R=30, pr=13, pry=18;
    for (let i=0; i<5; i++) {
      const a=(i/5)*Math.PI*2-Math.PI/2;
      const px=+(cx+Math.cos(a)*R).toFixed(1), py=+(cy+Math.sin(a)*R).toFixed(1);
      head += `<ellipse cx="${px}" cy="${py}" rx="${pr}" ry="${pry}" fill="${col.petal}" transform="rotate(${+(a*180/Math.PI+90).toFixed(1)},${px},${py})"/>`;
    }
    head += `<circle cx="${cx}" cy="${cy}" r="16" fill="${col.center}"/>`;
  } else if (type === 1) {
    const W2=22, Ht=36, bot=14, sh=5;
    head += `<path d="M${cx-W2},${cy+bot} C${cx-W2-2},${cy-8} ${cx-10},${cy-Ht} ${cx},${cy-Ht-2} C${cx+10},${cy-Ht} ${cx+W2+2},${cy-8} ${cx+W2},${cy+bot} Q${cx},${cy+bot+11} ${cx-W2},${cy+bot}Z" fill="${col.petal}"/>`;
    head += `<path d="M${cx-sh},${cy-4} C${cx-3},${cy-26} ${cx+2},${cy-Ht} ${cx+sh},${cy-Ht+6} C${cx+7},${cy-13} ${cx+3},${cy+3} ${cx-sh},${cy-4}Z" fill="${col.center}" opacity="0.42"/>`;
  } else {
    const R=24, pr=16;
    for (let i=0; i<6; i++) {
      const a=(i/6)*Math.PI*2-Math.PI/2;
      const px=+(cx+Math.cos(a)*R).toFixed(1), py=+(cy+Math.sin(a)*R).toFixed(1);
      head += `<circle cx="${px}" cy="${py}" r="${pr}" fill="${col.petal}"/>`;
    }
    head += `<circle cx="${cx}" cy="${cy}" r="17" fill="${col.center}"/>`;
  }

  // ── 花瓶（4種シェイプ・白フラット） ──
  const vt = vTop, vb = vBot;
  const vaseType = seed % 4;
  let vase = '';

  if (vaseType === 0) {
    // クラシック丸壺
    vase = `<path d="M${cx-9},${vt} C${cx-9},${vt+10} ${cx-30},${vt+26} ${cx-28},${vt+50} C${cx-26},${vt+64} ${cx-13},${vb-4} ${cx-10},${vb} L${cx+10},${vb} C${cx+13},${vb-4} ${cx+26},${vt+64} ${cx+28},${vt+50} C${cx+30},${vt+26} ${cx+9},${vt+10} ${cx+9},${vt}Z" fill="${vaseCol}"/>
      <ellipse cx="${cx}" cy="${vb}" rx="12" ry="4" fill="${vaseCol}"/>`;
  } else if (vaseType === 1) {
    // 細長いボトル
    vase = `<path d="M${cx-7},${vt} C${cx-7},${vt+8} ${cx-13},${vt+18} ${cx-13},${vt+30} L${cx-13},${vb-6} C${cx-13},${vb-1} ${cx-16},${vb} ${cx-16},${vb} L${cx+16},${vb} C${cx+16},${vb} ${cx+13},${vb-1} ${cx+13},${vb-6} L${cx+13},${vt+30} C${cx+13},${vt+18} ${cx+7},${vt+8} ${cx+7},${vt}Z" fill="${vaseCol}"/>
      <ellipse cx="${cx}" cy="${vb}" rx="17" ry="4.5" fill="${vaseCol}"/>`;
  } else if (vaseType === 2) {
    // ひょうたん型
    vase = `<path d="M${cx-8},${vt} C${cx-8},${vt+6} ${cx-22},${vt+14} ${cx-22},${vt+26} C${cx-22},${vt+36} ${cx-11},${vt+41} ${cx-11},${vt+48} C${cx-11},${vt+56} ${cx-28},${vt+64} ${cx-28},${vb-10} C${cx-28},${vb-2} ${cx-14},${vb} ${cx-14},${vb} L${cx+14},${vb} C${cx+14},${vb} ${cx+28},${vb-2} ${cx+28},${vb-10} C${cx+28},${vt+64} ${cx+11},${vt+56} ${cx+11},${vt+48} C${cx+11},${vt+41} ${cx+22},${vt+36} ${cx+22},${vt+26} C${cx+22},${vt+14} ${cx+8},${vt+6} ${cx+8},${vt}Z" fill="${vaseCol}"/>
      <ellipse cx="${cx}" cy="${vb}" rx="15" ry="4" fill="${vaseCol}"/>`;
  } else {
    // 広口アンフォラ
    vase = `<path d="M${cx-10},${vt} C${cx-10},${vt+9} ${cx-26},${vt+22} ${cx-30},${vt+44} C${cx-32},${vt+58} ${cx-22},${vb-8} ${cx-18},${vb} L${cx+18},${vb} C${cx+22},${vb-8} ${cx+32},${vt+58} ${cx+30},${vt+44} C${cx+26},${vt+22} ${cx+10},${vt+9} ${cx+10},${vt}Z" fill="${vaseCol}"/>
      <ellipse cx="${cx}" cy="${vb}" rx="20" ry="5" fill="${vaseCol}"/>`;
  }

  // 花瓶の口のハイライト（奥行き感）
  const vaseNeck = `<ellipse cx="${cx}" cy="${vt}" rx="9" ry="3" fill="${vaseCol}" opacity="0.7"/>`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  // 花瓶は安定、花＋茎は傾き＋ホバーアニメ用の2重グループ
  svg.innerHTML = `
    <g transform="rotate(${tilt},${cx},${vt})">
      <g class="flower-anim" style="transition:transform .25s cubic-bezier(.34,1.56,.64,1);">
        ${stem}${leaf}${head}
      </g>
    </g>
    ${vase}${vaseNeck}`;
  return svg;
}

// 花束サムネイル（SVG）— 互換用（旧カードで参照されている場合に備えて残す）
function makeFlowerThumb(d) {
  const W = 320, H = 160;

  function hashCode(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
    return Math.abs(h);
  }
  function seededRand(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0xffffffff; };
  }

  const seed = hashCode(d.projectName || 'default');
  const rand = seededRand(seed);

  // 背景色（淡いトーン）
  const bgs = ['#FFFDE8','#FFF0F6','#EFF6FF','#FEFCE8','#FAF5FF','#F0FDF4'];
  const bg = bgs[seed % bgs.length];
  const stemCol = '#22C55E';

  // 花ごとの花弁色・中心色
  const flowerColors = [
    { petal:'#F472B6', center:'#EC4899' }, // ピンク
    { petal:'#F97316', center:'#EA580C' }, // オレンジ
    { petal:'#FDE047', center:'#F59E0B' }, // イエロー
    { petal:'#60A5FA', center:'#FBBF24' }, // ブルー
    { petal:'#C084FC', center:'#A855F7' }, // パープル
    { petal:'#FB923C', center:'#DC2626' }, // オレンジレッド
    { petal:'#34D399', center:'#059669' }, // グリーン
  ];

  // 花束の根元（茎が集まる点）
  const baseX = W / 2, baseY = 155;

  // 花の配置定義: [角度(ラジアン), 茎の長さ, 花タイプ(0=デイジー,1=チューリップ,2=バブリー), スケール]
  const allDefs = [
    { a: -0.55, dist: 88,  type: 0, s: 0.92 },
    { a: -0.25, dist: 108, type: 2, s: 1.05 },
    { a:  0.00, dist: 118, type: 1, s: 1.15 },
    { a:  0.25, dist: 104, type: 0, s: 1.0  },
    { a:  0.52, dist: 84,  type: 2, s: 0.88 },
  ];
  const count = 3 + (seed % 3); // 3〜5本
  const defs = count === 3 ? [allDefs[0], allDefs[2], allDefs[4]]
             : count === 4 ? [allDefs[0], allDefs[1], allDefs[3], allDefs[4]]
             : allDefs;

  // 色の割り当て（シードベースでシャッフル）
  const colorOrder = [0,1,2,3,4,5,6].sort((a,b) => {
    const ra = seededRand(seed + a); const rb = seededRand(seed + b);
    return ra() - rb();
  });

  let stems = '', leaves = '', heads = '';

  defs.forEach((def, i) => {
    const col = flowerColors[colorOrder[i] % flowerColors.length];
    const cx = +(baseX + Math.sin(def.a) * def.dist).toFixed(1);
    const cy = +(baseY - Math.cos(def.a) * def.dist).toFixed(1);
    const S  = def.s;

    // 茎（花頭下部〜根元へ緩やかなカーブ）
    const midX = +((cx + baseX) / 2 + Math.sin(def.a) * 8).toFixed(1);
    const midY = +((cy + baseY) / 2).toFixed(1);
    stems += `<path d="M${cx},${(+cy + 24*S).toFixed(1)} Q${midX},${midY} ${baseX},${baseY}" stroke="${stemCol}" stroke-width="${(8*S).toFixed(1)}" stroke-linecap="round" fill="none"/>`;

    // 葉（交互に左右）
    if (i % 2 === 0) {
      const ly = +(+cy + 52*S).toFixed(1);
      const ldir = def.a >= 0 ? -1 : 1;
      const lx = +(+cx + ldir * 3).toFixed(1);
      leaves += `<path d="M${lx},${ly} C${lx+ldir*36},${+ly-18} ${lx+ldir*30},${+ly+12} ${lx},${+ly+8}Z" fill="${stemCol}"/>`;
    }

    // 花頭
    if (def.type === 0) {
      // デイジー（5枚楕円花弁）
      const R=28*S, pr=14*S, pry=19*S;
      for (let j=0; j<5; j++) {
        const ang = (j/5)*Math.PI*2 - Math.PI/2;
        const px = +(+cx + Math.cos(ang)*R).toFixed(1);
        const py = +(+cy + Math.sin(ang)*R).toFixed(1);
        const rot = +(ang*180/Math.PI+90).toFixed(1);
        heads += `<ellipse cx="${px}" cy="${py}" rx="${pr.toFixed(1)}" ry="${pry.toFixed(1)}" fill="${col.petal}" transform="rotate(${rot},${px},${py})"/>`;
      }
      heads += `<circle cx="${cx}" cy="${cy}" r="${(15*S).toFixed(1)}" fill="${col.center}"/>`;

    } else if (def.type === 1) {
      // チューリップ（カップ形）
      const W2=24*S, Ht=38*S, bot=15*S, Scp=6*S;
      heads += `<path d="M${+cx-W2},${+cy+bot} C${+cx-W2-2},${+cy-8*S} ${+cx-10*S},${+cy-Ht} ${cx},${+cy-Ht-2} C${+cx+10*S},${+cy-Ht} ${+cx+W2+2},${+cy-8*S} ${+cx+W2},${+cy+bot} Q${cx},${+cy+bot+12*S} ${+cx-W2},${+cy+bot}Z" fill="${col.petal}"/>`;
      heads += `<path d="M${+cx-Scp},${+cy-4*S} C${+cx-4*S},${+cy-26*S} ${+cx+2*S},${+cy-Ht} ${+cx+Scp},${+cy-Ht+6*S} C${+cx+8*S},${+cy-14*S} ${+cx+3*S},${+cy+3*S} ${+cx-Scp},${+cy-4*S}Z" fill="${col.center}" opacity="0.5"/>`;

    } else {
      // バブリー（6枚丸花弁）
      const R=24*S, pr=17*S;
      for (let j=0; j<6; j++) {
        const ang = (j/6)*Math.PI*2 - Math.PI/2;
        const px = +(+cx + Math.cos(ang)*R).toFixed(1);
        const py = +(+cy + Math.sin(ang)*R).toFixed(1);
        heads += `<circle cx="${px}" cy="${py}" r="${pr.toFixed(1)}" fill="${col.petal}"/>`;
      }
      heads += `<circle cx="${cx}" cy="${cy}" r="${(16*S).toFixed(1)}" fill="${col.center}"/>`;
    }
  });

  // 花束の根元リボン
  const bx = baseX, by = baseY;
  const ribbon = `<path d="M${bx-26},${by-6} Q${bx},${by+8} ${bx+26},${by-6} Q${bx+14},${by+20} ${bx},${by+22} Q${bx-14},${by+20} ${bx-26},${by-6}Z" fill="#FCD34D"/>
    <path d="M${bx-26},${by-6} Q${bx},${by+2} ${bx+26},${by-6}" stroke="#F59E0B" stroke-width="1.5" fill="none"/>`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', '100%');
  svg.setAttribute('height', '100%');
  svg.style.cssText = 'position:absolute;inset:0;';
  svg.innerHTML = `<rect width="${W}" height="${H}" fill="${bg}"/>${stems}${leaves}${ribbon}${heads}`;
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
const ISSUE_STATUSES = ['新規', '確認中', '対応中', '確認待ち', '差し戻し', '解決済み'];

const ISSUE_TYPE_STYLE = {
  '質問':   { bg: 'rgba(59,130,246,0.12)',  color: '#2563eb' },
  '確認':   { bg: 'rgba(245,158,11,0.12)',  color: '#d97706' },
  'バグ':   { bg: 'rgba(239,68,68,0.12)',   color: '#dc2626' },
  '依頼':   { bg: 'rgba(168,85,247,0.12)',  color: '#9333ea' },
  'その他': { bg: 'rgba(156,163,175,0.12)', color: '#6b7280' },
};
const ISSUE_STATUS_STYLE = {
  '新規':    { bg: 'rgba(156,163,175,0.12)', color: '#6b7280',  border: 'rgba(156,163,175,0.3)'  },
  '確認中':  { bg: 'rgba(245,158,11,0.10)',  color: '#d97706',  border: 'rgba(245,158,11,0.28)'  },
  '対応中':  { bg: 'rgba(37,99,235,0.10)',   color: '#2563eb',  border: 'rgba(37,99,235,0.28)'   },
  '確認待ち':{ bg: 'rgba(168,85,247,0.10)',  color: '#9333ea',  border: 'rgba(168,85,247,0.28)'  },
  '差し戻し':{ bg: 'rgba(239,68,68,0.10)',   color: '#dc2626',  border: 'rgba(239,68,68,0.28)'   },
  '解決済み':{ bg: 'rgba(5,150,105,0.10)',   color: '#059669',  border: 'rgba(5,150,105,0.28)'   },
};

let issueHideResolved = false;

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
  const resolvedCount = issues.filter(i => i.status === '解決済み').length;
  topBar.innerHTML = `
    <div>
      <div style="font-family:'Syne',sans-serif;font-weight:700;font-size:18px;color:var(--text);">課題リスト</div>
      <div style="font-family:'DM Mono',monospace;font-size:10px;color:var(--text3);margin-top:3px;letter-spacing:.5px;">${issues.length}件 · 解決済み ${resolvedCount}件</div>
    </div>`;

  // 解決済み非表示トグル
  const toggleBtn = document.createElement('button');
  toggleBtn.style.cssText = `display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:6px;border:1px solid var(--border2);background:${issueHideResolved ? 'var(--accent)' : 'var(--bg2)'};color:${issueHideResolved ? '#fff' : 'var(--text2)'};font-family:'DM Sans',sans-serif;font-size:12px;cursor:pointer;transition:all .15s;`;
  toggleBtn.innerHTML = `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 8s2.5-5 6-5 6 5 6 5-2.5 5-6 5-6-5-6-5z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>${issueHideResolved ? '<line x1="3" y1="3" x2="13" y2="13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' : ''}</svg>解決済みを${issueHideResolved ? '表示' : '非表示'}`;
  toggleBtn.addEventListener('click', () => {
    issueHideResolved = !issueHideResolved;
    renderIssueList();
  });
  topBar.appendChild(toggleBtn);
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

  // データ行（解決済み非表示フィルター適用）
  const visibleIssues = issueHideResolved ? issues.filter(i => i.status !== '解決済み') : issues;
  visibleIssues.forEach((issue, idx) => {
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

  // ── グリップDnD ──
  let _wikiDrag = null;
  let _wikiPlaceholder = null;
  list.querySelectorAll('.wiki-grip').forEach(grip => {
    grip.addEventListener('mousedown', e => {
      e.preventDefault();
      const wrap = grip.closest('.wiki-block');
      if (!wrap) return;
      _wikiDrag = wrap;
      const rect = wrap.getBoundingClientRect();
      wrap.style.opacity = '0.4';
      wrap.style.pointerEvents = 'none';
      _wikiPlaceholder = document.createElement('div');
      _wikiPlaceholder.style.cssText = `height:${rect.height}px;border-radius:var(--r2);background:rgba(243,242,248,0.6);border:2px dashed rgba(0,0,0,0.12);transition:height .15s;`;
      wrap.parentNode.insertBefore(_wikiPlaceholder, wrap);

      const onMove = ev => {
        const items = [...list.querySelectorAll('.wiki-block:not([style*="opacity: 0.4"])')];
        let inserted = false;
        for (const item of items) {
          const r = item.getBoundingClientRect();
          if (ev.clientY < r.top + r.height / 2) {
            list.insertBefore(_wikiPlaceholder, item);
            inserted = true; break;
          }
        }
        if (!inserted) list.appendChild(_wikiPlaceholder);
      };

      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (_wikiDrag && _wikiPlaceholder) {
          list.insertBefore(_wikiDrag, _wikiPlaceholder);
          _wikiPlaceholder.remove();
          _wikiDrag.style.opacity = '';
          _wikiDrag.style.pointerEvents = '';
          // DOM順でblocks配列を並び替え
          const newOrder = [...list.querySelectorAll('.wiki-block')].map(el => {
            const id = parseFloat(el.dataset.id);
            return getWikiBlocks().find(b => b.id === id);
          }).filter(Boolean);
          generatedData.wikiBlocks = newOrder;
          _wikiDrag = null; _wikiPlaceholder = null;
          saveSnapshot();
        }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
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

function linkifyText(text) {
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  return escaped.replace(/https?:\/\/[^\s]+/g, url => {
    const safeUrl = url.replace(/"/g,'&quot;');
    return `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer" style="color:var(--accent);text-decoration:underline;word-break:break-all;">${url}</a>`;
  });
}

function makeWikiBlock(block, i) {
  const wrap = document.createElement('div');
  wrap.className = 'wiki-block';
  wrap.dataset.id = block.id;

  // グリップハンドル（ホバーで表示）
  const grip = document.createElement('div');
  grip.className = 'wiki-grip';
  grip.title = 'ドラッグして並び替え';
  grip.style.cssText = `position:absolute;left:6px;top:50%;transform:translateY(-50%);width:16px;height:24px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;cursor:grab;opacity:0;transition:opacity .15s;z-index:4;`;
  grip.innerHTML = `<span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span>`;
  wrap.appendChild(grip);
  wrap.addEventListener('mouseenter', () => grip.style.opacity = '1');
  wrap.addEventListener('mouseleave', () => grip.style.opacity = '0');

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

    // プレビュー（URLをリンク化して表示）
    const preview = document.createElement('div');
    preview.className = 'wiki-text-preview';
    preview.style.cssText = `font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text);line-height:1.7;white-space:pre-wrap;word-break:break-all;cursor:text;min-height:20px;padding:2px 0;`;

    const updatePreview = () => {
      const val = ta.value;
      if (val) {
        preview.innerHTML = linkifyText(val);
        preview.style.display = '';
        ta.style.display = 'none';
      } else {
        preview.style.display = 'none';
        ta.style.display = '';
      }
    };

    ta.addEventListener('blur', updatePreview);
    preview.addEventListener('click', e => {
      if (e.target.tagName === 'A') return;
      preview.style.display = 'none';
      ta.style.display = '';
      ta.focus();
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
    });

    wrap.appendChild(ta);
    wrap.appendChild(preview);
    // 初期状態
    setTimeout(() => {
      ta.style.height = 'auto';
      ta.style.height = ta.scrollHeight + 'px';
      updatePreview();
    }, 0);

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
  if (n === 0 && !currentUser) { _showLoginModal(); return; }
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
  const startStr = toDateStr(today2);
  const endStr = toDateStr(end2);
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

  const prompt = `あなたは15年以上の経験を持つシニアプロジェクトマネージャーです。以下の情報をもとに、カンバン用スコープとガント用スケジュールを生成してください。

## プロジェクト情報
- プロジェクト名：${projName}
- クライアント：${projClient || '未定'}
- カテゴリ：${categories.join('・')}
- 概要：${projDesc || '（概要なし）'}
- 期間：${start} 〜 ${end}（${totalDays}日間）
- フェーズ：${phases.join(' → ')}

## メンバー
${memberList}

## 生成ルール
### メンバースコープ（kanban用）
- 各メンバーの担当業務を大項目で3〜5件定義する
- 概要・プロジェクト名の固有名詞を使う
- 詳細なサブタスクは不要

### スケジュール（gantt用）
- フェーズごとにプロジェクトの作業をブレイクダウン（メンバーとは独立）
- 各フェーズに3〜5件の作業を定義する
- 各作業に必ず2〜3件のサブ作業（children）を設定する
- 概要・プロジェクト名に合った具体的な作業名にする
- daysは親作業がサブ作業の合計と一致するよう設定

## 出力形式（JSONのみ、前後に説明文を付けない）
{
  "projectName": "${projName}",
  "members": [
    {
      "name": "メンバー名",
      "role": "ロール名",
      "tasks": [
        {
          "name": "担当業務の大項目名",
          "phase": "フェーズ名（上記フェーズのいずれか）",
          "days": 数字,
          "priority": "todo",
          "description": "業務内容の概要を1文で"
        }
      ]
    }
  ],
  "scheduleItems": [
    {
      "name": "作業名（プロジェクト固有の具体的な名前）",
      "phase": "フェーズ名（上記フェーズのいずれか）",
      "days": 数字,
      "description": "作業内容の概要",
      "children": [
        {
          "name": "サブ作業名",
          "phase": "親と同じフェーズ名",
          "days": 数字
        }
      ]
    }
  ]
}`;

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        system: 'あなたはプロジェクト管理の専門家です。指示されたJSON形式のみを出力し、前後に説明文・コードブロック記号（```）を一切付けないでください。',
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!res.ok) throw new Error(`API error: ${res.status}`);

    // ストリーミング読み取り
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop(); // 未完了行をバッファに残す
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') break;
        try {
          const event = JSON.parse(data);
          if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
            fullText += event.delta.text;
          }
        } catch { /* 不完全なJSONはスキップ */ }
      }
    }

    clearInterval(stepTimer);
    clearInterval(elapsedTimer);
    steps.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.className = 'loading-step done';
    });
    overlay.classList.remove('show');

    const text = fullText;

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
      // カンバン用スコープ（全タスクをスコープとして設定）
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
          excludeFromSchedule: true,  // カンバンはスコープのみ
          children: []
        }))
      })),
      // ガント用スケジュール（AIが概要ベースでフェーズ別生成）
      scheduleItems: (parsed.scheduleItems || []).map(item => ({
        id: Date.now() + Math.random(),
        name: item.name || '未設定',
        phase: item.phase || phases[0],
        days: Math.max(1, parseInt(item.days) || 3),
        description: item.description || '',
        startDate: null,
        endDate: null,
        children: (item.children || []).map(c => ({
          id: Date.now() + Math.random(),
          name: c.name || '未設定',
          phase: c.phase || item.phase || phases[0],
          days: Math.max(1, parseInt(c.days) || 1),
          startDate: null,
          endDate: null,
          children: []
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

    renderResult(true); // scheduleItemsはAIが生成済みのため保持
    showPanel(2);

  } catch (err) {
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
      tasks: templates.map(t => ({ ...t, excludeFromSchedule: true, children: [] }))
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

  // フェーズごとのデフォルトスケジュール項目
  const fallbackScheduleItems = phases.flatMap(phase => [
    {
      id: Date.now() + Math.random(),
      name: `${phase}：方針確認・準備`,
      phase,
      days: 3,
      description: '',
      startDate: null,
      endDate: null,
      children: [
        { id: Date.now() + Math.random(), name: '情報収集・整理', phase, days: 1, startDate: null, endDate: null, children: [] },
        { id: Date.now() + Math.random(), name: '方針確認・承認', phase, days: 2, startDate: null, endDate: null, children: [] },
      ]
    },
    {
      id: Date.now() + Math.random(),
      name: `${phase}：制作・実施`,
      phase,
      days: 5,
      description: '',
      startDate: null,
      endDate: null,
      children: [
        { id: Date.now() + Math.random(), name: 'ドラフト作成', phase, days: 3, startDate: null, endDate: null, children: [] },
        { id: Date.now() + Math.random(), name: 'レビュー・修正', phase, days: 2, startDate: null, endDate: null, children: [] },
      ]
    }
  ]);

  generatedData = {
    projectName: projName,
    tagline,
    startDate: start,
    endDate: end,
    phases,
    totalTasks: memberResults.reduce((s, m) => s + m.tasks.length, 0),
    totalDays: Math.round((new Date(end) - new Date(start)) / 86400000) || 60,
    members: memberResults,
    scheduleItems: fallbackScheduleItems
  };

  renderResult(true);
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

function recIntervalLabel(interval) {
  const n = interval || 1;
  if (n === 1) return '毎週';
  if (n === 2) return '隔週';
  return `${n}週ごと`;
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

    // 名前（インライン編集可能）
    const nameEl = document.createElement('div');
    nameEl.contentEditable = 'true';
    nameEl.textContent = r.name;
    nameEl.style.cssText = `font-size:13px;color:var(--text);font-weight:500;outline:none;border-radius:3px;padding:1px 3px;margin:-1px -3px;cursor:text;min-width:20px;`;
    nameEl.title = 'クリックして名前を変更';
    nameEl.addEventListener('focus', () => { nameEl.style.background = 'var(--bg2)'; nameEl.style.boxShadow = '0 0 0 1px var(--accent)'; });
    nameEl.addEventListener('blur', () => {
      nameEl.style.background = '';
      nameEl.style.boxShadow = '';
      const newName = nameEl.textContent.trim();
      recurringList[i].name = newName || recurringList[i].name;
      if (!newName) nameEl.textContent = recurringList[i].name;
      renderGantt();
      saveSnapshot();
    });
    nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); nameEl.blur(); } });

    const metaEl = document.createElement('div');
    metaEl.style.cssText = `font-size:11px;color:var(--text3);font-family:'DM Mono',monospace;margin-top:1px;`;
    metaEl.textContent = `${recIntervalLabel(r.interval)}${DOW_LABELS[r.dow]}曜日 ${r.time}`;

    const info = document.createElement('div');
    info.style.cssText = `flex:1;min-width:0;`;
    info.appendChild(nameEl);
    info.appendChild(metaEl);

    const delBtn = document.createElement('button');
    delBtn.innerHTML = '×';
    delBtn.style.cssText = `background:none;border:none;color:var(--text3);cursor:pointer;font-size:16px;padding:2px 6px;border-radius:4px;transition:color .15s;flex-shrink:0;`;
    delBtn.addEventListener('mouseover', () => delBtn.style.color = '#ff6b6b');
    delBtn.addEventListener('mouseout',  () => delBtn.style.color = 'var(--text3)');
    delBtn.addEventListener('click', () => removeRecurring(i));

    const dot = document.createElement('div');
    dot.style.cssText = `width:10px;height:10px;border-radius:50%;background:${r.color};flex-shrink:0;`;

    row.appendChild(dot);
    row.appendChild(info);
    row.appendChild(delBtn);
    list.appendChild(row);
  });
}

function addRecurring() {
  const name     = document.getElementById('rec-name').value.trim() || '定例MTG';
  const dow      = +document.getElementById('rec-dow').value;
  const time     = document.getElementById('rec-time').value || '10:00';
  const interval = +(document.getElementById('rec-interval')?.value || 1);
  recurringList.push({ name, dow, time, color: selectedRecColor, interval });
  document.getElementById('rec-name').value = '';
  renderRecurringList();
  // タスク期限をこの定例に合わせて調整
  adjustTasksToRecurring();
  // ガントを再描画
  renderGantt();
  // スナップショット保存（ガント共有が有効なら最新状態を自動反映）
  saveSnapshot();
}

function removeRecurring(i) {
  recurringList.splice(i, 1);
  renderRecurringList();
  renderGantt();
  saveSnapshot();
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
  nameSpan.style.cssText = `font-size:11px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;cursor:${isGuestMode?'default':'text'};`;
  if (!isGuestMode) {
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
        const barLabel = rRow.querySelector('span');
        if (barLabel) barLabel.textContent = v;
      };
      input.addEventListener('blur', commit);
      input.addEventListener('keydown', e2 => { if(e2.key==='Enter'){e2.preventDefault();input.blur();} if(e2.key==='Escape'){input.value=t.name;input.blur();} });
    });
  }

  lRow.appendChild(dot);
  lRow.appendChild(nameSpan);

  if (!isGuestMode) {
    // サブタスク追加ボタン（深さ2まで）
    if (depth < 2) {
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
      lRow.appendChild(addSubBtn);
    }

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
    lRow.appendChild(delBtn);
  }

  // ── 担当者（任意・自由入力） ──
  const assigneeWrap = document.createElement('div');
  assigneeWrap.style.cssText = `flex-shrink:0;display:flex;align-items:center;gap:3px;opacity:0;transition:opacity .15s;`;
  lRow.addEventListener('mouseenter', () => assigneeWrap.style.opacity = '1');
  lRow.addEventListener('mouseleave', () => { if (!t.assignee) assigneeWrap.style.opacity = '0'; });

  const personIcon = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="2.8" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

  const assigneeEl = document.createElement('span');
  const refreshAssignee = () => {
    if (t.assignee) {
      assigneeEl.innerHTML = `${personIcon}<span style="font-size:10px;color:var(--text2);font-family:'DM Sans',sans-serif;">${t.assignee}</span>`;
      assigneeWrap.style.opacity = '1';
    } else {
      assigneeEl.innerHTML = `${personIcon}<span style="font-size:10px;color:var(--text3);font-family:'DM Sans',sans-serif;">担当</span>`;
    }
  };
  refreshAssignee();
  assigneeEl.style.cssText = `display:flex;align-items:center;gap:2px;cursor:${isGuestMode?'default':'text'};color:var(--text3);padding:1px 5px;border-radius:4px;background:var(--bg3);border:1px solid var(--border);white-space:nowrap;`;

  if (!isGuestMode) {
    assigneeEl.title = 'クリックで担当者を入力';
    assigneeEl.addEventListener('click', e => {
      e.stopPropagation();
      const inp = document.createElement('input');
      inp.type = 'text';
      inp.value = t.assignee || '';
      inp.placeholder = '担当者名';
      inp.style.cssText = `font-size:10px;font-family:'DM Sans',sans-serif;color:var(--text);background:var(--bg3);border:1px solid var(--accent);border-radius:4px;padding:1px 5px;outline:none;width:70px;`;
      assigneeEl.replaceWith(inp);
      inp.focus(); inp.select();
      const commit = () => {
        t.assignee = inp.value.trim() || '';
        refreshAssignee();
        inp.replaceWith(assigneeEl);
        saveSnapshot();
      };
      inp.addEventListener('blur', commit);
      inp.addEventListener('keydown', e2 => {
        if (e2.key === 'Enter') { e2.preventDefault(); inp.blur(); }
        if (e2.key === 'Escape') { inp.value = t.assignee || ''; inp.blur(); }
      });
    });
  }
  assigneeWrap.appendChild(assigneeEl);
  lRow.appendChild(assigneeWrap);

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
  const barOpacity = depth >= 2 ? 0.30 : 0.45; // 孫:薄め、小タスク:やや薄め（親は別途.8）
  bar.style.cssText = `position:absolute;height:16px;top:50%;transform:translateY(-50%);border-radius:4px;background:${barColor};opacity:${barOpacity};left:${startOff*COL_W+1}px;width:${barDays*COL_W-2}px;display:flex;align-items:center;padding:0 5px 0 6px;cursor:${isGuestMode?'default':'grab'};user-select:none;box-sizing:border-box;z-index:2;transition:box-shadow .15s;`;

  const barLabel = document.createElement('span');
  barLabel.textContent = t.name;
  barLabel.style.cssText = `font-size:9px;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;flex:1;padding-left:3px;`;
  bar.appendChild(barLabel);

  let resizeHandle = null, resizeHandleLeft = null;
  if (!isGuestMode) {
    resizeHandleLeft = document.createElement('div');
    resizeHandleLeft.style.cssText = `position:absolute;left:-4px;top:50%;transform:translateY(-50%);width:9px;height:9px;border-radius:50%;background:#fff;opacity:0.88;cursor:ew-resize;z-index:3;box-shadow:0 0 0 1.5px rgba(0,0,0,0.13);`;
    bar.insertBefore(resizeHandleLeft, barLabel);

    resizeHandle = document.createElement('div');
    resizeHandle.style.cssText = `position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:9px;height:9px;border-radius:50%;background:#fff;opacity:0.88;cursor:ew-resize;z-index:3;box-shadow:0 0 0 1.5px rgba(0,0,0,0.13);`;
    bar.appendChild(resizeHandle);
  }

  bar.addEventListener('mouseenter', () => bar.style.boxShadow='0 2px 8px rgba(0,0,0,.25)');
  bar.addEventListener('mouseleave', () => bar.style.boxShadow='none');
  rRow.appendChild(bar);

  // ドラッグ・リサイズをDOMに追加後に設定（ゲストモードでは登録しない）
  if (!isGuestMode) setupChildBarDrag(bar, resizeHandle, resizeHandleLeft, mi, path, COL_W, d.startDate);

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
    const interval = r.interval || 1;

    // interval > 1 の場合: プロジェクト開始日から最初の r.dow 出現日を基準に週数カウント
    let firstOccurrence = null;
    if (interval > 1 && generatedData?.startDate) {
      const sd = parseDate(generatedData.startDate);
      const daysToFirst = (r.dow - sd.getDay() + 7) % 7;
      firstOccurrence = new Date(sd);
      firstOccurrence.setDate(firstOccurrence.getDate() + daysToFirst);
    }

    dates.forEach((dt, di) => {
      const dow = parseDate(dt).getDay();
      if (dow !== r.dow) return;
      if (r.overrides[dt] === null) return;

      // 隔週・n週ごとの場合、week番号が合わない週はスキップ
      if (interval > 1 && firstOccurrence) {
        const weeksDiff = Math.round((parseDate(dt) - firstOccurrence) / (7 * 86400000));
        if (weeksDiff < 0 || weeksDiff % interval !== 0) return;
      }

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
            saveSnapshot();
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

// ── Todayライン（スケジュール期間内に今日が含まれるとき縦線を表示）──
function drawTodayLine(gtBody, dates, COL_W, today) {
  const todayIdx = dates.indexOf(today);
  if (todayIdx < 0) return; // 期間外

  const x = todayIdx * COL_W + Math.floor(COL_W / 2);

  // 縦ライン
  const line = document.createElement('div');
  line.className = 'today-vline';
  line.style.cssText = `position:absolute;left:${x - 1}px;top:0;width:2px;height:100%;background:var(--green);opacity:.7;z-index:11;pointer-events:none;`;
  gtBody.appendChild(line);

  // TODAY ラベル（ラインの最上部に小ピル）
  const pill = document.createElement('div');
  pill.className = 'today-vline-label';
  pill.style.cssText = `position:absolute;left:${x}px;top:3px;transform:translateX(-50%);background:var(--green);color:#fff;font-family:'DM Mono',monospace;font-size:8px;letter-spacing:.8px;padding:2px 5px;border-radius:3px;white-space:nowrap;z-index:12;pointer-events:none;`;
  pill.textContent = 'TODAY';
  gtBody.appendChild(pill);
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
          saveSnapshot();
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
    closeLinePopup(); renderGantt(); saveSnapshot();
  });
  btnWrap.appendChild(skipBtn);

  if (r.overrides && r.overrides[originalDt] !== undefined) {
    const resetBtn = makePopupBtn('この回をリセット', '#9090a8', () => {
      delete recurringList[ri].overrides[originalDt];
      closeLinePopup(); renderGantt(); saveSnapshot();
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

  // 保存済みのカスタム色を優先して復元
  const savedColors = generatedData?.phaseColors || {};
  const newColors = {};
  allPhases.forEach((p, i) => {
    newColors[p] = savedColors[p] || PHASE_BAR_COLORS[p] || PHASE_DEFAULT_COLORS[i % PHASE_DEFAULT_COLORS.length];
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
  picker.onchange = () => {
    // 変更した色を generatedData に永続化してからスナップショット保存
    if (generatedData) generatedData.phaseColors = { ...PHASE_BAR_COLORS };
    renderGantt();
    saveSnapshot();
  };
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
    swatch.style.cssText = 'display:inline-block;width:10px;height:10px;border-radius:2px;background:'+color+';border:1px solid rgba(0,0,0,.2);cursor:'+(isGuestMode?'default':'pointer')+';flex-shrink:0;';
    if (!isGuestMode) {
      swatch.onclick = function(e) {
        e.stopPropagation();
        openPhasePicker(phase, this);
      };
    }

    // フェーズ名
    const nameEl = document.createElement('span');
    nameEl.textContent = phase;
    nameEl.style.cssText = 'font-size:11px;color:var(--text2);cursor:'+(isGuestMode?'default':'text')+';font-family:\'DM Sans\',sans-serif;';
    if (!isGuestMode) {
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
    }

    // 削除ボタン（ゲストモードでは非表示）
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.textContent = '×';
    if (isGuestMode) {
      delBtn.style.cssText = 'display:none;';
    } else {
      delBtn.style.cssText = 'background:none;border:none;font-size:11px;color:#bbb;cursor:pointer;padding:0 2px;line-height:1;';
      delBtn.onmouseenter = function(){ this.style.color='#dc2626'; };
      delBtn.onmouseleave = function(){ this.style.color='#bbb'; };
      delBtn.onclick = function(e) {
        e.stopPropagation();
        deletePhase(phase);
      };
    }

    item.appendChild(swatch);
    item.appendChild(nameEl);
    item.appendChild(delBtn);
    wrap.appendChild(item);
  });

  // ＋追加（ゲストモードでは非表示）
  if (isGuestMode) return;
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
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
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
        kanbanLinked: true,
        children: (t.children || []).map(c => ({
          id: Date.now() + Math.random(),
          name: c.name || '',
          phase: c.phase || t.phase || (d.phases && d.phases[0]) || '',
          days: c.days || 1,
          startDate: c.startDate || null,
          endDate: c.endDate || null,
          children: []
        }))
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
    unscheduled: true, // 日付未設定状態：バーを表示しない
    children: []
  };
  d.scheduleItems.push(newItem);
  // assignScheduleDates() は呼ばない（未設定のまま保持）
  renderGantt();
}

// 日付からフェーズを判定するヘルパー
function getPhaseForDate(d, dateStr) {
  const phases = d.phases && d.phases.length ? d.phases : ['企画','制作','確認','納品'];
  const totalDays = Math.max(1, daysBetween(d.startDate, d.endDate) + 1);
  const OVERLAP = 0.25;
  const slotUnit = Math.floor(totalDays / (phases.length - OVERLAP * (phases.length - 1)));
  for (let i = phases.length - 1; i >= 0; i--) {
    const startOffset = Math.round(i * slotUnit * (1 - OVERLAP));
    const slotStart = addDays(d.startDate, Math.min(startOffset, totalDays - 1));
    if (dateStr >= slotStart) return phases[i];
  }
  return phases[0];
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
      if (item.unscheduled) return; // 日付未設定アイテムはスキップ
      const scaled = Math.max(1, Math.round((item.days || 3) / totalTaskDays * slotDays));
      item.startDate = cursor > slot.end ? slot.end : cursor;
      item.endDate   = addDays(item.startDate, scaled - 1);
      if (item.endDate > slot.end) item.endDate = slot.end;
      item.days = Math.max(1, daysBetween(item.startDate, item.endDate) + 1);
      cursor = addDays(item.endDate, 1);

      // childrenにも親の期間内で日付を割り振る
      if (item.children && item.children.length) {
        const totalChildDays = item.children.reduce((s, c) => s + (c.days || 1), 0);
        const parentDays = Math.max(1, daysBetween(item.startDate, item.endDate) + 1);
        let childCursor = item.startDate;
        item.children.forEach(child => {
          if (child.startDate && child.endDate) { childCursor = addDays(child.endDate, 1); return; }
          const childScaled = Math.max(1, Math.round((child.days || 1) / totalChildDays * parentDays));
          child.startDate = childCursor > item.endDate ? item.endDate : childCursor;
          child.endDate   = addDays(child.startDate, childScaled - 1);
          if (child.endDate > item.endDate) child.endDate = item.endDate;
          child.days = Math.max(1, daysBetween(child.startDate, child.endDate) + 1);
          childCursor = addDays(child.endDate, 1);
        });
      }
    });
  });
}

// ── スケジュールの子タスク再帰描画（サブ・孫タスク対応）──
function renderScheduleChildren(children, parentItem, depth, d, dates, gridW, COL_W, ROW_H, phaseColor, phase, gtLeftBody, gtRightBody, container) {
  const MAX_DEPTH = 2;
  const indent = depth * 14;
  const bgAlpha = depth === 1 ? 'rgba(243,242,248,0.95)' : 'rgba(226,230,239,0.95)';
  const barAlpha = depth === 1 ? '70' : '30'; // 小タスク:44%、孫タスク:19%（親ddは87%）
  const rowH = ROW_H - depth * 4;
  const tooltip = container.querySelector('#gt-tooltip');
  const ttName  = container.querySelector('#gt-tt-name');
  const ttDates = container.querySelector('#gt-tt-dates');

  // startDate が早い順に並び替え（unscheduled は末尾、null は末尾）
  children.sort((a, b) => {
    if (a.unscheduled && !b.unscheduled) return 1;
    if (!a.unscheduled && b.unscheduled) return -1;
    const sa = a.startDate || d.startDate;
    const sb = b.startDate || d.startDate;
    if (sa < sb) return -1;
    if (sa > sb) return  1;
    return 0;
  });

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
    if (isGuestMode) {
      cHandle.style.cssText=`width:10px;flex-shrink:0;`;
    } else {
      cHandle.style.cssText=`width:10px;flex-shrink:0;cursor:grab;display:flex;flex-direction:column;gap:2px;align-items:center;opacity:0.2;`;
      cHandle.innerHTML='<span style="display:block;width:7px;height:1px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:7px;height:1px;background:var(--text3);border-radius:1px;"></span>';
      lcRow.addEventListener('mouseenter',()=>cHandle.style.opacity='0.6');
      lcRow.addEventListener('mouseleave',()=>cHandle.style.opacity='0.2');
    }

    // 孫タスク（depth=2）は別タスクへの移動ドラッグ対応
    if (depth === 2 && !isGuestMode) {
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
    cName.textContent=child.name;
    if (isGuestMode) {
      cName.style.cssText=`font-size:12px;color:var(--text2);flex:1;outline:none;white-space:nowrap;overflow:hidden;cursor:default;`;
    } else {
      cName.contentEditable='true';
      cName.style.cssText=`font-size:12px;color:var(--text2);flex:1;outline:none;white-space:nowrap;overflow:hidden;cursor:text;`;
      cName.addEventListener('input',()=>{
        const v=cName.textContent.trim()||child.name; child.name=v;
        const bl=document.getElementById(cBarLabelId); if(bl) bl.textContent=v;
      });
      cName.addEventListener('blur',()=>renderGantt());
      cName.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();cName.blur();}});
    }


    const cDel = document.createElement('button');
    cDel.type='button'; cDel.textContent='×';
    if (isGuestMode) {
      cDel.style.cssText=`display:none;`;
    } else {
      cDel.style.cssText=`background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:0 2px;opacity:0;flex-shrink:0;`;
      lcRow.addEventListener('mouseenter',()=>cDel.style.opacity='1');
      lcRow.addEventListener('mouseleave',()=>cDel.style.opacity='0');
      cDel.onmouseenter=()=>cDel.style.color='#dc2626';
      cDel.onmouseleave=()=>cDel.style.color='var(--text3)';
      cDel.onclick=e=>{ e.stopPropagation(); parentItem.children.splice(ci,1); renderGantt(); };
    }

    // ── 担当者（任意・自由入力） ──
    const cAssigneeWrap = document.createElement('div');
    cAssigneeWrap.style.cssText = `flex-shrink:0;display:flex;align-items:center;gap:3px;opacity:0;transition:opacity .15s;`;
    lcRow.addEventListener('mouseenter', () => cAssigneeWrap.style.opacity = '1');
    lcRow.addEventListener('mouseleave', () => { if (!child.assignee) cAssigneeWrap.style.opacity = '0'; });
    const cPersonIcon = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="2.8" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;
    const cAssigneeEl = document.createElement('span');
    const refreshCAssignee = () => {
      if (child.assignee) {
        cAssigneeEl.innerHTML = `${cPersonIcon}<span style="font-size:10px;color:var(--text2);font-family:'DM Sans',sans-serif;">${child.assignee}</span>`;
        cAssigneeWrap.style.opacity = '1';
      } else {
        cAssigneeEl.innerHTML = `${cPersonIcon}<span style="font-size:10px;color:var(--text3);font-family:'DM Sans',sans-serif;">担当</span>`;
      }
    };
    refreshCAssignee();
    cAssigneeEl.style.cssText = `display:flex;align-items:center;gap:2px;cursor:${isGuestMode?'default':'text'};color:var(--text3);padding:1px 5px;border-radius:4px;background:var(--bg3);border:1px solid var(--border);white-space:nowrap;`;
    if (!isGuestMode) {
      cAssigneeEl.addEventListener('click', e => {
        e.stopPropagation();
        const inp = document.createElement('input');
        inp.type='text'; inp.value=child.assignee||''; inp.placeholder='担当者名';
        inp.style.cssText=`font-size:10px;font-family:'DM Sans',sans-serif;color:var(--text);background:var(--bg3);border:1px solid var(--accent);border-radius:4px;padding:1px 5px;outline:none;width:70px;`;
        cAssigneeEl.replaceWith(inp); inp.focus(); inp.select();
        const commit = () => { child.assignee=inp.value.trim()||''; refreshCAssignee(); inp.replaceWith(cAssigneeEl); saveSnapshot(); };
        inp.addEventListener('blur', commit);
        inp.addEventListener('keydown', e2 => { if(e2.key==='Enter'){e2.preventDefault();inp.blur();} if(e2.key==='Escape'){inp.value=child.assignee||'';inp.blur();} });
      });
    }
    cAssigneeWrap.appendChild(cAssigneeEl);

    // 孫タスク折りたたみボタン（depth=1 かつ孫がある場合のみ）
    const hasGrandChildren = depth === 1 && child.children && child.children.length > 0;
    const collapseBtn = hasGrandChildren ? document.createElement('button') : null;
    if (collapseBtn) {
      const isCollapsed = !!child._collapsed;
      collapseBtn.type = 'button';
      collapseBtn.style.cssText = `background:none;border:none;padding:0 2px;cursor:pointer;flex-shrink:0;color:var(--text3);display:flex;align-items:center;opacity:0.6;transition:opacity .15s;`;
      collapseBtn.innerHTML = isCollapsed
        ? `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 4l2 2 2-2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : `<svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M3 6l2-2 2 2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
      collapseBtn.addEventListener('click', e => {
        e.stopPropagation();
        child._collapsed = !child._collapsed;
        renderGantt();
      });
    }

    lcRow.appendChild(cHandle);
    if (collapseBtn) lcRow.appendChild(collapseBtn);
    lcRow.appendChild(cName);
    lcRow.appendChild(cAssigneeWrap);
    lcRow.appendChild(cDel);

    // 右行・バー
    const today = toDateStr(new Date());
    const rcRow = document.createElement('div');
    rcRow.style.cssText=`width:${gridW}px;height:${rowH}px;border-bottom:1px solid var(--border);position:relative;overflow:hidden;box-sizing:border-box;`;
    dates.forEach((dt,di)=>{
      const off = isOffDay(dt);
      const isT  = dt === today;
      const isMStart = dt.endsWith('-01') || dt === d.startDate;
      const cellBg = isT ? 'rgba(91,78,245,0.04)' : off ? 'rgba(0,0,0,0.025)' : bgAlpha;
      const dcell = document.createElement('div');
      dcell.style.cssText=`position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${cellBg};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
      rcRow.appendChild(dcell);
    });

    // ── 日付未設定（unscheduled）: 空行 + ドラッグで期間を設定 ──
    if (child.unscheduled) {
      rcRow.style.cursor = 'crosshair';
      const hintEl = document.createElement('div');
      hintEl.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;padding:0 14px;pointer-events:none;`;
      hintEl.innerHTML = `<span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--border2);letter-spacing:.5px;user-select:none;">ドラッグして期間をセット</span>`;
      rcRow.appendChild(hintEl);

      if (!isGuestMode) {
        let previewBar = null;
        let startDragIdx = -1;
        rcRow.addEventListener('mousedown', e => {
          if (e.button !== 0) return;
          e.preventDefault();
          const rect = rcRow.getBoundingClientRect();
          startDragIdx = Math.max(0, Math.min(Math.floor((e.clientX - rect.left) / COL_W), dates.length - 1));
          previewBar = document.createElement('div');
          previewBar.style.cssText = `position:absolute;left:${startDragIdx * COL_W + 1}px;top:3px;width:${COL_W - 2}px;height:${rowH - 8}px;background:${phaseColor};opacity:.55;border-radius:99px;pointer-events:none;z-index:10;`;
          rcRow.appendChild(previewBar);
          hintEl.style.display = 'none';
          const onMove = ev => {
            const idx = Math.max(startDragIdx, Math.min(Math.floor((ev.clientX - rect.left) / COL_W), dates.length - 1));
            if (previewBar) previewBar.style.width = Math.max(COL_W - 2, (idx - startDragIdx + 1) * COL_W - 2) + 'px';
          };
          const onUp = ev => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (!previewBar) return;
            const endIdx = Math.max(startDragIdx, Math.min(Math.floor((ev.clientX - rect.left) / COL_W), dates.length - 1));
            child.startDate = dates[startDragIdx];
            child.endDate = dates[endIdx];
            child.days = daysBetween(child.startDate, child.endDate) + 1;
            delete child.unscheduled;
            saveSnapshot();
            renderGantt();
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
      }

      gtLeftBody.appendChild(lcRow);
      gtRightBody.appendChild(rcRow);
      if (child.children && child.children.length && !child._collapsed) {
        renderScheduleChildren(child.children, child, depth+1, d, dates, gridW, COL_W, ROW_H, phaseColor, phase, gtLeftBody, gtRightBody, container);
      }
      return;
    }

    // 子を持つ場合はタグライン風（非インタラクティブ）、リーフはフルバー（インタラクティブ）
    const hasSubChildren = child.children && child.children.length > 0;
    const cBarLeft = cOff * COL_W + 1;

    const cBar = document.createElement('div');
    cBar.setAttribute('data-phase', phase);

    const cBarLabel = document.createElement('span');
    cBarLabel.id = cBarLabelId;
    cBarLabel.textContent = child.name;

    if (child.isMilestone) {
      // ── ダイヤモンド（小タスクのマイルストーン）──
      const mSize = rowH - 6;
      const mCenter = cBarLeft + COL_W / 2;
      cBar.style.cssText = `position:absolute;left:${mCenter - mSize/2}px;top:50%;transform:translateY(-50%) rotate(45deg);width:${mSize}px;height:${mSize}px;background:${phaseColor};border-radius:2px;cursor:${isGuestMode?'default':'grab'};user-select:none;z-index:3;`;
      cBarLabel.style.cssText = `position:absolute;left:${mCenter + mSize/2 + 4}px;top:50%;transform:translateY(-50%);font-size:10px;color:var(--text2);white-space:nowrap;pointer-events:none;font-family:'DM Sans',sans-serif;z-index:1;`;
      if (!isGuestMode) {
        let cMsMoved = false;
        cBar.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          cMsMoved = false;
          cBar.style.cursor = 'grabbing';
          const startX = e.clientX;
          const origOff = cOff;
          const onMove = ev => {
            if (Math.abs(ev.clientX - startX) > 3) cMsMoved = true;
            const cd = Math.round((ev.clientX - startX) / COL_W);
            const newOff = Math.max(0, origOff + cd);
            cBar.style.left = (newOff * COL_W + COL_W/2 - mSize/2) + 'px';
            cBarLabel.style.left = (newOff * COL_W + COL_W/2 + mSize/2 + 4) + 'px';
          };
          const onUp = ev => {
            cBar.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
            const cd = Math.round((ev.clientX - startX) / COL_W);
            if (cd === 0) return;
            child.startDate = addDays(child.startDate || d.startDate, cd);
            child.endDate   = child.startDate;
            child.days      = 1;
            renderGantt();
          };
          document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });
        cBar.addEventListener('click', e => {
          if (cMsMoved) return;
          e.stopPropagation();
          document.querySelectorAll('.gantt-bar-popup').forEach(p=>p.remove());
          showBarPopup(e, child);
        });
      }
    } else if (hasSubChildren) {
      // ── タグライン風（子を持つ小タスク：ドラッグで配下ごと移動）──
      const cDotSz = depth === 1 ? 6 : 5;
      const cLineH = depth === 1 ? 3 : 2;
      const cBarOp = depth === 1 ? 0.65 : 0.45;
      const cBarW  = Math.max(cDotSz * 2 + 2, cW);
      // クリック判定用ヒットエリアを広げるため高さを確保してcursorをgrabに
      cBar.style.cssText = `position:absolute;left:${cBarLeft}px;top:50%;transform:translateY(-50%);width:${cBarW}px;height:${Math.max(cDotSz, 16)}px;cursor:${isGuestMode?'default':'grab'};user-select:none;z-index:2;`;
      const cLine = document.createElement('div');
      cLine.style.cssText = `position:absolute;left:${cDotSz/2}px;top:50%;transform:translateY(-50%);width:${Math.max(0,cBarW-cDotSz)}px;height:${cLineH}px;background:${phaseColor};opacity:${cBarOp};border-radius:99px;pointer-events:none;`;
      const cDotL = document.createElement('div');
      cDotL.style.cssText = `position:absolute;left:0;top:50%;transform:translateY(-50%);width:${cDotSz}px;height:${cDotSz}px;border-radius:50%;background:${phaseColor};opacity:${Math.min(1,cBarOp+0.2)};pointer-events:none;`;
      const cDotR = document.createElement('div');
      cDotR.style.cssText = `position:absolute;right:0;top:50%;transform:translateY(-50%);width:${cDotSz}px;height:${cDotSz}px;border-radius:50%;background:${phaseColor};opacity:${Math.min(1,cBarOp+0.2)};pointer-events:none;`;
      cBar.appendChild(cLine); cBar.appendChild(cDotL); cBar.appendChild(cDotR);
      cBarLabel.style.cssText = `position:absolute;left:${cBarLeft + cBarW + 4}px;top:50%;transform:translateY(-50%);font-size:${depth===1?'10':'9'}px;color:var(--text3);white-space:nowrap;pointer-events:none;font-family:'DM Sans',sans-serif;z-index:1;`;
      if (!isGuestMode) {
        let tagMoved = false;
        cBar.addEventListener('mousedown', e => {
          e.preventDefault(); e.stopPropagation();
          tagMoved = false;
          cBar.style.cursor = 'grabbing';
          const startX = e.clientX;
          const origOff = cOff;
          const origBarW = cBarW;
          const onMove = ev => {
            if (Math.abs(ev.clientX - startX) > 3) tagMoved = true;
            const cd = Math.round((ev.clientX - startX) / COL_W);
            const newLeft = Math.max(0, origOff + cd) * COL_W + 1;
            cBar.style.left = newLeft + 'px';
            cBarLabel.style.left = (newLeft + origBarW + 4) + 'px';
          };
          const onUp = ev => {
            cBar.style.cursor = 'grab';
            document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
            const cd = Math.round((ev.clientX - startX) / COL_W);
            if (cd === 0) return;
            const shiftItems = items => items && items.forEach(c => {
              if (c.startDate) c.startDate = addDays(c.startDate, cd);
              if (c.endDate)   c.endDate   = addDays(c.endDate,   cd);
              if (c.children)  shiftItems(c.children);
            });
            if (child.startDate) child.startDate = addDays(child.startDate, cd);
            if (child.endDate)   child.endDate   = addDays(child.endDate,   cd);
            shiftItems(child.children);
            renderGantt();
          };
          document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
        });
        cBar.addEventListener('click', e => {
          if (tagMoved) return;
          e.stopPropagation();
          document.querySelectorAll('.gantt-bar-popup').forEach(p=>p.remove());
          showBarPopup(e, child);
        });
      }
    } else {
      // ── フルバー（リーフ = 直接編集可能）──
      cBar.style.cssText=`position:absolute;left:${cBarLeft}px;top:3px;width:${Math.max(4,cW)}px;height:${rowH-8}px;background:${phaseColor}${barAlpha};border-radius:99px;overflow:visible;cursor:${isGuestMode?'default':'grab'};user-select:none;z-index:2;`;
      cBarLabel.style.cssText=`position:absolute;left:${cBarLeft+Math.max(4,cW)+4}px;top:50%;transform:translateY(-50%);font-size:${depth===1?'10':'9'}px;color:var(--text2);white-space:nowrap;pointer-events:none;font-family:'DM Sans',sans-serif;z-index:1;`;

      if (!isGuestMode) {
        // リサイズハンドル（左）
        const cResizeLeft = document.createElement('div');
        cResizeLeft.style.cssText=`position:absolute;left:-4px;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;background:#fff;opacity:0.85;cursor:ew-resize;z-index:3;box-shadow:0 0 0 1.5px rgba(0,0,0,0.12);`;
        cBar.appendChild(cResizeLeft);
        // リサイズハンドル（右）
        const cResize = document.createElement('div');
        cResize.style.cssText=`position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:8px;height:8px;border-radius:50%;background:#fff;opacity:0.85;cursor:ew-resize;z-index:3;box-shadow:0 0 0 1.5px rgba(0,0,0,0.12);`;
        cBar.appendChild(cResize);

        // ドラッグ（移動量追跡でクリックと区別）
        let cBarMoved = false;
        cBar.addEventListener('mousedown', e=>{
          if(e.target===cResize||e.target===cResizeLeft) return;
          e.preventDefault(); e.stopPropagation();
          if(tooltip) tooltip.style.display='none';
          cBar.style.cursor='grabbing';
          cBarMoved = false;
          const origColIdx = cOff;
          const startX = e.clientX;
          const origStart = child.startDate || d.startDate;
          const origEnd   = child.endDate   || addDays(origStart, (child.days||2)-1);
          const barW = parseInt(cBar.style.width);
          const onMove=ev=>{
            if(Math.abs(ev.clientX-startX)>3) cBarMoved=true;
            const cd=Math.round((ev.clientX-startX)/COL_W);
            const newColIdx=Math.max(0,origColIdx+cd);
            cBar.style.left=(newColIdx*COL_W+1)+'px';
            cBarLabel.style.left=(newColIdx*COL_W+1+barW+4)+'px';
          };
          const onUp=ev=>{
            cBar.style.cursor='grab';
            document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp);
            const finalDelta=Math.round((ev.clientX-startX)/COL_W);
            if(finalDelta===0){cBar.style.left=(origColIdx*COL_W+1)+'px';return;}
            child.startDate=addDays(origStart,finalDelta);
            child.endDate=addDays(origEnd,finalDelta);
            child.days=Math.max(1,daysBetween(child.startDate,child.endDate)+1);
            child.phase=getPhaseForDate(d,child.startDate);
            renderGantt();
          };
          document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
        });
        cBar.addEventListener('click', e=>{
          if(cBarMoved) return;
          e.stopPropagation();
          document.querySelectorAll('.gantt-bar-popup').forEach(p=>p.remove());
          showBarPopup(e, child);
        });

        // 右リサイズ
        cResize.addEventListener('mousedown',e=>{
          e.preventDefault(); e.stopPropagation();
          const sx=e.clientX, ow=parseInt(cBar.style.width), ol=parseInt(cBar.style.left);
          const onMove=ev=>{
            const newW=Math.max(COL_W,ow+Math.round((ev.clientX-sx)/COL_W)*COL_W);
            cBar.style.width=newW+'px';
            cBarLabel.style.left=(ol+newW+4)+'px';
          };
          const onUp=ev=>{
            document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp);
            const cd=Math.round((ev.clientX-sx)/COL_W); if(cd===0) return;
            child.days=Math.max(1,(child.days||2)+cd);
            child.endDate=addDays(child.startDate||d.startDate,child.days-1);
            renderGantt();
          };
          document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
        });

        // 左リサイズ
        cResizeLeft.addEventListener('mousedown', e=>{
          e.preventDefault(); e.stopPropagation();
          const startX=e.clientX;
          const origColIdx=cOff;
          const origWidth=parseInt(cBar.style.width);
          const onMove=ev=>{
            const colDelta=Math.round((ev.clientX-startX)/COL_W);
            const newLeft=Math.max(0,origColIdx+colDelta)*COL_W+1;
            const newW=Math.max(COL_W,origWidth-colDelta*COL_W);
            cBar.style.left=newLeft+'px';
            cBar.style.width=newW+'px';
            cBarLabel.style.left=(newLeft+newW+4)+'px';
          };
          const onUp=ev=>{
            document.removeEventListener('mousemove',onMove); document.removeEventListener('mouseup',onUp);
            const colDelta=Math.round((ev.clientX-startX)/COL_W); if(colDelta===0) return;
            child.startDate=addDays(d.startDate,origColIdx+colDelta);
            child.days=Math.max(1,Math.round((parseInt(cBar.style.width))/COL_W));
            child.endDate=addDays(child.startDate,child.days-1);
            child.phase=getPhaseForDate(d,child.startDate);
            renderGantt();
          };
          document.addEventListener('mousemove',onMove); document.addEventListener('mouseup',onUp);
        });
      } // end !isGuestMode
    }

    // ツールチップ
    cBar.addEventListener('mouseenter',e=>{ if(tooltip&&ttName&&ttDates){ ttName.textContent=child.name; ttDates.textContent=`${cEffStart} 〜 ${cEffEnd}（${cDays}日）`; tooltip.style.display='block'; } });
    cBar.addEventListener('mousemove',e=>{ if(tooltip){ tooltip.style.left=(e.clientX+12)+'px'; tooltip.style.top=(e.clientY-10)+'px'; } });
    cBar.addEventListener('mouseleave',()=>{ if(tooltip) tooltip.style.display='none'; });

    rcRow.appendChild(cBar);
    rcRow.appendChild(cBarLabel);

    // 左右同時追加
    gtLeftBody.appendChild(lcRow);
    gtRightBody.appendChild(rcRow);

    // 孫タスクを再帰描画（折りたたまれていない場合のみ）
    if (child.children && child.children.length && !child._collapsed) {
      renderScheduleChildren(child.children, child, depth+1, d, dates, gridW, COL_W, ROW_H, phaseColor, phase, gtLeftBody, gtRightBody, container);
    }
  });
}


let currentGanttView = 'member';
let ganttLabelWidth = 280;
let ganttColWidth = 28; // ズーム用カラム幅（デフォルト28px = 100%）
const GANTT_COL_DEFAULT = 28;
const GANTT_COL_STEPS = [8, 10, 12, 16, 20, 28, 36, 48]; // ズームステップ
let isGuestMode   = false; // 共有URLまたはviewer権限のとき true
let isMasterRole  = true;  // master権限のとき true（デフォルトtrue：未ログイン時はフル操作）

// ガント左カラムのドラッグリサイズを初期化する
function attachGanttColResize(container) {
  const handle  = container.querySelector('#gt-col-resize');
  const gtLeft  = container.querySelector('#gt-left');
  if (!handle || !gtLeft) return;

  handle.addEventListener('mouseenter', () => handle.style.background = 'var(--border2)');
  handle.addEventListener('mouseleave', () => { if (!handle._dragging) handle.style.background = 'transparent'; });

  handle.addEventListener('mousedown', ev => {
    ev.preventDefault();
    handle._dragging = true;
    handle.style.background = 'var(--accent)';
    const startX = ev.clientX;
    const startW = gtLeft.offsetWidth;

    const onMove = ev2 => {
      const newW = Math.max(140, Math.min(480, startW + ev2.clientX - startX));
      gtLeft.style.width    = newW + 'px';
      gtLeft.style.minWidth = newW + 'px';
    };
    const onUp = () => {
      handle._dragging = false;
      handle.style.background = 'transparent';
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup',   onUp);
      ganttLabelWidth = gtLeft.offsetWidth; // 次回レンダリング時に引き継ぐ
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  });
}

function ganttZoom(dir) {
  const idx = GANTT_COL_STEPS.indexOf(ganttColWidth);
  const cur = idx >= 0 ? idx : GANTT_COL_STEPS.indexOf(GANTT_COL_DEFAULT);
  const next = Math.max(0, Math.min(GANTT_COL_STEPS.length - 1, cur + dir));
  ganttColWidth = GANTT_COL_STEPS[next];
  // パーセント表示更新
  const label = document.getElementById('gantt-zoom-label');
  if (label) label.textContent = Math.round(ganttColWidth / GANTT_COL_DEFAULT * 100) + '%';
  // ±ボタンの活性制御
  const btnOut = document.getElementById('gantt-zoom-out');
  const btnIn  = document.getElementById('gantt-zoom-in');
  if (btnOut) btnOut.style.opacity = next === 0 ? '0.3' : '1';
  if (btnIn)  btnIn.style.opacity  = next === GANTT_COL_STEPS.length - 1 ? '0.3' : '1';
  // 再描画
  if (currentGanttView === 'phase') renderGanttByPhase();
  else renderGantt();
}

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

  const COL_W  = ganttColWidth;
  const ROW_H  = 36;
  const LABEL_W = ganttLabelWidth;
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
    <div id="gt-inner" style="display:flex;flex:1;min-height:0;overflow:hidden;">
      <div id="gt-left" style="width:${LABEL_W}px;min-width:${LABEL_W}px;flex-shrink:0;display:flex;flex-direction:column;min-height:0;">
        <div id="gt-left-head" style="flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--border);">
          <div style="height:22px;border-bottom:1px solid var(--border);"></div>
          <div style="height:22px;border-bottom:1px solid var(--border);display:flex;">
            ${monthGroups.map(mg=>`<div style="width:${mg.count*COL_W}px;min-width:${mg.count*COL_W}px;padding:4px 8px;font-family:'Syne',sans-serif;font-size:11px;font-weight:600;color:var(--text2);border-right:1px solid var(--border2);white-space:nowrap;box-sizing:border-box;background:var(--bg2);">${mg.label}</div>`).join('')}
          </div>
          <div style="height:18px;border-bottom:1px solid var(--border);"></div>
        </div>
        <div id="gt-left-body" style="flex:1;overflow-y:scroll;overflow-x:hidden;scrollbar-width:none;"></div>
      </div>
      <div id="gt-col-resize" style="width:5px;flex-shrink:0;cursor:col-resize;background:transparent;border-left:1px solid var(--border2);border-right:1px solid var(--border2);transition:background .15s;z-index:15;box-sizing:border-box;" title="ドラッグで幅を変更"></div>
      <div id="gt-right" style="flex:1;min-width:0;overflow:auto;display:flex;flex-direction:column;">
        <div id="gt-right-head" style="flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:10;width:${gridW}px;">
          <div style="display:flex;height:22px;border-bottom:1px solid var(--border);background:var(--bg2);">
            ${dates.map((dt,di)=>{ const isMStart=dt.endsWith('-01')||dt===d.startDate; return `<div style="width:${COL_W}px;min-width:${COL_W}px;background:var(--bg2);border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;"></div>`; }).join('')}
          </div>
          <div style="display:flex;height:22px;border-bottom:1px solid var(--border);background:var(--bg2);">
            ${dates.map((dt,di)=>{ const [,m2,day]=dt.split('-'); const isFirst=day==='01'||dt===d.startDate; return `<div style="width:${COL_W}px;min-width:${COL_W}px;text-align:center;font-family:'DM Mono',monospace;font-size:${COL_W<14?'7':'9'}px;padding:3px 0;color:var(--text3);background:var(--bg2);border-left:${isFirst?'1px solid var(--border2)':'none'};box-sizing:border-box;overflow:hidden;">${isFirst?parseInt(m2)+'月':''}</div>`; }).join('')}
          </div>
          <div style="display:flex;height:18px;border-bottom:1px solid var(--border);background:var(--bg2);">
            ${dates.map((dt,di)=>{ const DOW_JP=['日','月','火','水','木','金','土']; const dow=parseDate(dt).getDay(); const isT=dt===today; const col=isT?'var(--accent)':dow===0||isHoliday(dt)?'#dc2626':dow===6?'#2563eb':'var(--text3)'; return `<div style="width:${COL_W}px;min-width:${COL_W}px;text-align:center;font-family:'DM Mono',monospace;font-size:8px;padding:1px 0 3px;color:${col};background:var(--bg2);overflow:hidden;">${COL_W>=14?DOW_JP[dow]:''}</div>`; }).join('')}
          </div>
        </div>
        <div id="gt-right-body" style="position:relative;width:${gridW}px;background-image:repeating-linear-gradient(to right,rgba(0,0,0,0.04) 0px,rgba(0,0,0,0.04) 1px,transparent 1px,transparent ${COL_W}px);"></div>
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

  // 左カラム幅リサイズ
  attachGanttColResize(container);

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
    lPhaseRow.style.cssText = `display:flex;align-items:center;background:var(--bg2);border-bottom:1px solid var(--border);height:34px;overflow:hidden;padding:0 10px 0 6px;gap:6px;`;
    lPhaseRow.setAttribute('data-phase-row', phase);

    // ドラッグハンドル（masterのみ表示）
    const phaseHandle = document.createElement('div');
    if (!isMasterRole) {
      phaseHandle.style.cssText = `width:14px;flex-shrink:0;`;
    } else {
      phaseHandle.style.cssText = `width:14px;flex-shrink:0;cursor:grab;display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;opacity:0.2;padding:4px 0;`;
      phaseHandle.innerHTML = '<span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span>';
      lPhaseRow.addEventListener('mouseenter', () => phaseHandle.style.opacity = '0.5');
      lPhaseRow.addEventListener('mouseleave', () => phaseHandle.style.opacity = '0.2');
    }

    // フェーズ色ドット＋名前
    const phaseDot = document.createElement('div');
    phaseDot.style.cssText = `width:10px;height:10px;border-radius:2px;background:${phaseColor};flex-shrink:0;`;
    const phaseNameEl = document.createElement('div');
    phaseNameEl.style.cssText = `font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--text2);flex:1;`;
    phaseNameEl.textContent = phase;

    lPhaseRow.appendChild(phaseHandle);
    lPhaseRow.appendChild(phaseDot);
    lPhaseRow.appendChild(phaseNameEl);
    if (isMasterRole) {
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
      lPhaseRow.appendChild(phaseAddBtn);
    }
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
    rPhaseRow.style.cssText = `width:${gridW}px;height:34px;background:var(--bg2);border-bottom:1px solid var(--border);position:relative;overflow:visible;`;
    dates.forEach((dt, di) => {
      const off = isOffDay(dt); const isT = dt===today;
      const isMStart = dt.endsWith('-01')||dt===d.startDate;
      const cell = document.createElement('div');
      cell.style.cssText = `position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${isT?'rgba(91,78,245,0.06)':off?'rgba(0,0,0,0.03)':'var(--bg2)'};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
      rPhaseRow.appendChild(cell);
    });
    // タグラインスパン線（フェーズ内の最早〜最遅日を自動計算）
    if (tasks.length) {
      const allStarts = tasks.map(({t}) => t.startDate || d.startDate);
      const allEnds   = tasks.map(({t}) => t.endDate || addDays(t.startDate || d.startDate, (t.days||1)-1));
      const minStart  = allStarts.reduce((a,b) => a < b ? a : b);
      const maxEnd    = allEnds.reduce((a,b) => a > b ? a : b);
      const spanOff   = Math.max(0, daysBetween(d.startDate, minStart));
      const spanDays  = Math.max(1, daysBetween(minStart, maxEnd) + 1);
      const spanLeft  = spanOff * COL_W + 4;
      const spanW     = Math.max(0, Math.min(spanDays * COL_W - 8, gridW - spanLeft));
      const dotSize   = 7;
      // 細い線
      const spanLine = document.createElement('div');
      spanLine.style.cssText = `position:absolute;left:${spanLeft + dotSize/2}px;top:50%;transform:translateY(-50%);width:${Math.max(0, spanW - dotSize)}px;height:2px;background:${phaseColor};opacity:0.75;pointer-events:none;z-index:4;`;
      // 左端ドット
      const dotL = document.createElement('div');
      dotL.style.cssText = `position:absolute;left:${spanLeft}px;top:50%;transform:translateY(-50%);width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${phaseColor};opacity:0.9;pointer-events:none;z-index:5;`;
      // 右端ドット
      const dotR = document.createElement('div');
      dotR.style.cssText = `position:absolute;left:${spanLeft + spanW - dotSize}px;top:50%;transform:translateY(-50%);width:${dotSize}px;height:${dotSize}px;border-radius:50%;background:${phaseColor};opacity:0.9;pointer-events:none;z-index:5;`;
      rPhaseRow.appendChild(spanLine);
      rPhaseRow.appendChild(dotL);
      rPhaseRow.appendChild(dotR);
    }
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
      rRow.style.cssText = `width:${gridW}px;height:${ROW_H}px;border-bottom:1px solid var(--border);position:relative;overflow:hidden;box-sizing:border-box;`;
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

  // ── 最下部：フェーズ追加ボタン（masterのみ表示） ──
  if (isMasterRole) {
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
      d.phases.push(trimmed);
      const idx = Object.keys(PHASE_BAR_COLORS).length;
      PHASE_BAR_COLORS[trimmed] = PHASE_DEFAULT_COLORS[idx % PHASE_DEFAULT_COLORS.length];
      renderGanttByPhase();
      renderPhaseLegend();
    };
    lAddPhase.appendChild(addPhaseBtn);
    gtLeftBody.appendChild(lAddPhase);
  }

  const rAddPhase = document.createElement('div');
  rAddPhase.style.cssText = `width:${gridW}px;height:42px;border-bottom:1px solid var(--border);`;
  gtRightBody.appendChild(rAddPhase);

  drawRecurringLines(gtRightBody, dates, COL_W, ROW_H);
  drawTodayLine(gtRightBody, dates, COL_W, today);
}

// ── スケジュールバークリック時のポップアップ ──
function showBarPopup(e, item) {
  e.stopPropagation();
  document.querySelectorAll('.gantt-bar-popup').forEach(p => p.remove());

  const popup = document.createElement('div');
  popup.className = 'gantt-bar-popup';
  popup.style.cssText = `position:fixed;z-index:600;background:var(--bg2);border:1px solid var(--border2);border-radius:10px;padding:12px;min-width:210px;box-shadow:0 8px 28px rgba(0,0,0,.18);`;

  // 位置調整（画面内に収める）
  const rect = e.currentTarget.getBoundingClientRect();
  const top = rect.bottom + 6;
  const left = Math.min(rect.left, window.innerWidth - 230);
  popup.style.top  = top  + 'px';
  popup.style.left = left + 'px';

  // タスク名編集
  const nameLabel = document.createElement('div');
  nameLabel.style.cssText = `font-family:'DM Mono',monospace;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:var(--text3);margin-bottom:6px;`;
  nameLabel.textContent = 'タスク名';
  popup.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.value = item.name || '';
  nameInput.style.cssText = `width:100%;background:var(--bg3);border:1px solid var(--border2);border-radius:6px;padding:7px 9px;font-family:'DM Sans',sans-serif;font-size:13px;color:var(--text);outline:none;box-sizing:border-box;transition:border-color .15s;`;
  nameInput.addEventListener('focus', () => nameInput.style.borderColor = 'var(--accent)');
  nameInput.addEventListener('blur',  () => nameInput.style.borderColor = 'var(--border2)');
  nameInput.addEventListener('input', () => { item.name = nameInput.value.trim() || item.name; });
  nameInput.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); item.name = nameInput.value.trim() || item.name; popup.remove(); renderGantt(); }
    if (ev.key === 'Escape') { popup.remove(); }
  });
  popup.appendChild(nameInput);

  // セパレーター
  const sep = document.createElement('div');
  sep.style.cssText = `height:1px;background:var(--border);margin:10px 0;`;
  popup.appendChild(sep);

  // マイルストーン変更ボタン
  const msBtn = document.createElement('button');
  msBtn.type = 'button';
  msBtn.style.cssText = `display:flex;align-items:center;gap:8px;width:100%;padding:8px 10px;background:none;border:1px solid var(--border2);border-radius:7px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--text2);transition:all .15s;`;
  msBtn.onmouseover = () => { msBtn.style.borderColor='var(--accent)'; msBtn.style.color='var(--accent)'; msBtn.style.background='rgba(91,78,245,0.06)'; };
  msBtn.onmouseout  = () => { msBtn.style.borderColor='var(--border2)'; msBtn.style.color='var(--text2)'; msBtn.style.background='none'; };

  if (item.isMilestone) {
    msBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="3" width="10" height="6" rx="3" fill="currentColor" opacity=".7"/></svg>バーに戻す`;
    msBtn.onclick = () => {
      item.isMilestone = false;
      item.days = 3;
      item.endDate = addDays(item.startDate || generatedData.startDate, 2);
      popup.remove(); renderGantt();
    };
  } else {
    msBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2.5" y="2.5" width="7" height="7" rx="1" transform="rotate(45 6 6)" fill="currentColor"/></svg>マイルストーンに変更`;
    msBtn.onclick = () => {
      item.isMilestone = true;
      item.days = 1;
      item.endDate = item.startDate || generatedData.startDate;
      popup.remove(); renderGantt();
    };
  }
  popup.appendChild(msBtn);

  document.body.appendChild(popup);
  setTimeout(() => nameInput.focus(), 0);

  const closePopup = ev => {
    if (!popup.contains(ev.target)) { item.name = nameInput.value.trim() || item.name; popup.remove(); document.removeEventListener('mousedown', closePopup); renderGantt(); }
  };
  setTimeout(() => document.addEventListener('mousedown', closePopup), 0);
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

  const COL_W = ganttColWidth;
  const ROW_H = 36;
  const LABEL_W = ganttLabelWidth;
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
    <div id="gt-inner" style="display:flex;flex:1;min-height:0;overflow:hidden;">
      <!-- 左ペイン：ラベル列（固定） -->
      <div id="gt-left" style="width:${LABEL_W}px;min-width:${LABEL_W}px;flex-shrink:0;display:flex;flex-direction:column;min-height:0;">
        <!-- ヘッダー空白 -->
        <div id="gt-left-head" style="flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--border);">
          <div style="height:22px;border-bottom:1px solid var(--border);"></div><!-- 月行 -->
          <div style="height:22px;border-bottom:1px solid var(--border);"></div><!-- 日行 -->
          <div style="height:18px;"></div><!-- 曜日行 -->
          ${recurringList.length ? '<div style="height:24px;border-top:1px solid var(--border);background:var(--bg2);"></div>' : ''}<!-- 定例レーン -->
        </div>
        <!-- タスクラベル -->
        <div id="gt-left-body" style="flex:1;overflow-y:scroll;overflow-x:hidden;scrollbar-width:none;min-height:0;"></div>
      </div>
      <div id="gt-col-resize" style="width:5px;flex-shrink:0;cursor:col-resize;background:transparent;border-left:1px solid var(--border2);border-right:1px solid var(--border2);transition:background .15s;z-index:15;box-sizing:border-box;" title="ドラッグで幅を変更"></div>
      <!-- 右ペイン：グリッド（横スクロール） -->
      <div id="gt-right" style="flex:1;overflow-x:auto;overflow-y:scroll;display:flex;flex-direction:column;min-height:0;">
        <!-- グリッドヘッダー -->
        <div id="gt-right-head" style="flex-shrink:0;background:var(--bg2);border-bottom:1px solid var(--border);position:sticky;top:0;z-index:20;">
          <!-- 月行 -->
          <div style="display:flex;width:${gridW}px;height:22px;border-bottom:1px solid var(--border);background:var(--bg2);overflow:hidden;">
            ${monthGroups.map(mg => `<div style="width:${mg.count*COL_W}px;min-width:${mg.count*COL_W}px;padding:4px 8px;font-family:'Syne',sans-serif;font-size:11px;font-weight:600;color:var(--text2);border-right:1px solid var(--border2);white-space:nowrap;box-sizing:border-box;background:var(--bg2);">${mg.label}</div>`).join('')}
          </div>
          <!-- 日行 -->
          <div style="display:flex;width:${gridW}px;height:22px;border-bottom:1px solid var(--border);background:var(--bg2);overflow:hidden;">
            ${dates.map(dt => {
              const isT = dt===today;
              const isMStart = dt.endsWith('-01')||dt===d.startDate;
              const col = isT ? 'var(--accent)' : 'var(--text3)';
              return `<div style="width:${COL_W}px;min-width:${COL_W}px;text-align:center;font-family:'DM Mono',monospace;font-size:9px;padding:3px 0 1px;color:${col};background:var(--bg2);border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;overflow:hidden;">${COL_W>=14?parseInt(dt.split('-')[2]):''}</div>`;
            }).join('')}
          </div>
          <!-- 曜日行 -->
          <div style="display:flex;width:${gridW}px;height:18px;background:var(--bg2);overflow:hidden;">
            ${dates.map(dt => {
              const dow = parseDate(dt).getDay();
              const isT = dt===today;
              const DOW_JP = ['日','月','火','水','木','金','土'];
              const isMStart = dt.endsWith('-01')||dt===d.startDate;
              const col = isT ? 'var(--accent)' : dow===0||isHoliday(dt) ? '#dc2626' : dow===6 ? '#2563eb' : 'var(--text3)';
              return `<div style="width:${COL_W}px;min-width:${COL_W}px;text-align:center;font-family:'DM Mono',monospace;font-size:8px;padding:1px 0 3px;color:${col};background:var(--bg2);border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;overflow:hidden;">${COL_W>=14?DOW_JP[dow]:''}</div>`;
            }).join('')}
          </div>
          <!-- 定例ラベルレーン -->
          ${recurringList.length ? `<div id="gt-rec-lane" style="position:relative;width:${gridW}px;height:24px;border-top:1px solid var(--border);overflow:visible;"></div>` : ''}
        </div>
        <!-- グリッドボディ -->
        <div id="gt-right-body" style="position:relative;width:${gridW}px;background-image:repeating-linear-gradient(to right,rgba(0,0,0,0.04) 0px,rgba(0,0,0,0.04) 1px,transparent 1px,transparent ${COL_W}px);"></div>
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

  // 左カラム幅リサイズ
  attachGanttColResize(container);

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
    lPhaseRow.style.cssText = `display:flex;align-items:center;background:var(--bg2);border-bottom:1px solid var(--border);height:34px;overflow:hidden;padding:0 10px 0 6px;gap:6px;`;
    lPhaseRow.setAttribute('data-phase-row', phase);

    // ドラッグハンドル（masterのみ・ゲストモード除く）
    const phaseHandle = document.createElement('div');
    if (!isMasterRole || isGuestMode) {
      phaseHandle.style.cssText = `width:14px;flex-shrink:0;`;
    } else {
      phaseHandle.style.cssText = `width:14px;flex-shrink:0;cursor:grab;display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;opacity:0.2;`;
      phaseHandle.innerHTML = '<span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:10px;height:1.5px;background:var(--text3);border-radius:1px;"></span>';
      lPhaseRow.addEventListener('mouseenter', () => phaseHandle.style.opacity = '0.5');
      lPhaseRow.addEventListener('mouseleave', () => phaseHandle.style.opacity = '0.2');
    }

    // フェーズ色・名前・＋ボタン
    const phaseDot = document.createElement('div');
    phaseDot.style.cssText = `width:10px;height:10px;border-radius:2px;background:${phaseColor};flex-shrink:0;`;
    const phaseNameEl = document.createElement('div');
    phaseNameEl.style.cssText = `font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:var(--text2);flex:1;`;
    phaseNameEl.textContent = phase;

    lPhaseRow.appendChild(phaseHandle);
    lPhaseRow.appendChild(phaseDot);
    lPhaseRow.appendChild(phaseNameEl);
    if (!isGuestMode) {
      const phaseAddBtn = document.createElement('button');
      phaseAddBtn.textContent = '＋';
      phaseAddBtn.title = 'スケジュールにタスクを追加';
      phaseAddBtn.style.cssText = `background:transparent;border:1px dashed var(--border2);border-radius:4px;padding:1px 7px;color:var(--text3);font-size:11px;cursor:pointer;flex-shrink:0;transition:all .15s;`;
      phaseAddBtn.onmouseenter = function(){ this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'; };
      phaseAddBtn.onmouseleave = function(){ this.style.borderColor='var(--border2)'; this.style.color='var(--text3)'; };
      phaseAddBtn.onclick = function(e) { e.stopPropagation(); addScheduleItem(phase); };
      lPhaseRow.appendChild(phaseAddBtn);
    }
    gtLeftBody.appendChild(lPhaseRow);

    // ── フェーズ行ドラッグ並び替え ──
    if (!isGuestMode) phaseHandle.addEventListener('mousedown', e => {
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
    rPhaseRow.style.cssText = `width:${gridW}px;height:34px;background:var(--bg2);border-bottom:1px solid var(--border);position:relative;overflow:visible;`;
    dates.forEach((dt,di)=>{
      const off=isOffDay(dt);const isT=dt===today;const isMStart=dt.endsWith('-01')||dt===d.startDate;
      const cell=document.createElement('div');
      cell.style.cssText=`position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${isT?'rgba(91,78,245,0.06)':off?'rgba(0,0,0,0.03)':'var(--bg2)'};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
      rPhaseRow.appendChild(cell);
    });
    // タグラインスパン線（フェーズ内アイテムの最早〜最遅日：子・孫の有効範囲を使用）
    const scheduledItems = phaseItems.filter(it => !it.unscheduled && (it.startDate || (it.children && it.children.some(c => c.startDate))));
    if (scheduledItems.length) {
      const allEffStarts = [], allEffEnds = [];
      scheduledItems.forEach(it => {
        let itStart = it.startDate || d.startDate;
        let itEnd   = it.endDate   || addDays(itStart, (it.days||3)-1);
        if (it.children && it.children.length) {
          it.children.forEach(c => {
            let cStart = c.startDate || itStart;
            let cEnd   = c.endDate   || addDays(cStart, (c.days||2)-1);
            if (c.children && c.children.length) {
              c.children.forEach(g => {
                if (g.startDate && g.startDate < cStart) cStart = g.startDate;
                if (g.endDate   && g.endDate   > cEnd)   cEnd   = g.endDate;
              });
            }
            if (cStart < itStart) itStart = cStart;
            if (cEnd   > itEnd)   itEnd   = cEnd;
          });
        }
        allEffStarts.push(itStart);
        allEffEnds.push(itEnd);
      });
      const iMinStart = allEffStarts.reduce((a,b)=>a<b?a:b);
      const iMaxEnd   = allEffEnds.reduce((a,b)=>a>b?a:b);
      const iSpanOff  = Math.max(0, daysBetween(d.startDate, iMinStart));
      const iSpanDays = Math.max(1, daysBetween(iMinStart, iMaxEnd)+1);
      const iDotSize  = 7;
      const iSpanLeft = iSpanOff * COL_W + 1;
      const iSpanW    = Math.max(iDotSize+2, Math.min(iSpanDays * COL_W - 2, gridW - iSpanLeft));
      const iSpanLine = document.createElement('div');
      iSpanLine.style.cssText = `position:absolute;left:${iSpanLeft + iDotSize/2}px;top:50%;transform:translateY(-50%);width:${Math.max(0,iSpanW-iDotSize)}px;height:2px;background:${phaseColor};opacity:0.75;pointer-events:none;z-index:4;`;
      const iDotL = document.createElement('div');
      iDotL.style.cssText = `position:absolute;left:${iSpanLeft}px;top:50%;transform:translateY(-50%);width:${iDotSize}px;height:${iDotSize}px;border-radius:50%;background:${phaseColor};opacity:0.9;pointer-events:none;z-index:5;`;
      const iDotR = document.createElement('div');
      iDotR.style.cssText = `position:absolute;left:${iSpanLeft+iSpanW-iDotSize}px;top:50%;transform:translateY(-50%);width:${iDotSize}px;height:${iDotSize}px;border-radius:50%;background:${phaseColor};opacity:0.9;pointer-events:none;z-index:5;`;
      rPhaseRow.appendChild(iSpanLine);
      rPhaseRow.appendChild(iDotL);
      rPhaseRow.appendChild(iDotR);
    }
    gtRightBody.appendChild(rPhaseRow);

    if (!phaseItems.length) {
      const lE=document.createElement('div'); lE.style.cssText=`height:${ROW_H}px;padding:0 14px;display:flex;align-items:center;border-bottom:1px solid var(--border);`;
      lE.innerHTML=`<span style="font-size:11px;color:var(--text3);">タスクなし</span>`; gtLeftBody.appendChild(lE);
      const rE=document.createElement('div'); rE.style.cssText=`width:${gridW}px;height:${ROW_H}px;border-bottom:1px solid var(--border);`; gtRightBody.appendChild(rE);
      return;
    }

    phaseItems.forEach((item, ii) => {
      const isUnscheduled = !!item.unscheduled;
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

      // ドラッグハンドル（masterのみ表示）
      const handle = document.createElement('div');
      if (isGuestMode) {
        handle.style.cssText = `width:12px;flex-shrink:0;`;
      } else {
        handle.style.cssText = `width:12px;flex-shrink:0;cursor:grab;display:flex;flex-direction:column;gap:2px;align-items:center;justify-content:center;opacity:0.25;`;
        handle.innerHTML = '<span style="display:block;width:8px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:8px;height:1.5px;background:var(--text3);border-radius:1px;"></span><span style="display:block;width:8px;height:1.5px;background:var(--text3);border-radius:1px;"></span>';
        lRow.addEventListener('mouseenter', () => handle.style.opacity = '0.6');
        lRow.addEventListener('mouseleave', () => handle.style.opacity = '0.25');
      }

      // タスク名（ゲストモードでは読み取り専用）
      const nameEl = document.createElement('span');
      const barLabelId = `bar-label-${item.id}`;
      if (isGuestMode) {
        nameEl.textContent = item.name;
        nameEl.style.cssText = `font-size:11px;color:var(--text2);flex:1;outline:none;white-space:nowrap;overflow:hidden;cursor:default;min-width:0;`;
      } else {
        nameEl.contentEditable = 'true';
        nameEl.textContent = item.name;
        nameEl.style.cssText = `font-size:11px;color:var(--text2);flex:1;outline:none;white-space:nowrap;overflow:hidden;cursor:text;min-width:0;`;
        nameEl.addEventListener('input', () => {
          const v = nameEl.textContent.trim() || item.name;
          item.name = v;
          const bl = document.getElementById(barLabelId);
          if (bl) bl.textContent = v;
        });
        nameEl.addEventListener('blur', () => renderGantt());
        nameEl.addEventListener('keydown', e => { if(e.key==='Enter'){e.preventDefault();nameEl.blur();} });
      }

      // ＋サブタスク（ゲストモードでは非表示）
      const addSubBtn = document.createElement('button');
      addSubBtn.type='button'; addSubBtn.textContent='＋サブ';
      if (isGuestMode) {
        addSubBtn.style.cssText=`display:none;`;
      } else {
        addSubBtn.style.cssText=`background:none;border:1px dashed var(--border2);border-radius:4px;color:var(--text3);cursor:pointer;font-size:9px;padding:1px 5px;flex-shrink:0;opacity:0;transition:opacity .15s;white-space:nowrap;`;
        lRow.addEventListener('mouseenter',()=>addSubBtn.style.opacity='1');
        lRow.addEventListener('mouseleave',()=>addSubBtn.style.opacity='0');
        addSubBtn.onmouseenter=()=>{addSubBtn.style.borderColor='var(--accent)';addSubBtn.style.color='var(--accent)';};
        addSubBtn.onmouseleave=()=>{addSubBtn.style.borderColor='var(--border2)';addSubBtn.style.color='var(--text3)';};
        addSubBtn.onclick=e=>{
          e.stopPropagation();
          if(!item.children) item.children=[];
          item.children.push({id:Date.now()+Math.random(),name:'サブタスク',phase:item.phase,days:2,startDate:null,endDate:null,unscheduled:true,children:[]});
          renderGantt();
        };
      }

      // × 削除（ゲストモードでは非表示）
      const delBtn = document.createElement('button');
      delBtn.type='button'; delBtn.textContent='×';
      if (isGuestMode) {
        delBtn.style.cssText=`display:none;`;
      } else {
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
      }

      // ── アコーディオン折りたたみ（子タスクがある場合のみ） ──
      const hasChildren = item.children && item.children.length > 0;
      let toggleBtn = null;
      if (hasChildren) {
        if (item._schedCollapsed === undefined) item._schedCollapsed = false;
        toggleBtn = document.createElement('button');
        toggleBtn.type = 'button';
        toggleBtn.style.cssText = `background:none;border:none;cursor:pointer;color:var(--text3);font-size:10px;padding:0 3px;flex-shrink:0;transition:transform .2s;line-height:1;width:14px;`;
        toggleBtn.textContent = item._schedCollapsed ? '▶' : '▾';
        toggleBtn.title = item._schedCollapsed ? 'サブタスクを展開' : 'サブタスクを折りたたむ';
        toggleBtn.onclick = e => {
          e.stopPropagation();
          item._schedCollapsed = !item._schedCollapsed;
          renderGantt();
        };
      }

      // ── 担当者（任意・自由入力） ──
      const assigneeWrap = document.createElement('div');
      assigneeWrap.style.cssText = `flex-shrink:0;display:flex;align-items:center;gap:3px;opacity:0;transition:opacity .15s;`;
      lRow.addEventListener('mouseenter', () => assigneeWrap.style.opacity = '1');
      lRow.addEventListener('mouseleave', () => { if (!item.assignee) assigneeWrap.style.opacity = '0'; });

      const personIcon = `<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="6" r="2.8" stroke="currentColor" stroke-width="1.3"/><path d="M2.5 14c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`;

      const assigneeEl = document.createElement('span');
      const refreshAssignee = () => {
        if (item.assignee) {
          assigneeEl.innerHTML = `${personIcon}<span style="font-size:10px;color:var(--text2);font-family:'DM Sans',sans-serif;">${item.assignee}</span>`;
          assigneeWrap.style.opacity = '1';
        } else {
          assigneeEl.innerHTML = `${personIcon}<span style="font-size:10px;color:var(--text3);font-family:'DM Sans',sans-serif;">担当</span>`;
        }
      };
      refreshAssignee();
      assigneeEl.style.cssText = `display:flex;align-items:center;gap:2px;cursor:${isGuestMode?'default':'text'};color:var(--text3);padding:1px 5px;border-radius:4px;background:var(--bg3);border:1px solid var(--border);white-space:nowrap;`;

      if (!isGuestMode) {
        assigneeEl.title = 'クリックで担当者を入力';
        assigneeEl.addEventListener('click', e => {
          e.stopPropagation();
          const inp = document.createElement('input');
          inp.type = 'text';
          inp.value = item.assignee || '';
          inp.placeholder = '担当者名';
          inp.style.cssText = `font-size:10px;font-family:'DM Sans',sans-serif;color:var(--text);background:var(--bg3);border:1px solid var(--accent);border-radius:4px;padding:1px 5px;outline:none;width:70px;`;
          assigneeEl.replaceWith(inp);
          inp.focus(); inp.select();
          const commit = () => {
            item.assignee = inp.value.trim() || '';
            refreshAssignee();
            inp.replaceWith(assigneeEl);
            saveSnapshot();
          };
          inp.addEventListener('blur', commit);
          inp.addEventListener('keydown', e2 => {
            if (e2.key === 'Enter') { e2.preventDefault(); inp.blur(); }
            if (e2.key === 'Escape') { inp.value = item.assignee || ''; inp.blur(); }
          });
        });
      }
      assigneeWrap.appendChild(assigneeEl);

      lRow.appendChild(handle);
      if (toggleBtn) lRow.appendChild(toggleBtn);
      lRow.appendChild(nameEl);
      lRow.appendChild(assigneeWrap);
      lRow.appendChild(addSubBtn);
      lRow.appendChild(delBtn);

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
      rRow.style.cssText = `width:${gridW}px;height:${ROW_H}px;border-bottom:1px solid var(--border);position:relative;overflow:hidden;box-sizing:border-box;`;
      dates.forEach((dt,di)=>{
        const off=isOffDay(dt);const isT=dt===today;const isMStart=dt.endsWith('-01')||dt===d.startDate;
        const cell=document.createElement('div');
        cell.style.cssText=`position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${isT?'rgba(91,78,245,0.06)':off?'rgba(0,0,0,0.03)':'transparent'};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
        rRow.appendChild(cell);
      });

      // ── 日付未設定（unscheduled）: 空行 + ドラッグで期間を設定 ──
      if (isUnscheduled) {
        rRow.style.cursor = 'crosshair';
        const hintEl = document.createElement('div');
        hintEl.style.cssText = `position:absolute;inset:0;display:flex;align-items:center;padding:0 14px;pointer-events:none;`;
        hintEl.innerHTML = `<span style="font-family:'DM Mono',monospace;font-size:9px;color:var(--border2);letter-spacing:.5px;user-select:none;">ドラッグして期間をセット</span>`;
        rRow.appendChild(hintEl);

        let previewBar = null;
        let startDragIdx = -1;
        rRow.addEventListener('mousedown', e => {
          if (e.button !== 0 || isGuestMode) return;
          e.preventDefault();
          const rect = rRow.getBoundingClientRect();
          startDragIdx = Math.max(0, Math.min(Math.floor((e.clientX - rect.left) / COL_W), dates.length - 1));
          previewBar = document.createElement('div');
          previewBar.style.cssText = `position:absolute;left:${startDragIdx * COL_W + 1}px;top:6px;width:${COL_W - 2}px;height:${ROW_H - 12}px;background:${phaseColor};opacity:.55;border-radius:99px;pointer-events:none;z-index:10;`;
          rRow.appendChild(previewBar);
          hintEl.style.display = 'none';
          const onMove = ev => {
            const idx = Math.max(startDragIdx, Math.min(Math.floor((ev.clientX - rect.left) / COL_W), dates.length - 1));
            if (previewBar) previewBar.style.width = Math.max(COL_W - 2, (idx - startDragIdx + 1) * COL_W - 2) + 'px';
          };
          const onUp = ev => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            if (!previewBar) return;
            const endIdx = Math.max(startDragIdx, Math.min(Math.floor((ev.clientX - rect.left) / COL_W), dates.length - 1));
            item.startDate = dates[startDragIdx];
            item.endDate = dates[endIdx];
            item.days = daysBetween(item.startDate, item.endDate) + 1;
            delete item.unscheduled;
            saveSnapshot();
            renderGantt();
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });

        gtLeftBody.appendChild(lRow);
        gtRightBody.appendChild(rRow);
        if (item.children && item.children.length && !item._schedCollapsed) {
          renderScheduleChildren(item.children, item, 1, d, dates, gridW, COL_W, ROW_H, phaseColor, phase, gtLeftBody, gtRightBody, container);
        }
        return;
      }

      // 子を持つ場合はタグライン風（非インタラクティブ）、リーフはフルバー
      const itemHasChildren = item.children && item.children.length > 0;
      const barLeft = effectiveOff * COL_W + 1;

      const bar = document.createElement('div');
      bar.setAttribute('data-phase', phase);

      const barLabel = document.createElement('span');
      barLabel.id = barLabelId;
      barLabel.textContent = item.name;

      const tooltip = container.querySelector('#gt-tooltip');
      const ttName  = container.querySelector('#gt-tt-name');
      const ttDates = container.querySelector('#gt-tt-dates');

      if (item.isMilestone) {
        // ── ダイヤモンド（マイルストーン）──
        const mSize = ROW_H - 10;
        const mCenter = barLeft + COL_W / 2;
        bar.style.cssText = `position:absolute;left:${mCenter - mSize/2}px;top:50%;transform:translateY(-50%) rotate(45deg);width:${mSize}px;height:${mSize}px;background:${phaseColor};border-radius:3px;cursor:${isGuestMode?'default':'grab'};user-select:none;z-index:3;`;
        barLabel.style.cssText = `position:absolute;left:${mCenter + mSize/2 + 6}px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text2);white-space:nowrap;font-family:'DM Sans',sans-serif;pointer-events:none;`;
        if (!isGuestMode) {
          let msMoved = false;
          bar.addEventListener('mousedown', e => {
            e.preventDefault(); e.stopPropagation();
            msMoved = false;
            bar.style.cursor = 'grabbing';
            const startX = e.clientX;
            const origOff = effectiveOff;
            const onMove = ev => {
              if (Math.abs(ev.clientX - startX) > 3) msMoved = true;
              const cd = Math.round((ev.clientX - startX) / COL_W);
              const newOff = Math.max(0, origOff + cd);
              bar.style.left = (newOff * COL_W + COL_W/2 - mSize/2) + 'px';
              barLabel.style.left = (newOff * COL_W + COL_W/2 + mSize/2 + 6) + 'px';
            };
            const onUp = ev => {
              bar.style.cursor = 'grab';
              document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
              const cd = Math.round((ev.clientX - startX) / COL_W);
              if (cd === 0) return;
              item.startDate = addDays(effectiveStart, cd);
              item.endDate   = item.startDate;
              item.days = 1;
              renderGantt();
            };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
          });
          bar.addEventListener('click', e => {
            if (msMoved) return;
            e.stopPropagation();
            document.querySelectorAll('.gantt-bar-popup').forEach(p=>p.remove());
            showBarPopup(e, item);
          });
        }
      } else if (itemHasChildren) {
        // ── 縦幅あり・濃色フルバー（子を持つ親：ドラッグで配下ごと移動）──
        const pBarW = Math.max(4, effectiveBarW);
        bar.style.cssText = `position:absolute;left:${barLeft}px;top:4px;width:${pBarW}px;height:${ROW_H-8}px;background:${phaseColor};border-radius:8px;cursor:${isGuestMode?'default':'grab'};user-select:none;z-index:2;opacity:0.92;`;
        barLabel.style.cssText = `position:absolute;left:${barLeft + pBarW + 6}px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text2);white-space:nowrap;font-family:'DM Sans',sans-serif;pointer-events:none;`;
        if (!isGuestMode) {
          let parentMoved = false;
          bar.addEventListener('mousedown', e => {
            e.preventDefault(); e.stopPropagation();
            parentMoved = false;
            bar.style.cursor = 'grabbing';
            tooltip.style.display = 'none';
            const startX = e.clientX;
            const origOff = effectiveOff;
            const onMove = ev => {
              if (Math.abs(ev.clientX - startX) > 3) parentMoved = true;
              const cd = Math.round((ev.clientX - startX) / COL_W);
              const newLeft = Math.max(0, origOff + cd) * COL_W + 1;
              bar.style.left = newLeft + 'px';
              barLabel.style.left = (newLeft + pBarW + 6) + 'px';
            };
            const onUp = ev => {
              bar.style.cursor = 'grab';
              document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
              const cd = Math.round((ev.clientX - startX) / COL_W);
              if (cd === 0) return;
              // 親と配下すべてをまとめてずらす
              const shiftAll = items => items && items.forEach(c => {
                if (c.startDate) c.startDate = addDays(c.startDate, cd);
                if (c.endDate)   c.endDate   = addDays(c.endDate,   cd);
                if (c.children)  shiftAll(c.children);
              });
              if (item.startDate) item.startDate = addDays(item.startDate, cd);
              if (item.endDate)   item.endDate   = addDays(item.endDate,   cd);
              item.days = Math.max(1, daysBetween(item.startDate, item.endDate) + 1);
              shiftAll(item.children);
              renderGantt();
            };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
          });
          bar.addEventListener('click', e => {
            if (parentMoved) return;
            e.stopPropagation();
            document.querySelectorAll('.gantt-bar-popup').forEach(p=>p.remove());
            showBarPopup(e, item);
          });
        }
      } else {
        // ── フルバー（リーフ：直接編集可能）──
        bar.style.cssText = `position:absolute;left:${barLeft}px;top:6px;width:${Math.max(4,effectiveBarW)}px;height:${ROW_H-12}px;background:${phaseColor}dd;border-radius:99px;box-sizing:border-box;overflow:visible;cursor:${isGuestMode?'default':'grab'};user-select:none;`;
        barLabel.style.cssText = `position:absolute;left:${barLeft+Math.max(4,effectiveBarW)+6}px;top:50%;transform:translateY(-50%);font-size:11px;color:var(--text2);white-space:nowrap;font-family:'DM Sans',sans-serif;pointer-events:none;`;

        if (!isGuestMode) {
          // 左リサイズ
          const resizeHandleLeft = document.createElement('div');
          resizeHandleLeft.style.cssText=`position:absolute;left:-5px;top:50%;transform:translateY(-50%);width:10px;height:10px;border-radius:50%;background:#fff;opacity:0.9;cursor:ew-resize;z-index:3;box-shadow:0 0 0 2px rgba(0,0,0,0.15);`;
          bar.appendChild(resizeHandleLeft);
          resizeHandleLeft.addEventListener('mousedown', ev => {
            ev.preventDefault(); ev.stopPropagation();
            const startX = ev.clientX;
            const origLeft = parseInt(bar.style.left);
            const origWidth = parseInt(bar.style.width);
            const onMove = ev2 => {
              const colDelta = Math.round((ev2.clientX - startX) / COL_W);
              const newLeft  = Math.max(0, origLeft + colDelta * COL_W);
              const newWidth = Math.max(COL_W, origWidth - colDelta * COL_W);
              bar.style.left = newLeft + 'px'; bar.style.width = newWidth + 'px';
              if (ttName) {
                const newStart = addDays(d.startDate, Math.round(newLeft / COL_W));
                const newDays  = Math.round(newWidth / COL_W);
                ttName.textContent = item.name;
                ttDates.textContent = `${newStart} 〜 ${addDays(newStart, newDays-1)}（${newDays}日）`;
                tooltip.style.display = 'block';
              }
            };
            const onUp = ev2 => {
              document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
              if (tooltip) tooltip.style.display = 'none';
              const colDelta = Math.round((ev2.clientX - startX) / COL_W);
              if (colDelta === 0) return;
              item.startDate = addDays(d.startDate, Math.round((origLeft + colDelta * COL_W) / COL_W));
              item.days = Math.max(1, Math.round((origWidth - colDelta * COL_W) / COL_W));
              item.endDate = addDays(item.startDate, item.days - 1);
              renderGantt();
            };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
          });

          // 右リサイズ
          const resizeHandle = document.createElement('div');
          resizeHandle.style.cssText=`position:absolute;right:-5px;top:50%;transform:translateY(-50%);width:10px;height:10px;border-radius:50%;background:#fff;opacity:0.9;cursor:ew-resize;z-index:3;box-shadow:0 0 0 2px rgba(0,0,0,0.15);`;
          bar.appendChild(resizeHandle);

          // ドラッグ（移動量を追跡してクリックと区別）
          let barMoved = false;
          bar.addEventListener('mousedown', e => {
            if (e.target === resizeHandle || e.target === resizeHandleLeft) return;
            e.preventDefault(); tooltip.style.display = 'none'; bar.style.cursor = 'grabbing';
            barMoved = false;
            const origColIdx = effectiveOff;
            const startX = e.clientX;
            const onMove = ev => {
              if (Math.abs(ev.clientX - startX) > 3) barMoved = true;
              const colDelta = Math.round((ev.clientX - startX) / COL_W);
              bar.style.left = (Math.max(0, origColIdx + colDelta) * COL_W + 1) + 'px';
            };
            const onUp = ev => {
              bar.style.cursor = 'grab';
              document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
              const finalDelta = Math.round((ev.clientX - startX) / COL_W);
              if (finalDelta === 0) { bar.style.left = (origColIdx * COL_W + 1) + 'px'; return; }
              item.startDate = addDays(effectiveStart, finalDelta);
              item.endDate   = addDays(effectiveEnd,   finalDelta);
              item.days = Math.max(1, daysBetween(item.startDate, item.endDate) + 1);
              // 配下の子・孫も同じ日数ずらす
              const shiftItems = items => items && items.forEach(c => {
                if (c.startDate) c.startDate = addDays(c.startDate, finalDelta);
                if (c.endDate)   c.endDate   = addDays(c.endDate,   finalDelta);
                if (c.children)  shiftItems(c.children);
              });
              shiftItems(item.children);
              renderGantt();
            };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
          });
          bar.addEventListener('click', e => {
            if (barMoved) return;
            e.stopPropagation();
            document.querySelectorAll('.gantt-bar-popup').forEach(p=>p.remove());
            showBarPopup(e, item);
          });

          // 右リサイズ
          resizeHandle.addEventListener('mousedown', e => {
            e.preventDefault(); e.stopPropagation();
            const startX = e.clientX;
            const origWidth = parseInt(bar.style.width);
            const onMove = ev => {
              bar.style.width = Math.max(COL_W, origWidth + Math.round((ev.clientX-startX)/COL_W)*COL_W) + 'px';
            };
            const onUp = ev => {
              document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp);
              const newW = parseInt(bar.style.width);
              const newDays = Math.max(1, Math.round((newW + 2) / COL_W));
              const newEndDate = addDays(effectiveStart, newDays - 1);
              if (newEndDate === item.endDate && newDays === item.days) return;
              item.startDate = effectiveStart; item.endDate = newEndDate; item.days = newDays;
              renderGantt();
            };
            document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp);
          });
        }
      }

      rRow.appendChild(barLabel);

      // ツールチップ
      bar.addEventListener('mouseenter', e => { ttName.textContent=item.name; ttDates.textContent=`${effectiveStart} 〜 ${effectiveEnd}（${effectiveDays}日）`; tooltip.style.display='block'; });
      bar.addEventListener('mousemove',  e => { tooltip.style.left=(e.clientX+12)+'px'; tooltip.style.top=(e.clientY-10)+'px'; });
      bar.addEventListener('mouseleave', () => { tooltip.style.display='none'; });

      rRow.appendChild(bar);

      // ── 左：親タスク行を先に追加、右：親バー行を先に追加 ──
      gtLeftBody.appendChild(lRow);
      gtRightBody.appendChild(rRow);

      // ── サブタスク行を親の後に追加（再帰で孫まで対応） ──
      if (item.children && item.children.length && !item._schedCollapsed) {
        renderScheduleChildren(item.children, item, 1, d, dates, gridW, COL_W, ROW_H, phaseColor, phase, gtLeftBody, gtRightBody, container);
      }
    });

    // ── フェーズ末尾：タスク追加ボタン行（ゲストモードでは非表示） ──
    const lAddRow = document.createElement('div');
    lAddRow.style.cssText = `display:flex;align-items:center;padding:4px 10px;border-bottom:1px solid var(--border);min-height:${isGuestMode?'0':'32px'};${isGuestMode?'display:none;':''}`;
    if (!isGuestMode) {
      const addItemBtn = document.createElement('button');
      addItemBtn.style.cssText = `display:flex;align-items:center;gap:5px;background:transparent;border:1px dashed var(--border2);border-radius:5px;padding:3px 10px;color:var(--text3);font-family:'DM Sans',sans-serif;font-size:11px;cursor:pointer;transition:all .15s;width:100%;`;
      addItemBtn.innerHTML = `<svg width="9" height="9" viewBox="0 0 10 10" fill="none"><path d="M5 1v8M1 5h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>タスクを追加`;
      addItemBtn.onmouseenter = function(){ this.style.borderColor=phaseColor; this.style.color=phaseColor; };
      addItemBtn.onmouseleave = function(){ this.style.borderColor='var(--border2)'; this.style.color='var(--text3)'; };
      addItemBtn.onclick = e => { e.stopPropagation(); addScheduleItem(phase); };
      lAddRow.appendChild(addItemBtn);
    }
    gtLeftBody.appendChild(lAddRow);

    const rAddRow = document.createElement('div');
    rAddRow.style.cssText = `width:${gridW}px;min-height:${isGuestMode?'0':'32px'};${isGuestMode?'display:none;':''}border-bottom:1px solid var(--border);position:relative;overflow:hidden;`;
    if (!isGuestMode) {
      dates.forEach((dt,di)=>{
        const off=isOffDay(dt); const isT=dt===today; const isMStart=dt.endsWith('-01')||dt===d.startDate;
        const acell=document.createElement('div');
        acell.style.cssText=`position:absolute;left:${di*COL_W}px;top:0;width:${COL_W}px;height:100%;background:${isT?'rgba(91,78,245,0.04)':off?'rgba(0,0,0,0.025)':'transparent'};border-left:${isMStart?'1px solid var(--border2)':'none'};box-sizing:border-box;`;
        rAddRow.appendChild(acell);
      });
    }
    gtRightBody.appendChild(rAddRow);
  });

  // ── 最下部：タグライン追加ボタン（ゲストモードでは非表示） ──
  if (!isGuestMode) {
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
  }
  const rAddPhase = document.createElement('div');
  rAddPhase.style.cssText = `width:${gridW}px;height:42px;`;
  gtRightBody.appendChild(rAddPhase);

  // 定例ラインを描画
  drawRecurringLines(gtRightBody, dates, COL_W, ROW_H);
  // Todayライン
  drawTodayLine(gtRightBody, dates, COL_W, today);
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
  bar.style.cssText=`position:absolute;height:${barH}px;top:50%;transform:translateY(-50%);border-radius:5px;background:${barColor};left:${startOff*COL_W+1}px;width:${barDays*COL_W-2}px;display:flex;align-items:center;padding:0 6px;cursor:grab;user-select:none;box-sizing:border-box;z-index:2;transition:box-shadow .15s;opacity:${hasChildren?'.75':'1'};overflow:visible;`;
  bar.dataset.phase=t.phase;
  bar.innerHTML=`<div class="gantt-bar-resize-left" style="position:absolute;left:-4px;top:50%;transform:translateY(-50%);width:9px;height:9px;border-radius:50%;background:#fff;opacity:0.88;cursor:ew-resize;z-index:3;box-shadow:0 0 0 1.5px rgba(0,0,0,0.12);"></div><span style="font-size:10px;color:rgba(255,255,255,.9);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;flex:1;padding-left:4px;">${t.name}</span><div class="gantt-bar-resize" style="position:absolute;right:-4px;top:50%;transform:translateY(-50%);width:9px;height:9px;border-radius:50%;background:#fff;opacity:0.88;cursor:ew-resize;z-index:3;box-shadow:0 0 0 1.5px rgba(0,0,0,0.12);"></div>`;
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
// ── PDF出力（ブラウザの印刷ダイアログ → 「PDFとして保存」）──
function exportPdf() {
  if (!generatedData) return;
  window.print();
}

// 印刷前にガントのスクロール制約を解除
let _printSaved = [];
window.addEventListener('beforeprint', () => {
  _printSaved = [];
  const targets = [
    { sel: '#gt-inner',    props: { overflow: 'visible', height: 'auto', minHeight: '0' } },
    { sel: '#gt-right',    props: { overflow: 'visible', height: 'auto', maxHeight: 'none' } },
    { sel: '#gt-left',     props: { overflow: 'visible', height: 'auto' } },
    { sel: '#gt-left-body',props: { overflow: 'visible', height: 'auto', flex: 'none' } },
  ];
  targets.forEach(({ sel, props }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    const saved = {};
    Object.keys(props).forEach(k => { saved[k] = el.style[k] || ''; el.style[k] = props[k]; });
    _printSaved.push({ el, saved });
  });
});
window.addEventListener('afterprint', () => {
  _printSaved.forEach(({ el, saved }) => {
    Object.keys(saved).forEach(k => { el.style[k] = saved[k]; });
  });
  _printSaved = [];
});

function exportExcel() {
  const d = generatedData;
  if (!d) return;
  assignTaskDates();

  // ExcelJS はHTMLで事前ロード済み
  if (typeof ExcelJS !== 'undefined') {
    doExport(d);
  } else {
    alert('ライブラリのロードに失敗しました。ページをリロードして再試行してください。');
  }
}

async function doExport(d) {
  try {
    const wb = new ExcelJS.Workbook();
    const priLabel = { high: '高', mid: '中', low: '低' };

    // ── Sheet1: タスク一覧 ──
    const ws1 = wb.addWorksheet('タスク一覧');
    ws1.columns = [
      { header: 'メンバー',  width: 14 }, { header: 'ロール',   width: 18 },
      { header: 'タスク名', width: 24 }, { header: 'フェーズ', width: 10 },
      { header: '優先度',   width: 6  }, { header: '開始日',   width: 12 },
      { header: '終了日',   width: 12 }, { header: '工数(日)', width: 8  },
      { header: '説明',     width: 36 }
    ];
    // ヘッダー行スタイル
    ws1.getRow(1).height = 20;
    ws1.getRow(1).eachCell(cell => {
      cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1A14' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    (d.members || []).forEach(m => {
      (m.tasks || []).forEach(t => {
        ws1.addRow([
          m.name, m.role, t.name, t.phase,
          priLabel[t.priority] || t.priority,
          t.startDate || '', t.endDate || '', t.days || '', t.description || ''
        ]);
      });
    });

    // ── Sheet2: スケジュール（ビジュアルガント）──
    if (d.startDate && d.endDate) {
      const totalDays = Math.max(1, daysBetween(d.startDate, d.endDate) + 1);
      const dates = [];
      for (let i = 0; i < totalDays; i++) {
        const dd = parseDate(d.startDate);
        dd.setDate(dd.getDate() + i);
        dates.push(toDateStr(dd));
      }
      const DOW = ['日','月','火','水','木','金','土'];
      const colDow = dates.map(dt => {
        const [y, m, day] = dt.split('-');
        return new Date(+y, +m - 1, +day).getDay();
      });
      const isWeekend = i => colDow[i] === 0 || colDow[i] === 6;

      const ws2 = wb.addWorksheet('スケジュール');
      ws2.getColumn(1).width = 22;
      for (let i = 0; i < dates.length; i++) ws2.getColumn(i + 2).width = 2.5;

      // 月ごとの境界を事前計算
      const months = [];
      let curKey = null;
      dates.forEach((dt, i) => {
        const [y, m] = dt.split('-');
        const key = `${y}-${m}`;
        if (curKey !== key) {
          months.push({ label: `${+y}年${+m}月`, startCol: i + 2, endCol: i + 2 });
          curKey = key;
        } else {
          months[months.length - 1].endCol = i + 2;
        }
      });

      // ── Row 1: 月ヘッダー ──
      ws2.getRow(1).height = 18;
      const r1c1 = ws2.getRow(1).getCell(1);
      r1c1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1A14' } };
      r1c1.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      months.forEach(({ label, startCol, endCol }) => {
        const cell = ws2.getRow(1).getCell(startCol);
        cell.value     = label;
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1A14' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (endCol > startCol) ws2.mergeCells(1, startCol, 1, endCol);
      });

      // ── Row 2: 日付（数字）──
      ws2.getRow(2).height = 16;
      const r2c1 = ws2.getRow(2).getCell(1);
      r2c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1A14' } };
      r2c1.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      dates.forEach((dt, i) => {
        const day  = +dt.split('-')[2];
        const cell = ws2.getRow(2).getCell(i + 2);
        cell.value     = day;
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
        const bg = isWeekend(i)
          ? (colDow[i] === 0 ? 'FFD9534F' : 'FF5B9BD5')
          : 'FF3D3280';
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // ── Row 3: 曜日 ──
      ws2.getRow(3).height = 16;
      const r3c1 = ws2.getRow(3).getCell(1);
      r3c1.value     = 'タスク名';
      r3c1.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
      r3c1.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F1A14' } };
      r3c1.alignment = { horizontal: 'left', vertical: 'middle' };
      dates.forEach((dt, i) => {
        const cell = ws2.getRow(3).getCell(i + 2);
        cell.value     = DOW[colDow[i]];
        cell.font      = { bold: true, color: { argb: 'FFFFFFFF' } };
        const bg = colDow[i] === 0 ? 'FFD9534F' : colDow[i] === 6 ? 'FF5B9BD5' : 'FF4A4080';
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });

      // フェーズカラー → ARGB
      const phaseArgb = phase =>
        'FF' + (PHASE_BAR_COLORS[phase] || getBarColor(phase)).replace('#', '').toUpperCase();

      let nextRowIdx = 4;

      (d.members || []).forEach(m => {
        // ── メンバー行 ──
        const mRow = ws2.getRow(nextRowIdx);
        mRow.height = 18;
        mRow.getCell(1).value     = `${m.name}（${m.role}）`;
        mRow.getCell(1).font      = { bold: true, color: { argb: 'FFFFFFFF' } };
        mRow.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2D2460' } };
        mRow.getCell(1).alignment = { vertical: 'middle' };
        ws2.mergeCells(nextRowIdx, 1, nextRowIdx, dates.length + 1);
        nextRowIdx++;

        (m.tasks || []).forEach(t => {
          // ── タスク行 ──
          const tRow = ws2.getRow(nextRowIdx);
          tRow.height = 15;
          const startOff = Math.max(0, daysBetween(d.startDate, t.startDate || d.startDate));
          const endOff   = Math.min(dates.length - 1, daysBetween(d.startDate, t.endDate || d.endDate));
          const barArgb  = phaseArgb(t.phase);

          tRow.getCell(1).value     = t.name;
          tRow.getCell(1).font      = { color: { argb: 'FF1F1A14' } };
          tRow.getCell(1).alignment = { horizontal: 'left', vertical: 'middle' };
          tRow.getCell(1).fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAF3E6' } };

          for (let i = 0; i < dates.length; i++) {
            const cell = tRow.getCell(i + 2);
            let argb;
            if (i >= startOff && i <= endOff) {
              argb = barArgb;                  // バー: フェーズカラー
            } else if (isWeekend(i)) {
              argb = 'FFE8E8E8';               // 土日: グレー
            } else {
              argb = 'FFFFFFFF';               // 平日: 白
            }
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
          }
          nextRowIdx++;
        });
      });
    }

    // ── ダウンロード ──
    const projName = (d.projectName || 'project').replace(/[/\\?%*:|"<>]/g, '_');
    const buffer   = await wb.xlsx.writeBuffer();
    const blob     = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url;
    a.download = `${projName}_スケジュール.xlsx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

  } catch (e) {
    console.error('Excel出力エラー:', e);
    alert('Excel出力に失敗しました: ' + e.message);
  }
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

  // メンバー管理ボタン（masterのみ表示）
  const existingMemberBtn = document.getElementById('member-mgmt-btn');
  if (existingMemberBtn) existingMemberBtn.remove();
  if (isMasterRole && sbClient) {
    const settingsBtn = document.getElementById('proj-settings-btn');
    if (settingsBtn) {
      const memberBtn = document.createElement('button');
      memberBtn.id = 'member-mgmt-btn';
      memberBtn.title = 'メンバー管理';
      memberBtn.onclick = showMemberModal;
      memberBtn.onmouseover = function() { this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'; };
      memberBtn.onmouseout  = function() { this.style.borderColor='var(--border2)'; this.style.color='var(--text2)'; };
      memberBtn.style.cssText = 'display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:var(--bg2);border:1px solid var(--border2);border-radius:8px;cursor:pointer;transition:all .2s;color:var(--text2);';
      memberBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="9" cy="7" r="3.5" stroke="currentColor" stroke-width="1.4"/><path d="M2 21c0-3.87 3.13-7 7-7s7 3.13 7 7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><path d="M19 8v6M22 11h-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
      settingsBtn.parentElement.insertBefore(memberBtn, settingsBtn);
    }
  }
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
  const tabs = ['kanban','status','list','done'];
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
  if (tab === 'list')   renderMemberListView();
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
    addBtn.addEventListener('mouseenter', () => { addBtn.style.borderColor='var(--nothing-red)'; addBtn.style.color='var(--nothing-red)'; });
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
  if (!currentUser) { _showLoginModal(); return; }
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

  // ゲストモード：現在の共有プロジェクトのみ表示
  if (isGuestMode) {
    const name = generatedData?.projectName || '共有プロジェクト';
    list.innerHTML = `
      <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:7px;background:var(--accent-glow);">
        <div style="width:6px;height:6px;border-radius:50%;background:var(--accent);flex-shrink:0;"></div>
        <div style="font-size:12px;font-weight:600;color:var(--accent);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'DM Sans',sans-serif;">${name}</div>
      </div>
      <div style="font-family:'DM Mono',monospace;font-size:9px;color:var(--text3);padding:4px 10px;">共有リンクで閲覧中</div>`;
    return;
  }

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
    compactCard.style.cssText = `display:flex;align-items:flex-start;gap:6px;padding:5px 60px 5px 12px;border:none;border-radius:6px;background:rgba(255,255,255,0.42);position:relative;`;

    const nameText = document.createElement('span');
    nameText.contentEditable = 'true';
    nameText.style.cssText = `font-size:12px;color:var(--text2);flex:1;outline:none;cursor:text;word-break:break-word;line-height:1.5;`;
    nameText.textContent = taskRef.name;
    nameText.addEventListener('input', () => { getTaskByPath(mi,path).name = nameText.textContent.trim() || taskRef.name; });
    nameText.addEventListener('click', e => e.stopPropagation());

    // スケジュール復帰ボタン
    const restoreBtn = document.createElement('button');
    restoreBtn.type = 'button';
    restoreBtn.title = 'スケジュールに戻す';
    restoreBtn.style.cssText = `position:absolute;right:26px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:11px;padding:1px 3px;opacity:0;transition:opacity .15s;`;
    restoreBtn.textContent = '↩';

    // 削除ボタン
    const scopeDelBtn = document.createElement('button');
    scopeDelBtn.type = 'button';
    scopeDelBtn.title = 'タスクを削除';
    scopeDelBtn.style.cssText = `position:absolute;right:4px;top:50%;transform:translateY(-50%);background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;line-height:1;padding:1px 4px;opacity:0;transition:color .15s, opacity .15s;`;
    scopeDelBtn.textContent = '×';
    scopeDelBtn.addEventListener('mouseenter', () => scopeDelBtn.style.color='#dc2626');
    scopeDelBtn.addEventListener('mouseleave', () => scopeDelBtn.style.color='var(--text3)');
    scopeDelBtn.addEventListener('click', e => {
      e.stopPropagation();
      removeTaskByPath(mi, path);
      syncMemberUI();
    });

    compactCard.addEventListener('mouseenter', () => { restoreBtn.style.opacity='1'; scopeDelBtn.style.opacity='1'; });
    compactCard.addEventListener('mouseleave', () => { restoreBtn.style.opacity='0'; scopeDelBtn.style.opacity='0'; });
    restoreBtn.addEventListener('click', e => {
      e.stopPropagation();
      getTaskByPath(mi, path).excludeFromSchedule = false;
      syncMemberUI();
    });

    compactCard.appendChild(nameText);
    compactCard.appendChild(restoreBtn);
    compactCard.appendChild(scopeDelBtn);
    item.appendChild(compactCard);
    return item;
  }

  const indentPx = depth * 14;
  // 子タスク（depth>0）はコンパクトインデント表示
  if (depth > 0) {
    const compactChild = document.createElement('div');
    compactChild.style.cssText = `display:flex;align-items:flex-start;gap:6px;padding:4px 24px 4px ${10+indentPx}px;border-left:2px solid ${pc.text}44;background:var(--bg3);position:relative;border-radius:0 4px 4px 0;margin-left:${indentPx}px;`;
    const childName = document.createElement('span');
    childName.contentEditable = 'true';
    childName.style.cssText = `font-size:11px;color:var(--text2);flex:1;outline:none;cursor:text;word-break:break-word;line-height:1.5;`;
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
