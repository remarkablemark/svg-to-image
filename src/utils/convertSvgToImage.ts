type Format = 'image/jpeg' | 'image/png' | 'image/webp';

interface ConvertSvgToImageOptions {
  filename?: string;
  format?: Format;
  height?: number;
  quality?: number;
  scale?: number;
  width?: number;
}

interface ConvertSvgToImageResult {
  dataUrl: string;
  filename: string;
  height: number;
  width: number;
}

const DEFAULT_QUALITY = 0.92;
const EXTENSIONS: Record<Format, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};
const FALLBACK_SIZE = 300;

/**
 * Parses an SVG string and returns its intrinsic width and height in pixels.
 */
export function parseSvgSize(svg: string): {
  height: number;
  width: number;
} {
  const parser = new DOMParser();
  const document = parser.parseFromString(svg, 'image/svg+xml');
  const svgElement = document.documentElement;

  if (svgElement.tagName.toLowerCase() !== 'svg') {
    throw new Error('Invalid SVG markup');
  }

  const parseLength = (value: string | null): number | null => {
    if (!value) {
      return null;
    }
    const match = /^\s*([\d.]+)/.exec(value);
    return match ? Number.parseFloat(match[1]) : null;
  };

  let width = parseLength(svgElement.getAttribute('width'));
  let height = parseLength(svgElement.getAttribute('height'));
  const viewBox = svgElement.getAttribute('viewBox');

  if (viewBox) {
    const parts = viewBox.split(/\s+/).map(Number.parseFloat);
    if (parts.length === 4) {
      const viewBoxWidth = parts[2];
      const viewBoxHeight = parts[3];
      width = width ?? viewBoxWidth;
      height = height ?? viewBoxHeight;
    }
  }

  width = width ?? FALLBACK_SIZE;
  height = height ?? FALLBACK_SIZE;

  if (
    !Number.isFinite(width) ||
    width <= 0 ||
    !Number.isFinite(height) ||
    height <= 0
  ) {
    throw new Error('Could not determine SVG dimensions');
  }

  return { height, width };
}

/**
 * Converts an SVG string into a raster image data URL using an HTML canvas.
 */
export async function convertSvgToImage(
  svg: string,
  options: ConvertSvgToImageOptions = {},
): Promise<ConvertSvgToImageResult> {
  const {
    filename: baseFilename,
    format = 'image/png',
    height: customHeight,
    quality = DEFAULT_QUALITY,
    scale = 1,
    width: customWidth,
  } = options;

  const isLossy = format === 'image/jpeg' || format === 'image/webp';

  if (!svg.trim()) {
    throw new Error('SVG markup is empty');
  }

  const naturalSize = parseSvgSize(svg);

  let width = customWidth ?? naturalSize.width;
  let height = customHeight ?? naturalSize.height;
  width *= scale;
  height *= scale;

  const image = new Image();
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => {
        resolve();
      };
      image.onerror = () => {
        reject(new Error('Failed to load SVG image'));
      };
      image.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Could not get canvas context');
    }

    if (format === 'image/jpeg') {
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, width, height);
    }

    context.drawImage(image, 0, 0, width, height);

    const dataUrl = canvas.toDataURL(format, isLossy ? quality : undefined);

    const extension = EXTENSIONS[format];
    const filename = baseFilename
      ? `${baseFilename.replace(/\.svg$/i, '')}.${extension}`
      : `svg-to-image.${extension}`;

    return { dataUrl, filename, height, width };
  } finally {
    URL.revokeObjectURL(url);
  }
}
