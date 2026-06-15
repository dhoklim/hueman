# Current State

Last updated: 2026-06-15 19:50 KST by Codex

## Summary

- Project is a Vite JavaScript app named `hueman` (인터랙티브 감정 체험 설치 예술).
- **System A (텍스트 스토리 엔진) 완료**: `content/story.json` 누적 분기, `src/` 모듈(engine/resolver/emotionColor/experienceLog/comfortMessages/ui), 인트로·결과 화면·작가 노트, 테스트 디버그 패널(D 키). **2026-06-11: `영상분기모음.docx`의 전체 분기 트리로 전면 교체** — 돌잡이 6지선다·소개팅 3지선다(선택 UI N지 일반화, 숫자키 1..N), grit/deviated/reformed 플래그, 창업 성패 회상, 노년기 병원 진단사 변형, 엔딩멘트 2종(common/unfinished). 2026-06-15부터 스토리 배경 영상은 원본 오디오를 재생하며, 카메라 미리보기는 계속 음소거.
- **System B (실시간 웹캠 감정 기록) 완료 (브라우저 검증됨 2026-06-08; 화면색 반영 제거 2026-06-14 → 발표 대본 위해 2026-06-15 복원; 2026-06-15 Codex가 틴트 z-index·반응 지연 회귀 수정)**: `@vladmandic/face-api` + `public/models/` 가중치, `src/emotionMapping.js`(순수 매핑)·`src/faceEmotion.js`·`src/liveEmotion.js`. 관람자 실시간 감정은 결과 집계·모자이크 재료에 더해, **게임 시작 후 화면 틴트(`#tint`)를 은은히 물들인다**(opacity 0.28; 영상은 원본 색 유지). `src/emotionColor.js`의 `tintBackground`(단일 색/2색 그라디언트)·`tintEmotionsFromHistory`(상위 1~2 감정, 화면용 최근 2표본 혼합)로 색을 정하고, `src/main.js` `handleEmotion`이 gameStarted 이후 raw `detected` 감정을 우선해 `ui.setTint`를 호출한다. `src/liveEmotion.js` 감지 tick은 300ms이며, 이전 감지가 진행 중이면 scheduled frame을 건너뛰어 결과 밀림을 줄인다. 인트로·사진 촬영·결과 화면에는 틴트가 적용되지 않는다. 장면 전환은 틴트를 건드리지 않아 색이 깜빡이지 않는다. `styles/main.css` 레이어 순서는 배경 영상 < `#tint` < `#app`.
- **System C (얼굴 포토 모자이크) 완료**: `src/snapshots.js`(카메라 준비 후 빨간 `사진 찍기` 버튼으로 얼굴 타깃 사진 + 표정 스냅샷 타일), `src/mosaic.js`(`buildMosaic`). 엔딩에서 모자이크 캔버스 + 크게 보기 오버레이 + PNG 저장 버튼. 카메라 없거나 타일 부족 시 placeholder. (모자이크 시각 품질·비율은 브라우저에서 튜닝 가능)
- **Roadmap upgrade 완료**: 감정 타임라인, 결과 카드 저장, 로컬 opt-in 감정 갤러리, 개선된 모자이크 색상 매칭, 카메라 실패 cleanup, 프라이버시 안내, 선택 기억 문장, 기본 사운드 cue, 전시용 `Shift+R` 리셋, 작은 화면 결과 레이아웃 보강.
- **hueman 3대 시스템(A 스토리 / B 실시간 감정 기록 / C 포토 모자이크) + 전시 보강 기능 구현 완료.**
- **결과 화면 3기능 추가 (2026-06-11)**: 선택 경로 영수증(`engine.path`+`receipts()`, story.json 전 선택지 `receipt`, 결과 화면·결과 카드 표시), 오늘의 감정 통계(`src/dailyStats.js`, 일별 익명 카운트, "오늘 N번의 인생 중…"), 모자이크 타임랩스 리빌(`src/mosaicReveal.js`, 타일이 차오르는 연출 — 저장·카드는 완성본 사용).
- Styles: `styles/main.css`. Tests: `test/` (Vitest).

## Known Repository State

- `/Users/dhoklim/Documents/A&T.TEAM` 는 Git 저장소로 초기화됨. 기본 브랜치 `main`.
- 설계·계획 문서: `docs/superpowers/specs/`, `docs/superpowers/plans/`.

## Verification Baseline (2026-06-15)

- `npm test -- --run`: 112 passing in 21 files.
- `npm run build`: passes. 번들 ~1.36MB (face-api/tfjs 포함, gzip ~344KB; 기존 chunk-size 경고만).
- 개발 서버 boot OK(`/`, `src/*`, `styles/main.css` 200). 실제 웹캠 감지·화면색 변화는 카메라+브라우저에서만 검증 가능.

## Out of Scope (명시적 제외)

- **심박 센서 Web Bluetooth** — 구현 안 함
- **키오스크 모드** (어트랙트 루프, 자동 리셋, 전체화면·커서 숨김) — 구현 안 함

(참고: 실시간 복합 감정 색 혼합은 2026-06-15 화면 틴트로 구현됨 — 위 System B 참고. `experienceLog.aggregate`의 isComposite는 여전히 결과 메시지용.)

## Next Useful Checks

- 동작 변경 전 `npm test`, 배포/전달 전 `npm run build`.
- 실제 전시장/카메라 환경에서 갤러리 opt-in, 결과 카드 저장, 사운드 체감 수동 QA.
