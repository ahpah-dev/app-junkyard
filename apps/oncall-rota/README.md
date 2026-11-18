# Oncall Rota

Schedule primary and secondary on-call engineering rotations, enforce conflict-free responder assignments, monitor shift load fairness, and export RFC 5545 `.ics` calendar feeds.

## Using the app

Create rotation shifts with a service name, primary and secondary responders, and date window. The validator prevents self-backup assignments and overlapping shifts for the same person across services. Use **Swap primary / secondary** inside any shift or export the entire schedule as `.ics` or CSV.

## Data and calculations

Shifts span inclusive calendar days (up to 31 days per rotation). Responder load sums primary and secondary rotation days across active and upcoming schedules.

## Build on it

Integrate Slack/PagerDuty escalation webhooks and holiday overrides for an automated team rotation service.

See the [collection guide](../../README.md) for running the gallery or exporting this app.
