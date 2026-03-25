/* globals EventSource */
(function () {
  'use strict';

  // --- Config ---
  const API_BASE = 'https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io';

  // --- DOM refs ---
  const sessionSelect = document.getElementById('session-select');
  const createSessionBtn = document.getElementById('create-session-btn');
  const editSessionBtn = document.getElementById('edit-session-btn');
  const landing = document.getElementById('landing');
  const dashboard = document.getElementById('dashboard');
  const trackPage = document.getElementById('track-page');
  const allSkillsPage = document.getElementById('all-skills-page');
  const sessionInfoEl = document.getElementById('session-info');
  const sessionStatsEl = document.getElementById('session-stats');
  const podiumEl = document.getElementById('podium');
  const podiumCountdownEl = document.getElementById('podium-countdown');
  const podiumSection = document.getElementById('podium-section');
  const participantsBody = document.querySelector('#participants-table tbody');
  const participantsHeadRow = document.getElementById('participants-thead-row');
  const feedList = document.getElementById('feed-list');

  // Modal
  const modalOverlay = document.getElementById('modal-overlay');
  const createForm = document.getElementById('create-session-form');
  const modalCancel = document.getElementById('modal-cancel');
  const snippetResult = document.getElementById('snippet-result');
  const snippetSessionId = document.getElementById('snippet-session-id');
  const snippetCode = document.getElementById('snippet-code');
  const copySnippetBtn = document.getElementById('copy-snippet-btn');

  // Edit Modal
  const editModalOverlay = document.getElementById('edit-modal-overlay');
  const editForm = document.getElementById('edit-session-form');
  const editModalCancel = document.getElementById('edit-modal-cancel');
  const editSnippetResult = document.getElementById('edit-snippet-result');
  const editSnippetSessionId = document.getElementById('edit-snippet-session-id');
  const editSnippetCode = document.getElementById('edit-snippet-code');
  const editCopySnippetBtn = document.getElementById('edit-copy-snippet-btn');

  // Search Modal
  const searchUserBtn = document.getElementById('search-user-btn');
  const searchModalOverlay = document.getElementById('search-modal-overlay');
  const searchForm = document.getElementById('search-user-form');
  const searchModalClose = document.getElementById('search-modal-close');
  const searchResultsDiv = document.getElementById('search-results');
  const searchResultsBody = document.querySelector('#search-results-table tbody');
  const searchUserProfile = document.getElementById('search-user-profile');
  const searchEmpty = document.getElementById('search-empty');
  const searchViewSummaryBtn = document.getElementById('search-view-summary');
  const searchViewDetailBtn = document.getElementById('search-view-detail');
  const searchSummaryView = document.getElementById('search-summary-view');
  const searchDetailView = document.getElementById('search-detail-view');
  const searchSortOptions = document.getElementById('search-sort-options');
  const searchSortSelect = document.getElementById('search-sort-select');

  let currentSearchResults = null;

  let currentSessionId = null;
  let currentSession = null;
  let eventSource = null;
  let countdownTimer = null;

  // --- Init ---
  (async function init() {
    await loadSessions();

    sessionSelect.addEventListener('change', onSessionChange);
    createSessionBtn.addEventListener('click', openModal);
    editSessionBtn.addEventListener('click', openEditModal);
    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    createForm.addEventListener('submit', onCreateSession);
    copySnippetBtn.addEventListener('click', copySnippet);

    editModalCancel.addEventListener('click', closeEditModal);
    editModalOverlay.addEventListener('click', (e) => {
      if (e.target === editModalOverlay) closeEditModal();
    });
    editForm.addEventListener('submit', onEditSession);
    editCopySnippetBtn.addEventListener('click', copyEditSnippet);

    searchUserBtn.addEventListener('click', openSearchModal);
    searchModalClose.addEventListener('click', closeSearchModal);
    searchModalOverlay.addEventListener('click', (e) => {
      if (e.target === searchModalOverlay) closeSearchModal();
    });
    searchForm.addEventListener('submit', onSearchUser);
    searchViewSummaryBtn.addEventListener('click', () => switchSearchView('summary'));
    searchViewDetailBtn.addEventListener('click', () => switchSearchView('detail'));
    searchSortSelect.addEventListener('change', () => renderDetailView(currentSearchResults));

    // Auto-select from URL
    const params = new URLSearchParams(window.location.search);
    const sid = params.get('session');
    if (sid) {
      sessionSelect.value = sid;
      onSessionChange();
    }
  })();

  // --- API ---
  async function api(path, options) {
    const res = await fetch(`${API_BASE}${path}`, options);
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  }

  // --- Sessions ---
  async function loadSessions() {
    try {
      const sessions = await api('/api/sessions');
      sessionSelect.innerHTML = '<option value="">세션을 선택하세요...</option>';
      for (const s of sessions) {
        const opt = document.createElement('option');
        opt.value = s.id;
        const date = new Date(s.createdAt).toLocaleDateString('ko-KR');
        opt.textContent = `${s.name} (${s.track}) — ${date}`;
        sessionSelect.appendChild(opt);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  }

  async function onSessionChange() {
    currentSessionId = sessionSelect.value;

    // Always switch to home view (hides track/skills pages)
    showPage('home');
    // Clear hash without triggering hashchange
    if (location.hash) {
      history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    if (!currentSessionId) {
      editSessionBtn.classList.add('hidden');
      disconnectSSE();
      clearCountdown();
      return;
    }
    editSessionBtn.classList.remove('hidden');
    updateURL();
    await refreshDashboard();
    connectSSE();
  }

  function updateURL() {
    const params = new URLSearchParams();
    if (currentSessionId) params.set('session', currentSessionId);
    const qs = params.toString();
    history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname);
  }

  // --- Dashboard refresh ---
  async function refreshDashboard() {
    if (!currentSessionId) return;
    try {
      const [sessionData, lbData] = await Promise.all([
        api(`/api/sessions/${currentSessionId}`),
        api(`/api/sessions/${currentSessionId}/leaderboard`),
      ]);
      currentSession = sessionData;
      const isAllSession = sessionData.name && sessionData.name.startsWith('All');

      renderSessionInfo(sessionData);
      renderStats(sessionData);

      if (isAllSession) {
        podiumSection.classList.add('hidden');
      } else {
        podiumSection.classList.remove('hidden');
        renderPodium(lbData.leaderboard);
        renderCountdown(sessionData);
      }

      renderParticipants(lbData.leaderboard, lbData.participants, isAllSession);
      renderFeedFromHistory(lbData.recentEvents || []);
    } catch (err) {
      console.error('Dashboard refresh error:', err);
    }
  }

  // --- Render: Session info ---
  function renderSessionInfo(s) {
    const start = s.startDate ? new Date(s.startDate).toLocaleString('ko-KR') : '-';
    const end = s.endDate ? new Date(s.endDate).toLocaleString('ko-KR') : '-';
    sessionInfoEl.innerHTML = `
      <strong>${escapeHtml(s.name)}</strong> &nbsp;|&nbsp;
      트랙: ${escapeHtml(s.track)} &nbsp;|&nbsp;
      기간: ${start} ~ ${end}
    `;
  }

  // --- Render: Stats ---
  function renderStats(s) {
    if (!s.stats) { sessionStatsEl.innerHTML = ''; return; }
    sessionStatsEl.innerHTML = `
      <div class="stat-card">
        <span class="stat-value">${s.stats.started}</span>
        <span class="stat-label">시작</span>
      </div>
      <div class="stat-card highlight">
        <span class="stat-value">${s.stats.completed}</span>
        <span class="stat-label">완료</span>
      </div>
      <div class="stat-card">
        <span class="stat-value">${s.stats.completionRate}%</span>
        <span class="stat-label">완료율</span>
      </div>
    `;
  }

  // --- Render: Podium ---
  function renderPodium(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) {
      podiumEl.innerHTML = '<div class="podium-empty">아직 완료한 참가자가 없습니다</div>';
      return;
    }

    const trophies = ['🥇', '🥈', '🥉'];
    const top10 = leaderboard.slice(0, 10);

    // Pyramid rows: 1, 2, 3, 4
    const rows = [];
    let idx = 0;
    for (let rowSize = 1; rowSize <= 4 && idx < top10.length; rowSize++) {
      rows.push(top10.slice(idx, idx + rowSize));
      idx += rowSize;
    }

    let html = '';
    for (const row of rows) {
      html += '<div class="podium-row">';
      for (const entry of row) {
        const avatarUrl = `https://github.com/${encodeURIComponent(entry.username)}.png?size=100`;
        const time = new Date(entry.completedAt).toLocaleString('ko-KR', {
          month: 'short', day: 'numeric',
          hour: '2-digit', minute: '2-digit',
        });
        const trophy = entry.rank <= 3 ? trophies[entry.rank - 1] : '';
        const rankLabel = entry.rank <= 3
          ? (entry.rank === 1 ? '1st Place' : entry.rank === 2 ? '2nd Place' : '3rd Place')
          : `${entry.rank}th`;

        html += `
          <div class="podium-card rank-${entry.rank}">
            <img class="podium-avatar" src="${avatarUrl}"
                 alt="${escapeAttr(entry.username)}"
                 onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23aaa%22 font-size=%2240%22>${entry.username[0].toUpperCase()}</text></svg>'">
            <div class="podium-info">
              <div class="podium-rank-row">
                <span class="podium-rank-label">${rankLabel}</span>
                ${trophy ? `<span class="podium-trophy">${trophy}</span>` : ''}
              </div>
              <div class="podium-username">${escapeHtml(entry.username)}</div>
              <div class="podium-time">${time}</div>
            </div>
          </div>
        `;
      }
      html += '</div>';
    }

    podiumEl.innerHTML = html;
  }

  // --- Render: Countdown ---
  function renderCountdown(session) {
    clearCountdown();
    if (!session.endDate) {
      podiumCountdownEl.innerHTML = '';
      return;
    }

    function update() {
      const now = Date.now();
      const end = new Date(session.endDate).getTime();
      const diff = end - now;
      if (diff <= 0) {
        podiumCountdownEl.innerHTML = `
          <div class="countdown-label">종료됨</div>
        `;
        clearCountdown();
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const parts = [];
      if (d > 0) parts.push(`${d}d`);
      parts.push(`${String(h).padStart(2, '0')}h`);
      parts.push(`${String(m).padStart(2, '0')}m`);
      parts.push(`${String(s).padStart(2, '0')}s`);
      podiumCountdownEl.innerHTML = `
        <div class="countdown-label">Ends in</div>
        <div class="countdown-value">${parts.join(' ')}</div>
      `;
    }
    update();
    countdownTimer = setInterval(update, 1000);
  }

  function clearCountdown() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
  }

  // --- Render: Participants table (dynamic columns) ---
  const PAGE_SIZE = 100;
  let currentPage = 1;
  let cachedParticipantsData = null;

  function renderParticipants(leaderboard, participants, isAllSession) {
    // For "All" sessions, sort by startedAt instead of rank
    if (isAllSession) {
      participants = [...participants].sort((a, b) => {
        const ta = a.startedAt ? new Date(a.startedAt).getTime() : Infinity;
        const tb = b.startedAt ? new Date(b.startedAt).getTime() : Infinity;
        return ta - tb;
      });
    }

    cachedParticipantsData = { leaderboard, participants, isAllSession };
    currentPage = 1;
    renderParticipantsPage();
  }

  function renderParticipantsPage() {
    const { leaderboard, participants, isAllSession } = cachedParticipantsData;
    participantsBody.innerHTML = '';
    participantsHeadRow.innerHTML = '';

    // Build rank map from leaderboard
    const rankMap = new Map();
    for (const entry of leaderboard) {
      rankMap.set(entry.username, entry.rank);
    }

    // Collect all dynamic columns from all participants' events
    const columnMap = new Map();
    for (const p of participants) {
      if (p.startedAt) {
        const label = p.startDescription || '시작';
        if (!columnMap.has('start')) {
          columnMap.set('start', { label, order: -1 });
        }
      }
      if (p.steps) {
        for (const s of p.steps) {
          const key = `step_${s.step}`;
          if (!columnMap.has(key)) {
            columnMap.set(key, { label: s.description || `Step ${s.step}`, order: s.step });
          }
        }
      }
      if (p.completedAt) {
        const label = p.endDescription || '완료';
        if (!columnMap.has('end')) {
          columnMap.set('end', { label, order: 99999 });
        }
      }
    }

    const dynamicCols = Array.from(columnMap.entries())
      .sort((a, b) => a[1].order - b[1].order);

    // Build header row
    const firstColHeader = isAllSession ? '#' : 'Rank';
    const fixedHeaders = [firstColHeader, 'GitHub ID', 'Repo'];
    for (const h of fixedHeaders) {
      const th = document.createElement('th');
      th.textContent = h;
      participantsHeadRow.appendChild(th);
    }
    for (const [, col] of dynamicCols) {
      const th = document.createElement('th');
      th.textContent = col.label;
      th.className = 'dynamic-col-header';
      participantsHeadRow.appendChild(th);
    }
    const statusTh = document.createElement('th');
    statusTh.textContent = '상태';
    participantsHeadRow.appendChild(statusTh);

    // Pagination
    const totalPages = Math.ceil(participants.length / PAGE_SIZE);
    const startIdx = (currentPage - 1) * PAGE_SIZE;
    const pageItems = participants.slice(startIdx, startIdx + PAGE_SIZE);

    // Build rows
    for (let i = 0; i < pageItems.length; i++) {
      const p = pageItems[i];
      const tr = document.createElement('tr');
      const avatarUrl = `https://github.com/${encodeURIComponent(p.username)}.png?size=64`;

      const repoLink = p.repo
        ? `<a href="https://github.com/${escapeAttr(p.repo)}" target="_blank" rel="noopener" class="repo-link">${escapeHtml(p.repo)}</a>`
        : '-';

      let firstColValue, firstColClass;
      if (isAllSession) {
        firstColValue = startIdx + i + 1;
        firstColClass = '';
      } else {
        const rank = rankMap.get(p.username);
        firstColValue = rank || '-';
        firstColClass = rank && rank <= 3 ? `rank-${rank}-cell` : '';
      }

      let rowHtml = `
        <td class="rank-cell ${firstColClass}">${firstColValue}</td>
        <td>
          <div class="user-cell">
            <img class="user-avatar" src="${avatarUrl}" alt=""
                 onerror="this.style.display='none'">
            <div>
              <div class="user-name">${escapeHtml(p.username)}</div>
              <div class="user-handle">@${escapeHtml(p.username)}</div>
            </div>
          </div>
        </td>
        <td>${repoLink}</td>
      `;

      const stepMap = new Map();
      if (p.steps) {
        for (const s of p.steps) {
          stepMap.set(`step_${s.step}`, s.timestamp);
        }
      }

      for (const [key] of dynamicCols) {
        let ts = null;
        if (key === 'start') {
          ts = p.startedAt;
        } else if (key === 'end') {
          ts = p.completedAt;
        } else {
          ts = stepMap.get(key) || null;
        }
        const formatted = ts ? formatTimestamp(ts) : '-';
        rowHtml += `<td class="ts-cell">${formatted}</td>`;
      }

      rowHtml += `
        <td>
          <span class="status-badge ${p.status === 'completed' ? 'status-completed' : 'status-started'}">
            ${p.status === 'completed' ? '완료' : p.status === 'in_progress' ? '진행 중' : '시작'}
          </span>
        </td>
      `;

      tr.innerHTML = rowHtml;
      participantsBody.appendChild(tr);
    }

    // Render pagination controls
    renderPagination(totalPages, participants.length);
  }

  function renderPagination(totalPages, totalItems) {
    let paginationEl = document.getElementById('participants-pagination');
    if (!paginationEl) {
      paginationEl = document.createElement('div');
      paginationEl.id = 'participants-pagination';
      paginationEl.className = 'pagination';
      document.getElementById('participants-panel').appendChild(paginationEl);
    }

    if (totalPages <= 1) {
      paginationEl.innerHTML = '';
      return;
    }

    const startIdx = (currentPage - 1) * PAGE_SIZE + 1;
    const endIdx = Math.min(currentPage * PAGE_SIZE, totalItems);

    let html = `<span class="pagination-info">${startIdx}-${endIdx} / ${totalItems}명</span>`;
    html += `<button class="pagination-btn" data-page="prev" ${currentPage <= 1 ? 'disabled' : ''}>← 이전</button>`;

    const maxButtons = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) {
      startPage = Math.max(1, endPage - maxButtons + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      html += `<button class="pagination-btn ${i === currentPage ? 'active' : ''}" data-page="${i}">${i}</button>`;
    }

    html += `<button class="pagination-btn" data-page="next" ${currentPage >= totalPages ? 'disabled' : ''}>다음 →</button>`;
    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('.pagination-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.page;
        if (val === 'prev') currentPage--;
        else if (val === 'next') currentPage++;
        else currentPage = parseInt(val, 10);
        renderParticipantsPage();
      });
    });
  }

  function formatTimestamp(isoStr) {
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    return `<span class="ts-date">${date}</span><span class="ts-time">${time}</span>`;
  }

  function formatDuration(ms) {
    if (ms < 0) ms = 0;
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}초`;
    const min = Math.floor(sec / 60);
    const remSec = sec % 60;
    if (min < 60) return `${min}분 ${remSec}초`;
    const hr = Math.floor(min / 60);
    const remMin = min % 60;
    return `${hr}시간 ${remMin}분`;
  }

  // --- SSE ---
  function connectSSE() {
    disconnectSSE();
    const url = `${API_BASE}/api/stream${currentSessionId ? `?sessionId=${currentSessionId}` : ''}`;
    eventSource = new EventSource(url);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'start' || data.type === 'end' || data.type === 'step') {
          addFeedItem(data);
          showCelebration(data);
          refreshDashboard();
        }
      } catch { /* ignore non-JSON */ }
    };
    eventSource.onerror = () => { /* will auto-reconnect */ };
  }

  function disconnectSSE() {
    if (eventSource) { eventSource.close(); eventSource = null; }
  }

  function addFeedItem(data) {
    const li = document.createElement('li');
    const time = new Date(data.timestamp).toLocaleTimeString('ko-KR', {
      hour: '2-digit', minute: '2-digit',
    });
    const avatarUrl = `https://github.com/${encodeURIComponent(data.username)}.png?size=32`;
    const avatarHtml = `<img class="feed-avatar" src="${avatarUrl}" alt="" onerror="this.style.display='none'">`;
    if (data.type === 'start') {
      li.innerHTML = `<span class="feed-time">${time}</span> ${avatarHtml} 🚀 <strong>${escapeHtml(data.username)}</strong> 실습을 시작했습니다!`;
    } else if (data.type === 'step') {
      const desc = data.description || `Step ${data.step}`;
      li.innerHTML = `<span class="feed-time">${time}</span> ${avatarHtml} 📌 <strong>${escapeHtml(data.username)}</strong> <em>${escapeHtml(desc)}</em> 단계를 통과했습니다!`;
    } else {
      li.innerHTML = `<span class="feed-time">${time}</span> ${avatarHtml} 🎉 <strong>${escapeHtml(data.username)}</strong> 실습을 완료했습니다!`;
    }
    feedList.prepend(li);
    while (feedList.children.length > 10) {
      feedList.removeChild(feedList.lastChild);
    }
  }

  // --- Celebration effect ---
  function showCelebration(data) {
    const overlay = document.createElement('div');
    overlay.className = 'celebration-overlay';

    const emoji = data.type === 'end' ? '🎉' : data.type === 'step' ? '📌' : '🚀';
    const msg = data.type === 'end'
      ? `${data.username} 완료!`
      : data.type === 'step'
        ? `${data.username} Step 통과!`
        : `${data.username} 시작!`;

    // Create confetti particles
    const colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#58c7f3'];
    let confettiHtml = '';
    for (let i = 0; i < 40; i++) {
      const color = colors[i % colors.length];
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const size = 6 + Math.random() * 6;
      const rotation = Math.random() * 360;
      confettiHtml += `<span class="confetti-particle" style="left:${left}%;animation-delay:${delay}s;background:${color};width:${size}px;height:${size}px;transform:rotate(${rotation}deg)"></span>`;
    }

    overlay.innerHTML = `
      ${confettiHtml}
      <div class="celebration-message">
        <span class="celebration-emoji">${emoji}</span>
        <span class="celebration-text">${escapeHtml(msg)}</span>
      </div>
    `;

    document.body.appendChild(overlay);
    setTimeout(() => {
      overlay.classList.add('celebration-fade-out');
      setTimeout(() => overlay.remove(), 400);
    }, 2000);
  }

  function renderFeedFromHistory(events) {
    feedList.innerHTML = '';
    // events are already sorted desc (newest first), render in order
    for (const data of events) {
      addFeedItem(data);
    }
  }

  // --- Modal: Create session ---
  function openModal() {
    snippetResult.classList.add('hidden');
    createForm.classList.remove('hidden');
    createForm.reset();

    // Default: start = yesterday 00:00, end = 1 week later 00:00
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    const nextWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    const toLocal = (d) => {
      const pad = (n) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T00:00`;
    };
    document.getElementById('form-start').value = toLocal(yesterday);
    document.getElementById('form-end').value = toLocal(nextWeek);

    modalOverlay.classList.remove('hidden');
  }

  function closeModal() {
    modalOverlay.classList.add('hidden');
  }

  async function onCreateSession(e) {
    e.preventDefault();
    const name = document.getElementById('form-name').value.trim();
    const track = document.getElementById('form-track').value.trim();
    const startDate = document.getElementById('form-start').value
      ? new Date(document.getElementById('form-start').value).toISOString()
      : null;
    const endDate = document.getElementById('form-end').value
      ? new Date(document.getElementById('form-end').value).toISOString()
      : null;

    try {
      const result = await api('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, track, startDate, endDate }),
      });

      // Show snippet
      snippetSessionId.textContent = result.sessionId;
      snippetCode.textContent = generateSnippet(result.sessionId, track);
      snippetResult.classList.remove('hidden');
      createForm.classList.add('hidden');

      // Reload session list
      await loadSessions();
      sessionSelect.value = result.sessionId;
      onSessionChange();
    } catch (err) {
      alert('세션 생성 실패: ' + err.message);
    }
  }

  function generateSnippet(sessionId, track) {
    const trackerUrl = API_BASE;
    return `# ===========================================
# 시작 워크플로우에 추가
# (예: .github/workflows/0-start.yml)
# ===========================================
- name: Report Start to Workshop Tracker
  if: success()
  continue-on-error: true
  run: |
    curl -sf -X POST "${trackerUrl}/api/events" \\
      -H "Content-Type: application/json" \\
      -d '{
        "sessionId": "${sessionId}",
        "type": "start",
        "username": "'\\''\$GITHUB_ACTOR'\\''",
        "repo": "'\\''\$GITHUB_REPOSITORY'\\''",
        "track": "${track}",
        "runId": "'\\''\$GITHUB_RUN_ID'\\''
      }'

# ===========================================
# 중간 Step 워크플로우에 추가 (각 Step마다)
# (예: .github/workflows/1-step.yml)
# ===========================================
- name: Report Step to Workshop Tracker
  if: success()
  continue-on-error: true
  run: |
    curl -sf -X POST "${trackerUrl}/api/events" \\
      -H "Content-Type: application/json" \\
      -d '{
        "sessionId": "${sessionId}",
        "type": "step",
        "step": 1,
        "description": "Step 1: 제목을 여기에",
        "username": "'\\''\$GITHUB_ACTOR'\\''",
        "repo": "'\\''\$GITHUB_REPOSITORY'\\''",
        "track": "${track}",
        "runId": "'\\''\$GITHUB_RUN_ID-step1'\\''
      }'

# ===========================================
# 완료 워크플로우 (마지막 Step)에 추가
# (예: .github/workflows/4-final.yml)
# ===========================================
- name: Report Completion to Workshop Tracker
  if: success()
  continue-on-error: true
  run: |
    curl -sf -X POST "${trackerUrl}/api/events" \\
      -H "Content-Type: application/json" \\
      -d '{
        "sessionId": "${sessionId}",
        "type": "end",
        "username": "'\\''\$GITHUB_ACTOR'\\''",
        "repo": "'\\''\$GITHUB_REPOSITORY'\\''",
        "track": "${track}",
        "runId": "'\\''\$GITHUB_RUN_ID'\\''
      }'
`;
  }

  function copySnippet() {
    navigator.clipboard.writeText(snippetCode.textContent).then(() => {
      copySnippetBtn.textContent = '✅ 복사됨!';
      setTimeout(() => { copySnippetBtn.textContent = '📋 복사'; }, 2000);
    });
  }

  // --- Modal: Edit session ---
  function openEditModal() {
    if (!currentSession) return;
    editSnippetResult.classList.add('hidden');
    editForm.classList.remove('hidden');
    document.getElementById('edit-form-name').value = currentSession.name || '';
    document.getElementById('edit-form-track').value = currentSession.track || '';
    if (currentSession.startDate) {
      document.getElementById('edit-form-start').value = toLocalDateTimeString(currentSession.startDate);
    } else {
      document.getElementById('edit-form-start').value = '';
    }
    if (currentSession.endDate) {
      document.getElementById('edit-form-end').value = toLocalDateTimeString(currentSession.endDate);
    } else {
      document.getElementById('edit-form-end').value = '';
    }
    editModalOverlay.classList.remove('hidden');
  }

  function closeEditModal() {
    editModalOverlay.classList.add('hidden');
  }

  function toLocalDateTimeString(isoStr) {
    const d = new Date(isoStr);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }

  async function onEditSession(e) {
    e.preventDefault();
    const name = document.getElementById('edit-form-name').value.trim();
    const track = document.getElementById('edit-form-track').value.trim();
    const startDate = document.getElementById('edit-form-start').value
      ? new Date(document.getElementById('edit-form-start').value).toISOString()
      : null;
    const endDate = document.getElementById('edit-form-end').value
      ? new Date(document.getElementById('edit-form-end').value).toISOString()
      : null;

    try {
      const result = await api(`/api/sessions/${currentSessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, track, startDate, endDate }),
      });

      // Show snippet
      editSnippetSessionId.textContent = result.sessionId;
      editSnippetCode.textContent = generateSnippet(result.sessionId, track);
      editSnippetResult.classList.remove('hidden');
      editForm.classList.add('hidden');

      // Reload session list and refresh
      await loadSessions();
      sessionSelect.value = currentSessionId;
      await refreshDashboard();
    } catch (err) {
      alert('세션 수정 실패: ' + err.message);
    }
  }

  function copyEditSnippet() {
    navigator.clipboard.writeText(editSnippetCode.textContent).then(() => {
      editCopySnippetBtn.textContent = '✅ 복사됨!';
      setTimeout(() => { editCopySnippetBtn.textContent = '📋 복사'; }, 2000);
    });
  }

  // --- Modal: User search ---
  function openSearchModal() {
    searchResultsDiv.classList.add('hidden');
    searchEmpty.classList.add('hidden');
    searchUserProfile.innerHTML = '';
    searchResultsBody.innerHTML = '';
    searchDetailView.innerHTML = '';
    currentSearchResults = null;
    switchSearchView('summary');
    document.getElementById('search-query').value = '';
    searchModalOverlay.classList.remove('hidden');
  }

  function closeSearchModal() {
    searchModalOverlay.classList.add('hidden');
  }

  async function onSearchUser(e) {
    e.preventDefault();
    const q = document.getElementById('search-query').value.trim();
    if (!q) return;

    try {
      const data = await api(`/api/users/search?q=${encodeURIComponent(q)}`);

      if (!data.results || data.results.length === 0) {
        searchResultsDiv.classList.add('hidden');
        searchEmpty.classList.remove('hidden');
        searchUserProfile.innerHTML = '';
        return;
      }

      searchEmpty.classList.add('hidden');
      searchResultsDiv.classList.remove('hidden');

      // Store results for view toggling
      currentSearchResults = data.results;

      // Show user profile if searching by username
      const firstUser = data.results[0].username;
      const allSameUser = data.results.every((r) => r.username === firstUser);
      if (allSameUser) {
        const avatarUrl = `https://github.com/${encodeURIComponent(firstUser)}.png?size=80`;
        const completedCount = data.results.filter((r) => r.status === 'completed').length;
        const totalCount = data.results.length;
        searchUserProfile.innerHTML = `
          <img class="search-avatar" src="${avatarUrl}" alt="" onerror="this.style.display='none'">
          <div class="search-profile-info">
            <div class="search-profile-name">${escapeHtml(firstUser)}</div>
            <div class="search-profile-stats">총 ${totalCount}개 세션 참여 · ${completedCount}개 수료</div>
          </div>
        `;
      } else {
        const uniqueUsers = [...new Set(data.results.map((r) => r.username))];
        searchUserProfile.innerHTML = `
          <div class="search-profile-info">
            <div class="search-profile-name">🏢 ${escapeHtml(q)}</div>
            <div class="search-profile-stats">${uniqueUsers.length}명의 사용자 · ${data.results.length}개 참여 기록</div>
          </div>
        `;
      }

      // Render results
      searchResultsBody.innerHTML = '';
      for (const r of data.results) {
        const tr = document.createElement('tr');
        const avatarUrl = `https://github.com/${encodeURIComponent(r.username)}.png?size=32`;
        const startTime = r.startedAt
          ? new Date(r.startedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '-';
        const completeTime = r.completedAt
          ? new Date(r.completedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
          : '-';
        const repoLink = r.repo
          ? `<a href="https://github.com/${escapeAttr(r.repo)}" target="_blank" rel="noopener" class="repo-link">${escapeHtml(r.repo)}</a>`
          : '-';

        tr.innerHTML = `
          <td><a href="#" class="search-session-link" data-session-id="${escapeAttr(r.sessionId)}">${escapeHtml(r.sessionName)}</a></td>
          <td>${escapeHtml(r.sessionTrack)}</td>
          <td>
            <div class="user-cell">
              <img class="user-avatar" src="${avatarUrl}" alt="" onerror="this.style.display='none'">
              <span>${escapeHtml(r.username)}</span>
            </div>
          </td>
          <td>${repoLink}</td>
          <td>${startTime}</td>
          <td>${completeTime}</td>
          <td>
            <span class="status-badge ${r.status === 'completed' ? 'status-completed' : 'status-started'}">
              ${r.status === 'completed' ? '수료' : '진행 중'}
            </span>
          </td>
        `;
        searchResultsBody.appendChild(tr);
      }

      // Wire session links in summary view
      searchResultsBody.querySelectorAll('.search-session-link').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault();
          closeSearchModal();
          sessionSelect.value = link.dataset.sessionId;
          sessionSelect.dispatchEvent(new Event('change'));
        });
      });
    } catch (err) {
      alert('검색 실패: ' + err.message);
    }
  }

  // --- Search view toggle ---
  function switchSearchView(mode) {
    if (mode === 'summary') {
      searchViewSummaryBtn.classList.add('active');
      searchViewDetailBtn.classList.remove('active');
      searchSummaryView.classList.remove('hidden');
      searchDetailView.classList.add('hidden');
      searchSortOptions.classList.add('hidden');
    } else {
      searchViewSummaryBtn.classList.remove('active');
      searchViewDetailBtn.classList.add('active');
      searchSummaryView.classList.add('hidden');
      searchDetailView.classList.remove('hidden');
      searchSortOptions.classList.remove('hidden');
      if (currentSearchResults) {
        renderDetailView(currentSearchResults);
      }
    }
  }

  function renderDetailView(results) {
    if (!results || results.length === 0) {
      searchDetailView.innerHTML = '<p class="search-empty">이벤트 이력이 없습니다.</p>';
      return;
    }

    const sortMode = searchSortSelect.value;

    // Group by track
    const trackGroups = new Map();
    for (const r of results) {
      const track = r.sessionTrack || '(알 수 없음)';
      if (!trackGroups.has(track)) {
        trackGroups.set(track, {
          track,
          sessionId: r.sessionId,
          sessionName: r.sessionName,
          participants: [],
        });
      }
      const group = trackGroups.get(track);
      group.participants.push(r);
    }

    // Sort tracks
    let sortedTracks = Array.from(trackGroups.values());
    if (sortMode === 'track-asc') {
      sortedTracks.sort((a, b) => a.track.localeCompare(b.track));
    } else if (sortMode === 'track-desc') {
      sortedTracks.sort((a, b) => b.track.localeCompare(a.track));
    } else if (sortMode === 'time-asc') {
      sortedTracks.sort((a, b) => {
        const ta = a.participants[0]?.startedAt ? new Date(a.participants[0].startedAt).getTime() : 0;
        const tb = b.participants[0]?.startedAt ? new Date(b.participants[0].startedAt).getTime() : 0;
        return ta - tb;
      });
    } else {
      sortedTracks.sort((a, b) => {
        const ta = a.participants[0]?.startedAt ? new Date(a.participants[0].startedAt).getTime() : 0;
        const tb = b.participants[0]?.startedAt ? new Date(b.participants[0].startedAt).getTime() : 0;
        return tb - ta;
      });
    }

    let html = '';
    for (const group of sortedTracks) {
      // Collect dynamic columns from all participants' events in this track
      const columnMap = new Map();
      for (const p of group.participants) {
        if (p.startedAt) {
          if (!columnMap.has('start')) {
            const label = (p.events && p.events.find(e => e.type === 'start'))?.description || '실습 시작';
            columnMap.set('start', { label, order: -1 });
          }
        }
        if (p.events) {
          for (const ev of p.events) {
            if (ev.type === 'step' && ev.step != null) {
              const key = `step_${ev.step}`;
              if (!columnMap.has(key)) {
                columnMap.set(key, { label: ev.description || `Step ${ev.step}`, order: ev.step });
              }
            }
          }
        }
        if (p.completedAt) {
          if (!columnMap.has('end')) {
            const label = (p.events && p.events.find(e => e.type === 'end'))?.description || '완료';
            columnMap.set('end', { label, order: 99999 });
          }
        }
      }

      // If no events array, fall back to start/end from summary data
      if (columnMap.size === 0) {
        for (const p of group.participants) {
          if (p.startedAt && !columnMap.has('start')) {
            columnMap.set('start', { label: '실습 시작', order: -1 });
          }
          if (p.completedAt && !columnMap.has('end')) {
            columnMap.set('end', { label: '완료', order: 99999 });
          }
        }
      }

      const dynamicCols = Array.from(columnMap.entries())
        .sort((a, b) => a[1].order - b[1].order);

      // Count completed
      const completedCount = group.participants.filter(p => p.status === 'completed').length;

      // Build header
      let tableHtml = `
        <div class="detail-track-group">
          <div class="detail-track-header">
            <span class="detail-track-name">${escapeHtml(group.track)}</span>
            <a href="#" class="detail-session-link" data-session-id="${escapeAttr(group.sessionId)}">${escapeHtml(group.sessionName)}</a>
          </div>
          <div class="detail-table-wrapper">
            <table class="detail-events-table">
              <thead>
                <tr>
                  <th>GitHub ID</th>
      `;

      for (const [, col] of dynamicCols) {
        tableHtml += `<th class="dynamic-col-header">${escapeHtml(col.label)}</th>`;
      }
      tableHtml += `<th>상태</th></tr></thead><tbody>`;

      // Build rows for each participant
      for (const p of group.participants) {
        const avatarUrl = `https://github.com/${encodeURIComponent(p.username)}.png?size=64`;

        // Build step lookup from events
        const stepMap = new Map();
        if (p.events) {
          for (const ev of p.events) {
            if (ev.type === 'step' && ev.step != null) {
              stepMap.set(`step_${ev.step}`, ev.timestamp);
            }
          }
        }

        let rowHtml = `
          <td>
            <div class="user-cell">
              <img class="user-avatar" src="${avatarUrl}" alt="" onerror="this.style.display='none'">
              <div>
                <div class="user-name">${escapeHtml(p.username)}</div>
                <div class="user-handle">@${escapeHtml(p.username)}</div>
              </div>
            </div>
          </td>
        `;

        // Dynamic columns
        for (const [key] of dynamicCols) {
          let ts = null;
          if (key === 'start') {
            ts = p.startedAt;
          } else if (key === 'end') {
            ts = p.completedAt;
          } else {
            ts = stepMap.get(key) || null;
          }
          const formatted = ts ? formatTimestamp(ts) : '-';
          rowHtml += `<td class="ts-cell">${formatted}</td>`;
        }

        // Status
        rowHtml += `
          <td>
            <span class="status-badge ${p.status === 'completed' ? 'status-completed' : 'status-started'}">
              ${p.status === 'completed' ? '수료' : '진행 중'}
            </span>
          </td>
        `;

        tableHtml += `<tr>${rowHtml}</tr>`;
      }

      tableHtml += `</tbody></table></div></div>`;
      html += tableHtml;
    }

    searchDetailView.innerHTML = html;

    // Wire session links in detail view
    searchDetailView.querySelectorAll('.detail-session-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        closeSearchModal();
        sessionSelect.value = link.dataset.sessionId;
        sessionSelect.dispatchEvent(new Event('change'));
      });
    });
  }

  // --- Utility ---
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function escapeAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // ============================================================
  // SIDEBAR & TRACK DATA
  // ============================================================

  const TRACKS = {
    track1a: {
      title: 'Track 1-A',
      subtitle: '내 이름으로 된 웹사이트, 오늘 만들고 퇴근하기',
      audience: '비개발자 / 기획·마케터',
      duration: '3시간',
      result: '나만의 퍼스널 웹사이트 (실제 URL 완성)',
      story: '오늘 수업이 끝나면 명함에 넣을 수 있는 나만의 웹사이트 주소가 생깁니다.',
      modules: [
        { num: 1, title: '인터넷에 내 공간 선점하기', learn: 'Repository, Issue, 웹에서 파일 편집', skill: 'Introduction to GitHub', repo: 'introduction-to-github', sessionId: 'f87b3b97' },
        { num: 2, title: '내 글을 있어 보이게 만드는 비법', learn: '텍스트로 표, 강조, 이미지 자유자재', skill: 'Communicate using Markdown', repo: 'communicate-using-markdown', sessionId: '3d73a707' },
        { num: 3, title: '클릭 한 번으로 내 사이트 인터넷에 올리기', learn: '실제 URL로 접속되는 나만의 웹사이트 완성', skill: 'GitHub Pages', repo: 'github-pages', sessionId: 'fe72e72d' },
        { num: 4, title: '팀원과 함께 완성하는 내 사이트', learn: 'Labels, Milestones, Wiki, 협업 경험', skill: 'Intro to Repository Management', repo: 'introduction-to-repository-management', sessionId: '53ea0af7' },
        { num: 5, title: '말로 설명하면 AI가 앱을 뚝딱 만들어준다', learn: '노코딩으로 앱 생성 — 워크샵 하이라이트!', skill: 'Turn an idea into an app with GitHub Spark', repo: 'idea-to-app-with-spark', sessionId: 'f89101e2' },
      ],
    },
    track1b: {
      title: 'Track 1-B',
      subtitle: '내 코드, 팀원 코드와 절대 충돌 안 나게 관리하기',
      audience: '개발자 입문자',
      duration: '3.5시간',
      result: '팀 협업 레포지토리 + 충돌 없는 워크플로우',
      story: '퇴근 후 카페에서 노트북 없이 iPad로도 코딩하는 개발자가 됩니다.',
      modules: [
        { num: 1, title: '내 코드에 타임머신 달기', learn: 'git init / add / commit / push / pull', skill: 'Introduction to Git', repo: 'introduction-to-git', sessionId: 'cc895746' },
        { num: 2, title: '동료 코드, 부담 없이 피드백 주고받기', learn: 'PR 리뷰로 팀 코드 품질 올리는 법', skill: 'Review Pull Requests', repo: 'review-pull-requests', sessionId: '348394ce' },
        { num: 3, title: '코드 충돌? 이제 두렵지 않다', learn: '머지 충돌을 자신 있게 해결하는 경험', skill: 'Resolve Merge Conflicts', repo: 'resolve-merge-conflicts', sessionId: '82934411' },
        { num: 4, title: '내 PC 없어도 어디서든 코딩하기', learn: '브라우저만 있으면 되는 개발 환경 완성', skill: 'Code with Codespaces', repo: 'code-with-codespaces', sessionId: '2536adf1' },
      ],
    },
    track2: {
      title: 'Track 2',
      subtitle: 'AI 동료를 고용해서 혼자 2배 빠르게 앱 만들기',
      audience: '개발자 / AI 도입 검토팀',
      duration: '4시간',
      result: 'AI와 함께 만든 실제 작동하는 앱',
      story: '오늘 수업이 끝나면 혼자였을 때보다 코딩 속도가 체감상 2배 빨라진 걸 느낍니다.',
      modules: [
        { num: 1, title: 'AI 동료 첫 출근: 같이 코딩 시작하기', learn: 'Chat, Inline suggestions, Slash commands', skill: 'Getting Started with GitHub Copilot', repo: 'getting-started-with-github-copilot', sessionId: 'c8870da8' },
        { num: 2, title: 'AI 동료 길들이기: 우리 팀 스타일로', learn: 'Custom instructions, copilot-instructions.md 설정', skill: 'Customize your GitHub Copilot Experience', repo: 'customize-your-github-copilot-experience', sessionId: '91eeac6a' },
        { num: 3, title: 'AI가 내 코드를 검토해준다고?', learn: 'PR 올리면 AI가 버그 찾아주는 경험', skill: 'GitHub Copilot Code Review', repo: 'copilot-code-review', sessionId: '208a7c01' },
        { num: 4, title: '이슈만 올리면 AI가 PR까지 만들어줌', learn: '지시만 내리고 AI가 코딩하는 경험', skill: 'Expand your team with Copilot coding agent', repo: 'expand-your-team-with-copilot', sessionId: '864ed8b8' },
        { num: 5, title: 'AI와 함께 진짜 앱 완성하기', learn: 'Agent mode로 멀티기능 앱 빌드', skill: 'Build apps with Copilot agent mode', repo: 'build-applications-w-copilot-agent-mode', sessionId: '256272c5' },
      ],
    },
    track3: {
      title: 'Track 3',
      subtitle: '내가 자는 동안에도 자동으로 배포되는 앱 만들기',
      audience: 'DevOps / 개발팀',
      duration: '3.5시간',
      result: '풀 자동화 CI/CD 파이프라인',
      story: '코드 올리고 커피 한 잔 마시고 오면 이미 배포가 끝나있는 팀을 만듭니다.',
      modules: [
        { num: 1, title: '첫 번째 로봇 일꾼 고용하기', learn: 'Workflow YAML 구조 이해 + 첫 자동화', skill: 'Hello GitHub Actions', repo: 'hello-github-actions', sessionId: '33211bf7' },
        { num: 2, title: '실수를 대신 잡아주는 시스템 만들기', learn: 'Push 시 자동 테스트 실행 파이프라인', skill: 'Test with Actions', repo: 'test-with-actions', sessionId: '215e5376' },
        { num: 3, title: '전 세계 어디서나 쓸 수 있게 포장하기', learn: 'Docker 이미지로 앱 배포', skill: 'Publish Docker Images', repo: 'publish-docker-images', sessionId: '6738d60f' },
        { num: 4, title: '한 번 만들어서 10개 프로젝트에 재사용', learn: '워크플로우 템플릿화로 생산성 극대화', skill: 'Create and use reusable workflows', repo: 'reusable-workflows', sessionId: '4695e100' },
        { num: 5, title: '파이프라인에 AI 두뇌 달기', learn: 'Actions 안에서 AI 모델 호출하기', skill: 'AI in Actions', repo: 'ai-in-actions', sessionId: 'b5af8a3b' },
      ],
    },
    track4: {
      title: 'Track 4',
      subtitle: '해커도 못 뚫는 내 프로젝트 만들기',
      audience: '보안 / 컴플라이언스 담당자',
      duration: '3시간',
      result: '보안 취약점 제로 레포지토리',
      story: '수업이 끝나면 보안 사고를 사전에 막을 수 있는 레포지토리 구성을 갖추고 나갑니다.',
      modules: [
        { num: 1, title: '내 앱을 갉아먹는 취약점 자동으로 찾기', learn: 'Dependabot이 패치 PR까지 만들어주는 경험', skill: 'Secure your repository supply chain', repo: 'secure-repository-supply-chain', sessionId: '14fe64be' },
        { num: 2, title: '비밀번호 실수로 올렸다가 망하는 일 막기', learn: 'Secret push 차단 시스템 직접 설정', skill: 'Introduction to secret scanning', repo: 'introduction-to-secret-scanning', sessionId: '8e9808b7' },
        { num: 3, title: 'AI가 코드 속 보안 구멍을 찾아준다', learn: 'CodeQL로 취약한 코드 패턴 탐지', skill: 'Introduction to CodeQL', repo: 'introduction-to-codeql', sessionId: '7ed33e7a' },
        { num: 4, title: '해커 입장에서 내 코드 직접 뚫어보기', learn: '보안 게임으로 취약점 직접 체험', skill: 'Secure code game', repo: 'secure-code-game', sessionId: '6f903c6b' },
      ],
    },
    track5: {
      title: 'Track 5',
      subtitle: '낡은 레거시 코드, AI로 하루 만에 현대화하기',
      audience: '레거시 시스템 보유 기업',
      duration: '3시간',
      result: 'COBOL → Node.js 전환 실습 완료',
      story: '금융/공공기관 레거시 시스템 보유 고객에게 특히 임팩트가 큰 트랙입니다.',
      modules: [
        { num: 1, title: 'AI 동료에게 새로운 능력 장착시키기', learn: 'MCP로 Copilot 능력 범위 확장', skill: 'Integrate MCP with GitHub Copilot', repo: 'integrate-mcp-with-copilot', sessionId: '05b8e6d2' },
        { num: 2, title: '10년 묵은 코드, AI에게 번역 맡기기', learn: 'COBOL → Node.js 실제 전환 실습', skill: 'Modernize your legacy code with GitHub Copilot', repo: 'modernize-your-legacy-code-with-github-copilot', sessionId: '22a8b157' },
        { num: 3, title: '신입이 와도 바로 일하는 팀 만들기', learn: 'Copilot Spaces로 팀 지식 공유 시스템 구축', skill: 'Scale institutional knowledge with Copilot Spaces', repo: 'scale-institutional-knowledge-using-copilot-spaces', sessionId: '8396f661' },
      ],
    },
    track6: {
      title: 'Track 6',
      subtitle: 'Azure DevOps 쓰던 팀, GitHub으로 갈아타기',
      audience: 'Azure DevOps 사용 기업',
      duration: '2시간',
      result: 'ADO 레포지토리 → GitHub 이전 완료',
      story: '단독 진행 시 2시간 / Track 1-B 또는 Track 2와 묶으면 풀데이 마이그레이션 워크샵으로 운영 가능합니다.',
      modules: [
        { num: 1, title: '지금 쓰는 것 하나도 안 버리고 GitHub으로 이사하기', learn: 'ADO 프로젝트 생성 → GitHub CLI로 마이그레이션', skill: 'Migrate an Azure DevOps Repository', repo: 'migrate-ado-repository', sessionId: 'ec8c5f46' },
      ],
    },
  };

  // --- Sidebar toggle ---
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const mainWrapper = document.getElementById('main-wrapper');

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
    mainWrapper.classList.toggle('sidebar-collapsed');
  });

  // --- Sidebar page navigation (hash-based routing) ---
  function navigateTo(pageId) {
    // Update hash → triggers hashchange → showPage
    const newHash = pageId === 'home' ? '' : pageId;
    if (location.hash === '#' + newHash || (!location.hash && !newHash)) {
      // Hash didn't change, show directly
      showPage(pageId);
    } else {
      location.hash = newHash;
    }
  }

  function showPage(pageId) {
    // Hide all pages
    landing.classList.add('hidden');
    dashboard.classList.add('hidden');
    trackPage.classList.add('hidden');
    allSkillsPage.classList.add('hidden');

    // Update active link
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    const activeLink = document.querySelector(`.sidebar-link[data-page="${pageId}"]`);
    if (activeLink) activeLink.classList.add('active');

    if (pageId === 'home') {
      if (currentSessionId) {
        dashboard.classList.remove('hidden');
      } else {
        landing.classList.remove('hidden');
      }
    } else if (pageId === 'all-skills') {
      renderAllSkillsPage();
      allSkillsPage.classList.remove('hidden');
    } else if (TRACKS[pageId]) {
      renderTrackPage(pageId);
      trackPage.classList.remove('hidden');
    }
  }

  function renderTrackPage(trackId) {
    const t = TRACKS[trackId];
    let modulesHtml = '';
    for (const m of t.modules) {
      modulesHtml += `
        <tr>
          <td class="module-num">${m.num}</td>
          <td class="module-title">${escapeHtml(m.title)}</td>
          <td class="module-learn">${escapeHtml(m.learn)}</td>
          <td class="module-skill">
            ${escapeHtml(m.skill)}
            <a href="https://github.com/skills-kr/${m.repo}" target="_blank" rel="noopener" class="badge badge-ready skill-lab-link">실습 →</a>
          </td>
          <td class="module-link">
            <a href="#" class="badge badge-dash track-session-link" data-session-id="${m.sessionId}">대시보드 →</a>
          </td>
        </tr>`;
    }

    trackPage.innerHTML = `
      <div class="track-header">
        <h2>${escapeHtml(t.title)}: ${escapeHtml(t.subtitle)}</h2>
        <div class="track-meta">
          <span class="track-meta-item">👥 ${escapeHtml(t.audience)}</span>
          <span class="track-meta-item">⏱ ${escapeHtml(t.duration)}</span>
        </div>
        <p class="track-result">🎯 결과물: ${escapeHtml(t.result)}</p>
      </div>
      <div class="curriculum-table-wrapper">
        <table class="curriculum-table">
          <thead>
            <tr><th>#</th><th>모듈</th><th>배우는 것</th><th>Skill</th><th>실습</th></tr>
          </thead>
          <tbody>${modulesHtml}</tbody>
        </table>
      </div>
      <div class="track-story">
        <p>💡 ${escapeHtml(t.story)}</p>
      </div>
    `;

    // Session link clicks
    trackPage.querySelectorAll('.track-session-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sid = link.dataset.sessionId;
        sessionSelect.value = sid;
        sessionSelect.dispatchEvent(new Event('change'));
        navigateTo('home');
      });
    });
  }

  function renderAllSkillsPage() {
    let rows = '';
    let num = 0;
    for (const [trackId, track] of Object.entries(TRACKS)) {
      for (const m of track.modules) {
        num++;
        rows += `
          <tr>
            <td>${num}</td>
            <td><span class="badge-track">${escapeHtml(track.title)}</span></td>
            <td>
              ${escapeHtml(m.skill)}
              <a href="https://github.com/skills-kr/${m.repo}" target="_blank" rel="noopener" class="badge badge-ready skill-lab-link">실습 →</a>
            </td>
            <td>${escapeHtml(m.title)}</td>
            <td><a href="#" class="badge badge-dash all-skills-link" data-session-id="${m.sessionId}">대시보드 →</a></td>
          </tr>`;
      }
    }

    allSkillsPage.innerHTML = `
      <h2>📋 전체 실습 목록</h2>
      <p class="all-skills-desc">모든 트랙의 GitHub Skills 실습을 한눈에 확인하세요.</p>
      <div class="curriculum-table-wrapper">
        <table class="curriculum-table all-skills-table">
          <thead>
            <tr><th>#</th><th>트랙</th><th>Skill</th><th>모듈</th><th>대시보드</th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;

    allSkillsPage.querySelectorAll('.all-skills-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const sid = link.dataset.sessionId;
        sessionSelect.value = sid;
        sessionSelect.dispatchEvent(new Event('change'));
        navigateTo('home');
      });
    });
  }

  // Wire sidebar links
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo(link.dataset.page);
    });
  });

  // Handle browser back/forward
  window.addEventListener('hashchange', () => {
    const page = location.hash.replace('#', '') || 'home';
    showPage(page);
  });

  // Restore page from hash on initial load
  const initialPage = location.hash.replace('#', '') || 'home';
  if (initialPage !== 'home') {
    showPage(initialPage);
  }

})();
