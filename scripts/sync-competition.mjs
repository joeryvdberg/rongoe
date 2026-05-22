import { readFile, writeFile } from "node:fs/promises";
import { parseCompetitionSnapshot, competitionRecencyScore } from "../src/competition-parse.js";

const SOURCE_URL = "https://www.powerleague.com/nl/competitie?league_id=fd12d044-1e65-6cbb-ee14-812e80a0f3b6&division_id=fd12d044-1e65-6cbb-ee14-812e285bfab6";
const OUT_PATH = new URL("../public/competition-live.json", import.meta.url);


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
const parsedBody = parseCompetitionSnapshot(snapshot);
if (parsedBody.standings.length < 6 || parsedBody.nextGames.length < 1) {
  throw new Error("Parsed competition data incomplete; aborting feed update.");
}

const parsed = {
  sourceUrl: SOURCE_URL,
  leagueName: "Thursday Late League S38",
  city: "Amsterdam",
  venue: "Sportspark Olympiaplein",
  format: "Men's 5s",
  gameDay: "Donderdag",
  gamePrice: "EUR 57.00 per game",
  updatedLabel: "Live sync op " + new Date().toLocaleString("nl-NL"),
  ...parsedBody,
};

const nowMs = Date.now();

try {
  const existingRaw = await readFile(OUT_PATH, "utf-8");
  const existing = JSON.parse(existingRaw);
  const current = competitionRecencyScore(existing, nowMs);
  const incoming = competitionRecencyScore(parsed, nowMs);
  const definitelyStaleCachedPage =
    current.lastRoundTs > 0 &&
    incoming.lastRoundTs > 0 &&
    incoming.lastRoundTs < current.lastRoundTs &&
    incoming.totalPlayed <= current.totalPlayed;
  if (definitelyStaleCachedPage) {
    throw new Error("Incoming competition data appears older than current feed; aborting update.");
  }
} catch (err) {
  if (String(err?.message || "").includes("ENOENT")) {
    // first run
  } else if (String(err?.message || "").includes("Incoming competition data appears older")) {
    console.warn(err.message || err);
    process.exit(0);
  } else {
    throw err;
  }
}
await writeFile(OUT_PATH, JSON.stringify(parsed, null, 2) + "\n", "utf-8");
console.log("Updated public/competition-live.json");
