export function take_selectors(a: Document|Element){
    let parent_price = a.querySelectorAll<HTMLElement>('[data-auto="price-block"] > span:nth-of-type(2)');
    let price = a.querySelectorAll<HTMLElement>('[data-auto="price-block"] ');
    let title = a.querySelectorAll<HTMLElement>('[data-auto="snippet-title-header"]');
    let old_parent_price = a.querySelectorAll<HTMLElement>('[data-zone-name="price"]');
    let old_price = a.querySelectorAll<HTMLElement>('[data-zone-name="price"] > div > a > div > span > span:first-of-type');
    let old_title = a.querySelectorAll<HTMLElement>('[data-auto="product-title"]');
    if(old_title.length > 0){
        parent_price = old_parent_price;
        price = old_price;
    }
    return {parent_price, price, old_title, title}
}
export function ver_check(
    i:number, 
    m:HTMLElement, 
    title:NodeListOf<HTMLElement>, 
    old_title:NodeListOf<HTMLElement>|undefined, 
    parent_price:NodeListOf<HTMLElement>
    ){
    let innerPrice;
    let title_units:string;
    if(old_title && old_title.length > 0){
        let parent_price2 = parent_price[i].previousElementSibling!;
        if(parent_price2.classList.length > 0){
            innerPrice = parseFloat(parent_price[i].previousElementSibling?.textContent!.replace(/ /g,"")!);
        }
        else{
            innerPrice = parseFloat(m.innerText.replace(/ /g,""));
        }
        title_units = old_title[i].title;
    }
    else{
        innerPrice = parseFloat(parent_price[i].textContent!.replace(/\s+/g,"")!);
        title_units = title[i].innerText;
    }
    let regular_units = title_units.toLowerCase().match(/([\d.]+)\s?([км]?[гл]|шт)/);
    return {regular_units, innerPrice, title_units};
}
export function format_unit_price(regular_units:string[], innerPrice:number){
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
    let text_product_linka = `${result.toFixed(2).toString()} ${ending}`;
    return text_product_linka;    
}
export function OzonPriceCalc(doc:Document|Element, search:any){
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