# 중립 얼굴 감정 보정 설계 (Neutral-Face Calibration)

작성: 2026-06-15 · 범위: 기능 1만 (QR 가져가기는 보류)

## 목적

사람마다 무표정의 기본형이 달라서, face-api가 가만히 있는 얼굴을 `sad`·`angry`
등으로 잘못 읽는 경우가 있다. 그러면 체험 내내 감정이 한쪽으로 치우쳐 최종 위로
메시지·모자이크·틴트가 부정확해진다. 입장 직후 그 사람의 무표정을 잠깐 샘플링해
**개인 기준값(baseline)** 을 잡고, 이후 실시간 표정에서 기준값을 빼고 남은
"변화분"만으로 감정을 판정한다.

## 흐름 위치

```
인트로 → 사진 촬영(기존, 그대로) → [신규] 무표정 보정(약 3초) → 게임 시작
```

- 카메라로 시작한 경우에만 보정 단계가 들어간다.
- 카메라 없이 시작/카메라 실패 시 보정 단계를 건너뛴다(기존 흐름 유지).

## 보정 원리

face-api 표정은 `{happy, sad, angry, fearful, disgusted, surprised, neutral}`
확률 분포다.

1. 보정 단계에서 무표정 표정벡터를 여러 개 모아 평균 → `baseline`.
2. 게임 중 매 tick: `adjusted = applyBaseline(live, baseline)` 후 `expressionToEmotion(adjusted)`.
   - 각 표정에서 baseline을 빼고 0 미만은 0으로 클램프.
   - 합이 양수면 재정규화(합=1)해 기존 임계치(`MIN_CONFIDENCE`, `NEUTRAL_OVERRIDE`)가
     계속 의미를 갖게 한다.
   - 변화분이 전혀 없으면(합 0) `neutral=1` → `numb`.
   - `baseline`이 `null`이면 원본 그대로(보정 미적용).

## 모듈 변경

### `src/emotionMapping.js` (순수 함수, 신규)
- `computeBaseline(samples, minSamples = 3)` — 표정벡터 평균. 유효 샘플 부족 시 `null`.
- `applyBaseline(expressions, baseline)` — 위 보정. `baseline`/`expressions`가
  없으면 입력을 그대로 통과.

### `src/liveEmotion.js`
- `setBaseline(b)` / `getBaseline()` — 모듈 보정값.
- `startCalibration()` / `finishCalibration()` — `startCalibration` 후 `tick`이 원시
  표정벡터를 버퍼에 모으고, `finishCalibration`이 `computeBaseline`→`setBaseline`하고
  baseline(또는 `null`)을 반환.
- `tick()` — `expressionToEmotion(applyBaseline(expr, baseline))`로 보정 적용.
- `startLiveEmotion()` 시작 시 baseline·보정 상태 초기화.

### `src/ui.js`
- `renderCalibration(root, { seconds })` → `{ setCount }`. "무표정으로 정면을
  봐주세요" 안내 + 카운트다운 숫자. (타이머는 main이 구동 — `renderIntro`의
  `setLoading` 패턴과 동일.)

### `src/main.js`
- 사진 촬영 확정(`onConfirm`) 후 `show()` 대신 보정 단계 실행:
  `startCalibration()` → `renderCalibration` 카운트다운 → `finishCalibration()` →
  `gameStarted = true` → `show()`.

## 안전장치

- 무표정 샘플이 부족하면(어두움·얼굴 미검출) `baseline = null` → 보정 미적용,
  체험은 막히지 않는다.
- 보정은 게임 시작 전에만 일어나고, 결과 집계/틴트 로직은 그대로다.

## 테스트 (TDD, Vitest/jsdom)

- `emotionMapping`: `computeBaseline`(평균/부족 샘플/null), `applyBaseline`(통과·
  클램프·재정규화·전부0→neutral), 그리고 "무표정에 sad가 새는 얼굴이 보정 후
  numb로 읽힌다" 통합 케이스.
- `liveEmotion`: `startCalibration`→`finishCalibration`이 baseline을 만들고,
  이후 같은 무표정이 `numb`로 검출되는지(faceEmotion 모킹).
- `main` flow: 사진 촬영 확정 후 보정 화면(`.calibration`)을 거쳐 장면으로 진입.

## 비범위

- QR/클라우드 가져가기(기능 2) — 보류.
- 키오스크/심박 등 기존 Out-of-Scope 유지.
