# Stockroom

Track stock moves and open orders, then size replenishment in supplier pack multiples.

## Use the app

Create an item and use Record movement → Count stock to enter the opening physical count. Log issues, place purchase orders, and receive them partially or fully. Use the Reorder view to review suggested quantities before placing each order.

## Data and calculations

Inventory position equals on-hand units plus open orders. The reorder point covers average demand through lead time plus safety stock. At or below that point, the suggestion tops up through one additional review interval, rounded up to a whole supplier pack. Forecast inputs are entered manually.

## Build on it

Connect a catalog, barcode scans and supplier purchase orders. Persist immutable per-location movement events and protect concurrent stock deductions when building a hosted service.
