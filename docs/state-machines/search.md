# Search

| Machine              | States                                                                                                      | Owner                                      | Status   | Tests                                           |
| -------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------ | -------- | ----------------------------------------------- |
| Search overlay       | `SearchOverlay` None · ProgramMenu · CustomRecording · ComingSoon                                           | `src/features/search/searchOverlay.ts`     | explicit | `src/features/search/searchOverlay.test.ts`     |
| Voice search mailbox | Idle · Transcript(text) — the recognizer result is handed to the query exactly once                         | `src/features/search/voiceSearch.ts`       | explicit | `src/features/search/voiceSearch.test.ts`       |
| Search focus memory  | remembered results node + last Programs node, both cleared per result batch (fresh landing / first channel) | `src/features/search/searchFocusMemory.ts` | guarded  | `src/features/search/searchFocusMemory.test.ts` |
