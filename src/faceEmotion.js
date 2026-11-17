// @vladmandic/face-api 를 감싸 표정 감지만 담당. (브라우저 전용 — 테스트에서 import 하지 않음)
import * as faceapi from '@vladmandic/face-api';

let loading = null; // 진행 중이거나 끝난 모델 로드 — 미리 받기와 카메라 시작이 같이 불러도 한 번만 받는다
let warmed = null;

export function loadModels(modelUrl = '/models') {
  if (!loading) {
    loading = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
      faceapi.nets.faceExpressionNet.loadFromUri(modelUrl),
    ]).then(() => undefined);
    loading.catch(() => { loading = null; }); // 실패하면 다음 시도에서 다시 받는다
  }
  return loading;
}

// 모델을 받고 빈 화면으로 한 번 인식해 WebGL 셰이더를 미리 컴파일한다.
// 첫 실제 인식이 늦어 무표정 보정 3초의 앞부분을 놓치는 일을 줄인다. 카메라는 켜지 않는다.
export function warmUp(modelUrl = '/models') {
  if (!warmed) {
    warmed = loadModels(modelUrl).then(async () => {
      const blank = document.createElement('canvas');
      blank.width = 224;
      blank.height = 224;
      const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });
      await faceapi.detectSingleFace(blank, options).withFaceExpressions();
    });
    warmed.catch(() => { warmed = null; });
  }
  return warmed;
}

export async function startCamera(video) {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 320, height: 240, facingMode: 'user' },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

// video 한 프레임에서 표정 확률 객체 반환. 얼굴 없으면 null.
export async function detectExpressions(video) {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 });
  const result = await faceapi.detectSingleFace(video, options).withFaceExpressions();
  return result ? result.expressions : null;
}
