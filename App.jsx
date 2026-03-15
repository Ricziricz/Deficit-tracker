import { useState, useEffect, useCallback } from "react";

const API_URL = "https://script.google.com/macros/s/AKfycbw5gj4hFbJWduJr_PZtwlhDvplLa2ytc4lf0O6qmJw47-Bf6XFguGj87seOyt7n-rXLsw/exec";

const GOAL = 60000;
const KCAL_PER_KG = 7700;

function formatDate(iso) {
  if (!iso) return "—";
  const str = typeof iso === "string" ? iso.split("T")[0] : iso;
  const d = new Date(str + "T12:00:00");
  return d.toLocaleDateString("pl-PL", { day: "2-digit", month: "2-digit" });
}

function toDateStr(val) {
  if (!val) return "";
  if (typeof val === "string") return val.split("T")[0];
  if (val instanceof Date) return val.toISOString().split("T")[0];
  return String(val);
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function daysBetween(a, b) {
  return Math.round((new Date(b + "T12:00:00") - new Date(a + "T12:00:00")) / 86400000);
}

function parseNum(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

function Stats({ data, currentWeight }) {
  const withDeficit = data.filter((d) => d.deficit !== null && d.deficit !== undefined);
  const totalDeficit = withDeficit.reduce((s, d) => s + d.deficit, 0);
  const avgDeficit = withDeficit.length > 0 ? totalDeficit / withDeficit.length : 0;
  const pct = ((totalDeficit / GOAL) * 100).toFixed(1);
  const remaining = GOAL - totalDeficit;
  const daysToGoal = avgDeficit > 0 ? Math.ceil(remaining / avgDeficit) : Infinity;

  const today = new Date().toISOString().split("T")[0];
  const goalDate = daysToGoal < 9999 ? addDays(today, daysToGoal) : null;

  const may17days = daysBetween(today, "2026-05-17");
  const may30days = daysBetween(today, "2026-05-30");
  const weightMay17 = currentWeight - ((totalDeficit + avgDeficit * may17days) / KCAL_PER_KG);
  const weightMay30 = currentWeight - ((totalDeficit + avgDeficit * may30days) / KCAL_PER_KG);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "24px" }}>
      <MetricCard label="Suma deficytu" value={`${Math.round(totalDeficit).toLocaleString("pl")} kcal`} sub={`${pct}% z ${(GOAL / 1000).toFixed(0)}k`} color="var(--accent)" />
      <MetricCard label="Śr. deficyt/dzień" value={`${Math.round(avgDeficit)} kcal`} sub={`${withDeficit.length} dni danych`} color={avgDeficit >= 400 ? "var(--green)" : "var(--warn)"} />
      <MetricCard label="Prognoza 17.05" value={`${weightMay17.toFixed(1)} kg`} sub={`za ${may17days} dni`} color="var(--blue)" />
      <MetricCard label="Prognoza 30.05" value={`${weightMay30.toFixed(1)} kg`} sub={`za ${may30days} dni`} color="var(--blue)" />
      <MetricCard
        label="Cel 60k kcal"
        value={goalDate ? new Date(goalDate + "T12:00:00").toLocaleDateString("pl-PL", { day: "numeric", month: "long", year: "numeric" }) : "—"}
        sub={daysToGoal < 9999 ? `za ${daysToGoal} dni` : "brak danych"}
        color="var(--accent)"
      />
      <MetricCard
        label="Waga docelowa"
        value={`${(currentWeight - GOAL / KCAL_PER_KG).toFixed(1)} kg`}
        sub={`z ${currentWeight} kg`}
        color="var(--green)"
      />
    </div>
  );
}

function MetricCard({ label, value, sub, color }) {
  return (
    <div style={{ background: "var(--card)", borderRadius: "10px", padding: "14px 16px", borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: "4px" }}>{label}</div>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "var(--text)", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>{sub}</div>}
    </div>
  );
}

function MiniChart({ data }) {
  const withDeficit = data.filter((d) => d.deficit !== null && d.deficit !== undefined);
  if (withDeficit.length < 2) return null;

  const maxDef = Math.max(...withDeficit.map((d) => Math.abs(d.deficit)), 1);
  const w = 100;
  const h = 60;
  const step = w / (withDeficit.length - 1);

  const points = withDeficit.map((d, i) => {
    const x = i * step;
    const y = h - ((d.deficit + maxDef) / (2 * maxDef)) * h;
    return `${x},${y}`;
  });

  const zeroY = h - ((0 + maxDef) / (2 * maxDef)) * h;

  return (
    <div style={{ background: "var(--card)", borderRadius: "10px", padding: "16px", marginBottom: "24px" }}>
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: "8px" }}>
        Deficyt dzienny (kcal)
      </div>
      <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} style={{ width: "100%", height: "80px" }}>
        <line x1="0" y1={zeroY} x2={w} y2={zeroY} stroke="var(--muted)" strokeWidth="0.3" strokeDasharray="2,2" />
        <polyline points={points.join(" ")} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {withDeficit.map((d, i) => (
          <circle key={i} cx={i * step} cy={parseFloat(points[i].split(",")[1])} r="2.5" fill={d.deficit >= 0 ? "var(--green)" : "var(--red)"} />
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted)" }}>
        <span>{formatDate(withDeficit[0].date)}</span>
        <span>{formatDate(withDeficit[withDeficit.length - 1].date)}</span>
      </div>
    </div>
  );
}

function WeightChart({ data }) {
  const withWeight = data.filter((d) => d.weight);
  if (withWeight.length < 2) return null;

  const weights = withWeight.map((d) => d.weight);
  const minW = Math.min(...weights) - 0.3;
  const maxW = Math.max(...weights) + 0.3;
  const range = maxW - minW || 1;
  const w = 100;
  const h = 60;
  const step = w / (withWeight.length - 1);

  const points = withWeight.map((d, i) => {
    const x = i * step;
    const y = h - ((d.weight - minW) / range) * h;
    return `${x},${y}`;
  });

  return (
    <div style={{ background: "var(--card)", borderRadius: "10px", padding: "16px", marginBottom: "24px" }}>
      <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)", marginBottom: "8px" }}>
        Waga (kg)
      </div>
      <svg viewBox={`-4 -4 ${w + 8} ${h + 8}`} style={{ width: "100%", height: "80px" }}>
        <polyline points={points.join(" ")} fill="none" stroke="var(--blue)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {withWeight.map((d, i) => (
          <g key={i}>
            <circle cx={i * step} cy={parseFloat(points[i].split(",")[1])} r="2.5" fill="var(--blue)" />
            {i === withWeight.length - 1 && (
              <text x={i * step} y={parseFloat(points[i].split(",")[1]) - 6} fill="var(--blue)" fontSize="5" textAnchor="end" fontWeight="700">
                {d.weight}
              </text>
            )}
          </g>
        ))}
      </svg>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "var(--muted)" }}>
        <span>{formatDate(withWeight[0].date)}</span>
        <span>{formatDate(withWeight[withWeight.length - 1].date)}</span>
      </div>
    </div>
  );
}

function AddForm({ onAdd, lastDate, saving }) {
  const nextDate = lastDate ? addDays(lastDate, 1) : new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ date: nextDate, weight: "", eaten: "", burned_raw: "" });
  const [open, setOpen] = useState(false);

  const handleSubmit = () => {
    onAdd({
      date: form.date,
      weight: parseFloat(form.weight),
      eaten: parseInt(form.eaten) || null,
      oura_raw: parseInt(form.burned_raw) || null,
    });
    setForm({ date: addDays(form.date, 1), weight: "", eaten: "", burned_raw: "" });
    setOpen(false);
  };

  const valid = form.date && form.weight;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: "100%",
          padding: "12px",
          background: "var(--accent)",
          color: "#fff",
          border: "none",
          borderRadius: "10px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          marginBottom: "24px",
        }}
      >
        + Dodaj dzień
      </button>
    );
  }

  return (
    <div style={{ background: "var(--card)", borderRadius: "10px", padding: "16px", marginBottom: "24px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--text)", marginBottom: "12px" }}>Nowy wpis</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
        {[
          { key: "date", label: "Data", type: "date", placeholder: "" },
          { key: "weight", label: "Waga (kg)", type: "number", placeholder: "80.2" },
          { key: "burned_raw", label: "Oura total cal", type: "number", placeholder: "3002" },
          { key: "eaten", label: "Spożyte (kcal)", type: "number", placeholder: "2200" },
        ].map((f) => (
          <div key={f.key}>
            <label style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--muted)" }}>{f.label}</label>
            <input
              type={f.type}
              value={form[f.key]}
              placeholder={f.placeholder}
              onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 10px",
                background: "var(--bg)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--text)",
                fontSize: "14px",
                marginTop: "4px",
                boxSizing: "border-box",
              }}
            />
          </div>
        ))}
      </div>
      {form.burned_raw && form.eaten && (
        <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "8px" }}>
          Spalanie −10%: <b style={{ color: "var(--text)" }}>{Math.round(parseFloat(form.burned_raw) * 0.9)}</b> kcal → deficyt:{" "}
          <b style={{ color: Math.round(parseFloat(form.burned_raw) * 0.9) - parseInt(form.eaten) >= 0 ? "var(--green)" : "var(--red)" }}>
            {Math.round(parseFloat(form.burned_raw) * 0.9) - parseInt(form.eaten)} kcal
          </b>
        </div>
      )}
      <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
        <button
          onClick={handleSubmit}
          disabled={!valid || saving}
          style={{
            flex: 1,
            padding: "10px",
            background: valid && !saving ? "var(--green)" : "var(--border)",
            color: valid && !saving ? "#fff" : "var(--muted)",
            border: "none",
            borderRadius: "8px",
            fontSize: "13px",
            fontWeight: 600,
            cursor: valid && !saving ? "pointer" : "default",
          }}
        >
          {saving ? "Zapisuję..." : "Zapisz"}
        </button>
        <button
          onClick={() => setOpen(false)}
          style={{
            padding: "10px 16px",
            background: "transparent",
            color: "var(--muted)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}

function DataTable({ data }) {
  const [expanded, setExpanded] = useState(false);
  const display = expanded ? data : data.slice(-5);

  const getAvg5 = (idx) => {
    const weights = [];
    for (let j = idx; j >= 0 && weights.length < 5; j--) {
      if (data[j].weight) weights.push(data[j].weight);
    }
    if (weights.length === 0) return null;
    return (weights.reduce((a, b) => a + b, 0) / weights.length).toFixed(1);
  };

  return (
    <div style={{ background: "var(--card)", borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid var(--border)" }}>
              {["Data", "Waga", "Śr. 5d", "Spożyte", "Spalone*", "Deficyt"].map((h) => (
                <th key={h} style={{ padding: "10px 8px", textAlign: "right", color: "var(--muted)", fontWeight: 500, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {display.map((d) => {
              const fullIdx = data.findIndex((x) => x.date === d.date);
              const avg5 = getAvg5(fullIdx);
              return (
                <tr key={d.date} style={{ borderBottom: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px", color: "var(--text)", fontWeight: 500 }}>{formatDate(d.date)}</td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--text)" }}>{d.weight ?? "—"}</td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--blue)", fontSize: "11px" }}>{avg5 ?? "—"}</td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--text)" }}>{d.eaten ?? "—"}</td>
                  <td style={{ padding: "8px", textAlign: "right", color: "var(--text)" }}>{d.burned ?? "—"}</td>
                  <td
                    style={{
                      padding: "8px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: d.deficit == null ? "var(--muted)" : d.deficit >= 400 ? "var(--green)" : d.deficit >= 0 ? "var(--warn)" : "var(--red)",
                    }}
                  >
                    {d.deficit != null ? d.deficit : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {data.length > 5 && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            width: "100%",
            padding: "8px",
            background: "transparent",
            border: "none",
            borderTop: "1px solid var(--border)",
            color: "var(--muted)",
            fontSize: "11px",
            cursor: "pointer",
          }}
        >
          {expanded ? "Pokaż mniej ▲" : `Pokaż wszystkie (${data.length}) ▼`}
        </button>
      )}
      <div style={{ padding: "6px 8px", fontSize: "10px", color: "var(--muted)", borderTop: "1px solid var(--border)" }}>
        * Spalanie = Oura total cal × 0.9
      </div>
    </div>
  );
}

export default function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(API_URL);
      const json = await res.json();
      if (json.success) {
        const rows = json.data.map((r) => ({
          date: toDateStr(r["Data"]),
          weight: parseNum(r["Waga"]),
          avg5: parseNum(r["Sr. 5d"]),
          eaten: parseNum(r["Spożyte"]) || parseNum(r["SpoÅ\u00BCyte"]),
          burned_raw: parseNum(r["Oura Raw"]),
          burned: parseNum(r["Spalone (x0.9)"]),
          deficit: parseNum(r["Deficyt"]),
        }));
        setData(rows);
        setLastSync(new Date());
      } else {
        setError("Błąd API: " + (json.error || "nieznany"));
      }
    } catch (err) {
      setError("Nie udało się pobrać danych: " + err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAdd = useCallback(async (entry) => {
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(entry),
      });
      const json = await res.json();
      if (json.success) {
        await fetchData();
      } else {
        setError("Błąd zapisu: " + (json.error || "nieznany"));
      }
    } catch (err) {
      setError("Nie udało się zapisać: " + err.message);
    }
    setSaving(false);
  }, [fetchData]);

  const currentWeight = data.length > 0 ? (data[data.length - 1].weight || data.filter(d => d.weight).pop()?.weight || 80) : 80;
  const lastDate = data.length > 0 ? data[data.length - 1].date : null;

  if (loading) {
    return (
      <div style={{ ...rootStyle, display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ color: "var(--muted)", fontSize: "14px" }}>Ładowanie danych z Google Sheets...</div>
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--text)" }}>
            🔥 Deficit Tracker
          </h1>
          <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Cel: {(GOAL / 1000).toFixed(0)}k kcal deficytu → {(currentWeight - GOAL / KCAL_PER_KG).toFixed(1)} kg</span>
            <button
              onClick={fetchData}
              style={{ background: "none", border: "none", color: "var(--blue)", cursor: "pointer", fontSize: "11px", padding: "2px 6px" }}
            >
              ↻ Odśwież
            </button>
          </div>
          {lastSync && (
            <div style={{ fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
              Ostatnia sync: {lastSync.toLocaleTimeString("pl-PL")}
            </div>
          )}
        </div>

        {error && (
          <div style={{ background: "#3b1219", border: "1px solid var(--red)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", fontSize: "12px", color: "var(--red)" }}>
            {error}
          </div>
        )}

        <Stats data={data} currentWeight={currentWeight} />
        <MiniChart data={data} />
        <WeightChart data={data} />
        <AddForm onAdd={handleAdd} lastDate={lastDate} saving={saving} />
        <DataTable data={data} />

        <div style={{ textAlign: "center", fontSize: "10px", color: "var(--muted)", padding: "16px 0" }}>
          Dane z Google Sheets • Apps Script API
        </div>
      </div>
    </div>
  );
}

const rootStyle = {
  "--bg": "#0d1117",
  "--card": "#161b22",
  "--border": "#21262d",
  "--text": "#e6edf3",
  "--muted": "#7d8590",
  "--accent": "#d2a8ff",
  "--green": "#3fb950",
  "--red": "#f85149",
  "--warn": "#d29922",
  "--blue": "#58a6ff",
  fontFamily: "'JetBrains Mono', 'SF Mono', 'Cascadia Code', monospace",
  background: "var(--bg)",
  color: "var(--text)",
  minHeight: "100vh",
  padding: "20px 16px",
  boxSizing: "border-box",
};
