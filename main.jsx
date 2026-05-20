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

const SAMPLE_PLATE_PARTS = `1664x352x3
1064x552x3
1064x584x2
800x400x4
500x300x6`;

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

function loadLocal(key, fallback) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : fallback;
  } catch {
    return fallback;
  }
}

/* ==============================
   定尺材
============================== */

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

/* ==============================
   4×8板材 簡易版
============================== */

function parsePlateParts(text) {
  const rows = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parts = [];

  rows.forEach((line, index) => {
    const normalized = line
      .replace(/[×＊*]/g, "x")
      .replace(/[Ｘｘ]/g, "x")
      .replace(/　/g, " ")
      .replace(/ｍｍ|mm/gi, "")
      .replace(/枚|個/g, "")
      .trim();

    const match = normalized.match(/^(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)(?:\s*x\s*(\d+))?$/i);
    if (!match) return;

    const w = Number(match[1]);
    const h = Number(match[2]);
    const qty = match[3] ? Number(match[3]) : 1;

    for (let i = 0; i < qty; i++) {
      parts.push({
        id: `${index + 1}-${i + 1}-${uid()}`,
        row: index + 1,
        w,
        h,
        area: w * h,
      });
    }
  });

  return parts;
}

function canFit(free, part, allowRotate, kerf) {
  const options = [{ w: part.w, h: part.h, rotated: false }];
  if (allowRotate && part.w !== part.h) {
    options.push({ w: part.h, h: part.w, rotated: true });
  }
  return options.filter((o) => o.w + kerf <= free.w && o.h + kerf <= free.h);
}

function pruneFreeRects(freeRects) {
  const result = [];
  for (let i = 0; i < freeRects.length; i++) {
    const a = freeRects[i];
    if (a.w <= 0 || a.h <= 0) continue;

    let contained = false;
    for (let j = 0; j < freeRects.length; j++) {
      if (i === j) continue;
      const b = freeRects[j];
      if (a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h) {
        contained = true;
        break;
      }
    }
    if (!contained) result.push(a);
  }
  return result;
}

function placePart(sheet, part, allowRotate, kerf) {
  let best = null;

  sheet.freeRects.forEach((free, freeIndex) => {
    const fits = canFit(free, part, allowRotate, kerf);
    fits.forEach((fit) => {
      const remainingArea = free.w * free.h - fit.w * fit.h;
      const score = remainingArea + Math.min(free.w - fit.w, free.h - fit.h);
      if (!best || score < best.score) {
        best = { free, freeIndex, fit, score };
      }
    });
  });

  if (!best) return false;

  const p = {
    ...part,
    x: best.free.x,
    y: best.free.y,
    drawW: best.fit.w,
    drawH: best.fit.h,
    rotated: best.fit.rotated,
  };

  sheet.placed.push(p);
  sheet.usedArea += part.area;

  const f = best.free;
  const usedW = best.fit.w + kerf;
  const usedH = best.fit.h + kerf;

  const right = { x: f.x + usedW, y: f.y, w: f.w - usedW, h: best.fit.h };
  const bottom = { x: f.x, y: f.y + usedH, w: f.w, h: f.h - usedH };

  sheet.freeRects.splice(best.freeIndex, 1, right, bottom);
  sheet.freeRects = pruneFreeRects(sheet.freeRects);

  return true;
}

function optimizePlateParts(parts, sheetW, sheetH, kerf, allowRotate) {
  const sorted = [...parts].sort((a, b) => b.area - a.area);
  const sheets = [];
  const tooLarge = [];

  sorted.forEach((part) => {
    const normal = part.w + kerf <= sheetW && part.h + kerf <= sheetH;
    const rotated = allowRotate && part.h + kerf <= sheetW && part.w + kerf <= sheetH;

    if (!normal && !rotated) {
      tooLarge.push(part);
      return;
    }

    let placed = false;
    for (const sheet of sheets) {
      if (placePart(sheet, part, allowRotate, kerf)) {
        placed = true;
        break;
      }
    }

    if (!placed) {
      const sheet = {
        id: `sheet-${sheets.length + 1}`,
        index: sheets.length + 1,
        placed: [],
        usedArea: 0,
        freeRects: [{ x: 0, y: 0, w: sheetW, h: sheetH }],
      };
      placePart(sheet, part, allowRotate, kerf);
      sheets.push(sheet);
    }
  });

  return { sheets, tooLarge };
}


function optimizeShearPlateParts(parts, sheetW, sheetH, kerf, grainFixed) {
  // シャーリング向けの簡易版：
  // 回転なし、長手方向へ帯取りしてから帯内で横方向に並べる。
  // 縞目固定を想定する場合も同じく回転なし。
  const sorted = [...parts].sort((a, b) => {
    if (b.h !== a.h) return b.h - a.h;
    return b.w - a.w;
  });

  const sheets = [];
  const tooLarge = [];

  function newSheet() {
    const sheet = {
      id: `sheet-${sheets.length + 1}`,
      index: sheets.length + 1,
      usedArea: 0,
      placed: [],
      bands: [],
    };
    sheets.push(sheet);
    return sheet;
  }

  for (const part of sorted) {
    if (part.w + kerf > sheetW || part.h + kerf > sheetH) {
      tooLarge.push(part);
      continue;
    }

    let placed = false;

    for (const sheet of sheets) {
      // 既存の帯へ入れる
      for (const band of sheet.bands) {
        if (part.h <= band.h && band.usedX + part.w + (band.parts.length ? kerf : 0) <= sheetW) {
          const x = band.usedX + (band.parts.length ? kerf : 0);
          const y = band.y;
          const p = {
            ...part,
            x,
            y,
            drawW: part.w,
            drawH: part.h,
            rotated: false,
            bandIndex: band.index,
          };
          band.parts.push(p);
          band.usedX = x + part.w;
          sheet.placed.push(p);
          sheet.usedArea += part.area;
          placed = true;
          break;
        }
      }
      if (placed) break;

      // 新しい帯を作る
      const usedY = sheet.bands.reduce((sum, band) => sum + band.h + kerf, 0);
      if (usedY + part.h <= sheetH) {
        const band = {
          index: sheet.bands.length + 1,
          x: 0,
          y: usedY,
          h: part.h,
          usedX: part.w,
          parts: [],
        };
        const p = {
          ...part,
          x: 0,
          y: usedY,
          drawW: part.w,
          drawH: part.h,
          rotated: false,
          bandIndex: band.index,
        };
        band.parts.push(p);
        sheet.bands.push(band);
        sheet.placed.push(p);
        sheet.usedArea += part.area;
        placed = true;
        break;
      }
    }

    if (!placed) {
      const sheet = newSheet();
      const band = {
        index: 1,
        x: 0,
        y: 0,
        h: part.h,
        usedX: part.w,
        parts: [],
      };
      const p = {
        ...part,
        x: 0,
        y: 0,
        drawW: part.w,
        drawH: part.h,
        rotated: false,
        bandIndex: 1,
      };
      band.parts.push(p);
      sheet.bands.push(band);
      sheet.placed.push(p);
      sheet.usedArea += part.area;
    }
  }

  return { sheets, tooLarge };
}

function plateWeightKg(width, height, thickness, count = 1) {
  return (width * height * thickness * 7.85 / 1000000) * count;
}

function PlateSummary({ result, parts, sheetW, sheetH, thickness }) {
  const totalPartArea = parts.reduce((s, p) => s + p.area, 0);
  const totalSheetArea = result.sheets.length * sheetW * sheetH;
  const yieldRate = totalSheetArea ? (totalPartArea / totalSheetArea) * 100 : 0;
  const partWeight = thickness ? plateWeightKg(1, totalPartArea, thickness, 1) : 0;
  const sheetWeight = thickness ? plateWeightKg(sheetW, sheetH, thickness, result.sheets.length) : 0;

  return (
    <div className="summary">
      <div><span>必要母材</span><strong>{result.sheets.length}枚</strong></div>
      <div><span>部材数</span><strong>{parts.length}個</strong></div>
      <div><span>歩留まり</span><strong>{yieldRate.toFixed(1)}%</strong></div>
      <div><span>部材重量</span><strong>{partWeight ? `${partWeight.toFixed(1)}kg` : "-"}</strong></div>
      <div><span>母材重量</span><strong>{sheetWeight ? `${sheetWeight.toFixed(1)}kg` : "-"}</strong></div>
    </div>
  );
}

function PlateDrawing({ sheet, sheetW, sheetH, mode }) {
  const scale = Math.min(1, 760 / sheetW);

  return (
    <div className="sheet-card">
      <div className="bar-head">
        <strong>母材 {sheet.index}</strong>
        <span>4×8</span>
      </div>
      <p className="bar-meta">
        使用面積 {(sheet.usedArea / 1000000).toFixed(3)}㎡ / 端材面積 {((sheetW * sheetH - sheet.usedArea) / 1000000).toFixed(3)}㎡
      </p>

      <div className="sheet-visual screen-sheet" style={{ width: `${sheetW * scale}px`, height: `${sheetH * scale}px` }}>
        {sheet.placed.map((p) => (
          <div
            key={p.id}
            className="plate-piece"
            style={{
              left: `${p.x * scale}px`,
              top: `${p.y * scale}px`,
              width: `${p.drawW * scale}px`,
              height: `${p.drawH * scale}px`,
            }}
          >
            <b>{p.row}</b>
            <span>{p.w}×{p.h}</span>
            {p.rotated && <small>回転</small>}
          </div>
        ))}
      </div>

      <div className="print-sheet print-sheet-landscape">
        {sheet.placed.map((p) => {
          // 印刷時だけA4横に合わせて母材を90度回転表示
          // 元の4×8縦向き座標 x,y,w,h を横向き座標へ変換
          const printW = 260;
          const printH = 130;
          const left = (p.y / sheetH) * printW;
          const top = ((sheetW - p.x - p.drawW) / sheetW) * printH;
          const width = (p.drawH / sheetH) * printW;
          const height = (p.drawW / sheetW) * printH;

          return (
            <div
              key={`print-${p.id}`}
              className="print-plate-piece"
              style={{
                left: `${left}mm`,
                top: `${top}mm`,
                width: `${width}mm`,
                height: `${height}mm`,
              }}
            >
              <b>{p.row}</b>
              <span>{p.w}×{p.h}</span>
              {p.rotated && <small>回転</small>}
            </div>
          );
        })}
      </div>

      <p className="cut-line">
        {sheet.placed.map((p) => `${p.row}:${p.w}×${p.h}${p.rotated ? "(回転)" : ""}`).join(" / ")}
      </p>

      {mode === "shear" && (
        <div className="shear-steps">
          <strong>シャーリング順（簡易）</strong>
          <ol>
            {(sheet.bands || []).map((band) => (
              <li key={`band-${band.index}`}>
                帯{band.index}：長手方向 {Math.round(band.y)}〜{Math.round(band.y + band.h)}mm で帯取り → 帯内で {band.parts.map((p) => `${p.w}×${p.h}`).join(" / ")} を切断
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}


/* ==============================
   画面
============================== */

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

function PlateCalc() {
  const [mode, setMode] = useState("laser");
  const [sheetW, setSheetW] = useState(1219);
  const [sheetH, setSheetH] = useState(2438);
  const [thickness, setThickness] = useState(6);
  const [kerf, setKerf] = useState(3);
  const [allowRotate, setAllowRotate] = useState(true);
  const [grainFixed, setGrainFixed] = useState(true);
  const [partsText, setPartsText] = useState(loadLocal("platePartsText", SAMPLE_PLATE_PARTS));

  useEffect(() => {
    localStorage.setItem("platePartsText", JSON.stringify(partsText));
  }, [partsText]);

  const parts = useMemo(() => parsePlateParts(partsText), [partsText]);
  const effectiveRotate = mode === "laser" ? allowRotate : false;
  const result = useMemo(
    () => mode === "shear"
      ? optimizeShearPlateParts(parts, Number(sheetW), Number(sheetH), Number(kerf), grainFixed)
      : optimizePlateParts(parts, Number(sheetW), Number(sheetH), Number(kerf), effectiveRotate),
    [parts, sheetW, sheetH, kerf, effectiveRotate, mode, grainFixed]
  );

  return (
    <div className="grid plate-grid">
      <section className="panel no-print">
        <h2>4×8板材取り合い</h2>

        <label>加工方法</label>
        <select value={mode} onChange={(e) => setMode(e.target.value)}>
          <option value="laser">レーザー切断ver</option>
          <option value="shear">シャーリングver</option>
        </select>

        <div className="two">
          <div>
            <label>母材幅 mm</label>
            <input type="number" value={sheetW} onChange={(e) => setSheetW(e.target.value)} />
          </div>
          <div>
            <label>母材長さ mm</label>
            <input type="number" value={sheetH} onChange={(e) => setSheetH(e.target.value)} />
          </div>
        </div>

        <div className="two">
          <div>
            <label>板厚 mm</label>
            <input type="number" value={thickness} onChange={(e) => setThickness(e.target.value)} />
          </div>
          <div>
            <label>切断ロス mm</label>
            <input type="number" value={kerf} onChange={(e) => setKerf(e.target.value)} />
          </div>
        </div>

        {mode === "laser" && (
          <label className="check-row">
            <input type="checkbox" checked={allowRotate} onChange={(e) => setAllowRotate(e.target.checked)} />
            回転あり
          </label>
        )}

        {mode === "shear" && (
          <label className="check-row">
            <input type="checkbox" checked={grainFixed} onChange={(e) => setGrainFixed(e.target.checked)} />
            縞目固定・回転なし
          </label>
        )}

        <label>部材寸法</label>
        <textarea value={partsText} onChange={(e) => setPartsText(e.target.value)} />

        <p className="hint">入力形式：幅x長さx枚数　例：1664x352x3</p>

        <div className="actions">
          <button><Calculator size={18} /> 計算</button>
          <button type="button" className="sub" onClick={() => window.print()}><FileText size={18} /> PDF/印刷</button>
          <button type="button" className="sub" onClick={() => setPartsText(SAMPLE_PLATE_PARTS)}><RotateCcw size={18} /> 初期化</button>
        </div>
      </section>

      <section className="result">
        <div className="print-title">
          <h2>4×8板材取り合い指示書</h2>
          <p>
            方法：{mode === "shear" ? "シャーリングver" : "レーザー切断ver"} / 母材：{sheetW}×{sheetH}mm / 板厚：{thickness}mm / 切断ロス：{kerf}mm / {mode === "shear" ? "縞目固定・回転なし" : (allowRotate ? "回転あり" : "回転なし")}
          </p>
        </div>

        <PlateSummary result={result} parts={parts} sheetW={Number(sheetW)} sheetH={Number(sheetH)} thickness={Number(thickness)} />

        {result.tooLarge.length > 0 && (
          <div className="warn">
            母材に入らない部材があります：
            {result.tooLarge.map((p) => `${p.w}×${p.h}`).join("、")}
          </div>
        )}

        <h3>板取り結果</h3>
        <div className="sheet-list">
          {result.sheets.map((sheet) => (
            <PlateDrawing key={sheet.id} sheet={sheet} sheetW={Number(sheetW)} sheetH={Number(sheetH)} mode={mode} />
          ))}
        </div>
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
        <h1>定尺・4×8板取り合い計算アプリ</h1>
        <p>Step3.2：印刷時はA4横に合わせて4×8母材を横向き表示します。</p>
      </header>

      <nav className="tabs no-print">
        <button className={tab === "single" ? "active" : ""} onClick={() => setTab("single")}>定尺計算</button>
        <button className={tab === "plate" ? "active" : ""} onClick={() => setTab("plate")}>4×8板材</button>
        <button className={tab === "batch" ? "active" : ""} onClick={() => setTab("batch")}>一括計算</button>
        <button className={tab === "materials" ? "active" : ""} onClick={() => setTab("materials")}>材料登録</button>
        <button className={tab === "mobile" ? "active" : ""} onClick={() => setTab("mobile")}>現場表示</button>
      </nav>

      {tab === "single" && <SingleCalc materials={materials} setMaterials={setMaterials} />}
      {tab === "plate" && <PlateCalc />}
      {tab === "batch" && <BatchCalc />}
      {tab === "materials" && <Materials materials={materials} setMaterials={setMaterials} />}
      {tab === "mobile" && <MobileSample />}
    </main>
  );
}

createRoot(document.getElementById("root")).render(<App />);
