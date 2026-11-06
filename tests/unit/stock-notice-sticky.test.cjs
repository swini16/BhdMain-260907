const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {JSDOM}=require('jsdom');
const source=fs.readFileSync('assets/bhd-backorder-sticky.js','utf8');
const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
function fixture(text='Estimated delay: 1–2 weeks.'){
 const dom=new JSDOM('<product-info><div id="BhdBackorder-test"></div><div data-bhd-mobile-sticky-buy class="bhd-mobile-sticky-buy"><button>Add to cart</button><span>Free &amp; Fast Delivery</span></div></product-info>',{runScripts:'outside-only'});
 const d=dom.window.document;const slot=d.querySelector('#BhdBackorder-test');if(text){const p=d.createElement('p');p.className='bhd-backorder-notice';p.textContent=text;slot.append(p);}
 dom.window.eval(source);d.dispatchEvent(new dom.window.Event('DOMContentLoaded'));return {dom,d,slot};
}
test('sticky mirrors escaped shared text before its button, without duplicating on repeated changes',async()=>{
 const {dom,d,slot}=fixture('<script>text only</script>');await tick();const sticky=d.querySelector('[data-bhd-mobile-sticky-buy]');assert.equal(sticky.firstElementChild.textContent,'<script>text only</script>');assert.equal(sticky.querySelector('script'),null);
 slot.firstElementChild.textContent='New delay';await tick();assert.equal(sticky.querySelector('.bhd-backorder-sticky-notice').textContent,'New delay');await tick();assert.equal(sticky.querySelectorAll('.bhd-backorder-sticky-notice').length,1);dom.window.close();
});
test('variant/placement disable removes stale sticky notice and later restores it',async()=>{
 const {dom,d,slot}=fixture();await tick();slot.innerHTML='';await tick();assert.equal(d.querySelector('.bhd-backorder-sticky-notice'),null);slot.innerHTML='<p class="bhd-backorder-notice">Restored delay</p>';await tick();assert.equal(d.querySelector('.bhd-backorder-sticky-notice').textContent,'Restored delay');dom.window.close();
});
test('CSS covers page-end shipping and fails closed until sticky disclosure exists',()=>{
 const css=fs.readFileSync('assets/bhd-backorder.css','utf8');assert(css.includes('.bhd-page-end-nav__shipping'));assert(css.includes('.bhd-mobile-sticky-buy:not(:has(.bhd-backorder-sticky-notice))'));assert(css.includes('display: none !important'));
});
