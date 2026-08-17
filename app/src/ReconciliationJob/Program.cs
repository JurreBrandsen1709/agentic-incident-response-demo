using System.Globalization;
using ReconciliationJob;

if (args.Length < 3)
{
    Console.Error.WriteLine("Usage: dotnet run --project app/src/ReconciliationJob -- <fixturePath> <fromUtcIso> <toUtcIso>");
    return 1;
}

var fixturePath = args[0];
var fromUtc = DateTime.Parse(args[1], CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);
var toUtc = DateTime.Parse(args[2], CultureInfo.InvariantCulture, DateTimeStyles.AdjustToUniversal | DateTimeStyles.AssumeUniversal);

IRecordStore store = RecordStore.FromFixtureFile(fixturePath);
var records = store.GetRecordsForWindow(fromUtc, toUtc);

Console.WriteLine($"records_processed: {records.Count}");
return 0;
