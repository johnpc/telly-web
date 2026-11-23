import { render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { RecordingMenu } from '../recordingMenu';
import { recordingLayer } from './recordingLayerHost';

const menu = new RecordingMenu({
  center: { toggleInstant: vi.fn(), scheduleProgramme: vi.fn(), stop: vi.fn() },
  clock: () => 0,
  show: vi.fn(),
});

const keyed = (element: JSX.Element): JSX.Element => (
  <RemoteKeysProvider onBack={() => undefined}>{element}</RemoteKeysProvider>
);

describe('recordingLayer', () => {
  it('renders the Stop confirm for a RecordingStop layer', () => {
    const confirmStop = vi.fn();
    render(
      keyed(
        recordingLayer(
          { kind: 'RecordingStop', recordingId: 4, channelName: 'News One' },
          { menu, confirmStop },
          () => undefined,
        ),
      ),
    );
    expect(screen.getByText('Stop recording?')).toBeInTheDocument();
    expect(screen.getByText(/The recording of "News One"/)).toBeInTheDocument();
  });

  it('renders nothing for the form layer while no form is primed', () => {
    render(keyed(recordingLayer({ kind: 'CustomRecording' }, { menu, confirmStop: vi.fn() }, vi.fn())));
    expect(screen.queryByTestId('custom-recording-form')).toBeNull();
  });
});
