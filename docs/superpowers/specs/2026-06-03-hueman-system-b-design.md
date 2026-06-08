# hueman System B — 실시간 감정 인식 → 색 필터 설계 명세

- **작성일:** 2026-06-03
- **범위:** hueman 3대 시스템 중 **System B**. 웹캠으로 관람자의 표정을 읽어 감정을 추정하고, 그 감정으로 화면 색을 실시간으로 물들인다. System A 위에 얹는다.

## 1. 목표

- 웹캠 표정 → 감정 추정(브라우저 내 완전 로컬, 영상 비전송).
- **관람자의 실시간 감정이 화면 색을 주도.** 얼굴 미검출·카메라 거부 시 장면이 정한 감정 색으로 fallback(= System A 동작).
- 엔딩 집계가 **실제 관람자 감정**을 쓰도록 `experienceLog`에 `source:'webcam'` 이벤트를 기록.

### 비목표

- 표정 스냅샷 수집(모자이크 재료) — System C에서. (YAGNI)
- 심박 센서.
- 웹캠 영상 화면 노출 — 몰입을 위해 숨김(테스트 패널 미리보기만).

## 2. 라이브러리 & 감정 매핑

- **@vladmandic/face-api** (face-api.js 유지보수 포크). `tinyFaceDetector` + `faceExpressionNet` 모델 사용. 모델 가중치는 `public/models/`에서 로컬 서빙.
- 표정 7종 → hueman 6감정 키:

| face-api 표정 | hueman 감정 |
|---|---|
| happy | joy |
| sad | sad |
| angry, disgusted | anger |
| fearful | anxiety |
| surprised | surprise |
| neutral | numb |

- 매 감지: 확률 argmax → 매핑. **신뢰도 임계치**(예: 0.35 미만이면 직전 값 유지) + **시간 평활화**(최근 N개 다수결)로 깜빡임 방지.

## 3. 아키텍처 (단일 책임, A의 빈자리에 끼움)

```
[웹캠 video] → faceEmotion(감지+매핑+평활화) → liveEmotion(컨트롤러)
                                                    │
                          ┌─────────────────────────┼─────────────────────┐
                          ▼                         ▼                      ▼
                  ui.setTint(색)        experienceLog.record         (미검출 시)
               화면 틴트 실시간 갱신     {emotion, source:'webcam'}   장면 색 fallback
```

| 모듈 | 책임 | 의존 |
|---|---|---|
| `faceEmotion.js` | face-api 감싸기: `loadModels()`, `startCamera(video)`, `expressionToEmotion(expr)`(순수), `smooth(history)`(순수), `detect()` | @vladmandic/face-api |
| `liveEmotion.js` | 컨트롤러: 일정 간격 감지 루프 → `ui.setTint` + `experienceLog` 기록 + fallback. `start({video, log, onEmotion})`, `stop()`, `setFallback(emotion)` | faceEmotion, emotionColor, experienceLog |
| `ui.js`(수정) | **틴트 레이어** 도입: 항상 떠 있는 `#tint`를 `setTint()`로 갱신, 장면은 투명. 인트로에 카메라 2버튼 | emotionColor |
| `main.js`(수정) | 인트로 선택(카메라/없이) → liveEmotion 시작/미시작 배선. 장면 전환 시 `setFallback(scene.emotion)` | 위 전체 |
| `debug.js`(수정) | 감지된 실시간 감정·신뢰도·source 표시(+작은 미리보기) | — |

## 4. 화면 틴트 변경

- 현재: 각 장면이 자기 배경색을 직접 칠함.
- 변경: `#tint`(고정 전체화면 레이어, 부드러운 transition)를 두고 장면 콘텐츠는 투명. 
  - 웹캠 ON: `liveEmotion`이 매 틱 `setTint(gradientFor(실시간감정))` → **관람자 감정이 주도**.
  - 웹캠 OFF/미검출: 장면 전환 때 `setTint(gradientFor(scene.emotion))`만 적용 → 장면 색 fallback.

## 5. 카메라 UX / 권한 / 오류

- 인트로: **"카메라 켜고 시작"** → `getUserMedia` 권한 요청 → 모델 로드 → 감지 시작. **"카메라 없이 시작"** → System A 동작.
- 권한 거부/미지원/모델 로드 실패 → 조용히 fallback(장면 색), 콘솔 경고. 체험은 항상 진행 가능.
- `getUserMedia`는 https 또는 localhost 필요(개발/배포 모두 충족).

## 6. 데이터 계약 (기존과 호환)

- 감정 이벤트: `{ sceneId, emotion, source:'webcam', durationMs, timestamp }` — A의 `source:'scene'`와 같은 큐. `aggregate()`는 카테고리별 `durationMs` 합산이라 혼용 OK.
- 웹캠 ON이면 주기적으로 webcam 이벤트 기록(집계가 실제 감정 반영). OFF면 기존 scene 이벤트.

## 7. 테스트

- 순수 함수 단위 테스트: `expressionToEmotion`(argmax+매핑+임계치), `smooth`(다수결/평활화).
- 카메라·모델 로딩·틴트 갱신은 실제 브라우저 실행으로 검증(헤드리스 불가).

## 8. 파일

```
public/models/                 # face-api 가중치 (tiny_face_detector, face_expression)
src/faceEmotion.js  (신규)
src/liveEmotion.js  (신규)
src/ui.js           (수정: 틴트 레이어, 인트로 카메라 2버튼)
src/main.js         (수정: 카메라 배선)
src/debug.js        (수정: 실시간 감정 표시)
styles/main.css     (수정: #tint, 카메라 버튼, 미리보기)
test/faceEmotion.test.js (신규)
```

## 9. 향후
- System C: 같은 감지 루프에 표정 스냅샷 수집 추가 → 포토 모자이크.
- 평활화/임계치 파라미터 튜닝(테스트 패널로 관찰).
