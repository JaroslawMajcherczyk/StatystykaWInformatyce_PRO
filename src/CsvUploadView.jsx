// CsvUploadView.jsx
import * as XLSX from "xlsx";

export default function CsvUploadView({
  data,
  headerMap,            // <-- przychodzi z App
  onDataLoaded,
  onHeaderMapChange,
}) {
  // mapujemy 1. kolumnę → "Data", kolejne → A1..An,
  // i zwracamy też mapę generic -> original
  const mapRowToGeneric = (headerRow, dataRows) => {
    if (!dataRows || dataRows.length === 0) {
      return { rows: [], headerMap: [] };
    }

    const normalizedHeaderRow =
      headerRow && headerRow.length > 0
        ? headerRow
        : Array.from({ length: dataRows[0].length }, (_, i) => `Col${i + 1}`);

    const headerMapLocal = normalizedHeaderRow.map((orig, index) => {
      const original = String(orig ?? "").trim();
      const generic = index === 0 ? "Data" : `A${index}`;
      return { original, generic }; // np. { original: "EUR", generic: "A1" }
    });

    const rows = dataRows.map((cols) => {
      const obj = {};
      headerMapLocal.forEach(({ generic }, index) => {
        const value = cols[index];
        if (generic === "Data") {
          obj[generic] = String(value ?? "").trim();
        } else {
          const num =
            typeof value === "number"
              ? value
              : parseFloat(String(value ?? "").replace(",", "."));
          obj[generic] = Number.isFinite(num) ? num : null;
        }
      });
      return obj;
    });

    return { rows, headerMap: headerMapLocal };
  };

  const parseCsvText = (text) => {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return { rows: [], headerMap: [] };

    const headerRow = lines[0].split(",").map((h) => h.trim());
    const dataRows = lines.slice(1).map((line) =>
      line.split(",").map((c) => c.trim())
    );

    return mapRowToGeneric(headerRow, dataRows);
  };

  const parseExcelArrayBuffer = (arrayBuffer) => {
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    if (!sheetData || sheetData.length < 2) {
      return { rows: [], headerMap: [] };
    }

    const headerRow = sheetData[0];
    const dataRows = sheetData.slice(1);

    return mapRowToGeneric(headerRow, dataRows);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const name = file.name.toLowerCase();
    const isCsv = name.endsWith(".csv");
    const isXlsx = name.endsWith(".xlsx") || name.endsWith(".xls");

    const reader = new FileReader();

    if (isCsv) {
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          const parsed = parseCsvText(text);
          onHeaderMapChange?.(parsed.headerMap); // zapis do App
          onDataLoaded?.(parsed.rows);           // zapis danych do App
        }
      };
      reader.readAsText(file);
    } else if (isXlsx) {
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result;
        if (arrayBuffer) {
          const parsed = parseExcelArrayBuffer(arrayBuffer);
          onHeaderMapChange?.(parsed.headerMap);
          onDataLoaded?.(parsed.rows);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      alert("Obsługiwane są tylko pliki CSV oraz Excel (.xlsx / .xls).");
    }
  };

  // podgląd rekordów jako tabelka – WSZYSTKIE, ze scrollowaniem
  const previewHeaders =
    data && data.length > 0 ? Object.keys(data[0]) : [];

  const previewRows = data ?? [];

  // budujemy mapkę generic -> original (np. "A1" -> "EUR")
  const headerLabelMap = {};
  (headerMap || []).forEach(({ generic, original }) => {
    headerLabelMap[generic] =
      original && original.length > 0 ? original : generic;
  });

  const getHeaderLabel = (generic) => {
    const orig = headerLabelMap[generic];
    if (!orig || orig === generic) return generic;
    return `${generic} (${orig})`; // np. A1 (EUR)
  };

  return (
    <div>
      <h2>Wczytaj dane z pliku CSV / Excel</h2>
      <p>
        Pierwsza kolumna jest mapowana na <code>Data</code>, kolejne na{" "}
        <code>A1</code>, <code>A2</code>, <code>A3</code>, <code>A4</code>,{" "}
        <code>A5</code> itd. W tabeli niżej w nagłówkach widzisz zarówno klucz
        wewnętrzny (A1...), jak i oryginalną nazwę z pliku (np. EUR, USD).
      </p>

      <input
        type="file"
        accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        onChange={handleFileUpload}
      />

      {data && data.length > 0 && (
        <>
            <p style={{ textAlign: "center", marginTop: "1rem" }}>
            Wczytano rekordów: {data.length}
            </p>

            <div
            style={{
                display: "flex",
                justifyContent: "center",
                marginTop: "0.5rem",
            }}
            >
                <div
                    style={{
                    maxHeight: 300,
                    overflow: "auto",
                    border: "1px solid #555",
                    borderRadius: 6,
                    padding: "0.5rem",
                    backgroundColor: "#222",
                    minWidth: "60%",
                    maxWidth: "90%",
                    }}
                >
                    <table
                    style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        tableLayout: "fixed",
                        fontSize: "0.9rem",
                    }}
                    >
                    <thead>
                        <tr>
                        {previewHeaders.map((h) => (
                            <th
                            key={h}
                            style={{
                                border: "1px solid #555",
                                padding: "0.4rem 0.6rem",
                                backgroundColor: "#333",
                                position: "sticky",
                                top: 0,
                                zIndex: 1,
                                textAlign: "center",
                                fontWeight: 600,
                            }}
                            >
                            {getHeaderLabel(h)}
                            </th>
                        ))}
                        </tr>
                    </thead>
                    <tbody>
                        {previewRows.map((row, idx) => (
                        <tr
                            key={idx}
                            style={{
                            backgroundColor: idx % 2 === 0 ? "#262626" : "#1f1f1f",
                            }}
                        >
                            {previewHeaders.map((h) => (
                            <td
                                key={h}
                                style={{
                                border: "1px solid #555",
                                padding: "0.35rem 0.6rem",
                                textAlign: h === "Data" ? "center" : "right",
                                whiteSpace: "nowrap",
                                }}
                            >
                                {row[h]}
                            </td>
                            ))}
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
        </>
        )}
    </div>
  );
}
