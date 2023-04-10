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
export function ver_check(
    i:number, 
    m:HTMLElement, 
    title:NodeListOf<HTMLElement>, 
    old_title:NodeListOf<HTMLElement>, 
    parent_price:NodeListOf<Element>
    ){
    let innerPrice;
    let title_units:string;
    if(old_title.length > 0){
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
export function take_selectors(a: Document|Element){
    let parent_price = a.querySelectorAll('[data-auto="price-block"] > span:nth-of-type(2)');
    let price = a.querySelectorAll<HTMLElement>('[data-auto="price-block"] ');
    let title = a.querySelectorAll<HTMLElement>('[data-auto="snippet-title-header"]');
    let old_parent_price = a.querySelectorAll('[data-zone-name="price"]');
    let old_price = a.querySelectorAll<HTMLElement>('[data-zone-name="price"] > div > a > div > span > span:first-of-type');
    let old_title = a.querySelectorAll<HTMLElement>('[data-auto="product-title"]');
    if(old_title.length > 0){
        parent_price = old_parent_price;
        price = old_price;
    }
    return {parent_price, price, old_title, title}
}