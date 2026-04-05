/* globals EventSource */
(function () {
  'use strict';

  var API_BASE = 'https://workshop-tracker-api.jollyocean-9c92d5de.koreacentral.azurecontainerapps.io';

  var pageTitle = document.getElementById('page-title');
  var headerActions = document.getElementById('header-actions');
  var pageHome = document.getElementById('page-home');
  var pageSession = document.getElementById('page-session');
  var pageTrack = document.getElementById('page-track');
  var pageAllSkills = document.getElementById('page-all-skills');
  var sessionInfoEl = document.getElementById('session-info');
  var sessionStatsEl = document.getElementById('session-stats');
  var podiumEl = document.getElementById('podium');
  var podiumCountdownEl = document.getElementById('podium-countdown');
  var podiumSection = document.getElementById('podium-section');
  var participantsBody = document.querySelector('#participants-table tbody');
  var participantsHeadRow = document.getElementById('participants-thead-row');
  var feedList = document.getElementById('feed-list');
  var modalOverlay = document.getElementById('modal-overlay');
  var createForm = document.getElementById('create-session-form');
  var modalCancel = document.getElementById('modal-cancel');
  var snippetResult = document.getElementById('snippet-result');
  var snippetSessionId = document.getElementById('snippet-session-id');
  var snippetCode = document.getElementById('snippet-code');
  var copySnippetBtn = document.getElementById('copy-snippet-btn');
  var editModalOverlay = document.getElementById('edit-modal-overlay');
  var editForm = document.getElementById('edit-session-form');
  var editModalCancel = document.getElementById('edit-modal-cancel');
  var editSnippetResult = document.getElementById('edit-snippet-result');
  var editSnippetSessionId = document.getElementById('edit-snippet-session-id');
  var editSnippetCode = document.getElementById('edit-snippet-code');
  var editCopySnippetBtn = document.getElementById('edit-copy-snippet-btn');
  var pageSearch = document.getElementById('page-search');
  var searchForm = document.getElementById('search-user-form');
  var searchResultsDiv = document.getElementById('search-results');
  var searchResultsBody = document.querySelector('#search-results-table tbody');
  var searchUserProfile = document.getElementById('search-user-profile');
  var searchEmpty = document.getElementById('search-empty');
  var searchViewSummaryBtn = document.getElementById('search-view-summary');
  var searchViewDetailBtn = document.getElementById('search-view-detail');
  var searchSummaryView = document.getElementById('search-summary-view');
  var searchDetailView = document.getElementById('search-detail-view');
  var searchSortOptions = document.getElementById('search-sort-options');
  var searchSortSelect = document.getElementById('search-sort-select');
  var sidebarSessionSearch = document.getElementById('sidebar-session-search');
  var sidebarSessionList = document.getElementById('sidebar-session-list');

  var currentSearchResults = null;
  var currentSessionId = null;
  var currentSession = null;
  var eventSource = null;
  var countdownTimer = null;
  var allSessions = [];

  // TRACKS DATA
  var TRACKS = {
    track1a: { title: 'Track 1-A', subtitle: '웹사이트 만들기', audience: '비개발자 / 기획·마케터', duration: '2.5시간', result: '나만의 퍼스널 웹사이트', story: '오늘 수업이 끝나면 명함에 넣을 수 있는 나만의 웹사이트 주소가 생깁니다.', modules: [
      { num: 1, title: '나만을 위한 개발 공간 만들기', learn: 'Repository, Issue, 웹에서 파일 편집', skill: 'Introduction to GitHub', repo: 'introduction-to-github', sessionId: 'f87b3b97' },
      { num: 2, title: '내 글을 있어 보이게 만드는 비법', learn: '텍스트로 표, 강조, 이미지', skill: 'Communicate using Markdown', repo: 'communicate-using-markdown', sessionId: '3d73a707' },
      { num: 3, title: '클릭 한 번으로 내 사이트 올리기', learn: '실제 URL로 접속되는 웹사이트 완성', skill: 'GitHub Pages', repo: 'github-pages', sessionId: 'fe72e72d' },
      { num: 4, title: 'GitHub 기능 탐색하기', learn: 'GitHub 숨겨진 기능 발견', skill: 'Connect the Dots', repo: 'connect-the-dots', sessionId: 'f0ad5989' },
    ]},
    track1b: { title: 'Track 1-B', subtitle: 'Git 협업', audience: '개발자 입문자', duration: '4.5시간', result: '팀 협업 레포 + 충돌 없는 워크플로우', story: 'iPad로도 코딩하는 개발자가 됩니다.', modules: [
      { num: 1, title: '내 코드에 타임머신 달기', learn: 'git init / add / commit / push / pull', skill: 'Introduction to Git', repo: 'introduction-to-git', sessionId: 'cc895746' },
      { num: 2, title: '동료 코드, 피드백 주고받기', learn: 'PR 리뷰로 코드 품질', skill: 'Review Pull Requests', repo: 'review-pull-requests', sessionId: '348394ce' },
      { num: 3, title: '코드 충돌? 두렵지 않다', learn: '머지 충돌 해결 경험', skill: 'Resolve Merge Conflicts', repo: 'resolve-merge-conflicts', sessionId: '82934411' },
      { num: 4, title: '커밋 히스토리 다시 쓰기', learn: 'rebase, amend, reset 활용', skill: 'Change Commit History', repo: 'change-commit-history', sessionId: 'ae785680' },
      { num: 5, title: '팀원과 함께 프로젝트 관리하기', learn: 'Labels, Milestones, Wiki, 협업', skill: 'Intro to Repository Management', repo: 'introduction-to-repository-management', sessionId: '53ea0af7' },
      { num: 6, title: '내 PC 없이도 코딩하기', learn: '브라우저만 있으면 되는 개발 환경', skill: 'Code with Codespaces', repo: 'code-with-codespaces', sessionId: '2536adf1' },
    ]},
    track2: { title: 'Track 2', subtitle: 'AI Copilot', audience: '개발자 / AI 도입 검토팀', duration: '6시간', result: 'AI와 함께 만든 실제 앱', story: '코딩 속도가 2배 빨라진 걸 느낍니다.', modules: [
      { num: 1, title: 'AI 동료 첫 출근', learn: 'Chat, Inline suggestions', skill: 'Getting Started with GitHub Copilot', repo: 'getting-started-with-github-copilot', sessionId: 'c8870da8' },
      { num: 2, title: 'AI 동료 길들이기', learn: 'Custom instructions 설정', skill: 'Customize your GitHub Copilot Experience', repo: 'customize-your-github-copilot-experience', sessionId: '91eeac6a' },
      { num: 3, title: 'AI + Codespaces + VS Code', learn: 'Copilot과 클라우드 개발환경 통합', skill: 'Copilot + Codespaces + VS Code', repo: 'copilot-codespaces-vscode', sessionId: 'd3a5a722' },
      { num: 4, title: 'AI가 코드 검토', learn: 'PR AI 버그 찾기', skill: 'GitHub Copilot Code Review', repo: 'copilot-code-review', sessionId: '208a7c01' },
      { num: 5, title: '이슈만 올리면 AI가 PR까지', learn: 'AI가 코딩하는 경험', skill: 'Expand your team with Copilot coding agent', repo: 'expand-your-team-with-copilot', sessionId: '864ed8b8' },
      { num: 6, title: 'AI와 함께 앱 완성', learn: 'Agent mode 앱 빌드', skill: 'Build apps with Copilot agent mode', repo: 'build-applications-w-copilot-agent-mode', sessionId: '256272c5' },
      { num: 7, title: 'AI에게 새로운 능력 장착', learn: 'MCP로 Copilot 확장', skill: 'Integrate MCP with GitHub Copilot', repo: 'integrate-mcp-with-copilot', sessionId: '05b8e6d2' },
      { num: 8, title: 'Copilot 확장 프로그램 만들기', learn: 'Copilot Extensions 개발', skill: 'Your First Extension for GitHub Copilot', repo: 'your-first-extension-for-github-copilot', sessionId: 'e8e5a0c6' },
      { num: 9, title: 'Copilot CLI로 앱 만들기', learn: 'CLI에서 AI로 앱 생성', skill: 'Create Applications with Copilot CLI', repo: 'create-applications-with-the-copilot-cli', sessionId: '03519e38' },
      { num: 10, title: '말로 설명하면 AI가 앱을 뚝딱', learn: '노코딩으로 앱 생성', skill: 'Turn an idea into an app with GitHub Spark', repo: 'idea-to-app-with-spark', sessionId: 'f89101e2' },
    ]},
    track3: { title: 'Track 3', subtitle: 'CI/CD 자동화', audience: 'DevOps / 개발팀', duration: '5시간', result: '풀 자동화 CI/CD 파이프라인', story: '코드 올리고 커피 마시면 배포 끝.', modules: [
      { num: 1, title: '첫 로봇 일꾼 고용', learn: 'Workflow YAML 구조', skill: 'Hello GitHub Actions', repo: 'hello-github-actions', sessionId: '33211bf7' },
      { num: 2, title: '실수 잡아주는 시스템', learn: 'Push 시 자동 테스트', skill: 'Test with Actions', repo: 'test-with-actions', sessionId: '215e5376' },
      { num: 3, title: 'JavaScript로 나만의 Action', learn: '커스텀 Action 개발', skill: 'Write JavaScript Actions', repo: 'write-javascript-actions', sessionId: 'd105b02f' },
      { num: 4, title: '어디서나 쓸 수 있게 포장', learn: 'Docker 이미지 배포', skill: 'Publish Docker Images', repo: 'publish-docker-images', sessionId: '6738d60f' },
      { num: 5, title: '10개 프로젝트에 재사용', learn: '워크플로우 템플릿화', skill: 'Create and use reusable workflows', repo: 'reusable-workflows', sessionId: '4695e100' },
      { num: 6, title: '릴리스 기반 배포 전략', learn: '브랜치별 릴리스 워크플로우', skill: 'Release Based Workflow', repo: 'release-based-workflow', sessionId: '6aabf966' },
      { num: 7, title: 'Azure에 자동 배포', learn: 'GitHub Actions to Azure 배포', skill: 'Deploy to Azure', repo: 'deploy-to-azure', sessionId: '91a8af2b' },
      { num: 8, title: 'AI 기반 Action 만들기', learn: 'Actions에서 AI 모델 호출', skill: 'Create AI Powered Actions', repo: 'create-ai-powered-actions', sessionId: '7750b774' },
      { num: 9, title: '파이프라인에 AI 두뇌', learn: 'Actions에서 AI 활용', skill: 'AI in Actions', repo: 'ai-in-actions', sessionId: 'b5af8a3b' },
    ]},
    track4: { title: 'Track 4', subtitle: '보안 강화', audience: '보안 / 컴플라이언스', duration: '3.5시간', result: '보안 취약점 제로 레포', story: '보안 사고를 사전에 막을 수 있는 구성.', modules: [
      { num: 1, title: '취약점 자동 찾기', learn: 'Dependabot 패치 PR', skill: 'Secure your repository supply chain', repo: 'secure-repository-supply-chain', sessionId: '14fe64be' },
      { num: 2, title: '비밀번호 유출 방지', learn: 'Secret push 차단', skill: 'Introduction to secret scanning', repo: 'introduction-to-secret-scanning', sessionId: '8e9808b7' },
      { num: 3, title: 'AI 보안 구멍 찾기', learn: 'CodeQL 취약 탐지', skill: 'Introduction to CodeQL', repo: 'introduction-to-codeql', sessionId: '7ed33e7a' },
      { num: 4, title: 'CodeQL 언어 매트릭스 설정', learn: '다중 언어 보안 스캔 구성', skill: 'Configure CodeQL Language Matrix', repo: 'configure-codeql-language-matrix', sessionId: '1b86cfad' },
      { num: 5, title: '해커 입장에서 뷰어보기', learn: '보안 게임 체험', skill: 'Secure code game', repo: 'secure-code-game', sessionId: '6f903c6b' },
    ]},
    track5: { title: 'Track 5', subtitle: '레거시 현대화', audience: '레거시 시스템 보유 기업', duration: '2시간', result: 'COBOL to Node.js 전환 완료', story: '금융/공공기관 레거시 고객에게 임팩트.', modules: [
      { num: 1, title: '10년 묵은 코드 AI 번역', learn: 'COBOL to Node.js', skill: 'Modernize your legacy code with GitHub Copilot', repo: 'modernize-your-legacy-code-with-github-copilot', sessionId: '22a8b157' },
      { num: 2, title: '신입도 바로 일하는 팀', learn: 'Copilot Spaces 팀 지식 공유', skill: 'Scale institutional knowledge with Copilot Spaces', repo: 'scale-institutional-knowledge-using-copilot-spaces', sessionId: '8396f661' },
    ]},
    track6: { title: 'Track 6', subtitle: 'ADO 이전', audience: 'Azure DevOps 사용 기업', duration: '2시간', result: 'ADO to GitHub 이전 완료', story: '단독 2시간 / Track 1-B·2와 묶으면 풀데이 워크샵.', modules: [
      { num: 1, title: '하나도 안 버리고 GitHub으로 이사', learn: 'ADO to GitHub CLI 마이그레이션', skill: 'Migrate an Azure DevOps Repository', repo: 'migrate-ado-repository', sessionId: 'ec8c5f46' },
    ]},
  };

  // CATEGORIES DATA (learn.github.com/skills 기반 재구성)
  var CATEGORIES = {
    cat_first_day: {
      title: '오늘 바로 시작!',
      subtitle: 'First day on GitHub',
      icon: '🚀',
      description: 'GitHub 여정의 첫 발을 내딛으세요. 기본기를 빠르게 익히고 자신있게 시작할 수 있습니다.',
      modules: [
        { num: 1, title: '나만을 위한 개발 공간 만들기', learn: 'Repository, Issue, 웹에서 파일 편집', skill: 'Introduction to GitHub', repo: 'introduction-to-github', sessionId: 'f87b3b97', license: 'Free', time: 60 },
        { num: 2, title: '내 글을 있어 보이게 만드는 비법', learn: '텍스트로 표, 강조, 이미지', skill: 'Communicate using Markdown', repo: 'communicate-using-markdown', sessionId: '3d73a707', license: 'Free', time: 60 },
        { num: 3, title: '클릭 한 번으로 내 사이트 올리기', learn: '실제 URL로 접속되는 웹사이트 완성', skill: 'GitHub Pages', repo: 'github-pages', sessionId: 'fe72e72d', license: 'Free', time: 60 },
      ]
    },
    cat_first_week: {
      title: '협업 완전 정복',
      subtitle: 'First week on GitHub',
      icon: '📚',
      description: '워크플로우, 협업 기술, 도구를 익히며 초보자에서 기여자로 빠르게 성장하세요.',
      modules: [
        { num: 1, title: '내 코드에 타임머신 달기', learn: 'git init / add / commit / push / pull', skill: 'Introduction to Git', repo: 'introduction-to-git', sessionId: 'cc895746', license: 'Free', time: 60 },
        { num: 2, title: '동료 코드, 피드백 주고받기', learn: 'PR 리뷰로 코드 품질', skill: 'Review Pull Requests', repo: 'review-pull-requests', sessionId: '348394ce', license: 'Free', time: 30 },
        { num: 3, title: '코드 충돌? 두렵지 않다', learn: '머지 충돌 해결 경험', skill: 'Resolve Merge Conflicts', repo: 'resolve-merge-conflicts', sessionId: '82934411', license: 'Free', time: 30 },
        { num: 4, title: '내 PC 없이도 코딩하기', learn: '브라우저만 있으면 되는 개발 환경', skill: 'Code with Codespaces', repo: 'code-with-codespaces', sessionId: '2536adf1', license: 'Free', time: 60 },
        { num: 5, title: '팀원과 함께 프로젝트 관리하기', learn: 'Labels, Milestones, Wiki, 협업', skill: 'Intro to Repository Management', repo: 'introduction-to-repository-management', sessionId: '53ea0af7', license: 'Free', time: 60 },
        { num: 6, title: '커밋 히스토리 다시 쓰기', learn: 'rebase, amend, reset 활용', skill: 'Change Commit History', repo: 'change-commit-history', sessionId: 'ae785680', license: 'Free', time: 60 },
        { num: 7, title: 'GitHub 기능 탐색하기', learn: 'GitHub 숨겨진 기능 발견', skill: 'Connect the Dots', repo: 'connect-the-dots', sessionId: 'f0ad5989', license: 'Free', time: 15 },
      ]
    },
    cat_copilot: {
      title: 'AI 날개 달기',
      subtitle: 'Take flight with GitHub Copilot',
      icon: '🤖',
      description: 'AI가 코딩을 어떻게 가속하는지 탐험하세요. GitHub Copilot과 페어 프로그래밍하고 워크플로우에 맞게 확장하는 법을 배웁니다.',
      modules: [
        { num: 1, title: 'AI 동료 첫 출근', learn: 'Chat, Inline suggestions', skill: 'Getting Started with GitHub Copilot', repo: 'getting-started-with-github-copilot', sessionId: 'c8870da8', license: 'Free', time: 60 },
        { num: 2, title: 'AI 동료 길들이기', learn: 'Custom instructions 설정', skill: 'Customize your GitHub Copilot Experience', repo: 'customize-your-github-copilot-experience', sessionId: '91eeac6a', license: 'Free', time: 30 },
        { num: 3, title: 'AI가 코드 검토', learn: 'PR AI 버그 찾기', skill: 'GitHub Copilot Code Review', repo: 'copilot-code-review', sessionId: '208a7c01', license: 'Copilot Pro', time: 60 },
        { num: 4, title: 'AI에게 새로운 능력 장착', learn: 'MCP로 Copilot 확장', skill: 'Integrate MCP with GitHub Copilot', repo: 'integrate-mcp-with-copilot', sessionId: '05b8e6d2', license: 'Copilot Pro', time: 60 },
        { num: 5, title: '이슈만 올리면 AI가 PR까지', learn: 'AI가 코딩하는 경험', skill: 'Expand your team with Copilot coding agent', repo: 'expand-your-team-with-copilot', sessionId: '864ed8b8', license: 'Copilot Pro', time: 60 },
        { num: 6, title: 'Copilot CLI로 앱 만들기', learn: 'CLI에서 AI로 앱 생성', skill: 'Create Applications with Copilot CLI', repo: 'create-applications-with-the-copilot-cli', sessionId: '03519e38', license: 'Free', time: 60 },
        { num: 7, title: '10년 묵은 코드 AI 번역', learn: 'COBOL to Node.js', skill: 'Modernize your legacy code with GitHub Copilot', repo: 'modernize-your-legacy-code-with-github-copilot', sessionId: '22a8b157', license: 'Free', time: 30 },
        { num: 8, title: '신입도 바로 일하는 팀', learn: 'Copilot Spaces 팀 지식 공유', skill: 'Scale institutional knowledge with Copilot Spaces', repo: 'scale-institutional-knowledge-using-copilot-spaces', sessionId: '8396f661', license: 'Copilot Pro+', time: 30 },
        { num: 9, title: 'AI와 함께 앱 완성', learn: 'Agent mode 앱 빌드', skill: 'Build apps with Copilot agent mode', repo: 'build-applications-w-copilot-agent-mode', sessionId: '256272c5', license: 'Copilot Pro', time: 60 },
        { num: 10, title: '말로 설명하면 AI가 앱을 뚝딱', learn: '노코딩으로 앱 생성', skill: 'Turn an idea into an app with GitHub Spark', repo: 'idea-to-app-with-spark', sessionId: 'f89101e2', license: 'Copilot Pro+', time: 60 },
        { num: 11, title: 'AI + Codespaces + VS Code', learn: 'Copilot과 클라우드 개발환경 통합', skill: 'Copilot + Codespaces + VS Code', repo: 'copilot-codespaces-vscode', sessionId: 'd3a5a722', license: 'Free', time: 30 },
        { num: 12, title: 'Copilot 확장 프로그램 만들기', learn: 'Copilot Extensions 개발', skill: 'Your First Extension for GitHub Copilot', repo: 'your-first-extension-for-github-copilot', sessionId: 'e8e5a0c6', license: 'Free', time: 60 },
      ]
    },
    cat_actions: {
      title: '자동화의 마법',
      subtitle: 'Automate workflows with GitHub Actions',
      icon: '⚙️',
      description: 'CI/CD부터 패키지 배포까지, 강력하고 유연한 워크플로우로 개발 프로세스를 자동화하세요.',
      modules: [
        { num: 1, title: '첫 로봇 일꾼 고용', learn: 'Workflow YAML 구조', skill: 'Hello GitHub Actions', repo: 'hello-github-actions', sessionId: '33211bf7', license: 'Free', time: 30 },
        { num: 2, title: '실수 잡아주는 시스템', learn: 'Push 시 자동 테스트', skill: 'Test with Actions', repo: 'test-with-actions', sessionId: '215e5376', license: 'Free', time: 60 },
        { num: 3, title: '파이프라인에 AI 두뇌', learn: 'Actions에서 AI 활용', skill: 'AI in Actions', repo: 'ai-in-actions', sessionId: 'b5af8a3b', license: 'Free', time: 30 },
        { num: 4, title: 'JavaScript로 나만의 Action', learn: '커스텀 Action 개발', skill: 'Write JavaScript Actions', repo: 'write-javascript-actions', sessionId: 'd105b02f', license: 'Free', time: 60 },
        { num: 5, title: 'AI 기반 Action 만들기', learn: 'Actions에서 AI 모델 호출', skill: 'Create AI Powered Actions', repo: 'create-ai-powered-actions', sessionId: '7750b774', license: 'Free', time: 60 },
        { num: 6, title: '어디서나 쓸 수 있게 포장', learn: 'Docker 이미지 배포', skill: 'Publish Docker Images', repo: 'publish-docker-images', sessionId: '6738d60f', license: 'Free', time: 60 },
        { num: 7, title: '10개 프로젝트에 재사용', learn: '워크플로우 템플릿화', skill: 'Create and use reusable workflows', repo: 'reusable-workflows', sessionId: '4695e100', license: 'Free', time: 60 },
        { num: 8, title: '릴리스 기반 배포 전략', learn: '브랜치별 릴리스 워크플로우', skill: 'Release Based Workflow', repo: 'release-based-workflow', sessionId: '6aabf966', license: 'Free', time: 60 },
        { num: 9, title: 'Azure에 자동 배포', learn: 'GitHub Actions to Azure 배포', skill: 'Deploy to Azure', repo: 'deploy-to-azure', sessionId: '91a8af2b', license: 'Free', time: 120 },
      ]
    },
    cat_security: {
      title: '내 코드 지키기',
      subtitle: 'Code security and analysis',
      icon: '🔒',
      description: '취약점을 찾고, 코드베이스를 보호하고, 개발 환경에서 바로 자신있게 배포하는 방법을 배우세요.',
      modules: [
        { num: 1, title: '취약점 자동 찾기', learn: 'Dependabot 패치 PR', skill: 'Secure your repository supply chain', repo: 'secure-repository-supply-chain', sessionId: '14fe64be', license: 'Free', time: 60 },
        { num: 2, title: 'AI 보안 구멍 찾기', learn: 'CodeQL 취약 탐지', skill: 'Introduction to CodeQL', repo: 'introduction-to-codeql', sessionId: '7ed33e7a', license: 'Free', time: 30 },
        { num: 3, title: '비밀번호 유출 방지', learn: 'Secret push 차단', skill: 'Introduction to secret scanning', repo: 'introduction-to-secret-scanning', sessionId: '8e9808b7', license: 'Free', time: 15 },
        { num: 4, title: 'CodeQL 언어 매트릭스 설정', learn: '다중 언어 보안 스캔 구성', skill: 'Configure CodeQL Language Matrix', repo: 'configure-codeql-language-matrix', sessionId: '1b86cfad', license: 'Free', time: 30 },
        { num: 5, title: '해커 입장에서 뷰어보기', learn: '보안 게임 체험', skill: 'Secure code game', repo: 'secure-code-game', sessionId: '6f903c6b', license: 'Free', time: 180 },
      ]
    },
    cat_switch: {
      title: '한 번에 이사',
      subtitle: 'Switch to GitHub',
      icon: '🔄',
      description: '다른 플랫폼에서 GitHub으로 프로젝트를 마이그레이션하세요. 원활한 전환을 위한 도구와 모범 사례를 제공합니다.',
      modules: [
        { num: 1, title: '하나도 안 버리고 GitHub으로 이사', learn: 'ADO to GitHub CLI 마이그레이션', skill: 'Migrate an Azure DevOps Repository', repo: 'migrate-ado-repository', sessionId: 'ec8c5f46', license: 'Free', time: 60 },
      ]
    },
  };

  // INIT
  (async function init() {
    await loadSessions();
    loadHomeStats();
    sidebarSessionSearch.addEventListener('input', filterSessionList);
    document.getElementById('sidebar-create-session-btn').addEventListener('click', function(e) { e.preventDefault(); if (isMobile()) closeMobileSidebar(); openModal(); });

    modalCancel.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', function(e) { if (e.target === modalOverlay) closeModal(); });
    createForm.addEventListener('submit', onCreateSession);
    copySnippetBtn.addEventListener('click', copySnippet);
    editModalCancel.addEventListener('click', closeEditModal);
    editModalOverlay.addEventListener('click', function(e) { if (e.target === editModalOverlay) closeEditModal(); });
    editForm.addEventListener('submit', onEditSession);
    editCopySnippetBtn.addEventListener('click', copyEditSnippet);
    searchForm.addEventListener('submit', onSearchUser);
    searchViewSummaryBtn.addEventListener('click', function() { switchSearchView('summary'); });
    searchViewDetailBtn.addEventListener('click', function() { switchSearchView('detail'); });
    searchSortSelect.addEventListener('change', function() { renderDetailView(currentSearchResults); });
    document.querySelectorAll('.sidebar-link[data-page]').forEach(function(link) {
      link.addEventListener('click', function(e) { e.preventDefault(); if (isMobile()) closeMobileSidebar(); navigateTo(link.dataset.page); });
    });
    document.querySelectorAll('.recommend-item[data-page]').forEach(function(card) {
      card.addEventListener('click', function(e) { e.preventDefault(); navigateTo(card.dataset.page); });
    });
    var params = new URLSearchParams(window.location.search);
    var sid = params.get('session');
    var initialPage = location.hash.replace('#', '') || 'home';
    if (sid) { selectSession(sid); }
    else if (initialPage !== 'home') { showPage(initialPage); }

    window.addEventListener('popstate', function() {
      var h = location.hash.replace('#', '') || 'home';
      var p = new URLSearchParams(window.location.search);
      var s = p.get('session');
      if (s && h === 'session') {
        currentSessionId = s;
        document.querySelectorAll('.sidebar-session-item').forEach(function(a) { a.classList.toggle('active', a.dataset.sessionId === s); });
        showPage('session');
        refreshDashboard();
        connectSSE();
      } else {
        if (h !== 'session') { disconnectSSE(); currentSessionId = null; currentSession = null; }
        showPage(h);
      }
    });
  })();

  // API
  async function api(path, options) { var res = await fetch(API_BASE + path, options); if (!res.ok) throw new Error('API ' + res.status); return res.json(); }

  // SESSIONS
  async function loadSessions() {
    try { allSessions = await api('/api/sessions'); renderSessionList(allSessions); } catch (err) { console.error('Failed to load sessions:', err); }
  }
  function renderSessionList(sessions) {
    sidebarSessionList.innerHTML = '';
    for (var i = 0; i < sessions.length; i++) {
      var s = sessions[i], li = document.createElement('li'), a = document.createElement('a');
      a.href = '#'; a.className = 'sidebar-link sidebar-session-item' + (currentSessionId === s.id ? ' active' : ''); a.dataset.sessionId = s.id;
      var date = new Date(s.createdAt).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
      a.innerHTML = '<span class="session-item-name">' + escapeHtml(s.name) + '</span><span class="session-item-meta">' + escapeHtml(s.track) + ' · ' + date + '</span>';
      a.addEventListener('click', (function(sid) { return function(e) { e.preventDefault(); if (isMobile()) closeMobileSidebar(); selectSession(sid); }; })(s.id));
      li.appendChild(a); sidebarSessionList.appendChild(li);
    }
  }
  function filterSessionList() {
    var q = sidebarSessionSearch.value.toLowerCase().trim();
    var filtered = q ? allSessions.filter(function(s) { return s.name.toLowerCase().includes(q) || s.track.toLowerCase().includes(q) || s.id.includes(q); }) : allSessions;
    renderSessionList(filtered);
  }
  async function selectSession(sessionId) {
    currentSessionId = sessionId;
    document.querySelectorAll('.sidebar-session-item').forEach(function(a) { a.classList.toggle('active', a.dataset.sessionId === sessionId); });
    history.pushState(null, '', '?session=' + sessionId + '#session');
    showPage('session'); await refreshDashboard(); connectSSE();
  }
  function updateURL() { /* handled by selectSession and navigateTo */ }

  // ROUTING
  function navigateTo(pageId) {
    if (pageId === 'session' && !currentSessionId) return;
    history.pushState(null, '', window.location.pathname + '#' + pageId);
    showPage(pageId);
  }
  function showPage(pageId) {
    pageHome.classList.add('hidden'); pageSession.classList.add('hidden'); pageTrack.classList.add('hidden'); pageAllSkills.classList.add('hidden'); pageSearch.classList.add('hidden');
    document.querySelectorAll('.sidebar-link[data-page]').forEach(function(l) { l.classList.remove('active'); });
    var al = document.querySelector('.sidebar-link[data-page="' + pageId + '"]'); if (al) al.classList.add('active');
    headerActions.innerHTML = '';
    if (pageId === 'home') { pageTitle.textContent = '홈 - 소개'; pageHome.classList.remove('hidden'); disconnectSSE(); clearCountdown(); }
    else if (pageId === 'session') {
      if (currentSession) { var sessionDisplayName = currentSession.name && currentSession.name.startsWith('All') ? currentSession.track : currentSession.name; pageTitle.textContent = '세션 - ' + sessionDisplayName; headerActions.innerHTML = '<button id="header-edit-btn" class="btn-secondary btn-sm">✏️ 수정</button>'; document.getElementById('header-edit-btn').addEventListener('click', openEditModal); }
      else { pageTitle.textContent = '세션 - 대시보드'; }
      pageSession.classList.remove('hidden');
    } else if (pageId === 'all-skills') { pageTitle.textContent = '교육 코스 - 전체 실습 목록'; renderAllSkillsPage(); pageAllSkills.classList.remove('hidden'); }
    else if (pageId === 'search') { pageTitle.textContent = '관리 - 참여 이력 검색'; pageSearch.classList.remove('hidden'); }
    else if (TRACKS[pageId]) { var t = TRACKS[pageId]; pageTitle.textContent = '교육 코스 - ' + t.title + ' ' + t.subtitle; renderTrackPage(pageId); pageTrack.classList.remove('hidden'); }
    else if (CATEGORIES[pageId]) { var c = CATEGORIES[pageId]; pageTitle.textContent = '교육 코스 - ' + c.title; renderCategoryPage(pageId); pageTrack.classList.remove('hidden'); }
  }

  // HOME STATS
  var allDailyEvents = null;
  var chartPeriodDays = 7;

  async function loadHomeStats() {
    allDailyEvents = null;
    try {
      var data = await api('/api/stats/overview');
      document.getElementById('home-total-sessions').textContent = data.totalSessions.toLocaleString();
      document.getElementById('home-total-participants').textContent = data.totalParticipants.toLocaleString();
      document.getElementById('home-total-completed').textContent = data.totalCompleted.toLocaleString();
      if (data.dailyEvents && data.dailyEvents.length > 0) allDailyEvents = data.dailyEvents;
    } catch (err) {
      console.error('Failed to load home stats, using mock data:', err);
      document.getElementById('home-total-sessions').textContent = '24';
      document.getElementById('home-total-participants').textContent = '312';
      document.getElementById('home-total-completed').textContent = '198';
    }
    if (!allDailyEvents) allDailyEvents = generateMockDailyEvents();
    renderDailyChart(allDailyEvents.slice(-chartPeriodDays));
    updatePeriodButtons();
  }

  function updatePeriodButtons() {
    var btns = document.querySelectorAll('.chart-period-btn');
    for (var i = 0; i < btns.length; i++) {
      if (Number(btns[i].getAttribute('data-days')) === chartPeriodDays) {
        btns[i].classList.add('active');
      } else {
        btns[i].classList.remove('active');
      }
    }
  }

  document.addEventListener('click', function(e) {
    if (e.target.classList.contains('chart-period-btn')) {
      chartPeriodDays = Number(e.target.getAttribute('data-days'));
      updatePeriodButtons();
      if (allDailyEvents) renderDailyChart(allDailyEvents.slice(-chartPeriodDays));
    }
  });

  function generateMockDailyEvents() {
    var events = [], now = new Date();
    // Realistic workshop pattern: weekdays busy, weekends quiet, with peaks
    var pattern = [120,95,180,210,150,30,15, 160,200,250,310,280,45,20, 190,220,350,420,380,60,25, 210,280,390,450,300,50,18, 230,320];
    for (var i = 29; i >= 0; i--) {
      var d = new Date(now); d.setDate(d.getDate() - i);
      var pad = function(n) { return String(n).padStart(2, '0'); };
      var dateStr = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
      var base = pattern[29 - i] || 100;
      var jitter = Math.floor(Math.random() * 40) - 20;
      var total = Math.max(10, base + jitter);
      var started = Math.floor(total * 0.35);
      var completed = Math.floor(total * 0.25);
      var steps = total - started - completed;
      events.push({ date: dateStr, started: started, completed: completed, steps: steps });
    }
    return events;
  }
  function renderDailyChart(dailyEvents) {
    var chart = document.getElementById('home-chart'), maxVal = 1;
    var totalStarted = 0, totalCompleted = 0;
    for (var i = 0; i < dailyEvents.length; i++) {
      var m = Math.max(dailyEvents[i].started, dailyEvents[i].completed);
      if (m > maxVal) maxVal = m;
      totalStarted += dailyEvents[i].started;
      totalCompleted += dailyEvents[i].completed;
    }
    // Scale so max bar is ~80% height
    var scaleMax = Math.ceil(maxVal * 1.25);
    // Y-axis ticks
    var yAxis = document.getElementById('home-chart-yaxis');
    var tickCount = 4;
    var yHtml = '';
    for (var t = tickCount; t >= 0; t--) {
      var val = Math.round((scaleMax / tickCount) * t);
      yHtml += '<span class="yaxis-tick">' + val + '</span>';
    }
    yAxis.innerHTML = yHtml;
    var html = '';
    for (var i = 0; i < dailyEvents.length; i++) {
      var day = dailyEvents[i];
      var startPct = Math.max(1, (day.started / scaleMax) * 100);
      var completePct = Math.max(1, (day.completed / scaleMax) * 100);
      var label = day.date.substring(5);
      html += '<div class="chart-bar-group" title="' + day.date + ': \uc2dc\uc791 ' + day.started + ', \uc644\ub8cc ' + day.completed + '">' +
        '<div class="chart-bar-pair">' +
        '<div class="chart-bar-col"><span class="chart-bar-val">' + day.started + '</span><div class="chart-bar chart-bar-start" style="height:' + startPct + '%"></div></div>' +
        '<div class="chart-bar-col"><span class="chart-bar-val">' + day.completed + '</span><div class="chart-bar chart-bar-complete" style="height:' + completePct + '%"></div></div>' +
        '</div>' +
        '<span class="chart-bar-label">' + label + '</span></div>';
    }
    chart.innerHTML = html;
  }

  // DASHBOARD
  async function refreshDashboard() {
    if (!currentSessionId) return;
    try {
      var results = await Promise.all([api('/api/sessions/' + currentSessionId), api('/api/sessions/' + currentSessionId + '/leaderboard')]);
      var sd = results[0], lb = results[1]; currentSession = sd;
      var isAll = sd.name && sd.name.startsWith('All');
      var sdDisplayName = sd.name && sd.name.startsWith('All') ? sd.track : sd.name;
      pageTitle.textContent = '세션 - ' + sdDisplayName;
      headerActions.innerHTML = '<button id="header-edit-btn" class="btn-secondary btn-sm">✏️ 수정</button>';
      document.getElementById('header-edit-btn').addEventListener('click', openEditModal);
      renderSessionInfo(sd); renderStats(sd);
      if (isAll) { podiumSection.classList.add('hidden'); } else { podiumSection.classList.remove('hidden'); renderPodium(lb.leaderboard); renderCountdown(sd); }
      renderParticipants(lb.leaderboard, lb.participants, isAll); renderFeedFromHistory(lb.recentEvents || []);
    } catch (err) { console.error('Dashboard refresh error:', err); }
  }
  function renderSessionInfo(s) { var st = s.startDate ? new Date(s.startDate).toLocaleString('ko-KR') : '-', en = s.endDate ? new Date(s.endDate).toLocaleString('ko-KR') : '-'; sessionInfoEl.innerHTML = '<strong>' + escapeHtml(s.name) + '</strong> &nbsp;|&nbsp; Skill: ' + escapeHtml(s.track) + ' &nbsp;|&nbsp; 기간: ' + st + ' ~ ' + en; }
  function renderStats(s) { if (!s.stats) { sessionStatsEl.innerHTML = ''; return; } sessionStatsEl.innerHTML = '<div class="stat-card"><span class="stat-value">' + s.stats.started + '</span><span class="stat-label">시작</span></div><div class="stat-card highlight"><span class="stat-value">' + s.stats.completed + '</span><span class="stat-label">완료</span></div><div class="stat-card"><span class="stat-value">' + s.stats.completionRate + '%</span><span class="stat-label">완료율</span></div>'; }

  // PODIUM
  function renderPodium(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) { podiumEl.innerHTML = '<div class="podium-empty">아직 완료한 참가자가 없습니다</div>'; return; }
    var trophies = ['🥇', '🥈', '🥉'], top10 = leaderboard.slice(0, 10), rows = [], idx = 0;
    for (var rs = 1; rs <= 4 && idx < top10.length; rs++) { rows.push(top10.slice(idx, idx + rs)); idx += rs; }
    var html = '';
    for (var r = 0; r < rows.length; r++) { html += '<div class="podium-row">'; for (var j = 0; j < rows[r].length; j++) { var e = rows[r][j], av = 'https://github.com/' + encodeURIComponent(e.username) + '.png?size=100', tm = new Date(e.completedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }), tp = e.rank <= 3 ? trophies[e.rank - 1] : '', rl = e.rank <= 3 ? (e.rank === 1 ? '1st Place' : e.rank === 2 ? '2nd Place' : '3rd Place') : e.rank + 'th'; html += '<div class="podium-card rank-' + e.rank + '"><img class="podium-avatar" src="' + av + '" alt="' + escapeAttr(e.username) + '" onerror="this.style.display=\'none\'"><div class="podium-info"><div class="podium-rank-row"><span class="podium-rank-label">' + rl + '</span>' + (tp ? '<span class="podium-trophy">' + tp + '</span>' : '') + '</div><div class="podium-username">' + escapeHtml(e.username) + '</div><div class="podium-time">' + tm + '</div></div></div>'; } html += '</div>'; }
    podiumEl.innerHTML = html;
  }
  function renderCountdown(session) {
    clearCountdown(); if (!session.endDate) { podiumCountdownEl.innerHTML = ''; return; }
    function update() { var now = Date.now(), end = new Date(session.endDate).getTime(), diff = end - now; if (diff <= 0) { podiumCountdownEl.innerHTML = '<div class="countdown-label">종료됨</div>'; clearCountdown(); return; } var d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000), pts = []; if (d > 0) pts.push(d + 'd'); pts.push(String(h).padStart(2, '0') + 'h', String(m).padStart(2, '0') + 'm', String(s).padStart(2, '0') + 's'); podiumCountdownEl.innerHTML = '<div class="countdown-label">Ends in</div><div class="countdown-value">' + pts.join(' ') + '</div>'; }
    update(); countdownTimer = setInterval(update, 1000);
  }
  function clearCountdown() { if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; } }

  // PARTICIPANTS
  var PAGE_SIZE = 100, currentPage = 1, cachedParticipantsData = null;
  function getLastEventTime(p) { var latest = 0; if (p.completedAt) latest = Math.max(latest, new Date(p.completedAt).getTime()); if (p.startedAt) latest = Math.max(latest, new Date(p.startedAt).getTime()); if (p.steps) { for (var i = 0; i < p.steps.length; i++) { if (p.steps[i].timestamp) latest = Math.max(latest, new Date(p.steps[i].timestamp).getTime()); } } return latest; }
  function renderParticipants(leaderboard, participants, isAllSession) {
    if (isAllSession) participants = participants.slice().sort(function(a, b) { return getLastEventTime(b) - getLastEventTime(a); });
    cachedParticipantsData = { leaderboard: leaderboard, participants: participants, isAllSession: isAllSession }; currentPage = 1; renderParticipantsPage();
  }
  function renderParticipantsPage() {
    var lb = cachedParticipantsData.leaderboard, parts = cachedParticipantsData.participants, isAll = cachedParticipantsData.isAllSession;
    participantsBody.innerHTML = ''; participantsHeadRow.innerHTML = '';
    var rankMap = new Map(); for (var i = 0; i < lb.length; i++) rankMap.set(lb[i].username, lb[i].rank);
    var columnMap = new Map();
    for (var i = 0; i < parts.length; i++) { var p = parts[i]; if (p.startedAt && !columnMap.has('start')) columnMap.set('start', { label: p.startDescription || '시작', order: -1 }); if (p.steps) { for (var j = 0; j < p.steps.length; j++) { var k = 'step_' + p.steps[j].step; if (!columnMap.has(k)) columnMap.set(k, { label: p.steps[j].description || 'Step ' + p.steps[j].step, order: p.steps[j].step }); } } if (p.completedAt && !columnMap.has('end')) columnMap.set('end', { label: p.endDescription || '완료', order: 99999 }); }
    var dynamicCols = Array.from(columnMap.entries()).sort(function(a, b) { return a[1].order - b[1].order; });
    var headers = [isAll ? '#' : 'Rank', 'GitHub ID', 'Repo']; for (var i = 0; i < headers.length; i++) { var th = document.createElement('th'); th.textContent = headers[i]; participantsHeadRow.appendChild(th); }
    for (var i = 0; i < dynamicCols.length; i++) { var th = document.createElement('th'); th.textContent = dynamicCols[i][1].label; th.className = 'dynamic-col-header'; participantsHeadRow.appendChild(th); }
    var sTh = document.createElement('th'); sTh.textContent = '상태'; participantsHeadRow.appendChild(sTh);
    var totalPages = Math.ceil(parts.length / PAGE_SIZE), startIdx = (currentPage - 1) * PAGE_SIZE, pageItems = parts.slice(startIdx, startIdx + PAGE_SIZE);
    for (var i = 0; i < pageItems.length; i++) {
      var p = pageItems[i], tr = document.createElement('tr'), av = 'https://github.com/' + encodeURIComponent(p.username) + '.png?size=64';
      var repoLink = p.repo ? '<a href="https://github.com/' + escapeAttr(p.repo) + '" target="_blank" rel="noopener" class="repo-link">' + escapeHtml(p.repo) + '</a>' : '-';
      var fv, fc; if (isAll) { fv = startIdx + i + 1; fc = ''; } else { var rank = rankMap.get(p.username); fv = rank || '-'; fc = rank && rank <= 3 ? 'rank-' + rank + '-cell' : ''; }
      var rh = '<td class="rank-cell ' + fc + '">' + fv + '</td><td><div class="user-cell"><img class="user-avatar" src="' + av + '" alt="" onerror="this.style.display=\'none\'"><div><div class="user-name">' + escapeHtml(p.username) + '</div><div class="user-handle">@' + escapeHtml(p.username) + '</div></div></div></td><td>' + repoLink + '</td>';
      var sm = new Map(); if (p.steps) { for (var j = 0; j < p.steps.length; j++) sm.set('step_' + p.steps[j].step, p.steps[j].timestamp); }
      for (var j = 0; j < dynamicCols.length; j++) { var key = dynamicCols[j][0], ts = key === 'start' ? p.startedAt : key === 'end' ? p.completedAt : (sm.get(key) || null); rh += '<td class="ts-cell">' + (ts ? formatTimestamp(ts) : '-') + '</td>'; }
      rh += '<td><span class="status-badge ' + (p.status === 'completed' ? 'status-completed' : 'status-started') + '">' + (p.status === 'completed' ? '완료' : p.status === 'in_progress' ? '진행 중' : '시작') + '</span></td>';
      tr.innerHTML = rh; participantsBody.appendChild(tr);
    }
    renderPagination(totalPages, parts.length);
  }
  function renderPagination(totalPages, totalItems) {
    var el = document.getElementById('participants-pagination');
    if (!el) { el = document.createElement('div'); el.id = 'participants-pagination'; el.className = 'pagination'; document.getElementById('participants-panel').appendChild(el); }
    if (totalPages <= 1) { el.innerHTML = ''; return; }
    var s = (currentPage - 1) * PAGE_SIZE + 1, e = Math.min(currentPage * PAGE_SIZE, totalItems);
    var html = '<span class="pagination-info">' + s + '-' + e + ' / ' + totalItems + '명</span><button class="pagination-btn" data-page="prev" ' + (currentPage <= 1 ? 'disabled' : '') + '>← 이전</button>';
    var max = 5, sp = Math.max(1, currentPage - Math.floor(max / 2)), ep = Math.min(totalPages, sp + max - 1); if (ep - sp < max - 1) sp = Math.max(1, ep - max + 1);
    for (var i = sp; i <= ep; i++) html += '<button class="pagination-btn ' + (i === currentPage ? 'active' : '') + '" data-page="' + i + '">' + i + '</button>';
    html += '<button class="pagination-btn" data-page="next" ' + (currentPage >= totalPages ? 'disabled' : '') + '>다음 →</button>';
    el.innerHTML = html;
    el.querySelectorAll('.pagination-btn').forEach(function(btn) { btn.addEventListener('click', function() { var v = btn.dataset.page; if (v === 'prev') currentPage--; else if (v === 'next') currentPage++; else currentPage = parseInt(v, 10); renderParticipantsPage(); }); });
  }
  function formatTimestamp(isoStr) { var d = new Date(isoStr), pad = function(n) { return String(n).padStart(2, '0'); }; return '<span class="ts-date">' + d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + '</span><span class="ts-time">' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()) + '</span>'; }

  // SSE
  function connectSSE() { disconnectSSE(); eventSource = new EventSource(API_BASE + '/api/stream' + (currentSessionId ? '?sessionId=' + currentSessionId : '')); eventSource.onmessage = function(e) { try { var data = JSON.parse(e.data); if (data.type === 'start' || data.type === 'end' || data.type === 'step') { addFeedItem(data); showCelebration(data); refreshDashboard(); } } catch(ex) {} }; eventSource.onerror = function() {}; }
  function disconnectSSE() { if (eventSource) { eventSource.close(); eventSource = null; } }
  function addFeedItem(data, append) { var li = document.createElement('li'), tm = new Date(data.timestamp).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }), av = '<img class="feed-avatar" src="https://github.com/' + encodeURIComponent(data.username) + '.png?size=32" alt="" onerror="this.style.display=\'none\'">'; if (data.type === 'start') li.innerHTML = '<span class="feed-time">' + tm + '</span> ' + av + ' 🚀 <strong>' + escapeHtml(data.username) + '</strong> 실습을 시작했습니다!'; else if (data.type === 'step') li.innerHTML = '<span class="feed-time">' + tm + '</span> ' + av + ' 📌 <strong>' + escapeHtml(data.username) + '</strong> <em>' + escapeHtml(data.description || 'Step ' + data.step) + '</em> 단계를 통과했습니다!'; else li.innerHTML = '<span class="feed-time">' + tm + '</span> ' + av + ' 🎉 <strong>' + escapeHtml(data.username) + '</strong> 실습을 완료했습니다!'; if (append) feedList.appendChild(li); else feedList.prepend(li); while (feedList.children.length > 10) feedList.removeChild(feedList.lastChild); }
  function renderFeedFromHistory(events) { feedList.innerHTML = ''; for (var i = 0; i < events.length; i++) addFeedItem(events[i], true); }

  // CELEBRATION
  function showCelebration(data) { var ov = document.createElement('div'); ov.className = 'celebration-overlay'; var emoji = data.type === 'end' ? '🎉' : data.type === 'step' ? '📌' : '🚀', msg = data.type === 'end' ? data.username + ' 완료!' : data.type === 'step' ? data.username + ' Step 통과!' : data.username + ' 시작!'; var colors = ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff922b', '#cc5de8', '#58c7f3'], cf = ''; for (var i = 0; i < 40; i++) { var c = colors[i % colors.length]; cf += '<span class="confetti-particle" style="left:' + (Math.random() * 100) + '%;animation-delay:' + (Math.random() * 0.5) + 's;background:' + c + ';width:' + (6 + Math.random() * 6) + 'px;height:' + (6 + Math.random() * 6) + 'px;transform:rotate(' + (Math.random() * 360) + 'deg)"></span>'; } ov.innerHTML = cf + '<div class="celebration-message"><span class="celebration-emoji">' + emoji + '</span><span class="celebration-text">' + escapeHtml(msg) + '</span></div>'; document.body.appendChild(ov); setTimeout(function() { ov.classList.add('celebration-fade-out'); setTimeout(function() { ov.remove(); }, 400); }, 2000); }

  // MODALS
  function openModal() { snippetResult.classList.add('hidden'); createForm.classList.remove('hidden'); createForm.reset(); var now = new Date(), y = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1), nw = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7); function tl(d) { var p = function(n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T00:00'; } document.getElementById('form-start').value = tl(y); document.getElementById('form-end').value = tl(nw); modalOverlay.classList.remove('hidden'); }
  function closeModal() { modalOverlay.classList.add('hidden'); }
  async function onCreateSession(e) { e.preventDefault(); var name = document.getElementById('form-name').value.trim(), track = document.getElementById('form-track').value.trim(), sd = document.getElementById('form-start').value ? new Date(document.getElementById('form-start').value).toISOString() : null, ed = document.getElementById('form-end').value ? new Date(document.getElementById('form-end').value).toISOString() : null; try { var pw = document.getElementById('form-admin-password').value, result = await api('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Password': pw }, body: JSON.stringify({ name: name, track: track, startDate: sd, endDate: ed }) }); snippetSessionId.textContent = result.sessionId; snippetCode.textContent = generateSnippet(result.sessionId, track); snippetResult.classList.remove('hidden'); createForm.classList.add('hidden'); await loadSessions(); selectSession(result.sessionId); } catch (err) { alert('세션 생성 실패: ' + err.message); } }
  function generateSnippet(sid, track) { return '# 시작 워크플로우에 추가\n- name: Report Start\n  run: curl -sf -X POST "' + API_BASE + '/api/events" -H "Content-Type: application/json" -d \'{"sessionId":"' + sid + '","type":"start","username":"\'$GITHUB_ACTOR\'","repo":"\'$GITHUB_REPOSITORY\'","track":"' + track + '","runId":"\'$GITHUB_RUN_ID\'"}\'\n\n# 완료 워크플로우에 추가\n- name: Report Completion\n  run: curl -sf -X POST "' + API_BASE + '/api/events" -H "Content-Type: application/json" -d \'{"sessionId":"' + sid + '","type":"end","username":"\'$GITHUB_ACTOR\'","repo":"\'$GITHUB_REPOSITORY\'","track":"' + track + '","runId":"\'$GITHUB_RUN_ID\'"}\'\n'; }
  function copySnippet() { navigator.clipboard.writeText(snippetCode.textContent).then(function() { copySnippetBtn.textContent = '✅ 복사됨!'; setTimeout(function() { copySnippetBtn.textContent = '📋 복사'; }, 2000); }); }
  function openEditModal() { if (!currentSession) return; editSnippetResult.classList.add('hidden'); editForm.classList.remove('hidden'); document.getElementById('edit-form-name').value = currentSession.name || ''; document.getElementById('edit-form-track').value = currentSession.track || ''; document.getElementById('edit-form-created').value = currentSession.createdAt ? toLocalDT(currentSession.createdAt) : ''; document.getElementById('edit-form-start').value = currentSession.startDate ? toLocalDT(currentSession.startDate) : ''; document.getElementById('edit-form-end').value = currentSession.endDate ? toLocalDT(currentSession.endDate) : ''; editModalOverlay.classList.remove('hidden'); }
  function closeEditModal() { editModalOverlay.classList.add('hidden'); }
  function toLocalDT(iso) { var d = new Date(iso), p = function(n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  async function onEditSession(e) { e.preventDefault(); var name = document.getElementById('edit-form-name').value.trim(), track = document.getElementById('edit-form-track').value.trim(), ca = document.getElementById('edit-form-created').value ? new Date(document.getElementById('edit-form-created').value).toISOString() : null, sd = document.getElementById('edit-form-start').value ? new Date(document.getElementById('edit-form-start').value).toISOString() : null, ed = document.getElementById('edit-form-end').value ? new Date(document.getElementById('edit-form-end').value).toISOString() : null; try { var pw = document.getElementById('edit-form-admin-password').value; var body = { name: name, track: track, startDate: sd, endDate: ed }; if (ca) body.createdAt = ca; var result = await api('/api/sessions/' + currentSessionId, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Admin-Password': pw }, body: JSON.stringify(body) }); editSnippetSessionId.textContent = result.sessionId; editSnippetCode.textContent = generateSnippet(result.sessionId, track); editSnippetResult.classList.remove('hidden'); editForm.classList.add('hidden'); await loadSessions(); await refreshDashboard(); } catch (err) { alert('세션 수정 실패: ' + err.message); } }
  function copyEditSnippet() { navigator.clipboard.writeText(editSnippetCode.textContent).then(function() { editCopySnippetBtn.textContent = '✅ 복사됨!'; setTimeout(function() { editCopySnippetBtn.textContent = '📋 복사'; }, 2000); }); }

  // SEARCH
  function resetSearchPage() { searchResultsDiv.classList.add('hidden'); searchEmpty.classList.add('hidden'); searchUserProfile.innerHTML = ''; searchResultsBody.innerHTML = ''; searchDetailView.innerHTML = ''; currentSearchResults = null; switchSearchView('summary'); document.getElementById('search-query').value = ''; }
  async function onSearchUser(e) { e.preventDefault(); var q = document.getElementById('search-query').value.trim(); if (!q) return; try { var data = await api('/api/users/search?q=' + encodeURIComponent(q)); if (!data.results || data.results.length === 0) { searchResultsDiv.classList.add('hidden'); searchEmpty.classList.remove('hidden'); return; } searchEmpty.classList.add('hidden'); searchResultsDiv.classList.remove('hidden'); currentSearchResults = data.results; var fu = data.results[0].username, as = data.results.every(function(r) { return r.username === fu; }); if (as) { var cc = data.results.filter(function(r) { return r.status === 'completed'; }).length; searchUserProfile.innerHTML = '<img class="search-avatar" src="https://github.com/' + encodeURIComponent(fu) + '.png?size=80" alt="" onerror="this.style.display=\'none\'"><div class="search-profile-info"><div class="search-profile-name">' + escapeHtml(fu) + '</div><div class="search-profile-stats">총 ' + data.results.length + '개 세션 참여 · ' + cc + '개 완료</div></div>'; } else { var uu = []; data.results.forEach(function(r) { if (uu.indexOf(r.username) === -1) uu.push(r.username); }); searchUserProfile.innerHTML = '<div class="search-profile-info"><div class="search-profile-name">🏢 ' + escapeHtml(q) + '</div><div class="search-profile-stats">' + uu.length + '명의 사용자 · ' + data.results.length + '개 참여 기록</div></div>'; } searchResultsBody.innerHTML = ''; for (var i = 0; i < data.results.length; i++) { var r = data.results[i], tr = document.createElement('tr'), st = r.startedAt ? formatTimestamp(r.startedAt) : '-', ct = r.completedAt ? formatTimestamp(r.completedAt) : '-', dur = (r.startedAt && r.completedAt) ? Math.round((new Date(r.completedAt).getTime() - new Date(r.startedAt).getTime()) / 60000) + '분' : '-', rl = r.repo ? '<a href="https://github.com/' + escapeAttr(r.repo) + '" target="_blank" rel="noopener" class="repo-link">' + escapeHtml(r.repo) + '</a>' : '-'; tr.innerHTML = '<td><a href="#" class="search-session-link" data-session-id="' + escapeAttr(r.sessionId) + '">' + escapeHtml(r.sessionName) + '</a></td><td>' + escapeHtml(r.sessionTrack) + '</td><td>' + rl + '</td><td class="ts-cell">' + st + '</td><td class="ts-cell">' + ct + '</td><td class="ts-cell dur-cell">' + dur + '</td><td><span class="status-badge ' + (r.status === 'completed' ? 'status-completed' : 'status-started') + '">' + (r.status === 'completed' ? '완료' : '진행 중') + '</span></td>'; searchResultsBody.appendChild(tr); } searchResultsBody.querySelectorAll('.search-session-link').forEach(function(link) { link.addEventListener('click', function(e) { e.preventDefault(); selectSession(link.dataset.sessionId); }); }); } catch (err) { alert('검색 실패: ' + err.message); } }
  function switchSearchView(mode) { if (mode === 'summary') { searchViewSummaryBtn.classList.add('active'); searchViewDetailBtn.classList.remove('active'); searchSummaryView.classList.remove('hidden'); searchDetailView.classList.add('hidden'); searchSortOptions.classList.add('hidden'); } else { searchViewSummaryBtn.classList.remove('active'); searchViewDetailBtn.classList.add('active'); searchSummaryView.classList.add('hidden'); searchDetailView.classList.remove('hidden'); searchSortOptions.classList.remove('hidden'); if (currentSearchResults) renderDetailView(currentSearchResults); } }
  function renderDetailView(results) {
    if (!results || results.length === 0) { searchDetailView.innerHTML = '<p class="search-empty">이벤트 이력이 없습니다.</p>'; return; }
    var sortMode = searchSortSelect.value;
    var trackGroups = new Map();
    for (var i = 0; i < results.length; i++) {
      var r = results[i], track = r.sessionTrack || '(알 수 없음)';
      if (!trackGroups.has(track)) trackGroups.set(track, { track: track, sessionId: r.sessionId, sessionName: r.sessionName, participants: [] });
      trackGroups.get(track).participants.push(r);
    }
    var sorted = Array.from(trackGroups.values());
    if (sortMode === 'track-asc') sorted.sort(function(a, b) { return a.track.localeCompare(b.track); });
    else if (sortMode === 'track-desc') sorted.sort(function(a, b) { return b.track.localeCompare(a.track); });
    else if (sortMode === 'time-asc') sorted.sort(function(a, b) { var ta = a.participants[0] && a.participants[0].startedAt ? new Date(a.participants[0].startedAt).getTime() : 0; var tb = b.participants[0] && b.participants[0].startedAt ? new Date(b.participants[0].startedAt).getTime() : 0; return ta - tb; });
    else sorted.sort(function(a, b) { var ta = a.participants[0] && a.participants[0].startedAt ? new Date(a.participants[0].startedAt).getTime() : 0; var tb = b.participants[0] && b.participants[0].startedAt ? new Date(b.participants[0].startedAt).getTime() : 0; return tb - ta; });

    var html = '';
    for (var gi = 0; gi < sorted.length; gi++) {
      var group = sorted[gi];
      var colMap = new Map();
      for (var pi = 0; pi < group.participants.length; pi++) {
        var p = group.participants[pi];
        if (p.startedAt && !colMap.has('start')) colMap.set('start', { label: '실습 시작', order: -1 });
        if (p.events) { for (var ei = 0; ei < p.events.length; ei++) { var ev = p.events[ei]; if (ev.type === 'step' && ev.step != null) { var k = 'step_' + ev.step; if (!colMap.has(k)) colMap.set(k, { label: ev.description || 'Step ' + ev.step, order: ev.step }); } } }
        if (p.completedAt && !colMap.has('end')) colMap.set('end', { label: '완료', order: 99999 });
      }
      if (colMap.size === 0) { for (var pi2 = 0; pi2 < group.participants.length; pi2++) { var p2 = group.participants[pi2]; if (p2.startedAt && !colMap.has('start')) colMap.set('start', { label: '실습 시작', order: -1 }); if (p2.completedAt && !colMap.has('end')) colMap.set('end', { label: '완료', order: 99999 }); } }
      var dynCols = Array.from(colMap.entries()).sort(function(a, b) { return a[1].order - b[1].order; });

      var tHtml = '<div class="detail-track-group"><div class="detail-track-header"><a href="#" class="detail-session-link detail-session-highlight" data-session-id="' + escapeAttr(group.sessionId) + '">' + escapeHtml(group.sessionName) + '</a><span class="detail-track-name">' + escapeHtml(group.track) + '</span></div><div class="detail-table-wrapper"><table class="detail-events-table"><thead><tr>';
      for (var ci = 0; ci < dynCols.length; ci++) tHtml += '<th class="dynamic-col-header">' + escapeHtml(dynCols[ci][1].label) + '</th>';
      tHtml += '<th>소요</th><th>상태</th></tr></thead><tbody>';

      for (var pi3 = 0; pi3 < group.participants.length; pi3++) {
        var p3 = group.participants[pi3];
        var av = 'https://github.com/' + encodeURIComponent(p3.username) + '.png?size=64';
        var sm = new Map();
        if (p3.events) { for (var ei2 = 0; ei2 < p3.events.length; ei2++) { var ev2 = p3.events[ei2]; if (ev2.type === 'step' && ev2.step != null) sm.set('step_' + ev2.step, ev2.timestamp); } }
        var rHtml = '';
        var durTs = null;
        for (var ci2 = 0; ci2 < dynCols.length; ci2++) {
          var key = dynCols[ci2][0], ts = key === 'start' ? p3.startedAt : key === 'end' ? p3.completedAt : (sm.get(key) || null);
          rHtml += '<td class="ts-cell">' + (ts ? formatTimestamp(ts) : '-') + '</td>';
        }
        if (p3.startedAt && p3.completedAt) { durTs = Math.round((new Date(p3.completedAt).getTime() - new Date(p3.startedAt).getTime()) / 60000); }
        rHtml += '<td class="ts-cell dur-cell">' + (durTs != null ? durTs + '분' : '-') + '</td>';
        rHtml += '<td><span class="status-badge ' + (p3.status === 'completed' ? 'status-completed' : 'status-started') + '">' + (p3.status === 'completed' ? '완료' : '진행 중') + '</span></td>';
        tHtml += '<tr>' + rHtml + '</tr>';
      }
      tHtml += '</tbody></table></div></div>';
      html += tHtml;
    }
    searchDetailView.innerHTML = html;
    searchDetailView.querySelectorAll('.detail-session-link').forEach(function(link) { link.addEventListener('click', function(e) { e.preventDefault(); selectSession(link.dataset.sessionId); }); });
  }

  // UTILITY
  function escapeHtml(str) { var d = document.createElement('div'); d.textContent = str || ''; return d.innerHTML; }
  function escapeAttr(str) { return (str || '').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  // TRACK/SKILLS PAGES
  var theoryPages = { 'introduction-to-github': true, 'communicate-using-markdown': true, 'github-pages': true, 'introduction-to-git': true, 'review-pull-requests': true, 'resolve-merge-conflicts': true, 'code-with-codespaces': true, 'introduction-to-repository-management': true, 'change-commit-history': true, 'connect-the-dots': true, 'getting-started-with-github-copilot': true, 'customize-your-github-copilot-experience': true, 'copilot-code-review': true, 'integrate-mcp-with-copilot': true, 'expand-your-team-with-copilot': true, 'create-applications-with-the-copilot-cli': true, 'modernize-your-legacy-code-with-github-copilot': true, 'scale-institutional-knowledge-using-copilot-spaces': true, 'build-applications-w-copilot-agent-mode': true, 'idea-to-app-with-spark': true, 'copilot-codespaces-vscode': true, 'your-first-extension-for-github-copilot': true, 'hello-github-actions': true, 'test-with-actions': true, 'ai-in-actions': true, 'write-javascript-actions': true, 'create-ai-powered-actions': true, 'publish-docker-images': true, 'reusable-workflows': true, 'release-based-workflow': true, 'deploy-to-azure': true, 'secure-repository-supply-chain': true, 'introduction-to-codeql': true, 'introduction-to-secret-scanning': true, 'configure-codeql-language-matrix': true, 'secure-code-game': true, 'migrate-ado-repository': true };
  function renderTrackPage(trackId) {
    var t = TRACKS[trackId], mh = '';
    for (var i = 0; i < t.modules.length; i++) { var m = t.modules[i]; mh += '<tr><td class="module-num">' + m.num + '</td><td class="module-title">' + escapeHtml(m.title) + '</td><td class="module-learn">' + escapeHtml(m.learn) + '</td><td class="module-skill">' + escapeHtml(m.skill) + ' <a href="https://github.com/skills-kr/' + m.repo + '" target="_blank" rel="noopener" class="badge badge-ready skill-lab-link">실습</a></td><td class="module-link"><a href="#" class="badge badge-dash track-session-link" data-session-id="' + m.sessionId + '">이동</a></td></tr>'; }
    pageTrack.innerHTML = '<div class="track-page-inner"><div class="track-header"><div class="track-meta"><span class="track-meta-item">👥 ' + escapeHtml(t.audience) + '</span><span class="track-meta-item">⏱ ' + escapeHtml(t.duration) + '</span></div><p class="track-result">🎯 결과물: ' + escapeHtml(t.result) + '</p></div><div class="curriculum-table-wrapper"><table class="curriculum-table"><thead><tr><th>#</th><th>모듈</th><th>배우는 것</th><th>Skill</th><th>세션 대시보드</th></tr></thead><tbody>' + mh + '</tbody></table></div><div class="track-story"><p>💡 ' + escapeHtml(t.story) + '</p></div></div>';
    pageTrack.querySelectorAll('.track-session-link').forEach(function(link) { link.addEventListener('click', function(e) { e.preventDefault(); selectSession(link.dataset.sessionId); }); });
  }
  function renderCategoryPage(catId) {
    var c = CATEGORIES[catId], mh = '';
    for (var i = 0; i < c.modules.length; i++) { var m = c.modules[i]; var lc = (m.license || 'Free').replace('+', 'plus').replace(' ', '-').toLowerCase(); var theoryBtn = theoryPages[m.repo] ? ' <a href="learn/' + m.repo + '.html" target="_blank" rel="noopener" class="badge badge-theory skill-theory-link">이론</a>' : ''; mh += '<tr><td class="module-num">' + m.num + '</td><td class="module-title">' + escapeHtml(m.title) + '</td><td class="module-learn">' + escapeHtml(m.learn) + '</td><td class="module-skill">' + escapeHtml(m.skill) + theoryBtn + ' <a href="https://github.com/skills-kr/' + m.repo + '" target="_blank" rel="noopener" class="badge badge-ready skill-lab-link">실습</a></td><td class="module-license"><span class="badge badge-license badge-license-' + lc + '">' + escapeHtml(m.license || 'Free') + '</span></td><td class="module-time"><span class="badge badge-time">' + m.time + '분</span></td><td class="module-link"><a href="#" class="badge badge-dash track-session-link" data-session-id="' + m.sessionId + '">이동</a></td></tr>'; }
    pageTrack.innerHTML = '<div class="track-page-inner"><div class="track-header"><p class="track-result" style="margin-top:0">' + escapeHtml(c.description) + '</p><div class="track-meta"><span class="track-meta-item">' + c.icon + ' ' + escapeHtml(c.subtitle) + '</span><span class="track-meta-item">📘 ' + c.modules.length + '개 실습</span></div></div><div class="curriculum-table-wrapper"><table class="curriculum-table"><thead><tr><th>#</th><th>모듈</th><th>배우는 것</th><th>Skill</th><th>라이센스</th><th>예상 시간</th><th>세션 대시보드</th></tr></thead><tbody>' + mh + '</tbody></table></div></div>';
    pageTrack.querySelectorAll('.track-session-link').forEach(function(link) { link.addEventListener('click', function(e) { e.preventDefault(); selectSession(link.dataset.sessionId); }); });
  }
  function renderAllSkillsPage() {
    var rows = '', num = 0, keys = Object.keys(CATEGORIES);
    for (var ti = 0; ti < keys.length; ti++) { var catKey = keys[ti]; var cat = CATEGORIES[catKey]; for (var mi = 0; mi < cat.modules.length; mi++) { var m = cat.modules[mi]; num++; var lc = (m.license || 'Free').replace('+', 'plus').replace(' ', '-').toLowerCase(); var theoryBtn = theoryPages[m.repo] ? ' <a href="learn/' + m.repo + '.html" target="_blank" rel="noopener" class="badge badge-theory skill-theory-link">이론</a>' : ''; rows += '<tr><td>' + num + '</td><td><a href="#" class="all-skills-cat-link" data-page="' + catKey + '"><span class="badge-track">' + escapeHtml(cat.title) + '</span></a></td><td>' + escapeHtml(m.title) + '</td><td>' + escapeHtml(m.skill) + theoryBtn + ' <a href="https://github.com/skills-kr/' + m.repo + '" target="_blank" rel="noopener" class="badge badge-ready skill-lab-link">실습</a></td><td><span class="badge badge-license badge-license-' + lc + '">' + escapeHtml(m.license || 'Free') + '</span></td><td><span class="badge badge-time">' + m.time + '분</span></td><td><a href="#" class="badge badge-dash all-skills-link" data-session-id="' + m.sessionId + '">이동</a></td></tr>'; } }
    pageAllSkills.innerHTML = '<div class="all-skills-page-inner"><p class="all-skills-desc">모든 카테고리의 GitHub Skills 실습을 한눈에 확인하세요.</p><div class="curriculum-table-wrapper"><table class="curriculum-table all-skills-table"><thead><tr><th>#</th><th>카테고리</th><th>모듈</th><th>Skill</th><th>라이센스</th><th>예상 시간</th><th>세션 대시보드</th></tr></thead><tbody>' + rows + '</tbody></table></div></div>';
    pageAllSkills.querySelectorAll('.all-skills-link').forEach(function(link) { link.addEventListener('click', function(e) { e.preventDefault(); selectSession(link.dataset.sessionId); }); });
    pageAllSkills.querySelectorAll('.all-skills-cat-link').forEach(function(link) { link.addEventListener('click', function(e) { e.preventDefault(); navigateTo(link.dataset.page); }); });
  }

  // SIDEBAR
  var sidebar = document.getElementById('sidebar');
  var sidebarToggle = document.getElementById('sidebar-toggle');
  var sidebarOverlay = document.getElementById('sidebar-overlay');
  var mobileMenuBtn = document.getElementById('mobile-menu-btn');
  var mainWrapper = document.getElementById('main-wrapper');
  function isMobile() { return window.matchMedia('(max-width: 768px)').matches; }
  function closeMobileSidebar() { sidebar.classList.remove('mobile-open'); sidebarOverlay.classList.remove('active'); }
  sidebarToggle.addEventListener('click', function() { if (isMobile()) { sidebar.classList.toggle('mobile-open'); sidebarOverlay.classList.toggle('active'); } else { sidebar.classList.toggle('collapsed'); mainWrapper.classList.toggle('sidebar-collapsed'); } });
  mobileMenuBtn.addEventListener('click', function() { sidebar.classList.toggle('mobile-open'); sidebarOverlay.classList.toggle('active'); });
  sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // THEME TOGGLE
  var themeToggleBtn = document.getElementById('theme-toggle');
  function updateHeroImage(light) {
    var img = document.getElementById('dash-hero-image');
    if (img) img.src = light ? 'images/workshop-hero-light.png' : 'images/workshop-hero-dark.png';
  }
  function applyTheme(light) {
    if (light) { document.body.classList.add('light-theme'); themeToggleBtn.textContent = '☀️'; }
    else { document.body.classList.remove('light-theme'); themeToggleBtn.textContent = '🌙'; }
    updateHeroImage(light);
  }
  var savedTheme = localStorage.getItem('theme');
  if (savedTheme === 'light') applyTheme(true);
  themeToggleBtn.addEventListener('click', function() {
    var isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
    themeToggleBtn.textContent = isLight ? '☀️' : '🌙';
    updateHeroImage(isLight);
  });
})();
