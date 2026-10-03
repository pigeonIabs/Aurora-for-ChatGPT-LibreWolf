# <img src="icons/logo-48.png" width="32" height="32" alt=""> Aurora Universal

Add beautiful liquid glass to every major AI platform. Built for Firefox.

## Supported websites

| Website | Coverage |
| --- | --- |
| [ChatGPT](https://chatgpt.com) | Chats, projects, settings, and the web app |
| [Claude](https://claude.ai) | Chats and native model selection |
| [Gemini](https://gemini.google.com) | Chats, Gems, Connected Apps, Labs, and media pages |
| [Grok](https://grok.com) | Chats and native model selection |
| [Qwen](https://chat.qwen.ai) | Chats, My Library, and My Published |
| [Google AI Studio](https://aistudio.google.com) | Prompts, apps, live, media, library, documentation, and API keys |
| [DeepSeek](https://chat.deepseek.com) | Chats |
| [Hugging Face](https://huggingface.co) | Hub, models, datasets, Spaces listings, and HuggingChat |

## Features

- Liquid glass transparency and blur that preserve each website's native layout and controls
- Image and video backgrounds, light and dark themes, and bundled reading fonts
- Quick settings, searchable preferences, and individual website switches
- History and avatar blur, sensitive text masking, focus mode, and cinema width
- Message queues and website-specific model preferences where native controls support them
- Separate controls for upgrade promotions and usage notices

Settings follow the current page's available features. Preferences and uploaded backgrounds stay in browser storage. [Privacy details](PRIVACY.md).

## Install from source

In Firefox, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `manifest.json`. Open a supported website and use the Aurora toolbar button.

For an XPI, run this from the project folder with Python 3.9+ and Git installed.

```sh
python scripts/build_xpi.py --output build/aurora-universal-development.xpi
```

Permanent installation in standard Firefox requires a [Mozilla-signed XPI](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/). Local unsigned builds can be installed in Firefox Developer Edition, Nightly, or compatible browsers such as LibreWolf with signature enforcement configured for development. The existing extension ID preserves saved settings and backgrounds.

The current source includes all eight websites. [Version 1.8](https://github.com/pigeonIabs/AuroraUniversal/releases/tag/v1.8) is the earlier ChatGPT release.

[Development guide](DEVELOPMENT.md) · [AGPLv3 license](LICENSE)

Aurora Universal is licensed under AGPL-3.0-only. [Third-party notices](THIRD_PARTY_NOTICES.md) cover included source and fonts.
