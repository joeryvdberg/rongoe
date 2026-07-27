// Shared Powerleague markdown / table snapshot parsing (used by the app and scripts/sync-competition.mjs).

export function stripActionNoise(s = "") {
  return s
    .replace(/\{[^}]*\}/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/["]+/g, " ")
    .trim();
}

export function cleanTeamName(s = "") {
  const cleaned = stripActionNoise(s)
    .replace(/^\[|\]$/g, "")
    .replace(/^.*?>\s*/g, "")
    .replace(/[|]/g, " ")
    .replace(/^[^A-Za-zÀ-ÖØ-öø-ÿ]+/, "")
    .trim();
  return cleaned.replace(/\s{2,}/g, " ").trim();
}

export function parseClubCell(cell = "") {
  const parts = cell.split("\">");
  return cleanTeamName(parts[parts.length - 1] || cell);
}

export function parseNlDateTime(dateStr = "", timeStr = "00:00") {
  const [dd, mm, yyyy] = dateStr.split("/").map(Number);
  const [hh, mi] = timeStr.split(":").map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd, Number.isFinite(hh) ? hh : 0, Number.isFinite(mi) ? mi : 0, 0, 0);
}

function parseNlDate(s) {
  const [dd, mm, yyyy] = s.split("/").map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);
}

export function extractTeamPairFromLine(line, knownTeams = []) {
  const matches = knownTeams
    .map(name => ({ name, idx: line.indexOf(name) }))
    .filter(m => m.idx >= 0)
    .sort((a, b) => a.idx - b.idx);
  if (matches.length < 2) return null;
  return [matches[0].name, matches[1].name];
}

/** Powerleague sometimes renders negative goal diff as "9-1" glued to GA without a space. */
function normalizeMarkdownStandingTail(rawTail) {
  return rawTail.replace(/(\d)(-\d+)(?=\s|$)/g, "$1 $2").replace(/\s+/g, " ").trim();
}

export function parseMarkdownStandingLine(line) {
  const m = line.match(/^(\d+)\[([^\]]+)\]\([^)]*\)\s*(.+)$/);
  if (!m) return null;
  const parts = normalizeMarkdownStandingTail(m[3]).split(/\s+/);
  if (parts.length !== 8) return null;
  const nums = parts.map(Number);
  if (nums.some(n => Number.isNaN(n))) return null;
  const [played, won, drawn, lost, gf, ga, gd, points] = nums;
  return {
    pos: Number(m[1]) || 0,
    club: cleanTeamName(m[2]),
    played, won, drawn, lost, gf, ga, gd, points,
  };
}

/**
 * @param {string} snapshot
 * @returns {{ standings: object[], topTeams: object[], nextGames: object[], lastRoundLabel: string, lastRoundResults: object[] }}
 */
export function parseCompetitionSnapshot(snapshot) {
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
    standings = lines.map(parseMarkdownStandingLine).filter(Boolean);
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
  const nextGamesRaw = fixtureVsLines.slice(0, 80).map((line, i) => {
    const compact = stripActionNoise(line);
    const pair = extractTeamPairFromLine(compact, knownTeams);
    if (!pair) return null;
    const kickoff = fixtureTimes[i] || "";
    const [date = "", timeFromKickoff = ""] = kickoff.split(/\s+/);
    const inlineTime = compact.match(/(\d{2}:\d{2})$/)?.[1] || "";
    const time = timeFromKickoff || inlineTime;
    return {
      date,
      time,
      home: pair[0],
      away: pair[1],
    };
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
    .slice(0, 80);

  // Markdown results: **[date]** then `[Home](url)3 5[Away](url)` (scores touch both links)
  const mdResultRows = [];
  let mdResultRound = "";
  for (const line of lines) {
    const dm = line.match(/^\*\*(\d{2}\/\d{2}\/\d{4})\*\*$/);
    if (dm) {
      mdResultRound = dm[1];
      continue;
    }
    const rm = line.match(/^\[([^\]]+)\]\([^)]*\)\s*(\d+)\s+(\d+)\s*\[([^\]]+)\]\([^)]*\)\s*$/);
    if (!rm || !mdResultRound) continue;
    if (line.includes(" vs ")) continue;
    mdResultRows.push({
      date: mdResultRound,
      home: cleanTeamName(rm[1]),
      homeScore: Number(rm[2]),
      awayScore: Number(rm[3]),
      away: cleanTeamName(rm[4]),
    });
  }

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const dateLinesRaw = lines
    .filter(line => /^\|\s*\d{2}\/\d{2}\/\d{4}\s*\|$/.test(line))
    .map(line => line.replace(/\|/g, "").trim())
    .concat(
      lines
        .filter(line => /^\*\*\d{2}\/\d{2}\/\d{4}\*\*$/.test(line))
        .map(line => line.replace(/\*/g, "")),
    );

  function pickLatestPastLabel(candidates) {
    const uniq = [...new Set(candidates.filter(Boolean))];
    const past = uniq
      .map(d => ({ d, t: parseNlDate(d)?.getTime() }))
      .filter(x => x.t && x.t <= today.getTime())
      .sort((a, b) => b.t - a.t);
    return past[0]?.d || "";
  }

  let lastRoundResults = [];

  let lastRoundLabel = pickLatestPastLabel(mdResultRows.map(r => r.date));
  if (lastRoundLabel && mdResultRows.length) {
    lastRoundResults = mdResultRows
      .filter(r => r.date === lastRoundLabel && !Number.isNaN(r.homeScore) && !Number.isNaN(r.awayScore))
      .map(r => ({ home: r.home, homeScore: r.homeScore, awayScore: r.awayScore, away: r.away }));
  }

  if (!lastRoundLabel) {
    lastRoundLabel = pickLatestPastLabel(dateLinesRaw);
  }

  if (!lastRoundResults.length) {
    const resultRegex = /\b(\d+)\s+(\d+)\b/;
    const seen = new Set();
    const legacyResults = [];
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
      legacyResults.push({ home, homeScore, awayScore, away });
      if (legacyResults.length >= 8) break;
    }
    lastRoundResults = legacyResults;
  }

  lastRoundResults = lastRoundResults.slice(0, 4);

  return {
    standings,
    topTeams: standings.slice(0, 3).map(t => ({ pos: t.pos, club: t.club, played: t.played, won: t.won, points: t.points })),
    nextGames,
    lastRoundLabel,
    lastRoundResults,
  };
}

function parseNlDateOnly(dateStr = "") {
  const [dd, mm, yyyy] = dateStr.split("/").map(Number);
  if (!dd || !mm || !yyyy) return null;
  return new Date(yyyy, mm - 1, dd, 12, 0, 0, 0);
}

/** Higher = newer competition snapshot (ignore future-only round labels). */
export function competitionRecencyScore(data, nowMs = Date.now()) {
  const dt = parseNlDateOnly(data?.lastRoundLabel || "");
  let lastRoundTs = 0;
  if (dt?.getTime() && dt.getTime() <= nowMs) lastRoundTs = dt.getTime();
  const totalPlayed = Array.isArray(data?.standings)
    ? data.standings.reduce((sum, row) => sum + (Number(row.played) || 0), 0)
    : 0;
  const resultCount = Array.isArray(data?.lastRoundResults) ? data.lastRoundResults.length : 0;
  return { lastRoundTs, totalPlayed, resultCount };
}

export function isCompetitionDataFresher(incoming, current, nowMs = Date.now()) {
  const inc = competitionRecencyScore(incoming, nowMs);
  const cur = competitionRecencyScore(current, nowMs);
  if (inc.lastRoundTs > cur.lastRoundTs) return true;
  if (inc.lastRoundTs < cur.lastRoundTs && cur.lastRoundTs > 0) return false;
  if (inc.totalPlayed > cur.totalPlayed) return true;
  if (inc.totalPlayed < cur.totalPlayed && cur.totalPlayed > 0) return false;
  if (inc.resultCount > cur.resultCount) return true;
  return inc.totalPlayed >= cur.totalPlayed;
}

/** Prefer live scrape over static feed when scores tie or incoming is newer. */
export function pickFresherCompetitionPayload(liveParsed, feedParsed, nowMs = Date.now()) {
  if (liveParsed && !feedParsed) return { payload: liveParsed, source: "live" };
  if (feedParsed && !liveParsed) return { payload: feedParsed, source: "feed" };
  if (!liveParsed && !feedParsed) return { payload: null, source: null };
  if (isCompetitionDataFresher(liveParsed, feedParsed, nowMs)) return { payload: liveParsed, source: "live" };
  if (isCompetitionDataFresher(feedParsed, liveParsed, nowMs)) return { payload: feedParsed, source: "feed" };
  return { payload: liveParsed, source: "live" };
}
