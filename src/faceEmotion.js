// @vladmandic/face-api 를 감싸 표정 감지만 담당. (브라우저 전용 — 테스트에서 import 하지 않음)
import * as faceapi from '@vladmandic/face-api';

let loaded = false;

export async function loadModels(modelUrl = '/models') {
  if (loaded) return;
  await faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl);
  await faceapi.nets.faceExpressionNet.loadFromUri(modelUrl);
  loaded = true;
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
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
  const result = await faceapi.detectSingleFace(video, options).withFaceExpressions();
  return result ? result.expressions : null;
}
