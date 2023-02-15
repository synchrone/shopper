import { TypedEmitter } from 'tiny-typed-emitter';
import { OptionsPageMessage } from 'common/options-page-interface';

interface SettingsModelEvents {
    change: () => void;
}

class SettingsModel extends TypedEmitter<SettingsModelEvents> {
    private _loaded = false;
    private _backgroundPagePort: chrome.runtime.Port | undefined;
    private _chromeCommands: chrome.commands.Command[] | undefined;
    protected settings = {
        // TODO: add setting keys
    };

    async init() {
        await this.loadStorageConfig();
        await this.connectToBackgroundPage();
        await this.getShortcuts();
        this.initComplete();
    }

    private loadStorageConfig(): Promise<void> {
        return new Promise((resolve) => {
            chrome.storage.local.get(Object.keys(this.settings), (result) => {
                this.settings = result;
                resolve();
            });
        });
    }

    private connectToBackgroundPage(): Promise<void> {
        return new Promise((resolve) => {
            this._backgroundPagePort = chrome.runtime.connect({ name: 'options' });
            this._backgroundPagePort.onMessage.addListener((message) =>
                this.handleMessageFromBackgroundPage(message as OptionsPageMessage)
            );
            resolve();
        });
    }


    private getShortcuts(): Promise<void> {
        return new Promise((resolve) => {
            chrome.commands.getAll((commands) => {
                if (Array.isArray(commands)) {
                    this._chromeCommands = commands;
                } else if (chrome.runtime.id.startsWith('im.syn.shopper-extension')) {
                    // Safari returns an empty object {} instead of commands. Why?..
                    const manifestCommands = chrome.runtime.getManifest().commands || {};

                    this._chromeCommands = Object.entries(manifestCommands).map(([name, cmd]) => {
                        let shortcut = cmd.suggested_key?.mac ?? cmd.suggested_key?.default;
                        if (shortcut) {
                            shortcut = shortcut
                                .replace(/Ctrl|Command/g, '⌘')
                                .replace(/Alt/g, '⌥')
                                .replace(/Shift/g, '⇧')
                                .replace(/\+/g, '');
                        }
                        return {
                            name,
                            shortcut,
                            description: cmd.description
                        };
                    });
                }
                resolve();
            });
        });
    }

    private initComplete() {
        this._loaded = true;
        this.emit('change');
    }

    get loaded(): boolean {
        return this._loaded;
    }

    get shortcuts(): chrome.commands.Command[] {
        return (this._chromeCommands || []).filter((cmd) => cmd.shortcut);
    }

    private handleMessageFromBackgroundPage(message: OptionsPageMessage) {

    }
}

const model = new SettingsModel();

export { model };
