// ChartView.jsx
import { useMemo, useState } from "react";
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

// te same kolory co w statystykach
const LINE_COLORS = ["#8884d8", "#82ca9d", "#ff7300", "#ff0000", "#0088fe"];

export default function ChartView({ data, headerMap }) {
  const [selectedAttr, setSelectedAttr] = useState("ALL");

  const chartData = useMemo(() => data ?? [], [data]);

  // klucze atrybutów = wszystko poza "Data"
  const attributeKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter((k) => k !== "Data");
  }, [data]);

  // generic -> original (A1 -> EUR, Data -> Date, itd.)
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
    return `${generic} (${orig})`; // np. A1 (EUR)
  };

  const getDataLabel = () => {
    const orig = headerLabelMap["Data"];
    if (!orig || orig === "Data") return "Data";
    return `Data (${orig})`; // np. Data (Date) – używane w tooltipie
  };

  // ładny zakres osi Y z marginesem
  const yDomain = useMemo(() => {
    if (!data || data.length === 0 || attributeKeys.length === 0) {
      return ["auto", "auto"];
    }
    let min = Infinity;
    let max = -Infinity;

    for (const row of data) {
      for (const attr of attributeKeys) {
        const v = row[attr];
        if (typeof v === "number" && Number.isFinite(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }

    if (min === Infinity || max === -Infinity) return ["auto", "auto"];

    const range = max - min || 1;
    const pad = range * 0.1; // 10% marginesu
    return [min - pad, max + pad];
  }, [data, attributeKeys]);

  const handleAttrChange = (e) => {
    setSelectedAttr(e.target.value);
  };

  const attributesToShow =
    selectedAttr === "ALL" ? attributeKeys : [selectedAttr];

  if (!data || data.length === 0) {
    return <p>Brak danych. Najpierw wczytaj plik CSV lub Excel.</p>;
  }

  if (attributeKeys.length === 0) {
    return <p>Brak atrybutów numerycznych (A1..A5) do wyświetlenia.</p>;
  }

  // custom tooltip – ładniejsze opisy
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
            {entry.name}: <strong>{entry.value}</strong>
          </div>
        ))}
      </div>
    );
  };

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

      <div
        style={{
          width: "100%",
          height: 420,
          marginTop: "0.5rem",
          padding: "0 1rem",
        }}
      >
        <ResponsiveContainer>
          <LineChart
            data={chartData}
            margin={{ top: 30, right: 30, left: 10, bottom: 80 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#555"
              vertical={false}
            />

            {/* Oś X = Data */}
            <XAxis
              dataKey="Data"
              label={{
                value: "Oś czasu",
                position: "bottom",
                offset: 40,
                fill: "#ddd",
              }}
              tick={{ fill: "#ddd", fontSize: 12 }}
              tickMargin={10}
            />

            {/* Oś Y = wartości */}
            <YAxis
              domain={yDomain}
              label={{
                value: "Wartość",
                angle: -90,
                position: "insideLeft",
                offset: 0,
                fill: "#ddd",
              }}
              tick={{ fill: "#ddd", fontSize: 12 }}
            />

            <Tooltip content={renderTooltip} />
            <Legend
              verticalAlign="top"
              align="center"
              wrapperStyle={{ paddingBottom: 10 }}
            />

            {attributesToShow.map((attr, index) => (
              <Line
                key={attr}
                type="monotone"
                dataKey={attr}
                name={getAttrLabel(attr)}
                stroke={LINE_COLORS[index % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}

            {/* Suwak do zoomu po dacie */}
            <Brush
              dataKey="Data"
              height={26}
              stroke="#8884d8"
              travellerWidth={10}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
