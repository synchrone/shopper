import { Queue, sleep } from 'modern-async';

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
    async function fetchOzon(search: string): Promise<Array<{price:number, price_per?:number, URL:string}>> {
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
        const parent_price = a.querySelectorAll('[data-auto="price-block"] > span:nth-of-type(2)');
        const price = a.querySelectorAll<HTMLElement>('[data-auto="price-block"] ');
        const title = a.querySelectorAll<HTMLElement>('[data-auto="snippet-title-header"]');

        const queue = new Queue(2);

        for (const [i,m] of price.entries()){
            let innerPrice = parseFloat(parent_price[i].textContent!.replace(/\s+/g,"")!);
            let regular_units = title[i].innerText.match(/ ([\d.]+) ([км]?[гл]|шт)/);

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


                queue.exec(async () => {
                    try {
                        let price_on_ozon = await fetchOzon(title[i].innerText);
                        product_link.append(document.createElement('br'));
                        let p212 = document.createElement('a');
                        if (price_on_ozon[0].price_per){
                            p212.textContent = "A на озоне "+price_on_ozon[0].price_per+"₽ за 100 г";
                        }
                        else{
                            p212.textContent = "A на озоне "+price_on_ozon[0].price+"₽";
                        }
                        p212.href = price_on_ozon[0].URL;
                        product_link.append(p212);
                        await sleep(1000);
                    }
                    catch(e){
                        console.error('error fetching ozone price', e);
                    }
                })
            }
        }
    }
}

export {};
