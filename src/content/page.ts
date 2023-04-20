import * as async from 'async';
import {format_unit_price, ver_check, take_selectors, OzonPriceCalc} from '../common/calculate'

async function sleep(ms: number){
    return new Promise(res => setTimeout(res, ms))
}

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
if(window.location.hostname == "market.yandex.ru"){
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
            let {parent_price, price, old_title, title} = take_selectors(a);
            const queue = async.queue(async (t: () => Promise<any>) => t(), 2);

            for (const [i,m] of price.entries()){
                let {regular_units, innerPrice, title_units} = ver_check(i, m, title, old_title, parent_price);

                if(regular_units != null){
                    let product_link = m.closest('a')!;
                    product_link.append(format_unit_price(regular_units, innerPrice));
                    queue.push(async () => {

                        try {

                            let price_on_ozon = await fetchOzon(title_units);

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
            await queue.drain()
        }
    }
}
if (window.location.hostname == "www.ozon.ru"){
    async function fetchYandex(search: string): Promise<String> {
        return new Promise((res, rej) => {
            chrome.runtime.sendMessage({fn: 'fetchYandex', search}, r => {
                !r && rej(chrome.runtime.lastError);
                r.exception && rej(r.exception);
                res(r.result);
            })
        })
    }
    setTimeout(
        () => {
            calcOzon();
        }, 3000
    );
    async function calcOzon(){
        let title = document.querySelectorAll<HTMLElement>('.tile-hover-target > span');
        let price = document.querySelectorAll<HTMLElement>('.tile-hover-target + div > div:first-child > span:first-child > span:first-child, .widget-search-result-container > div:first-child > div > div > div:first-child > div:first-child');
        const queue = async.queue(async (t: () => Promise<any>) => t(), 2);
        for (const [i,m] of price.entries()){
            let {regular_units, innerPrice, title_units} = ver_check(i, m, title, undefined, price);
            if(regular_units != null){
                m.append(document.createElement('br'));
                m.append(format_unit_price(regular_units, innerPrice));

                queue.push(async () => {
                    try {
                        let price_on_yandex = await fetchYandex(title_units);
                        m.append(document.createElement('br'));
                        let p212 = document.createElement('a');
                        if (price_on_yandex[0]){
                            if (price_on_yandex[2] == "шт"){
                                p212.textContent = price_on_yandex[0]+"₽ за шт на Яндексе";
                            }
                            p212.textContent = price_on_yandex[0]+"₽ за 100"+price_on_yandex[2]+" на Яндексе";
                        }
                        p212.href = price_on_yandex[1];
                        p212.style.color = 'white';
                        p212.style.textDecoration = 'underline';
                        p212.style.textShadow = '1px 1px 1px #373737';
                        m.append(p212);
                        await sleep(2567);
                    }
                    catch(e){
                        console.error('error fetching yandex price', e);
                    }
                });
            }
        }
        await queue.drain()
    }
}

export {};
