const raw = window.LEAGUE_DATA || {teams:[], matches:[], fixtures:[]};
let state = structuredClone(raw);
let activePlayer = null;
const $ = q => document.querySelector(q);
const $$ = q => Array.from(document.querySelectorAll(q));

const aliases = {
  "usa":"United States","united states":"United States","united states of america":"United States",
  "korea republic":"South Korea","south korea":"South Korea",
  "cabo verde":"Cape Verde","cape verde":"Cape Verde","cape verde islands":"Cape Verde",
  "côte d'ivoire":"Ivory Coast","cote d'ivoire":"Ivory Coast","ivory coast":"Ivory Coast",
  "congo dr":"DR Congo","dr congo":"DR Congo","congo democratic republic":"DR Congo","congo":"DR Congo",
  "bosnia-herzegovina":"Bosnia and Herzegovina","bosnia-herz.":"Bosnia and Herzegovina","bosnia and herzegovina":"Bosnia and Herzegovina","bosnia":"Bosnia and Herzegovina",
  "ir iran":"Iran","iran":"Iran",
  "türkiye":"Turkey","turkiye":"Turkey","turkey":"Turkey",
  "curaçao":"Curaçao","curacao":"Curaçao",
  "czech republic":"Czechia","czechia":"Czechia",
  "tbc":"TBC"
};
const flagCodes = {
  "Ghana":"gh","Japan":"jp","Morocco":"ma","Colombia":"co","Curaçao":"cw","Spain":"es",
  "Turkey":"tr","Ecuador":"ec","Belgium":"be","Austria":"at","Uruguay":"uy","Brazil":"br",
  "South Korea":"kr","Mexico":"mx","Netherlands":"nl","Scotland":"gb-sct","Norway":"no","Sweden":"se",
  "France":"fr","Tunisia":"tn","Iran":"ir","DR Congo":"cd","Saudi Arabia":"sa","Australia":"au",
  "Panama":"pa","Ivory Coast":"ci","Egypt":"eg","Bosnia and Herzegovina":"ba","Argentina":"ar","Cape Verde":"cv",
  "Croatia":"hr","New Zealand":"nz","Iraq":"iq","Czechia":"cz","Portugal":"pt","Senegal":"sn",
  "Germany":"de","Haiti":"ht","England":"gb-eng","United States":"us","Switzerland":"ch","Jordan":"jo",
  "South Africa":"za","Canada":"ca","Uzbekistan":"uz","Paraguay":"py","Algeria":"dz","Qatar":"qa","TBC":"un"
};
const clean = s => (s ?? "").toString().trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const canon = s => aliases[clean(s)] || (s || "TBC");
const isTbc = s => !s || clean(s)==="tbc" || clean(s).includes("winner") || clean(s).includes("runner") || clean(s).includes("w") && /^w\d/i.test(String(s));
const safe = x => (x ?? "").toString().replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const fmtDate = d => new Date(d).toLocaleString("en-GB",{weekday:"short",day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"});
const fmtTime = d => new Date(d).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"});
const stageLabel = s => ({GROUP_STAGE:"Group Stage",LAST_32:"Round of 32",LAST_16:"Round of 16",QUARTER_FINALS:"Quarter-finals",SEMI_FINALS:"Semi-finals",THIRD_PLACE:"Third Place",FINAL:"Final"}[s] || (s||"Fixture").replaceAll("_"," "));
function flagImg(team){ const t=canon(team); const code=flagCodes[t]; if(!code || t==="TBC") return `<span class="flag-placeholder">TBC</span>`; return `<img class="flag" src="https://flagcdn.com/w40/${code}.png" alt="${safe(t)} flag" loading="lazy" onerror="this.outerHTML='<span class=&quot;flag-placeholder&quot;>🏳️</span>'">`; }
function teamDisplay(team){ const t=canon(team); return `<span class="team-name">${flagImg(t)}<span>${safe(t)}</span></span>`; }
function scoreText(m){ return m.Status === "FINISHED" || m.Status === "IN_PLAY" || m.Status === "PAUSED" ? `${m["Home Goals"] ?? 0} - ${m["Away Goals"] ?? 0}` : "—"; }
function badgeStatus(s){ const live=["IN_PLAY","LIVE","PAUSED"].includes(s); return `<span class="badge ${s==='FINISHED'?'finished': live?'live':'status'}">${s==='FINISHED'?'FT':live?'LIVE':s||'TIMED'}</span>`; }
function ownerMap(){ const m=new Map(); state.teams.forEach(p => p.countries.forEach(c => m.set(clean(canon(c)), p.person))); return m; }
function allMatches(){ const matches = state.matches?.length ? state.matches : state.fixtures || []; return matches.map(normaliseMatch).sort((a,b)=>new Date(a.DateISO || a.Date)-new Date(b.DateISO || b.Date)); }
function normaliseMatch(m){ const map=ownerMap(); const home=canon(m["Home Team"] ?? m["Team A"]); const away=canon(m["Away Team"] ?? m["Team B"]); const statusRaw=(m.Status || "TIMED").toString().toUpperCase(); const status=statusRaw==="FINAL"?"FINISHED":statusRaw; return {...m, DateISO:m.DateISO || m.Date, Stage:m.Stage || m.Group || "GROUP_STAGE", Status:status, home, away, homeOwner:m["Home Owner"] || m["Owner A"] || map.get(clean(home)) || "", awayOwner:m["Away Owner"] || m["Owner B"] || map.get(clean(away)) || "", "Home Goals":Number.isFinite(+m["Home Goals"])?+m["Home Goals"]:(Number.isFinite(+m["Score A"])?+m["Score A"]:null), "Away Goals":Number.isFinite(+m["Away Goals"])?+m["Away Goals"]:(Number.isFinite(+m["Score B"])?+m["Score B"]:null)}; }
function finishedMatches(){ return allMatches().filter(m => m.Status === "FINISHED" && !isTbc(m.home) && !isTbc(m.away) && Number.isFinite(+m["Home Goals"]) && Number.isFinite(+m["Away Goals"])); }
function liveMatches(){ return allMatches().filter(m => ["IN_PLAY","LIVE","PAUSED"].includes(m.Status)); }
function upcomingMatches(){ return allMatches().filter(m => m.Status !== "FINISHED" && !["IN_PLAY","LIVE","PAUSED"].includes(m.Status)).sort((a,b)=>new Date(a.DateISO)-new Date(b.DateISO)); }
function addResult(r,gf,ga){ r.P++; r.GF+=gf; r.GA+=ga; if(gf>ga){r.W++; r.Pts+=3;} else if(gf===ga){r.D++; r.Pts+=1;} else r.L++; }
function computeTable(){ const table=Object.fromEntries(state.teams.map(p=>[p.person,{Person:p.person,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0,Teams:p.countries.map(canon)}])); finishedMatches().forEach(m=>{ const hg=+m["Home Goals"], ag=+m["Away Goals"]; if(table[m.homeOwner]) addResult(table[m.homeOwner],hg,ag); if(table[m.awayOwner]) addResult(table[m.awayOwner],ag,hg); }); return Object.values(table).map(r=>({...r,GD:r.GF-r.GA})).sort((a,b)=>b.Pts-a.Pts || b.GD-a.GD || b.GF-a.GF || b.W-a.W || a.Person.localeCompare(b.Person)).map((r,i)=>({Rank:i+1,...r})); }
function htmlTable(el, headers, rows, fn){
  if(!el) return;
  el.innerHTML = `<thead><tr>${headers.map(h=>`<th class="${h.cls||''}">${h.label}</th>`).join('')}</tr></thead><tbody>${rows.map((r,i)=>`<tr class="rank-row rank-${r.Rank||i+1}">${fn(r,i)}</tr>`).join('')}</tbody>`;
  Array.from(el.querySelectorAll('tbody tr')).forEach(tr=>{
    Array.from(tr.children).forEach((td,idx)=>td.setAttribute('data-label', headers[idx]?.label || ''));
  });
}
function renderKPIs(table){ const matches=allMatches(); const finished=finishedMatches(); const goals=finished.reduce((s,m)=>s+(+m["Home Goals"]||0)+(+m["Away Goals"]||0),0); const items=[["Players",state.teams.length],["Fixtures",matches.length],["Played",finished.length],["Remaining",matches.length-finished.length],["Goals",goals]]; $('#kpis').innerHTML=items.map(([a,b])=>`<div class="kpi"><span>${a}</span><strong>${b}</strong></div>`).join(''); const leader=table[0]; $('#currentLeader').textContent=leader?.Person || '—'; $('#leaderMeta').textContent=leader?`${leader.Pts} pts • GD ${leader.GD>=0?'+':''}${leader.GD} • ${leader.P} played`:''; }
function countdownText(dateISO){
  const diff=Math.max(0,new Date(dateISO).getTime()-Date.now());
  const d=Math.floor(diff/86400000), h=Math.floor(diff%86400000/3600000), m=Math.floor(diff%3600000/60000), sec=Math.floor(diff%60000/1000);
  return d>0 ? `${d}d ${h}h ${m}m` : `${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(sec).padStart(2,'0')}s`;
}
function ownerVsText(m){
  const h = m.homeOwner || 'No owner';
  const a = m.awayOwner || 'No owner';
  return `${h} vs ${a}`;
}
function renderMiniCountdowns(){
  const next3=upcomingMatches().slice(0,3);
  if(!next3.length) return '<section class="mini-countdowns"><article class="mini-countdown"><span>Coming up</span><strong>No upcoming fixtures</strong><small>Tournament complete</small></article></section>';
  return `<section class="mini-countdowns">${next3.map((m,i)=>`<article class="mini-countdown">
    <span>${i===0?'Next match':`Match ${i+1}`}</span>
    <strong>${teamDisplay(m.home)} vs ${teamDisplay(m.away)}</strong>
    <em class="owner-vs">${ownerVsText(m)}</em>
    <small>${countdownText(m.DateISO)} • ${fmtDate(m.DateISO)}</small>
  </article>`).join('')}</section>`;
}
function renderMatchCentre(){
  const live=liveMatches()[0];
  const next=upcomingMatches()[0];
  const last=finishedMatches().slice(-1)[0];
  const m=live || next || last;
  if(!m){ $('#matchCentre').innerHTML='<div class="match-card"><h2>No fixtures loaded</h2></div>'; return; }
  const isLive=!!live, isDone=!live && !next;
  const statusTitle=isLive?'LIVE MATCH':isDone?'LATEST RESULT':'NEXT MATCH';
  $('#matchCentre').innerHTML=`<article class="live-scoreboard ${isLive?'is-live':isDone?'is-done':''}">
    <div class="score-top"><span class="red-dot"></span><b>${statusTitle}</b><span>${isLive?(m.minute?m.minute+"'":m.Status):isDone?'FT':fmtDate(m.DateISO)}</span></div>
    <div class="score-main">
      <div class="score-team"><div class="crest">${flagImg(m.home)}</div><h2>${safe(canon(m.home))}</h2><p>${m.homeOwner || 'No owner'}</p></div>
      <div class="score-centre">${isLive||isDone?`<strong>${m["Home Goals"] ?? 0} : ${m["Away Goals"] ?? 0}</strong><small>${isLive?'Live score':'Full time'}</small>`:`<strong>${countdownText(m.DateISO)}</strong><small>until kick-off</small>`}</div>
      <div class="score-team"><div class="crest">${flagImg(m.away)}</div><h2>${safe(canon(m.away))}</h2><p>${m.awayOwner || 'No owner'}</p></div>
    </div>
    <div class="score-footer"><span>${stageLabel(m.Stage)}</span><span>${m.homeOwner||'—'} vs ${m.awayOwner||'—'}</span><span>${m.Venue||''}</span></div>
  </article>${renderMiniCountdowns()}`;
}
function renderPodium(table){ const top=table.slice(0,3); $('#podium').innerHTML=top.map((r,i)=>`<article class="podium-card p${i+1}"><span>${['🥇 1st','🥈 2nd','🥉 3rd'][i]}</span><h3>${r.Person}</h3><strong>${r.Pts} pts</strong><small>${r.W}W ${r.D}D ${r.L}L • GD ${r.GD>=0?'+':''}${r.GD}</small></article>`).join(''); }
function renderLeaderboard(){
  const q=clean($('#tableSearch')?.value);
  const table=computeTable();
  renderKPIs(table); renderPodium(table);
  const headers=[{label:'Pos'},{label:'Player'},{label:'P',cls:'num'},{label:'W',cls:'num'},{label:'D',cls:'num'},{label:'L',cls:'num'},{label:'GF',cls:'num'},{label:'GA',cls:'num'},{label:'GD',cls:'num'},{label:'Pts',cls:'num'}];
  const rowFn=r=>`<td class="pos">${r.Rank<=3?['🥇','🥈','🥉'][r.Rank-1]:r.Rank}</td><td><strong>${r.Person}</strong><small class="subline">${r.Teams.length} teams</small></td><td class="num">${r.P}</td><td class="num">${r.W}</td><td class="num">${r.D}</td><td class="num">${r.L}</td><td class="num">${r.GF}</td><td class="num">${r.GA}</td><td class="num ${r.GD>0?'positive':r.GD<0?'negative':''}">${r.GD>0?'+':''}${r.GD}</td><td class="num points">${r.Pts}</td>`;
  const rows=q?table.filter(r=>clean(r.Person).includes(q)||r.Teams.some(t=>clean(t).includes(q))):table;
  htmlTable($('#leaderboardTable'), headers, rows, rowFn);
  htmlTable($('#homeLeaderboardTable'), headers, table, rowFn);
  renderLeaderboardCards($('#leaderboardTable'), rows, 'leaderboardMobileCards');
  renderLeaderboardCards($('#homeLeaderboardTable'), table, 'homeLeaderboardMobileCards');
}
function renderLeaderboardCards(tableEl, rows, id){
  if(!tableEl) return;
  let wrap=document.getElementById(id);
  if(!wrap){
    wrap=document.createElement('div');
    wrap.id=id;
    wrap.className='leaderboard-mobile-cards';
    tableEl.parentElement?.appendChild(wrap);
  }
  wrap.innerHTML = rows.map(r=>`<article class="mobile-league-row rank-${r.Rank}">
    <div class="mobile-rank">${r.Rank<=3?['🥇','🥈','🥉'][r.Rank-1]:r.Rank}</div>
    <div class="mobile-player"><strong>${safe(r.Person)}</strong><small>${r.P} played • ${r.W}W ${r.D}D ${r.L}L</small></div>
    <div class="mobile-points"><strong>${r.Pts}</strong><span>PTS</span></div>
    <div class="mobile-stats"><span>GD ${r.GD>=0?'+':''}${r.GD}</span><span>GF ${r.GF}</span><span>GA ${r.GA}</span></div>
  </article>`).join('');
}
function teamStats(team){ const t=canon(team); const matches=allMatches().filter(m=>m.home===t || m.away===t); const finished=matches.filter(m=>m.Status==='FINISHED'); let P=0,W=0,D=0,L=0,GF=0,GA=0,Pts=0; finished.forEach(m=>{ const home=m.home===t, gf=home?+m['Home Goals']:+m['Away Goals'], ga=home?+m['Away Goals']:+m['Home Goals']; P++; GF+=gf; GA+=ga; if(gf>ga){W++;Pts+=3}else if(gf===ga){D++;Pts++}else L++; }); return {P,W,D,L,GF,GA,GD:GF-GA,Pts,matches,latest:finished.at(-1),next:matches.find(m=>m.Status!=='FINISHED')}; }
function renderTeams(){ const q=clean($('#teamSearch')?.value); const all=state.teams.flatMap(p=>p.countries.map(c=>({team:canon(c),owner:p.person}))).sort((a,b)=>a.team.localeCompare(b.team)); const filtered=q?all.filter(x=>clean(x.team).includes(q)||clean(x.owner).includes(q)):all; $('#teamsGrid').innerHTML=filtered.map(({team,owner})=>{ const st=teamStats(team); const latest=st.latest?`${teamDisplay(st.latest.home)} ${st.latest['Home Goals']} - ${st.latest['Away Goals']} ${teamDisplay(st.latest.away)}`:'No result yet'; const next=st.next?`${teamDisplay(st.next.home)} vs ${teamDisplay(st.next.away)} <small>${fmtDate(st.next.DateISO)}</small>`:'No upcoming fixture'; return `<article class="team-card"><div class="team-card-head">${flagImg(team)}<div><h3>${safe(team)}</h3><p>${owner}</p></div></div><div class="team-record"><b>${st.Pts}</b><span>pts</span><b>${st.GD>=0?'+':''}${st.GD}</b><span>GD</span><b>${st.P}</b><span>P</span></div><div class="team-lines"><span>Latest</span><p>${latest}</p><span>Next</span><p>${next}</p></div></article>`; }).join(''); }
function renderFixtures(){
  const q=clean($('#fixtureSearch')?.value), sf=$('#statusFilter')?.value||'all', stg=$('#stageFilter')?.value||'all';
  let rows=allMatches();
  if(q) rows=rows.filter(m=>[m.home,m.away,m.homeOwner,m.awayOwner,stageLabel(m.Stage)].some(x=>clean(x).includes(q)));
  if(sf!=='all') rows=rows.filter(m=>sf==='TIMED'? !['FINISHED','IN_PLAY','LIVE','PAUSED'].includes(m.Status):m.Status===sf);
  if(stg!=='all') rows=rows.filter(m=>m.Stage===stg);
  const list=$('#fixturesList');
  if(list){
    list.innerHTML = rows.map(m=>`
      <article class="fixture-card ${m.Status==='FINISHED'?'done':(['IN_PLAY','LIVE','PAUSED'].includes(m.Status)?'live':'upcoming')}">
        <div class="fixture-top"><span>#${m['Match #']||''}</span><strong>${fmtDate(m.DateISO)}</strong>${badgeStatus(m.Status)}</div>
        <div class="fixture-stage">${stageLabel(m.Stage)}${m.Group?` • ${safe(m.Group)}`:''}</div>
        <div class="fixture-main">
          <div class="fixture-team">${teamDisplay(m.home)}<small>${safe(m.homeOwner||'No owner')}</small></div>
          <div class="fixture-score">${scoreText(m)}</div>
          <div class="fixture-team right">${teamDisplay(m.away)}<small>${safe(m.awayOwner||'No owner')}</small></div>
        </div>
        <div class="fixture-owner-vs">${safe(m.homeOwner||'No owner')} vs ${safe(m.awayOwner||'No owner')}</div>
      </article>`).join('');
    return;
  }
  htmlTable($('#fixturesTable'),[{label:'#'},{label:'Date'},{label:'Stage'},{label:'Home'},{label:'Owner'},{label:'Away'},{label:'Owner'},{label:'Score'},{label:'Status'}], rows, m=>`<td>${m['Match #']||''}</td><td>${fmtDate(m.DateISO)}</td><td>${stageLabel(m.Stage)}<small class="subline">${m.Group||''}</small></td><td><strong>${teamDisplay(m.home)}</strong></td><td>${m.homeOwner||'—'}</td><td><strong>${teamDisplay(m.away)}</strong></td><td>${m.awayOwner||'—'}</td><td>${scoreText(m)}</td><td>${badgeStatus(m.Status)}</td>`);
}
function renderResults(){ const q=clean($('#resultSearch')?.value); let rows=finishedMatches().sort((a,b)=>new Date(b.DateISO)-new Date(a.DateISO)); if(q) rows=rows.filter(m=>[m.home,m.away,m.homeOwner,m.awayOwner,stageLabel(m.Stage)].some(x=>clean(x).includes(q))); htmlTable($('#resultsTable'),[{label:'Date'},{label:'Result'},{label:'Owners'},{label:'Points'}], rows, m=>{ const hg=+m['Home Goals'], ag=+m['Away Goals']; const hp=hg>ag?3:hg===ag?1:0, ap=ag>hg?3:hg===ag?1:0; return `<td>${fmtDate(m.DateISO)}</td><td><strong>${teamDisplay(m.home)}</strong> ${hg} - ${ag} <strong>${teamDisplay(m.away)}</strong></td><td>${m.homeOwner||'—'} vs ${m.awayOwner||'—'}</td><td>${m.homeOwner||'Home'} +${hp} • ${m.awayOwner||'Away'} +${ap}</td>`; }); }
function renderPlayerTabs(person){
  const wrap = $('#playerTabs');
  if(!wrap) return;
  wrap.innerHTML = state.teams.map(p=>`<button type="button" class="player-tab ${p.person===person?'active':''}" data-player="${safe(p.person)}">${safe(p.person)}</button>`).join('');
}
function renderPlayers(){
  const first = state.teams[0]?.person || '';
  const person = activePlayer || first;
  activePlayer = person;
  renderPlayerTabs(person);
  const table=computeTable();
  const rec=table.find(r=>r.Person===person) || {Pts:0,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0};
  const teams=state.teams.find(x=>x.person===person)?.countries.map(canon)||[];
  $('#playerCards').innerHTML=`<article class="profile-card main-profile"><span>Manager</span><h3>${person}</h3><div class="chips">${teams.map(t=>`<span class="chip">${flagImg(t)} ${safe(t)}</span>`).join('')}</div></article><article class="profile-card"><span>Points</span><h3>${rec.Pts}</h3><p>${rec.P} played • ${rec.W} wins • GD ${rec.GD>=0?'+':''}${rec.GD}</p></article><article class="profile-card"><span>Goals</span><h3>${rec.GF}</h3><p>${rec.GA} conceded</p></article>`;
  const rows=allMatches().filter(m=>m.homeOwner===person||m.awayOwner===person);
  htmlTable($('#playerMatchesTable'),[{label:'Date'},{label:'Stage'},{label:'Match'},{label:'Score'},{label:'Status'}], rows, m=>`<td>${fmtDate(m.DateISO)}</td><td>${stageLabel(m.Stage)}</td><td>${teamDisplay(m.home)} vs ${teamDisplay(m.away)}</td><td>${scoreText(m)}</td><td>${badgeStatus(m.Status)}</td>`);
}
function renderBracket(){ const stages=['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','FINAL','THIRD_PLACE']; const matches=allMatches(); $('#bracketGrid').innerHTML=stages.map(stage=>{ const rows=matches.filter(m=>m.Stage===stage); return `<section class="bracket-col"><h3>${stageLabel(stage)} <span>${rows.length}</span></h3>${rows.map(m=>`<article class="bracket-match ${m.Status==='FINISHED'?'done':''}"><div class="bracket-meta"><span>${fmtDate(m.DateISO)}</span><b>#${m['Match #']||''}</b></div><div class="bracket-team"><span>${teamDisplay(m.home)}</span><em>${m.homeOwner||'TBC owner'}</em><strong>${m.Status==='FINISHED'?m['Home Goals']:''}</strong></div><div class="bracket-team"><span>${teamDisplay(m.away)}</span><em>${m.awayOwner||'TBC owner'}</em><strong>${m.Status==='FINISHED'?m['Away Goals']:''}</strong></div></article>`).join('')}</section>`; }).join(''); }
function renderAll(){ const table=computeTable(); renderMatchCentre(); renderLeaderboard(); renderTeams(); renderFixtures(); renderResults(); renderPlayers(); renderBracket(); }
function switchTab(id){ if(!id) return; $$('.panel').forEach(p=>p.classList.toggle('active',p.id===id)); $$('[data-tab]').forEach(a=>a.classList.toggle('active',a.dataset.tab===id)); history.replaceState(null,'','#'+id); window.scrollTo({top:0,behavior:'smooth'}); }
function apiTeamName(t){ return canon(t?.name || t?.shortName || t?.tla || 'TBC'); }
function apiToLocal(am,index){ const home=apiTeamName(am.homeTeam), away=apiTeamName(am.awayTeam), ft=am.score?.fullTime || {}; const map=ownerMap(); return {ApiId:am.id, DateISO:am.utcDate, Stage:am.stage || '', Status:am.status==='FINISHED'?'FINISHED':(am.status || 'TIMED'), 'Home Team':home, 'Home Owner':map.get(clean(home))||'', 'Home Goals':Number.isFinite(ft.home)?ft.home:null, 'Away Goals':Number.isFinite(ft.away)?ft.away:null, 'Away Owner':map.get(clean(away))||'', 'Away Team':away, Group:am.group?am.group.replace('GROUP_','Group '):stageLabel(am.stage), Venue:'', Competition:'FIFA World Cup 2026', 'Match #':index+1}; }
function replaceWithLiveMatches(apiMatches){ if(!Array.isArray(apiMatches)||!apiMatches.length) return 0; state.matches=apiMatches.map(apiToLocal).sort((a,b)=>new Date(a.DateISO)-new Date(b.DateISO)).map((m,i)=>({...m,'Match #':i+1})); return state.matches.length; }
async function fetchLiveFromNetlify(){ const status=$('#liveStatus'), output=$('#liveOutput'); if(output) output.textContent='Connecting to the live server function...'; let lastError=null; for(const path of ['/api/worldcup','/.netlify/functions/worldcup']){ try{ const res=await fetch(path,{cache:'no-store'}); const text=await res.text(); if(!res.ok) throw new Error(`${path} → ${res.status}: ${text.slice(0,240)}`); const json=JSON.parse(text); const count=replaceWithLiveMatches(json.matches || []); renderAll(); const played=finishedMatches().length; status.textContent=`Live • ${played}/${count} played`; status.className='ok'; if(output) output.textContent=`Connected.\nFunction: ${path}\nFixtures: ${count}\nPlayed: ${played}`; return; }catch(e){ lastError=e.message||String(e); } } status.textContent='Static snapshot'; status.className='warn'; if(output) output.textContent=`Could not load live function.\n${lastError}`; }
$$('[data-tab]').forEach(el=>el.addEventListener('click',e=>{e.preventDefault(); switchTab(el.dataset.tab);}));
['tableSearch','teamSearch','fixtureSearch','statusFilter','stageFilter','resultSearch'].forEach(id=>{ const el=$('#'+id); if(el) el.addEventListener('input',renderAll); });

document.addEventListener('click', e=>{
  const btn = e.target.closest('.player-tab');
  if(!btn) return;
  activePlayer = btn.dataset.player;
  renderPlayers();
});

$('#testLive')?.addEventListener('click',fetchLiveFromNetlify); $('#navSync')?.addEventListener('click',fetchLiveFromNetlify);
renderAll(); setInterval(renderMatchCentre,1000); if(location.hash) switchTab(location.hash.slice(1)); fetchLiveFromNetlify();

/* --- Normal World Cup section + poster-style flowchart upgrade --- */
function isGroupStageMatch(m){
  const st = String(m.Stage || '').toUpperCase();
  const g = String(m.Group || '');
  return st === 'GROUP_STAGE' || /^Group\s+[A-L]/i.test(g);
}
function groupName(m){
  const g = String(m.Group || '');
  const fromGroup = g.match(/Group\s+([A-L])/i);
  if(fromGroup) return `Group ${fromGroup[1].toUpperCase()}`;
  return 'Group Stage';
}
function blankTeamRecord(team){return {Team:team,P:0,W:0,D:0,L:0,GF:0,GA:0,GD:0,Pts:0,Owner:ownerMap().get(clean(canon(team)))||''};}
function buildNormalGroups(){
  const groups = {};
  allMatches().filter(isGroupStageMatch).forEach(m=>{
    const g = groupName(m);
    groups[g] ||= {};
    [m.home,m.away].forEach(t=>{ if(!isTbc(t)) groups[g][canon(t)] ||= blankTeamRecord(canon(t)); });
    if(m.Status === 'FINISHED' && Number.isFinite(+m['Home Goals']) && Number.isFinite(+m['Away Goals'])){
      const h = groups[g][canon(m.home)], a = groups[g][canon(m.away)];
      if(h && a){
        const hg=+m['Home Goals'], ag=+m['Away Goals'];
        addResult(h,hg,ag); addResult(a,ag,hg);
      }
    }
  });
  return Object.fromEntries(Object.entries(groups).sort(([a],[b])=>a.localeCompare(b)).map(([g, rows])=>[
    g,
    Object.values(rows).map(r=>({...r,GD:r.GF-r.GA})).sort((a,b)=>b.Pts-a.Pts||b.GD-a.GD||b.GF-a.GF||b.W-a.W||a.Team.localeCompare(b.Team)).map((r,i)=>({Place:i+1,...r}))
  ]));
}
function qualificationPill(place){
  if(place<=2) return '<span class="qual-pill qualified">Qualifies</span>';
  if(place===3) return '<span class="qual-pill third">3rd place race</span>';
  return '<span class="qual-pill out">—</span>';
}
function renderNormalWorldCup(){
  const elGroups=$('#groupTables'), elSummary=$('#normalSummary');
  if(!elGroups) return;
  const q=clean($('#normalSearch')?.value);
  const groups=buildNormalGroups();
  const finished=finishedMatches().filter(isGroupStageMatch).length;
  const groupTotal=allMatches().filter(isGroupStageMatch).length;
  elSummary.innerHTML=`
    <article><span>World Cup</span><strong>Groups</strong><small>Team standings</small></article>
    <article><span>Played</span><strong>${finished}/${groupTotal}</strong><small>Group matches</small></article>
    <article><span>Progression</span><strong>Top 2 + 8</strong><small>Best third-place teams</small></article>`;
  elGroups.innerHTML=Object.entries(groups)
    .filter(([g,rows])=>!q || clean(g).includes(q) || rows.some(r=>clean(r.Team).includes(q)||clean(r.Owner).includes(q)))
    .map(([g,rows])=>`
      <section class="group-card clean-group-card">
        <div class="group-card-title"><h3>${g}</h3><span>Table</span></div>
        <div class="group-table">
          <div class="group-table-head"><span>#</span><span>Team</span><span>P</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>Pts</span></div>
          ${rows.map(r=>`<article class="group-table-row group-pos-${r.Place}">
            <b>${r.Place}</b>
            <div class="group-team-main">${teamDisplay(r.Team)}<small>${qualificationPill(r.Place)}</small></div>
            <span>${r.P}</span><span>${r.W}</span><span>${r.D}</span><span>${r.L}</span>
            <span class="${r.GD>0?'positive':r.GD<0?'negative':''}">${r.GD>0?'+':''}${r.GD}</span>
            <strong>${r.Pts}</strong>
          </article>`).join('')}
        </div>
      </section>`).join('');
  renderPosterBracket('#normalBracket', true);
}
function fixtureSlotName(m, side){
  const team = side==='home' ? m.home : m.away;
  if(!isTbc(team)) return team;
  const stage = String(m.Stage||'');
  const n = m['Match #'] || '';
  if(stage==='LAST_32') return 'TBC qualifier';
  if(stage==='LAST_16') return 'Winner R32';
  if(stage==='QUARTER_FINALS') return 'Winner R16';
  if(stage==='SEMI_FINALS') return 'Winner QF';
  if(stage==='THIRD_PLACE') return 'Loser SF';
  if(stage==='FINAL') return 'Winner SF';
  return 'TBC';
}
function bracketTeamLine(m, side){
  const team = side==='home' ? m.home : m.away;
  const owner = side==='home' ? m.homeOwner : m.awayOwner;
  const goals = side==='home' ? m['Home Goals'] : m['Away Goals'];
  const name = fixtureSlotName(m, side);
  const known = !isTbc(team);
  return `<div class="poster-team ${known?'known':'tbc'}">
    <span class="poster-team-name">${known?teamDisplay(team):`<span class="flag-placeholder">TBC</span><span>${safe(name)}</span>`}</span>
    <em>${known ? safe(owner || 'No owner') : 'Owner TBC'}</em>
    <strong>${m.Status==='FINISHED' && Number.isFinite(+goals) ? goals : ''}</strong>
  </div>`;
}
function renderPosterBracket(selector='#bracketGrid', normalMode=false){
  const root=$(selector); if(!root) return;
  const stages=['LAST_32','LAST_16','QUARTER_FINALS','SEMI_FINALS','FINAL','THIRD_PLACE'];
  const matches=allMatches();
  root.innerHTML = `<div class="bracket-poster ${normalMode?'normal-mode':''}">${stages.map(stage=>{
    const rows=matches.filter(m=>m.Stage===stage);
    return `<section class="poster-round ${stage.toLowerCase()}">
      <h3>${stageLabel(stage)} <span>${rows.length}</span></h3>
      <div class="poster-round-stack">
      ${rows.map(m=>`<article class="poster-match ${m.Status==='FINISHED'?'done':''}">
        <div class="poster-meta"><span>${fmtDate(m.DateISO)}</span><b>#${m['Match #']||''}</b></div>
        ${bracketTeamLine(m,'home')}
        ${bracketTeamLine(m,'away')}
      </article>`).join('')}
      </div>
    </section>`;}).join('')}</div>`;
}
function renderBracket(){ renderPosterBracket('#bracketGrid', false); }
function renderAll(){ const table=computeTable(); renderMatchCentre(); renderLeaderboard(); renderTeams(); renderFixtures(); renderResults(); renderPlayers(); renderBracket(); renderNormalWorldCup(); }
$('#normalSearch')?.addEventListener('input', renderAll);
