if (!customElements.get('bhd-lemonade-volume')) {
  customElements.define('bhd-lemonade-volume', class extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      const options = { signal: this.controller.signal };
      this.productInfo = this.closest('product-info');
      this.addEventListener('click', (event) => this.choose(event), options);
      document.addEventListener('input', (event) => this.onFormChange(event), options);
      document.addEventListener('change', (event) => this.onFormChange(event), options);
      this.observer = new MutationObserver(() => this.sync());
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
          if (!source || !data.variant) {
            this.hidden = true;
            return;
          }
          this.hidden = false;
          this.innerHTML = source.innerHTML;
          ['variantId', 'available', 'stockLimit', 'initialSubscription', 'requiresSellingPlan', 'selectedMessage'].forEach((key) => {
            this.dataset[key] = source.dataset[key];
          });
          this.sync();
        });
        this.unsubscribeQuantity = subscribe(PUB_SUB_EVENTS.quantityUpdate, () => this.sync());
      }
      this.sync();
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.controller = null;
      this.observer?.disconnect();
      this.unsubscribeVariant?.();
      this.unsubscribeQuantity?.();
    }

    get form() {
      return document.getElementById(`product-form-${this.dataset.sectionId}`);
    }

    get input() {
      const input = document.getElementById(`Quantity-${this.dataset.sectionId}`);
      return input?.form === this.form ? input : null;
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
      if (!Number.isFinite(quantity) || quantity < minimum || quantity > maximum) return false;
      return !step || Math.abs((quantity - minimum) / step - Math.round((quantity - minimum) / step)) < 1e-8;
    }

    sync() {
      const input = this.input;
      const subscription = this.hasSellingPlan();
      const variantInput = this.form?.querySelector('[name="id"]');
      const variantMatches = variantInput?.value === this.dataset.variantId;
      const offers = this.querySelector('[data-volume-offers]');
      if (offers) offers.hidden = subscription || !variantMatches;
      this.querySelectorAll('[data-volume-quantity]').forEach((button) => {
        const quantity = Number(button.dataset.volumeQuantity);
        const disabled = subscription || !variantMatches || !this.accepts(quantity);
        if (button.disabled !== disabled) button.disabled = disabled;
        const selected = !disabled && input?.value !== '' && Number(input.value) === quantity;
        button.setAttribute('aria-pressed', String(selected));
      });
    }

    choose(event) {
      const button = event.target.closest('[data-volume-quantity]');
      if (!button || !this.contains(button) || button.disabled || this.hasSellingPlan()) return;
      if (this.form?.querySelector('[name="id"]')?.value !== this.dataset.variantId) return;
      const quantity = Number(button.dataset.volumeQuantity);
      const input = this.input;
      if (!input || !this.accepts(quantity)) return;
      input.value = String(quantity);
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      this.sync();
      const status = this.querySelector('[data-volume-status]');
      if (status) status.textContent = this.dataset.selectedMessage.replace('__QUANTITY__', String(quantity));
    }
  });
}
