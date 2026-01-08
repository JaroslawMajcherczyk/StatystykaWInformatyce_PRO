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
  BarChart,
  Bar,
  Cell,
} from "recharts";

const LINE_COLORS = ["#8884d8", "#82ca9d", "#ff7300", "#ff0000", "#0088fe"];

/* =======================
   STATYSTYKI (z StatisticsView.jsx)
   ======================= */

function quantile(sorted, p) {
  const n = sorted.length;
  if (n === 0) return null;
  if (n === 1) return sorted[0];

  const pos = (n - 1) * p;
  const lowerIndex = Math.floor(pos);
  const upperIndex = Math.ceil(pos);

  if (lowerIndex === upperIndex) return sorted[lowerIndex];

  const lower = sorted[lowerIndex];
  const upper = sorted[upperIndex];
  const fraction = pos - lowerIndex;
  return lower + (upper - lower) * fraction;
}

function computeMode(series) {
  if (!series || series.length === 0) return null;

  const freq = new Map();
  for (const v of series) {
    const key = Number(v.toFixed(3));
    freq.set(key, (freq.get(key) || 0) + 1);
  }

  let bestValue = null;
  let bestCount = 0;
  for (const [value, count] of freq.entries()) {
    if (count > bestCount) {
      bestCount = count;
      bestValue = value;
    }
  }
  return bestValue;
}

function computeStats(series) {
  const n = series.length;
  if (n === 0) return null;

  const sorted = [...series].sort((a, b) => a - b);
  const sum = series.reduce((acc, v) => acc + v, 0);
  const mean = sum / n;

  const median = quantile(sorted, 0.5);
  const q1 = quantile(sorted, 0.25);
  const q2 = median;
  const q3 = quantile(sorted, 0.75);

  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const range = max - min;

  let m2 = 0;
  let m3 = 0;
  let m4 = 0;
  for (const x of series) {
    const d = x - mean;
    const d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }

  const variance = n > 1 ? m2 / (n - 1) : 0;
  const stdDev = Math.sqrt(variance);

  let skewness = null;
  let kurtosis = null;

  if (n > 2 && stdDev !== 0) {
    const s3 = Math.pow(stdDev, 3);
    skewness = (n * m3) / ((n - 1) * (n - 2) * s3);
  }

  if (n > 3 && stdDev !== 0) {
    const s4 = Math.pow(stdDev, 4);
    const g2 =
      ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * (m4 / s4) -
      (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
    kurtosis = g2;
  }

  const mode = computeMode(series);

  return {
    count: n,
    mean,
    median,
    mode,
    stdDev,
    q1,
    q2,
    q3,
    min,
    max,
    range,
    skewness,
    kurtosis,
  };
}

function fmtStat(v, digits = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return "–";
  if (typeof v === "number" && Number.isFinite(v)) return v.toFixed(digits);
  return String(v);
}

/* =======================
   GŁÓWNY WIDOK
   ======================= */

export default function ChartView({ data, headerMap }) {
  const [selectedAttr, setSelectedAttr] = useState("ALL");
  const [selectedStat, setSelectedStat] = useState("NONE"); // ✅ nowy wybór statystyki
  const [isZoomed, setIsZoomed] = useState(false);

  const chartData = useMemo(() => data ?? [], [data]);

  const attributeKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    const keys = Object.keys(data[0]).filter((k) => k !== "Data");
    return keys.filter((k) =>
      data.some((row) => typeof row[k] === "number" && Number.isFinite(row[k]))
    );
  }, [data]);

  // ✅ bierzemy pierwsze 5 atrybutów do wykresu statystyk (A1..A5)
  const firstFiveAttrs = useMemo(() => attributeKeys.slice(0, 5), [attributeKeys]);

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

  // stały kolor dla atrybutu
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
    const pad = max * 0.1;
    return [0, max + pad];
  }, [data, attributeKeys]);

  const handleAttrChange = (e) => setSelectedAttr(e.target.value);
  const handleStatChange = (e) => setSelectedStat(e.target.value);

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

  const renderLineTooltip = ({ active, payload, label }) => {
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
          domain={yDomain}
          allowDecimals={true}
          tickFormatter={(v) => Number(v).toFixed(2)}
          tick={{ fill: "#ddd", fontSize: zoomed ? 14 : 12 }}
          label={{
            value: "Wartość",
            angle: -90,
            position: "insideLeft",
            offset: 0,
            fill: "#ddd",
          }}
        />

        <Tooltip content={renderLineTooltip} />
        <Legend
          verticalAlign="top"
          align="center"
          wrapperStyle={{ paddingBottom: 10 }}
        />

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

  /* =======================
     WYKRES SŁUPKOWY STATYSTYK
     ======================= */

  const statOptions = [
    { key: "mean", label: "Średnia" },
    { key: "median", label: "Mediana" },
    { key: "mode", label: "Dominanta" },
    { key: "stdDev", label: "Odchylenie standardowe" },
    { key: "q1", label: "Q1" },
    { key: "q2", label: "Q2" },
    { key: "q3", label: "Q3" },
    { key: "min", label: "Min" },
    { key: "max", label: "Max" },
    { key: "range", label: "Rozstęp" },
    { key: "skewness", label: "Skośność" },
    { key: "kurtosis", label: "Kurtoza" },
  ];

  const statsByAttr = useMemo(() => {
    if (!data || data.length === 0) return null;

    const result = {};
    for (const attr of firstFiveAttrs) {
      const series = data
        .map((row) => row[attr])
        .filter((v) => typeof v === "number" && Number.isFinite(v));

      result[attr] = computeStats(series);
    }
    return result;
  }, [data, firstFiveAttrs]);

  const barData = useMemo(() => {
    if (selectedStat === "NONE") return [];
    if (!statsByAttr) return [];

    return firstFiveAttrs.map((attr) => {
      const st = statsByAttr[attr];
      const raw = st ? st[selectedStat] : null;

      const value =
        typeof raw === "number" && Number.isFinite(raw) ? raw : null;

      return {
        attr,
        name: getAttrLabel(attr),
        value,
        raw,
      };
    });
  }, [selectedStat, statsByAttr, firstFiveAttrs, headerLabelMap]);

  const anyBarValue = useMemo(() => {
    if (!barData || barData.length === 0) return false;
    return barData.some((d) => typeof d.value === "number" && Number.isFinite(d.value));
  }, [barData]);

  const renderBarTooltip = ({ active, payload, label }) => {
    if (!active || !payload || payload.length === 0) return null;
    const p = payload[0]?.payload;
    if (!p) return null;

    const statLabel =
      statOptions.find((s) => s.key === selectedStat)?.label ?? selectedStat;

    return (
      <div
        style={{
          background: "#222",
          border: "1px solid #555",
          padding: "0.5rem 0.75rem",
          borderRadius: 6,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>{p.name}</div>
        <div style={{ fontSize: 13 }}>
          {statLabel}: <strong>{fmtStat(p.raw, 4)}</strong>
        </div>
      </div>
    );
  };

  return (
    <div>
      <h2>Wizualizacja danych</h2>

      <div
        style={{
          textAlign: "center",
          marginBottom: "0.75rem",
          display: "flex",
          justifyContent: "center",
          gap: "1.25rem",
          flexWrap: "wrap",
        }}
      >
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

        <label>
          Wybierz statystykę (słupki):&nbsp;
          <select value={selectedStat} onChange={handleStatChange}>
            <option value="NONE">— brak —</option>
            {statOptions.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* WYKRES LINIOWY */}
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

      {/* ✅ WYKRES SŁUPKOWY STATYSTYK */}
      {selectedStat !== "NONE" && (
        <div style={{ marginTop: "1.5rem", padding: "0 1rem" }}>
          <h3 style={{ textAlign: "center" }}>
            Statystyka:{" "}
            {statOptions.find((s) => s.key === selectedStat)?.label ?? selectedStat}
            {" "} (A1..A5)
          </h3>

          {!anyBarValue ? (
            <p style={{ textAlign: "center" }}>
              Brak danych do wykresu słupkowego dla tej statystyki (np. za mało obserwacji dla skośności/kurtozy).
            </p>
          ) : (
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <BarChart
                  data={barData}
                  margin={{ top: 20, right: 20, left: 10, bottom: 60 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#555" vertical={false} />
                  <XAxis
                    dataKey="attr"
                    tick={{ fill: "#ddd", fontSize: 12 }}
                    tickMargin={10}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fill: "#ddd", fontSize: 12 }}
                    tickFormatter={(v) =>
                      typeof v === "number" && Number.isFinite(v) ? v.toFixed(3) : v
                    }
                  />
                  <Tooltip content={renderBarTooltip} />
                  <Legend
                    verticalAlign="top"
                    align="center"
                    wrapperStyle={{ paddingBottom: 10 }}
                  />

                  <Bar
                    name={statOptions.find((s) => s.key === selectedStat)?.label ?? "Statystyka"}
                    dataKey="value"
                  >
                    {barData.map((entry) => (
                      <Cell
                        key={entry.attr}
                        fill={attrColorMap[entry.attr] ?? LINE_COLORS[0]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div style={{ textAlign: "center", fontSize: 12, marginTop: 6, opacity: 0.9 }}>
                Kolory odpowiadają atrybutom jak w wykresie liniowym.
              </div>
            </div>
          )}
        </div>
      )}

      {/* FULLSCREEN OVERLAY (tylko dla liniowego, jak było) */}
      {isZoomed && (
        <div
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
                e.stopPropagation();
                setIsZoomed(false);
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
