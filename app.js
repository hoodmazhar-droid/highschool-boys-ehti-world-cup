
const raw = window.LEAGUE_DATA;
let state = structuredClone(raw);
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

const aliases = {
  "usa":"United States","united states":"United States","korea republic":"South Korea","south korea":"South Korea",
  "cabo verde":"Cape Verde","cape verde":"Cape Verde","côte d'ivoire":"Ivory Coast","ivory coast":"Ivory Coast",
  "congo dr":"Congo","dr congo":"Congo","bosnia-herzegovina":"Bosnia and Herzegovina","bosnia and herzegovina":"Bosnia and Herzegovina",
  "ir iran":"Iran","iran":"Iran","türkiye":"Turkey","turkey":"Turkey","curaçao":"Curaçao","curacao":"Curaçao"
};
const clean = s => (s ?? "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const canon = s => aliases[clean(s)] || s;

function teamOwnerMap(){
  const m = new Map();
  state.teams.forEach(p => p.countries.forEach(c => m.set(clean(canon(c)), p.person)));
  return m;
}

function normaliseMatch(m){
  const map = teamOwnerMap();
  const home = canon(m["Home Team"]);
  const away = canon(m["Away Team"]);
  return {...m, home, away, homeOwner: m["Home Owner"] || map.get(clean(home)) || "", awayOwner: m["Away Owner"] || map.get(clean(away)) || ""};
}

function computeTable(){
  const people = state.teams.map(x=>x.person);
  const table = Object.fromEntries(people.map(p => [p,{Person:p,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0}]));
  state.matches.map(normaliseMatch).filter(m => m.Status === "FINISHED" && Number.isFinite(+m["Home Goals"]) && Number.isFinite(+m["Away Goals"])).forEach(m => {
    const hg = +m["Home Goals"], ag = +m["Away Goals"];
    const h = m.homeOwner, a = m.awayOwner;
    if(h && table[h]) { table[h].P++; table[h].GF += hg; table[h].GA += ag; if(hg>ag){table[h].W++; table[h].Pts+=3}else if(hg===ag){table[h].D++; table[h].Pts+=1}else table[h].L++; }
    if(a && table[a]) { table[a].P++; table[a].GF += ag; table[a].GA += hg; if(ag>hg){table[a].W++; table[a].Pts+=3}else if(ag===hg){table[a].D++; table[a].Pts+=1}else table[a].L++; }
  });
  return Object.values(table).map(r=>({...r,GD:r.GF-r.GA}))
    .sort((a,b)=> b.Pts-a.Pts || b.GD-a.GD || b.GF-a.GF || b.W-a.W || a.Person.localeCompare(b.Person))
    .map((r,i)=>({Rank:i+1,...r}));
}

function htmlTable(el, headers, rows, rowFn){
  el.innerHTML = `<thead><tr>${headers.map(h=>`<th class="${h.cls||''}">${h.label}</th>`).join("")}</tr></thead><tbody>${
    rows.map(r=>`<tr>${rowFn(r)}</tr>`).join("")
  }</tbody>`;
}
const fmtDate = d => new Date(d).toLocaleString("en-GB",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
function resultBadge(result){ return `<span class="badge ${result}">${result.toUpperCase()}</span>`; }

function renderKPIs(table){
  const finished = state.matches.filter(m=>m.Status==="FINISHED").length;
  const upcoming = state.matches.filter(m=>m.Status!=="FINISHED").length;
  const goals = state.matches.filter(m=>m.Status==="FINISHED").reduce((s,m)=>s+(+m["Home Goals"]||0)+(+m["Away Goals"]||0),0);
  $("#kpis").innerHTML = [
    ["Players", state.teams.length],["Finished matches", finished],["Upcoming matches", upcoming],["Goals counted", goals]
  ].map(([a,b])=>`<div class="kpi"><span>${a}</span><strong>${b}</strong></div>`).join("");
  const leader = table[0];
  $("#currentLeader").textContent = leader?.Person || "—";
  $("#leaderMeta").textContent = leader ? `${leader.Pts} pts • GD ${leader.GD >= 0 ? "+" : ""}${leader.GD}` : "";
}

function renderLeaderboard(){
  const q = clean($("#tableSearch").value);
  const table = computeTable();
  renderKPIs(table);
  const rows = table.filter(r => clean(r.Person).includes(q));
  htmlTable($("#leaderboardTable"), [
    {label:"#"}, {label:"Player"}, {label:"P",cls:"num"}, {label:"W",cls:"num"}, {label:"D",cls:"num"}, {label:"L",cls:"num"}, {label:"GF",cls:"num"}, {label:"GA",cls:"num"}, {label:"GD",cls:"num"}, {label:"Pts",cls:"num"}
  ], rows, r => `
    <td class="rank">${r.Rank}</td><td><strong>${r.Person}</strong></td><td class="num">${r.P}</td><td class="num">${r.W}</td><td class="num">${r.D}</td><td class="num">${r.L}</td><td class="num">${r.GF}</td><td class="num">${r.GA}</td><td class="num">${r.GD>0?"+":""}${r.GD}</td><td class="num"><strong>${r.Pts}</strong></td>`);
}

function playerRecord(person){
  return computeTable().find(r=>r.Person===person) || {};
}
function playerMatches(person){
  return state.matches.map(normaliseMatch).filter(m => m.homeOwner === person || m.awayOwner === person)
    .sort((a,b)=> new Date(a.DateISO)-new Date(b.DateISO));
}
function renderPlayers(){
  const sel = $("#playerSelect");
  if(!sel.options.length) sel.innerHTML = state.teams.map(p=>`<option>${p.person}</option>`).join("");
  const person = sel.value || state.teams[0].person;
  const teams = state.teams.find(x=>x.person===person)?.countries || [];
  const rec = playerRecord(person);
  $("#playerCards").innerHTML = `
    <div class="card"><h3>${person}</h3><div class="chips">${teams.map(t=>`<span class="chip">${t}</span>`).join("")}</div></div>
    <div class="card"><h3>${rec.Pts ?? 0} pts</h3><div class="chips"><span class="chip">${rec.P ?? 0} played</span><span class="chip">${rec.W ?? 0} wins</span><span class="chip">GD ${(rec.GD ?? 0)>0?"+":""}${rec.GD ?? 0}</span></div></div>`;
  htmlTable($("#playerMatchesTable"), [
    {label:"Date"}, {label:"Match"}, {label:"Owners"}, {label:"Score"}, {label:"Status"}
  ], playerMatches(person), m => {
    const score = m.Status==="FINISHED" ? `${m["Home Goals"]} - ${m["Away Goals"]}` : "—";
    return `<td>${fmtDate(m.DateISO)}</td><td><strong>${m.home}</strong> vs <strong>${m.away}</strong></td><td>${m.homeOwner || "—"} vs ${m.awayOwner || "—"}</td><td>${score}</td><td><span class="badge ${m.Status==="FINISHED"?"finished":"status"}">${m.Status}</span></td>`
  });
}

function renderFixtures(){
  const q=clean($("#fixtureSearch").value), status=$("#statusFilter").value;
  let rows=state.matches.map(normaliseMatch).sort((a,b)=>new Date(a.DateISO)-new Date(b.DateISO));
  if(status !== "all") rows = rows.filter(m=>m.Status===status);
  if(q) rows = rows.filter(m => [m.home,m.away,m.homeOwner,m.awayOwner].some(x=>clean(x).includes(q)));
  htmlTable($("#fixturesTable"), [
    {label:"Date"}, {label:"Group"}, {label:"Home"}, {label:"Owner"}, {label:"Away"}, {label:"Owner"}, {label:"Score"}, {label:"Status"}
  ], rows, m => `<td>${fmtDate(m.DateISO)}</td><td>${(m.Stage||"GROUP").replace("_"," ")}</td><td><strong>${m.home}</strong></td><td>${m.homeOwner||"—"}</td><td><strong>${m.away}</strong></td><td>${m.awayOwner||"—"}</td><td>${m.Status==="FINISHED"?`${m["Home Goals"]} - ${m["Away Goals"]}`:"—"}</td><td><span class="badge ${m.Status==="FINISHED"?"finished":"status"}">${m.Status}</span></td>`);
}

function renderResults(){
  const q=clean($("#resultSearch").value);
  let rows=state.matches.map(normaliseMatch).filter(m=>m.Status==="FINISHED").sort((a,b)=>new Date(b.DateISO)-new Date(a.DateISO));
  if(q) rows=rows.filter(m=>[m.home,m.away,m.homeOwner,m.awayOwner].some(x=>clean(x).includes(q)));
  htmlTable($("#resultsTable"), [
    {label:"Date"}, {label:"Result"}, {label:"Owners"}, {label:"Points"}
  ], rows, m => {
    const hg=+m["Home Goals"], ag=+m["Away Goals"];
    const homePts= hg>ag?3:hg===ag?1:0, awayPts=ag>hg?3:hg===ag?1:0;
    return `<td>${fmtDate(m.DateISO)}</td><td><strong>${m.home}</strong> ${hg} - ${ag} <strong>${m.away}</strong></td><td>${m.homeOwner||"—"} vs ${m.awayOwner||"—"}</td><td>${m.homeOwner||"Home"} +${homePts} • ${m.awayOwner||"Away"} +${awayPts}</td>`;
  });
}

function renderAll(){ renderLeaderboard(); renderPlayers(); renderFixtures(); renderResults(); }

function switchTab(id){
  $$(".tab,.actions button").forEach(b=>b.classList.toggle("active", b.dataset.tab===id));
  $$(".panel").forEach(p=>p.classList.toggle("active", p.id===id));
}
$$("[data-tab]").forEach(b=>b.addEventListener("click",()=>switchTab(b.dataset.tab)));
["tableSearch","fixtureSearch","statusFilter","resultSearch","playerSelect"].forEach(id=>$("#"+id).addEventListener("input", renderAll));


// Built-in direct API mode requested by owner. This exposes the token in the browser.
const FOOTBALL_DATA_TOKEN = "3f802ba34ffe4cb2ae4d9c7c2ea04d7e";
const FOOTBALL_DATA_ENDPOINTS = [
  "https://api.football-data.org/v4/competitions/WC/matches?season=2026",
  "https://api.football-data.org/v4/matches"
];

function daysBetween(a,b){ return Math.abs((new Date(a)-new Date(b))/(1000*60*60*24)); }
function matchKeyName(name){ return clean(canon(name)).replace(/[^a-z0-9]/g,""); }
function findLocalMatch(apiMatch){
  const home = matchKeyName(apiMatch.homeTeam?.name || apiMatch.homeTeam?.shortName || apiMatch.homeTeam?.tla);
  const away = matchKeyName(apiMatch.awayTeam?.name || apiMatch.awayTeam?.shortName || apiMatch.awayTeam?.tla);
  const apiDate = apiMatch.utcDate;
  return state.matches.find(m => {
    const mh = matchKeyName(m["Home Team"]), ma = matchKeyName(m["Away Team"]);
    const sameTeams = (mh===home && ma===away) || (mh===away && ma===home);
    return sameTeams && daysBetween(m.DateISO, apiDate) <= 2;
  });
}

function mergeLiveMatches(apiMatches){
  let updated = 0;
  (apiMatches || []).forEach(am => {
    const local = findLocalMatch(am);
    if(!local) return;
    const homeName = matchKeyName(am.homeTeam?.name || am.homeTeam?.shortName || am.homeTeam?.tla);
    const localHomeName = matchKeyName(local["Home Team"]);
    const fullTime = am.score?.fullTime || {};
    const homeScore = Number.isFinite(fullTime.home) ? fullTime.home : fullTime.homeTeam;
    const awayScore = Number.isFinite(fullTime.away) ? fullTime.away : fullTime.awayTeam;
    local.Status = am.status === "FINISHED" ? "FINISHED" : (am.status || local.Status);
    if(am.utcDate) local.DateISO = am.utcDate;
    if(am.status === "FINISHED" && Number.isFinite(+homeScore) && Number.isFinite(+awayScore)) {
      if(homeName === localHomeName) {
        local["Home Goals"] = +homeScore;
        local["Away Goals"] = +awayScore;
      } else {
        local["Home Goals"] = +awayScore;
        local["Away Goals"] = +homeScore;
      }
      updated++;
    }
  });
  return updated;
}

async function fetchLiveFromNetlify(){
  const status = $("#liveStatus");
  const output = $("#liveOutput");
  output.textContent = "Connecting via Netlify function...";
  try {
    const res = await fetch("/.netlify/functions/worldcup", { cache: "no-store" });
    const text = await res.text();
    if(!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
    const json = JSON.parse(text);
    const matches = json.matches || [];
    const updated = mergeLiveMatches(matches);
    renderAll();
    status.textContent = `Live via Netlify • ${updated} results synced`;
    status.className = "live-pill ok";
    output.textContent = `Connected successfully via Netlify function.
Matches received: ${matches.length}
Local results updated: ${updated}

Last API response preview:
` + JSON.stringify(json, null, 2).slice(0,2500);
  } catch(e) {
    status.textContent = "Netlify function not available";
    status.className = "live-pill warn";
    output.textContent = `This live sync needs to be opened from the deployed Netlify website, not by double-clicking index.html locally.

Error: ${e.message || e}

What to do:
1. Upload this whole folder/ZIP to Netlify.
2. Open the Netlify website URL.
3. Press this button again.

I included the function at: netlify/functions/worldcup.js`;
  }
}

$("#testLive").addEventListener("click", fetchLiveFromNetlify);

renderAll();
