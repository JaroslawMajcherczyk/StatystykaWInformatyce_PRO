// StatisticsView.jsx
import { useMemo, useState } from "react";

const LINE_COLORS = ["#8884d8", "#82ca9d", "#ff7300", "#ff0000", "#0088fe"];

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

function quantile(sorted, p) {
  const n = sorted.length;
  if (n === 0) return null;
  if (n === 1) return sorted[0];

  const pos = (n - 1) * p;
  const lowerIndex = Math.floor(pos);
  const upperIndex = Math.ceil(pos);

  if (lowerIndex === upperIndex) {
    return sorted[lowerIndex];
  } else {
    const lower = sorted[lowerIndex];
    const upper = sorted[upperIndex];
    const fraction = pos - lowerIndex;
    return lower + (upper - lower) * fraction;
  }
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

function formatNumber(x, digits = 4) {
  if (x === null || x === undefined || Number.isNaN(x)) return "–";
  return x.toFixed(digits);
}

export default function StatisticsView({ data, headerMap }) {
  const [selection, setSelection] = useState("ALL");

  const attributeKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter((k) => k !== "Data");
  }, [data]);

  // generic -> oryginalny nagłówek
  const headerLabelMap = useMemo(() => {
    const map = {};
    (headerMap || []).forEach(({ generic, original }) => {
      if (!generic) return;
      map[generic] =
        original && original.length > 0 ? String(original) : generic;
    });
    return map;
  }, [headerMap]);

  const getAttrLabel = (generic) => {
    const orig = headerLabelMap[generic];
    if (!orig || orig === generic) return generic;
    return `${generic} (${orig})`; // A1 (EUR)
  };

  const statsByAttr = useMemo(() => {
    if (!data || data.length === 0) return null;
    const result = {};
    for (const attr of attributeKeys) {
      const series = data
        .map((row) => row[attr])
        .filter((v) => typeof v === "number" && Number.isFinite(v));
      result[attr] = computeStats(series);
    }
    return result;
  }, [data, attributeKeys]);

  if (!data || data.length === 0) {
    return <p>Brak danych. Wczytaj najpierw plik.</p>;
  }

  if (!statsByAttr) {
    return <p>Nie udało się policzyć statystyk.</p>;
  }

  if (attributeKeys.length === 0) {
    return <p>Brak atrybutów numerycznych (A1..A5) do analizy.</p>;
  }

  const handleSelectionChange = (e) => {
    setSelection(e.target.value);
  };

  const selectedKeys =
    selection === "ALL" ? attributeKeys : [selection];

  return (
    <div>
      <h2>Podstawowe statystyki opisowe</h2>
      <p>
        Wybierz jeden atrybut lub „Wszystkie”, aby zobaczyć statystyki:
        średnia, mediana, dominanta, odchylenie standardowe, kwantyle,
        skośność, kurtoza, min, max, rozstęp.
      </p>

      <div style={{ marginBottom: "1rem" }}>
        <label>
          Wybierz atrybut:&nbsp;
          <select value={selection} onChange={handleSelectionChange}>
            <option value="ALL">Wszystkie</option>
            {attributeKeys.map((attr) => (
              <option key={attr} value={attr}>
                {getAttrLabel(attr)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Atrybut</th>
              <th>n</th>
              <th>Średnia</th>
              <th>Mediana</th>
              <th>Dominanta</th>
              <th>Odch. stand.</th>
              <th>Q1</th>
              <th>Q2</th>
              <th>Q3</th>
              <th>Min</th>
              <th>Max</th>
              <th>Rozstęp</th>
              <th>Skośność</th>
              <th>Kurtoza</th>
            </tr>
          </thead>
          <tbody>
            {selectedKeys.map((attr) => {
              const st = statsByAttr[attr];
              if (!st) return null;

              const colorIndex = attributeKeys.indexOf(attr);
              const color =
                LINE_COLORS[colorIndex % LINE_COLORS.length];

              return (
                <tr key={attr} style={{ color }}>
                  <td>
                    <span
                      style={{
                        display: "inline-block",
                        width: 12,
                        height: 12,
                        borderRadius: 2,
                        marginRight: 6,
                        backgroundColor: color,
                      }}
                    />
                    {getAttrLabel(attr)}
                  </td>
                  <td>{st.count}</td>
                  <td>{formatNumber(st.mean)}</td>
                  <td>{formatNumber(st.median)}</td>
                  <td>{st.mode === null ? "–" : formatNumber(st.mode)}</td>
                  <td>{formatNumber(st.stdDev)}</td>
                  <td>{formatNumber(st.q1)}</td>
                  <td>{formatNumber(st.q2)}</td>
                  <td>{formatNumber(st.q3)}</td>
                  <td>{formatNumber(st.min)}</td>
                  <td>{formatNumber(st.max)}</td>
                  <td>{formatNumber(st.range)}</td>
                  <td>{formatNumber(st.skewness)}</td>
                  <td>{formatNumber(st.kurtosis)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
