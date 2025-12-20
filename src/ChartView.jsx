// ChartView.jsx
import { useMemo, useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from "recharts";

const LINE_COLORS = ["#8884d8", "#82ca9d", "#ff7300", "#ff0000", "#0088fe"];

export default function ChartView({ data, headerMap }) {
  const [selectedAttr, setSelectedAttr] = useState("ALL");
  const [isZoomed, setIsZoomed] = useState(false);

  const chartData = useMemo(() => data ?? [], [data]);

  const attributeKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]).filter((k) => k !== "Data");
    return keys.filter((k) =>
      data.some((row) => typeof row[k] === "number" && Number.isFinite(row[k]))
    );
  }, [data]);

  const headerLabelMap = useMemo(() => {
    const map = {};
    (headerMap || []).forEach(({ generic, original }) => {
      if (!generic) return;
      map[generic] =
        original && String(original).length > 0 ? String(original) : generic;
    });
    return map;
  }, [headerMap]);

  const getAttrLabel = (generic) => {
    const orig = headerLabelMap[generic];
    if (!orig || orig === generic) return generic;
    return `${generic} (${orig})`;
  };

  const getDataLabel = () => {
    const orig = headerLabelMap["Data"];
    if (!orig || orig === "Data") return "Data";
    return `Data (${orig})`;
  };

  // stały kolor dla atrybutu, niezależnie od filtrowania
  const attrColorMap = useMemo(() => {
    const map = {};
    attributeKeys.forEach((attr, idx) => {
      map[attr] = LINE_COLORS[idx % LINE_COLORS.length];
    });
    return map;
  }, [attributeKeys]);

  // ✅ Oś Y: od 0, max z marginesem
  const yDomain = useMemo(() => {
    if (!data || data.length === 0 || attributeKeys.length === 0) {
      return [0, "auto"];
    }

    let max = 0;

    for (const row of data) {
      for (const attr of attributeKeys) {
        const v = row[attr];
        if (typeof v === "number" && Number.isFinite(v)) {
          if (v > max) max = v;
        }
      }
    }

    if (!Number.isFinite(max) || max <= 0) return [0, 1];

    const pad = max * 0.1; // 10% marginesu
    return [0, max + pad];
  }, [data, attributeKeys]);

  const handleAttrChange = (e) => setSelectedAttr(e.target.value);

  const attributesToShow =
    selectedAttr === "ALL" ? attributeKeys : [selectedAttr];

  // ESC zamyka fullscreen
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsZoomed(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // blokada scrolla w fullscreen
  useEffect(() => {
    document.body.style.overflow = isZoomed ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isZoomed]);

  if (!data || data.length === 0) {
    return <p>Brak danych. Najpierw wczytaj plik CSV lub Excel.</p>;
  }

  if (attributeKeys.length === 0) {
    return <p>Brak atrybutów numerycznych do wyświetlenia.</p>;
  }

  // ✅ tooltip: 2 miejsca po przecinku
  const fmt2 = (v) =>
    typeof v === "number" && Number.isFinite(v) ? v.toFixed(2) : v;

  const renderTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;

    return (
      <div
        style={{
          background: "#222",
          border: "1px solid #555",
          padding: "0.5rem 0.75rem",
          borderRadius: 6,
        }}
      >
        <div style={{ marginBottom: "0.25rem", fontWeight: 600 }}>
          {getDataLabel()}: {label}
        </div>
        {payload.map((entry, idx) => (
          <div
            key={idx}
            style={{ color: entry.color, fontSize: "0.9rem", marginBottom: 2 }}
          >
            {entry.name}: <strong>{fmt2(entry.value)}</strong>
          </div>
        ))}
      </div>
    );
  };

  const toggleZoom = () => setIsZoomed((v) => !v);

  const Chart = ({ zoomed }) => (
    <ResponsiveContainer>
      <LineChart
        data={chartData}
        margin={{
          top: 30,
          right: 30,
          left: zoomed ? 50 : 10,
          bottom: zoomed ? 60 : 80,
        }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#555" vertical={false} />

        <XAxis
          dataKey="Data"
          label={{
            value: "Oś czasu",
            position: "bottom",
            offset: 40,
            fill: "#ddd",
          }}
          tick={{ fill: "#ddd", fontSize: zoomed ? 14 : 12 }}
          tickMargin={10}
        />

        <YAxis
          domain={yDomain}                 // ✅ od 0
          allowDecimals={true}
          tickFormatter={(v) => Number(v).toFixed(2)} // ✅ 2 miejsca
          tick={{ fill: "#ddd", fontSize: zoomed ? 14 : 12 }}
          label={{
            value: "Wartość",
            angle: -90,
            position: "insideLeft",
            offset: 0,
            fill: "#ddd",
          }}
        />

        <Tooltip content={renderTooltip} />
        <Legend verticalAlign="top" align="center" wrapperStyle={{ paddingBottom: 10 }} />

        {attributesToShow.map((attr) => (
          <Line
            key={attr}
            type="monotone"
            dataKey={attr}
            name={getAttrLabel(attr)}
            stroke={attrColorMap[attr] ?? LINE_COLORS[0]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}

        <Brush
          dataKey="Data"
          height={zoomed ? 34 : 26}
          stroke="#8884d8"
          travellerWidth={10}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <div>
      <h2>Wizualizacja danych</h2>

      <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
        <label>
          Wybierz atrybut:&nbsp;
          <select value={selectedAttr} onChange={handleAttrChange}>
            <option value="ALL">Wszystkie</option>
            {attributeKeys.map((attr) => (
              <option key={attr} value={attr}>
                {getAttrLabel(attr)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* NORMALNY WIDOK */}
      <div
        onDoubleClick={toggleZoom}
        title="Podwójny klik lewym: powiększ / pomniejsz"
        style={{
          width: "100%",
          height: 420,
          marginTop: "0.5rem",
          padding: "0 1rem",
          cursor: "zoom-in",
          userSelect: "none",
        }}
      >
        <Chart zoomed={false} />
      </div>

      {/* FULLSCREEN OVERLAY */}
      {isZoomed && (
        <div
          // opcjonalnie: klik w tło zamyka (pomaga, jakby ktoś nie trafił w X)
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsZoomed(false);
          }}
          onDoubleClick={() => setIsZoomed(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div
            onDoubleClick={(e) => {
              e.stopPropagation();
              setIsZoomed(false);
            }}
            style={{
              width: "min(1400px, 100%)",
              height: "95vh",
              background: "#111",
              border: "1px solid #333",
              borderRadius: 12,
              padding: "1rem",
              boxSizing: "border-box",
              position: "relative",
              cursor: "zoom-out",
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();       // ✅ żeby nic nie przechodziło wyżej
                setIsZoomed(false);        // ✅ zamyka zawsze
              }}
              onDoubleClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsZoomed(false);
              }}
              title="Zamknij (Esc)"
              style={{
                position: "absolute",
                top: 10,
                right: 10,
                width: 38,
                height: 38,
                borderRadius: 10,
                border: "1px solid #444",
                background: "#1b1b1b",
                color: "#ddd",
                cursor: "pointer",
                zIndex: 2,

                // ✅ X idealnie na środku
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 0,
                lineHeight: 1,
                fontSize: 22,
              }}
            >
              ×
            </button>

            <div style={{ width: "100%", height: "100%" }}>
              <Chart zoomed={true} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
