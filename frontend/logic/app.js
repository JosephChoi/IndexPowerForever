// Vue 3 SPA 진입점 — 라우터 초기화 + $api 글로벌 플러그인
const { createApp, defineComponent, ref } = Vue;
const { createRouter, createWebHistory } = VueRouter;

// API Base URL — 운영/로컬 wrangler dev는 same-origin(상대경로).
// 프론트를 별도 정적 서버(8080)로 띄운 경우에만 백엔드(8787)로 분기.
const isLocalHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const API_BASE = (isLocalHost && window.location.port === '8080') ? 'http://localhost:8787' : '';

// $api 플러그인 — JWT 없는 단순 fetch wrapper
const apiPlugin = {
  install(app) {
    const request = async (method, path, body) => {
      const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
      const options = {
        method,
        headers: { 'Content-Type': 'application/json' },
      };
      if (body) options.body = JSON.stringify(body);
      const res = await fetch(url, options);
      const json = await res.json();
      if (!res.ok) {
        const err = new Error(json.message || '요청 실패');
        err.status = res.status;
        throw err;
      }
      return json.data !== undefined ? json.data : json;
    };

    app.config.globalProperties.$api = {
      get: (path) => request('GET', path),
      post: (path, body) => request('POST', path, body),
      put: (path, body) => request('PUT', path, body),
      delete: (path) => request('DELETE', path),
    };
  },
};

// 뷰 컴포넌트 정의 — views/*.html + logic/*.js 1:1 매칭
const { defineAsyncComponent } = Vue;

const makeView = (name) => {
  return defineAsyncComponent({
    loader: async () => {
      const logicKey = name.replace(/-/g, '_');

      // 로직 JS 먼저 로드
      if (!window[`__logic_loaded_${name}`]) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = `/logic/${name}.js`;
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        window[`__logic_loaded_${name}`] = true;
      }

      // 뷰 HTML 로드
      const res = await fetch(`/views/${name}.html`);
      const template = await res.text();

      const mixin = window[`__view_${logicKey}`] || {};
      return defineComponent({ name: `View_${name}`, mixins: [mixin], template });
    },
    loadingComponent: {
      template: `<div class="loading-context" style="min-height:60vh"><i class="bi bi-arrow-repeat loading-icon"></i><div class="loading-msg">페이지를 준비하는 중<span class="loading-dots"></span></div></div>`,
    },
  });
};

// 라우터 설정
const routes = [
  { path: '/',               component: makeView('home') },
  { path: '/etf/:ticker',    component: makeView('etf-detail') },
  { path: '/ranking',        component: makeView('ranking') },
  { path: '/timing',         component: makeView('timing') },
  { path: '/fee-simulator',  component: makeView('fee-simulator') },
  { path: '/retirement',     component: makeView('retirement') },
  { path: '/withdrawal',     component: makeView('withdrawal') },
  { path: '/insights',       component: makeView('insights') },
  { path: '/book',           component: makeView('book') },
  { path: '/manual',         component: makeView('manual') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

// ── SPA 내부 이동 시 SEO 메타 갱신 ──
// 라우트별 메타 원본은 Worker(SeoService)가 <script id="seo-map">으로 내려준다.
const SEO_ORIGIN = 'https://indexwins.com';

const readSeoMap = () => {
  const el = document.getElementById('seo-map');
  if (!el) return {};
  try {
    return JSON.parse(el.textContent);
  } catch (e) {
    return {};
  }
};

const seoMap = readSeoMap();

const setMeta = (selector, attr, value) => {
  const el = document.head.querySelector(selector);
  if (el) el.setAttribute(attr, value);
};

const applySeo = (path) => {
  const etfMatch = path.match(/^\/etf\/([A-Za-z0-9.^-]{1,10})\/?$/);
  let title, description, canonical;

  if (etfMatch) {
    const ticker = etfMatch[1].toUpperCase();
    title = `${ticker} vs S&P 500·나스닥 100 성과 비교`;
    description = `${ticker}가 S&P 500·나스닥 100 지수를 이겼는지 장기 데이터로 비교합니다. 수익률·CAGR·MDD 확인.`;
    canonical = `${SEO_ORIGIN}/etf/${ticker}`;
  } else {
    const meta = seoMap[path] || seoMap['/'];
    if (!meta) return;
    title = meta.title;
    description = meta.description;
    canonical = `${SEO_ORIGIN}${path === '/' ? '/' : path}`;
  }

  document.title = title;
  setMeta('meta[name="description"]', 'content', description);
  setMeta('meta[property="og:title"]', 'content', title);
  setMeta('meta[property="og:description"]', 'content', description);
  setMeta('meta[property="og:url"]', 'content', canonical);
  setMeta('meta[name="twitter:title"]', 'content', title);
  setMeta('meta[name="twitter:description"]', 'content', description);
  setMeta('link[rel="canonical"]', 'href', canonical);
};

// ── GA4 page_view 전송 (SPA) ──
// index.html에서 send_page_view:false로 설정했으므로 라우트 변경 시 직접 보낸다.
// applySeo가 document.title을 갱신한 뒤에 호출해야 제목이 정확히 기록된다.
const sendPageView = (path) => {
  if (!window.__gaEnabled || typeof window.gtag !== 'function') return;
  window.gtag('event', 'page_view', {
    page_title: document.title,
    page_path: path,
    page_location: window.location.href,
  });
};

router.afterEach((to) => {
  applySeo(to.path);
  sendPageView(to.fullPath);
});

// navigateTo + getParam 글로벌 mixin
const globalMixin = {
  methods: {
    navigateTo(path, query = {}) {
      router.push({ path, query });
    },
    getParam(key) {
      return router.currentRoute.value.params[key]
        || router.currentRoute.value.query[key]
        || null;
    },
  },
};

// 네비게이션 로드
const loadNavbar = async () => {
  const res = await fetch('/components/navbar.html');
  const html = await res.text();
  const container = document.getElementById('navbar-container');
  if (container) container.innerHTML = html;

  // 현재 경로에 active 클래스 적용 (드롭다운 하위 항목 포함)
  const simulatorPaths = ['/fee-simulator', '/timing', '/retirement'];
  router.afterEach((to) => {
    document.querySelectorAll('.nav-link').forEach(el => {
      const href = el.getAttribute('href');
      if (href === '#') {
        el.classList.toggle('active', simulatorPaths.includes(to.path));
      } else {
        el.classList.toggle('active', href === to.path);
      }
    });
    document.querySelectorAll('.dropdown-item').forEach(el => {
      el.classList.toggle('active', el.getAttribute('href') === to.path);
    });
  });

  initNavbarSearch();
};

// 푸터 로드
const loadFooter = async () => {
  const res = await fetch('/components/footer.html');
  const html = await res.text();
  const container = document.getElementById('footer-container');
  if (!container) return;
  container.innerHTML = html;

  // 스팸 봇의 주소 수집을 막기 위해 메일 주소는 표시하지 않고 조합해서 링크만 건다
  const mailAddress = ['contact', 'soopasset.com'].join('@');
  const contact = document.getElementById('footerContactLink');
  if (contact) contact.href = 'mailto:' + mailAddress;
  const contactMail = document.getElementById('footerContactMail');
  if (contactMail) contactMail.textContent = mailAddress;
};

// ── 글로벌 ETF 검색 모달 (Vue 외부 — vanilla) ──
const initNavbarSearch = () => {
  const btn = document.getElementById('navbarSearchBtn');
  const modal = document.getElementById('navbarSearchModal');
  const input = document.getElementById('navbarSearchInput');
  const results = document.getElementById('navbarSearchResults');
  if (!btn || !modal || !input || !results) return;

  let debounceTimer = null;
  let currentResults = [];

  const open = () => {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => input.focus(), 30);
  };
  const close = () => {
    modal.hidden = true;
    document.body.style.overflow = '';
    input.value = '';
    currentResults = [];
    renderEmpty();
    if (debounceTimer) { clearTimeout(debounceTimer); debounceTimer = null; }
  };

  const escapeHtml = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const renderEmpty = () => {
    results.innerHTML = '<div class="navbar-search-modal-empty"><i class="bi bi-search me-2"></i>티커 또는 ETF명을 입력하세요</div>';
  };
  const renderLoading = () => {
    results.innerHTML = '<div class="navbar-search-modal-empty"><span class="spinner-border spinner-border-sm me-2"></span>검색 중...</div>';
  };
  const renderNoResults = () => {
    results.innerHTML = '<div class="navbar-search-modal-empty"><i class="bi bi-exclamation-circle me-2"></i>검색 결과가 없습니다</div>';
  };
  const renderResults = (list) => {
    results.innerHTML = list.map(r => `
      <button type="button" class="navbar-search-modal-item" data-ticker="${escapeHtml(r.ticker)}">
        <div class="navbar-search-modal-item-ticker">${escapeHtml(r.ticker)}</div>
        <div class="navbar-search-modal-item-name">${escapeHtml(r.name || '')}</div>
      </button>
    `).join('');
  };

  const goToTicker = (ticker) => {
    if (!ticker) return;
    close();
    router.push(`/etf/${encodeURIComponent(ticker)}`);
  };

  // 검색 실행 (debounce 300ms)
  input.addEventListener('input', () => {
    const q = input.value.trim();
    if (debounceTimer) clearTimeout(debounceTimer);
    if (!q) {
      currentResults = [];
      renderEmpty();
      return;
    }
    renderLoading();
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`${API_BASE}/api/etf/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.data || []);
        currentResults = list;
        if (list.length === 0) renderNoResults();
        else renderResults(list);
      } catch (e) {
        currentResults = [];
        renderNoResults();
      }
    }, 300);
  });

  // 엔터: 첫 결과 또는 입력값 그대로 이동
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const ticker = currentResults[0]?.ticker || input.value.trim().toUpperCase();
      goToTicker(ticker);
    } else if (e.key === 'Escape') {
      close();
    }
  });

  // 결과 클릭 (이벤트 위임)
  results.addEventListener('click', (e) => {
    const item = e.target.closest('[data-ticker]');
    if (item) goToTicker(item.dataset.ticker);
  });

  // 모달 닫기 핸들러 (backdrop, X 버튼)
  modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', close));

  // 검색 버튼 클릭
  btn.addEventListener('click', open);

  // ⌘K / Ctrl+K 단축키
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      modal.hidden ? open() : close();
    }
  });
};

// Vue 앱 생성 및 마운트
const app = createApp({ template: '<router-view />' });
app.use(apiPlugin);
app.use(router);
app.mixin(globalMixin);

router.isReady().then(async () => {
  await loadNavbar();
  await loadFooter();
  app.mount('#app');
});
