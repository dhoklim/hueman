// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransferError } from '../src/photoTransfer.js';
import { renderReceiver, tokenFromHash } from '../src/receive.js';

const API = 'https://transfer.example';
const TOKEN = '1760000600000.123e4567-e89b-42d3-a456-426614174000';
const PNG = new Blob(['result'], { type: 'image/png' });

function receiverOptions(overrides = {}) {
  return {
    token: TOKEN,
    apiUrl: API,
    fetchImage: vi.fn().mockResolvedValue(PNG),
    shareImage: vi.fn().mockResolvedValue('shared'),
    downloadImage: vi.fn(),
    urlRef: {
      createObjectURL: vi.fn().mockReturnValue('blob:hueman-result'),
      revokeObjectURL: vi.fn(),
    },
    ...overrides,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('tokenFromHash', () => {
  it('accepts a bearer token only from the fragment', () => {
    expect(tokenFromHash(`#${TOKEN}`)).toBe(TOKEN);
  });

  it('does not accept a missing, malformed, or broken-encoding fragment', () => {
    expect(tokenFromHash('')).toBeNull();
    expect(tokenFromHash('#not-a-token')).toBeNull();
    expect(tokenFromHash('#%E0%A4%A')).toBeNull();
  });
});

describe('renderReceiver', () => {
  it('shows the private result card and uses file sharing when available', async () => {
    const root = document.createElement('main');
    const shareImage = vi.fn().mockResolvedValue('shared');
    const options = receiverOptions({ shareImage });

    await renderReceiver(root, options);

    expect(root.dataset.state).toBe('ready');
    expect(root.querySelector('img')).toHaveProperty('src', 'blob:hueman-result');
    root.querySelector('[data-action="save"]').click();
    await vi.waitFor(() => expect(shareImage).toHaveBeenCalledWith(PNG, 'hueman-result.png'));
  });

  it('shows invalid-token before trying to contact the Worker', async () => {
    const root = document.createElement('main');
    const fetchImage = vi.fn();

    await renderReceiver(root, receiverOptions({ token: '', fetchImage }));

    expect(root.dataset.state).toBe('invalid-token');
    expect(root.textContent).toContain('올바른 QR 링크가 아닙니다');
    expect(fetchImage).not.toHaveBeenCalled();
  });

  it('shows misconfigured before trying to contact the Worker', async () => {
    const root = document.createElement('main');
    const fetchImage = vi.fn();

    await renderReceiver(root, receiverOptions({ apiUrl: null, fetchImage }));

    expect(root.dataset.state).toBe('misconfigured');
    expect(root.textContent).toContain('전송 서버가 아직 설정되지 않았습니다');
    expect(fetchImage).not.toHaveBeenCalled();
  });

  it('explains that a Worker 410 is an expired privacy link', async () => {
    const root = document.createElement('main');

    await renderReceiver(root, receiverOptions({
      fetchImage: vi.fn().mockRejectedValue(new TransferError('expired', 'expired', 410)),
    }));

    expect(root.dataset.state).toBe('expired');
    expect(root.textContent).toContain('링크가 만료되었습니다');
  });

  it('offers a download when the device cannot share image files', async () => {
    const root = document.createElement('main');
    const downloadImage = vi.fn();

    await renderReceiver(root, receiverOptions({
      shareImage: vi.fn().mockResolvedValue('unavailable'),
      downloadImage,
    }));
    root.querySelector('[data-action="save"]').click();

    await vi.waitFor(() => expect(downloadImage).toHaveBeenCalledWith(PNG, 'hueman-result.png'));
    expect(root.textContent).toContain('길게 눌러 사진 앱에 저장');
  });

  it.each([
    ['not-found', '사진을 찾을 수 없습니다'],
    ['network', '연결을 확인한 뒤 다시 시도해 주세요'],
  ])('shows the %s receiver failure', async (code, copy) => {
    const root = document.createElement('main');

    await renderReceiver(root, receiverOptions({
      fetchImage: vi.fn().mockRejectedValue(new TransferError(code, code)),
    }));

    expect(root.dataset.state).toBe(code);
    expect(root.textContent).toContain(copy);
  });
});
