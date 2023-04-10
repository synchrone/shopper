import {format_unit_price, ver_check, take_selectors} from '../common/calculate'

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
        // console.log(`${URL} ${real_URL} cannot find id^=state-searchResultsV2 in ${text}`, URL, real_URL);
        throw new Error(`cannot find ${search} on ozone`);
    }
    function findpriceperunit(mainState: any[], price:number){
        
        for (const co of mainState) {
            if (co.atom.type == "labelList"){
                for (const item of co.atom.labelList.items){
                    if(item.title.includes("100 гр")){
                        let ta242 = item.title.replace(/\s+/g,"").match(/^\d+/)[0];
                        return ta242;
                    }
                }
            }
        } 
        for (const yo of mainState){
            if (yo.id == "name"){
                let kg232 = yo.atom.textAtom.text.match(/([\d.]+) ?([км]?[гл])/);
                let sh232 = yo.atom.textAtom.text.match(/([\d.]+) ?шт/);
                let regular_kg232 = parseFloat(kg232[1]);
                if (sh232 != null){
                    let regular_sh232 = parseFloat(sh232[1]);
                    if (sh232[2] == "шт"){
                        price = price/regular_sh232;
                    }
                }
                if (kg232[2] == "л"){
                    regular_kg232*=1000;
                }
                if (kg232[2] == "кг"){
                    regular_kg232*=1000;
                }
                let price_per_un = (price/(regular_kg232/100)).toFixed(2);
                return price_per_un;
            }
        }
    }
    let parsed_range = JSON.parse(ozon_price_range!.dataset.state!);
    const price_rangeall = parsed_range.items
        .slice(0, 4)
        .map((i:any) => {
            
            let priceEl = i.mainState.find((element: any) => element.atom.type == "price")?.atom.price;
            if(!priceEl) {
                priceEl = i.mainState.find((element: any) => element.atom.type == "priceWithTitle")?.atom.priceWithTitle
            }
            if(!priceEl){
                throw new Error(`cannot find priceWithTitle in ${JSON.stringify(i.mainState)}`);
            }
            let price = parseFloat(priceEl.price.replace(/\D/g,""));
            let shue = {
                price,
                price_per: findpriceperunit(i.mainState, price),
                URL
            };         
            return shue;
        })
        if (price_rangeall.every((price: any) => price.price_per)){
            price_rangeall.sort((a: any,b: any) => a.price_per - b.price_per)
        }
        else {
            price_rangeall.sort((a: any,b: any) => a.price - b.price)
        }
    return [...price_rangeall];
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
async function fetchYandex(search: string){
    let result = await fetch(`https://market.yandex.ru/search?text=${encodeURIComponent(search)}`, {});
    let text = await result.text();
    var parser = new DOMParser();
    var doc = parser.parseFromString(text, "text/html");
    
    let {parent_price, price, old_title, title} = take_selectors(doc);  
    for (const [i,m] of price.entries()){
        let {regular_units, innerPrice} = ver_check(i, m, title, old_title, parent_price);

        if(regular_units != null){
            format_unit_price(regular_units, innerPrice);
        }
    }
}