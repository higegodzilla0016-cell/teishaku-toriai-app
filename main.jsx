import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { Calculator, FileText, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import "./styles.css";

const DEFAULT_MATERIALS = [
  { id: "m1", name: "40x40x4L", stockLength: 5500, kerf: 3 },
  { id: "m2", name: "30x30x3L", stockLength: 5500, kerf: 3 },
  { id: "m3", name: "FB 50x6", stockLength: 5500, kerf: 3 },
];

const SAMPLE_PARTS = `870x4
772x6
500x6
350x4
450x4
260x4`;

const SAMPLE_BATCH = [
  {
    id: "b1",
    materialName: "40x40x4L",
    stockLength: 5500,
    kerf: 3,
    partsText: SAMPLE_PARTS,
  },
  {
    id: "b2",
    materialName: "30x30x3L",
    stockLength: 5500,
    kerf: 3,
    partsText: `450x4
2000x2
1994x2
367x4
694x2
440x6
610x4
324
900x4
1194x10
219x2
192x2
563x4
404x4`,
  },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function parseParts(text) {
  const rows = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const grouped = [];
  const parts = [];

  rows.forEach((line, index) => {
    const normalized = line
      .replace(/[×＊*]/g, "x")
      .replace(/[Ｘｘ]/g, "x")
      .replace(/　/g, " ")
      .replace(/ｍｍ|mm/gi, "")
      .replace(/本|個/g, "")
      .trim();

    const match = normalized.match(/^(\d+(?:\.\d+)?)\s*(?:x\s*(\d+))?$/i);
    if (!match) return;

    const length = Number(match[1]);
    const qty = match[2] ? Number(match[2]) : 1;
    grouped.push({ row: index + 1, length, qty });

    for (let i = 0; i < qty; i++) {
      parts.push({ id: `${index + 1}-${i + 1}-${uid()}`, row: index + 1, length });
    }
  });

  return { parts, grouped };
}

function optimize(parts, stockLength, kerf, scraps = []) {
  const sorted = [...parts].sort((a, b) => b.length - a.length);

  const bars = scraps
    .filter((s) => Number(s.length) > 0)
    .map((s, index) => ({
      id: `scrap-${index + 1}`,
      source: "端材",
      stockLength: Number(s.length),
      label: s.label || `端材${index + 1}`,
      parts: [],
      used: 0,
    }));

  const tooLong = [];

  for (const part of sorted) {
    const maxStock = Math.max(Number(stockLength) || 0, ...bars.map((b) => b.stockLength));
    if (part.length > maxStock) {
      tooLong.push(part);
      continue;
    }

    let bestIndex = -1;
    let bestRemaining = Infinity;

    bars.forEach((bar, index) => {
      const add = bar.parts.length === 0 ? part.length : part.length + Number(kerf || 0);
      const remaining = bar.stockLength - bar.used - add;
      if (remaining >= 0 && remaining < bestRemaining) {
        bestRemaining = remaining;
        bestIndex = index;
      }
    });

    if (bestIndex === -1) {
      if (part.length > stockLength) {
        tooLong.push(part);
        continue;
      }
      bars.push({
        id: `stock-${uid()}`,
        source: "定尺",
        stockLength: Number(stockLength),
        label: `定尺${bars.filter((b) => b.source === "定尺").length + 1}`,
        parts: [part],
        used: part.length,
      });
    } else {
      const bar = bars[bestIndex];
      const add = bar.parts.length === 0 ? part.length : part.length + Number(kerf || 0);
      bar.parts.push(part);
      bar.used += add;
    }
  }

  return {
    bars: bars
      .filter((bar) => bar.parts.length > 0 || bar.source === "端材")
      .map((bar, index) => ({
        ...bar,
        index: index + 1,
        scrap: Math.max(0, bar.stockLength - bar.used),
        cutCount: Math.max(0, bar.parts.length - 1),
      })),
    tooLong,
  };
}

function loadLocal(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

function Summary({ result, parts }) {
  const totalPartLength = parts.reduce((sum, p) => sum + p.length, 0);
  const totalStockLength = result.bars.reduce((sum, b) => sum + b.stockLength, 0);
  const totalScrap = result.bars.reduce((sum, b) => sum + b.scrap, 0);
  const stockCount = result.bars.filter((b) => b.source === "定尺").length;
  const scrapCount = result.bars.filter((b) => b.source === "端材" && b.parts.length > 0).length;
  const yieldRate = totalStockLength ? (totalPartLength / totalStockLength) * 100 : 0;

  return (
    <div className="summary">
      <div><span>新品定尺</span><strong>{stockCount}本</strong></div>
      <div><span>端材使用</span><strong>{scrapCount}本</strong></div>
      <div><span>部材数</span><strong>{parts.length}個</strong></div>
      <div><span>端材合計</span><strong>{Math.round(totalScrap)}mm</strong></div>
      <div><span>歩留まり</span><strong>{yieldRate.toFixed(1)}%</strong></div>
    </div>
  );
}

function Bars({ result, kerf, compact = false }) {
  return (
    <div className="bars">
      {result.bars.map((bar) => (
        <div className="bar-card" key={bar.id}>
          <div className="bar-head">
            <strong>{bar.source === "端材" ? bar.label : `定尺 ${bar.index}`}</strong>
            <span>{bar.source}</span>
          </div>
          <p className="bar-meta">使用 {Math.round(bar.used)}mm / 端材 {Math.round(bar.scrap)}mm</p>

          {!compact && (
            <div className="bar-visual">
              {bar.parts.map((part, i) => {
                const width = Math.max(6, (part.length / Math.max(1, bar.stockLength)) * 100);
                return (
                  <div className="piece" style={{ width: `${width}%` }} key={`${part.id}-${i}`}>
                    {part.length}
                  </div>
                );
              })}
              {bar.scrap > 0 && <div className="scrap">端材 {Math.round(bar.scrap)}</div>}
            </div>
          )}

          <p className="cut-line">
            {bar.parts.length ? bar.parts.map((p) => p.length).join(" + ") : "未使用"}
            {bar.cutCount > 0 ? ` + 切断ロス ${bar.cutCount}回×${kerf}mm` : ""}
          </p>
        </div>
      ))}
    </div>
  );
}

function SingleCalc({ materials, setMaterials }) {
  const [materialId, setMaterialId] = useState(materials[0]?.id || "m1");
  const current = materials.find((m) => m.id === materialId) || materials[0];

  const [materialName, setMaterialName] = useState(current?.name || "40x40x4L");
  const [stockLength, setStockLength] = useState(current?.stockLength || 5500);
  const [kerf, setKerf] = useState(current?.kerf || 3);
  const [partsText, setPartsText] = useState(loadLocal("singlePartsText", SAMPLE_PARTS));
  const [scrapsText, setScrapsText] = useState(loadLocal("scrapsText", "1200\n900"));

  useEffect(() => {
    localStorage.setItem("singlePartsText", JSON.stringify(partsText));
  }, [partsText]);

  useEffect(() => {
    localStorage.setItem("scrapsText", JSON.stringify(scrapsText));
  }, [scrapsText]);

  useEffect(() => {
    if (current) {
      setMaterialName(current.name);
      setStockLength(current.stockLength);
      setKerf(current.kerf);
    }
  }, [materialId]);

  const { parts } = useMemo(() => parseParts(partsText), [partsText]);
  const scraps = useMemo(() => scrapsText.split(/\n+/).map((s, i) => ({
    label: `端材${i + 1}`,
    length: Number(s.trim())
  })).filter((s) => s.length > 0), [scrapsText]);

  const result = useMemo(() => optimize(parts, Number(stockLength), Number(kerf), scraps), [parts, stockLength, kerf, scraps]);
  const compare5500 = useMemo(() => optimize(parts, 5500, Number(kerf), scraps), [parts, kerf, scraps]);
  const compare6000 = useMemo(() => optimize(parts, 6000, Number(kerf), scraps), [parts, kerf, scraps]);

  function saveMaterial() {
    const item = { id: uid(), name: materialName, stockLength: Number(stockLength), kerf: Number(kerf) };
    setMaterials((prev) => [...prev, item]);
    setMaterialId(item.id);
  }

  return (
    <div className="grid">
      <section className="panel no-print">
        <label>登録材料から選択</label>
        <select value={materialId} onChange={(e) => setMaterialId(e.target.value)}>
          {materials.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>

        <label>材料名</label>
        <input value={materialName} onChange={(e) => setMaterialName(e.target.value)} />

        <div className="two">
          <div>
            <label>定尺長さ mm</label>
            <input type="number" value={stockLength} onChange={(e) => setStockLength(e.target.value)} />
          </div>
          <div>
            <label>切断ロス mm</label>
            <input type="number" value={kerf} onChange={(e) => setKerf(e.target.value)} />
          </div>
        </div>

        <label>部材寸法</label>
        <textarea value={partsText} onChange={(e) => setPartsText(e.target.value)} />

        <label>再利用する端材 mm</label>
        <textarea className="small" value={scrapsText} onChange={(e) => setScrapsText(e.target.value)} />

        <div className="actions">
          <button><Calculator size={18} /> 計算</button>
          <button type="button" className="sub" onClick={saveMaterial}><Save size={18} /> 材料保存</button>
          <button type="button" className="sub" onClick={() => window.print()}><FileText size={18} /> PDF/印刷</button>
          <button type="button" className="sub" onClick={() => { setPartsText(SAMPLE_PARTS); setScrapsText("1200\n900"); }}><RotateCcw size={18} /> 初期化</button>
        </div>
      </section>

      <section className="result">
        <div className="print-title">
          <h2>定尺取り合い切断指示書</h2>
          <p>材料：{materialName} / 定尺：{stockLength}mm / 切断ロス：{kerf}mm</p>
        </div>

        <Summary result={result} parts={parts} />

        <div className="compare no-print">
          <h3>5.5m / 6m 比較</h3>
          <div>
            <article>
              <strong>5.5m</strong>
              <p>新品定尺：{compare5500.bars.filter((b) => b.source === "定尺").length}本</p>
              <small>端材合計：{Math.round(compare5500.bars.reduce((s, b) => s + b.scrap, 0))}mm</small>
            </article>
            <article>
              <strong>6m</strong>
              <p>新品定尺：{compare6000.bars.filter((b) => b.source === "定尺").length}本</p>
              <small>端材合計：{Math.round(compare6000.bars.reduce((s, b) => s + b.scrap, 0))}mm</small>
            </article>
          </div>
        </div>

        {result.tooLong.length > 0 && (
          <div className="warn">定尺より長い部材があります：{result.tooLong.map((p) => p.length).join("、")}mm</div>
        )}

        <h3>割付結果・切断指示</h3>
        <Bars result={result} kerf={kerf} />
      </section>
    </div>
  );
}

function BatchCalc() {
  const [jobs, setJobs] = useState(loadLocal("batchJobs", SAMPLE_BATCH));

  useEffect(() => {
    localStorage.setItem("batchJobs", JSON.stringify(jobs));
  }, [jobs]);

  const results = useMemo(() => jobs.map((job) => {
    const { parts } = parseParts(job.partsText);
    const result = optimize(parts, Number(job.stockLength), Number(job.kerf), []);
    return { job, parts, result };
  }), [jobs]);

  return (
    <section className="panel wide">
      <div className="head-row no-print">
        <h2>複数材料の一括計算</h2>
        <button type="button" onClick={() => setJobs((prev) => [...prev, {
          id: uid(),
          materialName: "新規材料",
          stockLength: 5500,
          kerf: 3,
          partsText: ""
        }])}><Plus size={18} />材料追加</button>
      </div>

      <div className="job-list no-print">
        {jobs.map((job, index) => (
          <article className="job" key={job.id}>
            <div className="head-row">
              <strong>材料 {index + 1}</strong>
              <button className="danger" type="button" onClick={() => setJobs((prev) => prev.filter((j) => j.id !== job.id))}><Trash2 size={16} /></button>
            </div>
            <div className="three">
              <input value={job.materialName} onChange={(e) => setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, materialName: e.target.value } : j))} />
              <input type="number" value={job.stockLength} onChange={(e) => setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, stockLength: e.target.value } : j))} />
              <input type="number" value={job.kerf} onChange={(e) => setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, kerf: e.target.value } : j))} />
            </div>
            <textarea value={job.partsText} onChange={(e) => setJobs((prev) => prev.map((j) => j.id === job.id ? { ...j, partsText: e.target.value } : j))} />
          </article>
        ))}
      </div>

      <div className="head-row">
        <h2>一括計算結果</h2>
        <button className="sub no-print" type="button" onClick={() => window.print()}><FileText size={18} />PDF/印刷</button>
      </div>

      {results.map(({ job, parts, result }) => (
        <div className="batch-result" key={job.id}>
          <h3>{job.materialName} / 定尺 {job.stockLength}mm / ロス {job.kerf}mm</h3>
          <Summary result={result} parts={parts} />
          <Bars result={result} kerf={job.kerf} compact />
        </div>
      ))}
    </section>
  );
}

function Materials({ materials, setMaterials }) {
  const [name, setName] = useState("");
  const [stockLength, setStockLength] = useState(5500);
  const [kerf, setKerf] = useState(3);

  function add() {
    if (!name.trim()) return;
    setMaterials((prev) => [...prev, { id: uid(), name, stockLength: Number(stockLength), kerf: Number(kerf) }]);
    setName("");
  }

  return (
    <section className="panel wide">
      <h2>材料登録</h2>
      <div className="three no-print">
        <input placeholder="材料名 例：50x50x6L" value={name} onChange={(e) => setName(e.target.value)} />
        <input type="number" value={stockLength} onChange={(e) => setStockLength(e.target.value)} />
        <input type="number" value={kerf} onChange={(e) => setKerf(e.target.value)} />
      </div>
      <button className="no-print" type="button" onClick={add}><Plus size={18} />登録</button>

      <div className="material-list">
        {materials.map((m) => (
          <article className="material" key={m.id}>
            <strong>{m.name}</strong>
            <span>定尺 {m.stockLength}mm / ロス {m.kerf}mm</span>
            <button className="danger no-print" type="button" onClick={() => setMaterials((prev) => prev.filter((x) => x.id !== m.id))}><Trash2 size={16} /></button>
          </article>
        ))}
      </div>
    </section>
  );
}

function MobileSample() {
  const { parts } = parseParts(SAMPLE_PARTS);
  const result = optimize(parts, 5500, 3, []);

  return (
    <section className="phone">
      <h2>スマホ現場表示</h2>
      <p>現場で切断順だけ確認しやすい表示です。</p>
      {result.bars.map((bar) => (
        <article key={bar.id}>
          <strong>定尺 {bar.index}</strong>
          <b>{bar.parts.map((p) => p.length).join(" / ")}</b>
          <span>端材 {Math.round(bar.scrap)}mm</span>
        </article>
      ))}
    </section>
  );
}

function App() {
  const [tab, setTab] = useState("single");
  const [materials, setMaterials] = useState(loadLocal("materials", DEFAULT_MATERIALS));

  useEffect(() => {
    localStorage.setItem("materials", JSON.stringify(materials));
  }, [materials]);

  return (
    <main>
      <header className="no-print">
        <h1>定尺取り合い計算アプリ</h1>
        <p>必要本数、割付、端材、5.5m/6m比較、端材再利用、PDF印刷、一括計算に対応。</p>
      </header>

      <nav className="tabs no-print">
        <button className={tab === "single" ? "active" : ""} onClick={() => setTab("single")}>単品計算</button>
        <button className={tab === "batch" ? "active" : ""} onClick={() => setTab("batch")}>一括計算</button>
        <button className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")}>材料登録</button>
        <button className={tab === "mobile" ? "active" : ""} onClick={() => setTab("mobile")}>現場表示</button>
      </nav>

      {tab === "single" && <SingleCalc materials={materials} setMaterials={setMaterials} />}
      {tab === "batch" && <BatchCalc />}
      {tab === "materials" && <Materials materials={materials} setMaterials={setMaterials} />}
      {tab === "mobile" && <MobileSample />}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
