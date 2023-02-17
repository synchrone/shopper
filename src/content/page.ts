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
    
    const config = { childList: true, subtree: true };
    const observer = new MutationObserver((mutationList, observer) => {
        for (const mutation of mutationList) {
            mutation.addedNodes.forEach((a) => {
                if(a instanceof Element){
                    calculate(a);
                }
            })
        }
    })
    setTimeout(
        () => { 
            calculate(document); 
            observer.observe(document.querySelector('[data-test-id="virtuoso-item-list"]')!, config);
        }, 1000
    );
    function calculate(a: Document|Element){
        const parent_price = a.querySelectorAll<HTMLElement>('[data-zone-name="price"]');
        const price = a.querySelectorAll<HTMLElement>('[data-zone-name="price"] > div > a > div > span > span:first-of-type');
        const mass = a.querySelectorAll<HTMLElement>('[data-auto="product-title"]');
        price.forEach((m,i) => {
            let innerPrice: any = 0;
            if(parent_price[i].previousElementSibling instanceof HTMLElement){
                if(parent_price[i].previousElementSibling?.classList.contains('g8jzv')){
                    innerPrice = parseFloat(parent_price[i].previousElementSibling?.textContent!.replace(/ /g,"")!);
                }
                else{
                    innerPrice = parseFloat(m.innerText.replace(/ /g,""));
                }
            }
            m.dataset.zoneName 
            let regular_mass = mass[i].title.match(/ ([\d.]+) (к?г)/);

            if(regular_mass == null){
                return;
            }
            let innerMass = parseFloat(regular_mass[1]);
            let result = 0;
            if (regular_mass[2] == "кг"){
                innerMass*=1000;
            }   
            result = innerPrice/(innerMass/100);
            let result2 = result.toFixed(2).toString();

            m.closest('a')!.append(result2+'₽ за 100г');
        })
    }
}

export {};
