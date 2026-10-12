const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const source = fs.readFileSync(process.env.CART_SOURCE_PATH || require('node:path').join(__dirname,'../assets/cart.js'),'utf8');
async function run(fail) {
  const registered = new Map();
  const primary = {innerHTML:'old'};
  const errors = {textContent:''};
  let published = false;
  const response={item_count:2,items:[{quantity:2}],sections:{drawer:'updated drawer'}};
  const ctx={HTMLElement:class{},window:{location:{pathname:'/products/lemonade-best-hydrate'},StandardEvents:{createViewEventElement:base=>base},cartStrings:{error:'update failed'}},customElements:{get:n=>registered.get(n),define:(n,c)=>registered.set(n,c)},document:{getElementById:id=>id==='CartDrawer'?primary:id==='CartDrawer-CartErrors'?errors:null,querySelector:()=>null,querySelectorAll:()=>[]},CartPerformance:{createStartingMarker:()=>0,measure:(_n,fn)=>fn(),measureFromMarker:()=>{}},fetch:async()=>({text:async()=>JSON.stringify(response)}),fetchConfig:()=>({}),routes:{cart_change_url:'/cart/change'},publish:()=>{published=true;},PUB_SUB_EVENTS:{cartUpdate:'cart-update'},console};
  vm.createContext(ctx);vm.runInContext(source,ctx);
  const cart=Object.create(registered.get('cart-items').prototype);
  Object.assign(cart,{classList:{toggle(){}},enableLoading(){},disableLoading(){},createCartLinesUpdateEvent:()=>null,resolveCartLinesUpdate(){},dispatchCartErrorEvent(){},updateLiveRegions(){},querySelector:()=>({value:'2',dataset:{}}),querySelectorAll:()=>[],getSectionsToRender:()=>[{id:'CartDrawer',section:'drawer',selector:'.drawer__inner'},{id:'cart-icon-bubble',section:'cart-icon-bubble',selector:'.shopify-section'}],getSectionInnerHTML:html=>{if(fail)throw Error('invalid section response');return html;}});
  primary.querySelector=()=>null;
  cart.updateQuantity(1,2,{currentTarget:{}},'updates[]',47373155631388);
  await new Promise(setImmediate);
  assert.equal(published,!fail);
  assert.equal(errors.textContent,fail?'update failed':'');
  if(!fail)assert.equal(primary.innerHTML,'updated drawer');
}
(async()=>{await run(false);await run(true);console.log('PASS: absent optional header target preserves successful cart update; malformed section still reports failure.');})().catch(e=>{console.error(e);process.exitCode=1;});
