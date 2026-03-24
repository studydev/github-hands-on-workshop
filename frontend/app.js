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
  const sessionInfoEl = document.getElementById('session-info');
  const sessionStatsEl = document.getElementById('session-stats');
  const podiumEl = document.getElementById('podium');
  const podiumCountdownEl = document.getElementById('podium-countdown');
  const participantsBody = document.querySelector('#participants-table tbody');
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
    if (!currentSessionId) {
      dashboard.classList.add('hidden');
      landing.classList.remove('hidden');
      editSessionBtn.classList.add('hidden');
      disconnectSSE();
      clearCountdown();
      return;
    }
    landing.classList.add('hidden');
    dashboard.classList.remove('hidden');
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
      renderSessionInfo(sessionData);
      renderStats(sessionData);
      renderPodium(lbData.leaderboard);
      renderCountdown(sessionData);
      renderParticipants(lbData.leaderboard, lbData.participants);
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
    const top3 = leaderboard.slice(0, 3);
    let html = '';

    for (const entry of top3) {
      const avatarUrl = `https://github.com/${encodeURIComponent(entry.username)}.png?size=100`;
      const time = new Date(entry.completedAt).toLocaleString('ko-KR', {
        month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      });

      html += `
        <div class="podium-card rank-${entry.rank}">
          <img class="podium-avatar" src="${avatarUrl}"
               alt="${escapeAttr(entry.username)}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2255%22 text-anchor=%22middle%22 fill=%22%23aaa%22 font-size=%2240%22>${entry.username[0].toUpperCase()}</text></svg>'">
          <div class="podium-username">${escapeHtml(entry.username)}</div>
          <div class="podium-trophy">${trophies[entry.rank - 1]}</div>
          <div class="podium-rank-label">${entry.rank === 1 ? '1st Place' : entry.rank === 2 ? '2nd Place' : '3rd Place'}</div>
          <div class="podium-time">${time}</div>
        </div>
      `;
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

  // --- Render: Participants table ---
  function renderParticipants(leaderboard, participants) {
    participantsBody.innerHTML = '';

    // Build rank map from leaderboard
    const rankMap = new Map();
    for (const entry of leaderboard) {
      rankMap.set(entry.username, entry.rank);
    }

    for (const p of participants) {
      const tr = document.createElement('tr');
      const rank = rankMap.get(p.username);
      const rankClass = rank && rank <= 3 ? `rank-${rank}-cell` : '';
      const avatarUrl = `https://github.com/${encodeURIComponent(p.username)}.png?size=64`;
      const startTime = p.startedAt
        ? new Date(p.startedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '-';
      const completeTime = p.completedAt
        ? new Date(p.completedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
        : '-';

      const repoLink = p.repo
        ? `<a href="https://github.com/${escapeAttr(p.repo)}" target="_blank" rel="noopener" class="repo-link">${escapeHtml(p.repo)}</a>`
        : '-';

      tr.innerHTML = `
        <td class="rank-cell ${rankClass}">${rank || '-'}</td>
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
        <td>${startTime}</td>
        <td>${completeTime}</td>
        <td>
          <span class="status-badge ${p.status === 'completed' ? 'status-completed' : 'status-started'}">
            ${p.status === 'completed' ? '완료' : '진행 중'}
          </span>
        </td>
      `;
      participantsBody.appendChild(tr);
    }
  }

  // --- SSE ---
  function connectSSE() {
    disconnectSSE();
    const url = `${API_BASE}/api/stream${currentSessionId ? `?sessionId=${currentSessionId}` : ''}`;
    eventSource = new EventSource(url);
    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === 'started' || data.type === 'completed') {
          addFeedItem(data);
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
    if (data.type === 'started') {
      li.innerHTML = `<span class="feed-time">${time}</span> ${avatarHtml} 🚀 <strong>${escapeHtml(data.username)}</strong> 실습을 시작했습니다!`;
    } else {
      li.innerHTML = `<span class="feed-time">${time}</span> ${avatarHtml} 🎉 <strong>${escapeHtml(data.username)}</strong> 실습을 완료했습니다!`;
    }
    feedList.prepend(li);
    while (feedList.children.length > 50) {
      feedList.removeChild(feedList.lastChild);
    }
  }

  // --- Modal: Create session ---
  function openModal() {
    snippetResult.classList.add('hidden');
    createForm.classList.remove('hidden');
    createForm.reset();
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
# 시작 워크플로우 (Fork/Start)에 추가
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
        "type": "started",
        "username": "'\\''\$GITHUB_ACTOR'\\''",
        "repo": "'\\''\$GITHUB_REPOSITORY'\\''",
        "track": "${track}",
        "runId": "'\\''\$GITHUB_RUN_ID'\\''
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
        "type": "completed",
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
          <td>${escapeHtml(r.sessionName)}</td>
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
    } catch (err) {
      alert('검색 실패: ' + err.message);
    }
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
})();
