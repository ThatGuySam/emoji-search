# FetchMoji Product Hunt media

Captured September 24-25, 2026 in Safari on an iPhone 17 Pro simulator running iOS 26.5. Simulator, not a physical iPhone.

The three iPhone screenshots show the empty search, Shout results, and the copy confirmation. The Product Hunt gallery has these plus two older April screenshots.

`fetchmoji-gallery-shout-wide-2026-10-19.png` is a 1270×760 (2× pixel density) dark-mode capture of real `shout` results from the fixed build, taken October 19, 2026 in Chrome. It is meant to replace the April desktop image as the first gallery image, which Product Hunt uses as the social preview.

The demo video is on YouTube: <https://www.youtube.com/watch?v=xYjkrrlseCQ>. It is a 22.7-second continuous portrait screen recording. The search field stays visible while five individual keyboard taps enter s-h-o-u-t, followed by results and the copy confirmation. Inline predictions were turned off in the simulator to avoid a gray word suggestion over the text. The MP4 is not committed.

Earlier full-search recording attempts failed in Safari, and an unrecorded reload once showed a model-load error. The October 17-19 investigation found the causes: keystrokes typed before hydration were dropped, concurrent cold-load queries each started their own model download, and the 34 MB model was never edge-cached. See `docs/verification/launch-cold-load/` and `scripts/launch-cold-load-check.mjs`.
