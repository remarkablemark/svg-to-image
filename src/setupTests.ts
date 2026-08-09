import '@testing-library/jest-dom/vitest';

/* v8 ignore start */
class MockImage {
  onerror: (() => void) | null = null;
  onload: (() => void) | null = null;
  src = '';

  constructor() {
    setTimeout(() => {
      this.onload?.();
    }, 0);
  }
}

Object.defineProperty(globalThis, 'Image', {
  configurable: true,
  value: MockImage,
  writable: true,
});

class MockCanvasRenderingContext2D {
  canvas = { height: 0, width: 0 };
  fillStyle = '';

  drawImage = (): void => undefined;

  fillRect = (): void => undefined;

  getImageData = () => ({ data: new Uint8ClampedArray(0) });
}

Object.defineProperty(globalThis.HTMLCanvasElement.prototype, 'getContext', {
  value: function getContext(this: HTMLCanvasElement, contextId: string) {
    return contextId === '2d' ? new MockCanvasRenderingContext2D() : null;
  },
});

Object.defineProperty(globalThis.HTMLCanvasElement.prototype, 'toDataURL', {
  value: function toDataURL(
    this: HTMLCanvasElement,
    type: string,
    quality?: number,
  ) {
    const qualitySuffix = quality !== undefined ? `-${String(quality)}` : '';
    return `data:${type};base64,test${qualitySuffix}`;
  },
});
/* v8 ignore stop */
