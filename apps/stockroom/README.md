# Stockroom

Track stock moves and open orders, then size replenishment in supplier pack multiples.

## Use the app

Create an item and use Record movement → Count stock to enter the opening physical count. Inspect runway days, coverage days, and EOQ pack benchmarks, place suggested replenishment orders in one click, or download a consolidated purchase order for all SKUs below their reorder point.

## Data and calculations

Inventory position equals on-hand units plus open orders. The reorder point covers average demand through lead time plus safety stock. At or below that point, the suggestion tops up through one additional review interval, rounded up to a whole supplier pack. Forecast inputs are entered manually.

## Build on it

Connect a catalog, barcode scans and supplier purchase orders. Persist immutable per-location movement events and protect concurrent stock deductions when building a hosted service.
