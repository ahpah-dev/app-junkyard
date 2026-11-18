# Runway Planner

Model cash reserves, compounding recurring revenue streams, and scheduled operating expenses to calculate monthly burn, runway, break-even month, and default-alive status.

## Using the app

Add a `Cash Reserve` balance along with `Revenue` and `Expense` drivers specifying monthly amounts, month-over-month growth rates, and active months (`1–18`). Inspect the 18-month projected cash trajectory, break-even month, and export the full monthly cash-flow table to CSV.

## Data and calculations

Each active stream compounds monthly by `(1 + growthPct / 100)^(month - startMonth)` rounded to integer USD cents. Runway reports exact fractional months until projected cash drops below zero, or `18+ (Default Alive)` when cash stays positive across the 18-month horizon.

## Build on it

Connect accounting ledger feeds or scenario sliders to compare hiring plans against revenue milestones.

See the [collection guide](../../README.md) for running the gallery or exporting this app.
