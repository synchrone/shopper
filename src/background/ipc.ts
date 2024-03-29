import {format_unit_price, ver_check, take_selectors, OzonPriceCalc} from '../common/calculate'

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
    OzonPriceCalc(doc, search);
}

export function listenToIPCMessages(){
    chrome.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
        switch(message.fn){
            case 'fetchOzon':
                fetchOzon(message.search)
                    .then(result => sendResponse({result}))
                    .catch(exception => sendResponse({exception}))
            case 'fetchYandex':
                fetchYandex(message.search)
                    .then(result => sendResponse({result}))
                    .catch(exception => sendResponse({exception}))
        }
        return true; // mandatory for async sendResponse !
    });
}
async function fetchYandex(search: string){
    let result = await fetch(`https://market.yandex.ru/search?text=${encodeURIComponent(search)}`, {});
    let text = await result.text();
    var parser = new DOMParser();
    var doc = parser.parseFromString(text, "text/html");
    
    let price_rangeall;
    let {parent_price, price, old_title, title} = take_selectors(doc);  
    for (const [i,m] of price.entries()){
        let {regular_units, innerPrice} = ver_check(i, m, title, old_title, parent_price);

        if(regular_units != null){
            let innerMass = parseFloat(regular_units[1]);
            if (regular_units[2] == "кг"){
                innerMass*=1000;
                regular_units[2] = "гр";
            }
            if (regular_units[2] == "л"){
                innerMass*=1000;
                regular_units[2] = "мл";
            }
            let dividinger = innerPrice/(innerMass/100);
            if (regular_units[2] == "шт"){
                dividinger = innerPrice/innerMass;
            }
            let price1 = [];
            price1.push(dividinger.toFixed(2));
            price1.sort((a: any,b: any) => a - b);
            price_rangeall = [price1, result.url, regular_units[2]];
        }
    }
    return price_rangeall;
    
}