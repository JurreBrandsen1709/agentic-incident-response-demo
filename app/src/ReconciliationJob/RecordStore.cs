using System.Globalization;
using System.Text.Json;

namespace ReconciliationJob;

public class RecordStore : IRecordStore
{
    private readonly IReadOnlyList<Record> _records;

    public RecordStore(IReadOnlyList<Record> records)
    {
        _records = records;
    }

    public static RecordStore FromFixtureFile(string fixturePath)
    {
        var json = File.ReadAllText(fixturePath);
        var raw = JsonSerializer.Deserialize<List<RawRecord>>(json, new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true
        }) ?? throw new InvalidOperationException($"Fixture at {fixturePath} contained no records.");

        var records = raw
            .Select(r => new Record(
                r.Id,
                DateTime.Parse(r.TimestampUtc, CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal),
                r.Amount))
            .ToList();

        return new RecordStore(records);
    }

    public IReadOnlyList<Record> GetRecordsForWindow(DateTime fromUtc, DateTime toUtc)
    {
        return _records
            .Where(r => r.TimestampUtc >= fromUtc && r.TimestampUtc <= toUtc)
            .ToList();
    }

    private class RawRecord
    {
        public string Id { get; set; } = "";
        public string TimestampUtc { get; set; } = "";
        public decimal Amount { get; set; }
    }
}
