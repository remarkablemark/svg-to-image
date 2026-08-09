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
    expect(screen.getByLabelText(/format/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /convert/i })).toBeDisabled();
  });

  it('updates dimensions when svg markup is pasted', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    await userEvent.clear(textarea);
    await userEvent.type(textarea, svg);

    expect(screen.getByLabelText(/width/i)).toHaveValue(100);
    expect(screen.getByLabelText(/height/i)).toHaveValue(50);
  });

  it('shows an error for invalid svg markup', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    await userEvent.type(textarea, 'not svg');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Invalid SVG markup',
    );
    expect(screen.getByRole('button', { name: /convert/i })).toBeDisabled();
  });

  it('clears state when the textarea is cleared', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    await userEvent.type(textarea, svg);
    await userEvent.clear(textarea);

    expect(screen.getByLabelText(/width/i)).toHaveValue(null);
    expect(screen.getByLabelText(/height/i)).toHaveValue(null);
    expect(screen.getByRole('button', { name: /convert/i })).toBeDisabled();
  });

  it('converts svg when the convert button is clicked', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    await userEvent.type(textarea, svg);

    const convertButton = screen.getByRole('button', { name: /convert/i });
    await userEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /download/i }),
    ).toBeInTheDocument();
  });

  it('changes output format when the format select changes', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    await userEvent.type(textarea, svg);

    const formatSelect = screen.getByLabelText(/format/i);
    await userEvent.selectOptions(formatSelect, 'image/webp');

    const convertButton = screen.getByRole('button', { name: /convert/i });
    await userEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /download svg-to-image\.webp/i }),
    ).toBeInTheDocument();
  });

  it('scales dimensions when scale is changed', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    await userEvent.type(textarea, svg);

    const scaleInput = screen.getByLabelText(/scale/i);
    await userEvent.clear(scaleInput);
    await userEvent.type(scaleInput, '2');

    const convertButton = screen.getByRole('button', { name: /convert/i });
    await userEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });
  });

  it('allows custom width and height', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    await userEvent.type(textarea, svg);

    const widthInput = screen.getByLabelText(/width/i);
    const heightInput = screen.getByLabelText(/height/i);

    await userEvent.clear(widthInput);
    await userEvent.type(widthInput, '64');
    await userEvent.clear(heightInput);
    await userEvent.type(heightInput, '32');

    const convertButton = screen.getByRole('button', { name: /convert/i });
    await userEvent.click(convertButton);

    await waitFor(() => {
      expect(screen.getByAltText('Converted')).toBeInTheDocument();
    });
  });

  it('converts using natural size when width, height, and scale are cleared', async () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    await userEvent.type(textarea, svg);

    const scaleInput = screen.getByLabelText(/scale/i);
    const widthInput = screen.getByLabelText(/width/i);
    const heightInput = screen.getByLabelText(/height/i);

    await userEvent.clear(scaleInput);
    await userEvent.clear(widthInput);
    await userEvent.clear(heightInput);

    const convertButton = screen.getByRole('button', { name: /convert/i });
    await userEvent.click(convertButton);

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
      expect(screen.getByText('icon.svg')).toBeInTheDocument();
    });

    const convertButton = screen.getByRole('button', { name: /convert/i });
    await userEvent.click(convertButton);

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
      expect(screen.getByText('dropped.svg')).toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: /convert/i })).toBeDisabled();
  });

  it('toggles drag state on drag over and drag leave', () => {
    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    fireEvent.dragOver(textarea);
    fireEvent.dragLeave(textarea);
  });

  it('downloads the converted image', async () => {
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click');
    const createElementSpy = vi.spyOn(document, 'createElement');

    render(<App />);

    const textarea = screen.getByLabelText(/svg input/i);
    await userEvent.type(textarea, svg);

    const convertButton = screen.getByRole('button', { name: /convert/i });
    await userEvent.click(convertButton);

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
