import { act, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PLAYING } from '../connection/engineState';
import { stubMediaPlayback } from '../testSupport';
import { createVideoElement } from './videoElement';
import { VideoSurface } from './VideoSurface';
import { WebPlayerEngine } from '../engine/webPlayerEngine';

function engineWithVideo(): WebPlayerEngine {
  stubMediaPlayback();
  const engine = new WebPlayerEngine({
    transportFor: () => Promise.reject(new Error('unused')),
    ticker: null,
    telemetry: null,
  });
  engine.attach(createVideoElement());
  return engine;
}

describe('VideoSurface', () => {
  it("hosts the engine's one <video> (test hooks intact) and mirrors the state", () => {
    const engine = engineWithVideo();
    render(<VideoSurface engine={engine} />);
    const host = screen.getByTestId('video-surface-host');
    const video = screen.getByTestId('video-surface');
    expect(host.firstChild).toBe(video);
    expect(host.className).toBe('h-full w-full bg-black');
    expect(video).toHaveAttribute('data-state', 'Idle');
    expect(host).toHaveAttribute('data-state', 'Idle');
    expect(video).not.toHaveAttribute('controls');
    act(() => {
      engine.load('http://s/1.ts', { live: true });
    });
    expect(host).toHaveAttribute('data-state', 'Buffering');
    expect(video).toHaveAttribute('data-state', 'Buffering');
  });

  it('a second surface re-parents the SAME node instead of re-tuning', () => {
    const engine = engineWithVideo();
    const video = engine.video;
    const first = render(<VideoSurface engine={engine} className="preview" />);
    expect(first.getByTestId('video-surface-host').className).toBe('preview');
    const second = render(<VideoSurface engine={engine} />);
    const hosts = screen.getAllByTestId('video-surface-host');
    expect(hosts[1]?.firstChild).toBe(video);
    expect(hosts[0]?.children).toHaveLength(0);
    first.unmount();
    expect(hosts[1]?.firstChild).toBe(video);
    engine.release();
    expect(hosts[1]?.children).toHaveLength(0);
    second.unmount();
    expect(PLAYING.kind).toBe('Playing');
  });
});
