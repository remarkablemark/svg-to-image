/**
 * Reads an .svg file and returns its text content.
 */
export function readSvgFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.type !== 'image/svg+xml' && !file.name.endsWith('.svg')) {
      reject(new Error('Please upload a valid .svg file'));
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;
      if (typeof result === 'string') {
        resolve(result);
      } else {
        reject(new Error('Failed to read SVG file'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read SVG file'));
    };

    reader.readAsText(file);
  });
}
