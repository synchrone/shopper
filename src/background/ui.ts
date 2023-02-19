export function createUIMenus(): void {
    chrome.contextMenus.onClicked.addListener((e, tab) => {
        if (!e.editable || !tab || !e.menuItemId) {
            return;
        }

        const command = e.menuItemId as string;
        if (command === 'settings') {
            chrome.runtime.openOptionsPage();
            return;
        }

        // const url = e.frameId ? e.frameUrl : e.pageUrl;
        // const frameId = e.frameId ?? 0;
    });

    chrome.contextMenus.create(
        {
            id: 'shopper-options',
            title: 'this.settings',
            contexts: ['editable']
        },
        () => {
            chrome.contextMenus.create({
                id: 'settings',
                parentId: 'shopper-options',
                title: chrome.i18n.getMessage('menuSettings'),
                contexts: ['editable']
            });
        }
    );
}
