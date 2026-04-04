(function () {
  'use strict';

  var API_BASE = 'https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io';

  // ===================== DATA =====================
  var CATEGORIES = [
    {
      key: 'cat_first_day', title: '오늘 바로 시작!', subtitle: 'First day on GitHub', icon: '🚀',
      description: 'GitHub 여정의 첫 발을 내딛으세요. 기본기를 빠르게 익히고 자신있게 시작할 수 있습니다.',
      color: '#f0883e',
      modules: [
        { repo: 'introduction-to-github', title: '나만을 위한 개발 공간 만들기', learn: 'Repository, Issue, 웹에서 파일 편집', skill: 'Introduction to GitHub', license: 'Free', time: 60 },
        { repo: 'communicate-using-markdown', title: '내 글을 있어 보이게 만드는 비법', learn: '텍스트로 표, 강조, 이미지', skill: 'Communicate using Markdown', license: 'Free', time: 60 },
        { repo: 'github-pages', title: '클릭 한 번으로 내 사이트 올리기', learn: '실제 URL로 접속되는 웹사이트 완성', skill: 'GitHub Pages', license: 'Free', time: 60 },
      ]
    },
    {
      key: 'cat_first_week', title: '협업 완전 정복', subtitle: 'First week on GitHub', icon: '📚',
      description: '워크플로우, 협업 기술, 도구를 익히며 초보자에서 기여자로 빠르게 성장하세요.',
      color: '#58a6ff',
      modules: [
        { repo: 'introduction-to-git', title: '내 코드에 타임머신 달기', learn: 'git init / add / commit / push / pull', skill: 'Introduction to Git', license: 'Free', time: 60 },
        { repo: 'review-pull-requests', title: '동료 코드, 피드백 주고받기', learn: 'PR 리뷰로 코드 품질', skill: 'Review Pull Requests', license: 'Free', time: 30 },
        { repo: 'resolve-merge-conflicts', title: '코드 충돌? 두렵지 않다', learn: '머지 충돌 해결 경험', skill: 'Resolve Merge Conflicts', license: 'Free', time: 30 },
        { repo: 'code-with-codespaces', title: '내 PC 없이도 코딩하기', learn: '브라우저만 있으면 되는 개발 환경', skill: 'Code with Codespaces', license: 'Free', time: 60 },
        { repo: 'introduction-to-repository-management', title: '팀원과 함께 프로젝트 관리하기', learn: 'Labels, Milestones, Wiki, 협업', skill: 'Intro to Repository Management', license: 'Free', time: 60 },
        { repo: 'change-commit-history', title: '커밋 히스토리 다시 쓰기', learn: 'rebase, amend, reset 활용', skill: 'Change Commit History', license: 'Free', time: 60 },
        { repo: 'connect-the-dots', title: 'GitHub 기능 탐색하기', learn: 'GitHub 숨겨진 기능 발견', skill: 'Connect the Dots', license: 'Free', time: 15 },
      ]
    },
    {
      key: 'cat_copilot', title: 'AI 날개 달기', subtitle: 'Take flight with GitHub Copilot', icon: '🤖',
      description: 'AI가 코딩을 어떻게 가속하는지 탐험하세요.',
      color: '#a371f7',
      modules: [
        { repo: 'getting-started-with-github-copilot', title: 'AI 동료 첫 출근', learn: 'Chat, Inline suggestions', skill: 'Getting Started with GitHub Copilot', license: 'Free', time: 60 },
        { repo: 'customize-your-github-copilot-experience', title: 'AI 동료 길들이기', learn: 'Custom instructions 설정', skill: 'Customize your GitHub Copilot Experience', license: 'Free', time: 30 },
        { repo: 'copilot-code-review', title: 'AI가 코드 검토', learn: 'PR AI 버그 찾기', skill: 'GitHub Copilot Code Review', license: 'Copilot Pro', time: 60 },
        { repo: 'integrate-mcp-with-copilot', title: 'AI에게 새로운 능력 장착', learn: 'MCP로 Copilot 확장', skill: 'Integrate MCP with GitHub Copilot', license: 'Copilot Pro', time: 60 },
        { repo: 'expand-your-team-with-copilot', title: '이슈만 올리면 AI가 PR까지', learn: 'AI가 코딩하는 경험', skill: 'Expand your team with Copilot coding agent', license: 'Copilot Pro', time: 60 },
        { repo: 'create-applications-with-the-copilot-cli', title: 'Copilot CLI로 앱 만들기', learn: 'CLI에서 AI로 앱 생성', skill: 'Create Applications with Copilot CLI', license: 'Free', time: 60 },
        { repo: 'modernize-your-legacy-code-with-github-copilot', title: '10년 묵은 코드 AI 번역', learn: 'COBOL to Node.js', skill: 'Modernize your legacy code with GitHub Copilot', license: 'Free', time: 30 },
        { repo: 'scale-institutional-knowledge-using-copilot-spaces', title: '신입도 바로 일하는 팀', learn: 'Copilot Spaces 팀 지식 공유', skill: 'Scale institutional knowledge with Copilot Spaces', license: 'Copilot Pro+', time: 30 },
        { repo: 'build-applications-w-copilot-agent-mode', title: 'AI와 함께 앱 완성', learn: 'Agent mode 앱 빌드', skill: 'Build apps with Copilot agent mode', license: 'Copilot Pro', time: 60 },
        { repo: 'idea-to-app-with-spark', title: '말로 설명하면 AI가 앱을 뚝딱', learn: '노코딩으로 앱 생성', skill: 'Turn an idea into an app with GitHub Spark', license: 'Copilot Pro+', time: 60 },
        { repo: 'copilot-codespaces-vscode', title: 'AI + Codespaces + VS Code', learn: 'Copilot과 클라우드 개발환경 통합', skill: 'Copilot + Codespaces + VS Code', license: 'Free', time: 30 },
        { repo: 'your-first-extension-for-github-copilot', title: 'Copilot 확장 프로그램 만들기', learn: 'Copilot Extensions 개발', skill: 'Your First Extension for GitHub Copilot', license: 'Free', time: 60 },
      ]
    },
    {
      key: 'cat_actions', title: '자동화의 마법', subtitle: 'Automate workflows with GitHub Actions', icon: '⚙️',
      description: 'CI/CD부터 패키지 배포까지, 개발 프로세스를 자동화하세요.',
      color: '#3fb950',
      modules: [
        { repo: 'hello-github-actions', title: '첫 로봇 일꾼 고용', learn: 'Workflow YAML 구조', skill: 'Hello GitHub Actions', license: 'Free', time: 30 },
        { repo: 'test-with-actions', title: '실수 잡아주는 시스템', learn: 'Push 시 자동 테스트', skill: 'Test with Actions', license: 'Free', time: 60 },
        { repo: 'ai-in-actions', title: '파이프라인에 AI 두뇌', learn: 'Actions에서 AI 활용', skill: 'AI in Actions', license: 'Free', time: 30 },
        { repo: 'write-javascript-actions', title: 'JavaScript로 나만의 Action', learn: '커스텀 Action 개발', skill: 'Write JavaScript Actions', license: 'Free', time: 60 },
        { repo: 'create-ai-powered-actions', title: 'AI 기반 Action 만들기', learn: 'Actions에서 AI 모델 호출', skill: 'Create AI Powered Actions', license: 'Free', time: 60 },
        { repo: 'publish-docker-images', title: '어디서나 쓸 수 있게 포장', learn: 'Docker 이미지 배포', skill: 'Publish Docker Images', license: 'Free', time: 60 },
        { repo: 'reusable-workflows', title: '10개 프로젝트에 재사용', learn: '워크플로우 템플릿화', skill: 'Create and use reusable workflows', license: 'Free', time: 60 },
        { repo: 'release-based-workflow', title: '릴리스 기반 배포 전략', learn: '브랜치별 릴리스 워크플로우', skill: 'Release Based Workflow', license: 'Free', time: 60 },
        { repo: 'deploy-to-azure', title: 'Azure에 자동 배포', learn: 'GitHub Actions to Azure 배포', skill: 'Deploy to Azure', license: 'Free', time: 120 },
      ]
    },
    {
      key: 'cat_security', title: '내 코드 지키기', subtitle: 'Code security and analysis', icon: '🔒',
      description: '취약점을 찾고, 코드베이스를 보호하세요.',
      color: '#f85149',
      modules: [
        { repo: 'secure-repository-supply-chain', title: '취약점 자동 찾기', learn: 'Dependabot 패치 PR', skill: 'Secure your repository supply chain', license: 'Free', time: 60 },
        { repo: 'introduction-to-codeql', title: 'AI 보안 구멍 찾기', learn: 'CodeQL 취약 탐지', skill: 'Introduction to CodeQL', license: 'Free', time: 30 },
        { repo: 'introduction-to-secret-scanning', title: '비밀번호 유출 방지', learn: 'Secret push 차단', skill: 'Introduction to secret scanning', license: 'Free', time: 15 },
        { repo: 'configure-codeql-language-matrix', title: 'CodeQL 언어 매트릭스 설정', learn: '다중 언어 보안 스캔 구성', skill: 'Configure CodeQL Language Matrix', license: 'Free', time: 30 },
        { repo: 'secure-code-game', title: '해커 입장에서 뷰어보기', learn: '보안 게임 체험', skill: 'Secure code game', license: 'Free', time: 180 },
      ]
    },
    {
      key: 'cat_switch', title: '한 번에 이사', subtitle: 'Switch to GitHub', icon: '🔄',
      description: '다른 플랫폼에서 GitHub으로 마이그레이션하세요.',
      color: '#d29922',
      modules: [
        { repo: 'migrate-ado-repository', title: '하나도 안 버리고 GitHub으로 이사', learn: 'ADO to GitHub CLI 마이그레이션', skill: 'Migrate an Azure DevOps Repository', license: 'Free', time: 60 },
      ]
    }
  ];

  var PREREQS = {
    'communicate-using-markdown': ['introduction-to-github'],
    'github-pages': ['introduction-to-github'],
    'review-pull-requests': ['introduction-to-github'],
    'resolve-merge-conflicts': ['introduction-to-github'],
    'introduction-to-repository-management': ['introduction-to-github', 'communicate-using-markdown', 'review-pull-requests'],
    'connect-the-dots': ['introduction-to-github'],
    'getting-started-with-github-copilot': ['introduction-to-github'],
    'customize-your-github-copilot-experience': ['getting-started-with-github-copilot'],
    'copilot-code-review': ['getting-started-with-github-copilot', 'code-with-codespaces'],
    'integrate-mcp-with-copilot': ['getting-started-with-github-copilot'],
    'expand-your-team-with-copilot': ['introduction-to-github', 'getting-started-with-github-copilot'],
    'modernize-your-legacy-code-with-github-copilot': ['getting-started-with-github-copilot'],
    'build-applications-w-copilot-agent-mode': ['getting-started-with-github-copilot'],
    'your-first-extension-for-github-copilot': ['getting-started-with-github-copilot'],
    'hello-github-actions': ['introduction-to-github'],
    'test-with-actions': ['hello-github-actions'],
    'ai-in-actions': ['hello-github-actions'],
    'write-javascript-actions': ['hello-github-actions'],
    'create-ai-powered-actions': ['write-javascript-actions'],
    'publish-docker-images': ['hello-github-actions'],
    'reusable-workflows': ['hello-github-actions', 'test-with-actions'],
    'release-based-workflow': ['introduction-to-github'],
    'introduction-to-codeql': ['introduction-to-github'],
    'introduction-to-secret-scanning': ['introduction-to-github'],
  };

  // Build lookups
  var repoInfo = {};
  var SUCCESSORS = {};
  CATEGORIES.forEach(function (cat) {
    cat.modules.forEach(function (m) {
      repoInfo[m.repo] = { catKey: cat.key, catTitle: cat.title, catIcon: cat.icon, moduleTitle: m.title, color: cat.color };
    });
  });
  Object.keys(PREREQS).forEach(function (repo) {
    PREREQS[repo].forEach(function (dep) {
      if (!SUCCESSORS[dep]) SUCCESSORS[dep] = [];
      SUCCESSORS[dep].push(repo);
    });
  });

  // ===================== LEARNER STATE =====================
  var learnerResults = null;
  var learnerStatusMap = {};

  function searchLearner(query) {
    var statusEl = document.getElementById('learner-status');
    statusEl.textContent = '조회 중...';
    statusEl.className = 'learner-status';
    fetch(API_BASE + '/api/users/search?q=' + encodeURIComponent(query))
      .then(function (r) { return r.json(); })
      .then(function (data) {
        learnerResults = data.results || [];
        learnerStatusMap = {};
        learnerResults.forEach(function (r) {
          var track = r.sessionTrack || '';
          if (!learnerStatusMap[track] || r.status === 'completed') {
            learnerStatusMap[track] = r.status;
          }
        });
        var completed = learnerResults.filter(function (r) { return r.status === 'completed'; }).length;
        statusEl.textContent = learnerResults.length + '개 참여 · ' + completed + '개 완료';
        statusEl.className = 'learner-status learner-ok';
        applyLearnerStatus();
      })
      .catch(function () {
        statusEl.textContent = '조회 실패';
        statusEl.className = 'learner-status learner-err';
      });
  }

  function getModuleStatus(repo) {
    if (!learnerResults) return null;
    return learnerStatusMap[repo] || 'not-started';
  }

  function applyLearnerStatus() {
    // Module slides
    document.querySelectorAll('.slide-module').forEach(function (el) {
      var repo = el.getAttribute('data-repo');
      var status = getModuleStatus(repo);
      el.classList.remove('status-completed', 'status-started', 'status-not-started');
      if (status) el.classList.add('status-' + status);
      var badge = el.querySelector('.mod-status-badge');
      if (badge) {
        if (status === 'completed') { badge.textContent = '✅ 완료'; badge.className = 'mod-status-badge mod-status-completed'; }
        else if (status === 'started') { badge.textContent = '🔄 진행 중'; badge.className = 'mod-status-badge mod-status-started'; }
        else { badge.textContent = '⬜ 미시작'; badge.className = 'mod-status-badge mod-status-not-started'; }
      }
    });
    // Category slides
    CATEGORIES.forEach(function (cat) {
      var catEl = document.getElementById('cat-' + cat.key);
      if (!catEl) return;
      var allDone = cat.modules.every(function (m) { return getModuleStatus(m.repo) === 'completed'; });
      var anyStarted = cat.modules.some(function (m) { var s = getModuleStatus(m.repo); return s === 'completed' || s === 'started'; });
      catEl.classList.remove('cat-all-completed', 'cat-in-progress');
      if (allDone) catEl.classList.add('cat-all-completed');
      else if (anyStarted) catEl.classList.add('cat-in-progress');
      // Overview cards
      var card = document.querySelector('.overview-cat-card[data-cat="' + cat.key + '"]');
      if (card) {
        card.classList.remove('card-completed', 'card-in-progress');
        if (allDone) card.classList.add('card-completed');
        else if (anyStarted) card.classList.add('card-in-progress');
        var prog = card.querySelector('.overview-cat-progress');
        if (prog) {
          var done = cat.modules.filter(function (m) { return getModuleStatus(m.repo) === 'completed'; }).length;
          prog.textContent = done + '/' + cat.modules.length + ' 완료';
        }
      }
      // Nav buttons
      var btn = document.querySelector('.pres-nav-cat-btn[data-cat-key="' + cat.key + '"]');
      if (btn) btn.classList.toggle('nav-completed', allDone);
    });
  }

  // ===================== BUILD SLIDES =====================
  var CAT_X_SPACING = 3500;
  var MOD_Y_SPACING = 1100;
  var MOD_Y_START = 1400;

  function buildSlides() {
    var root = document.getElementById('impress');
    var navCats = document.getElementById('pres-nav-cats');
    var slideOrder = [];

    // Overview
    var ov = el('div', { id: 'overview', className: 'step slide-overview', 'data-x': '8000', 'data-y': '-5000', 'data-scale': '8' });
    var catCards = '';
    CATEGORIES.forEach(function (cat) {
      catCards += '<a class="overview-cat-card" href="#cat-' + cat.key + '" data-cat="' + cat.key + '" style="--cat-color:' + cat.color + '">' +
        '<span class="overview-cat-icon">' + cat.icon + '</span>' +
        '<span class="overview-cat-title">' + esc(cat.title) + '</span>' +
        '<span class="overview-cat-count">' + cat.modules.length + '개 실습</span>' +
        '<span class="overview-cat-progress"></span></a>';
    });
    ov.innerHTML = '<h1>GitHub Skills Workshop</h1><p class="overview-sub">실습 기반으로 배우는 GitHub — 6개 카테고리, 37개 모듈</p><div class="overview-cats">' + catCards + '</div>';
    root.appendChild(ov);
    slideOrder.push('overview');

    CATEGORIES.forEach(function (cat, ci) {
      var catX = ci * CAT_X_SPACING;

      // Nav btn
      var btn = document.createElement('button');
      btn.className = 'pres-nav-cat-btn';
      btn.textContent = cat.icon + ' ' + cat.title;
      btn.setAttribute('data-target', 'cat-' + cat.key);
      btn.setAttribute('data-cat-key', cat.key);
      btn.addEventListener('click', function () { window.impress().goto('cat-' + cat.key); });
      navCats.appendChild(btn);

      // Category slide
      var cs = el('div', { id: 'cat-' + cat.key, className: 'step slide-category cat-' + cat.key.replace('cat_', ''), 'data-x': catX, 'data-y': 0, 'data-scale': '1.5' });
      var modList = '<div class="cat-mod-list">';
      cat.modules.forEach(function (m, mi) {
        modList += '<a class="cat-mod-item" href="#mod-' + m.repo + '"><span class="cat-mod-num">' + (mi + 1) + '</span><span class="cat-mod-title">' + esc(m.title) + '</span><span class="cat-mod-time">⏱' + m.time + '분</span></a>';
      });
      modList += '</div>';
      cs.innerHTML = '<div class="cat-icon">' + cat.icon + '</div><h2>' + esc(cat.title) + '</h2><p class="cat-subtitle">' + esc(cat.subtitle) + '</p><p class="cat-desc">' + esc(cat.description) + '</p>' + modList;
      root.appendChild(cs);
      slideOrder.push(cs.id);

      // Modules
      cat.modules.forEach(function (m, mi) {
        var ms = el('div', { id: 'mod-' + m.repo, className: 'step slide-module', 'data-x': catX, 'data-y': MOD_Y_START + mi * MOD_Y_SPACING, 'data-scale': '1', 'data-repo': m.repo });
        var lc = 'mod-badge-' + m.license.replace('+', 'plus').replace(' ', '-').toLowerCase();

        // Theory link (only for repos that have a theory page)
        var theoryBtn = '';
        var theoryPages = { 'introduction-to-github': true, 'communicate-using-markdown': true, 'github-pages': true, 'introduction-to-git': true, 'review-pull-requests': true };
        if (theoryPages[m.repo]) {
          theoryBtn = '<a class="mod-link mod-link-theory" href="learn/' + m.repo + '.html" target="_blank">이론 📖</a>';
        }

        ms.innerHTML = '<div class="mod-top-row"><span class="mod-num">#' + (mi + 1) + '</span><span class="mod-status-badge"></span><span class="mod-cat-badge" style="border-color:' + cat.color + ';color:' + cat.color + '">' + cat.icon + ' ' + esc(cat.title) + '</span></div>' +
          '<h3>' + esc(m.title) + '</h3><p class="mod-skill">' + esc(m.skill) + '</p>' +
          '<div class="mod-learn">📝 ' + esc(m.learn) + '</div>' +
          '<div class="mod-footer"><span class="mod-badge ' + lc + '">' + esc(m.license) + '</span><span class="mod-badge mod-badge-time">⏱ ' + m.time + '분</span>' + theoryBtn + '<a class="mod-link" href="https://github.com/skills-kr/' + m.repo + '" target="_blank" rel="noopener">실습 →</a></div>';
        root.appendChild(ms);
        slideOrder.push(ms.id);
      });
    });
    return slideOrder;
  }

  // ===================== EVENTS =====================
  function setupEvents() {
    document.addEventListener('impress:stepenter', function (e) {
      var step = e.target;
      var repo = step.getAttribute('data-repo');
      document.querySelectorAll('.pres-nav-cat-btn').forEach(function (btn) {
        var catKey = btn.getAttribute('data-cat-key');
        btn.classList.toggle('active', btn.getAttribute('data-target') === step.id || (repo && repoInfo[repo] && catKey === repoInfo[repo].catKey));
      });
      var all = document.querySelectorAll('.step');
      var idx = Array.prototype.indexOf.call(all, step);
      var bar = document.getElementById('pres-progress');
      if (bar) bar.style.width = ((idx + 1) / all.length * 100) + '%';
    });

    document.getElementById('learner-btn').addEventListener('click', function () {
      var q = document.getElementById('learner-input').value.trim();
      if (q) searchLearner(q);
    });
    document.getElementById('learner-input').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); var q = this.value.trim(); if (q) searchLearner(q); }
    });
  }

  // ===================== HELPERS =====================
  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
  function el(tag, attrs) {
    var e = document.createElement(tag);
    for (var k in attrs) {
      if (k === 'className') e.className = attrs[k];
      else if (k.indexOf('data-') === 0) e.setAttribute(k, attrs[k]);
      else e[k] = attrs[k];
    }
    return e;
  }

  // ===================== INIT =====================
  document.addEventListener('DOMContentLoaded', function () {
    buildSlides();
    window.impress().init();
    setupEvents();
  });
})();
