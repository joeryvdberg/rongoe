import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// ── SUPABASE ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://egdsaevqmnwelliroztr.supabase.co";
const SUPABASE_KEY = "sb_publishable_2xhR-vsq212VM6HWTgy6GQ_3nHZs0-h";
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── DEFAULTS ──────────────────────────────────────────────────────────────────
const DEFAULT_DATES = [
  "2025-04-17","2025-04-24","2025-05-01","2025-05-08",
  "2025-05-15","2025-05-22","2025-05-29","2025-06-05",
  "2025-06-12","2025-06-19","2025-06-26","2025-07-03",
  "2025-07-10","2025-07-17"
];

const DEFAULT_PLAYERS = [
  { id: 1, name: "Speler 1", role: "keeper", sort_order: 0 },
  { id: 2, name: "Speler 2", role: "veld",   sort_order: 1 },
  { id: 3, name: "Speler 3", role: "veld",   sort_order: 2 },
  { id: 4, name: "Speler 4", role: "veld",   sort_order: 3 },
  { id: 5, name: "Speler 5", role: "veld",   sort_order: 4 },
  { id: 6, name: "Speler 6", role: "veld",   sort_order: 5 },
  { id: 7, name: "Speler 7", role: "veld",   sort_order: 6 },
  { id: 8, name: "Speler 8", role: "veld",   sort_order: 7 },
];

const COMPETITION_INFO = {
  sourceUrl: "https://www.powerleague.com/nl/competitie?league_id=997ebdeb-bbf2-d0a4-e814-cfa760326bc5&division_id=997ebdeb-bbf2-d0a4-e814-cfa7c0da8fc5",
  leagueName: "Thursday Late League S38",
  city: "Amsterdam",
  venue: "Sportspark Olympiaplein",
  format: "Men's 5s",
  gameDay: "Donderdag",
  gamePrice: "EUR 57.00 per game",
  updatedLabel: "Scrape op 14-04-2026",
  topTeams: [
    { pos: 1, club: "Los Fuegos", played: 11, won: 8, points: 24 },
    { pos: 2, club: "The Mohicans", played: 10, won: 7, points: 21 },
    { pos: 3, club: "Connaisseurs", played: 11, won: 7, points: 21 },
  ],
  standings: [
    { pos: 1, club: "Los Fuegos", played: 11, won: 8, drawn: 0, lost: 3, gf: 82, ga: 66, gd: 16, points: 24 },
    { pos: 2, club: "The Mohicans", played: 10, won: 7, drawn: 0, lost: 3, gf: 64, ga: 44, gd: 20, points: 21 },
    { pos: 3, club: "Connaisseurs", played: 11, won: 7, drawn: 0, lost: 4, gf: 92, ga: 77, gd: 15, points: 21 },
    { pos: 4, club: "De Hertenjagers Reunited", played: 10, won: 6, drawn: 0, lost: 4, gf: 78, ga: 66, gd: 12, points: 18 },
    { pos: 5, club: "De Meer", played: 11, won: 6, drawn: 0, lost: 5, gf: 61, ga: 57, gd: 4, points: 18 },
    { pos: 6, club: "The Big 5", played: 11, won: 5, drawn: 1, lost: 5, gf: 67, ga: 61, gd: 6, points: 16 },
    { pos: 7, club: "Glory Boyz FC", played: 11, won: 2, drawn: 1, lost: 8, gf: 54, ga: 69, gd: -15, points: 7 },
    { pos: 8, club: "FC Linksbuitenadem", played: 11, won: 1, drawn: 0, lost: 10, gf: 43, ga: 101, gd: -58, points: 3 },
  ],
  nextGames: [
    { date: "16/04/2026", time: "19:00", home: "Glory Boyz FC", away: "De Hertenjagers Reunited" },
    { date: "16/04/2026", time: "19:00", home: "De Meer", away: "FC Linksbuitenadem" },
    { date: "16/04/2026", time: "19:00", home: "The Big 5", away: "Los Fuegos" },
    { date: "16/04/2026", time: "20:00", home: "The Mohicans", away: "Connaisseurs" },
    { date: "23/04/2026", time: "20:00", home: "De Hertenjagers Reunited", away: "De Meer" },
  ],
  lastRoundLabel: "09/04/2026",
  lastRoundResults: [
    { home: "De Hertenjagers Reunited", homeScore: 10, awayScore: 5, away: "The Big 5" },
    { home: "Connaisseurs", homeScore: 14, awayScore: 6, away: "Los Fuegos" },
    { home: "FC Linksbuitenadem", homeScore: 6, awayScore: 10, away: "The Mohicans" },
    { home: "Glory Boyz FC", homeScore: 4, awayScore: 7, away: "De Meer" },
  ],
};
const COMPETITION_START_DATE = "2026-05-07";

// ── HELPERS ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "short", day: "numeric", month: "short"
  });
}

function getThursdayRoundKey(baseDate = new Date()) {
  const d = new Date(baseDate);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun, 4=Thu
  const diffSinceThursday = (day - 4 + 7) % 7;
  d.setDate(d.getDate() - diffSinceThursday);
  return d.toISOString().slice(0, 10);
}

// ── SCHEDULING ────────────────────────────────────────────────────────────────
function buildSchedule(players, availability, matchDates) {
  const field = players.filter(p => p.role === "veld");
  const keeper = players.find(p => p.role === "keeper");
  const MAX_FIELD = 6;
  const plays = {};
  field.forEach(p => { plays[p.id] = 0; });
  const sched = {};

  matchDates.forEach((date, di) => {
    const toPlay = Math.min(MAX_FIELD, field.length);
    const toSkip = field.length - toPlay;
    const wantFree = field.filter(p => availability[p.id]?.[di]);
    let skipped = [];

    if (toSkip > 0) {
      const sortedFree = [...wantFree].sort((a, b) => plays[b.id] - plays[a.id]);
      let i = 0;
      while (skipped.length < toSkip && i < sortedFree.length) skipped.push(sortedFree[i++]);
      if (skipped.length < toSkip) {
        const usedIds = new Set(skipped.map(p => p.id));
        const rest = field.filter(p => !usedIds.has(p.id)).sort((a, b) => plays[b.id] - plays[a.id]);
        let j = 0;
        while (skipped.length < toSkip && j < rest.length) skipped.push(rest[j++]);
      }
    }

    const skippedIds = new Set(skipped.map(p => p.id));
    const playing = field.filter(p => !skippedIds.has(p.id));
    playing.forEach(p => { plays[p.id]++; });
    const keeperOut = keeper ? !!(availability[keeper.id]?.[di]) : false;

    sched[date] = {
      date, di,
      keeper: keeper && !keeperOut ? keeper : null,
      players: playing, skipped,
      honored: skipped.filter(p => wantFree.some(w => w.id === p.id)).length,
      missed: wantFree.filter(p => !skippedIds.has(p.id)).length,
    };
  });
  return sched;
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const G = {
  bg: "#11141c",
  paper: "#1d2432",
  paperSoft: "#243044",
  ink: "#f4efe3",
  line: "#3b475d",
  gold: "#d7ad5b",
  red: "#d45a4a",
  green: "#43b97b",
  blue: "#4f9fe0",
  brown: "#cbb08f",
  orange: "#d98a3b",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Bebas+Neue&family=Source+Sans+3:wght@400;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${G.bg}; color: ${G.ink}; font-family: 'Source Sans 3', sans-serif; }
  input, button { font-family: 'Source Sans 3', sans-serif; }
  .htbg {
    background-color: ${G.bg};
    background-image:
      radial-gradient(1000px 440px at 12% -8%, rgba(79, 159, 224, 0.14), transparent 72%),
      radial-gradient(860px 420px at 88% -2%, rgba(215, 173, 91, 0.12), transparent 68%),
      radial-gradient(760px 360px at 52% 106%, rgba(67, 185, 123, 0.10), transparent 72%),
      radial-gradient(rgba(255,255,255,0.045) 1px, transparent 1px);
    background-size: 100% 100%, 100% 100%, 100% 100%, 18px 18px;
  }
  @keyframes kapow {
    0%   { transform: scale(0) rotate(-15deg); opacity: 0; }
    60%  { transform: scale(1.2) rotate(5deg);  opacity: 1; }
    80%  { transform: scale(0.95) rotate(-2deg); }
    100% { transform: scale(1) rotate(0deg); opacity: 1; }
  }
  @keyframes boing {
    0%   { transform: scale(1); }
    30%  { transform: scale(1.12) rotate(-3deg); }
    60%  { transform: scale(0.95) rotate(2deg); }
    100% { transform: scale(1) rotate(0deg); }
  }
  @keyframes slidein {
    from { transform: translateY(-18px); opacity: 0; }
    to   { transform: translateY(0);     opacity: 1; }
  }
  @keyframes shake {
    0%,100% { transform: translateX(0); }
    20%     { transform: translateX(-8px) rotate(-2deg); }
    40%     { transform: translateX(8px)  rotate(2deg); }
    60%     { transform: translateX(-5px); }
    80%     { transform: translateX(5px); }
  }
  @keyframes popIn {
    0%   { transform: scale(0.5); opacity: 0; }
    70%  { transform: scale(1.1); opacity: 1; }
    100% { transform: scale(1); }
  }
  @keyframes floatUp {
    0%   { transform: translateY(0) scale(1);   opacity: 1; }
    100% { transform: translateY(-60px) scale(1.4); opacity: 0; }
  }
  @keyframes pulse {
    0%,100% { transform: scale(1); }
    50%     { transform: scale(1.06); }
  }
  @keyframes spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  .anim-kapow   { animation: kapow 0.5s cubic-bezier(.36,.07,.19,.97) both; }
  .anim-boing   { animation: boing 0.4s ease both; }
  .anim-slidein { animation: slidein 0.3s ease both; }
  .anim-shake   { animation: shake 0.4s ease both; }
  .anim-popin   { animation: popIn 0.35s cubic-bezier(.36,.07,.19,.97) both; }
  .anim-pulse   { animation: pulse 1.4s ease-in-out infinite; }
  .btn-press:active { transform: translate(2px,2px) scale(0.97); box-shadow: 1px 1px 0 #1a0a00 !important; }
  .card-hover { transition: transform 0.13s, box-shadow 0.13s; }
  .card-hover:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 #1a0a00 !important; }
  .comic-panel-head {
    background-image:
      radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px),
      linear-gradient(135deg, rgba(255,255,255,0.22), rgba(255,255,255,0));
    background-size: 8px 8px, 100% 100%;
  }
  .comic-tile {
    position: relative;
    overflow: hidden;
    border-radius: 14px;
    border: 2px solid #0d1118 !important;
    box-shadow: 0 10px 20px rgba(0,0,0,0.30), 3px 3px 0 #0d1118 !important;
  }
  .comic-tile::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255,255,255,0.18) 1px, transparent 1px);
    background-size: 9px 9px;
    opacity: 0.65;
    pointer-events: none;
  }
  .comic-tile > * { position: relative; z-index: 1; }
  .player-overview {
    display: grid;
    grid-template-columns: minmax(220px, auto) auto;
    align-items: center;
    gap: 16px;
  }
  .player-stats-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(84px, 1fr));
    gap: 10px;
  }
  .admin-tabs {
    display: flex;
    gap: 8px;
    margin-bottom: 18px;
    flex-wrap: wrap;
  }
  .players-admin-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .players-admin-name {
    flex: 1;
    min-width: 160px;
  }
  .players-admin-stats {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: 8px;
  }
  .players-admin-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .home-player-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }
  @media (max-width: 760px) {
    .player-overview {
      grid-template-columns: 1fr;
      gap: 12px;
    }
    .player-stats-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
    }
    .player-stat-card {
      min-height: 82px;
    }
    .admin-tabs > button {
      flex: 1 1 calc(50% - 8px);
      min-width: 0;
      text-align: center;
    }
    .players-admin-row {
      align-items: flex-start;
      gap: 8px;
    }
    .players-admin-name {
      flex-basis: calc(100% - 44px);
      min-width: 0;
      line-height: 1.1;
    }
    .players-admin-stats {
      margin-left: 0;
      width: 100%;
      justify-content: flex-start;
    }
    .players-admin-actions {
      width: 100%;
    }
    .home-player-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .nav-kapow:active {
    animation: boing 0.35s ease both;
  }
  .kapow-wrap {
    position: relative;
    display: inline-block;
    padding: 18px 34px;
    margin: 2px 0 4px;
  }
  .kapow-shape {
    position: absolute;
    inset: 0;
    border: 4px solid #0d1118;
    background:
      radial-gradient(circle at 30% 30%, #f7ff7a 0%, #f0e84a 55%, #dfcf33 100%);
    box-shadow: 0 10px 18px rgba(0,0,0,0.35);
    clip-path: polygon(
      50% 0%, 58% 14%, 73% 4%, 75% 20%, 91% 12%, 84% 31%,
      100% 35%, 87% 47%, 100% 60%, 82% 64%, 88% 82%, 70% 75%,
      63% 96%, 50% 83%, 37% 96%, 30% 75%, 12% 82%, 18% 64%,
      0% 60%, 13% 47%, 0% 35%, 16% 31%, 9% 12%, 25% 20%,
      27% 4%, 42% 14%
    );
    z-index: 0;
  }
  .kapow-text {
    position: relative;
    z-index: 1;
    font-family: 'Bangers', cursive;
    font-size: clamp(64px, 16vw, 112px);
    letter-spacing: 4px;
    line-height: 1;
    color: #ff3b31;
    transform: rotate(-7deg);
    text-shadow:
      -2px -2px 0 #0d1118,
       2px -2px 0 #0d1118,
      -2px  2px 0 #0d1118,
       2px  2px 0 #0d1118,
       4px  6px 0 rgba(0,0,0,0.25);
  }
`;

// ── PRIMITIVES ────────────────────────────────────────────────────────────────
function Card({ children, color, style = {}, className = "" }) {
  return (
    <div className={className} style={{
      background: G.paper, border: "1.5px solid " + G.line, borderRadius: 12,
      boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
      borderLeft: color ? "1.5px solid " + color : undefined, ...style
    }}>
      {children}
    </div>
  );
}

function Panel({ title, color, icon, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        background: color || G.blue, color: "white", padding: "8px 16px",
        borderRadius: "12px 12px 0 0", border: "1.5px solid " + G.line, borderBottom: "none",
        display: "flex", alignItems: "center", gap: 10,
      }} className="comic-panel-head">
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <span style={{ fontFamily: "Bangers, cursive", fontSize: 24, letterSpacing: 1.5 }}>{title}</span>
      </div>
      <div style={{
        background: G.paper, border: "1.5px solid " + G.line, borderTop: "none",
        borderRadius: "0 0 12px 12px", padding: "16px 18px", boxShadow: "0 10px 24px rgba(0,0,0,0.30)",
      }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, bg, outline, small, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} className={disabled ? "" : "btn-press"} style={{
      padding: small ? "6px 12px" : "10px 20px",
      border: "1.5px solid " + G.line, borderRadius: 10,
      background: disabled ? "#ccc" : outline ? G.paper : (bg || G.blue),
      color: outline ? G.ink : disabled ? "#888" : "white",
      fontFamily: "'Bebas Neue', sans-serif", fontSize: small ? 14 : 18, letterSpacing: 1,
      cursor: disabled ? "not-allowed" : "pointer",
      boxShadow: disabled ? "none" : "0 8px 16px rgba(0, 0, 0, 0.28)",
    }}>
      {children}
    </button>
  );
}

function Tag({ children, bg, textColor }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "4px 10px", border: "1.5px solid " + G.line, borderRadius: 999,
      background: bg || G.blue, color: textColor || "white",
      fontFamily: "'Bebas Neue', sans-serif", fontSize: 14, letterSpacing: 0.6,
      boxShadow: "0 5px 14px rgba(0, 0, 0, 0.24)",
    }}>
      {children}
    </span>
  );
}

// ── COMIC POP EFFECT ─────────────────────────────────────────────────────────
function ComicPop({ word, color, style = {} }) {
  const colors = {
    kapow:  { bg: G.red,    rot: "-4deg" },
    pow:    { bg: G.orange, rot: "3deg"  },
    bam:    { bg: G.blue,   rot: "-3deg" },
    yes:    { bg: G.green,  rot: "2deg"  },
    zap:    { bg: "#9b27af", rot: "-5deg" },
  };
  const c = colors[word?.toLowerCase()] || { bg: G.gold, rot: "0deg" };
  const spikes = 12;
  const cx = 60, cy = 60, r1 = 52, r2 = 44;
  const pts = [];
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes;
    const r = i % 2 === 0 ? r1 : r2;
    pts.push(`${cx + r * Math.cos(angle - Math.PI/2)},${cy + r * Math.sin(angle - Math.PI/2)}`);
  }
  return (
    <div className="anim-kapow" style={{ display:"inline-block", position:"relative", ...style }}>
      <svg width="120" height="120" viewBox="0 0 120 120">
        <polygon points={pts.join(" ")} fill={c.bg} stroke={G.ink} strokeWidth="3"/>
      </svg>
      <div style={{
        position:"absolute", top:"50%", left:"50%",
        transform:`translate(-50%,-50%) rotate(${c.rot})`,
        fontFamily:"Bangers, cursive", fontSize: word && word.length > 4 ? 18 : 22,
        letterSpacing: 2, color:"white",
        textShadow:"2px 2px 0 "+G.ink,
        whiteSpace:"nowrap",
      }}>{word?.toUpperCase()}</div>
    </div>
  );
}

// ── FLOATING TEXT ─────────────────────────────────────────────────────────────
function FloatText({ text, color }) {
  return (
    <div style={{
      position:"fixed", top:"40%", left:"50%", transform:"translateX(-50%)",
      fontFamily:"Bangers, cursive", fontSize:48, letterSpacing:4,
      color: color || G.gold, textShadow:"4px 4px 0 "+G.ink,
      animation:"floatUp 1s ease forwards",
      zIndex:9998, pointerEvents:"none", whiteSpace:"nowrap",
    }}>{text}</div>
  );
}

// ── LOADING SCREEN ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: G.bg }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, letterSpacing: 3, marginTop: 16, color: G.ink }}>RONGOE</div>
      <div style={{ fontSize: 14, color: G.brown, marginTop: 8 }}>Laden...</div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("home");
  const [players, setPlayers] = useState([]);
  const [matchDates, setMatchDates] = useState(DEFAULT_DATES);
  const [avail, setAvail] = useState({});
  const [sched, setSched] = useState(null);
  const [activePlayer, setActivePlayer] = useState(null);
  const [swapReq, setSwapReq] = useState(null);
  const [swapOffers, setSwapOffers] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const [toast, setToast] = useState(null);
  const [adminTab, setAdminTab] = useState("schedule");
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminPwInput, setAdminPwInput] = useState("");
  const [adminPwError, setAdminPwError] = useState(false);
  const [floatText, setFloatText] = useState(null);
  const [playerStats, setPlayerStats] = useState({});
  const [comicBursts, setComicBursts] = useState([]);
  const [competitionData, setCompetitionData] = useState(COMPETITION_INFO);
  const [competitionTestMode, setCompetitionTestMode] = useState(false);
  const [motmVotes, setMotmVotes] = useState(() => {
    try {
      const raw = localStorage.getItem("motmVotesByRound");
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  function showFloat(text, color) {
    setFloatText({ text, color });
    setTimeout(() => setFloatText(null), 1000);
  }

  function handlePlayerTileClick(player) {
    if ((player?.name || "").trim().toLowerCase() === "jurre") {
      showFloat("67!", G.gold);
    }
  }

  function refreshCompetitionData() {
    const refreshedAt = new Date().toLocaleString("nl-NL");
    setCompetitionData({
      ...COMPETITION_INFO,
      updatedLabel: "Handmatig ververst op " + refreshedAt,
    });
    notify("Competitiedata ververst!");
  }

  function castMotmVote(voterId, targetId) {
    if (!voterId || !targetId || voterId === targetId) return;
    const roundKey = getThursdayRoundKey();
    setMotmVotes(prev => ({
      ...prev,
      [roundKey]: {
        ...(prev[roundKey] || {}),
        [voterId]: targetId,
      },
    }));
    notify("MOTM stem opgeslagen!");
  }

  const competitionUnlocked = new Date() >= new Date(COMPETITION_START_DATE + "T00:00:00") || (adminUnlocked && competitionTestMode);
  const motmRoundKey = getThursdayRoundKey();
  const motmVotesForRound = motmVotes[motmRoundKey] || {};
  const motmCountMap = Object.values(motmVotesForRound).reduce((acc, targetId) => {
    acc[targetId] = (acc[targetId] || 0) + 1;
    return acc;
  }, {});
  const motmWinnerId = Object.keys(motmCountMap).sort((a, b) => motmCountMap[b] - motmCountMap[a])[0];
  const motmWinner = players.find(p => String(p.id) === String(motmWinnerId)) || null;

  function toggleCompetitionTestMode() {
    setCompetitionTestMode(prev => !prev);
  }

  useEffect(() => {
    try {
      localStorage.setItem("motmVotesByRound", JSON.stringify(motmVotes));
    } catch {
      // Ignore write errors in private mode/storage-blocked contexts.
    }
  }, [motmVotes]);

  function showComicBurst(words = ["BAM"]) {
    const burstId = Date.now() + Math.random();
    const normalized = words.filter(Boolean).slice(0, 3);
    const items = normalized.map((word, idx) => ({
      word,
      x: 18 + Math.random() * 64,
      y: 18 + Math.random() * 58,
      offset: idx * 110,
      scale: 0.82 + Math.random() * 0.36,
    }));
    setComicBursts(prev => [...prev, { id: burstId, items }]);
    setTimeout(() => {
      setComicBursts(prev => prev.filter(b => b.id !== burstId));
    }, 1200);
  }

  const ADMIN_PASSWORD = "gloryboyz";

  // ── LOAD ALL DATA FROM SUPABASE ──────────────────────────────────────────────
  useEffect(() => {
    async function loadAll() {
      try {
        // Load players
        const { data: pData } = await db.from("players").select("*").order("sort_order");
        if (pData && pData.length > 0) {
          setPlayers(pData);
        } else {
          // First run: seed default players
          await db.from("players").insert(DEFAULT_PLAYERS);
          setPlayers(DEFAULT_PLAYERS);
        }

        // Load match dates
        const { data: dData } = await db.from("match_dates").select("*").order("sort_order");
        if (dData && dData.length > 0) {
          setMatchDates(dData.map(d => d.date));
        } else {
          // Seed default dates
          const rows = DEFAULT_DATES.map((date, i) => ({ date, sort_order: i }));
          await db.from("match_dates").insert(rows);
          setMatchDates(DEFAULT_DATES);
        }

        // Load availability
        const { data: aData } = await db.from("availability").select("*");
        if (aData && aData.length > 0) {
          const availObj = {};
          aData.forEach(row => {
            if (!availObj[row.player_id]) availObj[row.player_id] = {};
            availObj[row.player_id][row.date_index] = row.is_free;
          });
          setAvail(availObj);
        }

        // Load schedule
        const { data: sData } = await db.from("schedule").select("*");
        if (sData && sData.length > 0) {
          const schedObj = {};
          sData.forEach(row => { schedObj[row.date] = row.data; });
          setSched(schedObj);
        }

        // Load player stats (shared cross-device via Supabase)
        const { data: psData, error: psErr } = await db.from("player_stats").select("*");
        if (!psErr && psData) {
          const statsObj = {};
          psData.forEach(row => {
            statsObj[row.player_id] = {
              goals: row.goals || 0,
              assists: row.assists || 0,
            };
          });
          setPlayerStats(statsObj);
        }
      } catch (e) {
        console.error("Load error:", e);
      }
      setLoading(false);
    }
    loadAll();
  }, []);

  function notify(msg, err) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  }

  function tryAdminLogin() {
    if (adminPwInput === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setAdminPwError(false);
      setAdminPwInput("");
      setView("admin");
    } else {
      setAdminPwError(true);
      setTimeout(() => setAdminPwError(false), 1500);
      setAdminPwInput("");
    }
  }

  function handleNavClick(id) {
    if (id === "admin" && !adminUnlocked) {
      setView("adminlogin");
    } else {
      setView(id);
    }
  }

  // ── TOGGLE AVAILABILITY ──────────────────────────────────────────────────────
  async function toggleAvail(pid, di) {
    const newVal = !avail[pid]?.[di];
    setAvail(prev => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), [di]: newVal }
    }));
    await db.from("availability").upsert({ player_id: pid, date_index: di, is_free: newVal });
  }

  // ── GENERATE & SAVE SCHEDULE ─────────────────────────────────────────────────
  async function genSchedule() {
    const newSched = buildSchedule(players, avail, matchDates);
    setSched(newSched);
    const rows = Object.entries(newSched).map(([date, data]) => ({ date, data }));
    await db.from("schedule").delete().neq("date", "____");
    await db.from("schedule").insert(rows);
    showFloat("KAPOW!", G.red);
    showComicBurst(["RONGOE", "BAM"]);
    notify("RONGOE! Rooster gemaakt!");
  }

  // ── SAVE PLAYER NAME ─────────────────────────────────────────────────────────
  async function savePlayerName(id, name) {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name } : p));
    if (activePlayer?.id === id) setActivePlayer(prev => ({ ...prev, name }));
    await db.from("players").update({ name }).eq("id", id);
  }

  async function updatePlayerStats(id, goals, assists) {
    const prevGoals = playerStats[id]?.goals || 0;
    const prevAssists = playerStats[id]?.assists || 0;
    const g = Math.max(0, Number(goals) || 0);
    const a = Math.max(0, Number(assists) || 0);
    setPlayerStats(prev => ({ ...prev, [id]: { goals: g, assists: a } }));
    if (g > prevGoals) {
      showFloat("SIUUUUU!!", G.gold);
      showComicBurst(["BAM", "POW"]);
    }
    if (a > prevAssists) {
      showFloat("ASSIST!", G.blue);
      showComicBurst(["ZAP"]);
    }
    await db.from("player_stats").upsert({ player_id: id, goals: g, assists: a });
  }

  // ── ADD PLAYER ───────────────────────────────────────────────────────────────
  async function addPlayer(name, role) {
    const newId = Date.now();
    const newPlayer = { id: newId, name, role, sort_order: players.length };
    setPlayers(prev => [...prev, newPlayer]);
    await db.from("players").insert(newPlayer);
    await db.from("player_stats").upsert({ player_id: newId, goals: 0, assists: 0 });
    showComicBurst(["BAM"]);
  }

  // ── REMOVE PLAYER ────────────────────────────────────────────────────────────
  async function removePlayer(id) {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setAvail(prev => { const n = { ...prev }; delete n[id]; return n; });
    setPlayerStats(prev => { const n = { ...prev }; delete n[id]; return n; });
    await db.from("players").delete().eq("id", id);
    await db.from("availability").delete().eq("player_id", id);
    await db.from("player_stats").delete().eq("player_id", id);
    showComicBurst(["POW"]);
  }

  // ── SAVE MATCH DATES ─────────────────────────────────────────────────────────
  async function saveMatchDates(dates) {
    setMatchDates(dates);
    await db.from("match_dates").delete().neq("date", "____");
    const rows = dates.map((date, i) => ({ date, sort_order: i }));
    await db.from("match_dates").insert(rows);
  }

  // ── SWAP LOGIC ───────────────────────────────────────────────────────────────
  function startSwap(pid, di) { setSwapReq(pid ? { pid, di } : null); }

  function sendSwap(toPid, di) {
    if (!swapReq) return;
    if (toPid === swapReq.pid) { notify("Niet met jezelf!", true); return; }
    setSwapOffers(prev => [...prev, { fromId: swapReq.pid, toId: toPid, di }]);
    setSwapReq(null);
    notify("Ruilverzoek verstuurd!");
  }

  async function acceptSwap(offer) {
    if (!sched) return;
    const date = matchDates[offer.di];
    const fp = players.find(p => p.id === offer.fromId);
    const tp = players.find(p => p.id === offer.toId);
    if (!fp || !tp) return;

    const newSched = { ...sched };
    const e = { ...newSched[date], players: [...newSched[date].players], skipped: [...(newSched[date].skipped || [])] };
    if (e.players.some(p => p.id === fp.id)) {
      e.players = e.players.map(p => p.id === fp.id ? tp : p);
      e.skipped = e.skipped.map(p => p.id === tp.id ? fp : p);
      if (!e.skipped.some(p => p.id === fp.id)) e.skipped.push(fp);
    } else {
      e.players = e.players.map(p => p.id === tp.id ? fp : p);
      e.skipped = e.skipped.map(p => p.id === fp.id ? tp : p);
    }
    newSched[date] = e;
    setSched(newSched);
    setSwapOffers(prev => prev.filter(o => o !== offer));
    showFloat("POW!", G.orange);
    showComicBurst(["SWAP", "ZAP"]);
    notify(fp.name + " en " + tp.name + " geruild!");

    // Save updated schedule entry
    await db.from("schedule").upsert({ date, data: e });
  }

  function declineSwap(offer) {
    setSwapOffers(prev => prev.filter(o => o !== offer));
    notify("Ruilverzoek afgewezen.", true);
  }

  function mySchedule(pid) {
    if (!sched) return [];
    return matchDates.map((date, i) => {
      const e = sched[date];
      const playing = e && (e.keeper?.id === pid || e.players?.some(p => p.id === pid));
      return { date, di: i, playing, entry: e };
    });
  }

  const myOffers = activePlayer ? swapOffers.filter(o => o.toId === activePlayer.id) : [];

  const navItems = [
    { id: "home",   label: "SPELERS", icon: "" },
    { id: "roster", label: "ROOSTER", icon: "" },
    { id: "competition", label: "COMPETITIE", icon: "" },
  ];

  if (loading) return <><style>{css}</style><LoadingScreen /></>;

  return (
    <>
      <style>{css}</style>
      <div className="htbg" style={{ minHeight: "100vh" }}>
        {floatText && <FloatText text={floatText.text} color={floatText.color} />}
        {comicBursts.map(burst => (
          <div key={burst.id} style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9996 }}>
            {burst.items.map((item, idx) => (
              <ComicPop
                key={item.word + idx}
                word={item.word}
                style={{
                  position: "absolute",
                  left: item.x + "%",
                  top: item.y + "%",
                  transform: "translate(-50%, -50%) scale(" + item.scale + ")",
                  animationDelay: item.offset + "ms",
                }}
              />
            ))}
          </div>
        ))}
        {toast && (
          <div className="anim-kapow" style={{
            position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
            background: toast.err ? G.red : G.gold, color: G.ink,
            padding: "10px 28px", border: "3px solid " + G.ink, borderRadius: 10,
            fontFamily: "Bangers, cursive", fontSize: 20, letterSpacing: 2,
            boxShadow: "0 10px 24px rgba(0,0,0,0.35)", zIndex: 9999, whiteSpace: "nowrap",
          }}>{toast.msg}</div>
        )}

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 14px 100px" }}>
          {/* HEADER */}
          <header style={{ textAlign: "center", padding: "28px 0 18px" }}>
            <div style={{ display: "inline-flex", flexDirection:"column", alignItems: "center", gap: 6, position: "relative" }}>
              <div style={{
                fontFamily:"Bangers, cursive",
                fontSize:28,
                letterSpacing:2,
                color:"#f5d48e",
                textTransform:"uppercase",
                textShadow:"-1px -1px 0 #0d1118, 1px -1px 0 #0d1118, -1px 1px 0 #0d1118, 1px 1px 0 #0d1118",
                lineHeight:1
              }}>GLORYBOYZ FC</div>
              <div className="kapow-wrap anim-popin">
                <span className="kapow-shape" />
                <span className="kapow-text">RONGOE!</span>
              </div>
              <div style={{
                fontFamily:"'Bebas Neue', sans-serif",
                fontSize:22,
                letterSpacing:4,
                color:"#ffe9bf",
                textTransform:"uppercase",
                textShadow:"0 2px 8px rgba(0,0,0,0.45)",
                lineHeight:1
              }}>SPEELROOSTER APP</div>
            </div>
          </header>

          {/* NAV */}
          <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:24 }}>
            <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
            {navItems.map(n => {
              const isAdminBtn = n.id === "admin";
              const isActive = view === n.id || (n.id === "admin" && view === "adminlogin");
              return (
                <button key={n.id} onClick={() => handleNavClick(n.id)} style={{
                  fontFamily:"Bangers, cursive", fontSize:27, letterSpacing:1.1,
                  padding:"9px 20px", borderRadius:10,
                  border:"2px solid "+(isAdminBtn && !adminUnlocked ? "#999" : G.ink),
                  background: isActive ? G.gold : G.paperSoft,
                  boxShadow: isActive ? "0 4px 12px rgba(37, 23, 15, 0.22)" : "0 3px 9px rgba(37, 23, 15, 0.14)",
                  cursor:"pointer", opacity: isAdminBtn && !adminUnlocked ? 0.75 : 1,
                  display:"flex", alignItems:"center", gap:6,
                  color: isActive ? "#121722" : "#f2f5ff",
                }} className="nav-kapow">
                  {isAdminBtn && !adminUnlocked && <span>●</span>}
                  <span>{n.label}</span>
                </button>
              );
            })}
            {activePlayer && (
              <button onClick={() => setView("player")} style={{
                fontFamily:"Bangers, cursive", fontSize:27, letterSpacing:1.1,
                padding:"9px 20px", borderRadius:10, border:"2px solid "+G.green,
                background: view==="player" ? "rgba(63,218,139,0.25)" : G.paperSoft,
                boxShadow:"0 4px 12px rgba(49, 92, 68, 0.24)", cursor:"pointer",
                display:"flex", alignItems:"center", gap:6,
                color:"#f2f5ff",
              }} className="nav-kapow">
                <span style={{ maxWidth:90, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
                  {activePlayer.name.toUpperCase()}
                </span>
              </button>
            )}
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end" }}>
              <button
                onClick={() => handleNavClick("admin")}
                style={{
                  background:"transparent",
                  border:"none",
                  padding:0,
                  fontSize:11,
                  color:"#6c7b96",
                  textDecoration:"underline",
                  cursor:"pointer",
                  opacity:0.7,
                }}
              >
                admin
              </button>
            </div>
          </div>

          {/* VIEWS */}
          {view === "home" && (
            <HomeView
              players={players} setView={setView} setActivePlayer={setActivePlayer}
              avail={avail} sched={sched} matchDates={matchDates} playerStats={playerStats}
              onPlayerTileClick={handlePlayerTileClick}
              competitionData={competitionData}
              motmRoundKey={motmRoundKey}
              motmVotesForRound={motmVotesForRound}
              motmWinner={motmWinner}
              motmWinnerVotes={motmWinnerId ? motmCountMap[motmWinnerId] : 0}
              onCastMotmVote={castMotmVote}
            />
          )}
          {view === "roster" && (
            <RosterView players={players} sched={sched} avail={avail} matchDates={matchDates} />
          )}
          {view === "competition" && (
            <CompetitionView
              competitionData={competitionData}
              competitionUnlocked={competitionUnlocked}
              competitionStartDate={COMPETITION_START_DATE}
              refreshCompetitionData={refreshCompetitionData}
              adminUnlocked={adminUnlocked}
              competitionTestMode={competitionTestMode}
              toggleCompetitionTestMode={toggleCompetitionTestMode}
            />
          )}
          {view === "adminlogin" && (
            <AdminLogin adminPwInput={adminPwInput} setAdminPwInput={setAdminPwInput} adminPwError={adminPwError} tryAdminLogin={tryAdminLogin} />
          )}
          {view === "admin" && (
            <AdminView
              players={players} sched={sched} avail={avail} matchDates={matchDates}
              toggleAvail={toggleAvail} genSchedule={genSchedule}
              adminTab={adminTab} setAdminTab={setAdminTab}
              saveMatchDates={saveMatchDates}
              addPlayer={addPlayer} removePlayer={removePlayer} savePlayerName={savePlayerName}
              playerStats={playerStats} updatePlayerStats={updatePlayerStats}
            />
          )}
          {view === "player" && activePlayer && (
            <PlayerView
              player={activePlayer} players={players} sched={sched} avail={avail}
              matchDates={matchDates} toggleAvail={toggleAvail} mySchedule={mySchedule}
              swapReq={swapReq} startSwap={startSwap} sendSwap={sendSwap}
              myOffers={myOffers} acceptSwap={acceptSwap} declineSwap={declineSwap}
              playerStats={playerStats}
              competitionData={competitionData}
              competitionUnlocked={competitionUnlocked}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ── HOME VIEW ─────────────────────────────────────────────────────────────────
function HomeView({ players, setView, setActivePlayer, avail, sched, matchDates, playerStats, onPlayerTileClick, competitionData, motmRoundKey, motmVotesForRound, motmWinner, motmWinnerVotes, onCastMotmVote }) {
  const [motmPickerFor, setMotmPickerFor] = useState(null);
  const comicTileGradients = [
    "linear-gradient(160deg, #57b8ff, #318fdb)",
    "linear-gradient(160deg, #ffb347, #f48a1f)",
    "linear-gradient(160deg, #7a6bff, #5646e8)",
    "linear-gradient(160deg, #ff7a6b, #e55143)",
    "linear-gradient(160deg, #4edb9a, #2faa76)",
    "linear-gradient(160deg, #f06de0, #cb4fbc)",
  ];
  const topGoalsPlayer = [...players].sort((a, b) => (playerStats[b.id]?.goals || 0) - (playerStats[a.id]?.goals || 0))[0];
  const topAssistsPlayer = [...players].sort((a, b) => (playerStats[b.id]?.assists || 0) - (playerStats[a.id]?.assists || 0))[0];
  const topGoals = [...players]
    .map(p => ({ ...p, value: playerStats[p.id]?.goals || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  const topAssists = [...players]
    .map(p => ({ ...p, value: playerStats[p.id]?.assists || 0 }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 3);
  const nextClubMatch = competitionData?.nextGames?.find(
    m => m.home === "Glory Boyz FC" || m.away === "Glory Boyz FC"
  );
  const nextOpponent = nextClubMatch
    ? (nextClubMatch.home === "Glory Boyz FC" ? nextClubMatch.away : nextClubMatch.home)
    : null;

  return (
    <div>
      {nextClubMatch && (
        <Panel title="AANKOMENDE WEDSTRIJD" color={G.green} icon="📅">
          <Card style={{ padding:"12px 14px", background:G.paperSoft, boxShadow:"none" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:10, flexWrap:"wrap" }}>
              <div style={{ fontFamily:"Bangers, cursive", fontSize:24, letterSpacing:0.8 }}>
                Glory Boyz FC <span style={{ fontWeight:700 }}>VS</span> {nextOpponent}
              </div>
              <Tag bg={G.green}>{nextClubMatch.date} {nextClubMatch.time}</Tag>
            </div>
          </Card>
        </Panel>
      )}
      <Panel title="WIE BEN JIJ?" color={G.blue} icon="👤">
        <div className="home-player-grid">
          {players.map((p, i) => {
            const tileBg = comicTileGradients[i % comicTileGradients.length];
            return (
            <div key={p.id} style={{ position:"relative" }}>
              <button onClick={() => { onPlayerTileClick?.(p); setMotmPickerFor(p.id); }} className="card-hover btn-press anim-slidein comic-tile" style={{ animationDelay:(i*0.06)+"s",
                background: tileBg, border:"2px solid #0d1118", borderRadius:14,
                boxShadow:"0 10px 20px rgba(0,0,0,0.30), 3px 3px 0 #0d1118", padding:"12px 8px", cursor:"pointer",
                display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:6,
                aspectRatio:"1 / 1",
              }}>
                <span style={{
                  display:"inline-flex", alignItems:"center", justifyContent:"center",
                  minWidth:62, height:30, padding:"0 9px",
                  border:"2px solid #0d1118", borderRadius:999,
                  background:"rgba(255,255,255,0.35)",
                  fontFamily:"Bangers, cursive", fontSize:15, letterSpacing:0.6, color:"#0d1118",
                  boxShadow:"2px 2px 0 #0d1118"
                }}>{p.role === "keeper" ? "KEEPER" : "VELD"}</span>
                <span style={{
                  fontFamily:"Bangers, cursive", fontSize:29, letterSpacing:0.6, lineHeight:1,
                  textAlign:"center", color:"#f9fbff", textShadow:"0 2px 6px rgba(0,0,0,0.35)"
                }}>{p.name}</span>
              </button>
            </div>
            );
          })}
        </div>
      </Panel>

      {motmPickerFor && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", zIndex:9999, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <Card style={{ width:"min(520px, 100%)", padding:"14px 16px", background:G.paper }}>
            <div style={{ fontFamily:"Bangers, cursive", fontSize:24, letterSpacing:1, marginBottom:10 }}>MAN OF THE MATCH STEMMEN</div>
            <p style={{ fontSize:13, color:"#c8d5ea", marginBottom:10 }}>
              Wie was de man of the match voor speler{" "}
              <strong>{players.find(p => p.id === motmPickerFor)?.name}</strong>?
            </p>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(160px, 1fr))", gap:8 }}>
              {players.filter(p => p.id !== motmPickerFor).map(candidate => (
                <button
                  key={candidate.id}
                  onClick={() => {
                    onCastMotmVote(motmPickerFor, candidate.id);
                    setMotmPickerFor(null);
                  }}
                  style={{
                    border:"1.5px solid "+G.line,
                    borderRadius:8,
                    background:G.paperSoft,
                    color:G.ink,
                    padding:"8px 10px",
                    cursor:"pointer",
                    textAlign:"left",
                  }}
                >
                  {candidate.name}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:8, marginTop:12, flexWrap:"wrap" }}>
              <Btn
                small
                bg={G.blue}
                onClick={() => {
                  const selected = players.find(p => p.id === motmPickerFor);
                  setMotmPickerFor(null);
                  if (selected) {
                    setActivePlayer(selected);
                    setView("player");
                  }
                }}
              >
                NAAR PROFIEL
              </Btn>
              <Btn small outline onClick={() => setMotmPickerFor(null)}>SLUITEN</Btn>
            </div>
          </Card>
        </div>
      )}

      <Panel title="BESCHIKBAARHEID" color={G.red} icon="🗓️">
        <Card style={{ padding:"12px 14px", background:G.paperSoft, boxShadow:"none" }}>
          <p style={{ fontSize:13, lineHeight:1.7 }}>
            Selecteer jouw profiel hierboven om je <strong>vrije-dag voorkeuren</strong> in te geven.
            De admin verwerkt dit in het rooster.
            {sched ? " ✅ Er is al een rooster!" : " ⏳ Nog geen rooster."}
          </p>
        </Card>
      </Panel>

      <Panel title="TOPSTATS" color={G.orange} icon="🏆">
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))", gap:10 }}>
          <Card color={G.blue} style={{ padding:"12px 14px", background:"linear-gradient(160deg, rgba(79,159,224,0.22), rgba(79,159,224,0.08))" }}>
            <div style={{ fontSize:11, letterSpacing:1.2, textTransform:"uppercase", color:"#cfe8ff", fontWeight:800 }}>Topscorer</div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:8 }}>
              {topGoals.map((p, idx) => (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(0,0,0,0.14)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:8, padding:"6px 8px" }}>
                  <span style={{ fontFamily:"Bangers, cursive", fontSize:20, lineHeight:1 }}><span style={{ color:"#9ec9f7", marginRight:6 }}>#{idx+1}</span>{p.name}</span>
                  <span style={{ fontWeight:800, color:"#d9ecff" }}>{p.value}</span>
                </div>
              ))}
              {topGoals.length === 0 && <div style={{ marginTop:4, fontWeight:700, color:"#9ec9f7" }}>Nog geen data</div>}
            </div>
          </Card>
          <Card color={G.gold} style={{ padding:"12px 14px", background:"linear-gradient(160deg, rgba(215,173,91,0.24), rgba(215,173,91,0.10))" }}>
            <div style={{ fontSize:11, letterSpacing:1.2, textTransform:"uppercase", color:"#ffe8b8", fontWeight:800 }}>Assistkoning</div>
            <div style={{ display:"flex", flexDirection:"column", gap:4, marginTop:8 }}>
              {topAssists.map((p, idx) => (
                <div key={p.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(0,0,0,0.14)", border:"1px solid rgba(255,255,255,0.18)", borderRadius:8, padding:"6px 8px" }}>
                  <span style={{ fontFamily:"Bangers, cursive", fontSize:20, lineHeight:1 }}><span style={{ color:"#ffe1a0", marginRight:6 }}>#{idx+1}</span>{p.name}</span>
                  <span style={{ fontWeight:800, color:"#fff3d5" }}>{p.value}</span>
                </div>
              ))}
              {topAssists.length === 0 && <div style={{ marginTop:4, fontWeight:700, color:"#ffe1a0" }}>Nog geen data</div>}
            </div>
          </Card>
        </div>
      </Panel>
      <div style={{ marginTop:8, opacity:0.78 }}>
        <Card style={{ padding:"8px 10px", background:"rgba(255,255,255,0.04)", boxShadow:"none" }}>
          <div style={{ fontSize:12, color:"#b7c6de" }}>
            <strong>Man of the Match</strong> ({fmtDate(motmRoundKey)}):{" "}
            {motmWinner ? `${motmWinner.name} (${motmWinnerVotes} stem${motmWinnerVotes === 1 ? "" : "men"})` : "nog geen stemmen"}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── ROSTER VIEW ───────────────────────────────────────────────────────────────
function RosterView({ players, sched, avail, matchDates }) {
  const [openDate, setOpenDate] = useState(null);
  const today = new Date();
  const fieldPlayers = players.filter(p => p.role === "veld");

  if (!sched || Object.keys(sched).length === 0) return (
    <div style={{ textAlign:"center", padding:"60px 0" }}>
      <div style={{ fontFamily:"Bangers, cursive", fontSize:28, letterSpacing:3, marginTop:12, color:G.brown }}>NOG GEEN ROOSTER!</div>
      <div style={{ fontSize:14, marginTop:6 }}>De admin moet eerst een rooster genereren.</div>
    </div>
  );

  return (
    <div>
      <Panel title="WIE SPEELT WANNEER?" color={G.green} icon="📋">
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {matchDates.map((date, i) => {
            const entry = sched[date];
            if (!entry) return null;
            const isOpen = openDate === date;
            const isPast = new Date(date+"T00:00:00") < today;
            const present = [entry.keeper,...(entry.players||[])].filter(Boolean);

            return (
              <button key={date} onClick={() => setOpenDate(isOpen ? null : date)} style={{
                width:"100%", textAlign:"left", cursor:"pointer",
                background: isOpen ? "rgba(255,154,61,0.14)" : G.paperSoft,
                border:"3px solid "+(isOpen ? G.orange : G.ink),
                borderRadius:10, boxShadow:"4px 4px 0 "+(isOpen ? G.orange : G.ink),
                padding:"12px 14px", opacity: isPast ? 0.65 : 1, color: G.ink,
              }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <div style={{
                      width:38, height:38, borderRadius:8, flexShrink:0,
                      background: isOpen ? G.gold : G.blue, border:"2.5px solid "+G.ink,
                      boxShadow:"2px 2px 0 "+G.ink, display:"flex", alignItems:"center", justifyContent:"center",
                      fontFamily:"Bangers, cursive", fontSize:20, color: isOpen ? G.ink : "white",
                    }}>{i+1}</div>
                    <div>
                      <div style={{ fontFamily:"Bangers, cursive", fontSize:18, letterSpacing:1 }}>{fmtDate(date)}</div>
                      <div style={{ fontSize:12, color:"#c6d7ef", marginTop:1, fontWeight:600 }}>{present.length} aanwezig · {entry.skipped?.length||0} skippen</div>
                    </div>
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ display:"flex", gap:3 }}>
                      {fieldPlayers.map(p => (
                        <div key={p.id} title={p.name} style={{
                          width:9, height:9, borderRadius:"50%",
                          background: entry.players?.some(fp => fp.id===p.id) ? G.green : "#ddd",
                          border:"1.5px solid #999",
                        }}/>
                      ))}
                    </div>
                    <span style={{ fontFamily:"Bangers, cursive", fontSize:16, color:"#dbe7fa" }}>{isOpen?"▲":"▼"}</span>
                  </div>
                </div>
                {isOpen && (
                  <div style={{ marginTop:14, paddingTop:12, borderTop:"2px dashed "+G.line }}>
                    <div style={{ marginBottom:10 }}>
                      <div style={{ fontFamily:"Bangers, cursive", fontSize:15, letterSpacing:1, color:G.green, marginBottom:7 }}>✓ AANWEZIG</div>
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {entry.keeper && <Tag bg={G.orange}>🧤 {entry.keeper.name}</Tag>}
                        {entry.players?.map(p => <Tag key={p.id} bg={G.green}>⚽ {p.name}</Tag>)}
                      </div>
                    </div>
                    {entry.skipped?.length > 0 && (
                      <div>
                        <div style={{ fontFamily:"Bangers, cursive", fontSize:15, letterSpacing:1, color:"#c7d5eb", marginBottom:7 }}>— SKIPT</div>
                        <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                          {entry.skipped.map(p => {
                            const had = avail[p.id]?.[i];
                            return <Tag key={p.id} bg={had?G.brown:"#aaa"}>{p.name}{had?" ⭐":""}</Tag>;
                          })}
                        </div>
                        <div style={{ fontSize:11, color:"#b7c6de", marginTop:6, fontStyle:"italic" }}>⭐ had voorkeur vrij · geen ster = aan de beurt</div>
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      <Panel title="AANWEZIGHEID OVERZICHT" color={G.brown} icon="📊">
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {players.map(p => {
            const pc = matchDates.filter(date => {
              const e = sched[date];
              return e && (e.keeper?.id===p.id || e.players?.some(fp => fp.id===p.id));
            }).length;
            const sc = matchDates.length - pc;
            const pct = Math.round((pc/matchDates.length)*100);
            return (
              <Card key={p.id} style={{ padding:"10px 14px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:16 }}>{p.role==="keeper"?"🧤":"⚽"}</span>
                    <span style={{ fontFamily:"Bangers, cursive", fontSize:17, letterSpacing:1 }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700 }}>
                    <span style={{ color:G.green }}>{pc}×</span>
                    <span style={{ color:"#6f7a90" }}> / </span>
                    <span style={{ color:G.red }}>{sc}× skipt</span>
                  </div>
                </div>
                <div style={{ height:8, background:"#0f141f", borderRadius:4, border:"1.5px solid "+G.line, overflow:"hidden" }}>
                  <div style={{ height:"100%", width:pct+"%", background:G.green, borderRadius:4 }}/>
                </div>
              </Card>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ── COMPETITION VIEW ──────────────────────────────────────────────────────────
function CompetitionView({ competitionData, competitionUnlocked, competitionStartDate, refreshCompetitionData, adminUnlocked, competitionTestMode, toggleCompetitionTestMode }) {
  const gb = competitionData.standings.find(t => t.club === "Glory Boyz FC");
  const unlockDate = new Date(competitionStartDate + "T00:00:00").toLocaleDateString("nl-NL", { day: "2-digit", month: "2-digit", year: "numeric" });
  const msLeft = new Date(competitionStartDate + "T00:00:00") - new Date();
  const daysLeft = Math.max(0, Math.ceil(msLeft / (1000 * 60 * 60 * 24)));
  const baseUnlocked = new Date() >= new Date(competitionStartDate + "T00:00:00");
  const usingTestMode = competitionUnlocked && !baseUnlocked && adminUnlocked && competitionTestMode;
  return (
    <div>
      <Panel title="COMPETITIE INFO" color={G.blue} icon="🏆">
        <Card style={{ padding: "12px 14px", background: G.paperSoft, boxShadow: "none" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 10 }}>
            <Tag bg={competitionUnlocked ? G.green : G.orange}>
              {competitionUnlocked ? (usingTestMode ? "ADMIN TESTMODE" : "ACTIEF") : "BESCHIKBAAR VANAF " + unlockDate}
            </Tag>
            <Btn small bg={G.blue} onClick={refreshCompetitionData} disabled={!competitionUnlocked}>
              🔄 VERVERS COMPETITIEDATA
            </Btn>
            <label style={{ fontSize: 11, color: adminUnlocked ? "#b7c6de" : "#8d9bb3", display: "flex", alignItems: "center", gap: 4 }}>
              <input
                type="checkbox"
                checked={competitionTestMode}
                onChange={toggleCompetitionTestMode}
                disabled={!adminUnlocked}
                style={{ accentColor: G.gold }}
              />
              Admin testmode
            </label>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
            <div><strong>League:</strong> {competitionData.leagueName}</div>
            <div><strong>Locatie:</strong> {competitionData.city}</div>
            <div><strong>Veld:</strong> {competitionData.venue}</div>
            <div><strong>Format:</strong> {competitionData.format}</div>
            <div><strong>Speeldag:</strong> {competitionData.gameDay}</div>
            <div><strong>Kosten:</strong> {competitionData.gamePrice}</div>
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "#b7c6de" }}>
            {competitionData.updatedLabel} · bron: <a href={competitionData.sourceUrl} target="_blank" rel="noreferrer" style={{ color: "#9ec9f7" }}>Powerleague</a>
          </div>
          {!competitionUnlocked && (
            <div style={{ marginTop: 10, fontSize: 13, color: "#ffe0ab", fontWeight: 700 }}>
              Competitiedata gaat live over {daysLeft} dag(en). Tot die tijd houden we deze tab in pre-season modus.
            </div>
          )}
          {!adminUnlocked && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#9fb2ce" }}>
              Log eerst in via de `ADMIN` tab om testmode te activeren.
            </div>
          )}
          {usingTestMode && (
            <div style={{ marginTop: 8, fontSize: 12, color: "#ffe0ab" }}>
              Admin testmode actief — competitiedata is alvast zichtbaar voor jou, maar nog niet geldig voor het echte seizoen.
            </div>
          )}
        </Card>
      </Panel>

      {!competitionUnlocked && (
        <Panel title="PRE-SEASON" color={G.orange} icon="⏳">
          <Card style={{ padding: "12px 14px", background: "rgba(217,138,59,0.12)" }}>
            <p style={{ lineHeight: 1.6 }}>
              Deze competitie-sectie wordt automatisch actief vanaf <strong>{unlockDate}</strong>.
              Daarna kun je met de knop bovenaan de data verversen.
            </p>
          </Card>
        </Panel>
      )}

      {competitionUnlocked && <Panel title="GLORY BOYZ STATUS" color={G.orange} icon="⚽">
        <Card style={{ padding: "12px 14px", background: "linear-gradient(160deg, rgba(79,159,224,0.20), rgba(215,173,91,0.10))" }}>
          {gb ? (
            <>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
                <Tag bg={G.blue}>Positie #{gb.pos}</Tag>
                <Tag bg={G.green}>Punten {gb.points}</Tag>
                <Tag bg={G.orange}>Doelsaldo {gb.gd}</Tag>
                <Tag bg={G.red}>W-G-V: {gb.won}-{gb.drawn}-{gb.lost}</Tag>
              </div>
              {(gb.pos === 1 || gb.pos === 8) && (
                <div style={{ marginTop: 4 }}>
                  {gb.pos === 1 && <Tag bg={G.green}>⬆ PROMOTIE</Tag>}
                  {gb.pos === 8 && <Tag bg={G.red}>⬇ DEGRADATIE</Tag>}
                </div>
              )}
            </>
          ) : (
            <div>Glory Boyz FC niet gevonden in de huidige stand.</div>
          )}
        </Card>
      </Panel>}

      {competitionUnlocked && <Panel title="VOLGENDE WEDSTRIJDEN" color={G.green} icon="📅">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {competitionData.nextGames.map((m, i) => (
            <Card key={m.date + m.time + i} style={{ padding: "10px 12px", background: G.paperSoft }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                <div style={{ fontFamily: "Bangers, cursive", fontSize: 18, letterSpacing: 0.6, fontWeight: 500, lineHeight: 1.3 }}>
                  <span style={{ fontWeight: 500 }}>{m.home}</span>
                  <span style={{ fontWeight: 700 }}> VS </span>
                  <span style={{ fontWeight: 500 }}>{m.away}</span>
                </div>
                <Tag bg={G.green}>{m.date} {m.time}</Tag>
              </div>
            </Card>
          ))}
        </div>
      </Panel>}

      {competitionUnlocked && <Panel title="STAND" color={G.brown} icon="📊">
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead>
              <tr>
                {["#", "Club", "P", "W", "G", "V", "GF", "GA", "GD", "Pts"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "7px 8px", fontFamily: "Bangers, cursive", fontSize: 16, letterSpacing: 1, borderBottom: "2px solid " + G.line }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {competitionData.standings.map(row => {
                const isGb = row.club === "Glory Boyz FC";
                return (
                  <tr key={row.club} style={{ background: isGb ? "rgba(79,159,224,0.14)" : "transparent", borderTop: "1px solid " + G.line }}>
                    <td style={{ padding: "6px 8px", fontWeight: 800 }}>{row.pos}</td>
                    <td style={{ padding: "6px 8px", fontWeight: isGb ? 800 : 600 }}>{row.club}</td>
                    <td style={{ padding: "6px 8px" }}>{row.played}</td>
                    <td style={{ padding: "6px 8px" }}>{row.won}</td>
                    <td style={{ padding: "6px 8px" }}>{row.drawn}</td>
                    <td style={{ padding: "6px 8px" }}>{row.lost}</td>
                    <td style={{ padding: "6px 8px" }}>{row.gf}</td>
                    <td style={{ padding: "6px 8px" }}>{row.ga}</td>
                    <td style={{ padding: "6px 8px" }}>{row.gd}</td>
                    <td style={{ padding: "6px 8px", fontWeight: 800 }}>{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>}

      {competitionUnlocked && <Panel title="LAATSTE SPEELRONDE" color={G.red} icon="🔥">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, color: "#b7c6de", marginBottom: 2 }}>
            Laatste ronde: <strong>{competitionData.lastRoundLabel}</strong>
          </div>
          {competitionData.lastRoundResults.map((r, i) => {
            return (
              <Card key={r.date + i} style={{ padding: "10px 12px", background: G.paperSoft }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <div style={{ fontFamily: "Bangers, cursive", fontSize: 18, letterSpacing: 0.6, lineHeight: 1.3 }}>
                    <span style={{ fontWeight: 500 }}>{r.home}</span>
                    <span style={{ fontWeight: 700 }}> {r.homeScore} - {r.awayScore} </span>
                    <span style={{ fontWeight: 500 }}>{r.away}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </Panel>}
    </div>
  );
}

// ── ADMIN LOGIN ───────────────────────────────────────────────────────────────
function AdminLogin({ adminPwInput, setAdminPwInput, adminPwError, tryAdminLogin }) {
  return (
    <div style={{ maxWidth:400, margin:"0 auto" }}>
      <Panel title="ADMIN TOEGANG" color={G.red} icon="🔒">
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card style={{ padding:"12px 14px", background:G.paperSoft, boxShadow:"none" }}>
            <p style={{ fontSize:13, lineHeight:1.7, textAlign:"center" }}>Voer het wachtwoord in om verder te gaan.</p>
          </Card>
          <input type="password" value={adminPwInput}
            onChange={e => setAdminPwInput(e.target.value)}
            onKeyDown={e => e.key==="Enter" && tryAdminLogin()}
            placeholder="Wachtwoord..." autoFocus
            style={{
              border:"3px solid "+(adminPwError ? G.red : G.ink), borderRadius:8,
              padding:"12px 16px", fontSize:18, background: adminPwError ? "rgba(255,93,77,0.18)" : "#111722", color: G.ink,
              boxShadow:"3px 3px 0 "+(adminPwError ? G.red : G.ink),
              textAlign:"center", letterSpacing:4,
            }}/>
          {adminPwError && <div style={{ fontFamily:"Bangers, cursive", fontSize:18, letterSpacing:2, color:G.red, textAlign:"center" }}>❌ FOUT WACHTWOORD!</div>}
          <Btn bg={G.red} onClick={tryAdminLogin}>🔓 INLOGGEN</Btn>
        </div>
      </Panel>
    </div>
  );
}

// ── ADMIN VIEW ────────────────────────────────────────────────────────────────
function AdminView({ players, sched, avail, matchDates, toggleAvail, genSchedule, adminTab, setAdminTab, saveMatchDates, addPlayer, removePlayer, savePlayerName, playerStats, updatePlayerStats }) {
  return (
    <div>
      <div className="admin-tabs">
        {[["schedule","ROOSTER"],["availability","BESCHIKBAARHEID"],["dates","SPEELDATA"],["players","SPELERS"]].map(([t,label]) => (
          <button key={t} onClick={() => setAdminTab(t)} style={{
            fontFamily:"Bangers, cursive", fontSize:24, letterSpacing:1.2,
            padding:"8px 18px", borderRadius:8, border:"2.5px solid "+G.ink,
            background: adminTab===t ? G.gold : G.paperSoft,
            boxShadow: adminTab===t ? "0 8px 16px rgba(0,0,0,0.35)" : "0 6px 14px rgba(0,0,0,0.26)",
            cursor:"pointer",
            color: adminTab===t ? "#121722" : "#f2f5ff",
          }} className="nav-kapow">{label}</button>
        ))}
      </div>

      {adminTab === "schedule" && (
        <Panel title="BEHEER ROOSTER" color={G.red} icon="⚙️">
          <div style={{ marginBottom:14, display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <Btn bg={G.red} onClick={genSchedule}>🔄 GENEREER ROOSTER</Btn>
            <span style={{ fontSize:12, color:"#666", fontStyle:"italic" }}>Eerlijk algoritme + voorkeuren</span>
          </div>
          {!sched || Object.keys(sched).length===0 ? (
            <Card style={{ padding:30, textAlign:"center", color:"#888" }}>Nog geen rooster.</Card>
          ) : (
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {matchDates.map((date, i) => {
                const entry = sched[date];
                if (!entry) return null;
                return (
                  <Card key={date} style={{ padding:"12px 14px" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
                      <div>
                        <span style={{ fontFamily:"Bangers, cursive", fontSize:18, letterSpacing:1 }}>RONDE {i+1}</span>
                        <span style={{ marginLeft:10, fontSize:12, color:"#666" }}>{fmtDate(date)}</span>
                      </div>
                      <div style={{ fontSize:11, display:"flex", gap:8 }}>
                        {entry.honored>0 && <span style={{ color:G.green, fontWeight:700 }}>✓ {entry.honored} voorkeur ok</span>}
                        {entry.missed>0 && <span style={{ color:G.orange, fontWeight:700 }}>⚡ {entry.missed} kon niet</span>}
                      </div>
                    </div>
                    <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:entry.skipped?.length?8:0 }}>
                      {entry.keeper && <Tag bg={G.orange}>🧤 {entry.keeper.name}</Tag>}
                      {entry.players?.map(p => <Tag key={p.id} bg={G.green}>⚽ {p.name}</Tag>)}
                    </div>
                    {entry.skipped?.length>0 && (
                      <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                        {entry.skipped.map(p => {
                          const had = avail[p.id]?.[i];
                          return <Tag key={p.id} bg={had?G.brown:"#bbb"}>{p.name}{had?" ⭐":""}</Tag>;
                        })}
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </Panel>
      )}

      {adminTab === "availability" && (
        <Panel title="BESCHIKBAARHEID" color={G.blue} icon="📅">
          <p style={{ fontSize:12, color:"#555", marginBottom:12, fontStyle:"italic" }}>✓ = beschikbaar · ✕ = voorkeur vrij</p>
          <div style={{ overflowX:"auto" }}>
            <table style={{ borderCollapse:"collapse", fontSize:12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign:"left", padding:"6px 10px", fontFamily:"Bangers, cursive", fontSize:14, letterSpacing:1 }}>SPELER</th>
                  {matchDates.map((d,i) => (
                    <th key={d} style={{ padding:"5px 3px", textAlign:"center", fontSize:10, fontWeight:700, color:"#555", minWidth:28 }}>R{i+1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id} style={{ borderTop:"1.5px solid "+G.line }}>
                    <td style={{ padding:"6px 10px", fontWeight:700, whiteSpace:"nowrap" }}>{p.role==="keeper"?"🧤":"⚽"} {p.name}</td>
                    {matchDates.map((d,i) => {
                      const free = avail[p.id]?.[i];
                      return (
                        <td key={d} style={{ textAlign:"center", padding:3 }}>
                          <button onClick={() => toggleAvail(p.id, i)} style={{
                            width:26, height:26, borderRadius:5, border:"2px solid "+G.ink,
                            background: free ? G.red : "rgba(63,218,139,0.25)",
                            color: free ? "white" : G.green,
                            cursor:"pointer", fontSize:13, fontWeight:900,
                            boxShadow:"1px 1px 0 "+G.ink,
                          }}>{free?"✕":"✓"}</button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {adminTab === "dates" && (
        <DatesView matchDates={matchDates} saveMatchDates={saveMatchDates} genSchedule={genSchedule} />
      )}

      {adminTab === "players" && (
        <PlayersAdmin
          players={players}
          addPlayer={addPlayer}
          removePlayer={removePlayer}
          savePlayerName={savePlayerName}
          playerStats={playerStats}
          updatePlayerStats={updatePlayerStats}
        />
      )}
    </div>
  );
}

// ── DATES VIEW ────────────────────────────────────────────────────────────────
function DatesView({ matchDates, saveMatchDates, genSchedule }) {
  const [dates, setDates] = useState([...matchDates]);
  const [saved, setSaved] = useState(false);

  function updateDate(i, val) {
    const nd = [...dates]; nd[i] = val; setDates(nd); setSaved(false);
  }
  function addDate() { setDates(prev => [...prev, ""]); setSaved(false); }
  function removeDate(i) { setDates(prev => prev.filter((_,idx) => idx!==i)); setSaved(false); }

  async function doSave() {
    const valid = dates.filter(d => d && d.length===10).sort();
    await saveMatchDates(valid);
    setDates(valid);
    setSaved(true);
    genSchedule();
  }

  return (
    <Panel title="SPEELDATA BEHEREN" color={G.blue} icon="📆">
      <Card style={{ padding:"12px 14px", marginBottom:14, background:G.paperSoft, boxShadow:"none" }}>
        <p style={{ fontSize:13, lineHeight:1.7 }}>
          Voer hier de speeldatums in. Na opslaan wordt het rooster automatisch herberekend.
        </p>
      </Card>
      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:16 }}>
        {dates.map((date, i) => (
          <Card key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px" }}>
            <div style={{
              width:32, height:32, borderRadius:6, flexShrink:0,
              background:G.blue, border:"2px solid "+G.ink,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontFamily:"Bangers, cursive", fontSize:16, color:"white",
            }}>{i+1}</div>
            <input type="date" value={date} onChange={e => updateDate(i, e.target.value)}
              style={{
                flex:1, border:"2.5px solid "+(date?G.ink:G.red), borderRadius:8,
                padding:"7px 10px", fontSize:14, background:"#111722", color:G.ink,
                boxShadow:"2px 2px 0 "+G.ink,
              }}/>
            <span style={{ fontSize:13, color:"#666", minWidth:40 }}>
              {date ? new Date(date+"T00:00:00").toLocaleDateString("nl-NL",{weekday:"short"}) : ""}
            </span>
            <Btn small bg={G.red} onClick={() => removeDate(i)}>🗑</Btn>
          </Card>
        ))}
      </div>
      <div style={{ display:"flex", gap:10, flexWrap:"wrap", alignItems:"center" }}>
        <Btn bg={G.green} onClick={addDate}>➕ DATUM TOEVOEGEN</Btn>
        <Btn bg={G.red} onClick={doSave}>💾 OPSLAAN & ROOSTER MAKEN</Btn>
        {saved && <Tag bg={G.green}>✅ OPGESLAGEN!</Tag>}
      </div>
    </Panel>
  );
}

// ── PLAYER VIEW ───────────────────────────────────────────────────────────────
function PlayerView({ player, players, sched, avail, matchDates, toggleAvail, mySchedule, swapReq, startSwap, sendSwap, myOffers, acceptSwap, declineSwap, playerStats, competitionData, competitionUnlocked }) {
  const schedule = mySchedule(player.id);
  const playCount = schedule.filter(d => d.playing).length;
  const skipCount = schedule.filter(d => !d.playing).length;
  const goals = playerStats[player.id]?.goals || 0;
  const assists = playerStats[player.id]?.assists || 0;

  let nextClubMatch = null;
  if (competitionUnlocked && competitionData?.nextGames?.length) {
    nextClubMatch = competitionData.nextGames.find(
      m => m.home === "Glory Boyz FC" || m.away === "Glory Boyz FC"
    ) || null;
  }

  return (
    <div>
      <Card style={{ padding:"18px 20px", marginBottom:20, background:G.paperSoft }}>
        <div className="player-overview">
          <div style={{ display:"flex", flexDirection:"column", justifyContent:"center", gap:6 }}>
            <div style={{ fontFamily:"Bangers, cursive", fontSize:26, letterSpacing:1, lineHeight:1 }}>{player.name.toUpperCase()}</div>
            <div style={{ fontSize:12, color:"#b9c6de", textTransform:"uppercase", letterSpacing:2, fontWeight:700 }}>{player.role}</div>
            {nextClubMatch && (
              <div style={{ marginTop:4 }}>
                <Tag bg={G.green}>
                  Volgende wedstrijd: {nextClubMatch.date.slice(0,5)} – {nextClubMatch.time} vs{" "}
                  {nextClubMatch.home === "Glory Boyz FC" ? nextClubMatch.away : nextClubMatch.home}
                </Tag>
              </div>
            )}
          </div>
          <div className="player-stats-grid">
            <Card color={G.green} style={{ padding:"10px 14px", textAlign:"center", background:"rgba(63,218,139,0.18)", boxShadow:"0 8px 16px rgba(63,218,139,0.20)", borderColor:G.green }} className="player-stat-card">
              <div style={{ fontFamily:"Bangers, cursive", fontSize:32, color:G.green, lineHeight:1 }}>{playCount}</div>
              <div style={{ fontSize:11, fontWeight:700 }}>SPEELT</div>
            </Card>
            <Card color={G.red} style={{ padding:"10px 14px", textAlign:"center", background:"rgba(255,93,77,0.16)", boxShadow:"0 8px 16px rgba(255,93,77,0.18)", borderColor:G.red }} className="player-stat-card">
              <div style={{ fontFamily:"Bangers, cursive", fontSize:32, color:G.red, lineHeight:1 }}>{skipCount}</div>
              <div style={{ fontSize:11, fontWeight:700 }}>SKIPT</div>
            </Card>
            <Card color={G.blue} style={{ padding:"10px 14px", textAlign:"center", background:"linear-gradient(160deg, rgba(79,159,224,0.26), rgba(79,159,224,0.08))", boxShadow:"0 8px 16px rgba(79,159,224,0.20)", borderColor:G.blue }} className="player-stat-card">
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:34, color:"#84c5ff", lineHeight:1, letterSpacing:1 }}>{goals}</div>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:1.1, color:"#cfe8ff", textTransform:"uppercase" }}>Doelpunten</div>
            </Card>
            <Card color={G.gold} style={{ padding:"10px 14px", textAlign:"center", background:"linear-gradient(160deg, rgba(215,173,91,0.28), rgba(215,173,91,0.10))", boxShadow:"0 8px 16px rgba(215,173,91,0.20)", borderColor:G.gold }} className="player-stat-card">
              <div style={{ fontFamily:"'Bebas Neue', sans-serif", fontSize:34, color:"#ffe2a8", lineHeight:1, letterSpacing:1 }}>{assists}</div>
              <div style={{ fontSize:10, fontWeight:800, letterSpacing:1.1, color:"#fff0cd", textTransform:"uppercase" }}>Assists</div>
            </Card>
          </div>
        </div>
      </Card>

      {myOffers.length > 0 && (
        <Panel title="RUILVERZOEKEN!" color={G.red} icon="🔄">
          {myOffers.map((offer, idx) => {
            const from = players.find(p => p.id===offer.fromId);
            return (
              <Card key={idx} style={{ padding:"12px 14px", marginBottom:8, background:G.paperSoft }}>
                <p style={{ fontWeight:700, marginBottom:10 }}>
                  <strong>{from?.name}</strong> wil ruilen voor Ronde {offer.di+1} ({fmtDate(matchDates[offer.di])})
                </p>
                <div style={{ display:"flex", gap:8 }}>
                  <Btn small bg={G.green} onClick={() => acceptSwap(offer)}>✓ ACCEPTEREN</Btn>
                  <Btn small bg={G.red} onClick={() => declineSwap(offer)}>✕ AFWIJZEN</Btn>
                </div>
              </Card>
            );
          })}
        </Panel>
      )}

      <Panel title="MIJN SPEELSCHEMA" color={G.green} icon="📅">
        {!sched || Object.keys(sched).length===0 ? (
          <div style={{ fontSize:14, color:"#888", fontStyle:"italic", padding:"16px 0" }}>Nog geen rooster. Vraag de admin.</div>
        ) : (
          <>
            <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
              {schedule.map(({ date, di, playing, entry }) => {
                const isFree = avail[player.id]?.[di];
                const isActive = swapReq?.pid===player.id && swapReq?.di===di;
                const teammates = entry ? [entry.keeper,...(entry.players||[])].filter(p => p && p.id!==player.id) : [];

                return (
                  <Card key={date} color={isActive?G.red:playing?G.green:undefined}
                    style={{ padding:"10px 13px", background:isActive?"rgba(255,154,61,0.15)":playing?"rgba(63,218,139,0.12)":G.paperSoft }}>
                    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, flexWrap:"wrap" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", flexShrink:0, background:playing?G.green:"#6f7a90", border:"2px solid "+G.line }}/>
                        <div>
                          <div style={{ fontFamily:"Bangers, cursive", fontSize:17, letterSpacing:1 }}>RONDE {di+1} — {fmtDate(date)}</div>
                          {playing && teammates.length>0 && (
                            <div style={{ fontSize:11, color:"#d7e3f7", marginTop:1 }}>Met: {teammates.map(p=>p.name).join(", ")}</div>
                          )}
                        </div>
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap:7, flexWrap:"wrap" }}>
                        {playing ? (
                          <>
                            <Tag bg={G.green}>✓ SPEELT</Tag>
                            {!swapReq && <Btn small bg={G.orange} onClick={() => startSwap(player.id, di)}>🔄 RUILEN</Btn>}
                            {isActive && <Tag bg={G.red}>↓ KIES SPELER</Tag>}
                          </>
                        ) : (
                          <Tag bg="#aaa">— SKIPT</Tag>
                        )}
                        <button onClick={() => toggleAvail(player.id, di)} style={{
                          fontFamily:"Bangers, cursive", fontSize:12, letterSpacing:0.5,
                          padding:"4px 10px", borderRadius:6,
                          border:"1.5px solid "+(isFree?G.red:G.line),
                          background:isFree?"rgba(255,93,77,0.18)":G.paperSoft,
                          color:isFree?G.red:"#e5ecfa",
                          cursor:"pointer", boxShadow:"0 6px 12px rgba(0,0,0,0.28)",
                        }}>
                          {isFree?"⭐ VOORKEUR VRIJ":"☆ VRIJ?"}
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {swapReq && (
              <Card style={{ marginTop:14, padding:"14px 16px", background:G.paperSoft, borderColor:G.red, boxShadow:"0 10px 18px rgba(255,93,77,0.22)" }}>
                <div style={{ fontFamily:"Bangers, cursive", fontSize:18, letterSpacing:1, color:G.red, marginBottom:10 }}>
                  🔄 RONDE {swapReq.di+1} — KIES MET WIE:
                </div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                  {players.filter(p => p.id!==player.id).map(p => (
                    <Btn key={p.id} small bg={G.blue} onClick={() => sendSwap(p.id, swapReq.di)}>{p.name}</Btn>
                  ))}
                  <Btn small outline onClick={() => startSwap(null,null)}>ANNULEREN</Btn>
                </div>
              </Card>
            )}
          </>
        )}
      </Panel>

      <Panel title="MIJN VRIJE-DAG VOORKEUR" color={G.blue} icon="🗓️">
        <Card style={{ padding:"11px 14px", marginBottom:14, background:"#2b3d61", boxShadow:"none", borderColor:"#3f5788" }}>
          <p style={{ fontSize:13, lineHeight:1.7 }}>
            Geef aan wanneer je <strong>liever vrij bent</strong>. Het rooster houdt hier zoveel mogelijk rekening mee, maar een eerlijke verdeling gaat altijd voor!
          </p>
        </Card>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(108px, 1fr))", gap:8, background:"#253758", border:"1.5px solid #3a527f", borderRadius:12, padding:10 }}>
          {matchDates.map((date, i) => {
            const isFree = avail[player.id]?.[i];
            const isPlaying = sched ? (sched[date]?.keeper?.id===player.id || sched[date]?.players?.some(p=>p.id===player.id)) : null;
            return (
              <button key={date} onClick={() => toggleAvail(player.id, i)} style={{
                padding:"10px 6px", borderRadius:10,
                border:"3px solid "+(isFree?G.red:G.ink),
                background:isFree?"#5f2f37":"#2d4168",
                boxShadow:"3px 3px 0 "+(isFree?G.red:G.ink),
                cursor:"pointer", textAlign:"center",
              }}>
                <div style={{ fontSize:10, color:"#d7e3f7", marginBottom:2 }}>Ronde {i+1}</div>
                <div style={{ fontFamily:"Bangers, cursive", fontSize:14, letterSpacing:0.5, color:"#f7fbff" }}>{fmtDate(date)}</div>
                {isFree && <div style={{ fontSize:10, marginTop:4, fontWeight:900, color:G.red }}>VOORKEUR VRIJ!</div>}
                {sched && isPlaying!==null && (
                  <div style={{ fontSize:10, marginTop:3, color:isPlaying?G.green:"#d7e3f7", fontWeight:700 }}>
                    {isPlaying?"↗ speelt":"↘ skipt"}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ── PLAYERS ADMIN ─────────────────────────────────────────────────────────────
function PlayersAdmin({ players, addPlayer, removePlayer, savePlayerName, playerStats, updatePlayerStats }) {
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("veld");
  const [added, setAdded] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");
  const hasKeeper = players.some(p => p.role === "keeper");

  async function doAdd() {
    const name = newName.trim();
    if (!name) return;
    await addPlayer(name, newRole);
    setAdded(name);
    setNewName("");
    setTimeout(() => setAdded(null), 1500);
  }

  async function doSaveName(id) {
    const name = editName.trim();
    await savePlayerName(id, name || players.find(p => p.id === id)?.name || "");
    setEditId(null);
    setEditName("");
  }

  return (
    <Panel title="SPELERS BEHEREN" color={G.green} icon="👥">
      {added && <ComicPop word="BAM" style={{ position:"fixed", top:"30%", left:"50%", transform:"translateX(-50%)", zIndex:9997 }} />}

      <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:20 }}>
        {players.map((p, i) => (
          <div key={p.id} className="anim-slidein card-hover" style={{
            background:G.paperSoft, border:"1.5px solid "+G.line, borderRadius:10,
            boxShadow:"0 8px 18px rgba(0,0,0,0.30)", padding:"8px 12px",
            animationDelay: (i * 0.05) + "s",
          }}>
            <div className="players-admin-row">
            <span style={{ fontSize:22 }}>{p.role==="keeper"?"🧤":"⚽"}</span>
            {editId === p.id ? (
              <input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                onKeyDown={e => e.key==="Enter" && doSaveName(p.id)}
                autoFocus
                className="players-admin-name"
                style={{ border:"1.5px solid "+G.line, borderRadius:8, padding:"7px 10px", fontSize:14, background:"#111722", color:G.ink }}
              />
            ) : (
              <span className="players-admin-name" style={{ fontFamily:"Bangers, cursive", fontSize:18, letterSpacing:1 }}>{p.name}</span>
            )}
            <span style={{ fontSize:10, color:G.brown, textTransform:"uppercase", letterSpacing:1 }}>{p.role}</span>
            <div className="players-admin-stats">
              <span style={{ fontSize:11, color:"#d0dccf", fontWeight:700, marginRight:4 }}>
                G+A: {(playerStats[p.id]?.goals ?? 0) + (playerStats[p.id]?.assists ?? 0)}
              </span>
              <label style={{ fontSize:10, color:"#b7c5dd", fontWeight:700 }}>G</label>
              <input
                type="number"
                min="0"
                value={playerStats[p.id]?.goals ?? 0}
                onChange={e => updatePlayerStats(p.id, e.target.value, playerStats[p.id]?.assists ?? 0)}
                style={{ width:52, border:"1.5px solid "+G.line, borderRadius:6, padding:"4px 6px", fontSize:12, background:"#111722", color:G.ink }}
              />
              <label style={{ fontSize:10, color:"#b7c5dd", fontWeight:700 }}>A</label>
              <input
                type="number"
                min="0"
                value={playerStats[p.id]?.assists ?? 0}
                onChange={e => updatePlayerStats(p.id, playerStats[p.id]?.goals ?? 0, e.target.value)}
                style={{ width:52, border:"1.5px solid "+G.line, borderRadius:6, padding:"4px 6px", fontSize:12, background:"#111722", color:G.ink }}
              />
            </div>
            <div className="players-admin-actions">
              {editId === p.id ? (
                <>
                <Btn small bg={G.green} onClick={() => doSaveName(p.id)}>OPSLAAN</Btn>
                <Btn small outline onClick={() => { setEditId(null); setEditName(""); }}>ANNULEREN</Btn>
                </>
              ) : (
                <>
                <Btn small bg={G.orange} onClick={() => { setEditId(p.id); setEditName(p.name); }}>BEWERK</Btn>
                <Btn small bg={G.red} onClick={() => removePlayer(p.id)}>VERWIJDER</Btn>
                </>
              )}
            </div>
            </div>
          </div>
        ))}
      </div>

      <Card style={{ padding:"16px", background:"rgba(63,218,139,0.10)", borderColor:G.green }}>
        <div style={{ fontFamily:"Bangers, cursive", fontSize:18, letterSpacing:1, marginBottom:12, color:G.green }}>➕ NIEUWE SPELER</div>
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key==="Enter" && doAdd()}
            placeholder="Naam nieuwe speler…"
            style={{ border:"1.5px solid "+G.line, borderRadius:8, padding:"10px 14px", fontSize:14, background:"#111722", color:G.ink, boxShadow:"0 6px 14px rgba(0,0,0,0.22)" }} />
          <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
            <span style={{ fontFamily:"Bangers, cursive", fontSize:15, letterSpacing:1 }}>POSITIE:</span>
            {["veld","keeper"].map(r => {
              const dis = r==="keeper" && hasKeeper;
              return (
                <button key={r} onClick={() => !dis && setNewRole(r)} disabled={dis} className={dis?"":"btn-press"} style={{
                  fontFamily:"Bangers, cursive", fontSize:15, letterSpacing:1,
                  padding:"6px 14px", borderRadius:8, border:"2.5px solid "+G.ink,
                  background: newRole===r ? G.gold : G.paperSoft,
                  boxShadow: newRole===r ? "0 8px 14px rgba(0,0,0,0.34)" : "0 6px 12px rgba(0,0,0,0.26)",
                  cursor: dis ? "not-allowed" : "pointer", opacity: dis ? 0.4 : 1,
                }}>{r==="keeper"?"🧤 KEEPER":"⚽ VELD"}</button>
              );
            })}
          </div>
          <div style={{ display:"flex", gap:10, alignItems:"center" }}>
            <Btn bg={G.green} onClick={doAdd}>➕ TOEVOEGEN</Btn>
            <span style={{ fontSize:13, color:"#666", fontWeight:700 }}>{players.length} spelers totaal</span>
          </div>
        </div>
      </Card>
    </Panel>
  );
}
