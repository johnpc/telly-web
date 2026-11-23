# VOD (Movies)

| Machine      | States                                                                                                                                       | Owner                                                                                       | Status   | Tests                                           |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------- |
| VOD playback | `VodStage` Loading · ResumePrompt(positionMs) · Playing — a stored position inside the 5–95% resume band swaps in the Resume/Start-over step | `src/features/vod/vodStage.ts` (written only by `src/features/vod/vodPlaybackViewModel.ts`) | explicit | `src/features/vod/vodPlaybackViewModel.test.ts` |
