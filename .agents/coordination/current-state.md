# Current State

Last updated: 2026-06-08 18:55 KST by Codex

## Summary

- Project is a Vite JavaScript app named `hueman` (인터랙티브 감정 체험 설치 예술).
- **System A (텍스트 스토리 엔진) 완료**: `content/story.json` 누적 분기, `src/` 모듈(engine/resolver/emotionColor/experienceLog/comfortMessages/ui), 인트로·결과 화면·작가 노트, 테스트 디버그 패널(D 키).
- **System B (실시간 웹캠 감정→색 필터) 완료 (브라우저 검증됨 2026-06-08)**: `@vladmandic/face-api` + `public/models/` 가중치, `src/emotionMapping.js`(순수 매핑)·`src/faceEmotion.js`·`src/liveEmotion.js`, `ui.js` 틴트 레이어(`#tint`). 관람자 실시간 감정이 화면 색을 주도, 얼굴 미검출·카메라 거부 시 장면 색 fallback.
- **System C (얼굴 포토 모자이크) 완료**: `src/snapshots.js`(입장 얼굴 타깃 + 표정 스냅샷 타일), `src/mosaic.js`(`buildMosaic`). 엔딩에서 모자이크 캔버스 + PNG 저장 버튼. 카메라 없거나 타일 부족 시 placeholder. (모자이크 시각 품질·비율은 브라우저에서 튜닝 가능)
- **Roadmap upgrade 완료**: 감정 타임라인, 결과 카드 저장, 로컬 opt-in 감정 갤러리, 개선된 모자이크 색상 매칭, 카메라 실패 cleanup, 프라이버시 안내, 선택 기억 문장, 기본 사운드 cue, 전시용 `Shift+R` 리셋, 작은 화면 결과 레이아웃 보강.
- **hueman 3대 시스템(A 스토리 / B 실시간 감정 색 / C 포토 모자이크) + 전시 보강 기능 구현 완료.**
- Styles: `styles/main.css`. Tests: `test/` (Vitest).

## Known Repository State

- `/Users/dhoklim/Documents/A&T.TEAM` 는 Git 저장소로 초기화됨. 기본 브랜치 `main`.
- 설계·계획 문서: `docs/superpowers/specs/`, `docs/superpowers/plans/`.

## Verification Baseline (2026-06-08)

- `npm test`: 58 passing in 15 files.
- `npm run build`: passes. 번들 ~1.34MB (face-api/tfjs 포함, gzip ~339KB).
- 개발 서버가 `/models/*` 서빙 200. 실제 웹캠 감지는 브라우저에서만 검증 가능.

## Next Useful Checks

- 동작 변경 전 `npm test`, 배포/전달 전 `npm run build`.
- 실제 전시장/카메라 환경에서 갤러리 opt-in, 결과 카드 저장, 사운드 체감 수동 QA.
