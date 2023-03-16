export interface ContentScriptMessage {
    action: string;
    url: string;
}

export interface ContentScriptReturn {
    nextCommand?: string;
}

declare global {
    interface Window {
        shopperExtensionInstalled: boolean;
    }
}

if (!window.shopperExtensionInstalled) {
    window.shopperExtensionInstalled = true;

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (sender.id !== chrome.runtime.id) {
            return;
        }

        const response = run(message);
        if (response) {
            sendResponse(response);
        }

        function run(message: ContentScriptMessage): ContentScriptReturn | undefined {
            if (location.href !== message.url) {
                return;
            }
            switch (message.action) {
                default:
                    // TODO: actually implement logic
                    console.log(message);
            }
        }
    });
    async function fetchOzon(search: string): Promise<[number, string]> {
        return new Promise((res, rej) => {
            chrome.runtime.sendMessage({fn: 'fetchOzon', search}, r => {
                !r && rej(chrome.runtime.lastError);
                r.exception && rej(r.exception);
                res(r.result);
            })
        })
    }

    const config = { childList: true, subtree: true };
    const observer = new MutationObserver((mutationList, observer) => {
        for (const mutation of mutationList) {
            for (const a of mutation.addedNodes){
                if(a instanceof Element){
                    calculate(a);
                }
            }
        }
    })
    setTimeout(
        () => {
            calculate(document);
            observer.observe(document.querySelector('[data-test-id="virtuoso-item-list"]')!, config);
        }, 1000
    );
    async function calculate(a: Document|Element){
        const parent_price = a.querySelectorAll('[data-zone-name="price"]');
        const price = a.querySelectorAll<HTMLElement>('[data-zone-name="price"] > div > a > div > span > span:first-of-type');
        const title = a.querySelectorAll<HTMLElement>('[data-auto="product-title"]');
        for (const [i,m] of price.entries()){
            let innerPrice;
            let parent_price2 = parent_price[i].previousElementSibling!;
            if(parent_price2.classList.length > 0){
                innerPrice = parseFloat(parent_price[i].previousElementSibling?.textContent!.replace(/ /g,"")!);
            }
            else{
                innerPrice = parseFloat(m.innerText.replace(/ /g,""));
            }
            let regular_units = title[i].title.match(/ ([\d.]+) ([км]?[гл]|шт)/);

            if(regular_units != null){
                let innerMass = parseFloat(regular_units[1]);
                let ending = '₽ за 100'+ regular_units[2];
                if (regular_units[2] == "кг"){
                    innerMass*=1000;
                    ending = '₽ за 100г'
                }
                if (regular_units[2] == "л"){
                    innerMass*=1000;
                    ending = '₽ за 100мл'
                }
                let result = innerPrice/(innerMass/100);
                if (regular_units[2] == "шт"){
                    result = innerPrice/innerMass;
                    ending = '₽ за ' + regular_units[2];
                }
                let result2 = `${result.toFixed(2).toString()} ${ending}`;
                let product_link = m.closest('a')!;

                product_link.append(result2);

                try {
                    let price_on_ozon = await fetchOzon(title[i].title);
                    product_link.append(document.createElement('br'));
                    let p212 = document.createElement('a');
                    p212.textContent = "A на озоне "+price_on_ozon[0]+"₽";
                    p212.href = price_on_ozon[1].toString();
                    product_link.append(p212);
                }
                catch(e){
                    console.error('error fetching ozone price', e);
                }
            }
        }
    }
}

export {};
