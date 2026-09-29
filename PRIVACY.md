# Privacy Policy for Aurora Universal

Last updated September 28, 2026

## Overview

Aurora Universal changes the appearance of ChatGPT, Claude, and Gemini. Its appearance, privacy, and workflow features run locally in the browser. Feature availability varies by website.

## Local data

Preferences are stored using browser storage. Custom background files are stored locally. Firefox may synchronize preferences through its own sync service when browser synchronization is enabled.

Chat content used for styling, queueing, and data masking stays inside the browser. ChatGPT's pattern masking visually obscures selected text. Sidebar history and avatar blur provide visual privacy on supported sites.

## Optional feedback

After the user submits feedback and grants Firefox's optional data permission, the extension sends the following information to the upstream endpoint `auroraforchatgpt.tnemoroccan.workers.dev`.

- The feedback text entered by the user
- A randomly generated ticket ID
- The installed extension version
- The browser user agent

## Backgrounds and fonts

Remote background URLs load media from the selected provider. The ChatGPT default background comes from OpenAI's static asset service. The initial Claude and Gemini default uses the packaged wallpaper. Choosing a Google Font loads that font from Google. These providers receive ordinary web requests under the browser's network and privacy settings. Uploaded background files stay in browser storage.

## Permissions

- `storage` saves preferences and local background data
- `unlimitedStorage` supports user-selected image and video files within the 15 MB upload limit
- `chatgpt.com`, `claude.ai`, and `gemini.google.com` host access injects the corresponding site adapter and appearance features
- Optional personal communications and technical interaction permissions apply to the feedback form

## Third-party sites

Each supported AI website has its own privacy practices. The optional feedback endpoint is maintained by the upstream Aurora project.

## Contact

Privacy questions and reports can be filed in the [Aurora Universal repository](https://github.com/pigeonIabs/aurora-universal).
