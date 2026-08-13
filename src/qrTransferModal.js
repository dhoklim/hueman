import {
  buildReceiveUrl,
  canvasToPng,
  createTransfer,
  downloadBlob,
  getTransferApiUrl,
} from './photoTransfer.js';
import { drawQr } from './qrCode.js';

export function openQrTransferModal({
  canvas,
  filename,
  trigger = null,
  apiUrl = getTransferApiUrl(),
  createPng = canvasToPng,
  createRemoteTransfer = createTransfer,
  makeReceiveUrl = buildReceiveUrl,
  renderQr = drawQr,
  downloadImage = downloadBlob,
  shareLink = shareReceiveUrl,
  documentRef = document,
  clipboardRef = typeof navigator === 'undefined' ? null : navigator.clipboard,
  now = () => Date.now(),
} = {}) {
  const overlay = documentRef.createElement('div');
  overlay.className = 'qr-transfer-overlay';
  overlay.setAttribute('role', 'presentation');
  documentRef.body.appendChild(overlay);

  let png = null;
  let receiveUrl = '';
  let expiresAt = null;
  let countdownTimer = null;
  let closed = false;

  const onKey = (event) => {
    if (event.key === 'Escape') close();
  };
  documentRef.addEventListener('keydown', onKey);
  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });

  function close() {
    if (closed) return;
    closed = true;
    if (countdownTimer !== null) clearInterval(countdownTimer);
    documentRef.removeEventListener('keydown', onKey);
    overlay.remove();
    trigger?.focus?.();
  }

  async function ensurePng() {
    if (!png) png = await createPng(canvas);
    return png;
  }

  async function downloadOnIpad() {
    try {
      const image = await ensurePng();
      downloadImage(image, filename);
    } catch {
      render('network');
    }
  }

  function render(state, detail = {}) {
    overlay.dataset.state = state;
    const card = documentRef.createElement('section');
    card.className = 'qr-transfer-card';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    card.setAttribute('aria-labelledby', 'qr-transfer-title');
    card.tabIndex = -1;

    const closeButton = documentRef.createElement('button');
    closeButton.className = 'statement-close qr-transfer-close';
    closeButton.type = 'button';
    closeButton.setAttribute('aria-label', '닫기');
    closeButton.textContent = '✕';
    closeButton.addEventListener('click', close);
    card.appendChild(closeButton);

    const title = documentRef.createElement('h2');
    title.id = 'qr-transfer-title';
    card.appendChild(title);

    const body = documentRef.createElement('div');
    body.className = 'qr-transfer-body';
    card.appendChild(body);

    const actions = documentRef.createElement('div');
    actions.className = 'qr-transfer-actions';
    card.appendChild(actions);

    const addButton = (label, action, className = 'choice-btn') => {
      const button = documentRef.createElement('button');
      button.type = 'button';
      button.className = className;
      button.dataset.action = action;
      button.textContent = label;
      actions.appendChild(button);
      return button;
    };

    if (state === 'uploading') {
      title.textContent = 'QR 코드를 만드는 중';
      body.textContent = '완성된 결과 카드 한 장만 10분 동안 임시 전송합니다.';
    } else if (state === 'ready') {
      title.textContent = '휴대폰으로 사진 받기';
      const hint = documentRef.createElement('p');
      hint.textContent = '휴대폰 카메라로 QR을 스캔해 결과 카드를 저장하세요.';
      body.appendChild(hint);
      const qrCanvas = documentRef.createElement('canvas');
      qrCanvas.className = 'qr-transfer-code';
      qrCanvas.setAttribute('aria-label', '결과 카드 수신 QR 코드');
      body.appendChild(qrCanvas);
      const expires = documentRef.createElement('p');
      expires.className = 'qr-transfer-expiry';
      expires.textContent = '유효 시간 10:00';
      body.appendChild(expires);

      addButton('링크 복사', 'copy').addEventListener('click', async () => {
        try {
          await clipboardRef?.writeText?.(receiveUrl);
          expires.textContent = '링크를 복사했습니다 · ' + expiryLabel(expiresAt, now);
        } catch {
          expires.textContent = '링크를 복사하지 못했습니다 · ' + expiryLabel(expiresAt, now);
        }
      });
      addButton('iPad에서 링크 공유', 'share', 'text-link').addEventListener('click', async () => {
        const outcome = await shareLink(receiveUrl);
        if (outcome !== 'shared') {
          try {
            await clipboardRef?.writeText?.(receiveUrl);
            expires.textContent = '링크를 복사했습니다 · ' + expiryLabel(expiresAt, now);
          } catch {
            expires.textContent = '링크를 복사하지 못했습니다 · ' + expiryLabel(expiresAt, now);
          }
        }
      });
      addButton('이 iPad에 저장', 'download', 'text-link').addEventListener('click', downloadOnIpad);
      overlay.replaceChildren(card);
      card.focus();
      return { card, qrCanvas, expires };
    } else if (state === 'misconfigured') {
      title.textContent = 'QR 전송을 사용할 수 없습니다';
      body.textContent = '전송 서버가 설정되지 않았습니다. 이 iPad에 결과 카드를 저장할 수 있습니다.';
      addButton('이 iPad에 저장', 'download').addEventListener('click', downloadOnIpad);
    } else if (state === 'too-large') {
      title.textContent = 'QR 전송 파일이 너무 큽니다';
      body.textContent = '결과 카드는 8MB 이하일 때 QR로 전달할 수 있습니다. 이 iPad에 직접 저장해 주세요.';
      addButton('이 iPad에 저장', 'download').addEventListener('click', downloadOnIpad);
      addButton('새 QR 만들기', 'retry', 'text-link').addEventListener('click', upload);
    } else if (state === 'expired') {
      title.textContent = 'QR 코드가 만료되었습니다';
      body.textContent = '개인정보 보호를 위해 10분 후 사진을 삭제합니다. 새 QR 코드를 만들 수 있습니다.';
      addButton('새 QR 만들기', 'retry').addEventListener('click', upload);
      addButton('이 iPad에 저장', 'download', 'text-link').addEventListener('click', downloadOnIpad);
    } else {
      title.textContent = 'QR 코드를 만들지 못했습니다';
      body.textContent = '연결을 확인한 뒤 다시 시도하거나 이 iPad에 결과 카드를 저장해 주세요.';
      addButton('다시 시도', 'retry').addEventListener('click', upload);
      addButton('이 iPad에 저장', 'download', 'text-link').addEventListener('click', downloadOnIpad);
    }

    overlay.replaceChildren(card);
    return { card };
  }

  function startCountdown(expiryElement) {
    if (countdownTimer !== null) clearInterval(countdownTimer);
    const refresh = () => {
      const seconds = remainingSeconds(expiresAt, now());
      if (seconds === 0) {
        clearInterval(countdownTimer);
        countdownTimer = null;
        render('expired');
        return;
      }
      expiryElement.textContent = expiryLabel(expiresAt, now);
    };
    refresh();
    if (!closed && countdownTimer === null) countdownTimer = setInterval(refresh, 1000);
  }

  async function upload() {
    if (countdownTimer !== null) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }

    render('uploading');
    try {
      const image = await ensurePng();
      if (!apiUrl) {
        render('misconfigured');
        return;
      }
      const transfer = await createRemoteTransfer(apiUrl, image);
      expiresAt = transfer.expiresAt;
      receiveUrl = makeReceiveUrl(transfer.token);
      const { qrCanvas, expires } = render('ready');
      await renderQr(qrCanvas, receiveUrl);
      startCountdown(expires);
    } catch (error) {
      render(error?.code === 'too-large' ? 'too-large' : 'network');
    }
  }

  const ready = upload();
  return { element: overlay, ready, close };
}

function remainingSeconds(expiresAt, currentTime) {
  return Math.max(0, Math.ceil((expiresAt - currentTime) / 1000));
}

function expiryLabel(expiresAt, now) {
  const seconds = remainingSeconds(expiresAt, now());
  return `유효 시간 ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

async function shareReceiveUrl(url, navigatorRef = typeof navigator === 'undefined' ? null : navigator) {
  if (!navigatorRef?.share) return 'unavailable';
  try {
    await navigatorRef.share({ title: 'hueman 결과 카드', url });
    return 'shared';
  } catch (error) {
    return error?.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
