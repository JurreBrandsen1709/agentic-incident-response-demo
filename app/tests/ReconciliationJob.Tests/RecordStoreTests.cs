using ReconciliationJob;
using Xunit;

namespace ReconciliationJob.Tests;

public class RecordStoreTests
{
    private static DateTime Utc(int year, int month, int day, int hour = 0) =>
        new DateTime(year, month, day, hour, 0, 0, DateTimeKind.Utc);

    [Fact]
    public void GetRecordsForWindow_ReturnsRecordsSpreadThroughoutWindow()
    {
        var records = new List<Record>
        {
            new Record("r0", Utc(2026, 1, 1, 4), 10m),
            new Record("r1", Utc(2026, 1, 1, 12), 10m),
            new Record("r2", Utc(2026, 1, 1, 20), 10m),
        };
        var store = new RecordStore(records);

        var result = store.GetRecordsForWindow(Utc(2026, 1, 1), Utc(2026, 1, 2));

        Assert.Equal(3, result.Count);
    }

    [Fact]
    public void GetRecordsForWindow_IncludesRecordsAtExactUpperBound()
    {
        var records = new List<Record>
        {
            new Record("r1", Utc(2026, 1, 2), 120.50m),
            new Record("r2", Utc(2026, 1, 2), 45.00m),
            new Record("r3", Utc(2026, 1, 2), 78.25m),
            new Record("r4", Utc(2026, 1, 2), 200.00m),
            new Record("r5", Utc(2026, 1, 2), 15.75m),
        };
        var store = new RecordStore(records);

        var result = store.GetRecordsForWindow(Utc(2026, 1, 1), Utc(2026, 1, 2));

        Assert.Equal(5, result.Count);
    }

    [Fact]
    public void GetRecordsForWindow_MixedBoundaryAndEarlyRecords()
    {
        var records = new List<Record>
        {
            // Early arrivals during the day
            new Record("early1", Utc(2026, 1, 1, 3), 50.00m),
            new Record("early2", Utc(2026, 1, 1, 12), 75.00m),
            new Record("early3", Utc(2026, 1, 1, 18), 100.00m),
            // Batch records all arriving at exact upper bound (vendor export cutoff)
            new Record("batch1", Utc(2026, 1, 2), 150.00m),
            new Record("batch2", Utc(2026, 1, 2), 200.00m),
            new Record("batch3", Utc(2026, 1, 2), 175.00m),
        };
        var store = new RecordStore(records);

        var result = store.GetRecordsForWindow(Utc(2026, 1, 1), Utc(2026, 1, 2));

        Assert.Equal(6, result.Count);
        Assert.Contains(result, r => r.Id == "batch1");
        Assert.Contains(result, r => r.Id == "batch3");
    }
}
