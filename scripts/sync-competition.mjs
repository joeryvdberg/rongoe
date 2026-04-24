import { writeFile } from "node:fs/promises";

const SOURCE_URL = "https://www.powerleague.com/nl/competitie?league_id=997ebdeb-bbf2-d0a4-e814-cfa760326bc5&division_id=997ebdeb-bbf2-d0a4-e814-cfa7c0da8fc5";
const OUT_PATH = new URL("../public/competition-live.json", import.meta.url);

function stripActionNoise(s = "") {
  return s
    .replace(/\{[^}]*\}/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/["]+/g, " ")
    .trim();
}

function cleanTeamName(s = "") {
  const cleaned = stripActionNoise(s)
    .replace(/^\[|\]$/g, "")
    .replace(/^.*?>\s*/g, "")
    .replace(/[|]/g, " ")
    .replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ]+/, "")
    .trim();
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

function parseClubCell(cell = "") {
  const parts = cell.split("\">");
  return cleanTeamName(parts[parts.length - 1] || cell);
}

function parseNlDateTime(dateStr = "", timeStr = "00:00") {
  const [dd, mm, yyyy] = dateStr.split("/").map(Number);
  const [hh, mi] = timeStr.split(":").map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd, Number.isFinite(hh) ? hh : 0, Number.isFinite(mi) ? mi : 0, 0, 0);
}

function extractTeamPairFromLine(line, knownTeams = []) {
  const matches = knownTeams
    .map(name => ({ name, idx: line.indexOf(name) }))
    .filter(m => m.idx >= 0)
    .sort((a, b) => a.idx - b.idx);
  if (matches.length < 2) return null;
  return [matches[0].name, matches[1].name];
}

function parseCompetitionSnapshot(snapshot) {
  const lines = snapshot.split(/\r?\n/).map(l => l.trim());

  const standings = lines
    .filter(line => /^\|\s*\d+\s*\|/.test(line))
    .map(line => line.split("|").map(c => c.trim()).filter(Boolean))
    .filter(cells => cells.length >= 10)
    .map(cells => ({
      pos: Number(cells[0]) || 0,
      club: parseClubCell(cells[1]),
      played: Number(cells[2]) || 0,
      won: Number(cells[3]) || 0,
      drawn: Number(cells[4]) || 0,
      lost: Number(cells[5]) || 0,
      gf: Number(cells[6]) || 0,
      ga: Number(cells[7]) || 0,
      gd: Number(cells[8]) || 0,
      points: Number(cells[9]) || 0,
    }))
    .filter(row => row.club);
  const knownTeams = standings.map(s => s.club);

  const fixtureVsLines = lines.filter(line => line.includes(" vs ") && (line.includes("\">") || line.includes("Glory Boyz")));
  const fixtureTimes = lines
    .filter(line => /^\|\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*\|$/.test(line))
    .map(line => line.replace(/\|/g, "").trim());
  const nextGamesRaw = fixtureVsLines.slice(0, 12).map((line, i) => {
    const compact = stripActionNoise(line);
    const pair = extractTeamPairFromLine(compact, knownTeams);
    if (!pair) return null;
    const kickoff = fixtureTimes[i] || "";
    const [date = "", time = ""] = kickoff.split(/\s+/);
    return { date, time, home: pair[0], away: pair[1] };
  }).filter(Boolean);
  const nextGamesSeen = new Set();
  const nextGames = nextGamesRaw
    .filter(m => m.date && m.time && m.home && m.away)
    .filter(m => {
      const key = `${m.date}|${m.time}|${m.home}|${m.away}`;
      if (nextGamesSeen.has(key)) return false;
      nextGamesSeen.add(key);
      return true;
    })
    .sort((a, b) => {
      const ta = parseNlDateTime(a.date, a.time)?.getTime() || 0;
      const tb = parseNlDateTime(b.date, b.time)?.getTime() || 0;
      return ta - tb;
    })
    .slice(0, 8);

  const resultRegex = /\b(\d+)\s+(\d+)\b/;
  const seen = new Set();
  const lastRoundResults = [];
  for (const line of lines) {
    if (line.includes(" vs ") || line.startsWith("|")) continue;
    const cleanLine = stripActionNoise(line);
    const m = cleanLine.match(resultRegex);
    if (!m) continue;
    const pair = extractTeamPairFromLine(cleanLine, knownTeams);
    if (!pair) continue;
    const home = pair[0];
    const away = pair[1];
    const homeScore = Number(m[1]);
    const awayScore = Number(m[2]);
    if (!home || !away || Number.isNaN(homeScore) || Number.isNaN(awayScore)) continue;
    const key = `${home}|${homeScore}|${awayScore}|${away}`;
    if (seen.has(key)) continue;
    seen.add(key);
    lastRoundResults.push({ home, homeScore, awayScore, away });
    if (lastRoundResults.length >= 8) break;
  }

  const dateLines = lines
    .filter(line => /^\|\s*\d{2}\/\d{2}\/\d{4}\s*\|$/.test(line))
    .map(line => line.replace(/\|/g, "").trim());
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const parseNlDate = (s) => {
    const [dd, mm, yyyy] = s.split("/").map(Number);
    if (!dd || !mm || !yyyy) return null;
    return new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);
  };
  const lastRoundLabel = dateLines.find(d => {
    const dt = parseNlDate(d);
    return dt && dt <= today;
  }) || dateLines[0] || "";

  return {
    sourceUrl: SOURCE_URL,
    leagueName: "Thursday Late League S38",
    city: "Amsterdam",
    venue: "Sportspark Olympiaplein",
    format: "Men's 5s",
    gameDay: "Donderdag",
    gamePrice: "EUR 57.00 per game",
    updatedLabel: "Live sync op " + new Date().toLocaleString("nl-NL"),
    topTeams: standings.slice(0, 3).map(t => ({ pos: t.pos, club: t.club, played: t.played, won: t.won, points: t.points })),
    standings,
    nextGames,
    lastRoundLabel,
    lastRoundResults: lastRoundResults.slice(0, 4),
  };
}

async function fetchSnapshot() {
  const candidates = [
    "https://r.jina.ai/http://" + SOURCE_URL.replace(/^https?:\/\//, ""),
    "https://api.allorigins.win/raw?url=" + encodeURIComponent(SOURCE_URL),
    SOURCE_URL,
  ];
  let lastErr = null;
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();
      if (text && (text.includes("Current standings") || text.includes("| Pos | Club |"))) return text;
      throw new Error("Unexpected format");
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Could not fetch competition data");
}

const snapshot = await fetchSnapshot();
const parsed = parseCompetitionSnapshot(snapshot);
if (parsed.standings.length < 6 || parsed.nextGames.length < 1 || parsed.lastRoundResults.length < 1) {
  throw new Error("Parsed competition data incomplete; aborting feed update.");
}
await writeFile(OUT_PATH, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
console.log("Updated public/competition-live.json");
