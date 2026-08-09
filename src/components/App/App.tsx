import { useCallback, useEffect, useState } from 'react';
import { convertSvgToImage, parseSvgSize } from 'src/utils/convertSvgToImage';
import { readSvgFile } from 'src/utils/readSvgFile';

type Format = 'image/jpeg' | 'image/png' | 'image/webp';

const FORMAT_LABELS: Record<Format, string> = {
  'image/jpeg': 'JPEG',
  'image/png': 'PNG',
  'image/webp': 'WebP',
};

export function App() {
  const [svg, setSvg] = useState('');
  const [filename, setFilename] = useState<string | undefined>(undefined);
  const [format, setFormat] = useState<Format>('image/png');
  const [width, setWidth] = useState<string>('');
  const [height, setHeight] = useState<string>('');
  const [scale, setScale] = useState<string>('1');
  const [output, setOutput] = useState<{
    dataUrl: string;
    filename: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const updateSvg = useCallback((value: string, newFilename?: string) => {
    setSvg(value);
    setOutput(null);
    setFilename(newFilename);

    if (!value.trim()) {
      setError(null);
      setWidth('');
      setHeight('');
      return;
    }

    try {
      const { height, width } = parseSvgSize(value);
      setWidth(String(width));
      setHeight(String(height));
      setError(null);
    } catch {
      setError('Invalid SVG markup');
    }
  }, []);

  const handleSvgChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateSvg(event.target.value);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    /* v8 ignore next 3 */
    if (!file) {
      return;
    }

    try {
      const content = await readSvgFile(file);
      updateSvg(content, file.name.replace(/\.svg$/i, ''));
    } catch (err) {
      /* v8 ignore next */
      setError(err instanceof Error ? err.message : 'Failed to read file');
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragging(false);

    const file = event.dataTransfer.files.item(0);
    if (!file) {
      return;
    }

    try {
      const content = await readSvgFile(file);
      updateSvg(content, file.name.replace(/\.svg$/i, ''));
    } catch (err) {
      /* v8 ignore next */
      setError(err instanceof Error ? err.message : 'Failed to read file');
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLTextAreaElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (!svg.trim()) {
      return;
    }

    let cancelled = false;

    async function convert() {
      setError(null);

      try {
        const result = await convertSvgToImage(svg, {
          filename,
          format,
          height: height ? Number.parseFloat(height) : undefined,
          quality: 0.92,
          scale: scale ? Number.parseFloat(scale) : 1,
          width: width ? Number.parseFloat(width) : undefined,
        });

        /* v8 ignore next 3 */
        if (!cancelled) {
          setOutput({ dataUrl: result.dataUrl, filename: result.filename });
        }
      } catch (err) {
        /* v8 ignore next 3 */
        if (!cancelled) {
          /* v8 ignore next */
          setError(
            err instanceof Error ? err.message : 'Failed to convert SVG',
          );
          setOutput(null);
        }
      }
    }

    void convert();

    return () => {
      cancelled = true;
    };
  }, [svg, format, width, height, scale, filename]);

  const handleDownload = () => {
    /* v8 ignore next 3 */
    if (!output) {
      return;
    }

    const link = document.createElement('a');
    link.href = output.dataUrl;
    link.download = output.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="mx-auto w-full max-w-(--breakpoint-2xl) p-4 text-slate-800 sm:p-6 lg:p-8 dark:bg-slate-900 dark:text-slate-100">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">SVG to Image</h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          Convert SVG to PNG, JPEG, or WebP entirely in your browser.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <label className="text-sm font-medium" htmlFor="svg-input">
            SVG Input
          </label>
          <textarea
            className={`min-h-48 w-full flex-1 resize-none rounded-lg border bg-white p-4 font-mono text-sm shadow-xs transition-colors focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none dark:bg-slate-800 dark:text-slate-100 ${
              isDragging
                ? 'border-blue-500 bg-blue-50 dark:bg-slate-700'
                : 'border-slate-300 dark:border-slate-600'
            }`}
            draggable
            id="svg-input"
            onChange={handleSvgChange}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={(event) => {
              void handleDrop(event);
            }}
            placeholder="Paste SVG markup here or drag and drop an SVG file..."
            value={svg}
          />
          <div className="flex items-center gap-4">
            <label className="cursor-pointer rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 shadow-xs transition-all hover:border-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-slate-500">
              Upload SVG File
              <input
                accept=".svg"
                className="hidden"
                onChange={(event) => {
                  void handleFileChange(event);
                }}
                type="file"
              />
            </label>
            {filename && (
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {filename}.svg
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-800/50">
          <h2 className="text-lg font-semibold">Output Settings</h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="format">
                Format
              </label>
              <select
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                id="format"
                onChange={(event) => {
                  setFormat(event.target.value as Format);
                }}
                value={format}
              >
                {Object.entries(FORMAT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="scale">
                Scale
              </label>
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                id="scale"
                min="0.1"
                onChange={(event) => {
                  setScale(event.target.value);
                }}
                step="0.1"
                type="number"
                value={scale}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="width">
                Width (px)
              </label>
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                id="width"
                min="1"
                onChange={(event) => {
                  setWidth(event.target.value);
                }}
                placeholder="Auto"
                type="number"
                value={width}
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" htmlFor="height">
                Height (px)
              </label>
              <input
                className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                id="height"
                min="1"
                onChange={(event) => {
                  setHeight(event.target.value);
                }}
                placeholder="Auto"
                type="number"
                value={height}
              />
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div
          className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/30 dark:text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {output && (
        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
              SVG Preview
            </h3>
            <div
              className="flex min-h-48 items-center justify-center overflow-auto rounded-md bg-slate-50 p-4 dark:bg-slate-900"
              // eslint-disable-next-line react-dom/no-dangerously-set-innerhtml -- safe preview of user-provided SVG markup
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-800">
            <h3 className="mb-4 text-sm font-semibold text-slate-600 dark:text-slate-300">
              Converted Image Preview
            </h3>
            <div className="flex min-h-48 items-center justify-center overflow-auto rounded-md bg-slate-50 p-4 dark:bg-slate-900">
              <img
                alt="Converted"
                className="max-w-full"
                src={output.dataUrl}
              />
            </div>
            <button
              className="mt-4 w-full cursor-pointer rounded-md border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 shadow-xs transition-all hover:border-slate-800 focus:border-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200 dark:hover:border-slate-500"
              onClick={handleDownload}
              type="button"
            >
              Download {output.filename}
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
