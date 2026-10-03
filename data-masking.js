(() => {
    'use strict';

    const PATTERNS = {
        email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/gi,
        creditCard: /\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b/g,
        vin: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
        ipv4: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
        ipv6: /\b([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b/g,
        macAddress: /\b([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})\b/g,
        phoneRU: /(?:\+7|8)[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g,
        inn: /\b\d{10}(?:\d{2})?\b/g,
        snils: /\b\d{3}-\d{3}-\d{3}\s\d{2}\b/g,
        passportRU: /\b\d{2}\s?\d{2}\s?\d{6}\b/g,
        stsRU: /\b\d{2}\s?[А-ЯA-Z]{2}\s?\d{6}\b/g,
        ptsRU: /\b\d{2}\s?[А-ЯA-Z]{2}\s?\d{6}\b/g,
        driverLicenseRU: /\b\d{2}\s?[А-ЯA-Z]{2}\s?\d{6}\b/g,
        ssn: /\b\d{3}-\d{2}-\d{4}\b/g,
        phoneUS: /\b\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4}\b/g,
        passportUS: /\b[A-Z]{1,2}\d{7,8}\b/g,
        nino: /\b[A-CEGHJ-PR-TW-Z]{1}[A-CEGHJ-NPR-TW-Z]{1}\d{6}[A-D]{1}\b/g,
        nhs: /\b\d{3}[\s\-]?\d{3}[\s\-]?\d{4}\b/g,
        iban: /\b[A-Z]{2}\d{2}[A-Z0-9]{1,30}\b/g,
        vat: /\b[A-Z]{2}\d{8,12}\b/g,
        chineseID: /\b\d{17}[\dXx]\b/g,
        aadhaar: /\b\d{4}\s?\d{4}\s?\d{4}\b/g,
        pan: /\b[A-Z]{5}\d{4}[A-Z]{1}\b/g,
        cpf: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g,
    };

    const Generators = {
        randomInt: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min,
        randomDigits: (count) => Array.from({ length: count }, () => Generators.randomInt(0, 9)).join(''),
        randomLetter: () => String.fromCharCode(65 + Generators.randomInt(0, 25)),
        email: () => `user${Generators.randomDigits(4)}@${['gmail.com', 'yahoo.com', 'mail.ru'][Generators.randomInt(0, 2)]}`,
        creditCard: () => Array.from({ length: 4 }, () => Generators.randomDigits(4)).join(' '),
        vin: () => Array.from({ length: 17 }, () => 'ABCDEFGHJKLMNPRSTUVWXYZ0123456789'[Generators.randomInt(0, 32)]).join(''),
        ipv4: () => Array.from({ length: 4 }, () => Generators.randomInt(0, 255)).join('.'),
        macAddress: () => Array.from({ length: 6 }, () => Generators.randomDigits(2)).join(':'),
        phoneRU: () => `+7 (${Generators.randomDigits(3)}) ${Generators.randomDigits(3)}-${Generators.randomDigits(2)}-${Generators.randomDigits(2)}`,
        inn: () => Generators.randomDigits(10),
        snils: () => `${Generators.randomDigits(3)}-${Generators.randomDigits(3)}-${Generators.randomDigits(3)} ${Generators.randomDigits(2)}`,
        passportRU: () => `${Generators.randomDigits(2)} ${Generators.randomDigits(2)} ${Generators.randomDigits(6)}`,
        stsRU: () => `${Generators.randomDigits(2)} ${Generators.randomLetter()}${Generators.randomLetter()} ${Generators.randomDigits(6)}`,
        ptsRU: () => `${Generators.randomDigits(2)} ${Generators.randomLetter()}${Generators.randomLetter()} ${Generators.randomDigits(6)}`,
        driverLicenseRU: () => `${Generators.randomDigits(2)} ${Generators.randomLetter()}${Generators.randomLetter()} ${Generators.randomDigits(6)}`,
        ssn: () => `${Generators.randomDigits(3)}-${Generators.randomDigits(2)}-${Generators.randomDigits(4)}`,
        phoneUS: () => `(${Generators.randomDigits(3)}) ${Generators.randomDigits(3)}-${Generators.randomDigits(4)}`,
        passportUS: () => `${Generators.randomLetter()}${Generators.randomDigits(8)}`,
        nino: () => `AB${Generators.randomDigits(6)}C`,
        nhs: () => `${Generators.randomDigits(3)} ${Generators.randomDigits(3)} ${Generators.randomDigits(4)}`,
        iban: () => `DE${Generators.randomDigits(20)}`,
        vat: () => `DE${Generators.randomDigits(9)}`,
        chineseID: () => `${Generators.randomDigits(17)}${Generators.randomInt(0, 1) ? 'X' : Generators.randomInt(0, 9)}`,
        aadhaar: () => `${Generators.randomDigits(4)} ${Generators.randomDigits(4)} ${Generators.randomDigits(4)}`,
        pan: () => `${Generators.randomLetter()}${Generators.randomLetter()}${Generators.randomLetter()}${Generators.randomLetter()}${Generators.randomLetter()}${Generators.randomDigits(4)}${Generators.randomLetter()}`,
        cpf: () => `${Generators.randomDigits(3)}.${Generators.randomDigits(3)}.${Generators.randomDigits(3)}-${Generators.randomDigits(2)}`,
    };

    class DataMaskingEngine {
        constructor() {
            this.originalData = new Map();
            this.settings = {};
            this.active = false;
            this.observerCallback = null;
            this.scanQueue = [];
            this.queuedRoots = new WeakSet();
            this.scanHandle = null;
            this.revision = 0;
            this.lastPrune = 0;
            this.onEditorInput = event => this.maskEditor(event.target);
        }

        configure(settings, active) {
            const enabled = active && !!settings.dataMaskingEnabled;
            const changed = this.settings.maskingRandomMode !== !!settings.maskingRandomMode;
            if (!enabled || changed) this.stopObserver();
            this.settings = { maskingRandomMode: !!settings.maskingRandomMode };
            if (!enabled || this.active) return;
            this.active = true;
            document.addEventListener('input', this.onEditorInput, true);
            this.observerCallback = ({ addedElements, addedTexts }) => {
                if (!this.isEnabled()) return;
                if (Date.now() - this.lastPrune > 2000) {
                    this.lastPrune = Date.now();
                    for (const [node] of this.originalData) if (!node.isConnected) this.originalData.delete(node);
                }
                for (const node of addedTexts || []) this.maskTextNode(node);
                for (const node of addedElements || []) this.maskElement(node);
            };
            window.AuroraExt.centralObserver.subscribe(this.observerCallback);
            this.maskElement(document.body);
        }

        stopObserver() {
            this.active = false;
            this.revision++;
            document.removeEventListener('input', this.onEditorInput, true);
            if (this.observerCallback) window.AuroraExt.centralObserver?.unsubscribe(this.observerCallback);
            this.observerCallback = null;
            if (this.scanHandle !== null) {
                if (window.cancelIdleCallback) window.cancelIdleCallback(this.scanHandle);
                else clearTimeout(this.scanHandle);
            }
            this.scanHandle = null;
            this.scanQueue = [];
            this.queuedRoots = new WeakSet();
            document.querySelectorAll('[data-aurora-sensitive-editor]').forEach(editor => editor.removeAttribute('data-aurora-sensitive-editor'));
            this.restore();
        }

        isEnabled() {
            return this.active && !!window.AuroraExt.isActive?.();
        }

        getMask(type, originalText) {
            if (this.settings.maskingRandomMode) {
                const generator = Generators[type];
                if (generator) return generator();
            }
            const length = originalText.length;
            if (type === 'email') {
                const parts = originalText.split('@');
                return '*****@*****' + (parts[1] ? '.' + parts[1].split('.').pop() : '');
            } else if (type === 'creditCard') {
                return '**** **** **** ' + originalText.slice(-4);
            } else if (type.includes('phone')) {
                return originalText.slice(0, 2) + ' (***) ***-**-**';
            } else if (type === 'passportRU') {
                return '** ** ******';
            } else if (type === 'inn') {
                return '**********';
            } else if (type === 'snils') {
                return '***-***-*** **';
            } else if (type === 'ssn') {
                return '***-**-****';
            } else if (type === 'ipv4') {
                return '***.***.***.***';
            }
            return '*'.repeat(Math.min(length, 12));
        }

        preview(text) {
            if (!this.isEnabled()) return text;
            for (const [type, pattern] of Object.entries(PATTERNS)) {
                pattern.lastIndex = 0;
                text = text.replace(pattern, match => this.getMask(type, match));
            }
            return text;
        }

        maskTextNode(node) {
            if (!this.isEnabled()) return;
            if (!node?.isConnected || !node.textContent?.trim()) return;
            const parent = node.parentElement;
            if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'INPUT', 'TEXTAREA'].includes(parent.tagName)) return;
            if (parent.closest('[contenteditable], [role="textbox"]') || parent.closest(window.AuroraExt.ownedUI)) return;
            const previous = this.originalData.get(node);
            if (previous && previous.masked === node.textContent) return;

            // A streaming renderer may append to the already masked text node.
            const original = previous && node.textContent.startsWith(previous.masked)
                ? previous.original + node.textContent.slice(previous.masked.length) : node.textContent;
            let text = original;
            let modified = false;

            for (const [type, pattern] of Object.entries(PATTERNS)) {
                pattern.lastIndex = 0;
                text = text.replace(pattern, (match) => {
                    modified = true;
                    return this.getMask(type, match);
                });
            }

            if (modified) {
                this.originalData.set(node, { original, masked: text });
                node.textContent = text;
            }
        }

        maskEditor(target) {
            if (!this.isEnabled()) return;
            const editor = target?.closest?.('[contenteditable="true"],textarea,input:is([type="text"],[type="email"],[type="tel"],[type="search"]):not([readonly])');
            if (!editor || editor.closest(window.AuroraExt.ownedUI)) return;
            const text = editor.value ?? editor.textContent ?? '';
            const sensitive = Object.values(PATTERNS).some(pattern => { pattern.lastIndex = 0; return pattern.test(text); });
            editor.toggleAttribute('data-aurora-sensitive-editor', sensitive);
        }

        maskElement(element) {
            if (!element?.isConnected || !this.isEnabled()) return;
            this.maskEditor(element);
            element.querySelectorAll?.('[contenteditable="true"],textarea,input:is([type="text"],[type="email"],[type="tel"],[type="search"]):not([readonly])').forEach(editor => this.maskEditor(editor));
            if (this.queuedRoots.has(element)) return;
            // An ancestor already waiting for a scan covers this subtree too.
            if (this.scanQueue.some(task => !task.walker && task.root.contains(element))) return;
            this.queuedRoots.add(element);
            this.scanQueue.push({ root: element, walker: null });
            this.scheduleScan();
        }

        scheduleScan() {
            if (this.scanHandle !== null || !this.isEnabled()) return;
            const revision = this.revision;
            const run = deadline => {
                if (revision !== this.revision) return;
                this.scanHandle = null;
                this.runScan(deadline);
            };
            this.scanHandle = window.requestIdleCallback
                ? window.requestIdleCallback(run, { timeout: 400 })
                : setTimeout(() => run(null), 16);
        }

        runScan(deadline) {
            if (!this.isEnabled()) return;
            const start = performance.now();
            let processed = 0;
            while (this.scanQueue.length && processed < 220 && performance.now() - start < 8) {
                const task = this.scanQueue[0];
                if (!task.root.isConnected) {
                    this.queuedRoots.delete(task.root);
                    this.scanQueue.shift();
                    continue;
                }
                task.walker ||= document.createTreeWalker(task.root, NodeFilter.SHOW_TEXT);
                const node = task.walker.nextNode();
                if (!node) {
                    this.queuedRoots.delete(task.root);
                    this.scanQueue.shift();
                } else {
                    this.maskTextNode(node);
                    processed++;
                }
                if (deadline && deadline.timeRemaining() < 2) break;
            }
            if (this.scanQueue.length) this.scheduleScan();
        }

        restore() {
            for (const [node, value] of this.originalData) {
                if (node.isConnected && node.textContent === value.masked) node.textContent = value.original;
            }
            this.originalData.clear();
        }
    }

    window.DataMaskingEngine = new DataMaskingEngine();
})();
