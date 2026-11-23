import { render, screen } from '@testing-library/react';
import type { JSX } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { RemoteKeysProvider } from '@/core/input/RemoteKeysProvider';
import { RecordingMenu } from '../recordingMenu';
import { recordingLayer } from './recordingLayerHost';
import { CustomRecordingForm } from '../customRecordingForm';
import { fakeChannel } from '../recordingTestSupport';

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

  it('renders the form the layer carries', () => {
    const form = new CustomRecordingForm(fakeChannel(), 1_000_000);
    render(keyed(recordingLayer({ kind: 'CustomRecording', form }, { menu, confirmStop: vi.fn() }, vi.fn())));
    expect(screen.getByTestId('custom-recording-form')).toBeInTheDocument();
  });
});
