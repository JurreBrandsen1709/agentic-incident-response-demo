## Task 2: Scaffold the .NET reconciliation job (TDD)

**Files:**
- Create: `app/ReconciliationJob.sln`
- Create: `app/src/ReconciliationJob/ReconciliationJob.csproj`
- Create: `app/src/ReconciliationJob/Record.cs`
- Create: `app/src/ReconciliationJob/IRecordStore.cs`
- Create: `app/src/ReconciliationJob/RecordStore.cs`
- Create: `app/tests/ReconciliationJob.Tests/ReconciliationJob.Tests.csproj`
- Create: `app/tests/ReconciliationJob.Tests/RecordStoreTests.cs`

**Interfaces:**
- Produces: `Record(string Id, DateTime TimestampUtc, decimal Amount)`; `IRecordStore.GetRecordsForWindow(DateTime fromUtc, DateTime toUtc): IReadOnlyList<Record>`; `RecordStore(IReadOnlyList<Record> records)` constructor; `RecordStore.FromFixtureFile(string fixturePath): RecordStore` static factory (used by Task 3).

- [ ] **Step 1: Scaffold the projects via the .NET CLI**

```bash
cd app
dotnet new sln -n ReconciliationJob
dotnet new console -n ReconciliationJob -o src/ReconciliationJob
dotnet new xunit -n ReconciliationJob.Tests -o tests/ReconciliationJob.Tests
dotnet sln ReconciliationJob.sln add src/ReconciliationJob/ReconciliationJob.csproj tests/ReconciliationJob.Tests/ReconciliationJob.Tests.csproj
dotnet add tests/ReconciliationJob.Tests/ReconciliationJob.Tests.csproj reference src/ReconciliationJob/ReconciliationJob.csproj
rm tests/ReconciliationJob.Tests/UnitTest1.cs
cd ..
```

- [ ] **Step 2: Write the failing test**

Create `app/tests/ReconciliationJob.Tests/RecordStoreTests.cs`:

```csharp
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
}
```

This is deliberately the *only* test that ships in the good state — timestamps strictly inside the window, never on a boundary. That gap is intentional (Task 9 exploits it).

- [ ] **Step 3: Run the test to confirm it fails**

```bash
dotnet test app/ReconciliationJob.sln
```
Expected: FAIL — compile error, `Record`/`IRecordStore`/`RecordStore` don't exist yet.

- [ ] **Step 4: Implement the three source files**

Create `app/src/ReconciliationJob/Record.cs`:

```csharp
namespace ReconciliationJob;

public record Record(string Id, DateTime TimestampUtc, decimal Amount);
```

Create `app/src/ReconciliationJob/IRecordStore.cs`:

```csharp
namespace ReconciliationJob;

public interface IRecordStore
{
    IReadOnlyList<Record> GetRecordsForWindow(DateTime fromUtc, DateTime toUtc);
}
```

Create `app/src/ReconciliationJob/RecordStore.cs`:

```csharp
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
```

- [ ] **Step 5: Run the test to confirm it passes**

```bash
dotnet test app/ReconciliationJob.sln
```
Expected: PASS, 1 test.

- [ ] **Step 6: Commit and push**

```bash
git add app/
git commit -m "Scaffold ReconciliationJob with inclusive-boundary RecordStore"
git push origin main
```

---

