// ChernoffFacesView.jsx
import { useMemo, useState, useEffect } from "react";

function quantile(sorted, p) {
  const n = sorted.length;
  if (n === 0) return null;
  if (n === 1) return sorted[0];

  const pos = (n - 1) * p;
  const li = Math.floor(pos);
  const ui = Math.ceil(pos);
  if (li === ui) return sorted[li];

  const lower = sorted[li];
  const upper = sorted[ui];
  const frac = pos - li;
  return lower + (upper - lower) * frac;
}

// Zwraca 'q1' | 'q2' | 'q3' dla danego atrybutu
function chooseLevel(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q2 = quantile(sorted, 0.5);
  const q3 = quantile(sorted, 0.75);

  const x = values[values.length - 1]; // ostatni rekord

  let level;
  if (x <= q1) level = "q1";
  else if (x <= q3) level = "q2";
  else level = "q3";

  return { level, q1, q2, q3, x };
}

// Mapowanie poziomu q1/q2/q3 na kształt: 'square' | 'circle' | 'triangle'
function levelToShape(level) {
  if (level === "q1") return "square";
  if (level === "q2") return "circle";
  return "triangle";
}

export default function ChernoffFacesView({ data, headerMap = [] }) {
  // atrybuty = wszystkie kolumny poza "Data"
  const attributeKeys = useMemo(() => {
    if (!data || data.length === 0) return [];
    return Object.keys(data[0]).filter((k) => k !== "Data");
  }, [data]);

  // ✅ HOOKI MUSZĄ BYĆ PRZED return
  const [visibleAttrs, setVisibleAttrs] = useState([]);

  useEffect(() => {
    // po zmianie danych – domyślnie pokaż pierwsze 5 atrybutów
    if (attributeKeys.length >= 5) {
      setVisibleAttrs(attributeKeys.slice(0, 5));
    } else {
      setVisibleAttrs([]);
    }
  }, [attributeKeys]);

  // mapka generic -> ładna etykieta, np. A1 -> "A1 (EUR)"
  const labelMap = useMemo(() => {
    const map = {};
    headerMap.forEach(({ generic, original }) => {
      if (!generic) return;
      if (generic === "Data") {
        map[generic] = original || "Data";
      } else {
        const trimmed = (original || "").trim();
        map[generic] = trimmed ? `${generic} (${trimmed})` : generic;
      }
    });
    return map;
  }, [headerMap]);

  const getAttrLabel = (generic) => labelMap[generic] || generic;

  const config = useMemo(() => {
    if (!data || data.length === 0) return null;
    const result = {};

    for (const attr of attributeKeys) {
      const vals = data
        .map((row) => row[attr])
        .filter((v) => typeof v === "number" && Number.isFinite(v));

      if (vals.length === 0) continue;

      const { level, q1, q2, q3, x } = chooseLevel(vals);
      const shape = levelToShape(level);

      result[attr] = { level, shape, q1, q2, q3, x };
    }

    return result;
  }, [data, attributeKeys]);

  if (!data || data.length === 0) {
    return <p>Brak danych. Wczytaj najpierw plik.</p>;
  }

  if (!config || Object.keys(config).length === 0) {
    return <p>Nie udało się policzyć kwantyli dla twarzy Chernoffa.</p>;
  }

  if (attributeKeys.length < 5) {
    return (
      <p>
        Do rysowania twarzy Chernoffa potrzebnych jest co najmniej 5 atrybutów.
        W pliku powinno być: Data, A1, A2, A3, A4, A5.
      </p>
    );
  }

  // Pierwsze 5 atrybutów bierzemy jako A1..A5 (głowa, oczy, usta, nos, uszy)
  const a1 = attributeKeys[0];
  const a2 = attributeKeys[1];
  const a3 = attributeKeys[2];
  const a4 = attributeKeys[3];
  const a5 = attributeKeys[4];

  const headCfg = config[a1];
  const eyesCfg = config[a2];
  const mouthCfg = config[a3];
  const noseCfg = config[a4];
  const earsCfg = config[a5];

  if (!headCfg || !eyesCfg || !mouthCfg || !noseCfg || !earsCfg) {
    return (
      <p>
        Nie udało się przygotować wszystkich 5 części twarzy. Sprawdź,
        czy wszystkie atrybuty mają wartości numeryczne.
      </p>
    );
  }

  const toggleAttr = (attr) => {
    setVisibleAttrs((prev) =>
      prev.includes(attr) ? prev.filter((a) => a !== attr) : [...prev, attr]
    );
  };

  const allAttrsForFace = [a1, a2, a3, a4, a5];
  const allSelected =
    visibleAttrs.length === allAttrsForFace.length &&
    allAttrsForFace.every((a) => visibleAttrs.includes(a));

  const handleToggleAll = (checked) => {
    if (checked) setVisibleAttrs(allAttrsForFace);
    else setVisibleAttrs([]);
  };

  const showHead = visibleAttrs.includes(a1);
  const showEyes = visibleAttrs.includes(a2);
  const showMouth = visibleAttrs.includes(a3);
  const showNose = visibleAttrs.includes(a4);
  const showEars = visibleAttrs.includes(a5);

  return (
    <div>
      <h2>Twarze Chernoffa – atrybuty z pliku</h2>
      <p>
        Pierwsze 5 atrybutów (kolumn poza <code>Data</code>) interpretujemy jako:
        <br />
        <strong>Głowa:</strong> {getAttrLabel(a1)} &nbsp;|&nbsp;
        <strong>Oczy:</strong> {getAttrLabel(a2)} &nbsp;|&nbsp;
        <strong>Usta:</strong> {getAttrLabel(a3)} &nbsp;|&nbsp;
        <strong>Nos:</strong> {getAttrLabel(a4)} &nbsp;|&nbsp;
        <strong>Uszy:</strong> {getAttrLabel(a5)}
        <br />
        Poziomy: q1 → kwadrat, q2 → okrąg, q3 → trójkąt.
      </p>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: "3rem",
          marginTop: "1.5rem",
          flexWrap: "wrap",
        }}
      >
        {/* TWARZ */}
        <ChernoffFaceDiscrete
          head={{ shape: headCfg.shape, attr: a1, label: getAttrLabel(a1) }}
          eyes={{ shape: eyesCfg.shape, attr: a2, label: getAttrLabel(a2) }}
          mouth={{ shape: mouthCfg.shape, attr: a3, label: getAttrLabel(a3) }}
          nose={{ shape: noseCfg.shape, attr: a4, label: getAttrLabel(a4) }}
          ears={{ shape: earsCfg.shape, attr: a5, label: getAttrLabel(a5) }}
          showHead={showHead}
          showEyes={showEyes}
          showMouth={showMouth}
          showNose={showNose}
          showEars={showEars}
          variant="full"
          showFooterText={true}
        />

        {/* CHECKBOXY */}
        <div style={{ minWidth: 260 }}>
          <p style={{ marginBottom: 8 }}>
            Wybierz, które elementy twarzy mają być widoczne:
          </p>

          <label style={{ display: "block", marginBottom: 4 }}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={(e) => handleToggleAll(e.target.checked)}
            />{" "}
            <strong>Wszystkie / żadna</strong>
          </label>

          <label style={{ display: "block", marginLeft: 16 }}>
            <input
              type="checkbox"
              checked={showHead}
              onChange={() => toggleAttr(a1)}
            />{" "}
            Głowa – {getAttrLabel(a1)}
          </label>

          <label style={{ display: "block", marginLeft: 16 }}>
            <input
              type="checkbox"
              checked={showEyes}
              onChange={() => toggleAttr(a2)}
            />{" "}
            Oczy – {getAttrLabel(a2)}
          </label>

          <label style={{ display: "block", marginLeft: 16 }}>
            <input
              type="checkbox"
              checked={showMouth}
              onChange={() => toggleAttr(a3)}
            />{" "}
            Usta – {getAttrLabel(a3)}
          </label>

          <label style={{ display: "block", marginLeft: 16 }}>
            <input
              type="checkbox"
              checked={showNose}
              onChange={() => toggleAttr(a4)}
            />{" "}
            Nos – {getAttrLabel(a4)}
          </label>

          <label style={{ display: "block", marginLeft: 16 }}>
            <input
              type="checkbox"
              checked={showEars}
              onChange={() => toggleAttr(a5)}
            />{" "}
            Uszy – {getAttrLabel(a5)}
          </label>
        </div>
      </div>

      {/* ✅ POPRAWNA LEGENDA: 3 TWARZE "WSZYSTKO = SHAPE" */}
      <ChernoffLegendAllShapes />
    </div>
  );
}

function ChernoffLegendAllShapes() {
  const items = [
    { level: "q1", shape: "square", label: "q1 (kwadrat)" },
    { level: "q2", shape: "circle", label: "q2 (okrąg)" },
    { level: "q3", shape: "triangle", label: "q3 (trójkąt)" },
  ];

  return (
    <div style={{ marginTop: "2rem" }}>
      <h3>Legenda – przykładowe twarze (q1 / q2 / q3)</h3>

      <div
        style={{
          display: "flex",
          gap: "1.5rem",
          justifyContent: "center",
          flexWrap: "wrap",
          marginTop: "0.75rem",
        }}
      >
        {items.map((it) => (
          <div key={it.level} style={{ textAlign: "center" }}>
            <ChernoffFaceDiscrete
              head={{ shape: it.shape, attr: "A1", label: "" }}
              eyes={{ shape: it.shape, attr: "A2", label: "" }}
              mouth={{ shape: it.shape, attr: "A3", label: "" }}
              nose={{ shape: it.shape, attr: "A4", label: "" }}
              ears={{ shape: it.shape, attr: "A5", label: "" }}
              showHead={true}
              showEyes={true}
              showMouth={true}
              showNose={true}
              showEars={true}
              variant="mini"
              showFooterText={false}
            />
            <div style={{ marginTop: 8, fontSize: 12 }}>{it.label}</div>
          </div>
        ))}
      </div>

      <p style={{ fontSize: 12, marginTop: 10 }}>
        Mapowanie: q1 → kwadrat, q2 → okrąg, q3 → trójkąt.
      </p>
    </div>
  );
}

function ChernoffFaceDiscrete({
  head,
  eyes,
  mouth,
  nose,
  ears,
  showHead,
  showEyes,
  showMouth,
  showNose,
  showEars,
  variant = "full", // 'full' | 'mini'
  showFooterText = true,
}) {
  const isMini = variant === "mini";

  const width = isMini ? 220 : 420;
  const height = isMini ? 160 : 280;

  const cx = width / 2;
  const cy = height / 2 - (isMini ? 0 : 10);

  const stroke = "#333";
  const strokeWidth = isMini ? 1.5 : 2;

  const k = isMini ? 0.60 : 1;

  const headSize = 140 * k;

  const eyeOffsetX = 40 * k;
  const eyeY = cy - 30 * k;
  const eyeSize = 20 * k;

  const mouthY = cy + 40 * k;
  const mouthWidth = 80 * k;

  const noseYTop = cy - 5 * k;
  const noseHeight = 40 * k;

  const earOffsetX = 90 * k;
  const earY = cy - 10 * k;
  const earSize = 24 * k;

  return (
    <svg
      width={width}
      height={height}
      style={{ border: "1px solid #ccc", background: "#222", borderRadius: 6 }}
    >
      {/* GŁOWA */}
      {showHead &&
        renderHeadShape(head.shape, cx, cy, headSize, stroke, strokeWidth)}

      {/* USZY */}
      {showEars &&
        renderEarShape(
          ears.shape,
          cx - earOffsetX,
          earY,
          earSize,
          stroke,
          strokeWidth
        )}
      {showEars &&
        renderEarShape(
          ears.shape,
          cx + earOffsetX,
          earY,
          earSize,
          stroke,
          strokeWidth
        )}

      {/* OCZY */}
      {showEyes &&
        renderEyeShape(
          eyes.shape,
          cx - eyeOffsetX,
          eyeY,
          eyeSize,
          stroke,
          strokeWidth
        )}
      {showEyes &&
        renderEyeShape(
          eyes.shape,
          cx + eyeOffsetX,
          eyeY,
          eyeSize,
          stroke,
          strokeWidth
        )}

      {/* NOS */}
      {showNose &&
        renderNoseShape(
          nose.shape,
          cx,
          noseYTop,
          noseHeight,
          stroke,
          strokeWidth
        )}

      {/* USTA */}
      {showMouth &&
        renderMouthShape(
          mouth.shape,
          cx,
          mouthY,
          mouthWidth,
          stroke,
          strokeWidth
        )}

      {/* NAPISY TYLKO W PEŁNYM WIDOKU */}
      {!isMini && showFooterText && (
        <>
          {textWrapped(
            `${head.label}: ${head.shape}, ${eyes.label}: ${eyes.shape}, ${mouth.label}: ${mouth.shape}, ${nose.label}: ${nose.shape}, ${ears.label}: ${ears.shape}`,
            cx,
            height - 55,
            300
          )}
          <text
            x={cx}
            y={height - 20}
            textAnchor="middle"
            fontSize="10"
            fill="#ffffff"
          >
            q1 → kwadrat, q2 → okrąg, q3 → trójkąt (wg rozkładu i ostatniej wartości)
          </text>
        </>
      )}
    </svg>
  );
}

function renderHeadShape(shape, cx, cy, size, stroke, strokeWidth) {
  const half = size / 2;
  if (shape === "square") {
    return (
      <rect
        x={cx - half}
        y={cy - half}
        width={size}
        height={size}
        rx={8}
        fill="#ffe0bd"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (shape === "triangle") {
    return (
      <polygon
        points={`
          ${cx},${cy - half}
          ${cx - half},${cy + half}
          ${cx + half},${cy + half}
        `}
        fill="#ffe0bd"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={half}
      fill="#ffe0bd"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function renderEyeShape(shape, cx, cy, size, stroke, strokeWidth) {
  if (shape === "square") {
    const half = size / 1.5;
    return (
      <rect
        x={cx - half}
        y={cy - half}
        width={half * 2}
        height={half * 2}
        fill="#ffffff"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (shape === "triangle") {
    const h = size;
    return (
      <polygon
        points={`
          ${cx},${cy - h}
          ${cx - h},${cy + h}
          ${cx + h},${cy + h}
        `}
        fill="#ffffff"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill="#ffffff"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function textWrapped(text, x, y, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  ctx.font = "11px sans-serif";

  for (let w of words) {
    const test = current.length ? current + " " + w : w;
    const width = ctx.measureText(test).width;

    if (width > maxWidth) {
      lines.push(current);
      current = w;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);

  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontSize="11"
      fontWeight="bold"
      fill="#ffffff"
    >
      {lines.map((line, i) => (
        <tspan key={i} x={x} dy={i === 0 ? 0 : 14}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

function renderMouthShape(shape, cx, y, width, stroke, strokeWidth) {
  if (shape === "square") {
    const h = 8;
    return (
      <rect
        x={cx - width / 2}
        y={y - h / 2}
        width={width}
        height={h}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (shape === "triangle") {
    const h = 18;
    return (
      <polygon
        points={`
          ${cx - width / 2},${y}
          ${cx + width / 2},${y}
          ${cx},${y + h}
        `}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return (
    <path
      d={`
        M ${cx - width / 2} ${y}
        Q ${cx} ${y + 18}
          ${cx + width / 2} ${y}
      `}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function renderNoseShape(shape, cx, yTop, height, stroke, strokeWidth) {
  if (shape === "square") {
    const w = 14;
    return (
      <rect
        x={cx - w / 2}
        y={yTop}
        width={w}
        height={height}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (shape === "triangle") {
    return (
      <polygon
        points={`
          ${cx},${yTop}
          ${cx - 10},${yTop + height}
          ${cx + 10},${yTop + height}
        `}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return (
    <circle
      cx={cx}
      cy={yTop + height / 2}
      r={8}
      fill="none"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}

function renderEarShape(shape, cx, cy, size, stroke, strokeWidth) {
  if (shape === "square") {
    const half = size / 1.4;
    return (
      <rect
        x={cx - half}
        y={cy - half}
        width={half * 2}
        height={half * 2}
        fill="#ffe0bd"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  if (shape === "triangle") {
    const h = size;
    return (
      <polygon
        points={`
          ${cx},${cy - h}
          ${cx - h},${cy + h}
          ${cx + h},${cy + h}
        `}
        fill="#ffe0bd"
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    );
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={size}
      fill="#ffe0bd"
      stroke={stroke}
      strokeWidth={strokeWidth}
    />
  );
}
