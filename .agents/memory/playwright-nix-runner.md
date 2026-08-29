---
name: Playwright on Nix
description: How to interpret local Playwright launch failures caused by missing Nix shared libraries
---

Treat a Chromium launch failure that names a missing shared library as a runner-environment problem, not as an application regression. For repeatable local validation, prefer Nix's wrapped Chromium executable over Playwright's downloaded headless shell.

**Why:** Playwright's downloaded browser can bypass the Nix dependency closure and fail first on GLib, then GBM. Installing individual shared libraries is brittle; the Nix Chromium wrapper carries its runtime closure.

**How to apply:** For a persistent validation workflow, install the Chromium system package and pass its discovered executable path to Playwright through an optional launch setting. Otherwise use the managed browser tester. Do not accumulate individual graphics libraries.