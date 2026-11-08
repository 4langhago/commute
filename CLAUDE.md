# Commute (출퇴근 알리미)
출퇴근 경로·소요 시간을 지도에서 비교하는 React/Vite 앱 + Flask 프록시. Repo `4langhago/commute`.

## 상태
- **Live (소규모)** — 프론트는 Netlify / GitHub Pages 정적 배포 (`netlify.toml`, 브랜치 main).
- 주의: rewrite 작업으로 실제 경로 탐색이 제거되어, 이동 시간은 **직선거리(haversine) 기반 추정치**다 (`src/store/useStore.js`).
- 2026-11-08 출퇴근 알리미: API 키 없이 **Google Maps 길찾기 딥링크**(`src/utils/googleMaps.js`)로 실시간 시간을 확인한다.
  - 집·회사·요일·출근/퇴근 시각 설정(`CommutePanel.jsx`) → 알림(`utils/notificationScheduler.js`) 탭 → 구글맵.
  - 알림 경로: ① 앱 열림 중 30초 체크 ② 시각 후 60분 내 앱 열면 캐치업 ③ 설치 PWA 의 Periodic Background Sync(`public/sw-notify.js`, 정시 보장 X) ④ Google 캘린더 반복 일정/.ics(`utils/calendar.js`) — 앱이 꺼져도 확실한 건 ④뿐.
  - 사용자가 구글맵에서 본 분을 기록(`LogPrompt.jsx`) → 알림에 '내 평균' 표시. 기록 없으면 직선거리 추정치로 표기.
  - 앱·SW 는 Cache Storage `commute-alert-v1` 의 `/__commute/config.json`, `/__commute/sent.json` 으로 설정과 발송 기록을 공유(중복 방지).
  - zustand persist v2 (v1 `notificationSchedule` → `commute` 마이그레이션).

## 구조
- `src/` React 18 + Tailwind + Leaflet (App.jsx, components, store, utils), `public/`, `index.html`, `vite.config.js`
- `proxy-app/` Flask 프록시 (`server.py`: /api/geocode, /api/places, /api/directions), Procfile, render.yaml
- `dist/` 빌드 산출물

## 실행·테스트
- 프론트: `npm install` → `npm run dev` / `npm run build` / `npm run preview` (테스트 스크립트 없음)
- 프록시: `cd proxy-app && python -m venv .venv`, 활성화 후 `pip install -r requirements.txt` → `python server.py`
- 프록시 의존성: Flask, requests, python-dotenv, gunicorn

## 환경변수
프록시 `.env` (값은 읽거나 커밋 금지): `GOOGLE_SERVER_KEY`, `GOOGLE_BROWSER_KEY`, `PORT`

## 포트
- 프록시 기본 `PORT=8000` — realestate FastAPI 와 충돌하므로 동시 실행 시 `PORT=8001`.
- Vite 개발 서버 기본 5173.

## 안전 규칙
- Google 서버 키는 백엔드에만. 브라우저 키는 HTTP 리퍼러 제한 필수. 키·할당량 상한 노출 금지.
- 직선거리 추정치임을 UI 문구에 유지 (실제 경로 시간처럼 오해 금지). 실시간 시간은 구글맵 링크로만 안내.
- 구글맵·캘린더는 URL 링크만 사용 — Directions/Distance Matrix 등 과금 API 를 프론트에서 호출하지 않는다.
- 프록시 호출은 과금 대상이므로 반복 호출·폴링 추가 시 주의.

## 연동 도구
- `devops-infra-ops` Netlify·Render 배포·키 점검
- OMC `executor`, `designer`, `code-reviewer`, `security-reviewer`
