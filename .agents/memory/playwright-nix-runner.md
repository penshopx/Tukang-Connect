---
name: Playwright on Nix
description: How to interpret local Playwright launch failures caused by missing Nix shared libraries
---

Treat a Chromium launch failure that names a missing shared library as a runner-environment problem, not as an application regression.

**Why:** Downloading Playwright's browser binary and adding common browser dependencies can still leave the local Nix container without libraries such as GBM, while the same flow succeeds in Replit's managed browser tester.

**How to apply:** Use test discovery plus the managed browser tester to validate the flow, and report the local runner limitation separately. Avoid broad `.replit` package changes solely to make one local browser binary launch.