import { describe, expect, it, vi } from 'vitest';
import { FrameHold, HELD_FRAME_TESTID, createHoldCanvas, hasFrame } from './frameHold';
import {
  BUFFERING,
  ENDED,
  EngineStateStore,
  IDLE,
  PLAYING,
  errorState,
  reconnecting,
} from '../connection/engineState';
import { defineReadOnly, stubCanvasContext } from '../testSupport';

/** A `<video>` showing a 1280×720 picture (jsdom never decodes, so the readings are defined). */
function pictured(): HTMLVideoElement {
  const video = document.createElement('video');
  defineReadOnly(video, 'readyState', 2);
  defineReadOnly(video, 'videoWidth', 1280);
  defineReadOnly(video, 'videoHeight', 720);
  video.style.objectFit = 'cover';
  return video;
}

function withContext(hold: FrameHold): ReturnType<typeof vi.fn> {
  const drawImage = vi.fn();
  stubCanvasContext(hold.canvas, { drawImage });
  return drawImage;
}

describe('FrameHold', () => {
  it('creates a hidden, inert canvas stacked into the surface cell', () => {
    const canvas = createHoldCanvas();
    expect(canvas.hidden).toBe(true);
    expect(canvas.dataset.testid).toBe(HELD_FRAME_TESTID);
    expect(canvas.style.gridArea).toBe('1 / 1');
    expect(canvas.style.pointerEvents).toBe('none');
  });

  it('knows whether the element shows a picture', () => {
    expect(hasFrame(document.createElement('video'))).toBe(false);
    expect(hasFrame(pictured())).toBe(true);
    const metadataOnly = pictured();
    defineReadOnly(metadataOnly, 'readyState', 1);
    expect(hasFrame(metadataOnly)).toBe(false);
  });

  it('capture copies the frame (size + fit) and shows the canvas; clear hides it; equal states never notify', () => {
    const hold = new FrameHold();
    const drawImage = withContext(hold);
    let changes = 0;
    hold.subscribe(() => {
      changes += 1;
    });
    const video = pictured();
    hold.capture(video);
    expect(hold.current).toEqual({ kind: 'Held' });
    expect(hold.canvas.hidden).toBe(false);
    expect(hold.canvas.dataset.held).toBe('true');
    expect(hold.canvas.width).toBe(1280);
    expect(hold.canvas.height).toBe(720);
    expect(hold.canvas.style.objectFit).toBe('cover');
    expect(drawImage).toHaveBeenCalledWith(video, 0, 0, 1280, 720);
    hold.capture(video);
    expect(changes).toBe(1);
    hold.clear();
    expect(hold.current).toEqual({ kind: 'Empty' });
    expect(hold.canvas.hidden).toBe(true);
    expect(hold.canvas.dataset.held).toBe('false');
    hold.clear();
    expect(changes).toBe(2);
  });

  it('a picture-less element (or a canvas that cannot draw) leaves the previous hold alone', () => {
    const hold = new FrameHold();
    const drawImage = withContext(hold);
    hold.capture(document.createElement('video'));
    expect(hold.current.kind).toBe('Empty');
    expect(drawImage).not.toHaveBeenCalled();
    hold.capture(pictured());
    expect(hold.current.kind).toBe('Held');
    hold.capture(document.createElement('video'));
    expect(hold.current.kind).toBe('Held');
    const tainted = new FrameHold();
    stubCanvasContext(tainted.canvas, {
      drawImage: () => {
        throw new Error('tainted');
      },
    });
    tainted.capture(pictured());
    expect(tainted.current.kind).toBe('Empty');
    const noContext = new FrameHold();
    stubCanvasContext(noContext.canvas, null);
    noContext.capture(pictured());
    expect(noContext.current.kind).toBe('Empty');
  });

  it('following the connection state keeps the hold only while Buffering / Reconnecting', () => {
    const hold = new FrameHold();
    withContext(hold);
    const store = new EngineStateStore();
    hold.follow(store);
    const held = (): void => {
      hold.capture(pictured());
      expect(hold.current.kind).toBe('Held');
    };
    held();
    store.set(BUFFERING);
    expect(hold.current.kind).toBe('Held');
    store.set(reconnecting(1, 1));
    expect(hold.current.kind).toBe('Held');
    for (const next of [PLAYING, IDLE, ENDED, errorState('x')]) {
      store.set(BUFFERING);
      held();
      store.set(next);
      expect(hold.current.kind).toBe('Empty');
    }
  });

  it('follows the video between hosts and leaves on remove', () => {
    const hold = new FrameHold();
    const first = document.createElement('div');
    const second = document.createElement('div');
    hold.moveTo(first);
    hold.moveTo(first);
    expect(first.children).toHaveLength(1);
    hold.moveTo(second);
    expect(first.children).toHaveLength(0);
    expect(second.firstChild).toBe(hold.canvas);
    hold.remove();
    expect(second.children).toHaveLength(0);
  });
});
