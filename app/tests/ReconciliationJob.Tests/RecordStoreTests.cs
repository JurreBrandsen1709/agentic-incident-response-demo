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
}
