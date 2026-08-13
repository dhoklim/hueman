# QR 임시 사진 전달 및 iPad 대응 설계

작성: 2026-08-13 · 상태: 사용자 승인

## 목적

전시용 iPad에서 완성한 `hueman` 결과 카드를 관람자의 휴대폰으로 가져갈 수 있게 한다.
관람자는 iPad 화면의 QR 코드를 스캔해 결과 카드 PNG를 미리 보고 저장하거나 공유한다.

QR 코드에는 이미지 자체를 넣지 않는다. 이미지는 용량이 커 QR에 담을 수 없으므로, **완성된
결과 카드 한 장만** 10분 동안 비공개 임시 저장소에 보관하고, QR에는 예측 불가능한 수신
주소만 넣는다.

## 범위와 원칙

### 포함

- 결과 화면의 `QR로 사진 받기` 동작과 QR 모달
- 휴대폰용 독립 수신 페이지(`receive.html`)
- Cloudflare Worker + 비공개 R2 버킷의 임시 업로드·수신·정리 API
- iPad Safari의 공유 시트 우선 저장 및 터치·안전 영역·회전 대응
- 자동·수동 검증 및 배포 설정 안내

### 제외

- 원본 카메라 영상, 타깃 얼굴 사진, 개별 표정 타일 전송 또는 서버 저장
- 계정, 영구 갤러리, 이메일/SMS 발송, 인쇄 연동
- 심박 센서와 키오스크 모드

기존의 브라우저 로컬 갤러리는 그대로 유지하며, QR 전달과 데이터를 섞지 않는다.

## 관람자 흐름

1. 관람자가 체험을 끝내면 기존과 같이 결과 카드와 모자이크가 iPad에 표시된다.
2. `QR로 사진 받기`를 누르면 앱이 기존 `createResultCardCanvas()`로 PNG Blob을 만든다.
3. Blob을 Worker에 업로드하는 동안 모달은 진행 상태와 취소/닫기 버튼을 보여 준다.
4. Worker가 `token`과 만료 시각을 돌려주면 앱은
   `https://<Pages-origin>/hueman/receive.html#<token>`을 만들고 QR로 렌더한다.
5. 휴대폰 카메라로 QR을 스캔하면 독립 수신 페이지가 열린다. 해시는 HTTP 요청에 전송되지
   않으므로, 토큰이 페이지 요청·Referrer에 불필요하게 노출되지 않는다.
6. 수신 페이지가 Worker에서 이미지를 받아 미리보기로 표시하고, `사진 저장·공유`로
   Web Share API를 우선 실행한다. 지원하지 않거나 취소/실패하면 PNG 다운로드와 길게 눌러
   저장하는 안내를 제공한다.
7. 10분 뒤 Worker는 수신을 즉시 차단한다. 만료 파일은 매분 정리 작업과 만료 요청 처리에서
   삭제한다.

QR 모달을 닫아도 이미 생성된 링크는 만료 전까지 유효하다. 새 QR을 만들면 새로운 파일과
새 토큰을 만든다. 업로드가 실패해도 결과 화면·기존 저장 버튼·모자이크는 그대로 남는다.

## 아키텍처

```text
iPad 결과 카드 Canvas
  → src/photoTransfer.js (PNG Blob, API 호출)
  → Cloudflare Worker POST /v1/transfers
  → private R2: transfers/<expires-at>/<random-id>.png
  → QR: receive.html#<expires-at>.<random-id>
  → 휴대폰 receive.html
  → Cloudflare Worker GET /v1/transfers/<expires-at>.<random-id>
  → 이미지 미리보기 / iOS 공유 시트 / 다운로드
```

### 프런트엔드 경계

- `src/photoTransfer.js`
  - Canvas를 PNG Blob으로 바꾸고 업로드/다운로드 API를 호출한다.
  - 응답과 네트워크 오류를 `expired`, `not-found`, `network`, `misconfigured`처럼 화면에
    독립적인 상태로 정규화한다.
  - `shareBlob()`과 `downloadBlob()`을 제공해 iPad Safari와 일반 브라우저의 저장 차이를
    한곳에 둔다.
- `src/qrCode.js`
  - `qrcode` 패키지로 짧은 수신 URL을 Canvas/SVG QR로 렌더한다. 외부 QR 생성 서비스에는
    토큰을 보내지 않는다.
- `src/ui.js`
  - 결과 행동 버튼과 QR 모달의 표시·포커스·카운트다운·재시도만 담당한다.
  - 네트워크/Cloudflare 세부 사항은 알지 못하고, `photoTransfer`가 돌려준 상태만 표시한다.
- `src/receive.js` + 루트 `receive.html`
  - 해시에서 토큰을 읽고 한 번만 수신 API를 호출한다.
  - 앱 본체와 웹캠/face-api를 불러오지 않는 가벼운 휴대폰 전용 페이지다.
- `src/main.js`
  - 결과 화면에 전달 동작을 연결한다. 기존 결과 계산·모자이크·갤러리 흐름은 바꾸지 않는다.

Vite는 `index.html`과 `receive.html`을 다중 페이지 입력으로 빌드한다. 배포물에는 두 HTML
파일이 모두 포함돼 GitHub Pages의 `/hueman/receive.html`로 직접 열 수 있어야 한다.

### 설정

- 프런트엔드 빌드 변수: `VITE_QR_TRANSFER_API_URL`
  - 예: `https://hueman-photo-transfer.<account>.workers.dev`
  - GitHub Actions의 Repository Variable `QR_TRANSFER_API_URL`을 빌드 환경 변수로 주입한다.
  - 값이 없거나 HTTPS URL이 아니면 QR 버튼은 비활성화하지 않고, 모달에서 전시 운영자용
    설정 안내와 기존 로컬 저장 대안을 표시한다.
- Worker 환경 변수: `ALLOWED_ORIGINS`
  - 운영값: `https://dhoklim.github.io`
  - 개발 시에만 `http://localhost:<port>`를 추가한다.
- R2 binding: `TRANSFERS`
  - 공개 버킷이 아니며 Worker binding으로만 접근한다.

## Worker API와 저장 정책

### `POST /v1/transfers`

- 요청: `Content-Type: image/png`, PNG 본문, 최대 **8 MiB**
- 요청 Origin은 `ALLOWED_ORIGINS`에 정확히 있어야 한다.
- Worker는 `crypto.randomUUID()`로 새 ID를 만들고
  `transfers/<13자리 expiresAt>/<id>.png`에 저장한다. 수신용 bearer token은
  `<13자리 expiresAt>.<id>`다. 만료 시각을 앞에 둬 R2 목록이 만료 순서가 되도록 한다.
- R2 HTTP metadata: `image/png`, 다운로드 파일명 `hueman-result.png`, `Cache-Control: no-store`.
- custom metadata: `expiresAt` (업로드 시각 + 10분, epoch milliseconds).
- 응답: `{ token, expiresAt }`.
- 실패: 잘못된 Origin `403`, 형식 `415`, 초과 크기 `413`, 내부 오류 `500`.

### `GET /v1/transfers/:token`

- `<13자리 expiresAt>.<UUID>` 형식만 허용하고, 토큰에서 R2 key를 결정한다.
- 존재하고 아직 만료되지 않은 경우 PNG 본문과 `Cache-Control: private, no-store`를 반환한다.
- 만료된 경우 삭제를 예약하고 `410 { error: "expired" }`를 반환한다.
- 존재하지 않는 token은 `404 { error: "not-found" }`를 반환한다.
- 업로드·수신 페이지에서 필요한 `GET`, `POST`, `OPTIONS` CORS만 허용한다.

### 정리

- Worker `scheduled()`가 매분 `transfers/` prefix를 앞에서부터 페이지네이션해
  `expiresAt <= now` 파일을 삭제한다. 키가 만료 시각 순서이므로 첫 미만료 키를 만나면
  멈춘다. 한 실행의 삭제 상한은 1,000개이며, 초과분은 다음 분에 이어서 처리한다.
- Cron 지연과 관계없이 `GET`의 만료 검사로 10분 이후 접근은 즉시 막는다.
- Cloudflare 대시보드에는 `POST /v1/transfers`에 IP당 분당 10회 rate-limit 규칙을 설정한다.
  CORS의 Origin 검사만으로는 비브라우저 요청을 인증하지 못하므로, 이 운영 설정을 함께
  적용한다.

## 개인정보와 보안

- 전송 대상은 `createResultCardCanvas()`가 만든 최종 PNG 한 장뿐이다.
- 원본 비디오 스트림, 타깃 사진 Canvas, 스냅샷 타일, 감정 원시 데이터, localStorage
  갤러리 데이터는 Worker 요청에 넣지 않는다.
- token은 UUID v4 수준의 고엔트로피 임의 ID와 공개 만료 시각으로 구성된다. 링크를 아는
  사람만 만료 전 파일을 읽을 수 있으므로, QR이 보이는 iPad 화면은 관람자 앞에서만 보여 준다.
- 수신 URL의 token은 fragment에 둬 GitHub Pages 요청·Referrer에서 자동으로 제외한다.
- 이미지 응답을 캐시하지 않고, Worker와 R2의 접근 로그 외 별도 분석·사용자 추적을
  추가하지 않는다.
- 인트로 개인정보 문구는 QR을 직접 선택한 경우에만 완성 결과 카드가 10분간 임시
  전송된다는 점을 명확히 알린다.

## iPad 및 휴대폰 UX

- `index.html`에는 `viewport-fit=cover`를 넣고, 결과 화면·모달은 `env(safe-area-inset-*)`와
  `100dvh`를 사용한다.
- 모든 새 버튼은 최소 44×44 CSS px의 터치 영역, `touch-action: manipulation`, 명확한
  로딩/실패/만료 상태를 갖는다. hover 효과는 hover 가능한 포인터에서만 적용한다.
- QR 모달은 세로·가로 모두 스크롤 가능하며, `Esc`, 닫기 버튼, 바깥 클릭으로 닫힌다.
  열기 전 버튼으로 포커스를 되돌린다.
- QR에는 10:00부터 내려가는 만료 시각과 `링크 복사`, `iPad에서 링크 공유`, `새 QR 만들기`
  (만료/오류 후) 행동을 둔다.
- 기존 `결과 카드 저장`도 Web Share API로 PNG 파일 공유를 먼저 시도하고, 미지원 브라우저는
  기존 다운로드 방식으로 돌아간다.
- 수신 페이지는 큰 이미지, `사진 저장·공유`, `다운로드`, 만료·미존재·네트워크별 안내를
  제공한다. iOS에서 파일 공유가 불가하면 이미지를 길게 눌러 사진 앱에 저장할 수 있다.

## 실패 처리

| 상황 | iPad 결과 화면 | 휴대폰 수신 화면 |
| --- | --- | --- |
| API 주소 미설정 | 설정 안내와 로컬 저장 대안 | 해당 없음 |
| 업로드/네트워크 실패 | 재시도와 직접 저장 제공 | 해당 없음 |
| QR 만료 | 새 QR 만들기 제공 | "링크가 만료되었습니다" + iPad에서 새 QR 요청 안내 |
| 잘못된/없는 token | 해당 없음 | "사진을 찾을 수 없습니다" 안내 |
| 공유 API 미지원·취소 | PNG 다운로드 유지 | 다운로드·길게 눌러 저장 안내 |

## 검증 계획

### 자동

- `photoTransfer` 단위 테스트: PNG 변환, API URL 검증, 성공 응답, 403/413/415/500,
  네트워크 오류, `410 expired`, Web Share fallback, Blob 다운로드.
- QR/URL 테스트: GitHub Pages base path와 fragment token으로 올바른 수신 URL을 만들고,
  외부 QR 생성 API를 사용하지 않는지 확인.
- UI 테스트: 결과 화면의 QR 버튼, 업로드 상태, QR·만료 표시, 닫기/재시도, 기존 저장 및
  갤러리 동작 회귀.
- 수신 페이지 테스트: token 누락·잘못됨·만료·성공 미리보기·공유 fallback.
- Worker 테스트: PNG·크기·Origin 검증, 만료 시각+UUID 키 저장, 만료 검사, CORS, Cron 삭제를
  가짜 R2 binding으로 검증.
- `npm test`와 `npm run build`; 빌드 결과에 `dist/receive.html`이 있는지 확인.

### 수동 iPad QA

- 실제 iPad Safari에서 카메라 시작→체험 완료→QR 업로드→휴대폰 카메라 스캔→사진 저장.
- iPad 세로/가로, 노치·홈 인디케이터, Safari 공유 시트, 네트워크 끊김/복구, 10분 만료를
  확인.
- 카메라 없이 시작한 경우의 placeholder에는 QR 버튼이 생기지 않는지 확인.
- 실제 Worker/R2에서 만료 후 `410`과 파일 삭제를 확인.

## 배포 순서

1. Cloudflare에서 비공개 R2 버킷을 만들고 Worker의 `TRANSFERS` binding을 연결한다.
2. Worker의 `ALLOWED_ORIGINS`와 rate-limit 규칙을 설정하고 배포한다.
3. GitHub Repository Variable `QR_TRANSFER_API_URL`에 Worker HTTPS 주소를 넣는다.
4. GitHub Pages 워크플로가 이 값을 `VITE_QR_TRANSFER_API_URL`로 주입해 빌드한다.
5. 배포된 Pages URL과 Worker URL에서 위 수동 QA를 실행한다.

## 완료 기준

- iPad 결과 화면에서 완성 결과 카드만 QR 임시 전송할 수 있다.
- 휴대폰이 QR을 스캔해 10분 안에 이미지를 보고 저장/공유할 수 있다.
- 만료 후 접근은 차단되고 R2 파일이 자동 정리된다.
- QR 기능의 오류가 기존 체험·모자이크·직접 저장을 막지 않는다.
- iPad Safari의 세로/가로와 실제 QR 수신 흐름을 수동으로 확인한다.
