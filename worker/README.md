# hueman 임시 사진 전달 Worker

이 Worker는 결과 카드 PNG 한 장만 비공개 R2에 임시 저장한다. 링크는 생성 정확히 10분 뒤 즉시 무효화되고, R2 객체는 다음 분당 정리 작업에서 삭제된다(만료 링크를 열면 즉시 삭제도 예약한다). 카메라 원본, 얼굴 타깃, 표정 스냅샷은 브라우저 밖으로 전송하지 않는다.

## 처음 한 번 설정

1. Cloudflare에 로그인한다: `npx wrangler login`.
2. 비공개 버킷을 만든다: `npx wrangler r2 bucket create hueman-photo-transfers`.
3. `wrangler.jsonc`의 `ALLOWED_ORIGINS`를 실제 GitHub Pages origin으로 확인한다. 기본값은 `https://dhoklim.github.io`다. 미리보기나 별도 도메인을 쓸 경우 쉼표로 추가한다.
4. `npm run worker:deploy`로 배포하고 Worker의 HTTPS 주소를 기록한다.
5. GitHub 저장소 **Settings → Secrets and variables → Actions → Variables**에 `QR_TRANSFER_API_URL`을 만들고 그 Worker HTTPS 주소를 넣는다.
6. `main`에 푸시해 GitHub Pages를 다시 빌드한다.

R2 버킷에는 Public Development URL을 켜지 않는다. 객체는 Worker만 읽으며, 읽기 요청은 토큰의 만료 시간을 먼저 검사한다.

## 운영 점검

- Worker routes are `POST /v1/transfers` and `GET /v1/transfers/:token`.
- PNG는 8 MiB 이하이며, 응답과 객체는 `no-store`로 캐시하지 않는다.
- 매분 Cron Trigger가 만료된 객체를 최대 1,000개씩 정리한다. 만료 링크를 열어도 해당 객체 삭제가 예약된다.
- Cloudflare Dashboard에서 이 Worker에 Rate Limiting rule을 추가한다. 권장 시작값은 IP당 `POST /v1/transfers` 10회/분, `GET /v1/transfers/*` 60회/분이다.
- 로컬 점검은 `npm run worker:dev`로 한다. 로컬 Worker origin을 시험할 때만 `ALLOWED_ORIGINS`에 해당 localhost origin을 임시 추가하고, 배포 전에는 제거한다.
