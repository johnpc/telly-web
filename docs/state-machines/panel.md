# Channel panel

| Machine     | States                                                                                                                                                                   | Owner                              | Status   | Tests                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| Panel focus | Browsing(group, row) · PinPrompt(group, row, pending) — per-group row memory plus a versioned focus command the row list honours on EVERY version (`useFocusCommand.ts`) | `src/features/panel/panelFocus.ts` | explicit | `src/features/panel/panelFocus.test.ts`, `src/features/panel/ChannelPanel.test.tsx` |
