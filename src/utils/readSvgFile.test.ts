import { readSvgFile } from './readSvgFile';

function createFile(content: string, name: string, type: string): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

describe('readSvgFile', () => {
  it('reads an svg file and returns its text content', async () => {
    const file = createFile('<svg></svg>', 'icon.svg', 'image/svg+xml');
    const result = await readSvgFile(file);
    expect(result).toBe('<svg></svg>');
  });

  it('rejects when the file type is not svg', async () => {
    const file = createFile('not svg', 'image.png', 'image/png');
    await expect(readSvgFile(file)).rejects.toThrow(
      'Please upload a valid .svg file',
    );
  });

  it('accepts a file with the .svg extension even when the MIME type is wrong', async () => {
    const file = createFile(
      '<svg></svg>',
      'icon.svg',
      'application/octet-stream',
    );
    const result = await readSvgFile(file);
    expect(result).toBe('<svg></svg>');
  });

  it('rejects when FileReader emits an error', async () => {
    const file = createFile('<svg></svg>', 'icon.svg', 'image/svg+xml');
    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      onerror: (() => void) | null = null;
      onload: ((event: { target: { result: unknown } }) => void) | null = null;

      readAsText() {
        setTimeout(() => {
          this.onerror?.();
        }, 0);
      }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;

    await expect(readSvgFile(file)).rejects.toThrow('Failed to read SVG file');

    globalThis.FileReader = originalFileReader;
  });

  it('rejects when FileReader returns a non-string result', async () => {
    const file = createFile('<svg></svg>', 'icon.svg', 'image/svg+xml');
    const originalFileReader = globalThis.FileReader;

    class MockFileReader {
      onerror: (() => void) | null = null;
      onload: ((event: { target: { result: unknown } }) => void) | null = null;

      readAsText() {
        setTimeout(() => {
          this.onload?.({ target: { result: null } });
        }, 0);
      }
    }

    globalThis.FileReader = MockFileReader as unknown as typeof FileReader;

    await expect(readSvgFile(file)).rejects.toThrow('Failed to read SVG file');

    globalThis.FileReader = originalFileReader;
  });
});
