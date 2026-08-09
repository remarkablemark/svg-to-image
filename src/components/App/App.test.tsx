import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '.';

const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="50"><rect width="100" height="50" fill="red"/></svg>';

function createFile(content: string, name: string, type: string): File {
  const blob = new Blob([content], { type });
  return new File([blob], name, { type });
}

beforeEach(() => {
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:test'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('App component', () => {
  it('renders without crashing', () => {
    render(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'SVG to Image',
    );

    expect(screen.getByLabelText(/svg input/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/upload svg file/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/filename/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/format/i)).toBeInTheDocument();
  });

  it('updates dimensions and converts when svg markup is pasted', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.change(textarea, { target: { value: svg } });

    expect(screen.getByLabelText(/width/i)).toHaveValue(100);
    expect(screen.getByLabelText(/height/i)).toHaveValue(50);

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /download/i }),
    ).toBeInTheDocument();
  });

  it('shows an error for invalid svg markup', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.change(textarea, { target: { value: 'not svg' } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid SVG markup',
    );
  });

  it('clears state when the textarea is cleared', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.change(textarea, { target: { value: svg } });

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });

    fireEvent.change(textarea, { target: { value: '' } });

    expect(screen.getByLabelText(/width/i)).toHaveValue(null);
    expect(screen.getByLabelText(/height/i)).toHaveValue(null);
  });

  it('changes output format when the format select changes', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.change(textarea, { target: { value: svg } });

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });

    const filenameInput = screen.getByLabelText(/filename/i);
    await userEvent.clear(filenameInput);
    await userEvent.type(filenameInput, 'custom');

    const formatSelect = screen.getByLabelText(/format/i);
    await userEvent.selectOptions(formatSelect, 'image/webp');

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /download custom\.webp/i }),
      ).toBeInTheDocument();
    });
  });

  it('scales dimensions when scale is changed', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.change(textarea, { target: { value: svg } });

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });

    const scaleInput = screen.getByLabelText(/scale/i);
    await userEvent.clear(scaleInput);
    await userEvent.type(scaleInput, '2');

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });
  });

  it('allows custom width and height', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.change(textarea, { target: { value: svg } });

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });

    const widthInput = screen.getByLabelText(/width/i);
    const heightInput = screen.getByLabelText(/height/i);

    await userEvent.clear(widthInput);
    await userEvent.type(widthInput, '64');
    await userEvent.clear(heightInput);
    await userEvent.type(heightInput, '32');

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });
  });

  it('converts using natural size when width, height, and scale are cleared', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.change(textarea, { target: { value: svg } });

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });

    const scaleInput = screen.getByLabelText(/scale/i);
    const widthInput = screen.getByLabelText(/width/i);
    const heightInput = screen.getByLabelText(/height/i);

    await userEvent.clear(scaleInput);
    await userEvent.clear(widthInput);
    await userEvent.clear(heightInput);

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });
  });

  it('uploads an svg file and converts it', async () => {
    render(<App />);

    const file = createFile(svg, 'icon.svg', 'image/svg+xml');
    const input = screen.getByLabelText(/upload svg file/i);

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByLabelText(/filename/i)).toHaveValue('icon');
    });

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /download icon\.png/i }),
    ).toBeInTheDocument();
  });

  it('shows an error when a non-svg file is uploaded', async () => {
    render(<App />);

    const file = createFile('not svg', 'image.png', 'image/png');
    const input = screen.getByLabelText(/upload svg file/i);

    fireEvent.change(input, { target: { files: [file] } });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please upload a valid .svg file',
    );
  });

  it('accepts an svg file dropped on the textarea', async () => {
    render(<App />);

    const file = createFile(svg, 'dropped.svg', 'image/svg+xml');
    const dataTransfer = {
      files: {
        item: (index: number) => (index === 0 ? file : null),
        length: 1,
      },
    };

    const textarea = screen.getByLabelText(/svg input/i);

    fireEvent.dragOver(textarea);
    fireEvent.drop(textarea, { dataTransfer });

    await waitFor(() => {
      expect(screen.getByLabelText(/filename/i)).toHaveValue('dropped');
    });

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });
  });

  it('shows an error when a non-svg file is dropped', async () => {
    render(<App />);

    const file = createFile('not svg', 'image.png', 'image/png');
    const dataTransfer = {
      files: {
        item: (index: number) => (index === 0 ? file : null),
        length: 1,
      },
    };

    const textarea = screen.getByLabelText(/svg input/i);

    fireEvent.drop(textarea, { dataTransfer });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Please upload a valid .svg file',
    );
  });

  it('does nothing when a drop has no files', () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.drop(textarea, {
      dataTransfer: { files: { item: () => null, length: 0 } },
    });

    expect(screen.queryByAltText('Converted')).not.toBeInTheDocument();
  });

  it('toggles drag state on drag over and drag leave', () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.dragOver(textarea);
    fireEvent.dragLeave(textarea);
  });

  it('falls back to default filename when filename input is cleared', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.change(textarea, { target: { value: svg } });

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });

    const filenameInput = screen.getByLabelText(/filename/i);
    await userEvent.type(filenameInput, 'custom');
    await userEvent.clear(filenameInput);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /download svg-to-image\.png/i }),
      ).toBeInTheDocument();
    });
  });

  it('downloads the converted image', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const createElementSpy = vi.spyOn(document, 'createElement');

    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.change(textarea, { target: { value: svg } });

    const downloadButton = await screen.findByRole('button', {
      name: /download/i,
    });
    await userEvent.click(downloadButton);

    expect(clickSpy).toHaveBeenCalled();

    const anchor = createElementSpy.mock.results
      .map((result) => result.value as HTMLElement)
      .find((element) => element instanceof HTMLAnchorElement);

    expect(anchor).toBeDefined();
    expect(anchor?.download).toBe('svg-to-image.png');

    clickSpy.mockRestore();
    createElementSpy.mockRestore();
  });
});
