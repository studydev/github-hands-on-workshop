# Learn 페이지 제작 가이드

> `frontend/learn/introduction-to-github.html`을 만들면서 정립된 규칙.
> 새 이론 페이지를 만들 때 이 문서를 참고하여 **일관성 있는 디자인과 흐름**을 유지한다.

---

## 1. 파일 명명 및 구조

### 파일 이름
```
frontend/learn/{skills-repo-name}.html
```
예: `learn/introduction-to-github.html`, `learn/communicate-using-markdown.html`

모든 이론 페이지는 `frontend/learn/` 폴더 안에 위치한다.

### 공유 CSS
| 파일 | 역할 |
|------|------|
| `presentation.css` | 공통 (nav bar, step 기본 opacity/visibility, 진행 바) |
| `learn.css` | 이론 전용 (슬라이드 카드, 그리드, Git Flow 다이어그램 등) |

새 learn HTML은 두 CSS만 link하면 된다. **learn.css를 수정하지 않고** 재사용한다.

> `learn/` 폴더 안에서 CSS를 참조하므로 상대 경로 `../`를 사용한다.

### HTML 기본 뼈대
```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=1024">
  <title>이론 — {모듈 한글 제목}</title>
  <link rel="icon" href="data:image/svg+xml,...">
  <link rel="stylesheet" href="../presentation.css">
  <link rel="stylesheet" href="../learn.css">
</head>
<body class="impress-not-supported">
  <!-- fallback, nav, #impress, hint, progress, script -->
</body>
</html>
```

---

## 2. 슬라이드 구성 (필수 슬라이드 순서)

모든 이론 페이지는 아래 **11 + 1(overview)** 슬라이드 구조를 따른다.

| # | id | 이름 | 내용 |
|---|-----|------|------|
| 1 | `t-intro` | 소개 | 모듈 제목, 영문 스킬명, 설명, 메타(시간/난이도/단계 수) |
| 2 | `t-learn` | 학습 목표 | 이 실습에서 배울 핵심 개념 카드 (2×2 그리드) |
| 3 | `t-flow` | 실습 흐름 | 실습 단계별 스크린샷 (가로 카드 + 화살표) |
| 4 | `t-{topic}` | 플랫폼/배경 개념 | 해당 모듈의 배경 설명 (+ YouTube 영상, 선택 사항) |
| 5~N | `t-{concept}` | 핵심 개념들 | 모듈별 핵심 개념 (보통 3~5개) |
| N+1 | `t-actions` | Actions 설명 | GitHub Actions 동작 원리 + Mona 이미지 |
| N+2 | `t-summary` | 핵심 정리 | 배운 개념 요약 + 실습 링크 + Self Study Map 복귀 링크 |
| last | `t-ov-auto` | 전체 보기 | 빈 overview 스텝 (화살표로 순서에 포함) |

### 슬라이드 id 규칙
- 접두사 `t-` (theory 약어, CSS 클래스와 일치)
- 소문자 영문, 단어 구분은 `-`
- 예: `t-intro`, `t-branch`, `t-pr`, `t-ov-auto`

---

## 3. 3D 배치 (impress.js 좌표 시스템)

### Viewport
```html
<div id="impress" data-transition-duration="700" data-width="1050" data-height="700">
```

### 지그재그 레이아웃
슬라이드를 **3열 × N행**으로 배치하되, 행마다 좌→우 / 우→좌 방향을 교차한다.

```
Row 1 (y=0)    :  좌(x=0)  → 중(x=1100) → 우(x=2200)     z=0 근처
Row 2 (y=420)  :  우(x=2200) → 중(x=1100) → 좌(x=0)      z=-400~-600
Row 3 (y=840)  :  좌(x=0)  → 중(x=1100) → 우(x=2200)     z=-700~-900
Row 4 (y=1260) :  우(x=2200) → 중(x=1100)                 z=-100~-300
```

### 좌표 규칙
| 축 | 단위 | 설명 |
|----|------|------|
| **x** | 0 / 1100 / 2200 | 3열 고정 간격 (슬라이드 폭 1000px + 100px 간격) |
| **y** | 420 간격 | 행 간격 (슬라이드 높이 대비 적당한 밀집도) |
| **z** | -900 ~ 0 | 깊이. Row 1 가장 앞 → 중간 구간 가장 깊게 → 마지막에 복귀 |
| **scale** | 1 (기본), 1.2 (intro만) | intro만 살짝 크게 |

### 회전 규칙
방향 전환 시 **rotate-y**를 주축으로 사용하고, **rotate-x**, **rotate-z**를 보조로 조합한다.

```
좌→우 방향: rotate-y: +5~12°  (오른쪽으로 살짝 기울임)
우→좌 방향: rotate-y: -5~12° (왼쪽으로 살짝 기울임)
보조 회전:  rotate-x: ±3~5°, rotate-z: ±2° (과하지 않게)
```

> **주의**: rotate 값이 커지면 overview에서 슬라이드가 겹친다. **최대 ±12°** 이내로 유지.

### 좌표 예시 (introduction-to-github)
```
t-intro    : x=0,    y=0,    z=0,    scale=1.2, rotate-z=-2
t-learn    : x=1100, y=0,    z=-100, rotate-z=1
t-flow     : x=2200, y=0,    z=-200, rotate-z=2

t-github   : x=2200, y=420,  z=-500, rotate-y=-10, rotate-x=3
t-repo     : x=1100, y=420,  z=-600, rotate-y=-5,  rotate-x=-3
t-branch   : x=0,    y=420,  z=-400, rotate-y=10,  rotate-z=-2

t-commit   : x=0,    y=840,  z=-800, rotate-y=12,  rotate-x=5
t-pr       : x=1100, y=840,  z=-900, rotate-y=5,   rotate-x=-4
t-merge    : x=2200, y=840,  z=-700, rotate-y=-10, rotate-z=2

t-actions  : x=2200, y=1260, z=-300, rotate-y=-12, rotate-x=-5
t-summary  : x=1100, y=1260, z=-100, rotate-y=-5,  rotate-x=3

t-ov-auto  : x=1100, y=630,  z=0,    scale=6 (자동 계산)
```

---

## 4. 슬라이드 유형별 HTML 패턴

### 4-1. 소개 슬라이드 (`t-intro`)
```html
<div id="t-intro" class="step theory-slide" data-x="0" data-y="0" data-z="0" data-scale="1.2">
  <div class="theory-header">
    <span class="theory-badge">{뱃지 텍스트} · 모듈 #{번호}</span>
  </div>
  <h1>{모듈 한글 제목}</h1>
  <p class="theory-skill">{영문 스킬명}</p>
  <p class="theory-desc">{설명 (2~3줄)}</p>
  <div class="theory-meta">
    <span class="t-meta-item">{시간}</span>
    <span class="t-meta-item">{난이도}</span>
    <span class="t-meta-item">{단계 수}</span>
  </div>
</div>
```

### 4-2. 학습 목표 (`t-learn`) — 2×2 카드 그리드
```html
<div id="t-learn" class="step theory-slide" ...>
  <h2>이 실습에서 배우는 것</h2>
  <div class="theory-grid">
    <div class="theory-card">
      <img class="tc-icon" src="{octicon-url}" alt="{alt}">
      <strong>{개념 이름}</strong>
      <p>{한 줄 설명}</p>
    </div>
    <!-- 반복 -->
  </div>
</div>
```

### 4-3. 실습 흐름 (`t-flow`) — 가로 카드 + 스크린샷
```html
<div id="t-flow" class="step theory-slide" ...>
  <h2>실습 흐름 요약</h2>
  <div class="flow-steps-hz">
    <div class="flow-step-card">
      <div class="flow-step-header">
        <span class="flow-num">{번호}</span>
        <div class="flow-content">
          <strong>{단계 이름}</strong>
          <p><code>{명령/파일}</code></p>
        </div>
      </div>
      <img src="{스크린샷 URL}" alt="{alt}" loading="lazy">
    </div>
    <div class="flow-hz-arrow">→</div>
    <!-- 반복 -->
  </div>
  <p class="flow-note">{부가 설명}</p>
</div>
```

### 4-4. 개념 슬라이드 (저장소/브랜치/커밋/PR/병합)
```html
<div id="t-{concept}" class="step theory-slide" ...>
  <h2><img class="th-icon" src="{octicon-url}" alt="{alt}"> {한글명} ({영문명})</h2>
  <p class="theory-subtitle">{한 줄 부제}</p>
  <div class="theory-two-col">
    <div class="theory-col-text">
      <p>{핵심 설명}</p>
      <div class="git-flow">
        <!-- Git Flow 다이어그램 (아래 섹션 참조) -->
      </div>
      <h3>{소제목}</h3>
      <ul class="theory-list">
        <li>...</li>
      </ul>
      <div class="theory-highlight">
        실습에서는 ...
      </div>
    </div>
  </div>
</div>
```

### 4-5. YouTube가 포함된 슬라이드 (선택 사항)

> YouTube 영상은 **적절한 영상이 있을 때만** 포함한다. 없으면 `theory-slide-tall` 없이 일반 슬라이드로 만든다.
```html
<div id="t-{topic}" class="step theory-slide theory-slide-tall" ...>
  <h2>...</h2>
  <div class="theory-two-col">
    <div class="theory-col-text">...</div>
  </div>
  <div class="theory-video-wrap">
    <iframe src="https://www.youtube.com/embed/{VIDEO_ID}?cc_load_policy=1&cc_lang_pref=ko&hl=ko"
      title="{제목}" frameborder="0" allow="accelerometer; autoplay; clipboard-write;
      encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  </div>
</div>
```
- `theory-slide-tall` 클래스 추가 (YouTube 포함 시만)
- `cc_load_policy=1&cc_lang_pref=ko&hl=ko`: 한국어 자막 자동 활성화

### 4-6. Actions 슬라이드 — 우측 이미지
```html
<div class="theory-two-col">
  <div class="theory-col-text">...</div>
  <div class="theory-col-img">
    <img src="https://octodex.github.com/images/collabocats.jpg" alt="Mona"
      style="max-width:200px;border-radius:12px;">
  </div>
</div>
```

### 4-7. 핵심 정리 (`t-summary`)
```html
<div class="theory-summary">
  <div class="summary-item">
    <img class="tc-icon" src="{octicon-url}" alt="{alt}">
    <div><strong>{개념}</strong><p>{한 줄 설명}</p></div>
  </div>
  <!-- 반복 -->
</div>
<div class="summary-cta">
  <a class="mod-link" href="https://github.com/skills-kr/{repo}" target="_blank">실습 시작하기 →</a>
  <a class="mod-link mod-link-theory" href="presentation.html#mod-{module-id}">← Self Study Map</a>
</div>
```

---

## 5. 코드 블록 (YAML / Shell / 프로그래밍 코드)

YAML 워크플로우, 셸 명령어, 프로그래밍 코드 등 **여러 줄의 코드**는 반드시 `<pre class="theory-code">` 블록으로 감싼다.

### HTML 패턴
```html
<pre class="theory-code"><code><span class="code-key">name:</span> Python Package
<span class="code-key">on:</span>
  <span class="code-key">pull_request:</span>
    <span class="code-key">branches:</span> ["main"]
<span class="code-key">jobs:</span>
  <span class="code-key">build:</span>
    <span class="code-key">runs-on:</span> ubuntu-latest
    <span class="code-key">steps:</span>
      - <span class="code-key">uses:</span> actions/checkout@v4
      - <span class="code-key">run:</span> pytest --verbose</code></pre>
```

### 구문 강조 클래스
| 클래스 | 색상 | 용도 |
|--------|------|------|
| `.code-key` | `#79c0ff` (파랑) | YAML 키, 언어 키워드 (`def`, `assert`, `import`) |
| `.code-comment` | `#8b949e` (회색) | 주석 (`# ...`, `// ...`) |

### 규칙
- 한 줄짜리 명령은 문장 안에서 `<code>` 인라인 태그로 충분
- **2줄 이상**의 코드는 반드시 `<pre class="theory-code"><code>` 블록 사용
- `<div class="theory-code-block">` 패턴은 **레거시** — 새 페이지에서는 `<pre>` 사용

---

## 6. Git Flow 다이어그램 (일관된 진행 표현)

브랜치→커밋→PR→병합 슬라이드에 **동일한 다이어그램을 점진적으로 업데이트**하여 표시한다.

### 색상 체계
| 클래스 | 색상 | 용도 |
|--------|------|------|
| `.gf-main` | `#7ee787` (초록) | main 브랜치 |
| `.gf-branch` | `#58a6ff` (파랑) | 작업 브랜치 |
| `.gf-commit` | `#f0883e` (주황) | 커밋 |
| `.gf-pr` | `#d2a8ff` (보라) | 풀 리퀘스트 |
| `.gf-merge` | `#f778ba` (분홍) | 병합 |
| `.gf-dim` | `#484f58` (회색) | 비활성/연결선 |

### 보조 클래스
| 클래스 | 효과 |
|--------|------|
| `.gf-active` | `font-weight: bold` — 현재 단계 강조 |
| `.gf-highlight` | 배경 하이라이트 |

### 진행 패턴
각 슬라이드에서 **현재 단계만 활성 색상 + 볼드 + 하이라이트**, 이전 단계는 색상 유지, 이후 단계는 미표시.

**브랜치 슬라이드:**
```
main ─────────── 안정 버전
  └── my-first-branch ─── 내 작업 공간 ← 여기!
       ^^^ 파랑+볼드+하이라이트
```

**커밋 슬라이드:**
```
main ─────────── 안정 버전
  └── my-first-branch ── ● Add PROFILE.md ← 커밋!
       ^^^ 파랑(유지)        ^^^ 주황+볼드+하이라이트
```

**PR 슬라이드:**
```
main ──────────────────── 안정 버전
  └── my-first-branch ── ● commit
           ↑ Pull Request ← 합쳐주세요!
           ^^^ 보라+볼드+하이라이트
```

**병합 슬라이드:**
```
main ──────── ● merge commit ──▶ main (업데이트!)
  └── my-first-branch ── ● commit ──┘ ← 병합 완료!
              ^^^ 분홍+볼드+하이라이트
```

---

## 7. 아이콘 사용 규칙

### GitHub Octicons (공식 SVG)
```
https://raw.githubusercontent.com/primer/octicons/main/icons/{name}-24.svg
```

| 아이콘 | 파일명 | 용도 |
|--------|--------|------|
| GitHub 로고 | `mark-github-24.svg` | GitHub 개요 슬라이드 |
| 저장소 | `repo-24.svg` | Repository 관련 |
| 브랜치 | `git-branch-24.svg` | Branch 관련 |
| 커밋 | `git-commit-24.svg` | Commit 관련 |
| PR | `git-pull-request-24.svg` | Pull Request 관련 |
| 병합 | `git-merge-24.svg` | Merge 관련 |
| 워크플로우 | `workflow-24.svg` | Actions 관련 |
| 체크리스트 | `checklist-24.svg` | Summary 관련 |

### 아이콘 클래스
| 클래스 | 크기 | 위치 |
|--------|------|------|
| `.th-icon` | 28×28px | `<h2>` 제목 옆 |
| `.tc-icon` | 32×32px | 카드/목록 내 |

두 클래스 모두 `filter: invert(1)`으로 다크 테마에서 흰색으로 표시.

---

## 8. 네비게이션 바

### 구조
```html
<nav id="pres-nav">
  <a href="presentation.html" class="pres-nav-link" title="Self Study Map">
    {지도 SVG 아이콘}
  </a>
  <span class="pres-nav-title">이론 · {모듈 한글 제목}</span>
  <div class="pres-nav-cats" id="theory-nav">
    <button class="pres-nav-cat-btn" onclick="impress().goto('t-intro')">{이름}</button>
    <!-- 각 슬라이드마다 버튼 -->
    <button class="pres-nav-cat-btn" id="btn-overview">전체 보기</button>
  </div>
</nav>
```

### 활성 상태
- `impress:stepenter` 이벤트에서 해당 버튼에 `.active` 클래스 토글
- overview 스텝 진입 시 "전체 보기" 버튼 활성화

---

## 9. 전체 보기 (Overview) 기능

### HTML — overview 스텝
마지막 content 슬라이드 **바로 뒤에** 선언 (화살표 키 순서에 포함):
```html
<div id="t-ov-auto" class="step"
  data-x="1100" data-y="{중앙 Y}" data-z="0" data-scale="{자동 계산}"
  data-rotate-x="0" data-rotate-y="0" data-rotate-z="0"
  style="width:1px;height:1px;background:none;border:none;"></div>
```

### JavaScript — 자동 위치 계산
```javascript
function calcOverview() {
  var steps = document.querySelectorAll('.step.theory-slide');
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  steps.forEach(function(s) {
    var x = parseFloat(s.getAttribute('data-x')) || 0;
    var y = parseFloat(s.getAttribute('data-y')) || 0;
    var sc = parseFloat(s.getAttribute('data-scale')) || 1;
    var w = 1000 * sc / 2;
    var h = 800 * sc / 2;
    if (x - w < minX) minX = x - w;
    if (x + w > maxX) maxX = x + w;
    if (y - h < minY) minY = y - h;
    if (y + h > maxY) maxY = y + h;
  });
  var ov = document.getElementById('t-ov-auto');
  ov.setAttribute('data-x', (minX + maxX) / 2);
  ov.setAttribute('data-y', (minY + maxY) / 2);
  ov.setAttribute('data-scale',
    Math.max((maxX - minX) / 1050, (maxY - minY) / 700) * 1.05);
}
```

- `calcOverview()`를 `impress().init()` **전에** 호출
- overview 진입 시 `.impress-overview` 클래스 토글 → 모든 슬라이드 opacity:0.7로 표시

---

## 10. CSS 클래스 요약 (learn.css)

| 클래스 | 용도 |
|--------|------|
| `.theory-slide` | 기본 슬라이드 카드 (1000px, 다크 배경, 둥근 모서리) |
| `.theory-slide-tall` | YouTube 등 긴 콘텐츠용 |
| `.theory-header` | 소개 슬라이드 상단 (뱃지 포함) |
| `.theory-badge` | 주황색 뱃지 |
| `.theory-subtitle` | 파랑색 부제 |
| `.theory-grid` | 2×2 카드 그리드 |
| `.theory-card` | 개별 카드 |
| `.theory-two-col` | 좌우 2열 레이아웃 |
| `.theory-col-text` | 텍스트 컬럼 |
| `.theory-col-img` | 이미지 컬럼 |
| `.theory-list` | 파랑 불릿 리스트 |
| `.theory-highlight` | 왼쪽 파랑 보더 하이라이트 박스 |
| `.theory-code-block` | 코드/명령어 블록 (레거시, 인라인 code 태그) |
| `pre.theory-code` | 코드 블록 (신규 권장, 구문 강조 지원) |
| `.code-key` | 코드 블록 내 키워드 (파랑) |
| `.code-comment` | 코드 블록 내 주석 (회색, 이탤릭) |
| `.theory-video-wrap` | YouTube iframe 컨테이너 |
| `.git-flow` | Git 흐름 다이어그램 컨테이너 |
| `.flow-steps-hz` | 가로 실습 흐름 카드 |
| `.theory-summary` | 정리 항목 목록 |
| `.summary-cta` | 실습 링크 버튼 영역 |

---

## 11. 체크리스트 (새 theory 페이지 생성 시)

### 콘텐츠 준비
- [ ] skills-kr 레포에서 실습 단계 확인 (README.md, .github/steps/)
- [ ] 각 단계별 스크린샷 URL 수집
- [ ] 핵심 개념 목록 정리 (4~6개)
- [ ] 적절한 YouTube 영상 선정 (없으면 생략 가능)

### HTML 작성
- [ ] 파일명: `learn/{repo-name}.html`
- [ ] `t-intro` ~ `t-summary` + `t-ov-auto` 구조
- [ ] 3D 좌표 지그재그 배치 (이 문서의 좌표 규칙 참조)
- [ ] nav bar 버튼 수 = 슬라이드 수 + "전체 보기"
- [ ] Git Flow 다이어그램 진행형 적용
- [ ] Octicons 아이콘 적용
- [ ] summary-cta에 skills-kr 실습 링크 + Self Study Map 복귀 링크

### 연동
- [ ] `presentation.js`의 `theoryPages` 객체에 repo 이름 추가
- [ ] `presentation.js`의 이론 링크가 `learn/{repo}.html`을 가리키는지 확인
- [ ] nav bar "Self Study Map" 버튼에 `../presentation.html#{module-id}` 해시 설정
- [ ] `app.js`의 `theoryPages` 객체에 repo 이름 추가 → 교육 코스 페이지(`#cat_*`)와 전체 실습 목록(`#all-skills`) 테이블의 Skill 열에 **이론** 배지가 실습 배지 앞에 자동 표시됨

### 검증
- [ ] 모든 슬라이드 정상 표시 확인
- [ ] YouTube 클릭 동작 확인 (포함된 경우만)
- [ ] 전체 보기 모드 진입/탈출 확인
- [ ] nav bar 활성 상태 동기화 확인
- [ ] overview에서 슬라이드 겹침 없음 확인
- [ ] 이미지/아이콘 로딩 확인
