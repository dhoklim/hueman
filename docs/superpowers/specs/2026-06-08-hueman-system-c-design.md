# hueman System C — 포토 모자이크 설계 명세

- **작성일:** 2026-06-08
- **범위:** hueman 3대 시스템 중 **System C**. 엔딩의 placeholder를, 관람자 얼굴 모양이지만 가까이서 보면 체험 중 본인 표정 순간들로 채워진 **포토 모자이크**로 교체. System B의 웹캠을 재사용한다.

## 1. 목표 / 비목표

- **목표:** 카메라 ON 체험에서 (1) 입장 시 얼굴 1컷을 타깃으로, (2) 체험 중 표정 스냅샷을 타일로 모아, (3) 엔딩에서 포토 모자이크 합성 + PNG 저장.
- **비목표:** 추상 색 모자이크(사용자 선택: 얼굴 모자이크만). 카메라 없거나 타일 부족 시 기존 placeholder 유지. 서버 업로드/저장 없음(완전 로컬).

## 2. 데이터 흐름 (웹캠 ON일 때만)

```
System B 웹캠 video ──┬─ (첫 프레임) setTargetFrom → 타깃 얼굴 1장
                      └─ (약 1.4초마다) addTile(video, 현재감정) → 타일[]  (최대 ~48)
엔딩 onAdvance: stopLiveEmotion → buildMosaic(타깃, 타일들) → 결과 화면 캔버스 + 저장 버튼
```

- 타깃/타일은 video와 독립된 **캔버스 복사본**이라 카메라 종료 후에도 합성 가능.

## 3. 합성 알고리즘 (`buildMosaic`)

- 출력 캔버스를 `cols×rows`(기본 28×28) 그리드, 칸당 `cellPx`(기본 18px).
- 타깃을 그리드 해상도로 줄여 **칸별 평균색** 샘플(`getImageData`).
- 각 칸: ① 타일 그리기 → ② 타일 감정색 살짝 틴트(alpha≈0.22) → ③ **타깃 칸 평균색을 반투명(alpha≈0.5)으로 덮어 밝기/색 매칭**. → 멀리선 얼굴, 가까이선 감정 순간들.
- 타일 선택 `pickTile(cellIndex, n)` = `cellIndex % n` (순환).
- getUserMedia 프레임은 동일 출처라 캔버스가 tainted 되지 않음 → `getImageData` 가능.

## 4. 모듈 (단일 책임)

| 모듈 | 책임 | 의존 |
|---|---|---|
| `src/snapshots.js` | 웹캠 프레임 정사각 캡처, 타깃 1장 + 타일[] 보관. `setTargetFrom(video)`, `addTile(video, emotion)`, `getTarget()`, `getTiles()`, `hasEnough()`, `reset()` | — (DOM canvas) |
| `src/mosaic.js` | `buildMosaic(target, tiles, opts)` → 캔버스. 순수 헬퍼 `luminance(r,g,b)`, `pickTile(i,n)` | emotionColor |
| `src/ui.js`(수정) | `showResult(root, result, mosaicCanvas?)` — 캔버스 있으면 표시 + "이미지 저장(PNG)" 버튼, 없으면 기존 placeholder | — |
| `src/main.js`(수정) | 카메라 틱에서 타깃/타일 캡처(스로틀: 첫 틱 타깃, 이후 2틱마다 타일), 엔딩에서 합성 후 showResult | snapshots, mosaic |
| `src/debug.js`(수정) | 테스트 패널에 스냅샷 수(타깃/타일) 표시 | — |

- liveEmotion.js는 수정하지 않음(이미 `video`를 반환). main이 그 video로 캡처.

## 5. 결과 화면 / 저장

- placeholder 자리(`.mosaic-slot`)에 모자이크 캔버스(`.mosaic-canvas`) 삽입.
- "이미지 저장" 버튼 → `canvas.toBlob` → PNG 다운로드(`hueman-<감정>.png`).
- 작가 노트 버튼은 그대로.

## 6. 폴백 / 오류

- 카메라 OFF, 권한 거부, 타일 부족(`hasEnough()===false`) → 기존 placeholder 표시. 체험은 항상 완료 가능.

## 7. 테스트

- 순수 헬퍼 `luminance`, `pickTile` 단위 테스트(node).
- 캔버스 캡처·합성은 jsdom이 canvas 2d 미지원 → **브라우저로 직접 검증**.
- 기존 `showResult` placeholder 테스트는 유지(인자 없이 호출 시 placeholder).

## 8. 파일

```
src/snapshots.js   (신규)
src/mosaic.js      (신규)
src/ui.js          (수정: showResult 모자이크/저장)
src/main.js        (수정: 캡처·합성 배선)
src/debug.js       (수정: 스냅샷 수)
styles/main.css    (수정: 모자이크·저장 버튼)
test/mosaic.test.js (신규)
```
