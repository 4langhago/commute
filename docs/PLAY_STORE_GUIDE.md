# Commute — Google Play Store 제출 가이드 (PWABuilder)

이 문서는 현재 배포된 Commute PWA를 **Google Play Store**에 등록하기 위한 단계별 가이드입니다. [PWABuilder](https://www.pwabuilder.com/)의 **TWA(Trusted Web Activity)** 방식을 사용합니다. 사용자 눈에는 네이티브 앱이지만 내부는 웹앱을 그대로 실행합니다.

## 사전 준비물 (체크리스트)

- [ ] HTTPS로 배포된 PWA URL (예: `https://<계정>.github.io/commute/`)
- [ ] Lighthouse PWA 점검 통과 (설치 가능 + 오프라인 작동)
- [ ] 개인정보 처리방침 URL (공개된 웹페이지 하나면 충분)
- [ ] Google Play 개발자 계정 ($25, 1회 등록)
- [ ] 앱 아이콘 **512×512 PNG** (이미 `public/pwa-512x512.png`에 있음)
- [ ] 기능 그래픽 **1024×500 PNG** (Play Console에서 요구)
- [ ] 스크린샷 **최소 2장, 최대 8장** (휴대폰 기준 1080×1920 권장)
- [ ] 앱 설명 (짧은 설명 80자, 자세한 설명 4000자)

---

## 1. 사전 점검 — Lighthouse PWA 감사

1. Chrome에서 `https://<배포 URL>/` 접속
2. DevTools → **Lighthouse** 탭 → *Progressive Web App* 체크 → **Analyze page load**
3. 실패 항목이 있으면 수정. 특히 다음 항목이 통과해야 합니다:
   - Installable (`manifest` + `serviceWorker`) ✅ 이미 OK
   - `name`, `short_name`, `icons`, `theme_color`, `start_url` ✅ 이미 OK
   - 오프라인 작동 ✅ 이미 OK

## 2. Play Console 개발자 계정 가입

1. <https://play.google.com/console/signup> 접속
2. Google 계정 로그인 → **개인 / 조직** 선택
3. $25 결제 (신용카드, 1회)
4. 신원 확인 절차(신분증 업로드) 완료 — 1~2일 소요될 수 있음

## 3. 개인정보 처리방침 페이지 준비

Play Console은 **공개 URL**을 요구합니다. 빠른 방법:

- <https://app-privacy-policy-generator.firebaseapp.com/> 로 생성
- 생성된 HTML을 `public/privacy.html`로 저장 → 다음 배포 시 `/<repo>/privacy.html`로 접근 가능
- 또는 GitHub 저장소의 README나 Gist도 가능

필요 최소 내용:
- 수집 데이터: 없음 (localStorage는 기기 내부만) — 명시
- 제3자 공유: 없음
- 문의 이메일

## 4. PWABuilder로 Android 패키지 생성

1. <https://www.pwabuilder.com/> 접속
2. 배포된 URL 입력 → **Start** 클릭
3. 점검 결과 확인 (Manifest / Service Worker / Security 모두 초록불이어야 함)
4. 우상단 **Package for stores** → **Android** → **Generate Package**
5. 다음 옵션 설정:
   - **Package ID**: `com.yourdomain.commute` 형식 (Play에서 영구 고정됨 — 신중히!)
   - **App name**: `Commute`
   - **Short name**: `Commute`
   - **Version**: `1.0.0` / **Version code**: `1`
   - **Signing key**: **Generate new** 선택 (생성되는 `.keystore` 파일과 비밀번호는 **반드시 안전하게 보관** — 분실 시 업데이트 배포 불가)
6. **Download**로 zip 받기 → 내부에 다음 파일이 있음:
   - `app-release-bundle.aab` ← Play에 올릴 파일
   - `signing.keystore` ← 분실 금지
   - `assetlinks.json` ← 아래 5번에 사용

## 5. Digital Asset Links 설정 (TWA 필수)

TWA 앱이 주소 표시줄 없이 **전체 화면**으로 뜨려면 웹사이트와 앱의 연결을 증명해야 합니다.

1. zip에서 받은 `assetlinks.json`을 사이트에 업로드
2. 경로는 반드시 `/.well-known/assetlinks.json` 이어야 함 → 프로젝트에 넣을 위치:
   ```
   public/.well-known/assetlinks.json
   ```
3. 다음 배포 후 `https://<배포 URL>/.well-known/assetlinks.json` 로 접근 시 JSON이 나오는지 확인
4. (GitHub Pages 서브경로 배포 시 주의) `assetlinks.json`은 반드시 **도메인 루트**여야 인식됩니다. 서브경로(`<user>.github.io/<repo>/`)에서는 TWA 주소 표시줄이 안 사라지는 제약이 있으므로, **정식 출시할 때는 커스텀 도메인 또는 Netlify/Vercel 루트 배포를 권장**합니다.

## 6. Play Console에 앱 등록

1. <https://play.google.com/console> → **앱 만들기**
2. 이름 `Commute`, 기본 언어 `한국어` / `English`, 앱 또는 게임 = 앱, 무료/유료 선택
3. 대시보드에서 요구하는 항목 순서대로 입력:
   - **앱 액세스**: 로그인 불필요 선택
   - **광고**: 없음
   - **콘텐츠 등급**: 설문 작성 → PG 등급 받음
   - **타겟층 및 콘텐츠**: 13세 이상
   - **데이터 보안**: "데이터를 수집하지 않음" (localStorage만 사용)
   - **정부 앱**: 아님
4. **스토어 등록정보** 페이지에서:
   - 짧은 설명: `내 경로를 계획하고 저장하는 출퇴근 앱`
   - 자세한 설명: 기능 목록과 PWA 장점 기술
   - 앱 아이콘 512×512 PNG 업로드
   - 기능 그래픽 1024×500 PNG 업로드
   - 스크린샷 2~8장 업로드 (Chrome DevTools Device Toolbar에서 Pixel 5 등으로 찍으면 간단)
5. **프로덕션 → 출시 만들기** → **App Bundle 업로드**: PWABuilder가 만든 `app-release-bundle.aab` 업로드
6. 출시 노트 입력 후 **저장 → 검토 시작 → 프로덕션 출시**

## 7. 심사 & 배포

- 최초 심사: **1–7일** (보통 2–3일)
- 반려 사유가 많은 항목:
  1. 개인정보 처리방침 URL 접근 불가
  2. `assetlinks.json`이 도메인 루트에 없어서 앱에 주소 표시줄이 보임
  3. 앱 아이콘/스크린샷 규격 불일치
- 승인되면 Play Store 링크가 발급됩니다: `https://play.google.com/store/apps/details?id=com.yourdomain.commute`

## 8. 업데이트 배포 흐름

웹만 고치면 Play Store 앱도 **자동으로 최신 버전** 반영됩니다 (TWA는 실시간 웹 로딩). 다만 다음 경우에는 새 AAB를 올려야 합니다:

- 앱 이름/아이콘/Package ID 변경
- Target SDK 버전 상향 (Play 정책 변경 시 강제)
- 새 기능 중 웹뷰 외부에서 호출해야 하는 것 (예: 네이티브 푸시)

업데이트 절차:
1. PWABuilder에서 **Version code를 +1** 올려서 새 AAB 생성 (기존 `signing.keystore`로 서명)
2. Play Console → 프로덕션 → 새 출시 → AAB 업로드 → 출시

## 9. iOS도 원할 경우

iOS는 TWA 같은 공식 경로가 없습니다. 선택지:

- **Capacitor**로 WebView 래핑 → Xcode 빌드 → App Store Connect 업로드 (Apple $99/년 + Mac 필요)
- **PWABuilder iOS 패키지**도 베타로 제공 — 여전히 Xcode와 Apple 계정 필요
- 일단 Play Store만 내고, iOS는 **"홈 화면에 추가" 유도** 전략으로 시작하는 팀이 많습니다

## 자주 쓰는 자료

- PWABuilder 공식 가이드: <https://docs.pwabuilder.com/#/builder/android>
- TWA 설명 (Chrome DevRel): <https://developer.chrome.com/docs/android/trusted-web-activity/>
- Digital Asset Links 검증기: <https://developers.google.com/digital-asset-links/tools/generator>
- Play Console 정책 체크리스트: <https://play.google.com/console/about/policy/>

## 요약 타임라인

| 작업 | 소요 |
|---|---|
| 개발자 계정 가입 + 신원 확인 | 1–2일 |
| PWABuilder 패키지 생성 | 10분 |
| 스토어 등록정보 입력 | 1–2시간 |
| 최초 심사 대기 | 1–7일 |
| **총합** | **3일 ~ 2주** |
