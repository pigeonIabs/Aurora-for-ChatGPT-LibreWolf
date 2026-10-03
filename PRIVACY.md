# Privacy Policy for Aurora Universal

Last updated October 2, 2026

## Overview

Aurora Universal changes the appearance of ChatGPT, Claude, Gemini, Grok, Qwen, Google AI Studio, DeepSeek, and Hugging Face, including HuggingChat. Its appearance, privacy, and workflow features run locally in the browser. Feature availability varies by website.

## Local data

Preferences are stored using browser storage. Custom background files are stored locally. Firefox may synchronize preferences through its own sync service when browser synchronization is enabled.

Chat content used for styling, queueing, and data masking stays inside the browser. Queued text and original masked text are held in page memory and cleared during cleanup. Native model picker labels are cached locally to populate model preferences. Pattern masking visually obscures selected text. Sidebar history and avatar blur provide visual privacy on supported sites.

## Backgrounds and fonts

Remote background URLs load media from the selected provider. The ChatGPT default background comes from OpenAI's static asset service. The other supported sites use the packaged wallpaper by default. Reading fonts are bundled with their open source licenses and load from the extension package. Remote media providers receive ordinary web requests under the browser's network and privacy settings. Uploaded background files stay in browser storage.

## Permissions

- `storage` saves preferences and local background data
- `unlimitedStorage` supports user-selected image and video files within the 15 MB upload limit
- `chatgpt.com`, `claude.ai`, `gemini.google.com`, `grok.com`, `chat.qwen.ai`, `aistudio.google.com`, and `chat.deepseek.com` host access injects the corresponding site adapter and appearance features
- `huggingface.co` loads the Hugging Face adapter for Hub appearance and HuggingChat. Authentication, API, and account settings routes keep their native interface. Embedded Spaces use their own hosts
- `opal.google.com/_gemini` and `opal.google/_app/` style the Labs gallery embedded in Gemini. The frame bridge passes only glass and text appearance tokens. Styling is enabled only for Gemini's embedded lite gallery

## Third-party sites

Each supported AI website has its own privacy practices.

## Contact

Privacy questions and reports can be filed in the [Aurora Universal repository](https://github.com/pigeonIabs/AuroraUniversal).
