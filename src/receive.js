import {
  downloadBlob,
  fetchTransfer,
  getTransferApiUrl,
  isTransferToken,
  sharePng,
} from './photoTransfer.js';

const MESSAGE = {
  expired: '링크가 만료되었습니다. iPad에서 새 QR을 요청해 주세요.',
  'not-found': '사진을 찾을 수 없습니다. QR을 다시 스캔해 주세요.',
  network: '연결을 확인한 뒤 다시 시도해 주세요.',
  misconfigured: '전송 서버가 아직 설정되지 않았습니다.',
  'invalid-token': '올바른 QR 링크가 아닙니다.',
  server: '사진을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',
};

const objectUrls = new WeakMap();

export function tokenFromHash(hash) {
  try {
    const token = decodeURIComponent(String(hash || '').replace(/^#/, ''));
    return isTransferToken(token) ? token : null;
  } catch {
    return null;
  }
}

export async function renderReceiver(
  root,
  {
    token,
    apiUrl = getTransferApiUrl(),
    fetchImage = fetchTransfer,
    shareImage = sharePng,
    downloadImage = downloadBlob,
    urlRef = typeof URL === 'undefined' ? null : URL,
    documentRef = root?.ownerDocument || document,
  } = {},
) {
  if (!root) return null;
  revokeObjectUrl(root);

  if (!isTransferToken(token)) return renderMessage(root, documentRef, 'invalid-token');
  if (!apiUrl) return renderMessage(root, documentRef, 'misconfigured');

  renderMessage(root, documentRef, 'loading', '사진을 불러오는 중입니다…');
  try {
    const blob = await fetchImage(apiUrl, token);
    if (!blob || blob.type !== 'image/png' || !urlRef?.createObjectURL) {
      throw { code: 'server' };
    }
    const imageUrl = urlRef.createObjectURL(blob);
    objectUrls.set(root, { imageUrl, urlRef });
    return renderImage(root, documentRef, blob, imageUrl, shareImage, downloadImage);
  } catch (error) {
    const state = MESSAGE[error?.code] ? error.code : 'network';
    return renderMessage(root, documentRef, state);
  }
}

export function startReceiverPage({
  documentRef = typeof document === 'undefined' ? null : document,
  locationRef = typeof window === 'undefined' ? null : window.location,
} = {}) {
  const root = documentRef?.getElementById('receive-app');
  if (!root || !locationRef) return null;
  return renderReceiver(root, {
    token: tokenFromHash(locationRef.hash),
    apiUrl: getTransferApiUrl(undefined, locationRef.origin),
    documentRef,
  });
}

function renderImage(root, documentRef, blob, imageUrl, shareImage, downloadImage) {
  root.dataset.state = 'ready';
  const card = documentRef.createElement('section');
  card.className = 'receiver-card';

  const title = documentRef.createElement('h1');
  title.textContent = '당신의 hueman 결과 카드';
  card.appendChild(title);

  const image = documentRef.createElement('img');
  image.className = 'receiver-image';
  image.src = imageUrl;
  image.alt = 'hueman 결과 카드';
  card.appendChild(image);

  const save = documentRef.createElement('button');
  save.type = 'button';
  save.className = 'receiver-save';
  save.dataset.action = 'save';
  save.textContent = '사진 저장·공유';
  save.addEventListener('click', async () => {
    const outcome = await shareImage(blob, 'hueman-result.png');
    if (outcome !== 'shared') {
      downloadImage(blob, 'hueman-result.png');
      const hint = documentRef.createElement('p');
      hint.className = 'receiver-hint';
      hint.textContent = '다운로드가 시작되었습니다. 이미지를 길게 눌러 사진 앱에 저장할 수도 있습니다.';
      card.appendChild(hint);
    }
  });
  card.appendChild(save);

  const privacy = documentRef.createElement('p');
  privacy.className = 'receiver-privacy';
  privacy.textContent = '이 링크는 개인정보 보호를 위해 생성 후 10분이 지나면 만료됩니다.';
  card.appendChild(privacy);

  root.replaceChildren(card);
  return card;
}

function renderMessage(root, documentRef, state, overrideMessage) {
  root.dataset.state = state;
  const card = documentRef.createElement('section');
  card.className = 'receiver-card receiver-message';
  const title = documentRef.createElement('h1');
  title.textContent = state === 'loading' ? 'hueman 결과 카드' : '사진을 열 수 없습니다';
  const copy = documentRef.createElement('p');
  copy.textContent = overrideMessage || MESSAGE[state] || MESSAGE.server;
  card.append(title, copy);
  root.replaceChildren(card);
  return card;
}

function revokeObjectUrl(root) {
  const active = objectUrls.get(root);
  if (!active) return;
  active.urlRef?.revokeObjectURL?.(active.imageUrl);
  objectUrls.delete(root);
}

if (typeof document !== 'undefined' && document.getElementById('receive-app')) {
  startReceiverPage();
}
