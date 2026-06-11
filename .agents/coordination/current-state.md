# Current State

Last updated: 2026-06-11 20:20 KST by Claude Code

## Summary

- Project is a Vite JavaScript app named `hueman` (인터랙티브 감정 체험 설치 예술).
- **System A (텍스트 스토리 엔진) 완료**: `content/story.json` 누적 분기, `src/` 모듈(engine/resolver/emotionColor/experienceLog/comfortMessages/ui), 인트로·결과 화면·작가 노트, 테스트 디버그 패널(D 키). **2026-06-11: `영상분기모음.docx`의 전체 분기 트리로 전면 교체** — 돌잡이 6지선다·소개팅 3지선다(선택 UI N지 일반화, 숫자키 1..N), grit/deviated/reformed 플래그, 창업 성패 회상, 노년기 병원 진단사 변형, 엔딩멘트 2종(common/unfinished).
- **System B (실시간 웹캠 감정→색 필터) 완료 (브라우저 검증됨 2026-06-08)**: `@vladmandic/face-api` + `public/models/` 가중치, `src/emotionMapping.js`(순수 매핑)·`src/faceEmotion.js`·`src/liveEmotion.js`, `ui.js` 틴트 레이어(`#tint`). 관람자 실시간 감정이 화면 색을 주도, 얼굴 미검출·카메라 거부 시 장면 색 fallback.
- **System C (얼굴 포토 모자이크) 완료**: `src/snapshots.js`(입장 얼굴 타깃 + 표정 스냅샷 타일), `src/mosaic.js`(`buildMosaic`). 엔딩에서 모자이크 캔버스 + PNG 저장 버튼. 카메라 없거나 타일 부족 시 placeholder. (모자이크 시각 품질·비율은 브라우저에서 튜닝 가능)
- **Roadmap upgrade 완료**: 감정 타임라인, 결과 카드 저장, 로컬 opt-in 감정 갤러리, 개선된 모자이크 색상 매칭, 카메라 실패 cleanup, 프라이버시 안내, 선택 기억 문장, 기본 사운드 cue, 전시용 `Shift+R` 리셋, 작은 화면 결과 레이아웃 보강.
- **hueman 3대 시스템(A 스토리 / B 실시간 감정 색 / C 포토 모자이크) + 전시 보강 기능 구현 완료.**
- **결과 화면 3기능 추가 (2026-06-11)**: 선택 경로 영수증(`engine.path`+`receipts()`, story.json 전 선택지 `receipt`, 결과 화면·결과 카드 표시), 오늘의 감정 통계(`src/dailyStats.js`, 일별 익명 카운트, "오늘 N번의 인생 중…"), 모자이크 타임랩스 리빌(`src/mosaicReveal.js`, 타일이 차오르는 연출 — 저장·카드는 완성본 사용).
- Styles: `styles/main.css`. Tests: `test/` (Vitest).

## Known Repository State

- `/Users/dhoklim/Documents/A&T.TEAM` 는 Git 저장소로 초기화됨. 기본 브랜치 `main`.
- 설계·계획 문서: `docs/superpowers/specs/`, `docs/superpowers/plans/`.

## Verification Baseline (2026-06-11)

- `npm test`: 80 passing in 17 files.
- `npm run build`: passes. 번들 ~1.34MB (face-api/tfjs 포함, gzip ~339KB).
- 개발 서버가 `/models/*` 서빙 200. 실제 웹캠 감지는 브라우저에서만 검증 가능.

## Out of Scope (명시적 제외)

- **심박 센서 Web Bluetooth** — 구현 안 함
- **복합 감정 색 혼합** (isComposite 시 그라디언트 틴트) — 구현 안 함
- **키오스크 모드** (어트랙트 루프, 자동 리셋, 전체화면·커서 숨김) — 구현 안 함

## Next Useful Checks

- 동작 변경 전 `npm test`, 배포/전달 전 `npm run build`.
- 실제 전시장/카메라 환경에서 갤러리 opt-in, 결과 카드 저장, 사운드 체감 수동 QA.
