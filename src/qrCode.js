import QRCode from 'qrcode';

// QR 생성은 브라우저 안에서만 한다. 결과 링크를 제3자 QR 서비스에 보내지 않는다.
export async function drawQr(canvas, value) {
  await QRCode.toCanvas(canvas, value, {
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: {
      dark: '#111118',
      light: '#ffffffff',
    },
  });
}
