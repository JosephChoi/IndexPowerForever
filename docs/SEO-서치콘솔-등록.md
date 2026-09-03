# SEO 준비 및 서치콘솔 등록 안내

> 최종 정리: 2026-09-03
> 정식(canonical) 도메인: **https://indexwins.com** (apex, www 아님)

---

## 1. 코드에 이미 반영된 것

| 항목 | 위치 | 내용 |
|---|---|---|
| robots.txt | `frontend/robots.txt` | 전체 허용 + `/api/` 차단, 네이버(Yeti)·다음 명시, sitemap 위치 선언 |
| sitemap.xml | `backend/src/index.js` → `SeoService.buildSitemap` | 요청 시 동적 생성. 정적 페이지 9개 + D1 `etf_info`에 등록된 ETF 상세 페이지 |
| 라우트별 메타 | `backend/src/services/SeoService.js` | title·description·canonical·og·twitter를 Worker가 HTML에 주입 |
| SPA 내부 이동 메타 갱신 | `frontend/logic/app.js` | 라우터 `afterEach`에서 동일 메타를 갱신 |
| 구조화 데이터 | `frontend/index.html` | JSON-LD: WebSite(+SearchAction) / Organization(숲파트너스) |
| 도메인 정규화 | `backend/src/index.js` | `www.indexwins.com` → `indexwins.com` 301 리다이렉트 |
| soft 404 방지 | `backend/src/index.js` | 없는 경로는 HTML을 주되 상태코드 404 |

### 왜 Worker에서 메타를 주입하나

이 사이트는 Vue SPA라 JS 실행 전에는 `<title>`과 본문이 비어 있습니다.
구글은 JS를 실행해 주지만 **네이버 Yeti는 사실상 실행하지 않습니다.**
그래서 Worker 단계에서 라우트별 메타를 HTML에 직접 넣습니다. 사람이 보는 HTML과 크롤러가 보는 HTML이 동일하므로 클로킹이 아닙니다.

---

## 2. 배포 후 Joseph이 직접 해야 할 일

### 2-1. 구글 서치콘솔

1. https://search.google.com/search-console 접속
2. 속성 추가 → **도메인** 방식 권장 (`indexwins.com`)
   - Cloudflare DNS에 TXT 레코드 추가로 소유확인 (www·서브도메인까지 한 번에 커버)
   - DNS 방식이 번거로우면 **URL 접두어** 방식(`https://indexwins.com`) → HTML 태그 선택
3. HTML 태그 방식을 골랐다면, 발급된 값을 `frontend/index.html`의 아래 주석을 풀어 넣습니다.
   ```html
   <meta name="google-site-verification" content="여기에_발급값" />
   ```
4. 소유확인 후 **Sitemaps** 메뉴에서 `sitemap.xml` 제출
5. **URL 검사** 도구로 `https://indexwins.com/` 색인 요청

### 2-2. 네이버 서치어드바이저

1. https://searchadvisor.naver.com 접속 → 웹마스터도구
2. 사이트 등록: `https://indexwins.com/`
3. 소유확인 → **HTML 태그** 선택 후, 발급값을 `frontend/index.html`의 아래 주석을 풀어 넣습니다.
   ```html
   <meta name="naver-site-verification" content="여기에_발급값" />
   ```
   (HTML 파일 업로드 방식을 고르면 받은 파일을 `frontend/` 최상단에 두면 됩니다)
4. 요청 → **사이트맵 제출**에 `https://indexwins.com/sitemap.xml`
5. 요청 → **웹페이지 수집**으로 주요 페이지 수동 수집 요청
6. 검증 → **로봇스룰 검증**으로 robots.txt 정상 인식 확인

> ⚠️ 소유확인 meta 태그를 넣은 뒤에는 **커밋+푸시로 배포**해야 검증이 통과합니다.
> (이 프로젝트는 수동 배포 금지 — Workers Builds가 `main` push를 감지해 자동 배포)

### 2-3. 다음(카카오)

https://register.search.daum.net/index.daum 에서 사이트 등록 (선택)

---

## 3. 등록 후 확인 체크리스트

- [ ] `https://indexwins.com/robots.txt` 가 정상 출력되는가
- [ ] `https://indexwins.com/sitemap.xml` 이 XML로 출력되는가
- [ ] `https://www.indexwins.com/` 접속 시 apex로 301 리다이렉트되는가
- [ ] 각 페이지 소스보기에서 `<title>`이 페이지별로 다른가
- [ ] 없는 주소(`/no-such-page`)가 404로 응답하는가
- [ ] 카카오톡·슬랙에 링크를 붙였을 때 og 이미지가 뜨는가

---

## 4. 유지보수 시 주의

- 페이지를 새로 추가하면 **`SeoService.js`의 `PAGE_SEO`에 항목을 추가**해야 합니다.
  이 맵 하나가 sitemap 생성 + 메타 주입 + SPA 메타 갱신의 공통 소스입니다.
- 동시에 `backend/wrangler.toml`의 `[assets] run_worker_first` 배열에도 해당 경로를 추가해야
  Worker가 그 경로를 처리하며 메타를 주입합니다. (누락 시 메타 없이 정적 index.html이 나갑니다)
- ETF 상세(`/etf/:ticker`)는 티커에서 자동 생성되므로 별도 등록이 필요 없습니다.
