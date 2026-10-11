import { localDay, plusDays } from '../lib/model.mjs';

// Entirely fictional. Dates are relative to the first run so a fresh clone is useful.
export function createSeed(now = new Date(), personal = false) {
  const day=localDay(now), date=n=>plusDays(day,n);
  const project=(id,name,summary,status,priority,nextAction,milestones,extra={})=>({id,name,summary,status,priority,nextAction,lastTouched:day,milestones:milestones.map(([title,done])=>({title,done})),readFirst:[],skip:[],connections:[],...extra});
  const projects=personal?[]:[
    project('northstar','Northstar launch','A fictional launch for a small independent design studio. A clear offer, a focused landing page, and a short feedback round.','building','high','Review the launch story, then ask for feedback on the first draft.',[['Audience and offer defined',true],['Landing page drafted',true],['Message tested with readers',false],['Launch checklist signed off',false]],{handover:'Fictional project: strategy and initial copy are ready. Review the message before polishing the visual details.',readFirst:['northstar/launch-brief.md','northstar/copy-draft.md'],skip:['Archived concepts'],connections:[{name:'Feedback board',state:'planned',note:'Illustrative context only. No external service is connected.'}]}),
    project('studio','Studio operations','A fictional workflow improvement project: reduce repeated handoffs and make ownership easier to see.','building','med','Confirm the handoff owner before simplifying the intake checklist.',[['Current workflow mapped',true],['Bottlenecks listed',true],['Checklist drafted',true],['Pilot run completed',false]],{waitingOn:{who:'Jamie (fictional)',about:'Feedback on the intake checklist',followUp:date(2)},readFirst:['studio/operation-map.md']}),
    project('learning','Learning journal','A fictional practice space for turning small research sessions into useful notes and repeatable habits.','planning','med','Finish one focused learning session and capture three practical takeaways.',[['Learning objective chosen',true],['First note written',false],['Weekly reflection completed',false]]),
    project('workshop','Community workshop','A fictional one-day workshop: simple logistics, useful materials and a clear attendee experience.','planning','low','Confirm the venue, then finalise the session outline.',[['Workshop outline drafted',true],['Venue confirmed',false],['Materials prepared',false]],{waitingOn:{who:'Taylor (fictional)',about:'Venue availability',followUp:date(5)}}),
    project('reading','Reading companion','A deliberately paused fictional idea. It does not compete for daily attention.','on-hold','low','Revisit only after the launch.',[]),
    project('archive','Welcome guide','A completed fictional writing project, preserved as a reference.','finished','low','Keep as a reference.',[['Guide drafted',true],['Guide reviewed',true]])
  ];
  const tasks=personal?[]:[
    {id:'launch-review',project:'northstar',title:'Review the launch story and first impression',priority:'high',needsMe:true},
    {id:'learning-session',project:'learning',title:'Complete one focused learning session',priority:'med'},
    {id:'studio-owner',project:'studio',title:'Name the owner of each handoff',priority:'med',needsMe:true},
    {id:'studio-followup',project:'studio',title:'Follow up with Jamie on the intake checklist',priority:'high',due:date(2)},
    {id:'launch-test',project:'northstar',title:'Prepare five questions for the feedback round',priority:'med',due:date(3)},
    {id:'workshop-draft',project:'workshop',title:'Draft the workshop materials',priority:'low',horizon:'backlog'},
    {id:'launch-backlog',project:'northstar',title:'Explore a second landing-page variation',priority:'low',horizon:'backlog'},
    {id:'studio-blocked',project:'studio',title:'Run the first intake pilot',priority:'med',status:'blocked'},
    {id:'launch-done',project:'northstar',title:'Define the audience and the offer',priority:'med',status:'done',doneAt:day},
    {id:'parked',project:'reading',title:'Explore the reading companion concept',priority:'low',due:date(-3)}
  ].map(t=>({status:'todo',horizon:'next',source:'fictional sample',notes:'Illustrative sample task. Replace it with your own work in personal mode.',...t}));
  return {schema:1,revision:1,importedAt:now.toISOString(),dataset:personal?'personal':'fictional-sample',projects,tasks,
    profile:{name:personal?'You':'Alex',headline:personal?'Your personal workspace':'A fictional independent maker, balancing focused work and small experiments.',summary:personal?'Add a short summary of how you want to work.':'Alex is a fictional persona used to demonstrate Daybook. All projects, contacts, tasks and references in this demo are invented.',confidence:personal?'Personal notes':'Fictional sample profile — not a real person',updated:day,interests:personal?[]:[{name:'Thoughtful product design',trend:'steady',note:'Clear workflows and fewer competing priorities.'},{name:'Learning by doing',trend:'rising',note:'Small experiments with a written reflection.'}],directions:personal?[]:[{title:'Ship one clear, useful launch',horizon:'now',status:'active',why:'Keep attention on a bounded project.'}],style:personal?[]:['Choose a small number of steps each day.','Record decisions so context is easy to recover.'],values:personal?[]:['Clarity','Privacy','Useful progress'],history:[]},
    paths:{},alerts:{},notes:personal?{}:{[day]:'A good day does not need a long list. Finish the launch review, clarify one handoff, and make space to learn.'},settings:{scanMinutes:10,scanDepth:5,staleDays:14,theme:'navy'},history:[]};
}

// A fixture, not the result of reading anyone's filesystem.
export function sampleScan(state, now=new Date()) {
  const generated=now.toISOString();
  const examples={northstar:[['launch-brief.md','Document'],['copy-draft.md','Document'],['index.html','Code']],studio:[['operation-map.md','Document'],['intake-checklist.md','Document']],learning:[['session-notes.md','Document']],workshop:[['workshop-outline.md','Document']]};
  const projects={};
  for(const p of state.projects.filter(p=>['building','planning'].includes(p.status))) {
    const files=(examples[p.id]||[]).map(([name,kind],i)=>({name,path:name,kind,size:1200+i*420,modified:generated}));
    if(files.length)projects[p.id]={files,count:files.length,newest:generated,scannedAt:generated,durationMs:0,truncated:false,warnings:[],simulated:true,git:{available:false}};
  }
  return {generated,projects,changes:[],durationMs:0,baseline:true,simulated:true,limits:{depth:0,entriesPerProject:0,millisecondsPerProject:0}};
}
