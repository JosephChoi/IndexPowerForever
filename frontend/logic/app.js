// Vue 3 SPA 진입점 — 라우터 초기화 + $api 글로벌 플러그인
const { createApp, defineComponent, ref } = Vue;
const { createRouter, createWebHistory } = VueRouter;

// API Base URL — 개발/운영 환경 자동 감지
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:8787'
  : 'https://index-power-forever.sixman-joseph.workers.dev';

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
      template: `<div class="d-flex justify-content-center align-items-center" style="min-height:60vh"><div class="spinner-border text-primary"></div></div>`,
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
  { path: '/insights',       component: makeView('insights') },
  { path: '/book',           component: makeView('book') },
  { path: '/:pathMatch(.*)*', redirect: '/' },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
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

  // 현재 경로에 active 클래스 적용
  router.afterEach((to) => {
    document.querySelectorAll('.nav-link').forEach(el => {
      el.classList.toggle('active', el.getAttribute('href') === to.path);
    });
  });
};

// Vue 앱 생성 및 마운트
const app = createApp({ template: '<router-view />' });
app.use(apiPlugin);
app.use(router);
app.mixin(globalMixin);

router.isReady().then(async () => {
  await loadNavbar();
  app.mount('#app');
});
