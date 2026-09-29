# Aurora Universal

A lightweight glass theme and workflow extension for ChatGPT, Claude, Gemini, and Grok. Built from the LibreWolf fork of Aurora for ChatGPT with plain JavaScript and CSS.

Universal development lives on `main`. The published [Aurora 1.8 release](https://github.com/pigeonIabs/aurora-universal/releases/tag/v1.8) contains the ChatGPT overhaul. Development builds retain version 1.8 until the larger Universal release is requested.

## Features

The four adapters share custom image and video backgrounds, glass transparency, background blur, light and dark themes, fonts, quick settings, focus mode, cinema width, user message styling, and interface sounds. Menus, composers, navigation, and code blocks use the shared theme.

Privacy controls include sidebar history blur, avatar blur, and pattern masking. Masking changes the displayed text and blurs sensitive drafts while preserving the text submitted to the website. Turning it off restores text that still belongs to the same page nodes.

Enable message queueing to press Enter during a response and hold the next message until generation finishes. The queue preserves an active draft, uses the site's own send button, and stays within the current conversation. Navigation or disabling the feature clears the in-memory queue. An uncertain submission pauses for an explicit retry after checking the chat.

Default models are saved per website. On Claude, Gemini, and Grok, open the native model picker to make its available choices appear in Aurora, or use **Use current model** in Aurora's Behavior settings. The preference applies to new chats. ChatGPT retains its model and reasoning effort choices.

The popup selects the active supported website and lets you switch to another one. Each website has an enable switch. Appearance and privacy settings are shared. The master switch preserves saved preferences. ChatGPT's legacy composer, voice controls, and GPT limit controls remain available in its settings.

## Use a development build

In Firefox or LibreWolf, open `about:debugging#/runtime/this-firefox`, choose **Load Temporary Add-on**, and select `manifest.json` from this checkout. Open one of the supported sites and use the Aurora toolbar button.

The XPI uses this fork's existing local extension ID and targets LibreWolf profiles configured to load unsigned extensions. Keeping that ID preserves existing preferences and uploaded backgrounds.

## Build

Run `python scripts/build_xpi.py --output build/aurora-universal-development.xpi` from the repository root. Python 3.8 and Git are required. The builder packages tracked files and manifest resources with stable ordering, normalized line endings, and fixed ZIP timestamps.

The extension has no runtime package dependencies. Only the adapter and styles for the matching website load. One shared observer handles content updates, added subtrees are processed incrementally, and background media pauses in hidden tabs. The tokenizer remains removed.

See [DEVELOPMENT.md](DEVELOPMENT.md) for integration details and verification scope.

## Privacy and permissions

Preferences use browser storage. Uploaded backgrounds stay in local storage with a 15 MB file limit. Model catalogs store only picker labels locally. Queued text and masking originals live in page memory.

Host access covers `chatgpt.com`, `claude.ai`, `gemini.google.com`, `grok.com`, and the optional upstream feedback endpoint. Feedback is sent after the user submits it and grants Firefox's optional data permission. See [PRIVACY.md](PRIVACY.md).

## Upstream and license

Based on [TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT](https://github.com/TG-TG-TG-TG-TG-TG/Aurora-for-ChatGPT). Independently maintained. OpenAI, Anthropic, Google, xAI, LibreWolf, and the upstream maintainers retain their own products and trademarks.

MIT. The upstream copyright and permission notice are preserved in [LICENSE](LICENSE).
