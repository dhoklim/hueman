# 카메라 캡처 화면 분리 — 설계

날짜: 2026-06-14

## 배경

현재 모자이크용 기준 사진(타깃 얼굴)은 **인트로 화면**에서 찍는다. "카메라 켜고 시작"을
누르면 인트로에 "사진 찍기" 버튼(`photo-capture-btn`)이 떠서 그 자리에서 촬영한다.

이를 **별도의 카메라 화면으로 분리**하고, 카메라 앱처럼 라이브 미리보기 + 셔터 +
카운트다운 + 확인/다시찍기를 제공한다.

## 결정 사항

- 촬영: **셔터 버튼 + 3·2·1 카운트다운** 후 찰칵
- 촬영 후: **찍은 사진 미리보기 + "이대로 시작" / "다시 찍기"**
- **원형 얼굴 가이드** 오버레이 + 안내문 표시

## 흐름

```
인트로 → "카메라 켜고 시작"
      → (로딩: "카메라 불러오는 중…")
      → [카메라 화면] 풀스크린 라이브 미리보기(거울) + 원형 가이드 + 안내문 + 셔터
      → 셔터 클릭 → 셔터 비활성 → 3·2·1 카운트다운 → 그 프레임 캡처(고정)
      → [확인 화면] 찍힌 사진 + "이대로 시작" / "다시 찍기"
            ├ 다시 찍기 → 캡처 폐기 → 카메라 화면(라이브)로 복귀
            └ 이대로 시작 → 큰 미리보기 제거 → 타깃 확정 → 첫 장면 show()
      → "카메라 없이 시작"은 기존대로 즉시 시작 (변경 없음)
```

## 접근법 (선택: A안)

- **A안 (채택)**: 새 `renderCameraCapture` 화면을 ui.js에 추가. 이미 떠 있는
  카메라 `MediaStream`에 **별도의 큰 미리보기 `<video>`를 연결**해 풀스크린으로 보여준다.
  감정 감지용 비디오(`#cam-preview`)는 그대로 두고, 큰 미리보기만 만들었다 끝나면 제거 →
  DOM 노드 이동 없이 깔끔. 한 스트림을 두 `<video>`가 공유하는 표준 방식.
- B안(기존 비디오 하나를 키웠다 줄이기): 감지가 읽는 노드를 재배치해야 해 깨지기 쉬움. 기각.
- C안(화면 전환 상태머신 분리): 규모 대비 과함(YAGNI). 기각.

## 모듈 변경

### ui.js
- `renderCameraCapture(root, { stream, onConfirm })` 신설
  - 큰 미리보기 `<video>`(거울 반전, muted, playsinline) — `srcObject = stream`
  - 중앙 원형 얼굴 가이드 + 안내문("얼굴을 원 안에 맞춰 주세요")
  - 셔터 버튼
  - 셔터 클릭 → 셔터/버튼 비활성 → 3·2·1 카운트다운 오버레이 →
    카운트다운 끝 그 프레임을 `grabTargetCanvas(previewVideo)`로 캡처 → 확인 단계로 전환
  - 확인 단계: 캡처 캔버스 표시 + "이대로 시작"/"다시 찍기"
    - 다시 찍기 → 캔버스 폐기 → 라이브 미리보기 + 셔터 복귀
    - 이대로 시작 → 큰 미리보기 비디오 정리 → `onConfirm(canvas)` 호출
- `renderIntro`의 `setCaptureReady`/`photo-capture-btn`(인트로 내 촬영)은 **제거**.
  `renderIntro`는 `{ setLoading }`만 반환.

### snapshots.js
- `grabTargetCanvas(video)` 추가 — 480² 거울 정사각 캔버스 반환, **저장 안 함**(순수).
  (기존 private `captureSquare(video, TARGET_SIZE)` 재사용.)
- `setTarget(canvas)` 추가 — 인자 캔버스를 모듈 `target`으로 설정 → `getTarget()`에 반영.
- 기존 `captureTargetFrom`/`captureTargetWhenReady`는 폴백용으로 유지.

### main.js
- `begin(true)`: 카메라 성공 후 인트로 캡처 버튼 대신
  `renderCameraCapture(root, { stream, onConfirm })` 호출.
  - `stream`은 `camVideo.srcObject`.
  - `onConfirm(canvas)` → `setTarget(canvas)` → `gameStarted = true` →
    `enteredAt = Date.now()` → `show()` → `starting = false`.
- `introSetCaptureReady` 관련 배선 제거. 재진입 가드(`starting`) 유지.

### styles/main.css
- `.camera-screen`(풀스크린 레이아웃), `.camera-preview`(거울),
  `.face-guide`(중앙 원형 테두리), `.camera-shutter`,
  `.camera-countdown`(큰 3·2·1 숫자), `.capture-confirm`(찍은 사진 + 두 버튼).

## 자잘한 처리
- 카메라 화면 동안 작은 코너 썸네일(`#cam-preview`)은 숨김 → 확정 후 다시 표시.
- 캡처는 카운트다운 끝 **그 프레임**을 고정해 확인 화면에 그대로 사용(새로 찍지 않음).
- 카메라 권한/로드 실패 시: 기존처럼 콘솔 경고 후 카메라 없이 진행(이 화면 안 뜸).

## 테스트
- snapshots: `grabTargetCanvas`가 480² 캔버스 반환·미저장, `setTarget`이 `getTarget()`에 반영.
- ui: `renderCameraCapture`가 미리보기·가이드·셔터 렌더, 셔터→확인 전환,
  "다시 찍기"가 라이브 복귀, "이대로 시작"이 `onConfirm`을 캔버스와 함께 호출.
- jsdom엔 실제 카메라 없으니 stream/video/canvas는 목으로.
- 기존 `setCaptureReady` 관련 테스트는 제거/수정.
