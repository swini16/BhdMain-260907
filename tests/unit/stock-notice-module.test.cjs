const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {Liquid}=require('liquidjs');
const source=fs.readFileSync('snippets/bhd-backorder-notice.liquid','utf8');
const template=source.replace(/{% doc %}[\s\S]*?{% enddoc %}/g,'');
const variant={id:47373155631388,inventory_management:'shopify',inventory_quantity:0,inventory_policy:'continue'};
const base={bhd_backorder_enabled:true,bhd_backorder_variant_ids:'47373155631388',bhd_backorder_message:'Estimated delay: 1–2 weeks.'};
async function render(settings={},overrides={},placement='product'){
 const e=new Liquid();e.registerFilter('t',()=> JSON.parse(fs.readFileSync('locales/en.default.json')).products.product.backorder_delay);
 return e.parseAndRender(template,{settings:{...base,...settings},variant:{...variant,...overrides},placement});
}
test('each surface toggle disables only that surface',async()=>{
 for(const p of ['product','cart','drawer','notification']){
  const s={['bhd_backorder_show_'+p]:false};
  assert.equal((await render(s,{},p)).trim(),'');
  for(const other of ['product','cart','drawer','notification'].filter(x=>x!==p)) assert.match(await render(s,{},other),/1–2 weeks/);
 }
});
test('master toggle, blank scope, exact IDs and US exclusion',async()=>{
 for(const s of [{bhd_backorder_enabled:false},{bhd_backorder_variant_ids:''},{bhd_backorder_variant_ids:'147373155631388'}])assert.equal((await render(s)).trim(),'');
 assert.match(await render({bhd_backorder_variant_ids:'999, 47373155631388'}),/1–2 weeks/);
 assert.equal((await render({bhd_backorder_variant_ids:'51937870741788',bhd_backorder_mode:'manual'},{id:51937870741788})).trim(),'');
});
test('inventory mode and manual mode do not mutate inventory or require availability',async()=>{
 for(const v of [{inventory_quantity:1},{inventory_management:null},{inventory_policy:'deny'}])assert.equal((await render({},v)).trim(),'');
 assert.match(await render({bhd_backorder_mode:'manual'},{inventory_quantity:20,inventory_policy:'deny',available:false}),/1–2 weeks/);
 assert.match(await render({}, {inventory_quantity:-1}),/1–2 weeks/);
});
test('message escapes HTML; suppression is independently selectable',async()=>{
 const html=await render({bhd_backorder_message:'<script>alert(1)</script>'});assert(!html.includes('<script>'));assert(html.includes('&lt;script&gt;'));
 assert.match(await render(),/bhd-backorder-notice--suppress/);
 assert(!(await render({bhd_backorder_suppress_claims:false})).includes('bhd-backorder-notice--suppress'));
});
test('nine settings and placement integrations are present',()=>{
 const schema=JSON.parse(fs.readFileSync('config/settings_schema.json'));
 const group=schema.find(x=>x.name==='Stock and delay notice');assert.equal(group.settings.length,9);
 assert.equal(group.settings.find(x=>x.id==='bhd_backorder_message').default,JSON.parse(fs.readFileSync('locales/en.default.json')).products.product.backorder_delay);
 const ids=schema.flatMap(x=>x.settings||[]).map(x=>x.id).filter(Boolean);assert.equal(ids.length,new Set(ids).size);
 for(const [p,surface] of [['snippets/buy-buttons.liquid','product'],['snippets/cart-drawer.liquid','drawer'],['sections/main-cart-items.liquid','cart'],['sections/cart-notification-product.liquid','notification']]){
  const text=fs.readFileSync(p,'utf8');assert(text.includes("placement: '"+surface+"'"));
 }

});

test('product inventory block uses shared copy in manual in-stock state',async()=>{
 const content=fs.readFileSync('sections/main-product.liquid','utf8');
 const fragment=content.split("{%- when 'inventory' -%}")[1].split("{%- when 'description' -%}")[0];
 const e=new Liquid({root:'snippets',extname:'.liquid'});
 e.registerTag('doc',{parse(token,remain){let t;while((t=remain.shift())){if(t.name==='enddoc')break;}},render(){return '';}});
 e.registerFilter('t',x=>x);
 const v={...variant,inventory_quantity:20,inventory_management:'fba-shipping'};
 const settings={...base,bhd_backorder_mode:'manual'};
 e.options.globals={settings};
 const html=await e.parseAndRender(fragment,{settings,product:{selected_or_first_available_variant:v},block:{settings:{}},section:{id:'test'}});
 assert.match(html,/1–2 weeks/);assert(!html.includes('inventory_in_stock'));assert(!html.includes('visibility-hidden'));
});

test('blank message uses the current localized delay, never the obsolete estimate',async()=>{
 const html=await render({bhd_backorder_message:'   '});
 assert.match(html,/1–2 weeks/);assert(!html.includes('extra day or two'));
});
