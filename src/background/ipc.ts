async function fetchOzon(search: string){
    let URL = `https://www.ozon.ru/search/?text=${encodeURIComponent(search)}&from_global=true`;
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
    if(!ozon_price_range){
        // console.log(`cannot find id^=state-searchResultsV2 in ${text}`)
        throw new Error(`cannot find ${search} on ozone`);
    }

    let parsed_range = JSON.parse(ozon_price_range!.dataset.state!);
    const price_rangeall = parsed_range.items
        .slice(0, 4)
        .map((i:any) => {
            let priceEl = i.mainState.find((element: any) => element.atom.type == "price")?.atom.price
            if(!priceEl) {
                priceEl = i.mainState.find((element: any) => element.atom.type == "priceWithTitle")?.atom.priceWithTitle
            }
            if(!priceEl){
                throw new Error(`cannot find priceWithTitle in ${JSON.stringify(i.mainState)}`);
            }
            return parseFloat(priceEl.price.replace(/\D/g,""))
        })
    return [Math.min(...price_rangeall), URL];
}

export function listenToIPCMessages(){
    chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
        switch(message.fn){
            case 'fetchOzon':
                fetchOzon(message.search)
                    .then(result => sendResponse({result}))
                    .catch(exception => sendResponse({exception}))
        }
        return true; // mandatory for async sendResponse !
    });
}
