# 결과 화면 다시 하기 Implementation Plan

**Status:** 완료 (2026-08-13)

**Goal:** 결과 화면에서 한 번의 터치로 인트로부터 새 체험을 시작한다.

**Architecture:** UI는 재시작 의도를 `onRestart` 콜백으로만 노출하고, 앱 엔트리는 브라우저 페이지 새로고침으로 모든 세션 메모리를 초기화한다. 이 분리는 UI 테스트에서 실제 버튼 상호작용을 검증하면서 브라우저 탐색 경계를 작게 유지한다.

## Task 1: 결과 UI의 재시작 제어를 TDD로 추가한다

**Files:** `test/ui.test.js`, `src/ui.js`

1. `onRestart`가 주어진 결과 화면에서 `다시 하기` 버튼을 눌렀을 때 콜백이 한 번 실행된다는 실패 테스트를 작성한다.
2. 대상 테스트를 실행해 버튼이 없어 실패함을 확인한다.
3. `showResult()` 옵션과 버튼을 최소한으로 구현한다.
4. 대상 테스트를 다시 실행해 통과를 확인한다.

## Task 2: 앱 재시작을 실제 브라우저 새로고침에 연결한다

**Files:** `src/main.js`, `test/ui.test.js`

1. 엔딩의 `showResult()` 호출에 `onRestart: () => window.location.reload()`를 전달한다.
2. 전체 테스트와 production build를 실행한다.
3. `main`에 반영하고 GitHub Pages 배포 완료 뒤 공개 번들에 버튼 문구가 포함됐는지 확인한다.
