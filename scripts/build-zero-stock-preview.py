"""Transform only the disposable preview package, never product/inventory data."""
from pathlib import Path
import hashlib,json,sys
root=Path(sys.argv[1]).resolve()
if root != Path('/tmp/bhd-theme'):
    raise SystemExit('Only /tmp/bhd-theme is allowed')
manifest={}
for name in ['snippets/bhd-backorder-notice.liquid','sections/main-product.liquid']:
    source=Path(name).read_text()
    target=root/name
    if target.read_text()!=source:
        raise SystemExit('Preview source drift: '+name)
    # Simulate Liquid inventory inputs only. Cart/add and checkout remain real Shopify.
    # Product CA availability remains governed by Shopify (positive live inventory).
    prefix='variant' if name.startswith('snippets/') else 'product.selected_or_first_available_variant'
    simulated=source.replace(prefix+'.inventory_quantity','0').replace(prefix+'.inventory_policy', "'continue'")
    if simulated==source:raise SystemExit('Missing inventory expressions: '+name)
    target.write_text(simulated)
    manifest[name]={'source_sha256':hashlib.sha256(source.encode()).hexdigest(),'fixture_sha256':hashlib.sha256(simulated.encode()).hexdigest()}
Path('artifacts/purchase-review').mkdir(parents=True,exist_ok=True)
Path('artifacts/purchase-review/zero-stock-fixture.json').write_text(json.dumps(manifest,indent=2))
print('Simulated Liquid inventory inputs in disposable development theme only; no Shopify product mutation.')
