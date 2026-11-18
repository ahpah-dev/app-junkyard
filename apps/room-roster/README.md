# Room Roster

Book shared rooms and equipment, catch overlapping reservations, and find the next available working-hours slot.

## Use the app

Create a booking with a resource name, organizer, local date and time. Reuse the same resource name to share a calendar. Open a booking and choose Find open slot to preview and reserve the next gap for the same duration.

## Data and calculations

A reservation occupies a half-open interval on one local calendar day. Adjacent reservations can share endpoints, cancelled reservations release capacity, and name matching ignores case and repeated spaces. Slot search considers every calendar day from 09:00 to 18:00 over the next 31 days.

## Build on it

Connect equipment or room IDs, organization calendars, booking policies and server-side concurrency controls for a multi-tenant reservation product.
