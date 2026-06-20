const raw = window.LEAGUE_DATA;
let state = structuredClone(raw);
const $ = (q) => document.querySelector(q);
const $$ = (q) => Array.from(document.querySelectorAll(q));

const aliases = {
  "usa":"United States","united states":"United States","united states of america":"United States",
  "korea republic":"South Korea","south korea":"South Korea",
  "cabo verde":"Cape Verde","cape verde":"Cape Verde","cape verde islands":"Cape Verde",
  "côte d'ivoire":"Ivory Coast","cote d'ivoire":"Ivory Coast","ivory coast":"Ivory Coast",
  "congo dr":"Congo","dr congo":"Congo","congo democratic republic":"Congo","congo":"Congo",
  "bosnia-herzegovina":"Bosnia and Herzegovina","bosnia-herz.":"Bosnia and Herzegovina","bosnia-h.":"Bosnia and Herzegovina","bosnia and herzegovina":"Bosnia and Herzegovina",
  "ir iran":"Iran","iran":"Iran","irn":"Iran",
  "türkiye":"Turkey","turkiye":"Turkey","turkey":"Turkey",
  "curaçao":"Curaçao","curacao":"Curaçao",
  "tbc":"TBC"
};
const clean = s => (s ?? "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const canon = s => aliases[clean(s)] || (s || "TBC");
const isTbc = s => !s || clean(s)==="tbc";

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
function finishedKnownMatches(){
  return state.matches.map(normaliseMatch).filter(m => m.Status === "FINISHED" && !isTbc(m.home) && !isTbc(m.away) && Number.isFinite(+m["Home Goals"]) && Number.isFinite(+m["Away Goals"]));
}
function computeTable(){
  const people = state.teams.map(x=>x.person);
  const table = Object.fromEntries(people.map(p => [p,{Person:p,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0,Teams:state.teams.find(x=>x.person===p)?.countries||[]}]));
  finishedKnownMatches().forEach(m => {
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
  el.innerHTML = `<thead><tr>${headers.map(h=>`<th class="${h.cls||''}">${h.label}</th>`).join("")}</tr></thead><tbody>${rows.map((r,i)=>`<tr>${rowFn(r,i)}</tr>`).join("")}</tbody>`;
}
const fmtDate = d => new Date(d).toLocaleString("en-GB",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
const stageLabel = s => ({GROUP_STAGE:"Group Stage",LAST_32:"Round of 32",LAST_16:"Round of 16",QUARTER_FINALS:"Quarter-finals",SEMI_FINALS:"Semi-finals",THIRD_PLACE:"Third Place",FINAL:"Final"}[s] || (s||"Fixture").replaceAll("_"," "));
function badgeStatus(s){return `<span class="badge ${s==='FINISHED'?'finished':'status'}">${s==='FINISHED'?'FT':s}</span>`}
function escapeHtml(x){return (x??'').toString().replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));}

function renderKPIs(table){
  const matches=state.matches.map(normaliseMatch);
  const total = matches.length;
  const finished = matches.filter(m=>m.Status==="FINISHED").length;
  const remaining = total - finished;
  const goals = finishedKnownMatches().reduce((s,m)=>s+(+m["Home Goals"]||0)+(+m["Away Goals"]||0),0);
  $("#kpis").innerHTML = [
    ["Players", state.teams.length], ["Total fixtures", total], ["Played", finished], ["Remaining", remaining], ["Goals counted", goals]
  ].map(([a,b])=>`<div class="kpi"><span>${a}</span><strong>${b}</strong></div>`).join("");
  const leader=table[0];
  $("#currentLeader").textContent=leader?.Person||"—";
  $("#leaderMeta").textContent=leader?`${leader.Pts} pts • GD ${leader.GD>=0?"+":""}${leader.GD} • ${leader.P} played`:"";
  const next = matches.filter(m=>m.Status!=="FINISHED").sort((a,b)=>new Date(a.DateISO)-new Date(b.DateISO))[0];
  $("#nextFixture").textContent = next ? `${next.home} vs ${next.away}` : "Tournament complete";
  $("#nextFixtureMeta").textContent = next ? `${stageLabel(next.Stage)} • ${fmtDate(next.DateISO)}` : "";
}
function renderLeaderboard(){
  const q=clean($("#tableSearch").value);
  const table=computeTable();
  renderKPIs(table);
  const rows=table.filter(r=>clean(r.Person).includes(q) || r.Teams.some(t=>clean(t).includes(q)));
  htmlTable($("#leaderboardTable"), [
    {label:"Pos"},{label:"Player"},{label:"Teams"},{label:"P",cls:"num"},{label:"W",cls:"num"},{label:"D",cls:"num"},{label:"L",cls:"num"},{label:"GF",cls:"num"},{label:"GA",cls:"num"},{label:"GD",cls:"num"},{label:"Pts",cls:"num"}
  ], rows, r=>`
    <td class="pos"><span>${r.Rank}</span></td>
    <td class="player-cell"><strong>${r.Person}</strong><small>${r.Rank===1?'League leader':'Private league'}</small></td>
    <td><div class="team-chips">${r.Teams.map(t=>`<span>${escapeHtml(t)}</span>`).join('')}</div></td>
    <td class="num">${r.P}</td><td class="num">${r.W}</td><td class="num">${r.D}</td><td class="num">${r.L}</td><td class="num">${r.GF}</td><td class="num">${r.GA}</td><td class="num ${r.GD>0?'positive':r.GD<0?'negative':''}">${r.GD>0?'+':''}${r.GD}</td><td class="num points">${r.Pts}</td>`);
}
function playerRecord(person){return computeTable().find(r=>r.Person===person)||{};}
function playerMatches(person){return state.matches.map(normaliseMatch).filter(m=>m.homeOwner===person||m.awayOwner===person).sort((a,b)=>new Date(a.DateISO)-new Date(b.DateISO));}
function renderPlayers(){
  const sel=$("#playerSelect");
  if(!sel.options.length) sel.innerHTML=state.teams.map(p=>`<option>${p.person}</option>`).join("");
  const person=sel.value||state.teams[0].person;
  const teams=state.teams.find(x=>x.person===person)?.countries||[];
  const rec=playerRecord(person);
  $("#playerCards").innerHTML=`
    <div class="profile-card main-profile"><span>Manager</span><h3>${person}</h3><div class="chips">${teams.map(t=>`<span class="chip">${escapeHtml(t)}</span>`).join("")}</div></div>
    <div class="profile-card"><span>Points</span><h3>${rec.Pts??0}</h3><p>${rec.P??0} played • ${rec.W??0} wins • GD ${(rec.GD??0)>0?'+':''}${rec.GD??0}</p></div>
    <div class="profile-card"><span>Attack</span><h3>${rec.GF??0}</h3><p>Goals for • ${rec.GA??0} conceded</p></div>`;
  htmlTable($("#playerMatchesTable"), [{label:"Date"},{label:"Stage"},{label:"Match"},{label:"Score"},{label:"Status"}], playerMatches(person), m=>`
    <td>${fmtDate(m.DateISO)}</td><td>${stageLabel(m.Stage)}</td><td><strong>${m.home}</strong> vs <strong>${m.away}</strong></td><td>${m.Status==='FINISHED'?`${m["Home Goals"]} - ${m["Away Goals"]}`:'—'}</td><td>${badgeStatus(m.Status)}</td>`);
}
function renderFixtures(){
  const q=clean($("#fixtureSearch").value), status=$("#statusFilter").value, stage=$("#stageFilter").value;
  let rows=state.matches.map(normaliseMatch).sort((a,b)=>new Date(a.DateISO)-new Date(b.DateISO));
  if(status!=="all") rows=rows.filter(m=>m.Status===status);
  if(stage!=="all") rows=rows.filter(m=>m.Stage===stage);
  if(q) rows=rows.filter(m=>[m.home,m.away,m.homeOwner,m.awayOwner,m.Group,stageLabel(m.Stage)].some(x=>clean(x).includes(q)));
  htmlTable($("#fixturesTable"), [{label:"#"},{label:"Date"},{label:"Stage"},{label:"Home"},{label:"Owner"},{label:"Away"},{label:"Owner"},{label:"Score"},{label:"Status"}], rows, m=>`
    <td class="fixture-no">${m["Match #"]}</td><td>${fmtDate(m.DateISO)}</td><td>${stageLabel(m.Stage)}<small class="subline">${m.Group||''}</small></td>
    <td><strong class="${isTbc(m.home)?'tbc':''}">${m.home}</strong></td><td>${m.homeOwner||'—'}</td>
    <td><strong class="${isTbc(m.away)?'tbc':''}">${m.away}</strong></td><td>${m.awayOwner||'—'}</td>
    <td>${m.Status==='FINISHED'?`${m["Home Goals"]} - ${m["Away Goals"]}`:'—'}</td><td>${badgeStatus(m.Status)}</td>`);
}
function renderResults(){
  const q=clean($("#resultSearch").value);
  let rows=finishedKnownMatches().sort((a,b)=>new Date(b.DateISO)-new Date(a.DateISO));
  if(q) rows=rows.filter(m=>[m.home,m.away,m.homeOwner,m.awayOwner,stageLabel(m.Stage)].some(x=>clean(x).includes(q)));
  htmlTable($("#resultsTable"), [{label:"Date"},{label:"Result"},{label:"Owners"},{label:"Points"}], rows, m=>{
    const hg=+m["Home Goals"], ag=+m["Away Goals"];
    const homePts=hg>ag?3:hg===ag?1:0, awayPts=ag>hg?3:hg===ag?1:0;
    return `<td>${fmtDate(m.DateISO)}</td><td><strong>${m.home}</strong> ${hg} - ${ag} <strong>${m.away}</strong></td><td>${m.homeOwner||'—'} vs ${m.awayOwner||'—'}</td><td>${m.homeOwner||'Home'} +${homePts} • ${m.awayOwner||'Away'} +${awayPts}</td>`;
  });
}
function renderBracket(){
  const stages=["LAST_32","LAST_16","QUARTER_FINALS","SEMI_FINALS","FINAL"];
  const byStage=Object.fromEntries(stages.map(s=>[s,state.matches.map(normaliseMatch).filter(m=>m.Stage===s).sort((a,b)=>new Date(a.DateISO)-new Date(b.DateISO))]));
  $("#bracketGrid").innerHTML = stages.map(stage=>`
    <section class="bracket-col ${stage.toLowerCase()}">
      <h3>${stageLabel(stage)} <span>${byStage[stage].length}</span></h3>
      <div class="bracket-list">
        ${byStage[stage].map(m=>`
          <article class="bracket-match ${m.Status==='FINISHED'?'done':''}">
            <div class="bracket-meta"><span>${fmtDate(m.DateISO)}</span><b>#${m["Match #"]}</b></div>
            <div class="bracket-team ${isTbc(m.home)?'tbc':''}"><span>${m.home}</span><strong>${m.Status==='FINISHED'?m["Home Goals"]:''}</strong></div>
            <div class="bracket-team ${isTbc(m.away)?'tbc':''}"><span>${m.away}</span><strong>${m.Status==='FINISHED'?m["Away Goals"]:''}</strong></div>
          </article>`).join('')}
      </div>
    </section>`).join('') + `
    <section class="bracket-col third-place"><h3>${stageLabel('THIRD_PLACE')} <span>${state.matches.filter(m=>m.Stage==='THIRD_PLACE').length}</span></h3><div class="bracket-list">${state.matches.map(normaliseMatch).filter(m=>m.Stage==='THIRD_PLACE').map(m=>`<article class="bracket-match"><div class="bracket-meta"><span>${fmtDate(m.DateISO)}</span><b>#${m["Match #"]}</b></div><div class="bracket-team tbc"><span>${m.home}</span><strong></strong></div><div class="bracket-team tbc"><span>${m.away}</span><strong></strong></div></article>`).join('')}</div></section>`;
}
function renderAll(){renderLeaderboard();renderPlayers();renderFixtures();renderResults();renderBracket();}
function switchTab(id){$$('.tab,.actions button').forEach(b=>b.classList.toggle('active',b.dataset.tab===id));$$('.panel').forEach(p=>p.classList.toggle('active',p.id===id));}
$$('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
['tableSearch','fixtureSearch','statusFilter','stageFilter','resultSearch','playerSelect'].forEach(id=>$('#'+id).addEventListener('input',renderAll));

function apiTeamName(t){return canon(t?.name || t?.shortName || t?.tla || 'TBC');}
function apiToLocal(am, index){
  const home=apiTeamName(am.homeTeam), away=apiTeamName(am.awayTeam), ft=am.score?.fullTime||{};
  const map=teamOwnerMap();
  return {
    ApiId: am.id, DateISO: am.utcDate, Stage: am.stage || '', Status: am.status === 'FINISHED' ? 'FINISHED' : (am.status || 'TIMED'),
    'Home Team': home, 'Home Owner': map.get(clean(home)) || '', 'Home Goals': Number.isFinite(ft.home) ? ft.home : null,
    'Away Goals': Number.isFinite(ft.away) ? ft.away : null, 'Away Owner': map.get(clean(away)) || '', 'Away Team': away,
    Group: am.group ? am.group.replace('GROUP_','Group ') : stageLabel(am.stage), Venue: '', Competition: 'FIFA World Cup 2026', 'Match #': index+1
  };
}
function replaceWithLiveMatches(apiMatches){
  if(!Array.isArray(apiMatches) || !apiMatches.length) return 0;
  state.matches = apiMatches.map(apiToLocal).sort((a,b)=>new Date(a.DateISO)-new Date(b.DateISO)).map((m,i)=>({...m,'Match #':i+1}));
  return state.matches.length;
}
async function fetchLiveFromNetlify(auto=false){
  const status=$("#liveStatus"), output=$("#liveOutput");
  if(output) output.textContent='Connecting to the live server function...';
  const paths=['/api/worldcup','/.netlify/functions/worldcup'];
  let lastError=null;
  for(const path of paths){
    try{
      const res=await fetch(path,{cache:'no-store'});
      const text=await res.text();
      if(!res.ok) throw new Error(`${path} → ${res.status} ${res.statusText}: ${text.slice(0,300)}`);
      const json=JSON.parse(text);
      const count=replaceWithLiveMatches(json.matches || []);
      renderAll();
      const played=state.matches.filter(m=>m.Status==='FINISHED').length;
      status.textContent=`Live via Netlify • ${count} fixtures • ${played} played`;
      status.className='live-pill ok';
      if(output) output.textContent=`Connected successfully.\nFunction used: ${path}\nTotal fixtures loaded: ${count}\nPlayed: ${played}\nRemaining: ${count-played}\n\nKnockout fixtures are kept as TBC until teams are decided.`;
      return;
    }catch(e){lastError=e.message||String(e);}
  }
  status.textContent='Live function not connected'; status.className='live-pill warn';
  if(output) output.textContent=`Could not load live function.\n\nError: ${lastError}\n\nThe site still shows the saved 104-fixture snapshot, including TBC knockout slots.`;
}
$('#testLive').addEventListener('click',()=>fetchLiveFromNetlify(false));
renderAll();
fetchLiveFromNetlify(true);
