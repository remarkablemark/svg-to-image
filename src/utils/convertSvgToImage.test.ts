import { convertSvgToImage, parseSvgSize } from './convertSvgToImage';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50" viewBox="0 0 100 50"><rect width="100" height="50" fill="red"/></svg>`;

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('parseSvgSize', () => {
  it('returns width and height from svg attributes', () => {
    expect(parseSvgSize(svg)).toEqual({ height: 50, width: 100 });
  });

  it('falls back to viewBox when width and height are missing', () => {
    const svgWithoutSize = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 40"><rect width="80" height="40"/></svg>`;
    expect(parseSvgSize(svgWithoutSize)).toEqual({ height: 40, width: 80 });
  });

  it('falls back to default size when width, height, and viewBox are missing', () => {
    const svgWithoutDimensions = `<svg xmlns="http://www.w3.org/2000/svg"><rect/></svg>`;
    expect(parseSvgSize(svgWithoutDimensions)).toEqual({
      height: 300,
      width: 300,
    });
  });

  it('ignores non-numeric width and height values', () => {
    const svgWithInvalidLength = `<svg xmlns="http://www.w3.org/2000/svg" width="abc" height="def" viewBox="0 0 80 40"><rect/></svg>`;
    expect(parseSvgSize(svgWithInvalidLength)).toEqual({
      height: 40,
      width: 80,
    });
  });

  it('ignores malformed viewBox values', () => {
    const svgWithBadViewBox = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100"><rect/></svg>`;
    expect(parseSvgSize(svgWithBadViewBox)).toEqual({
      height: 300,
      width: 300,
    });
  });

  it('throws an error for invalid svg markup', () => {
    expect(() => parseSvgSize('<div></div>')).toThrow('Invalid SVG markup');
  });

  it('throws an error when dimensions are invalid', () => {
    const svgWithInvalidDimensions = `<svg xmlns="http://www.w3.org/2000/svg" width="0" height="0"><rect/></svg>`;
    expect(() => parseSvgSize(svgWithInvalidDimensions)).toThrow(
      'Could not determine SVG dimensions',
    );
  });
});

describe('convertSvgToImage', () => {
  it('converts svg to png with default options', async () => {
    const result = await convertSvgToImage(svg);
    expect(result.dataUrl).toBe('data:image/png;base64,test');
    expect(result.filename).toBe('svg-to-image.png');
    expect(result.width).toBe(100);
    expect(result.height).toBe(50);
  });

  it('converts svg to jpeg with white background', async () => {
    const result = await convertSvgToImage(svg, { format: 'image/jpeg' });
    expect(result.dataUrl).toBe('data:image/jpeg;base64,test-0.92');
    expect(result.filename).toBe('svg-to-image.jpg');
  });

  it('converts svg to webp with custom quality', async () => {
    const result = await convertSvgToImage(svg, {
      format: 'image/webp',
      quality: 0.8,
    });
    expect(result.dataUrl).toBe('data:image/webp;base64,test-0.8');
    expect(result.filename).toBe('svg-to-image.webp');
  });

  it('scales the output dimensions', async () => {
    const result = await convertSvgToImage(svg, { scale: 2 });
    expect(result.width).toBe(200);
    expect(result.height).toBe(100);
  });

  it('uses custom width and height', async () => {
    const result = await convertSvgToImage(svg, { height: 20, width: 30 });
    expect(result.width).toBe(30);
    expect(result.height).toBe(20);
  });

  it('uses the provided filename base', async () => {
    const result = await convertSvgToImage(svg, {
      filename: 'icon.svg',
      format: 'image/png',
    });
    expect(result.filename).toBe('icon.png');
  });

  it('throws an error for empty svg', async () => {
    await expect(convertSvgToImage('   ')).rejects.toThrow(
      'SVG markup is empty',
    );
  });

  it('throws an error when the image fails to load', async () => {
    class FailingImage {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      src = '';

      constructor() {
        setTimeout(() => {
          this.onerror?.();
        }, 0);
      }
    }

    vi.stubGlobal('Image', FailingImage);

    await expect(convertSvgToImage(svg)).rejects.toThrow(
      'Failed to load SVG image',
    );

    vi.unstubAllGlobals();
  });

  it('throws an error when the canvas context is unavailable', async () => {
    /* eslint-disable @typescript-eslint/unbound-method */
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
    ) {
      return null;
    };

    await expect(convertSvgToImage(svg)).rejects.toThrow(
      'Could not get canvas context',
    );

    HTMLCanvasElement.prototype.getContext = originalGetContext;
    /* eslint-enable @typescript-eslint/unbound-method */
  });
});
