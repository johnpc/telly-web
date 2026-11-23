import type { CaptureContext, CaptureSink } from './streamRecorder';

/**
 * Byte-for-byte copy of a raw TS / progressive HTTP source (Android
 * `OkHttpStreamRecorder`): `fetch` the url and stream its body into the
 * sink chunk by chunk until the server closes the connection or the capture
 * stops. A stop aborts the in-flight read, so a stalled socket never pins
 * the row in RECORDING.
 */
export async function recordProgressive(
  url: string,
  sink: CaptureSink,
  ctx: CaptureContext,
): Promise<number> {
  const response = await ctx.fetch(url, { signal: ctx.signal });
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`);
  if (response.body === null) return writeWhole(response, sink);
  return copyBody(response.body.getReader(), sink, ctx);
}

async function writeWhole(response: Response, sink: CaptureSink): Promise<number> {
  const bytes = new Uint8Array(await response.arrayBuffer());
  await sink.write(bytes);
  return bytes.byteLength;
}

async function copyBody(
  reader: ReadableStreamDefaultReader<Uint8Array<ArrayBuffer>>,
  sink: CaptureSink,
  ctx: CaptureContext,
): Promise<number> {
  let written = 0;
  try {
    while (!ctx.shouldStop()) {
      const { done, value } = await reader.read();
      if (done) break;
      await sink.write(value);
      written += value.byteLength;
    }
  } finally {
    await reader.cancel().catch(() => undefined);
  }
  return written;
}
