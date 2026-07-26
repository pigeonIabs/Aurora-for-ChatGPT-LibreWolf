# Privacy Policy for Aurora for ChatGPT LibreWolf

Last updated July 25, 2026

## Overview

Aurora for ChatGPT LibreWolf is an unofficial browser extension that changes the appearance and behavior of ChatGPT. Its theme, token counting, privacy masking, and settings features run locally in the browser.

## Local data

The extension stores appearance, behavior, privacy, and workflow preferences using Firefox browser storage. Custom background files are stored locally. Firefox may synchronize settings through the browser's own sync service when the user enables browser synchronization.

Chat content used for local token counting, styling, queueing, and data masking remains inside the browser and is not transmitted by the extension.

## Optional feedback

The extension includes an optional feedback form. When the user chooses to send feedback and grants Firefox's optional data permission, the extension transmits the following information to `auroraforchatgpt.tnemoroccan.workers.dev`.

- The feedback text entered by the user
- A randomly generated ticket ID
- The installed extension version
- The browser user agent

The rest of the extension remains functional when the user declines this optional permission.

## Data masking

Data masking runs locally and visually obscures selected patterns such as email addresses, phone numbers, payment card numbers, IP addresses, identification numbers, and passport-like values. Masked values are not transmitted by the extension.

## Permissions

- `storage` saves extension preferences and local background data
- `unlimitedStorage` allows user-selected image and video backgrounds to fit in local browser storage
- `chatgpt.com` host access injects the extension's visual and workflow features
- Optional personal communications and technical interaction permissions apply only to the feedback form

## Third-party sites

The extension operates on the ChatGPT website, which has its own privacy practices. The optional feedback endpoint is maintained by the upstream Aurora project.

## Contact

Privacy questions and reports can be filed in the public GitHub repository that distributes this LibreWolf fork.
