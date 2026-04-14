import { useState, useEffect } from "react";

const MATCH_DATES = [
  "2025-04-17","2025-04-24","2025-05-01","2025-05-08",
  "2025-05-15","2025-05-22","2025-05-29","2025-06-05",
  "2025-06-12","2025-06-19","2025-06-26","2025-07-03",
  "2025-07-10","2025-07-17"
];

const INITIAL_PLAYERS = [
  { id: 1, name: "Speler 1", role: "keeper" },
  { id: 2, name: "Speler 2", role: "veld" },
  { id: 3, name: "Speler 3", role: "veld" },
  { id: 4, name: "Speler 4", role: "veld" },
  { id: 5, name: "Speler 5", role: "veld" },
  { id: 6, name: "Speler 6", role: "veld" },
  { id: 7, name: "Speler 7", role: "veld" },
  { id: 8, name: "Speler 8", role: "veld" },
];

function fmtDate(d) {
  return new Date(d + "T00:00:00").toLocaleDateString("nl-NL", {
    weekday: "short", day: "numeric", month: "short"
  });
}

// ── SCHEDULING ────────────────────────────────────────────────────────────────
function buildSchedule(players, availability) {
  const field = players.filter(p => p.role === "veld");
  const keeper = players.find(p => p.role === "keeper");
  const MAX_FIELD = 6;
  const plays = {};
  field.forEach(p => { plays[p.id] = 0; });
  const sched = {};

  MATCH_DATES.forEach((date, di) => {
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
      players: playing,
      skipped,
      honored: skipped.filter(p => wantFree.some(w => w.id === p.id)).length,
      missed: wantFree.filter(p => !skippedIds.has(p.id)).length,
    };
  });
  return sched;
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const G = {
  bg: "#f5f0e0",
  paper: "#fffdf5",
  ink: "#1a0a00",
  gold: "#f9e000",
  red: "#e8231a",
  green: "#1aab3a",
  blue: "#1a5fbf",
  brown: "#8B4513",
  orange: "#f07d10",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${G.bg}; color: ${G.ink}; font-family: 'Comic Neue', cursive; }
  input, button { font-family: 'Comic Neue', cursive; }
  .htbg {
    background-color: ${G.bg};
    background-image: radial-gradient(#d4c89a 1.2px, transparent 1.2px);
    background-size: 18px 18px;
  }
`;

// ── PRIMITIVES ────────────────────────────────────────────────────────────────
function Card({ children, color, style = {} }) {
  return (
    <div style={{
      background: G.paper,
      border: "3px solid " + G.ink,
      borderRadius: 10,
      boxShadow: "4px 4px 0 " + G.ink,
      borderLeft: color ? "6px solid " + color : undefined,
      ...style
    }}>
      {children}
    </div>
  );
}

function Panel({ title, color, icon, children }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        background: color || G.blue,
        color: "white",
        padding: "8px 16px",
        borderRadius: "10px 10px 0 0",
        border: "3px solid " + G.ink,
        borderBottom: "none",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
        <span style={{ fontFamily: "Bangers, cursive", fontSize: 22, letterSpacing: 2 }}>{title}</span>
      </div>
      <div style={{
        background: G.paper,
        border: "3px solid " + G.ink,
        borderTop: "none",
        borderRadius: "0 0 10px 10px",
        padding: "14px 16px",
        boxShadow: "5px 5px 0 " + G.ink,
      }}>
        {children}
      </div>
    </div>
  );
}

function Btn({ children, onClick, bg, outline, small, disabled }) {
  const background = disabled ? "#ccc" : outline ? G.paper : (bg || G.blue);
  const color = outline ? G.ink : disabled ? "#888" : "white";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: small ? "5px 12px" : "9px 20px",
        border: "2.5px solid " + G.ink,
        borderRadius: 8,
        background,
        color,
        fontFamily: "Bangers, cursive",
        fontSize: small ? 13 : 16,
        letterSpacing: 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: disabled ? "none" : "3px 3px 0 " + G.ink,
      }}
    >
      {children}
    </button>
  );
}

function Tag({ children, bg, textColor }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
      padding: "3px 10px",
      border: "2px solid " + G.ink,
      borderRadius: 6,
      background: bg || G.blue,
      color: textColor || "white",
      fontFamily: "Bangers, cursive",
      fontSize: 13,
      letterSpacing: 0.5,
      boxShadow: "2px 2px 0 " + G.ink,
    }}>
      {children}
    </span>
  );
}

function Bubble({ text }) {
  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <div style={{
        background: "white",
        border: "3px solid " + G.ink,
        borderRadius: 14,
        padding: "5px 13px",
        fontFamily: "Bangers, cursive",
        fontSize: 16,
        letterSpacing: 1,
        boxShadow: "3px 3px 0 " + G.ink,
      }}>
        {text}
      </div>
      <div style={{
        position: "absolute",
        bottom: -13,
        left: 16,
        width: 0,
        height: 0,
        borderLeft: "9px solid transparent",
        borderRight: "4px solid transparent",
        borderTop: "13px solid " + G.ink,
      }} />
      <div style={{
        position: "absolute",
        bottom: -9,
        left: 18,
        width: 0,
        height: 0,
        borderLeft: "7px solid transparent",
        borderRight: "3px solid transparent",
        borderTop: "11px solid white",
      }} />
    </div>
  );
}

// ── MASCOT SVG ────────────────────────────────────────────────────────────────
function Mascot({ size }) {
  const s = size || 100;
  return (
    <svg width={s} height={s} viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="100" cy="136" rx="58" ry="52" fill="#8B4513" stroke="#1a0a00" strokeWidth="4"/>
      <ellipse cx="100" cy="75" rx="40" ry="38" fill="#c47a3a" stroke="#1a0a00" strokeWidth="4"/>
      <line x1="68" y1="57" x2="87" y2="65" stroke="#1a0a00" strokeWidth="5" strokeLinecap="round"/>
      <line x1="132" y1="57" x2="113" y2="65" stroke="#1a0a00" strokeWidth="5" strokeLinecap="round"/>
      <ellipse cx="83" cy="71" rx="10" ry="9" fill="white" stroke="#1a0a00" strokeWidth="3"/>
      <ellipse cx="117" cy="71" rx="10" ry="9" fill="white" stroke="#1a0a00" strokeWidth="3"/>
      <circle cx="86" cy="73" r="5" fill="#1a0a00"/>
      <circle cx="120" cy="73" r="5" fill="#1a0a00"/>
      <circle cx="88" cy="71" r="2" fill="white"/>
      <circle cx="122" cy="71" r="2" fill="white"/>
      <ellipse cx="100" cy="83" rx="11" ry="7" fill="#a05a20" stroke="#1a0a00" strokeWidth="3"/>
      <path d="M79 94 Q100 112 121 94" fill="#cc0000" stroke="#1a0a00" strokeWidth="3"/>
      <path d="M79 94 Q100 103 121 94" fill="#880000"/>
      <polygon points="88,94 84,107 92,94" fill="white" stroke="#1a0a00" strokeWidth="2"/>
      <polygon points="112,94 108,107 116,94" fill="white" stroke="#1a0a00" strokeWidth="2"/>
      <path d="M42 115 Q24 85 38 65" fill="none" stroke="#8B4513" strokeWidth="16" strokeLinecap="round"/>
      <path d="M158 115 Q176 85 162 65" fill="none" stroke="#8B4513" strokeWidth="16" strokeLinecap="round"/>
      <circle cx="36" cy="63" r="13" fill="#c47a3a" stroke="#1a0a00" strokeWidth="3"/>
      <circle cx="164" cy="63" r="13" fill="#c47a3a" stroke="#1a0a00" strokeWidth="3"/>
      <line x1="25" y1="53" x2="19" y2="43" stroke="#1a0a00" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="33" y1="49" x2="30" y2="37" stroke="#1a0a00" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="41" y1="50" x2="41" y2="38" stroke="#1a0a00" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="175" y1="53" x2="181" y2="43" stroke="#1a0a00" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="167" y1="49" x2="170" y2="37" stroke="#1a0a00" strokeWidth="2.5" strokeLinecap="round"/>
      <line x1="159" y1="50" x2="159" y2="38" stroke="#1a0a00" strokeWidth="2.5" strokeLinecap="round"/>
      <ellipse cx="83" cy="183" rx="19" ry="11" fill="#8B4513" stroke="#1a0a00" strokeWidth="3"/>
      <ellipse cx="117" cy="183" rx="19" ry="11" fill="#8B4513" stroke="#1a0a00" strokeWidth="3"/>
      <ellipse cx="87" cy="144" rx="7" ry="10" fill="#2d6a2d" stroke="#1a0a00" strokeWidth="2" transform="rotate(-20 87 144)"/>
      <ellipse cx="113" cy="148" rx="6" ry="10" fill="#2d6a2d" stroke="#1a0a00" strokeWidth="2" transform="rotate(15 113 148)"/>
      <ellipse cx="100" cy="158" rx="6" ry="9" fill="#2d6a2d" stroke="#1a0a00" strokeWidth="2"/>
    </svg>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState("home");
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
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
  const ADMIN_PASSWORD = "gloryboyz";

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

  useEffect(() => {
    if (sched) setSched(buildSchedule(players, avail));
  }, [avail, players]);

  function notify(msg, err) {
    setToast({ msg, err });
    setTimeout(() => setToast(null), 3000);
  }

  function genSchedule() {
    setSched(buildSchedule(players, avail));
    notify("RONGOE! Rooster gemaakt!");
  }

  function toggleAvail(pid, di) {
    setAvail(prev => ({
      ...prev,
      [pid]: { ...(prev[pid] || {}), [di]: !prev[pid]?.[di] }
    }));
  }

  function startSwap(pid, di) {
    setSwapReq(pid ? { pid, di } : null);
  }

  function sendSwap(toPid, di) {
    if (!swapReq) return;
    if (toPid === swapReq.pid) { notify("Niet met jezelf!", true); return; }
    setSwapOffers(prev => [...prev, { fromId: swapReq.pid, toId: toPid, di }]);
    setSwapReq(null);
    notify("Ruilverzoek verstuurd!");
  }

  function acceptSwap(offer) {
    if (!sched) return;
    const date = MATCH_DATES[offer.di];
    const fp = players.find(p => p.id === offer.fromId);
    const tp = players.find(p => p.id === offer.toId);
    if (!fp || !tp) return;
    setSched(prev => {
      const ns = { ...prev };
      const e = { ...ns[date], players: [...ns[date].players], skipped: [...(ns[date].skipped || [])] };
      if (e.players.some(p => p.id === fp.id)) {
        e.players = e.players.map(p => p.id === fp.id ? tp : p);
        e.skipped = e.skipped.map(p => p.id === tp.id ? fp : p);
        if (!e.skipped.some(p => p.id === fp.id)) e.skipped.push(fp);
      } else {
        e.players = e.players.map(p => p.id === tp.id ? fp : p);
        e.skipped = e.skipped.map(p => p.id === fp.id ? tp : p);
      }
      ns[date] = e;
      return ns;
    });
    setSwapOffers(prev => prev.filter(o => o !== offer));
    notify(fp.name + " en " + tp.name + " geruild!");
  }

  function declineSwap(offer) {
    setSwapOffers(prev => prev.filter(o => o !== offer));
    notify("Ruilverzoek afgewezen.", true);
  }

  function mySchedule(pid) {
    if (!sched) return [];
    return MATCH_DATES.map((date, i) => {
      const e = sched[date];
      const playing = e && (e.keeper?.id === pid || e.players?.some(p => p.id === pid));
      return { date, di: i, playing, entry: e };
    });
  }

  const myOffers = activePlayer ? swapOffers.filter(o => o.toId === activePlayer.id) : [];

  const navItems = [
    { id: "home", label: "SPELERS", icon: "👤" },
    { id: "roster", label: "ROOSTER", icon: "📋" },
    { id: "admin", label: "ADMIN", icon: "⚙️" },
  ];

  function handleNavClick(id) {
    if (id === "admin" && !adminUnlocked) {
      setView("adminlogin");
    } else {
      setView(id);
    }
  }

  return (
    <>
      <style>{css}</style>
      <div className="htbg" style={{ minHeight: "100vh" }}>

        {toast && (
          <div style={{
            position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)",
            background: toast.err ? G.red : G.gold,
            color: G.ink,
            padding: "10px 28px",
            border: "3px solid " + G.ink,
            borderRadius: 10,
            fontFamily: "Bangers, cursive",
            fontSize: 20,
            letterSpacing: 2,
            boxShadow: "5px 5px 0 " + G.ink,
            zIndex: 9999,
            whiteSpace: "nowrap",
          }}>
            {toast.msg}
          </div>
        )}

        <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 14px 100px" }}>

          {/* HEADER */}
          <header style={{ textAlign: "center", padding: "28px 0 18px" }}>
            <div style={{ display: "inline-flex", alignItems: "flex-end", gap: 16, position: "relative" }}>
              <Mascot size={96} />
              <div style={{ textAlign: "left", paddingBottom: 6 }}>
                <div style={{
                  fontFamily: "Bangers, cursive",
                  fontSize: 11,
                  letterSpacing: 6,
                  color: G.brown,
                  marginBottom: -4,
                }}>
                  GLORYBOYZ FC
                </div>
                <div style={{
                  fontFamily: "Bangers, cursive",
                  fontSize: "clamp(58px, 15vw, 100px)",
                  letterSpacing: 6,
                  lineHeight: 1,
                  color: G.ink,
                  textShadow: "4px 4px 0 " + G.gold + ", 6px 6px 0 " + G.ink,
                }}>
                  RONGOE
                </div>
                <div style={{
                  fontFamily: "Bangers, cursive",
                  fontSize: 13,
                  letterSpacing: 4,
                  color: G.brown,
                }}>
                  SPEELROOSTER APP
                </div>
              </div>
              <div style={{ position: "absolute", top: 4, right: -8 }}>
                <Bubble text="RONGOE!" />
              </div>
            </div>
          </header>

          {/* NAV */}
          <div style={{ display: "flex", gap: 8, marginBottom: 24, justifyContent: "center", flexWrap: "wrap" }}>
            {navItems.map(n => {
              const isAdminBtn = n.id === "admin";
              const isActive = view === n.id || (n.id === "admin" && view === "adminlogin");
              return (
                <button
                  key={n.id}
                  onClick={() => handleNavClick(n.id)}
                  style={{
                    fontFamily: "Bangers, cursive",
                    fontSize: 17,
                    letterSpacing: 2,
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: "3px solid " + (isAdminBtn && !adminUnlocked ? "#999" : G.ink),
                    background: isActive ? G.gold : "white",
                    boxShadow: isActive ? "4px 4px 0 " + G.ink : "2px 2px 0 " + G.ink,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    opacity: isAdminBtn && !adminUnlocked ? 0.75 : 1,
                  }}
                >
                  <span>{isAdminBtn && !adminUnlocked ? "🔒" : n.icon}</span>
                  <span>{n.label}</span>
                </button>
              );
            })}
            {activePlayer && (
              <button
                onClick={() => setView("player")}
                style={{
                  fontFamily: "Bangers, cursive",
                  fontSize: 17,
                  letterSpacing: 2,
                  padding: "8px 20px",
                  borderRadius: 8,
                  border: "3px solid " + G.green,
                  background: view === "player" ? "#d4f5d4" : "white",
                  boxShadow: "3px 3px 0 " + G.green,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>⚽</span>
                <span style={{ maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {activePlayer.name.toUpperCase()}
                </span>
              </button>
            )}
          </div>

          {/* VIEWS */}
          {view === "home" && (
            <HomeView
              players={players} setPlayers={setPlayers}
              setView={setView} setActivePlayer={setActivePlayer}
              avail={avail} setAvail={setAvail}
              sched={sched}
              editId={editId} setEditId={setEditId}
              editName={editName} setEditName={setEditName}
            />
          )}
          {view === "roster" && (
            <RosterView players={players} sched={sched} avail={avail} />
          )}
          {view === "adminlogin" && (
            <AdminLogin
              adminPwInput={adminPwInput} setAdminPwInput={setAdminPwInput}
              adminPwError={adminPwError} tryAdminLogin={tryAdminLogin}
            />
          )}
          {view === "admin" && (
            <AdminView
              players={players} sched={sched} avail={avail}
              toggleAvail={toggleAvail} genSchedule={genSchedule}
              adminTab={adminTab} setAdminTab={setAdminTab}
            />
          )}
          {view === "player" && activePlayer && (
            <PlayerView
              player={activePlayer} players={players}
              sched={sched} avail={avail}
              toggleAvail={toggleAvail} mySchedule={mySchedule}
              swapReq={swapReq} startSwap={startSwap}
              sendSwap={sendSwap} myOffers={myOffers}
              acceptSwap={acceptSwap} declineSwap={declineSwap}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ── HOME VIEW ─────────────────────────────────────────────────────────────────
function HomeView({ players, setPlayers, setView, setActivePlayer, avail, setAvail, sched, editId, setEditId, editName, setEditName }) {
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("veld");
  const hasKeeper = players.some(p => p.role === "keeper");

  function saveName(id) {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, name: editName || p.name } : p));
    setEditId(null);
  }

  function addPlayer() {
    const name = newName.trim();
    if (!name) return;
    setPlayers(prev => [...prev, { id: Date.now(), name, role: newRole }]);
    setNewName("");
  }

  function removePlayer(id) {
    setPlayers(prev => prev.filter(p => p.id !== id));
    setAvail(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  return (
    <div>
      <Panel title="WIE BEN JIJ?" color={G.blue} icon="👤">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
          {players.map(p => (
            <button
              key={p.id}
              onClick={() => { setActivePlayer(p); setView("player"); }}
              style={{
                background: "white",
                border: "3px solid " + G.ink,
                borderRadius: 10,
                boxShadow: "4px 4px 0 " + G.ink,
                padding: "16px 8px",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ fontSize: 28 }}>{p.role === "keeper" ? "🧤" : "⚽"}</span>
              <span style={{ fontFamily: "Bangers, cursive", fontSize: 17, letterSpacing: 1, textAlign: "center" }}>{p.name}</span>
              <span style={{ fontSize: 10, color: G.brown, textTransform: "uppercase", letterSpacing: 1, fontWeight: 700 }}>{p.role}</span>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="NAMEN BEWERKEN" color={G.brown} icon="✏️">
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {players.map(p => (
            <Card key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px" }}>
              <span style={{ fontSize: 18 }}>{p.role === "keeper" ? "🧤" : "⚽"}</span>
              {editId === p.id ? (
                <>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && saveName(p.id)}
                    autoFocus
                    style={{
                      flex: 1, border: "2.5px solid " + G.ink,
                      borderRadius: 6, padding: "5px 9px", fontSize: 14,
                      background: "#fffdf0",
                    }}
                  />
                  <Btn small bg={G.green} onClick={() => saveName(p.id)}>✓</Btn>
                  <Btn small outline onClick={() => setEditId(null)}>✕</Btn>
                </>
              ) : (
                <>
                  <span style={{ flex: 1, fontWeight: 700, fontSize: 14 }}>{p.name}</span>
                  <span style={{ fontSize: 10, color: G.brown, textTransform: "uppercase", marginRight: 4 }}>{p.role}</span>
                  <Btn small bg={G.orange} onClick={() => { setEditId(p.id); setEditName(p.name); }}>✏️</Btn>
                  <Btn small bg={G.red} onClick={() => removePlayer(p.id)}>🗑</Btn>
                </>
              )}
            </Card>
          ))}
        </div>
      </Panel>

      <Panel title="SPELER TOEVOEGEN" color={G.green} icon="➕">
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addPlayer()}
            placeholder="Naam nieuwe speler…"
            style={{
              border: "2.5px solid " + G.ink,
              borderRadius: 8,
              padding: "10px 14px",
              fontSize: 14,
              background: "#fffdf0",
              boxShadow: "2px 2px 0 " + G.ink,
            }}
          />
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Bangers, cursive", fontSize: 15, letterSpacing: 1 }}>POSITIE:</span>
            {["veld", "keeper"].map(r => {
              const disabled = r === "keeper" && hasKeeper;
              return (
                <button
                  key={r}
                  onClick={() => !disabled && setNewRole(r)}
                  disabled={disabled}
                  style={{
                    fontFamily: "Bangers, cursive",
                    fontSize: 15,
                    letterSpacing: 1,
                    padding: "6px 14px",
                    borderRadius: 8,
                    border: "2.5px solid " + G.ink,
                    background: newRole === r ? G.gold : "white",
                    boxShadow: newRole === r ? "3px 3px 0 " + G.ink : "2px 2px 0 #ccc",
                    cursor: disabled ? "not-allowed" : "pointer",
                    opacity: disabled ? 0.4 : 1,
                  }}
                >
                  {r === "keeper" ? "🧤 KEEPER" : "⚽ VELD"}
                </button>
              );
            })}
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Btn bg={G.green} onClick={addPlayer}>➕ TOEVOEGEN</Btn>
            <span style={{ fontSize: 13, color: "#666", fontWeight: 700 }}>{players.length} spelers totaal</span>
          </div>
        </div>
      </Panel>

      <Panel title="BESCHIKBAARHEID" color={G.red} icon="🗓️">
        <Card style={{ padding: "12px 14px", background: "#fff8e0", boxShadow: "none" }}>
          <p style={{ fontSize: 13, lineHeight: 1.7 }}>
            Selecteer jouw profiel hierboven om je <strong>vrije-dag voorkeuren</strong> in te geven.
            De admin verwerkt dit in het rooster.
            {sched ? " ✅ Er is al een rooster beschikbaar!" : " ⏳ Nog geen rooster gegenereerd."}
          </p>
        </Card>
      </Panel>
    </div>
  );
}

// ── ROSTER VIEW ───────────────────────────────────────────────────────────────
function RosterView({ players, sched, avail }) {
  const [openDate, setOpenDate] = useState(null);
  const today = new Date();
  const fieldPlayers = players.filter(p => p.role === "veld");

  if (!sched) {
    return (
      <div style={{ textAlign: "center", padding: "60px 0" }}>
        <Mascot size={88} />
        <div style={{ fontFamily: "Bangers, cursive", fontSize: 28, letterSpacing: 3, marginTop: 12, color: G.brown }}>
          NOG GEEN ROOSTER!
        </div>
        <div style={{ fontSize: 14, marginTop: 6 }}>Ga naar Spelers en klik op Genereer Rooster.</div>
      </div>
    );
  }

  return (
    <div>
      <Panel title="WIE SPEELT WANNEER?" color={G.green} icon="📋">
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MATCH_DATES.map((date, i) => {
            const entry = sched[date];
            const isOpen = openDate === date;
            const isPast = new Date(date + "T00:00:00") < today;
            const present = [entry.keeper, ...(entry.players || [])].filter(Boolean);

            return (
              <button
                key={date}
                onClick={() => setOpenDate(isOpen ? null : date)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  background: isOpen ? "#fffbe6" : "white",
                  border: "3px solid " + (isOpen ? G.orange : G.ink),
                  borderRadius: 10,
                  boxShadow: "4px 4px 0 " + (isOpen ? G.orange : G.ink),
                  padding: "12px 14px",
                  opacity: isPast ? 0.55 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div style={{
                      width: 38, height: 38, borderRadius: 8, flexShrink: 0,
                      background: isOpen ? G.gold : G.blue,
                      border: "2.5px solid " + G.ink,
                      boxShadow: "2px 2px 0 " + G.ink,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "Bangers, cursive", fontSize: 20,
                      color: isOpen ? G.ink : "white",
                    }}>
                      {i + 1}
                    </div>
                    <div>
                      <div style={{ fontFamily: "Bangers, cursive", fontSize: 18, letterSpacing: 1 }}>{fmtDate(date)}</div>
                      <div style={{ fontSize: 11, color: "#666", marginTop: 1 }}>
                        {present.length} aanwezig · {entry.skipped?.length || 0} skippen
                      </div>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ display: "flex", gap: 3 }}>
                      {fieldPlayers.map(p => (
                        <div
                          key={p.id}
                          title={p.name}
                          style={{
                            width: 9, height: 9, borderRadius: "50%",
                            background: entry.players?.some(fp => fp.id === p.id) ? G.green : "#ddd",
                            border: "1.5px solid #999",
                          }}
                        />
                      ))}
                    </div>
                    <span style={{ fontFamily: "Bangers, cursive", fontSize: 16, color: "#888" }}>{isOpen ? "▲" : "▼"}</span>
                  </div>
                </div>

                {isOpen && (
                  <div style={{ marginTop: 14, paddingTop: 12, borderTop: "2px dashed #ccc" }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontFamily: "Bangers, cursive", fontSize: 15, letterSpacing: 1, color: G.green, marginBottom: 7 }}>✓ AANWEZIG</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {entry.keeper && <Tag bg={G.orange}>🧤 {entry.keeper.name}</Tag>}
                        {entry.players?.map(p => <Tag key={p.id} bg={G.green}>⚽ {p.name}</Tag>)}
                      </div>
                    </div>
                    {entry.skipped?.length > 0 && (
                      <div style={{ marginBottom: 8 }}>
                        <div style={{ fontFamily: "Bangers, cursive", fontSize: 15, letterSpacing: 1, color: "#999", marginBottom: 7 }}>— SKIPT</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {entry.skipped.map(p => {
                            const had = avail[p.id]?.[i];
                            return (
                              <Tag key={p.id} bg={had ? G.brown : "#aaa"}>
                                {p.name}{had ? " ⭐" : ""}
                              </Tag>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 11, color: "#888", marginTop: 6, fontStyle: "italic" }}>
                          ⭐ had voorkeur vrij · geen ster = eerlijk aan de beurt
                        </div>
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
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {players.map(p => {
            const pc = MATCH_DATES.filter(date => {
              const e = sched[date];
              return e && (e.keeper?.id === p.id || e.players?.some(fp => fp.id === p.id));
            }).length;
            const sc = MATCH_DATES.length - pc;
            const pct = Math.round((pc / MATCH_DATES.length) * 100);
            return (
              <Card key={p.id} style={{ padding: "10px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{p.role === "keeper" ? "🧤" : "⚽"}</span>
                    <span style={{ fontFamily: "Bangers, cursive", fontSize: 17, letterSpacing: 1 }}>{p.name}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    <span style={{ color: G.green }}>{pc}×</span>
                    <span style={{ color: "#ccc" }}> / </span>
                    <span style={{ color: G.red }}>{sc}× skipt</span>
                  </div>
                </div>
                <div style={{ height: 8, background: "#eee", borderRadius: 4, border: "1.5px solid #ccc", overflow: "hidden" }}>
                  <div style={{ height: "100%", width: pct + "%", background: G.green, borderRadius: 4 }} />
                </div>
              </Card>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

// ── ADMIN VIEW ────────────────────────────────────────────────────────────────
function AdminView({ players, sched, avail, toggleAvail, genSchedule, adminTab, setAdminTab }) {
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {[["schedule", "📋 ROOSTER"], ["availability", "📅 BESCHIKBAARHEID"]].map(([t, label]) => (
          <button
            key={t}
            onClick={() => setAdminTab(t)}
            style={{
              fontFamily: "Bangers, cursive", fontSize: 16, letterSpacing: 1.5,
              padding: "8px 18px", borderRadius: 8,
              border: "2.5px solid " + G.ink,
              background: adminTab === t ? G.gold : "white",
              boxShadow: adminTab === t ? "4px 4px 0 " + G.ink : "2px 2px 0 #ccc",
              cursor: "pointer",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {adminTab === "schedule" && (
        <Panel title="BEHEER ROOSTER" color={G.red} icon="⚙️">
          <div style={{ marginBottom: 14, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <Btn bg={G.red} onClick={genSchedule}>🔄 HERBEREKEN</Btn>
            <span style={{ fontSize: 12, color: "#666", fontStyle: "italic" }}>Eerlijk algoritme op basis van speelhistorie + voorkeuren</span>
          </div>
          {!sched ? (
            <Card style={{ padding: 30, textAlign: "center", color: "#888" }}>Nog geen rooster. Klik op herberekenen.</Card>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {MATCH_DATES.map((date, i) => {
                const entry = sched[date];
                return (
                  <Card key={date} style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div>
                        <span style={{ fontFamily: "Bangers, cursive", fontSize: 18, letterSpacing: 1 }}>RONDE {i + 1}</span>
                        <span style={{ marginLeft: 10, fontSize: 12, color: "#666" }}>{fmtDate(date)}</span>
                      </div>
                      <div style={{ fontSize: 11, display: "flex", gap: 8 }}>
                        {entry.honored > 0 && <span style={{ color: G.green, fontWeight: 700 }}>✓ {entry.honored} voorkeur ok</span>}
                        {entry.missed > 0 && <span style={{ color: G.orange, fontWeight: 700 }}>⚡ {entry.missed} kon niet</span>}
                      </div>
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: entry.skipped?.length ? 8 : 0 }}>
                      {entry.keeper && <Tag bg={G.orange}>🧤 {entry.keeper.name}</Tag>}
                      {entry.players?.map(p => <Tag key={p.id} bg={G.green}>⚽ {p.name}</Tag>)}
                    </div>
                    {entry.skipped?.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {entry.skipped.map(p => {
                          const had = avail[p.id]?.[i];
                          return <Tag key={p.id} bg={had ? G.brown : "#bbb"}>{p.name}{had ? " ⭐" : ""}</Tag>;
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
          <p style={{ fontSize: 12, color: "#555", marginBottom: 12, fontStyle: "italic" }}>
            ✓ = beschikbaar · ✕ = voorkeur vrij (hint voor het rooster)
          </p>
          <div style={{ overflowX: "auto" }}>
            <table style={{ borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 10px", fontFamily: "Bangers, cursive", fontSize: 14, letterSpacing: 1 }}>SPELER</th>
                  {MATCH_DATES.map((d, i) => (
                    <th key={d} style={{ padding: "5px 3px", textAlign: "center", fontSize: 10, fontWeight: 700, color: "#555", minWidth: 28 }}>R{i + 1}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {players.map(p => (
                  <tr key={p.id} style={{ borderTop: "2px solid #eee" }}>
                    <td style={{ padding: "6px 10px", fontWeight: 700, whiteSpace: "nowrap" }}>
                      {p.role === "keeper" ? "🧤" : "⚽"} {p.name}
                    </td>
                    {MATCH_DATES.map((d, i) => {
                      const free = avail[p.id]?.[i];
                      return (
                        <td key={d} style={{ textAlign: "center", padding: 3 }}>
                          <button
                            onClick={() => toggleAvail(p.id, i)}
                            style={{
                              width: 26, height: 26, borderRadius: 5,
                              border: "2px solid " + G.ink,
                              background: free ? G.red : "#d4f5d4",
                              color: free ? "white" : G.green,
                              cursor: "pointer", fontSize: 13, fontWeight: 900,
                              boxShadow: "1px 1px 0 " + G.ink,
                            }}
                          >
                            {free ? "✕" : "✓"}
                          </button>
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
    </div>
  );
}

// ── PLAYER VIEW ───────────────────────────────────────────────────────────────
function PlayerView({ player, players, sched, avail, toggleAvail, mySchedule, swapReq, startSwap, sendSwap, myOffers, acceptSwap, declineSwap }) {
  const schedule = mySchedule(player.id);
  const playCount = schedule.filter(d => d.playing).length;
  const skipCount = schedule.filter(d => !d.playing).length;

  return (
    <div>
      <Card style={{ padding: "18px 20px", marginBottom: 20, background: "#fffbe6", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
          <Mascot size={70} />
          <Bubble text={"HEY " + player.name.toUpperCase() + "!"} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "Bangers, cursive", fontSize: 30, letterSpacing: 2, lineHeight: 1 }}>{player.name}</div>
          <div style={{ fontSize: 11, color: G.brown, textTransform: "uppercase", letterSpacing: 2, fontWeight: 700 }}>{player.role}</div>
        </div>
        <div style={{ display: "flex", gap: 14 }}>
          <Card style={{ padding: "10px 16px", textAlign: "center", background: "#d4f5d4", boxShadow: "3px 3px 0 " + G.green, borderColor: G.green }}>
            <div style={{ fontFamily: "Bangers, cursive", fontSize: 32, color: G.green, lineHeight: 1 }}>{playCount}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>SPEELT</div>
          </Card>
          <Card style={{ padding: "10px 16px", textAlign: "center", background: "#ffe0e0", boxShadow: "3px 3px 0 " + G.red, borderColor: G.red }}>
            <div style={{ fontFamily: "Bangers, cursive", fontSize: 32, color: G.red, lineHeight: 1 }}>{skipCount}</div>
            <div style={{ fontSize: 11, fontWeight: 700 }}>SKIPT</div>
          </Card>
        </div>
      </Card>

      {myOffers.length > 0 && (
        <Panel title="RUILVERZOEKEN!" color={G.red} icon="🔄">
          {myOffers.map((offer, idx) => {
            const from = players.find(p => p.id === offer.fromId);
            return (
              <Card key={idx} style={{ padding: "12px 14px", marginBottom: 8, background: "#fff8e0" }}>
                <p style={{ fontWeight: 700, marginBottom: 10 }}>
                  <strong>{from?.name}</strong> wil ruilen voor Ronde {offer.di + 1} ({fmtDate(MATCH_DATES[offer.di])})
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <Btn small bg={G.green} onClick={() => acceptSwap(offer)}>✓ ACCEPTEREN</Btn>
                  <Btn small bg={G.red} onClick={() => declineSwap(offer)}>✕ AFWIJZEN</Btn>
                </div>
              </Card>
            );
          })}
        </Panel>
      )}

      <Panel title="MIJN SPEELSCHEMA" color={G.green} icon="📅">
        {!sched ? (
          <div style={{ fontSize: 14, color: "#888", fontStyle: "italic", padding: "16px 0" }}>Nog geen rooster. Vraag de admin.</div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {schedule.map(({ date, di, playing, entry }) => {
                const isFree = avail[player.id]?.[di];
                const isActive = swapReq?.pid === player.id && swapReq?.di === di;
                const teammates = entry ? [entry.keeper, ...(entry.players || [])].filter(p => p && p.id !== player.id) : [];

                return (
                  <Card
                    key={date}
                    color={isActive ? G.red : playing ? G.green : undefined}
                    style={{ padding: "10px 13px", background: isActive ? "#fff8f0" : playing ? "#f0fff4" : "#fafafa" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
                          background: playing ? G.green : "#ccc",
                          border: "2px solid " + G.ink,
                        }} />
                        <div>
                          <div style={{ fontFamily: "Bangers, cursive", fontSize: 17, letterSpacing: 1 }}>
                            RONDE {di + 1} — {fmtDate(date)}
                          </div>
                          {playing && teammates.length > 0 && (
                            <div style={{ fontSize: 11, color: "#555", marginTop: 1 }}>
                              Met: {teammates.map(p => p.name).join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                        {playing ? (
                          <>
                            <Tag bg={G.green}>✓ SPEELT</Tag>
                            {!swapReq && <Btn small bg={G.orange} onClick={() => startSwap(player.id, di)}>🔄 RUILEN</Btn>}
                            {isActive && <Tag bg={G.red}>↓ KIES SPELER</Tag>}
                          </>
                        ) : (
                          <Tag bg="#aaa">— SKIPT</Tag>
                        )}
                        <button
                          onClick={() => toggleAvail(player.id, di)}
                          style={{
                            fontFamily: "Bangers, cursive", fontSize: 12, letterSpacing: 0.5,
                            padding: "4px 10px", borderRadius: 6,
                            border: "2px solid " + (isFree ? G.red : "#ccc"),
                            background: isFree ? "#ffe0e0" : "white",
                            color: isFree ? G.red : "#888",
                            cursor: "pointer",
                            boxShadow: "2px 2px 0 " + (isFree ? G.red : "#ccc"),
                          }}
                        >
                          {isFree ? "⭐ VOORKEUR VRIJ" : "☆ VRIJ?"}
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            {swapReq && (
              <Card style={{ marginTop: 14, padding: "14px 16px", background: "#fff8e0", borderColor: G.red, boxShadow: "5px 5px 0 " + G.red }}>
                <div style={{ fontFamily: "Bangers, cursive", fontSize: 18, letterSpacing: 1, color: G.red, marginBottom: 10 }}>
                  🔄 RONDE {swapReq.di + 1} — KIES MET WIE:
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {players.filter(p => p.id !== player.id).map(p => (
                    <Btn key={p.id} small bg={G.blue} onClick={() => sendSwap(p.id, swapReq.di)}>{p.name}</Btn>
                  ))}
                  <Btn small outline onClick={() => startSwap(null, null)}>ANNULEREN</Btn>
                </div>
              </Card>
            )}
          </>
        )}
      </Panel>

      <Panel title="MIJN VRIJE-DAG VOORKEUR" color={G.brown} icon="🗓️">
        <Card style={{ padding: "11px 14px", marginBottom: 14, background: "#fff8e0", boxShadow: "none" }}>
          <p style={{ fontSize: 13, lineHeight: 1.7 }}>
            Geef aan wanneer je <strong>liever vrij bent</strong>. Het rooster houdt hier zoveel mogelijk
            rekening mee, maar een eerlijke verdeling gaat altijd voor!
          </p>
        </Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(108px, 1fr))", gap: 8 }}>
          {MATCH_DATES.map((date, i) => {
            const isFree = avail[player.id]?.[i];
            const isPlaying = sched
              ? (sched[date]?.keeper?.id === player.id || sched[date]?.players?.some(p => p.id === player.id))
              : null;
            return (
              <button
                key={date}
                onClick={() => toggleAvail(player.id, i)}
                style={{
                  padding: "10px 6px",
                  borderRadius: 10,
                  border: "3px solid " + (isFree ? G.red : G.ink),
                  background: isFree ? "#ffe0e0" : "white",
                  boxShadow: "3px 3px 0 " + (isFree ? G.red : G.ink),
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 10, color: "#888", marginBottom: 2 }}>Ronde {i + 1}</div>
                <div style={{ fontFamily: "Bangers, cursive", fontSize: 14, letterSpacing: 0.5 }}>{fmtDate(date)}</div>
                {isFree && <div style={{ fontSize: 10, marginTop: 4, fontWeight: 900, color: G.red }}>VOORKEUR VRIJ!</div>}
                {sched && isPlaying !== null && (
                  <div style={{ fontSize: 10, marginTop: 3, color: isPlaying ? G.green : "#aaa", fontWeight: 700 }}>
                    {isPlaying ? "↗ speelt" : "↘ skipt"}
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

// ── ADMIN LOGIN ───────────────────────────────────────────────────────────────
function AdminLogin({ adminPwInput, setAdminPwInput, adminPwError, tryAdminLogin }) {
  return (
    <div style={{ maxWidth: 400, margin: "0 auto" }}>
      <Panel title="ADMIN TOEGANG" color={G.red} icon="🔒">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>
            <Mascot size={80} />
          </div>
          <Card style={{ padding: "12px 14px", background: "#fff8e0", boxShadow: "none" }}>
            <p style={{ fontSize: 13, lineHeight: 1.7, textAlign: "center" }}>
              De admin-pagina is beveiligd. Voer het wachtwoord in om verder te gaan.
            </p>
          </Card>
          <input
            type="password"
            value={adminPwInput}
            onChange={e => setAdminPwInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && tryAdminLogin()}
            placeholder="Wachtwoord..."
            autoFocus
            style={{
              border: "3px solid " + (adminPwError ? G.red : G.ink),
              borderRadius: 8,
              padding: "12px 16px",
              fontSize: 18,
              background: adminPwError ? "#ffe0e0" : "#fffdf0",
              boxShadow: "3px 3px 0 " + (adminPwError ? G.red : G.ink),
              textAlign: "center",
              letterSpacing: 4,
            }}
          />
          {adminPwError && (
            <div style={{
              fontFamily: "Bangers, cursive",
              fontSize: 18,
              letterSpacing: 2,
              color: G.red,
              textAlign: "center",
              animation: "shake 0.3s",
            }}>
              ❌ FOUT WACHTWOORD!
            </div>
          )}
          <Btn bg={G.red} onClick={tryAdminLogin}>🔓 INLOGGEN</Btn>
        </div>
      </Panel>
    </div>
  );
}
