export const ACTIVE = new Set(['building', 'planning']);
export const STATUSES = ['building', 'planning', 'might-pursue', 'idea', 'on-hold', 'finished', 'graveyard'];
export const TASK_STATUSES = ['todo', 'doing', 'blocked', 'done', 'dropped'];
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function plusDays(day, count) {
  const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + count); return localDay(d);
}
export function dayDiff(a, b) { return Math.round((Date.parse(a+'T12:00:00Z') - Date.parse(b+'T12:00:00Z')) / 86400000); }
export const openTask = t => !['done','dropped'].includes(t.status);
export function taskHorizon(t) {
  if (t.horizon) return t.horizon;
  const week = /week\s*(\d+)/i.exec(t.notes || '');
  return (week && Number(week[1]) > 1) || /\blater\b/i.test(t.notes || '') ? 'backlog' : 'next';
}
export function derive(state, scan = {}, now = new Date()) {
  const day = localDay(now), horizon = plusDays(day,7);
  const projects = state.projects.map(p => {
    const tasks = state.tasks.filter(t=>t.project===p.id);
    const milestones = p.milestones || [];
    return {...p, active:ACTIVE.has(p.status), open:tasks.filter(openTask).length,
      progress:milestones.length ? Math.round(milestones.filter(m=>m.done).length/milestones.length*100) : null,
      observed:scan.projects?.[p.id] || null};
  });
  const byId = Object.fromEntries(projects.map(p=>[p.id,p]));
  const live = state.tasks.filter(t=>byId[t.project]?.active && openTask(t));
  const available = live.filter(t=>t.status!=='blocked' && (!t.snoozeUntil || t.snoozeUntil<=day));
  const score = t => (t.focusOn===day?10000:0) + (t.due && t.due<=day?2000:0) + (t.status==='doing'?600:0) + ({high:300,med:100,low:0}[t.priority]||0) + (t.needsMe?20:0);
  const ordered = available.filter(t=>t.focusOn===day || (t.due && t.due<=day) || (taskHorizon(t)!=='backlog' && (!t.due || t.due<=day)))
    .sort((a,b)=>score(b)-score(a)||String(a.due||'9999').localeCompare(b.due||'9999')||a.id.localeCompare(b.id));
  // Prefer one step per project, but an explicit pin or overdue deadline always wins.
  const focus = [], used = new Set();
  for (const t of ordered) if (focus.length<3 && (t.focusOn===day || (t.due && t.due<=day) || !used.has(t.project))) {focus.push(t);used.add(t.project);}
  for (const t of ordered) if(focus.length<3 && !focus.includes(t)) focus.push(t);
  const alerts = [], agenda = [];
  const addAlert = a => alerts.push({...a, snoozeUntil:state.alerts?.[a.id]?.snoozeUntil || null});
  for(const t of live) {
    if(t.due) {
      agenda.push({id:'task:'+t.id,project:t.project,title:t.title,date:t.due,kind:'Deadline',taskId:t.id});
      if(t.due<=horizon && (!t.snoozeUntil || t.snoozeUntil<=day)) addAlert({id:'due:'+t.id+':'+t.due,project:t.project,taskId:t.id,title:t.title,detail:t.due<day?'Overdue since '+t.due:t.due===day?'Due today':'Due '+t.due,severity:t.due<=day?'urgent':'notice',kind:'Due date',date:t.due});
    }
  }
  for(const p of projects.filter(p=>p.active)) {
    const waits=[].concat(p.waitingOn||[]);
    for(const [i,w] of waits.entries()) {
      // Merge the registry follow-up with a corresponding dated task.
      const matching = live.find(t=>t.project===p.id && t.due===w.followUp && /follow.up/i.test(t.title));
      if(w.followUp && !matching) agenda.push({id:`wait:${p.id}:${i}`,project:p.id,title:`Follow up with ${w.who}`,date:w.followUp,kind:'Follow-up'});
      if(!matching && (!w.followUp || w.followUp<=horizon)) addAlert({id:`wait:${p.id}:${i}:${w.followUp||'undated'}`,project:p.id,title:w.followUp?`Follow up with ${w.who}`:`Waiting on ${w.who}`,detail:w.followUp?`${w.about} · ${w.followUp}`:`${w.about} · no follow-up date`,severity:w.followUp&&w.followUp<=day?'urgent':'notice',kind:'Waiting',date:w.followUp||null});
    }
    const obs=p.observed;
    if(obs?.error) addAlert({id:`scan:${p.id}`,project:p.id,title:`Cannot scan ${p.name}`,detail:obs.error,severity:'urgent',kind:'Scan health'});
    const last = obs?.newest ? localDay(new Date(obs.newest)) : p.lastTouched;
    if(last && dayDiff(day,last)>state.settings.staleDays) addAlert({id:`quiet:${p.id}:${last}`,project:p.id,title:`Check in on ${p.name}`,detail:`No recorded activity for ${dayDiff(day,last)} days. File activity is not proof of progress.`,severity:'quiet',kind:'Check-in'});
  }
  const visible = alerts.filter(a=>!a.snoozeUntil || a.snoozeUntil<=day).sort((a,b)=>({urgent:0,notice:1,quiet:2}[a.severity]-{urgent:0,notice:1,quiet:2}[b.severity])||String(a.date||'9999').localeCompare(b.date||'9999'));
  agenda.sort((a,b)=>a.date.localeCompare(b.date));
  const overdue = live.filter(t=>t.due && t.due<day).length;
  const dueToday = live.filter(t=>t.due===day).length;
  return {day,projects,focus,alerts:visible,snoozed:alerts.filter(a=>a.snoozeUntil>day),agenda,stats:{active:projects.filter(p=>p.active).length,open:live.length,overdue,dueToday,decisions:live.filter(t=>t.needsMe).length,blocked:live.filter(t=>t.status==='blocked').length},
    brief:{title:overdue?`${overdue} overdue ${overdue===1?'step needs':'steps need'} a decision.`:dueToday?`${dueToday} ${dueToday===1?'thing':'things'} due today.`:'A little space to move forward.',
      text:overdue?'Finish it, choose a new date, or deliberately park it.':dueToday?'Start with the dated commitments, then make room for one useful step.':agenda.find(a=>a.date>day)?`Nothing is due today. Your next commitment is ${agenda.find(a=>a.date>day).date}.`:'Nothing is due today. Choose one useful step and leave the rest for later.'}};
}
export function handover(state, model, projectId) {
  const projects = model.projects.filter(p=>projectId?p.id===projectId:p.active);
  return [`# Daybook handover · ${model.day}`, '', 'Recorded plans and observed file activity are separate. Never infer completion from a file change.', 'Local records only; external integrations are recorded context, not live checks.', '', ...projects.flatMap(p=>[
    `## ${p.name} (${p.status})`, (p.handover||p.summary||'').slice(0,1400), `Next: ${p.nextAction||'Not recorded'}`,
    `Milestones: ${(p.milestones||[]).filter(m=>m.done).length}/${(p.milestones||[]).length} recorded complete`,
    `Observed: ${p.observed?.scannedAt||'Not scanned'}; latest file activity ${p.observed?.newest||'unknown'}`,
    ...[].concat(p.waitingOn||[]).map(w=>`Waiting: ${w.who} — ${w.about}; follow up ${w.followUp||'not set'}`),
    'Open tasks (up to 5):', ...state.tasks.filter(t=>t.project===p.id&&openTask(t)).slice(0,5).map(t=>`- [${t.status}] ${t.title}${t.due?' · due '+t.due:''}`),
    'Read first:', ...(p.readFirst||[]).slice(0,5).map(x=>'- '+x), 'Skip:', ...(p.skip||[]).slice(0,4).map(x=>'- '+x),''
  ])].join('\n');
}
