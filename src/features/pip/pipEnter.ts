/** Whether this browser can put a `<video>` into a picture-in-picture window. */
export function pipSupported(doc: Document = document): boolean {
  return 'pictureInPictureEnabled' in doc && doc.pictureInPictureEnabled;
}

/**
 * The quick-bar's Picture-in-picture slot (Android `PipEnterAction`): drop
 * whatever overlay is up first so the tiny window shows clean video, then
 * ask the browser for the window. Unsupported browsers just clear the chrome.
 */
export async function enterPip(
  video: HTMLVideoElement | null,
  clearChrome: () => void,
  supported: boolean = pipSupported(),
): Promise<boolean> {
  clearChrome();
  if (video === null || !supported || video.disablePictureInPicture) return false;
  try {
    await video.requestPictureInPicture();
    return true;
  } catch {
    return false;
  }
}
