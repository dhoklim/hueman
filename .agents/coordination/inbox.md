# Inbox

## Open

- _None_

## Resolved

- 2026-08-13 22:32 KST | Codex | GitHub Pages workflow `31705123006`의 build·deploy가 success로 끝났다. 공개 `/hueman/` index와 새 asset `index-CDlpD1Gp.js`는 no-cache HTTP 200이며, asset에 `wall.html`과 `새 관람자를 위해`가 포함됨을 확인했다.
- 2026-08-13 22:29 KST | Codex | 무인 전시 모드를 `main`에 통합했다. 대기 화면은 작품 소개와 공동 감정 벽을 보이고, 체험 60초/결과·QR 120초 무입력 뒤 10초 취소 안내를 띄운다. 자동 초기화·다시 하기·Shift+R는 카메라·QR·모자이크·스냅샷을 함께 정리한다. `npm test` 248개와 production build를 순차 검증했고 독립 코드 검토에서 차단 이슈가 없었다.
- 2026-08-13 22:02 KST | Codex | 결과 화면 `다시 하기`를 `main`에 통합했다. 버튼은 전체 새로고침으로 카메라·모자이크·감정 기록을 초기화하고 인트로부터 새 관람자 체험을 시작한다. TDD RED→GREEN, `npm test` 234개와 production build를 순차 검증했다.
- 2026-08-13 19:48 KST | Codex | 공동 감정 벽을 `main`에 배포했다. SQLite Durable Object `EmotionWall`은 다섯 대표 감정의 KST 일일 합계만 저장하고, iPad 결과는 비차단으로 한 감정만 전송한다. Worker POST 201→GET 200, GitHub Pages run `31692315086` success, 공개 `wall.html`의 Canvas·합계·범례 렌더를 Chrome으로 확인했다.
- 2026-08-13 19:26 KST | Codex | 공동 감정 벽 설계가 확정됨. 다음 단계는 Durable Object 집계 API·`wall.html`·iPad 결과 전송을 구현하고 공개 전시 화면으로 검증하는 것.
- 2026-08-13 19:26 KST | Codex | 공동 감정 벽 방향을 개인정보 보존형 일일 합계로 확정했다. 별도 전시 화면에는 추상 색 풍경과 익명 총합만 표시하며, 원본 카메라·사진·선택 경로는 전송하지 않는다.
- 2026-08-13 19:17 KST | Codex | `main` push 후 GitHub Pages workflow `31690160049`의 build·deploy가 모두 success로 완료됐다. 공개 receiver bundle에 Worker URL이 포함됐고, 유효 PNG의 `receive.html#token`을 실제 Chrome에서 열어 이미지와 `사진 저장·공유` 버튼이 나타나는 `ready` 상태를 확인했다.
- 2026-08-13 19:12 KST | Codex | `main` push·GitHub Pages workflow 실행 및 공개 QR 수신 검증 단계는 2026-08-13 19:17 KST에 완료됨.
- 2026-08-13 19:12 KST | Codex | 사용자가 R2를 활성화한 뒤 `hueman-photo-transfers` Standard 버킷을 생성하고 Worker `https://hueman-photo-transfer.dhoklim-bdd.workers.dev`를 배포했다. `QR_TRANSFER_API_URL` GitHub Actions 변수도 설정했다. 실서비스 POST/GET PNG 검증은 200, `Access-Control-Allow-Origin: https://dhoklim.github.io`, `Cache-Control: private, no-store`를 반환했다.
- 2026-08-13 14:32 KST | Codex | R2 초기 활성화 필요(code 10042) 상태는 사용자 활성화 후 2026-08-13 19:12 KST에 해소됨.
- 2026-08-13 14:32 KST | Codex | Cloudflare 로그인 및 GitHub 반영 경로를 재확인했다. `wrangler whoami`는 `dhoklim@gmail.com` 계정을, Windows `git.exe push --dry-run origin main`은 `main` 원격 반영 가능 상태를 확인했다. GitHub 연결 앱도 `dhoklim/hueman` admin 권한을 반환했다.
- 2026-08-13 14:23 KST | Codex | WSL `git push --dry-run origin main`은 HTTPS 자격 증명이 없어 실패했으나 Windows Git Credential Manager 경로에서는 2026-08-13 14:32 KST에 성공으로 확인되어 해소됨.
- 2026-08-13 14:18 KST | Codex | Cloudflare 로그인 상태가 아니었던 초기 점검은 2026-08-13 14:32 KST OAuth 인증 확인으로 해소됨.
- 2026-08-13 14:22 KST | Codex | QR·iPad feature branch를 `main`에 로컬 병합(`fbf65fe`)하고, stale `.worktrees/`가 중복 테스트를 발견하지 않도록 설정·회귀 테스트를 추가(`a330777`). main 검증: 185 tests, build, Worker dry-run, audit 0 vulnerabilities.
- 2026-08-13 13:44 KST | Codex | QR 임시 사진 전달·iPad 대응 설계 검토가 완료되어, 구현 계획 `docs/superpowers/plans/2026-08-13-qr-photo-transfer.md`를 작성함. 다음 작업은 TDD 구현.
- 2026-06-15 19:32 KST | Codex | Claude Code의 19:10 틴트 복원 handoff 확인. 이후 `#tint` z-index 숨김 문제와 감정 틴트 반응 지연을 수정했고, 테스트/빌드 통과 상태로 문서화함.
- 2026-06-08 10:59 KST | Claude Code | System B (webcam emotion→color) 완료·브라우저 검증됨. System B lock release. `src/` + `styles/main.css` 영역 자유롭게 편집 가능. 테스트 42 passing (9 files), 여전히 비-Git.
- 2026-06-08 10:53 KST | Claude Code | Codex 의 2026-06-07 프로토콜 안내 확인. 이후 `AGENTS.md` + `.agents/coordination/` 워크플로를 따릅니다.
