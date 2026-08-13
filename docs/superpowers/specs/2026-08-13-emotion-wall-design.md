# 공동 감정 벽 설계

**날짜:** 2026-08-13  
**상태:** 승인된 구현 방향  
**범위:** hueman 전시의 공동 감정 벽만 추가한다. 키오스크 자동 리셋·새 하드웨어 구매·원본 사진 전송 범위는 포함하지 않는다.

## 의도

한 관람자의 체험은 지금처럼 개인적인 결과 카드와 QR 수신으로 끝난다. 동시에 그 관람자의 최종 대표 감정 색 하나가 전시장 별도 화면의 추상적인 색 풍경에 더해진다. 개인의 이야기가 전시장 전체의 흔적이 되지만, 얼굴·사진·선택 경로·원본 표정 수치·식별자는 공동 벽에 전송하거나 저장하지 않는다.

관람자 흐름은 다음과 같다.

1. iPad에서 hueman 체험을 끝낸다.
2. 결과의 대표 감정 카테고리 하나를 비동기로 전송한다. 결과 화면과 QR 기능은 전송 성공 여부와 관계없이 바로 사용할 수 있다.
3. 별도 TV 또는 프로젝터에서 `wall.html`을 연 공동 감정 벽은 잠시 뒤 새 색을 반영한다.
4. 관람자는 개인 결과는 QR로, 공동 흔적은 전시장 화면에서 본다.

## 선택한 구조

### Cloudflare Durable Object의 일일 합계

기존 QR Worker에 SQLite 기반 Durable Object `EmotionWall`을 추가한다. Asia/Seoul 기준 날짜마다 하나의 Durable Object 인스턴스를 사용해 다음 합계만 저장한다.

```json
{
  "day": "2026-08-13",
  "total": 42,
  "counts": {
    "joy": 11,
    "sad": 7,
    "anger": 4,
    "numb": 8,
    "anxiety": 12
  },
  "updatedAt": 1786610000000
}
```

각 Durable Object는 한 요청씩 직렬 처리하므로 여러 iPad가 동시에 결과를 내도 읽기-수정-쓰기 경쟁으로 집계가 사라지지 않는다. 신규 Worker에는 Wrangler의 선언형 `exports` 설정을 사용해 SQLite 저장소를 생성한다.

### 공개 API

기존 Worker의 정확한 허용 Origin 규칙을 그대로 적용한다.

| 요청 | 용도 | 입력/출력 |
| --- | --- | --- |
| `POST /v1/wall/events` | iPad 결과를 한 건 집계 | 입력: `{ "emotion": "joy" }`; 출력: 최신 snapshot |
| `GET /v1/wall` | 벽 화면이 현재 합계를 읽음 | 출력: 일자·총합·카테고리별 합계·갱신 시각 |
| `OPTIONS` | 브라우저 preflight | 허용 Origin에만 204 |

허용 감정은 `joy`, `sad`, `anger`, `numb`, `anxiety` 다섯 가지다. `surprise`, `composite`, 알 수 없는 값은 400으로 거절한다. 서버가 날짜를 생성하므로 클라이언트가 날짜·시간·색상·관람자 식별자를 보낼 수 없다. 일일 총합은 10,000으로 상한을 두어 공개 엔드포인트의 비용 폭주를 막는다.

### 보존과 프라이버시

- 전송·저장 금지: 얼굴 이미지, 모자이크, 결과 카드 PNG, 카메라 원본, 스냅샷, 선택지, 원본 표정 확률, 브라우저 식별자.
- 저장: 위 다섯 카테고리의 집계 숫자와 서버 갱신 시각만.
- 새 KST 날짜는 자동으로 새 일일 객체를 사용하므로 벽은 자정에 비어 있는 새 풍경으로 시작한다.
- 기존 1분 Cron은 사진 전달 R2 정리를 유지하고, KST 자정 직후 최근 8일보다 오래된 일일 객체의 저장값을 삭제한다. 삭제 대상에도 개인 데이터는 없다.
- 네트워크 오류는 iPad 체험을 막지 않는다. 클라이언트는 실패를 삼키고, 벽은 마지막 성공 snapshot을 계속 렌더링한다.

## 브라우저 구성

### iPad 체험

`src/wallClient.js`는 기존 `VITE_QR_TRANSFER_API_URL`을 재사용한다. 결과 계산 뒤 `topCategory`만 `POST /v1/wall/events`로 보낸다. 이 호출은 fire-and-forget으로 수행하며 QR 모달·결과 카드·모자이크·카메라 흐름에 영향을 주지 않는다.

### 전시 벽

`wall.html`과 `src/wall.js`는 별도 전시 화면용 정적 페이지다. `GET /v1/wall`을 4초 간격으로 읽고, 수신한 합계만으로 캔버스의 부드러운 색 입자·빛 번짐을 결정적으로 만든다. 서버에는 개별 관람자 이벤트 목록이 없으므로 벽의 입자는 실제 개인을 추적하지 않는 추상화다.

화면에는 다음만 나타난다.

- `오늘 전시를 지나간 N개의 감정`
- 카테고리별 색상 점과 한국어 라벨
- 합계가 0일 때의 조용한 시작 문구
- 연결이 끊겼을 때 마지막 풍경을 유지한다는 작은 상태 문구

벽은 `prefers-reduced-motion`을 존중하고, 모든 시각 요소는 화면 크기에 맞춰 다시 배치한다. 별도 화면에서는 `https://dhoklim.github.io/hueman/wall.html`을 열면 된다.

## 오류 처리

- Worker API 미설정·네트워크 실패: iPad 체험 완료, 벽은 마지막 데이터 유지.
- 잘못된 JSON·Content-Type·감정: 400.
- 허용되지 않은 Origin: 403.
- Durable Object 저장 실패: 503 `wall-unavailable`; 클라이언트는 체험 UI에 오류를 노출하지 않는다.
- 일일 총합 상한 도달: 429 `wall-full`; 벽은 기존 상태 유지.

## 검증 기준

1. 순수 클라이언트 테스트는 URL 검증, 다섯 감정 전송, 설정/네트워크 오류 무시를 검증한다.
2. Worker 테스트는 CORS, JSON 검증, 일일 합계 증가, 상한, snapshot, Durable Object 저장, KST 일자 경계를 검증한다.
3. 벽 DOM 테스트는 빈 상태·합계 상태·연결 실패 상태·`prefers-reduced-motion`을 검증한다.
4. 빌드 테스트는 `wall.html`과 Worker URL 포함 번들을 검증한다.
5. 로컬 Worker 및 배포 Worker에서 실제 POST→GET 수치가 증가하는지 확인한다.
6. 공개 `wall.html`을 실제 브라우저로 열어 입자 캔버스·합계·새 이벤트 반영을 확인한다.

## 배포

1. Worker config에 `EmotionWall` Durable Object binding과 SQLite `exports` 선언을 추가한다.
2. `npm run worker:deploy`로 같은 공개 Worker URL에 배포한다.
3. 기존 GitHub Actions 변수 `QR_TRANSFER_API_URL`은 그대로 사용한다.
4. `main` push가 `wall.html`을 GitHub Pages에 배포한다.

