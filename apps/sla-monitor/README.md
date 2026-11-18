# SLA Monitor

Track service availability SLOs (99% to 99.999%), 30-day error budget consumption, burn rates, P99 latency compliance, and release-freeze alerts.

## Using the app

Register services with their reliability tier, availability SLO target, and P99 latency threshold. Log downtime events inside any service to monitor remaining error budget minutes, actual 30-day uptime, and whether a service enters At Risk (≤25% budget) or Release Freeze (Budget Exhausted) status.

## Data and calculations

Error budgets scale linearly against a 30-day (43,200-minute) rolling window (`43,200 × (1 − targetPct / 100)`). Exceeding allowed downtime or P99 latency triggers `Budget exhausted`.

## Build on it

Ingest synthetic probe alerts and Prometheus metrics to drive automated deployment gates.

See the [collection guide](../../README.md) for running the gallery or exporting this app.
