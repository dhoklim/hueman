// 전시 기기가 관람자 손에 들리는 태블릿·휴대폰인지, 노트북·데스크톱인지 구분한다.
// 노트북 전시에서는 '이 기기에 저장'이 관람자가 아니라 전시 노트북 다운로드 폴더에
// 얼굴 사진을 쌓을 뿐이라, 직접 저장 버튼은 손에 드는 기기에서만 보여 준다.
// (관람자가 결과를 가져가는 경로는 QR이다.)
export function isHandheldDevice(navigatorRef = typeof navigator === 'undefined' ? null : navigator) {
  if (!navigatorRef) return false;
  const ua = String(navigatorRef.userAgent || '');
  if (/iPad|iPhone|iPod|Android/i.test(ua)) return true;
  // iPadOS 13+ Safari는 데스크톱 맥처럼 'Macintosh'로 보고하지만 멀티 터치를 지원한다.
  return /Macintosh/.test(ua) && Number(navigatorRef.maxTouchPoints) > 1;
}
