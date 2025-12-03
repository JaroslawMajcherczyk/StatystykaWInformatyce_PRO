import { useState } from "react";
import "./App.css";

import CsvUploadView from "./CsvUploadView";
import ChartView from "./ChartView";
import StatisticsView from "./StatisticsView";
import ChernoffFacesView from "./ChernoffFacesView";

function App() {
  const [activeTab, setActiveTab] = useState("upload");
  const [data, setData] = useState([]); // wspólne dane dla wszystkich zakładek
  const [headerMap, setHeaderMap] = useState([]); 

  const handleDataLoaded = (parsedData) => {
    setData(parsedData);
    setActiveTab("chart"); // po wczytaniu przełącz na wykres
  };
  const handleHeaderMapChange = (map) => {
    setHeaderMap(map || []);
  };
  return (
    <div className="app-container">
      <h1>Statystyka w informatyce – projekt</h1>

      {/* Zakładki */}
      <div className="tabs">
        <button
          className={activeTab === "upload" ? "tab active" : "tab"}
          onClick={() => setActiveTab("upload")}
        >
          1. Wczytaj CSV
        </button>

        <button
          className={activeTab === "chart" ? "tab active" : "tab"}
          onClick={() => setActiveTab("chart")}
          disabled={data.length === 0}
        >
          2. Wykres
        </button>

        <button
          className={activeTab === "stats" ? "tab active" : "tab"}
          onClick={() => setActiveTab("stats")}
          disabled={data.length === 0}
        >
          3. Statystyki
        </button>

        <button
          className={activeTab === "faces" ? "tab active" : "tab"}
          onClick={() => setActiveTab("faces")}
          disabled={data.length === 0}
        >
          4. Twarze Chernoffa
        </button>
      </div>

      {/* Zawartość zakładek */}
      <div className="tab-content">
        {activeTab === "upload" && (
          <CsvUploadView data={data} onDataLoaded={handleDataLoaded}   headerMap={headerMap}  onHeaderMapChange={handleHeaderMapChange} />
        )}

        {activeTab === "chart" && <ChartView data={data} headerMap={headerMap}/>}

        {activeTab === "stats" && <StatisticsView data={data} headerMap={headerMap}/>}

        {activeTab === "faces" && <ChernoffFacesView data={data} headerMap={headerMap}/>}
      </div>
    </div>
  );
}

export default App;
