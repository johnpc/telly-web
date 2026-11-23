import { useEffect } from 'react';
import { type RecordingRuntime, recordingRuntime } from './recordingRuntime';

/**
 * Root-hosted DVR runtime: finalizes rows left RECORDING by a closed tab and
 * runs the in-app scheduler's ticks while mounted (scheduled captures start
 * only while telly is open — there are no alarm wakeups on the web either).
 */
export function RecordingsHost({ runtime = recordingRuntime }: { runtime?: RecordingRuntime }): null {
  useEffect(() => runtime.start(), [runtime]);
  return null;
}
