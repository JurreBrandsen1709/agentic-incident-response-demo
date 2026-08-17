keywords: [date, utc, boundary, inclusive, timestamp, window, records_processed]

# ADR-0001: Date ranges are UTC and inclusive on both ends

## Status
Accepted

## Context
The nightly reconciliation job pulls records from the upstream vendor feed for a
UTC time window. The vendor's export process stamps every record in a nightly
batch with a single UTC timestamp: the batch's cutoff time. In practice, that
means an entire night's batch can share one exact timestamp value, and that
value always lands exactly on the window's upper bound.

## Decision
All date-range queries in this codebase use UTC timestamps and treat both the
lower and upper bound as inclusive (`>=` and `<=`, never `<` or `>`).

## Consequences
An exclusive comparison on either bound doesn't just risk losing one edge-case
record — because of how the vendor batches timestamps, it can silently drop an
entire night's batch. Any change to `IRecordStore.GetRecordsForWindow` must
preserve inclusive bounds on both ends.
