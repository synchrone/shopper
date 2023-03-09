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

    async function fetchOzon(b: string){
        let URL = `https://www.ozon.ru/search/?text=${encodeURIComponent(b)}&from_global=true`;
        let redirect = await fetch(URL);
        let text = await redirect.text();
        let real_URL = text.match(/location\.replace\((.+)\)/);
        if(real_URL){
            let realer_URL = real_URL![1];
            let website = await fetch(JSON.parse(realer_URL));
            text = await website.text();
        }
        var parser = new DOMParser();

        var doc = parser.parseFromString(text, "text/html");
        let ozon_price_range = doc.querySelector<HTMLElement>('[id^="state-searchResultsV2"]');
        let parsed_range = JSON.parse(ozon_price_range!.dataset.state!);
        let price_range0;
        let price_range1;
        let price_range2;
        let price_range3;
        let price_rangeall: any;
        if(parsed_range.items.length >= 4){
            price_range0 = parseFloat(parsed_range.items[0].mainState.find((element: any) => element.atom.type == "priceWithTitle").atom.priceWithTitle.price.replace(/\D/g,""));
            price_range1 = parseFloat(parsed_range.items[1].mainState.find((element: any) => element.atom.type == "priceWithTitle").atom.priceWithTitle.price.replace(/\D/g,""));
            price_range2 = parseFloat(parsed_range.items[2].mainState.find((element: any) => element.atom.type == "priceWithTitle").atom.priceWithTitle.price.replace(/\D/g,""));
            price_range3 = parseFloat(parsed_range.items[3].mainState.find((element: any) => element.atom.type == "priceWithTitle").atom.priceWithTitle.price.replace(/\D/g,""));
            price_rangeall = [price_range0, price_range1, price_range2, price_range3];
        }
        return [Math.min(...price_rangeall), URL];
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
