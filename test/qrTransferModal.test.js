// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TransferError } from '../src/photoTransfer.js';
import { openQrTransferModal } from '../src/qrTransferModal.js';

const API = 'https://transfer.example';
const TOKEN = '1760000600000.123e4567-e89b-42d3-a456-426614174000';
const PNG = new Blob(['result'], { type: 'image/png' });

function modalOptions(overrides = {}) {
  return {
    canvas: document.createElement('canvas'),
    filename: 'hueman-result-joy.png',
    apiUrl: API,
    createPng: vi.fn().mockResolvedValue(PNG),
    createRemoteTransfer: vi.fn().mockResolvedValue({ token: TOKEN, expiresAt: 600000 }),
    makeReceiveUrl: (token) => `https://dhoklim.github.io/hueman/receive.html#${token}`,
    renderQr: vi.fn().mockResolvedValue(),
    shareImage: vi.fn().mockResolvedValue('shared'),
    downloadImage: vi.fn(),
    shareLink: vi.fn().mockResolvedValue('shared'),
    clipboardRef: { writeText: vi.fn().mockResolvedValue() },
    now: () => 0,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('openQrTransferModal', () => {
  it('uploads the final PNG after opening and renders a local receiver QR', async () => {
    const createRemoteTransfer = vi.fn().mockResolvedValue({ token: TOKEN, expiresAt: 600000 });
    const renderQr = vi.fn().mockResolvedValue();
    const modal = openQrTransferModal(modalOptions({ createRemoteTransfer, renderQr }));

    await modal.ready;

    expect(modal.element.dataset.state).toBe('ready');
    expect(createRemoteTransfer).toHaveBeenCalledWith(API, PNG);
    expect(renderQr).toHaveBeenCalledWith(
      modal.element.querySelector('canvas'),
      `https://dhoklim.github.io/hueman/receive.html#${TOKEN}`,
    );
    expect(modal.element.textContent).toContain('10:00');
  });

  it('offers retry after an upload failure and returns focus to its trigger on close', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const createRemoteTransfer = vi.fn()
      .mockRejectedValueOnce(new TransferError('network', 'offline'))
      .mockResolvedValueOnce({ token: TOKEN, expiresAt: 600000 });
    const modal = openQrTransferModal(modalOptions({ trigger, createRemoteTransfer }));

    await modal.ready;
    expect(modal.element.dataset.state).toBe('network');
    modal.element.querySelector('[data-action="retry"]').click();
    await vi.waitFor(() => expect(modal.element.dataset.state).toBe('ready'));

    modal.close();
    expect(document.activeElement).toBe(trigger);
  });

  it('turns an elapsed QR into a new-QR state', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const modal = openQrTransferModal(modalOptions({
      createRemoteTransfer: vi.fn().mockResolvedValue({ token: TOKEN, expiresAt: 1000 }),
      now: () => Date.now(),
    }));

    await modal.ready;
    await vi.advanceTimersByTimeAsync(1000);

    expect(modal.element.dataset.state).toBe('expired');
    expect(modal.element.querySelector('[data-action="retry"]')).toBeTruthy();
  });

  it('copies the QR address and falls back from unavailable link sharing to copying', async () => {
    const clipboardRef = { writeText: vi.fn().mockResolvedValue() };
    const shareLink = vi.fn().mockResolvedValue('unavailable');
    const modal = openQrTransferModal(modalOptions({ clipboardRef, shareLink }));

    await modal.ready;
    modal.element.querySelector('[data-action="copy"]').click();
    await vi.waitFor(() => expect(clipboardRef.writeText).toHaveBeenCalledWith(
      `https://dhoklim.github.io/hueman/receive.html#${TOKEN}`,
    ));
    modal.element.querySelector('[data-action="share"]').click();
    await vi.waitFor(() => expect(shareLink).toHaveBeenCalledWith(
      `https://dhoklim.github.io/hueman/receive.html#${TOKEN}`,
    ));
    expect(clipboardRef.writeText).toHaveBeenCalledTimes(2);
  });

  it('keeps direct iPad saving available when the Worker address is not configured', async () => {
    const downloadImage = vi.fn();
    const shareImage = vi.fn().mockResolvedValue('unavailable');
    const modal = openQrTransferModal(modalOptions({ apiUrl: null, downloadImage, shareImage }));

    await modal.ready;
    expect(modal.element.dataset.state).toBe('misconfigured');
    expect(modal.element.textContent).toContain('전송 서버가 설정되지 않았습니다');
    modal.element.querySelector('[data-action="download"]').click();
    await vi.waitFor(() => expect(shareImage).toHaveBeenCalledWith(PNG, 'hueman-result-joy.png'));
    await vi.waitFor(() => expect(downloadImage).toHaveBeenCalledWith(PNG, 'hueman-result-joy.png'));
  });

  it('prefers iPad Web Share for a direct result-card save', async () => {
    const shareImage = vi.fn().mockResolvedValue('shared');
    const downloadImage = vi.fn();
    const modal = openQrTransferModal(modalOptions({ apiUrl: null, shareImage, downloadImage }));

    await modal.ready;
    modal.element.querySelector('[data-action="download"]').click();

    await vi.waitFor(() => expect(shareImage).toHaveBeenCalledWith(PNG, 'hueman-result-joy.png'));
    expect(downloadImage).not.toHaveBeenCalled();
  });

  it('closes with Escape and removes the dialog from the page', async () => {
    const modal = openQrTransferModal(modalOptions());
    await modal.ready;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(document.querySelector('.qr-transfer-overlay')).toBeNull();
  });
});
