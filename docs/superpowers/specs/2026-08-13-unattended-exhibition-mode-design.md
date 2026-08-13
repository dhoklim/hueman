# 무인 전시 모드 설계

**날짜:** 2026-08-13  
**상태:** 사용자 승인  
**범위:** hueman iPad 전시를 무인으로 안정적으로 운영하기 위한 대기 화면·무입력 초기화·초기화 안내만 추가한다. 새 백엔드 API, 관람자 식별, 사진 추가 저장은 포함하지 않는다.

## 의도

한 관람자의 카메라·모자이크·QR 결과가 다음 관람자에게 남지 않게 하고, 아무도 화면을 만지지 않을 때도 작품과 공동 감정 벽이 전시 공간의 일부로 보이게 한다.

## 관람 흐름

1. 페이지를 열거나 체험이 자동 종료되면 **대기 화면**이 보인다. 화면에는 `hueman`의 짧은 작품 소개와 터치 안내가 있고, 뒤에는 기존 `wall.html` 공동 감정 벽이 낮은 투명도로 흐른다.
2. 관람자가 화면을 터치하거나 Space/Enter를 누르면 기존 시작 선택 화면(카메라 켜고 시작 / 카메라 없이 시작)이 나온다.
3. 시작 선택·카메라·무표정 보정·스토리 장면은 마지막 사용자 입력 후 60초가 지나면 자동 종료 절차를 시작한다.
4. 결과·QR 모달·모자이크 확대가 열린 상태에서는 마지막 사용자 입력 후 120초가 지나면 자동 종료 절차를 시작한다. QR을 스캔할 시간을 보장하기 위해 결과 단계만 더 길다.
5. 종료 10초 전에는 모든 UI 위에 `새 관람자를 위해 N초 후 처음으로 돌아갑니다` 안내와 `계속 보기` 버튼이 나타난다. 화면 터치·키 입력·`계속 보기` 중 하나가 있으면 안내가 즉시 사라지고 해당 단계의 전체 시간이 다시 시작된다.
6. 카운트다운이 0이 되면 카메라 감지를 중지하고 스냅샷 메모리를 비운 뒤 `window.location.reload()`로 대기 화면으로 돌아간다.

## 선택한 구조

### `src/kioskMode.js`: 입력과 시간만 관리

`createKioskMode()`는 DOM 장면이나 작품 상태를 알지 않는다. 다음 경계만 제공한다.

```js
export const SESSION_IDLE_MS = 60_000;
export const RESULT_IDLE_MS = 120_000;
export const RESET_COUNTDOWN_SECONDS = 10;

export function createKioskMode({
  onCountdown, // ({ seconds, onContinue }) => { setSeconds, remove }
  onReset,
  documentRef,
  setTimeoutImpl,
  clearTimeoutImpl,
} = {}) {
  return { setPhase(phase), noteActivity(), destroy() };
}
```

- `phase`는 `attract`, `session`, `result` 중 하나다.
- `attract`는 의도적으로 무기한 유지되며 타이머를 갖지 않는다.
- `session`은 60초, `result`는 120초에서 마지막 10초 카운트다운을 시작한다.
- 문서 수준의 `pointerdown`, `touchstart`, `keydown`은 `noteActivity()`로 연결한다. 카운트다운 중 입력은 안내를 제거하고 같은 phase의 새 idle 기간을 부여한다.
- `destroy()`는 타이머와 전역 이벤트를 모두 해제한다. 페이지 새로고침 전 누수가 남지 않도록 한다.

### `src/ui.js`: 대기 화면과 종료 안내만 그린다

- `renderAttract(root, { onActivate })`는 작품 소개·터치 안내·비상호작용 `iframe`을 만든다. iframe URL은 `import.meta.env.BASE_URL + 'wall.html'`이며, 벽이 네트워크 오류를 보여도 대기 화면의 시작 조작은 막지 않는다.
- `renderKioskCountdown({ seconds, onContinue })`는 QR·모자이크 오버레이보다 위에 있는 safe-area 대응 안내를 만들고 `{ setSeconds, remove }`를 반환한다.
- 기존 `renderIntro`·`showResult` 내용, QR 전달 API, 공동 감정 벽 API는 바꾸지 않는다.

### `src/main.js`: 전시 단계와 완전 초기화를 연결

- 초기 진입은 `renderAttract`이다. 활성화 후 기존 `renderIntro`가 보이며 그 시점부터 `session` idle 타이머를 켠다.
- 카메라 시작, 보정, 일반 스토리 장면은 계속 `session` phase다. `showResult` 직후 `result` phase로 바꾼다. QR 버튼을 누른 행동도 새 `result` idle 기간을 부여한다.
- `resetExperience()`는 `stopLiveEmotion()`과 `resetSnapshots()`를 먼저 호출한 뒤 새로고침한다. 기존 `다시 하기`와 `Shift+R`도 이 함수를 사용해 같은 정리 경로를 공유한다.

## iPad·프라이버시 제약

- 대기 배경 iframe은 `pointer-events: none`이라 사용자가 화면 어느 곳을 눌러도 체험 시작 동작만 수행한다.
- 모든 새 조작은 최소 48px 높이와 safe-area padding을 사용한다.
- 자동 초기화는 브라우저 메모리의 얼굴 감지·카메라 스트림·스냅샷·모자이크·QR 모달만 제거한다. `dailyStats`의 익명 일별 합계와 이미 Worker에 전송된 공동 감정 벽 합계는 유지한다.
- 네트워크 없이 공동 감정 벽 iframe이 stale/offline 상태가 되어도 대기 화면과 체험 시작은 정상 동작한다.

## 검증 기준

1. 순수 kiosk timer 테스트가 session 60초, result 120초, 10초 안내, 입력에 의한 취소·전체 시간 재부여, attract 무기한, destroy cleanup을 검증한다.
2. UI 테스트가 대기 화면의 작품 소개·공동 벽 iframe·터치 활성화와 카운트다운 안내의 시간 갱신·계속 보기를 검증한다.
3. main 통합 테스트가 앱이 대기 화면에서 시작하고, 시작 후 60초 무입력에 안내를 띄우며, 완주 결과에서는 120초 기준을 사용함을 검증한다.
4. `npm test`와 `npm run build`를 순차 실행한다. 실제 iPad에서는 대기 화면, QR 스캔 중 타이머 취소, 자동 카메라 해제를 수동 점검한다.
