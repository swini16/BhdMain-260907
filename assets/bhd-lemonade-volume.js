if (!customElements.get('bhd-lemonade-volume')) {
  customElements.define('bhd-lemonade-volume', class extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.productInfo = this.closest('product-info');
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.addEventListener('click', (event) => this.choose(event), options);
      document.addEventListener('input', (event) => this.onFormChange(event), options);
      document.addEventListener('change', (event) => this.onFormChange(event), options);
      document.addEventListener('visibilitychange', () => this.sync(), options);
      this.observer = new MutationObserver((records) => {
        if (records.some((record) => record.target === this.input && record.attributeName === 'data-cart-quantity')) {
          this.quantityRulesPending = false;
        }
        this.sync();
      });
      this.observer.observe(this.productInfo || this, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: ['min', 'max', 'step', 'disabled', 'value', 'data-min', 'data-max', 'data-cart-quantity']
      });

      if (typeof subscribe === 'function' && typeof PUB_SUB_EVENTS !== 'undefined') {
        this.unsubscribeVariant = subscribe(PUB_SUB_EVENTS.variantChange, ({ data }) => {
          const sourceSection = this.productInfo?.dataset.originalSection || this.dataset.sectionId;
          if (String(data.sectionId) !== sourceSection) return;
          const source = data.html?.getElementById(`BhdLemonadeVolume-${sourceSection}`);
          const currentDetails = this.details;
          if (!source || !data.variant) {
            this.hidden = true;
            if (currentDetails) currentDetails.hidden = true;
            return;
          }
          currentDetails?.remove();
          this.hidden = false;
          this.innerHTML = source.innerHTML;
          Object.entries(source.dataset).forEach(([key, value]) => {
            if (key !== 'sectionId') this.dataset[key] = value;
          });
          this.cartUncertain = false;
          this.quantityRulesPending = false;
          if (this.positionBesideQuantity()) this.dataset.positioned = 'true';
          this.sync();
        });
        this.unsubscribeQuantity = subscribe(PUB_SUB_EVENTS.quantityUpdate, () => this.sync());
        this.unsubscribeCart = subscribe(PUB_SUB_EVENTS.cartUpdate, (event) => {
          // Native product-info refreshes these bounds after the cart response arrives.
          this.observer.takeRecords();
          this.quantityRulesPending = true;
          this.cartUncertain = !this.readCartState(event.cartData);
          this.sync();
        });
      }
      this.sync();
      queueMicrotask(() => {
        if (!this.isConnected) return;
        if (this.positionBesideQuantity()) {
          this.dataset.positioned = 'true';
          this.sync();
        }
      });
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.controller = null;
      this.observer?.disconnect();
      this.unsubscribeVariant?.();
      this.unsubscribeQuantity?.();
      this.unsubscribeCart?.();
    }

    get form() { return document.getElementById(`product-form-${this.dataset.sectionId}`); }

    get input() {
      const input = document.getElementById(`Quantity-${this.dataset.sectionId}`);
      return input?.form === this.form ? input : null;
    }

    get details() {
      return this.dataset.detailsId ? document.getElementById(this.dataset.detailsId) : null;
    }

    positionBesideQuantity() {
      const quantityControl = this.input?.closest('quantity-input');
      const container = quantityControl?.closest('.price-per-item__container');
      if (!quantityControl || !container) return false;
      if (this.parentElement !== container) quantityControl.after(this);
      const details = this.details;
      if (details && details.previousElementSibling !== container) container.after(details);
      return this.parentElement === container;
    }

    hasSellingPlan() {
      if (this.dataset.requiresSellingPlan === 'true') return true;
      const form = this.form;
      if (!form) return this.dataset.initialSubscription === 'true';
      const plan = new FormData(form).get('selling_plan');
      return plan === null ? this.dataset.initialSubscription === 'true' : String(plan).trim() !== '';
    }

    onFormChange(event) {
      if (event.target.form === this.form || this.productInfo?.contains(event.target)) this.sync();
    }

    accepts(quantity) {
      const input = this.input;
      if (!input || input.disabled || this.dataset.available !== 'true') return false;
      const minimum = input.min === '' ? 1 : Number(input.min);
      const cartQuantity = Number(input.dataset.cartQuantity) || 0;
      const ruleMaximum = input.dataset.max === undefined ? Infinity : Number(input.dataset.max) - cartQuantity;
      const stockMaximum = this.dataset.stockLimit === '' || this.dataset.stockLimit === undefined
        ? Infinity : Number(this.dataset.stockLimit) - cartQuantity;
      const maximum = Math.min(input.max === '' ? Infinity : Number(input.max), ruleMaximum, stockMaximum);
      const step = input.step === 'any' ? 0 : (Number(input.step) || 1);
      if (!Number.isInteger(quantity) || quantity <= 0 || quantity < minimum || quantity > maximum) return false;
      return !step || Math.abs((quantity - minimum) / step - Math.round((quantity - minimum) / step)) < 1e-8;
    }

    readCartState(cart) {
      if (!cart) return false;
      // Cart-add JSON contains only the added lines. Returned sections contain full server cart evidence.
      const states = [];
      for (const html of Object.values(cart.sections || {})) {
        if (typeof html !== 'string') continue;
        const document = new DOMParser().parseFromString(html, 'text/html');
        for (const state of document.querySelectorAll('[data-volume-cart-state]')) {
          const quantity = Number(state.dataset.quantity);
          const knownPercent = Number(state.dataset.knownPercent);
          const bulkPercent = state.dataset.bulkPercent === undefined ? 0 : Number(state.dataset.bulkPercent);
          if (!Number.isInteger(quantity) || quantity < 0 || !Number.isFinite(knownPercent) || knownPercent < 0 || knownPercent > 100 || !Number.isFinite(bulkPercent) || bulkPercent < 0 || bulkPercent > 100 || !['true', 'false'].includes(state.dataset.unknownDiscount)) return false;
          states.push({ quantity, knownPercent, bulkPercent, unknownDiscount: state.dataset.unknownDiscount === 'true' });
        }
      }
      if (states.length) {
        if (states.some((state) => JSON.stringify(state) !== JSON.stringify(states[0]))) return false;
        return this.setCartState(states[0]);
      }
      if (!Number.isInteger(cart.item_count) || !Array.isArray(cart.items)) return false;
      const quantity = cart.items.filter((item) =>
        [8904882422044, 10168145281308].includes(Number(item.product_id)) && !item.selling_plan_allocation
      ).reduce((sum, item) => sum + Number(item.quantity), 0);
      if (!Number.isInteger(quantity) || quantity < 0) return false;
      const applications = (cart.cart_level_discount_applications || []).concat(cart.items.flatMap((item) =>
        (item.line_level_discount_allocations || item.discount_allocations || []).map((allocation) => allocation.discount_application)
      ));
      const automaticRates = {
        'Lemonade: Buy 2+, save 10%': 10,
        'Lemonade: Buy 3+, save 15%': 15,
        'Lemonade: Buy 10+, save 20%': 20,
        'BHD BFCM 2026 · 20% · 1 jar': 20,
        'BHD BFCM 2026 · 25% · 2+ jars': 25
      };
      let knownPercent = 0;
      let bulkPercent = 0;
      let unknownDiscount = false;
      for (const application of applications) {
        const recognizedAutomatic = application?.type === 'automatic'
          ? automaticRates[application.title]
          : undefined;
        const percent = Number.isFinite(recognizedAutomatic)
          ? recognizedAutomatic
          : (application?.value_type === 'percentage' ? Number(application.value) : undefined);
        if (!Number.isFinite(percent) || percent < 0 || percent > 100) unknownDiscount = true;
        else {
          knownPercent = Math.max(knownPercent, percent);
          if (Number.isFinite(recognizedAutomatic)) bulkPercent = Math.max(bulkPercent, recognizedAutomatic);
        }
      }
      return this.setCartState({ quantity, knownPercent, bulkPercent, unknownDiscount });
    }

    setCartState({ quantity, knownPercent, bulkPercent = 0, unknownDiscount }) {
      this.dataset.cartQuantity = String(quantity);
      this.dataset.knownPercent = String(knownPercent);
      this.dataset.bulkPercent = String(bulkPercent);
      this.dataset.unknownDiscount = String(unknownDiscount);
      return true;
    }

    sync() {
      const input = this.input;
      const selected = Number(input?.value);
      const variantMatches = this.form?.querySelector('[name="id"]')?.value === this.dataset.variantId;
      const eligible = !this.hasSellingPlan() && variantMatches && this.accepts(selected);
      const offers = this.querySelector('[data-volume-offers]');
      const details = this.details;
      const button = this.querySelector('[data-volume-add]');
      const confirmation = this.querySelector('[data-volume-confirmation]');
      const announcement = this.querySelector('[data-volume-announcement]')
        || details?.querySelector('[data-volume-announcement]');
      if (offers) offers.hidden = !eligible;
      if (details) details.hidden = !eligible;
      const now = Date.now() / 1000;
      const bfcm = now >= Number(this.dataset.bfcmStart) && now < Number(this.dataset.bfcmEnd);
      const prospective = selected + Number(this.dataset.cartQuantity || 0);
      let key = bfcm ? 'confirmationBfcm' : 'confirmation';
      let targetPercent = bfcm ? 25 : 15;
      let canUpgrade = false;
      let isUpgrade = false;
      let requiredSelected = selected;
      let displayText = '';
      if (bfcm && prospective === 1) {
        key = 'nudgeBfcm';
        canUpgrade = true;
        isUpgrade = true;
        requiredSelected = selected + 1;
      } else if (!bfcm && prospective === 1) {
        key = 'nudgeOne';
        targetPercent = 10;
        canUpgrade = true;
        isUpgrade = true;
        requiredSelected = selected + 1;
      } else if (!bfcm && prospective === 2) {
        key = 'nudgeTwo';
        canUpgrade = true;
        isUpgrade = true;
        requiredSelected = selected + 1;
      } else if (!bfcm && prospective >= 3 && prospective < 10) {
        key = 'confirmation';
        targetPercent = 20;
        isUpgrade = true;
        const remaining = 10 - prospective;
        requiredSelected = selected + remaining;
        displayText = (this.dataset.nextBulkTemplate || 'Add __COUNT__ more for 20% off')
          .replace('__COUNT__', String(remaining));
      } else if (!bfcm && prospective >= 10) {
        key = 'confirmationBulk';
        targetPercent = 20;
      }
      const knownPercent = Number(this.dataset.knownPercent || 0);
      if (knownPercent > targetPercent || (isUpgrade && knownPercent >= targetPercent)) {
        key = 'betterOffer';
        canUpgrade = false;
        isUpgrade = false;
        displayText = '';
      }
      if (this.cartUncertain || this.dataset.unknownDiscount === 'true' || bfcm !== (this.dataset.bfcm === 'true')) {
        key = 'generic';
        canUpgrade = false;
        isUpgrade = false;
        displayText = '';
      }
      if (isUpgrade && (this.quantityRulesPending || !this.accepts(requiredSelected))) {
        key = 'generic';
        canUpgrade = false;
        isUpgrade = false;
        displayText = '';
      }
      const text = this.dataset[key] || this.dataset.generic;
      const visibleText = displayText || text;
      const actionable = eligible && canUpgrade;
      if (button) {
        const buttonText = actionable ? text : '';
        if (button.textContent !== buttonText) button.textContent = buttonText;
        button.hidden = !actionable;
        if (button.disabled === actionable) button.disabled = !actionable;
      }
      if (confirmation) {
        const confirmationText = actionable ? '' : text;
        if (confirmation.textContent !== confirmationText) confirmation.textContent = confirmationText;
        confirmation.hidden = actionable;
      }
      const visibleElement = eligible ? (actionable ? button : confirmation) : null;
      if (announcement) {
        const announcementText = eligible ? visibleText : '';
        if (announcement.textContent !== announcementText) announcement.textContent = announcementText;
      }
      for (const element of [button, confirmation]) {
        if (!element) continue;
        if (element === visibleElement) {
          element.dataset.displayText = visibleText;
          element.setAttribute('aria-label', visibleText);
        } else {
          delete element.dataset.displayText;
          element.removeAttribute('aria-label');
        }
      }
    }

    choose(event) {
      const button = event.target.closest('[data-volume-add]');
      if (!button || !this.contains(button)) return;
      this.sync();
      if (button.disabled || button.hidden || this.hasSellingPlan()) return;
      if (this.form?.querySelector('[name="id"]')?.value !== this.dataset.variantId) return;
      const input = this.input;
      const quantity = Number(input?.value) + 1;
      if (!input || !this.accepts(quantity)) return;
      input.value = String(quantity);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      this.sync();
      if (button.hidden) input.focus({ preventScroll: true });
    }
  });
}
