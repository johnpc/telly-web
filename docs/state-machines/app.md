# App shell

| Machine     | States                                                                                                                   | Owner                   | Status   | Tests                        |
| ----------- | ------------------------------------------------------------------------------------------------------------------------ | ----------------------- | -------- | ---------------------------- |
| Start route | `StartDecision` Welcome · Playback · GuideUntuned (carries `tunesPreview`); the first guide after a cold start claims it | `src/app/startRoute.ts` | explicit | `src/app/startRoute.test.ts` |
