import { readFile, writeFile } from "node:fs/promises";

const SOURCE_URL = "https://www.powerleague.com/nl/competitie?league_id=fd12d044-1e65-6cbb-ee14-812e80a0f3b6&division_id=fd12d044-1e65-6cbb-ee14-812e285bfab6";
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

function parseNlDate(dateStr = "") {
  const [dd, mm, yyyy] = dateStr.split("/").map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);
}

function recencyScore(data) {
  const lastRoundTs = parseNlDate(data?.lastRoundLabel || "")?.getTime() || 0;
  const totalPlayed = Array.isArray(data?.standings)
    ? data.standings.reduce((sum, row) => sum + (Number(row.played) || 0), 0)
    : 0;
  return { lastRoundTs, totalPlayed };
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

  let standings = lines
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
  if (!standings.length) {
    standings = lines
      .map(line => {
        const m = line.match(/^(\d+)\[([^\]]+)\]\([^)]+\)\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(-?\d+)\s+(\d+)$/);
        if (!m) return null;
        return {
          pos: Number(m[1]) || 0,
          club: cleanTeamName(m[2]),
          played: Number(m[3]) || 0,
          won: Number(m[4]) || 0,
          drawn: Number(m[5]) || 0,
          lost: Number(m[6]) || 0,
          gf: Number(m[7]) || 0,
          ga: Number(m[8]) || 0,
          gd: Number(m[9]) || 0,
          points: Number(m[10]) || 0,
        };
      })
      .filter(Boolean);
  }
  const knownTeams = standings.map(s => s.club);

  let fixtureVsLines = lines.filter(line => line.includes(" vs ") && (line.includes("\">") || line.includes("Glory Boyz")));
  let fixtureTimes = lines
    .filter(line => /^\|\s*\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}\s*\|$/.test(line))
    .map(line => line.replace(/\|/g, "").trim());
  if (!fixtureVsLines.length) {
    fixtureVsLines = lines.filter(line => /\[[^\]]+\]\([^)]+\)\s*vs\s*\[[^\]]+\]\([^)]+\)\d{2}:\d{2}$/.test(line));
    fixtureTimes = fixtureVsLines.map(() => "");
  }
  const nextGamesRaw = fixtureVsLines.slice(0, 12).map((line, i) => {
    const compact = stripActionNoise(line);
    const pair = extractTeamPairFromLine(compact, knownTeams);
    if (!pair) return null;
    const inlineTime = compact.match(/(\d{2}:\d{2})$/)?.[1] || "";
    const kickoff = fixtureTimes[i] || "";
    const [date = "", timeFromKickoff = ""] = kickoff.split(/\s+/);
    const time = timeFromKickoff || inlineTime;
    return { date, time, home: pair[0], away: pair[1] };
  }).filter(Boolean);
  if (!nextGamesRaw.length || nextGamesRaw.some(m => !m.date)) {
    let activeDate = "";
    const rebuilt = [];
    lines.forEach(line => {
      const dateMarker = line.match(/^\*\*(\d{2}\/\d{2}\/\d{4})\*\*$/);
      if (dateMarker) {
        activeDate = dateMarker[1];
        return;
      }
      const game = line.match(/^\[([^\]]+)\]\([^)]+\)\s*vs\s*\[([^\]]+)\]\([^)]+\)\s*(?:(\d{2}\/\d{2}\/\d{4})\s+)?(\d{2}:\d{2})$/);
      if (!game) return;
      const gameDate = game[3] || activeDate;
      if (!gameDate) return;
      rebuilt.push({
        date: gameDate,
        time: game[4],
        home: cleanTeamName(game[1]),
        away: cleanTeamName(game[2]),
      });
    });
    if (rebuilt.length) {
      nextGamesRaw.splice(0, nextGamesRaw.length, ...rebuilt);
    }
  }
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
    .map(line => line.replace(/\|/g, "").trim())
    .concat(
      lines
        .filter(line => /^\*\*\d{2}\/\d{2}\/\d{4}\*\*$/.test(line))
        .map(line => line.replace(/\*/g, ""))
    );
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
if (parsed.standings.length < 6 || parsed.nextGames.length < 1) {
  throw new Error("Parsed competition data incomplete; aborting feed update.");
}
try {
  const existingRaw = await readFile(OUT_PATH, "utf-8");
  const existing = JSON.parse(existingRaw);
  const current = recencyScore(existing);
  const incoming = recencyScore(parsed);
  const isOlderRound = incoming.lastRoundTs < current.lastRoundTs;
  const isOlderPlayed = incoming.lastRoundTs === current.lastRoundTs && incoming.totalPlayed < current.totalPlayed;
  if (isOlderRound || isOlderPlayed) {
    throw new Error("Incoming competition data appears older than current feed; aborting update.");
  }
} catch (err) {
  // If file doesn't exist we allow first write; all other parse/compare errors should fail sync.
  if (String(err?.message || "").includes("ENOENT")) {
    // first run, continue
  } else {
    throw err;
  }
}
await writeFile(OUT_PATH, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
console.log("Updated public/competition-live.json");
