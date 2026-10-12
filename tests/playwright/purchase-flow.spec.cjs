const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const simulated = process.env.SIMULATED_ZERO_STOCK === '1';
const theme = process.env.PREVIEW_THEME_ID;
const origin = process.env.BASE_URL || 'https://besthydrate.com';
const copy = 'Due to high demand, may take an extra day or two to arrive';
const url = route => {
  const u = new URL(route, origin);
  if(theme) u.searchParams.set('preview_theme_id', theme);
  u.searchParams.set('utm_source','qa_automation');
  return u.href;
};
test('Canadian product to checkout navigation without placing an order', async ({ page, context }, info) => {
  test.setTimeout(120000);
  const dir=path.join('artifacts/purchase-review',simulated?'simulated-zero':'actual-stock',info.project.name);
  fs.mkdirSync(dir,{recursive:true});
  await context.route('**/*',r => /google-analytics|googletagmanager|amplitude|facebook\.com\/tr|analytics\.tiktok|klaviyo|monorail|analytics\.shopify/.test(r.request().url()) ? r.fulfill({status:204,body:''}) : r.continue());
  // Select the Canadian market using Shopify's normal customer localization form.
  // GitHub-hosted runners can otherwise enter the US market, where the CA product is absent.
  await page.goto(url('/'),{waitUntil:'domcontentloaded'});
  const localized = await context.request.post(new URL('/localization',origin).href, {
    form:{form_type:'localization',utf8:'✓',_method:'put',country_code:'CA',return_to:'/'},
  });
  expect(localized.status()).toBeLessThan(400);
  const response = await page.goto(url('/products/lemonade-best-hydrate?variant=47373155631388'),{waitUntil:'domcontentloaded'});
  if(response.status()>=400) console.log('Product diagnostic:', JSON.stringify({status:response.status(),title:await page.title(),country:await page.evaluate(()=>window.Shopify?.country),body:(await page.locator('body').innerText()).slice(0,1000)}));
  expect(response.status()).toBeLessThan(400);
  if(theme) expect(await page.evaluate(()=>String(window.Shopify?.theme?.id))).toBe(String(theme));
  expect(await page.evaluate(()=>window.Shopify?.country)).toBe('CA');
  const product=page.locator('product-info').first();
  const button=product.locator('button[name="add"]').first();
  await expect(button).toBeEnabled();
  await expect(product.locator('input[name="id"]').first()).toHaveValue('47373155631388');
  if(simulated) {
    await expect(product.locator('.bhd-backorder-notice').first()).toHaveText(copy);
    await expect(page.locator('.bhd-pill--shipping').first()).toBeHidden();
    await expect(page.locator('.bhd-stock').first()).toBeHidden();
  } else await expect(product.locator('.bhd-backorder-notice')).toHaveCount(0);
  expect(await product.innerText()).not.toMatch(/\bbackorder\b/i);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(4);
  await page.screenshot({path:path.join(dir,'product.png'),fullPage:true});
  await button.click();
  const drawer=page.locator('cart-drawer');
  await expect(drawer).toHaveClass(/active/);
  await expect(drawer.locator('.cart-item__name').first()).toBeVisible();
  if(simulated) await expect(drawer.locator('.bhd-backorder-notice').first()).toHaveText(copy);
  await page.screenshot({path:path.join(dir,'drawer.png'),fullPage:true});
  await page.goto(url('/cart'),{waitUntil:'domcontentloaded'});
  const quantity=page.locator('cart-items input[name="updates[]"]').first();
  await expect(quantity).toHaveValue('1');
  const changed = page.waitForResponse(r => /\/cart\/change(?:\.js)?(?:[?#]|$)/.test(r.url()) && r.request().method() === 'POST');
  await quantity.fill('2');await quantity.press('Tab');
  const changeResponse = await changed;
  expect(changeResponse.status()).toBe(200);
  const changedCart = await changeResponse.json();
  expect(changedCart.items.find(i=>i.variant_id===47373155631388)?.quantity).toBe(2);
  await page.goto(url('/cart'),{waitUntil:'domcontentloaded'});
  await expect(page.locator('cart-items input[name="updates[]"]').first()).toHaveValue('2');
  if(simulated) await expect(page.locator('cart-items .bhd-backorder-notice').first()).toHaveText(copy);
  await page.screenshot({path:path.join(dir,'cart.png'),fullPage:true});
  const expectedProduct = (await page.locator('cart-items .cart-item__name').first().innerText()).trim();
  // Existing advertised code only: no discount creation and no payment submission.
  await page.goto(url('/discount/FIRST15?redirect=/cart'),{waitUntil:'domcontentloaded'});
  const checkout=page.locator('#checkout');
  await expect(checkout).toBeEnabled();
  await checkout.click();
  try {
    await page.waitForURL(/\/checkouts?\//,{timeout:45000,waitUntil:'domcontentloaded'});
    await expect(page.locator('input[type="email"], input[autocomplete="email"]').first()).toBeVisible({timeout:20000});
    // Shopify's mobile checkout labels this disclosure 'Order summary',
    // not necessarily 'Show order summary'. Require its collapsed state.
    const expandSummary = page.locator('button[aria-controls="mobileOrderSummary"]');
    if(info.project.name === 'mobile-chromium') {
      await expect(expandSummary).toBeVisible();
      await expect(expandSummary).toHaveAttribute('aria-expanded','false');
      await expandSummary.click();
      await expect(expandSummary).toHaveAttribute('aria-expanded','true');
    }
    const checkoutItem = page.getByRole('row').filter({hasText:expectedProduct}).first();
    await expect(checkoutItem).toBeVisible();
    await expect(checkoutItem.getByText('2', {exact:true})).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/verify you are human|security challenge|your cart is empty|something went wrong/i);
  } catch(error) {
    const end = new URL(page.url());
    console.log('Checkout diagnostic:', JSON.stringify({host:end.host,path:decodeURIComponent(end.pathname).replace(/(\/checkouts?\/).*/, '$1[redacted]'),title:await page.title(),body:(await page.locator('body').innerText()).slice(0,2500)}));
    throw error;
  }
  await expect(page.locator('body')).not.toContainText(/Your cart is empty|Something went wrong/);
  await page.screenshot({path:path.join(dir,'checkout.png'),fullPage:true});
  fs.writeFileSync(path.join(dir,'result.json'),JSON.stringify({mode:simulated?'simulated-liquid-zero-stock':'actual-stock',themeId:theme,viewport:page.viewportSize(),checkoutReached:true,checkoutItem:expectedProduct,checkoutQuantity:2,variantBeforeCheckout:47373155631388,orderPlaced:false,discountCodeAttempted:'FIRST15',capturedAt:new Date().toISOString()},null,2));
});
