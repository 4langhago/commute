# Commute (출퇴근 알리미)
출퇴근 경로·소요 시간을 지도에서 비교하는 React/Vite 앱. Repo `4langhago/commute`.
Google Maps Flask 프록시는 별도 저장소 `4langhago/commute-proxy` 다 (이 저장소에는 없고, 현재 앱은 프록시를 호출하지 않는다).

## 상태
- **Live (소규모)** — 프론트는 Netlify / GitHub Pages 정적 배포 (`netlify.toml`, 브랜치 main).
- 경로·시간은 OSRM 실경로(`src/utils/routing.js`): 자동차 `router.project-osrm.org`, 자전거·도보 `routing.openstreetmap.de`(routed-bike/foot). 대중교통은 OSRM 미지원이라 자동차 도로거리 ÷ 평균속도 **추정**. 조회 실패 시 직선거리(haversine) 추정으로 폴백하고 결과의 `source`(road / road-estimate / straight)로 구분한다 (2026-10-26 복원).

## 구조
- `src/` React 18 + Tailwind + Leaflet (App.jsx, components, store, utils), `public/`, `index.html`, `vite.config.js`
- `dist/` 빌드 산출물 (gitignore, 로컬 빌드 시 생성)
- 주소 검색은 OpenStreetMap Nominatim(`src/utils/geocode.js`), 지도 타일은 OSM, 경로는 공개 OSRM — 모두 키 불필요

## 실행·테스트
- 프론트: `npm install` → `npm run dev` / `npm run build` / `npm run preview`
- 테스트: `npm test` (Node 내장 테스트 러너, `src/utils/*.test.js`, 네트워크 없이 OSRM 응답을 흉내 냄)
- 프록시는 `commute-proxy` 저장소에서 실행한다 (그쪽 README·`.env.example` 참고).

## 환경변수
이 저장소는 없음. 프록시(`commute-proxy`)의 `.env`: `GOOGLE_SERVER_KEY`, `GOOGLE_BROWSER_KEY`, `PORT` (값은 읽거나 커밋 금지)

## 포트
- (`commute-proxy`) 프록시 기본 `PORT=8000` — realestate FastAPI 와 충돌하므로 동시 실행 시 `PORT=8001`.
- Vite 개발 서버 기본 5173.

## 안전 규칙
- Google 서버 키는 백엔드에만. 브라우저 키는 HTTP 리퍼러 제한 필수. 키·할당량 상한 노출 금지.
- 실경로와 추정을 UI 에서 구분 유지: 결과 라벨(`sourceLabel`)·하단 안내·지도 선 모양(직선은 흐린 점선). 대중교통·폴백 결과를 실측처럼 표시하지 않는다.
- 공개 OSRM·Nominatim 서버는 대량 호출용이 아니다. 사용자 '경로 검색'·하루 1회 알림 시점에만 호출하고 폴링을 넣지 않는다.
- 프록시 호출은 과금 대상이므로 반복 호출·폴링 추가 시 주의.

## 연동 도구
- `devops-infra-ops` Netlify·Render 배포·키 점검
- OMC `executor`, `designer`, `code-reviewer`, `security-reviewer`
