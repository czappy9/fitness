// app.js — FitDay PWA main application
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { WORKOUTS, getWeekSchedule, getTodayWorkout, getPhase, getWorkoutForDate } from './workouts.js';
import { isConnected as hkConnected, getDailyHealthSnapshot, computeRecoveryScore } from './healthkit.js';

// ─── Config ──────────────────────────────────────────────────
const SUPABASE_URL  = 'https://savykhwgglgyitxurwhr.supabase.co';
const SUPABASE_ANON = 'sb_publishable_i7Mk1FVF2IdAp9sBQVS4fQ_Ctof5s4e';
const sb = createClient(SUPABASE_URL, SUPABASE_ANON);

// ─── App state ───────────────────────────────────────────────
const state = {
  user: null, settings: null, view: 'today',
  today: { session: null, zone2Log: null, health: null, weekZ2Total: 0, weekSchedule: [] },
};

// ─── Helpers ─────────────────────────────────────────────────
function localDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// ─── Boot ────────────────────────────────────────────────────
async function boot() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(console.warn);
  await sb.auth.initialize();
  const { data: { session } } = await sb.auth.getSession();
  if (session?.user) { state.user = session.user; await loadSettings(); showApp(); }
  else showAuth();
  sb.auth.onAuthStateChange(async (_e, session) => {
    if (session?.user) { state.user = session.user; await loadSettings(); showApp(); }
    else showAuth();
  });
}

// ─── Auth ────────────────────────────────────────────────────
function showAuth() {
  document.getElementById('auth').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}
function showApp() {
  document.getElementById('auth').style.display = 'none';
  document.getElementById('app').style.display = 'flex';
  navigate('today');
}
window.handleAuth = async function () {
  const email = document.getElementById('auth-email').value.trim();
  if (!email) return;
  const btn = document.getElementById('auth-btn');
  btn.textContent = 'Sending link…'; btn.disabled = true;
  const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: 'https://czappy9.github.io/fitness/' } });
  if (error) { btn.textContent = 'Try again'; btn.disabled = false; return; }
  document.getElementById('auth-form').innerHTML = `<p style="text-align:center;color:#276749;font-weight:600;padding:20px 0">✓ Check your email for a magic link!</p>`;
};

// ─── Settings ────────────────────────────────────────────────
async function loadSettings() {
  const { data } = await sb.from('user_settings').select('*').eq('user_id', state.user.id).single();
  if (data) { state.settings = data; return; }
  const { data: created } = await sb.from('user_settings').insert({ user_id: state.user.id, start_date: localDateStr(new Date()) }).select().single();
  state.settings = created;
}
function getWeekNumber() {
  if (!state.settings?.start_date) return 1;
  return Math.max(1, Math.floor((new Date() - new Date(state.settings.start_date)) / (7*24*3600*1000)) + 1);
}

// ─── Navigation ──────────────────────────────────────────────
function navigate(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.querySelectorAll('.view').forEach(el => el.style.display = el.id === `view-${view}` ? 'block' : 'none');
  if (view === 'today')    renderToday();
  if (view === 'week')     renderWeek();
  if (view === 'progress') renderProgress();
}
window.navigate = navigate;

// ─── TODAY ───────────────────────────────────────────────────
async function renderToday() {
  const todayStr = localDateStr(new Date());
  const workoutType = getTodayWorkout();
  const workout = WORKOUTS[workoutType];
  const weekSchedule = getWeekSchedule();
  state.today.weekSchedule = weekSchedule;

  const { data: session } = await sb.from('workout_sessions').select('*').eq('user_id', state.user.id).eq('date', todayStr).maybeSingle();
  state.today.session = session;
  const { data: z2 } = await sb.from('zone2_logs').select('*').eq('user_id', state.user.id).eq('date', todayStr).maybeSingle();
  state.today.zone2Log = z2;

  const weekStart = weekSchedule[0].date;
  const { data: z2Week } = await sb.from('zone2_logs').select('duration_minutes').eq('user_id', state.user.id).gte('date', weekStart).lte('date', todayStr);
  state.today.weekZ2Total = (z2Week || []).reduce((s, r) => s + r.duration_minutes, 0);

  if (hkConnected()) state.today.health = await getDailyHealthSnapshot(todayStr);

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const phase = getPhase(getWeekNumber());
  const z2Pct = Math.min(100, Math.round(state.today.weekZ2Total / 150 * 100));
  const isCompleted = session?.completed;
  const hasZ2 = !!z2;

  let recoveryBadge = '';
  if (state.today.health?.hrv) {
    const score = computeRecoveryScore({ hrv: state.today.health.hrv, sleep: state.today.health.sleep, restingHR: state.today.health.restingHR, hrvBaseline: 45, restingHRBaseline: 65 });
    if (score !== null) {
      const color = score >= 70 ? '#276749' : score >= 40 ? '#854F0B' : '#C53030';
      recoveryBadge = `<span style="font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;background:${color}20;color:${color}">Recovery ${score}</span>`;
    }
  }

  document.getElementById('view-today').innerHTML = `
    <div class="app-header">
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <div><p class="greeting">Good morning</p><p class="day-title">${dayNames[now.getDay()]}</p></div>
        <div style="text-align:right">
          <span class="date-badge">${monthNames[now.getMonth()]} ${now.getDate()}</span><br>
          <span style="font-size:10px;font-weight:700;color:${phase.color};margin-top:4px;display:inline-block">${phase.name} week ${getWeekNumber()}</span>
        </div>
      </div>
      ${recoveryBadge ? `<div style="margin-top:8px">${recoveryBadge}</div>` : ''}
    </div>

    <div class="workout-card" style="background:${workout.gradient}" onclick="openWorkoutDetail()">
      <div class="wc-bg-shape"></div>
      <div class="wc-badge">${workout.icon} ${workout.label}</div>
      <p class="wc-title">${workout.subtitle}</p>
      <p class="wc-sub">${workout.duration}</p>
      ${workoutType === 'zone2' ? `<div class="wc-chips">${WORKOUTS.zone2.activities.map(a => `<span class="wc-chip">${a.icon} ${a.name}</span>`).join('')}</div>`
        : workoutType === 'vo2' ? `<div class="wc-chips">${WORKOUTS.vo2.protocol.map(p => `<span class="wc-chip">${p.phase} ${p.mins}m</span>`).join('')}</div>`
        : workoutType !== 'rest' ? `<div class="wc-chips">${[...new Set(WORKOUTS[workoutType].exercises.map(e => e.category))].map(c => `<span class="wc-chip">${c}</span>`).join('')}</div>`
        : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:14px">
        ${isCompleted ? `<span style="font-size:12px;font-weight:700;color:rgba(255,255,255,.8)">✓ Completed</span>` : `<span style="font-size:12px;color:rgba(255,255,255,.6)">Tap for details →</span>`}
        ${workoutType === 'zone2'
          ? `<button class="start-btn" style="color:${workout.accentColor}" onclick="event.stopPropagation();openZ2Sheet()">${hasZ2 ? '✓ Logged '+z2.duration_minutes+'m' : 'Log session ↑'}</button>`
          : workoutType !== 'rest'
          ? `<button class="start-btn" style="color:${workout.accentColor}" onclick="event.stopPropagation();openWorkoutDetail()">${isCompleted ? 'View log' : 'Start workout →'}</button>`
          : ''}
      </div>
    </div>

    <p class="section-label">Recovery today</p>
    <div class="rec-scroll">
      ${workout.recovery.map(r => `<div class="rec-chip"><span class="rec-icon">${r.icon}</span><span class="rec-name">${r.name}</span><span class="rec-when">${r.timing}</span></div>`).join('')}
    </div>

    <div class="card" style="margin:0 16px 12px">
      <div class="z2-bar-header">
        <span class="z2-bar-title">Zone 2 this week</span>
        <span class="z2-bar-val">${state.today.weekZ2Total} / 150–180 min</span>
      </div>
      <div class="z2-track"><div class="z2-fill" style="width:${z2Pct}%"></div></div>
      <div class="z2-dots" style="margin-top:8px">
        ${weekSchedule.map(d => `<div class="z2d"><span class="z2d-name">${d.dayName.charAt(0)}</span><div class="z2d-dot ${d.isToday ? 'today' : ''}"></div></div>`).join('')}
      </div>
    </div>

    <p class="section-label">This week</p>
    <div class="card" style="margin:0 16px 16px">
      <div class="week-strip">
        ${weekSchedule.map(d => {
          const w = WORKOUTS[d.workoutType];
          const colors = { strength_a:'#2B6CB0', strength_b:'#2B6CB0', vo2:'#C53030', zone2:'#276749', rest:'#888' };
          const bg = d.isToday ? colors[d.workoutType] : `${colors[d.workoutType]}25`;
          const color = d.isToday ? '#fff' : colors[d.workoutType];
          return `<div class="ws-day"><span class="ws-name">${d.dayName.charAt(0)}</span><div class="ws-bubble" style="background:${bg};color:${color};${d.isToday ? `outline:2.5px solid ${colors[d.workoutType]};outline-offset:2px;` : ''}">${w.icon}</div></div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// ─── WORKOUT DETAIL ──────────────────────────────────────────
window.openWorkoutDetail = async function () {
  const workoutType = getTodayWorkout();
  const workout = WORKOUTS[workoutType];
  if (!workout?.exercises && workoutType !== 'vo2') return;

  if (workoutType === 'vo2') {
    document.getElementById('sheet-content').innerHTML = `
      <div style="padding:0 18px 20px">
        <p style="font-size:16px;font-weight:800;margin-bottom:4px">${workout.subtitle}</p>
        <p style="font-size:11px;color:#888;margin-bottom:16px">${workout.duration} · Norwegian 4×4 protocol</p>
        ${workout.protocol.map(p => `
          <div style="background:${p.intensity==='hard'?'#FCEBEB':'#F7F5F0'};border-radius:10px;padding:12px 14px;margin-bottom:8px;display:flex;gap:12px;align-items:flex-start">
            <div style="min-width:52px"><p style="font-size:18px;font-weight:800;color:${p.intensity==='hard'?'#C53030':'#1a1a18'}">${p.mins}m</p><p style="font-size:10px;color:#888;font-weight:600">${p.phase}</p></div>
            <p style="font-size:12px;color:#555;line-height:1.6;margin-top:2px">${p.detail}</p>
          </div>`).join('')}
        <p style="font-size:11px;color:#AAA;margin:12px 0">Activities: ${workout.activities.join(' · ')}</p>
        <button onclick="markVO2Complete()" style="width:100%;margin-top:8px;padding:14px;background:#C53030;color:#fff;border:none;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">✓ Mark session complete</button>
      </div>`;
    openSheet(); return;
  }

  const todayStr = localDateStr(new Date());
  const { data: existingLogs } = await sb.from('exercise_logs').select('*').eq('user_id', state.user.id).eq('date', todayStr);
  const logsByExercise = {};
  (existingLogs || []).forEach(l => { if (!logsByExercise[l.exercise_name]) logsByExercise[l.exercise_name] = []; logsByExercise[l.exercise_name].push(l); });

  document.getElementById('sheet-content').innerHTML = `
    <div style="padding:0 18px 20px">
      <p style="font-size:16px;font-weight:800;margin-bottom:4px">${workout.subtitle}</p>
      <p style="font-size:11px;color:#888;margin-bottom:14px">${workout.duration} · Log sets as you go</p>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAA;margin-bottom:8px">Warm-up (10 min)</p>
      <div style="background:#F7F5F0;border-radius:10px;padding:10px 12px;margin-bottom:14px">
        ${workout.warmup.map(w => `<p style="font-size:11px;color:#555;padding:3px 0;border-bottom:0.5px solid #eee">${w}</p>`).join('')}
      </div>
      ${workout.exercises.map(ex => {
        const logs = logsByExercise[ex.name] || [];
        const setsLabel = ex.duration ? `${ex.sets}×${ex.duration}s` : `${ex.sets}×${ex.repsMin}–${ex.repsMax}`;
        return `<div class="exercise-block">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
            <div><p style="font-size:13px;font-weight:700">${ex.name}</p><p style="font-size:10px;color:#888">${ex.category} · ${setsLabel} · ${ex.load}</p></div>
            <span style="font-size:10px;background:#F0EDE8;padding:2px 8px;border-radius:20px;color:#666;white-space:nowrap">${ex.category}</span>
          </div>
          <p style="font-size:11px;color:#666;margin-bottom:8px;font-style:italic">${ex.cue}</p>
          ${Array.from({length: ex.sets}, (_, i) => {
            const log = logs.find(l => l.set_number === i+1);
            return `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">
              <span style="font-size:11px;font-weight:700;color:#AAA;width:32px">Set ${i+1}</span>
              <input type="number" placeholder="${ex.duration ? ex.duration+'s' : 'Reps'}" min="0" max="50" value="${log?.reps_completed||''}"
                style="width:64px;border:1.5px solid #E0DDD8;border-radius:8px;padding:5px 8px;font-size:12px;font-family:inherit"
                onchange="logSet('${ex.id}','${ex.name}','${ex.category}',${i+1},this.value,'${ex.load}')">
              ${!ex.duration ? `<input type="number" placeholder="lbs" min="0" max="500" value="${log?.weight_lbs||''}"
                style="width:56px;border:1.5px solid #E0DDD8;border-radius:8px;padding:5px 8px;font-size:12px;font-family:inherit"
                onchange="logSetWeight('${ex.id}',${i+1},this.value)">` : ''}
              <span style="font-size:16px;color:${log?'#276749':'#E0DDD8'}">${log?'✓':'○'}</span>
            </div>`;
          }).join('')}
          <p style="font-size:10px;color:#AAA;margin-top:4px">↗ ${ex.progress}</p>
        </div>`;
      }).join('<hr style="border:none;border-top:1px solid #F0EDE8;margin:14px 0">')}
      <button onclick="markWorkoutComplete()" style="width:100%;margin-top:16px;padding:14px;background:#1a1a18;color:#fff;border:none;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">✓ Mark workout complete</button>
    </div>`;
  openSheet();
};

const pendingLogs = {};
window.logSet = async function (exId, exName, category, setNum, reps, load) {
  if (!reps) return;
  const key = `${exId}-${setNum}`;
  pendingLogs[key] = { ...pendingLogs[key], exercise_name: exName, movement_category: category, set_number: setNum, reps_completed: parseInt(reps) };
  await savePendingLog(key, load);
};
window.logSetWeight = function (exId, setNum, weight) {
  const key = `${exId}-${setNum}`;
  if (!pendingLogs[key]) pendingLogs[key] = {};
  pendingLogs[key].weight_lbs = parseFloat(weight) || null;
};
async function savePendingLog(key, load) {
  const session = await ensureSession();
  const log = pendingLogs[key];
  if (!log?.reps_completed) return;
  await sb.from('exercise_logs').upsert({
    session_id: session.id, user_id: state.user.id, date: localDateStr(new Date()),
    exercise_name: log.exercise_name, movement_category: log.movement_category,
    set_number: log.set_number, reps_completed: log.reps_completed, weight_lbs: log.weight_lbs || null,
    band_level: typeof load === 'string' && load.toLowerCase().includes('band') ? 'medium' : null,
  }, { onConflict: 'session_id,exercise_name,set_number' });
}
window.markWorkoutComplete = async function () {
  const session = await ensureSession();
  await sb.from('workout_sessions').update({ completed: true }).eq('id', session.id);
  state.today.session = { ...session, completed: true };
  closeSheet(); renderToday();
};
window.markVO2Complete = async function () {
  const session = await ensureSession();
  await sb.from('workout_sessions').update({ completed: true }).eq('id', session.id);
  state.today.session = { ...session, completed: true };
  closeSheet(); renderToday();
};
async function ensureSession() {
  if (state.today.session) return state.today.session;
  const todayStr = localDateStr(new Date());
  const phase = getPhase(getWeekNumber());
  const { data } = await sb.from('workout_sessions').upsert({
    user_id: state.user.id, date: todayStr, workout_type: getTodayWorkout(),
    week_number: getWeekNumber(), phase: phase.name.toLowerCase(),
  }, { onConflict: 'user_id,date' }).select().single();
  state.today.session = data;
  return data;
}

// ─── ZONE 2 LOG SHEET ────────────────────────────────────────
function durLabel(d) {
  if (d < 60) return d + ' min';
  if (d % 60 === 0) return (d/60) + ' hr';
  return Math.floor(d/60) + 'h ' + (d%60) + 'm';
}

let z2Selection = { activityId: 'run', durationMins: 45 };
window.openZ2Sheet = function () {
  const activities = WORKOUTS.zone2.activities;
  const durations = [20, 30, 45, 60, 90, 120, 180, 240];
  document.getElementById('sheet-content').innerHTML = `
    <div style="padding:0 18px 20px">
      <p style="font-size:16px;font-weight:800;margin-bottom:4px">Log Zone 2 session</p>
      <p style="font-size:11px;color:#888;margin-bottom:16px">Conversational pace · HR 130–145 bpm target</p>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAA;margin-bottom:8px">Activity</p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px">
        ${activities.map(a => `<div onclick="selectActivity('${a.id}')" id="act-${a.id}"
          style="border-radius:12px;padding:8px 4px;text-align:center;cursor:pointer;border:1.5px solid ${z2Selection.activityId===a.id?'#276749':'#E0DDD8'};background:${z2Selection.activityId===a.id?'#EAF3DE':'#F7F5F0'}">
          <div style="font-size:20px">${a.icon}</div>
          <div style="font-size:9px;font-weight:700;color:${z2Selection.activityId===a.id?'#276749':'#888'};margin-top:2px">${a.name}</div>
        </div>`).join('')}
      </div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAA;margin-bottom:8px">Duration</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px">
        ${durations.map(d => `<div onclick="selectDuration(${d})" id="dur-${d}"
          style="font-size:12px;font-weight:700;padding:7px 14px;border-radius:20px;cursor:pointer;border:1.5px solid ${z2Selection.durationMins===d?'#276749':'#E0DDD8'};background:${z2Selection.durationMins===d?'#EAF3DE':'#F7F5F0'};color:${z2Selection.durationMins===d?'#276749':'#666'}">
          ${durLabel(d)}
        </div>`).join('')}
      </div>
      <button onclick="saveZ2Session()" style="width:100%;padding:14px;background:#276749;color:#fff;border:none;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Save session →</button>
    </div>`;
  openSheet();
};
window.selectActivity = function (id) {
  z2Selection.activityId = id;
  WORKOUTS.zone2.activities.forEach(a => {
    const el = document.getElementById(`act-${a.id}`);
    if (!el) return;
    const sel = a.id === id;
    el.style.borderColor = sel ? '#276749' : '#E0DDD8';
    el.style.background = sel ? '#EAF3DE' : '#F7F5F0';
    el.querySelector('div:last-child').style.color = sel ? '#276749' : '#888';
  });
};
window.selectDuration = function (mins) {
  z2Selection.durationMins = mins;
  [20,30,45,60,90,120,180,240].forEach(d => {
    const el = document.getElementById(`dur-${d}`);
    if (!el) return;
    const sel = d === mins;
    el.style.borderColor = sel ? '#276749' : '#E0DDD8';
    el.style.background = sel ? '#EAF3DE' : '#F7F5F0';
    el.style.color = sel ? '#276749' : '#666';
  });
};
window.saveZ2Session = async function () {
  const session = await ensureSession();
  const todayStr = localDateStr(new Date());
  await sb.from('zone2_logs').upsert({
    session_id: session.id, user_id: state.user.id, date: todayStr,
    activity: z2Selection.activityId, duration_minutes: z2Selection.durationMins, source: 'manual',
  }, { onConflict: 'session_id' });
  await sb.from('workout_sessions').update({ completed: true }).eq('id', session.id);
  closeSheet(); renderToday();
};

// ─── WEEK VIEW ───────────────────────────────────────────────
async function renderWeek() {
  const weekSchedule = getWeekSchedule();
  const weekStart = weekSchedule[0].date;
  const weekEnd = weekSchedule[6].date;
  const { data: sessions } = await sb.from('workout_sessions').select('*').eq('user_id', state.user.id).gte('date', weekStart).lte('date', weekEnd);
  const { data: z2Logs } = await sb.from('zone2_logs').select('*').eq('user_id', state.user.id).gte('date', weekStart).lte('date', weekEnd);
  const sessionByDate = {};
  (sessions||[]).forEach(s => sessionByDate[s.date] = s);
  const z2ByDate = {};
  (z2Logs||[]).forEach(z => z2ByDate[z.date] = z);
  const totalZ2 = (z2Logs||[]).reduce((s,z) => s + z.duration_minutes, 0);
  const completedWorkouts = (sessions||[]).filter(s => s.completed && s.workout_type !== 'rest').length;
  const now = new Date();
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const colors = { strength_a:'#2B6CB0', strength_b:'#2B6CB0', vo2:'#C53030', zone2:'#276749', rest:'#888' };

  document.getElementById('view-week').innerHTML = `
    <div class="app-header">
      <div style="display:flex;align-items:baseline;justify-content:space-between">
        <p class="day-title">This week</p>
        <span class="date-badge">${monthNames[now.getMonth()]} ${weekSchedule[0].date.slice(8)}–${weekSchedule[6].date.slice(8)}</span>
      </div>
      <div style="display:flex;gap:8px;margin-top:12px">
        ${[{n:totalZ2+' min',l:'Zone 2 total'},{n:completedWorkouts+'/5',l:'Workouts done'},{n:'Wk '+getWeekNumber(),l:getPhase(getWeekNumber()).name}].map(s => `
          <div style="flex:1;background:#fff;border-radius:12px;padding:10px 12px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
            <p style="font-size:17px;font-weight:800">${s.n}</p>
            <p style="font-size:9px;font-weight:700;color:#AAA;text-transform:uppercase;letter-spacing:.05em">${s.l}</p>
          </div>`).join('')}
      </div>
    </div>
    ${weekSchedule.map(d => {
      const w = WORKOUTS[d.workoutType];
      const session = sessionByDate[d.date];
      const z2 = z2ByDate[d.date];
      const done = session?.completed || false;
      const color = colors[d.workoutType];
      let sub = w.duration;
      if (z2) sub = `${z2.activity} · ${z2.duration_minutes} min logged`;
      if (done && d.workoutType.startsWith('strength')) sub = 'Strength work logged ✓';
      return `<div onclick="viewDayDetail('${d.date}')"
        style="margin:0 16px 8px;background:#fff;border-radius:14px;padding:12px 14px;box-shadow:0 1px 4px rgba(0,0,0,.06);display:flex;align-items:center;gap:12px;cursor:pointer;${d.isToday?'border:1.5px solid #E0DDD8;':''}">
        <div style="width:36px;height:36px;border-radius:10px;background:${color}20;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">${w.icon}</div>
        <div style="flex:1">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:2px">
            <span style="font-size:13px;font-weight:700">${d.dayName} — ${w.label}</span>
            <span style="font-size:10px;font-weight:700;padding:2px 8px;border-radius:20px;background:${color}15;color:${color}">${w.icon} ${d.workoutType==='rest'?'Rest':w.label.split(' ')[0]}</span>
          </div>
          <p style="font-size:11px;color:#888">${d.isToday?'<strong style="color:#1a1a18">Today · </strong>':''}${sub}</p>
        </div>
        <div style="width:20px;height:20px;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;background:${done?'#EAF3DE':'#F0EDE8'};color:${done?'#276749':'#CCC'}">${done?'✓':'·'}</div>
      </div>`;
    }).join('')}
    <div style="height:8px"></div>
  `;
}

// ─── DAY DETAIL + BACKFILL ───────────────────────────────────
window.viewDayDetail = async function (dateStr) {
  const todayStr = localDateStr(new Date());
  if (dateStr === todayStr) { navigate('today'); return; }

  const workoutType = getWorkoutForDate(dateStr);
  const workout = WORKOUTS[workoutType];
  const isPast = dateStr < todayStr;

  const { data: session } = await sb.from('workout_sessions').select('*').eq('user_id', state.user.id).eq('date', dateStr).maybeSingle();
  const { data: z2 } = await sb.from('zone2_logs').select('*').eq('user_id', state.user.id).eq('date', dateStr).maybeSingle();
  const { data: exLogs } = await sb.from('exercise_logs').select('*').eq('user_id', state.user.id).eq('date', dateStr);

  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const d = new Date(dateStr + 'T12:00:00');
  const dayLabel = `${dayNames[d.getDay()]} ${dateStr.slice(5).replace('-','/')}`;
  const completedBadge = session?.completed ? ' · <span style="color:#276749">✓ Completed</span>' : '';

  let content = `<div style="padding:0 18px 20px">
    <p style="font-size:16px;font-weight:800;margin-bottom:2px">${dayLabel}</p>
    <p style="font-size:12px;color:#888;margin-bottom:16px">${workout.label}${completedBadge}</p>`;

  if (workoutType === 'zone2') {
    if (z2) {
      content += `<div style="background:#EAF3DE;border-radius:12px;padding:14px 16px;margin-bottom:14px">
        <p style="font-size:13px;font-weight:700;color:#276749;margin-bottom:4px">Zone 2 logged</p>
        <p style="font-size:14px;font-weight:800">${z2.duration_minutes} min · ${z2.activity}</p>
      </div>`;
    } else if (isPast) {
      content += `<p style="font-size:12px;color:#888;margin-bottom:12px">Nothing logged for this day.</p>`;
    }
    if (isPast) {
      content += `<button onclick="openBackfillZ2('${dateStr}')" style="width:100%;padding:13px;background:${z2?'#F7F5F0':'#276749'};color:${z2?'#555':'#fff'};border:${z2?'1.5px solid #E0DDD8':'none'};border-radius:14px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">${z2?'Edit log':'Log this session →'}</button>`;
    }

  } else if (workoutType.startsWith('strength')) {
    if (exLogs?.length) {
      const byEx = {};
      exLogs.forEach(l => { if (!byEx[l.exercise_name]) byEx[l.exercise_name] = []; byEx[l.exercise_name].push(l); });
      content += `<p style="font-size:11px;font-weight:700;color:#AAA;text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px">What you logged</p>`;
      content += Object.entries(byEx).map(([name, sets]) => `
        <div style="padding:10px 0;border-bottom:1px solid #F0EDE8">
          <p style="font-size:12px;font-weight:700;margin-bottom:4px">${name}</p>
          <p style="font-size:11px;color:#888">${sets.map(s => `Set ${s.set_number}: ${s.reps_completed} reps${s.weight_lbs?' · '+s.weight_lbs+'lb':''}`).join(' · ')}</p>
        </div>`).join('');
    } else if (isPast) {
      content += `<p style="font-size:12px;color:#888;margin-bottom:4px">Nothing logged for this day.</p>`;
    }
    content += `<p style="font-size:11px;font-weight:700;color:#AAA;text-transform:uppercase;letter-spacing:.06em;margin:14px 0 8px">${workout.label} — exercises</p>`;
    content += workout.exercises.map(ex => `
      <div style="padding:9px 0;border-bottom:1px solid #F0EDE8">
        <div style="display:flex;justify-content:space-between;align-items:baseline">
          <p style="font-size:12px;font-weight:700">${ex.name}</p>
          <span style="font-size:10px;color:#AAA">${ex.sets} × ${ex.duration ? ex.duration+'s' : ex.repsMin+'–'+ex.repsMax+' reps'}</span>
        </div>
        <p style="font-size:10px;color:#888;margin-top:2px">${ex.category} · ${ex.load}</p>
        <p style="font-size:10px;color:#AAA;margin-top:2px;font-style:italic">${ex.cue}</p>
      </div>`).join('');
    if (isPast && !session?.completed) {
      content += `<button onclick="backfillStrengthComplete('${dateStr}')" style="width:100%;margin-top:14px;padding:13px;background:#2B6CB0;color:#fff;border:none;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Mark as completed →</button>`;
    }

  } else if (workoutType === 'vo2') {
    if (session?.completed) {
      content += `<div style="background:#FCEBEB;border-radius:12px;padding:14px 16px;margin-bottom:14px"><p style="font-size:13px;font-weight:700;color:#C53030">VO₂ Max session completed ✓</p></div>`;
    } else if (isPast) {
      content += `<p style="font-size:12px;color:#888;margin-bottom:12px">Nothing logged for this day.</p>
        <button onclick="backfillVO2Complete('${dateStr}')" style="width:100%;padding:13px;background:#C53030;color:#fff;border:none;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Mark as completed →</button>`;
    }
  } else {
    content += `<p style="font-size:13px;color:#888">Rest and recovery day.</p>`;
  }

  content += `</div>`;
  document.getElementById('sheet-content').innerHTML = content;
  openSheet();
};

// ─── BACKFILL ZONE 2 ─────────────────────────────────────────
let bfSelection = { activityId: 'run', durationMins: 45 };
window.openBackfillZ2 = function (dateStr) {
  const activities = WORKOUTS.zone2.activities;
  const durations = [20, 30, 45, 60, 90, 120, 180, 240];
  bfSelection = { activityId: 'run', durationMins: 45 };
  document.getElementById('sheet-content').innerHTML = `
    <div style="padding:0 18px 20px">
      <p style="font-size:16px;font-weight:800;margin-bottom:4px">Log Zone 2 — ${dateStr.slice(5).replace('-','/')}</p>
      <p style="font-size:11px;color:#888;margin-bottom:16px">Adding a past session</p>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAA;margin-bottom:8px">Activity</p>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:16px">
        ${activities.map(a => `<div onclick="selectBfActivity('${a.id}')" id="bf-act-${a.id}"
          style="border-radius:12px;padding:8px 4px;text-align:center;cursor:pointer;border:1.5px solid ${a.id==='run'?'#276749':'#E0DDD8'};background:${a.id==='run'?'#EAF3DE':'#F7F5F0'}">
          <div style="font-size:20px">${a.icon}</div>
          <div style="font-size:9px;font-weight:700;color:${a.id==='run'?'#276749':'#888'};margin-top:2px">${a.name}</div>
        </div>`).join('')}
      </div>
      <p style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#AAA;margin-bottom:8px">Duration</p>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:20px">
        ${durations.map(d => `<div onclick="selectBfDuration(${d})" id="bf-dur-${d}"
          style="font-size:12px;font-weight:700;padding:7px 14px;border-radius:20px;cursor:pointer;border:1.5px solid ${d===45?'#276749':'#E0DDD8'};background:${d===45?'#EAF3DE':'#F7F5F0'};color:${d===45?'#276749':'#666'}">
          ${durLabel(d)}
        </div>`).join('')}
      </div>
      <button onclick="saveBackfillZ2('${dateStr}')" style="width:100%;padding:14px;background:#276749;color:#fff;border:none;border-radius:14px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Save session →</button>
    </div>`;
  openSheet();
};
window.selectBfActivity = function (id) {
  bfSelection.activityId = id;
  WORKOUTS.zone2.activities.forEach(a => {
    const el = document.getElementById(`bf-act-${a.id}`);
    if (!el) return;
    const sel = a.id === id;
    el.style.borderColor = sel ? '#276749' : '#E0DDD8';
    el.style.background = sel ? '#EAF3DE' : '#F7F5F0';
    el.querySelector('div:last-child').style.color = sel ? '#276749' : '#888';
  });
};
window.selectBfDuration = function (mins) {
  bfSelection.durationMins = mins;
  [20,30,45,60,90,120,180,240].forEach(d => {
    const el = document.getElementById(`bf-dur-${d}`);
    if (!el) return;
    const sel = d === mins;
    el.style.borderColor = sel ? '#276749' : '#E0DDD8';
    el.style.background = sel ? '#EAF3DE' : '#F7F5F0';
    el.style.color = sel ? '#276749' : '#666';
  });
};
window.saveBackfillZ2 = async function (dateStr) {
  const workoutType = getWorkoutForDate(dateStr);
  const phase = getPhase(getWeekNumber());
  const { data: session } = await sb.from('workout_sessions').upsert({
    user_id: state.user.id, date: dateStr, workout_type: workoutType,
    week_number: getWeekNumber(), phase: phase.name.toLowerCase(), completed: true,
  }, { onConflict: 'user_id,date' }).select().single();
  await sb.from('zone2_logs').upsert({
    session_id: session.id, user_id: state.user.id, date: dateStr,
    activity: bfSelection.activityId, duration_minutes: bfSelection.durationMins, source: 'manual',
  }, { onConflict: 'session_id' });
  closeSheet(); renderWeek();
};
window.backfillVO2Complete = async function (dateStr) {
  const phase = getPhase(getWeekNumber());
  await sb.from('workout_sessions').upsert({
    user_id: state.user.id, date: dateStr, workout_type: 'vo2', completed: true,
    week_number: getWeekNumber(), phase: phase.name.toLowerCase(),
  }, { onConflict: 'user_id,date' });
  closeSheet(); renderWeek();
};
window.backfillStrengthComplete = async function (dateStr) {
  const workoutType = getWorkoutForDate(dateStr);
  const phase = getPhase(getWeekNumber());
  await sb.from('workout_sessions').upsert({
    user_id: state.user.id, date: dateStr, workout_type: workoutType, completed: true,
    week_number: getWeekNumber(), phase: phase.name.toLowerCase(),
  }, { onConflict: 'user_id,date' });
  closeSheet(); renderWeek();
};

// ─── PROGRESS ────────────────────────────────────────────────
async function renderProgress() {
  const now = new Date();
  const eightWeeksAgo = new Date(now);
  eightWeeksAgo.setDate(now.getDate() - 56);
  const startStr = localDateStr(eightWeeksAgo);

  const [{ data: z2Data }, { data: sessionData }, { data: exData }, { data: coachData }] = await Promise.all([
    sb.from('zone2_logs').select('*').eq('user_id', state.user.id).gte('date', startStr),
    sb.from('workout_sessions').select('*').eq('user_id', state.user.id).gte('date', startStr),
    sb.from('exercise_logs').select('*').eq('user_id', state.user.id).gte('date', startStr),
    sb.from('coach_summaries').select('*').eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(1),
  ]);

  const weekTotals = Array.from({ length: 8 }, (_, i) => {
    const wStart = new Date(now);
    wStart.setDate(now.getDate() - (7 - i) * 7);
    wStart.setDate(wStart.getDate() - (wStart.getDay() === 0 ? 6 : wStart.getDay() - 1));
    const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate() + 6);
    const wStartStr = localDateStr(wStart);
    const wEndStr = localDateStr(wEnd);
    const total = (z2Data||[]).filter(z => z.date >= wStartStr && z.date <= wEndStr).reduce((s,z) => s + z.duration_minutes, 0);
    return { label: `W${i+1}`, total, hit: total >= 150 };
  });

  const maxZ2 = Math.max(...weekTotals.map(w => w.total), 180);

  const last28 = Array.from({ length: 28 }, (_, i) => {
    const d = new Date(now); d.setDate(now.getDate() - 27 + i);
    const dateStr = localDateStr(d);
    const session = (sessionData||[]).find(s => s.date === dateStr);
    const isRest = d.getDay() === 0;
    const workoutType = session?.workout_type || null;
    const typeLabels = { strength_a:'S', strength_b:'S', vo2:'V', zone2:'Z', rest:'R' };
    return { done: session?.completed||false, type: workoutType ? typeLabels[workoutType] : (isRest?'R':'?'), isScheduledRest: workoutType==='rest'||isRest };
  });

  const liftNames = ['Goblet squat', 'Push-up progression', 'Single-leg RDL', 'DB shoulder press'];
  const liftProgress = liftNames.map(name => {
    const logs = (exData||[]).filter(e => e.exercise_name === name && e.reps_completed);
    const byWeek = Array.from({ length: 8 }, (_, i) => {
      const wStart = new Date(now); wStart.setDate(now.getDate() - (7-i)*7);
      wStart.setDate(wStart.getDate() - (wStart.getDay()===0?6:wStart.getDay()-1));
      const wEnd = new Date(wStart); wEnd.setDate(wStart.getDate()+6);
      const weekLogs = logs.filter(l => l.date >= localDateStr(wStart) && l.date <= localDateStr(wEnd));
      return weekLogs.length ? Math.max(...weekLogs.map(l => l.reps_completed)) : 0;
    });
    const first = byWeek.find(v => v > 0) || 0;
    const last = [...byWeek].reverse().find(v => v > 0) || 0;
    return { name, byWeek, change: last - first, latest: last };
  });

  const latestCoach = coachData?.[0];
  const weeksSinceCoach = latestCoach ? Math.floor((now - new Date(latestCoach.created_at)) / (7*24*3600*1000)) : 99;
  const totalWorkouts = (sessionData||[]).filter(s => s.completed && s.workout_type !== 'rest').length;
  const totalZ2Mins = (z2Data||[]).reduce((s,z) => s + z.duration_minutes, 0);
  const consistencyPct = totalWorkouts > 0 ? Math.round(totalWorkouts / Math.max(1,(sessionData||[]).filter(s=>s.workout_type!=='rest').length)*100) : 0;

  document.getElementById('view-progress').innerHTML = `
    <div class="app-header">
      <p class="day-title">Progress</p>
      <p style="font-size:12px;color:#888;margin-top:2px">8-week snapshot</p>
    </div>
    <div style="display:flex;gap:8px;margin:0 16px 12px">
      ${[{n:consistencyPct+'%',l:'Consistency',c:consistencyPct>=80?'#276749':'#854F0B'},{n:Math.round(totalZ2Mins/60)+' hrs',l:'Zone 2 total',c:'#276749'},{n:totalWorkouts+'',l:'Workouts logged',c:'#2B6CB0'}].map(s => `
        <div style="flex:1;background:#fff;border-radius:12px;padding:10px;box-shadow:0 1px 4px rgba(0,0,0,.06);text-align:center">
          <p style="font-size:19px;font-weight:800;color:${s.c}">${s.n}</p>
          <p style="font-size:9px;font-weight:700;color:#AAA;text-transform:uppercase;letter-spacing:.04em;line-height:1.3">${s.l}</p>
        </div>`).join('')}
    </div>
    <div style="background:#fff;border-radius:16px;margin:0 16px 10px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <p style="font-size:12px;font-weight:700;margin-bottom:12px">Zone 2 — weekly minutes</p>
      <p style="font-size:9px;color:#38A169;font-weight:700;text-align:right;margin-bottom:3px">150 min target</p>
      <div style="display:flex;align-items:flex-end;gap:5px;height:72px;margin-bottom:4px">
        ${weekTotals.map(w => {
          const h = Math.max(4, Math.round(w.total/maxZ2*68));
          return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:2px;height:100%;justify-content:flex-end">
            <span style="font-size:8px;font-weight:700;color:${w.hit?'#276749':'#AAA'}">${w.total||''}</span>
            <div style="width:100%;border-radius:4px 4px 0 0;background:${w.hit?'#276749':'#D4EFE0'};height:${h}px"></div>
            <span style="font-size:8px;font-weight:600;color:#CCC">${w.label}</span>
          </div>`;
        }).join('')}
      </div>
      <div style="border-top:1.5px dashed #38A169"></div>
    </div>
    <div style="background:#fff;border-radius:16px;margin:0 16px 10px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <p style="font-size:12px;font-weight:700;margin-bottom:10px">Strength — rep progression</p>
      ${liftProgress.map(l => {
        const max = Math.max(...l.byWeek, 1);
        return `<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
          <span style="font-size:10px;font-weight:700;flex:1">${l.name}</span>
          <div style="display:flex;gap:3px;align-items:flex-end;height:24px">
            ${l.byWeek.map(v => `<div style="width:8px;border-radius:2px 2px 0 0;background:${v?'#2B6CB0':'#F0EDE8'};height:${v?Math.round(v/max*22)+2:3}px"></div>`).join('')}
          </div>
          <span style="font-size:11px;font-weight:700;color:${l.change>0?'#276749':'#AAA'};min-width:36px;text-align:right">${l.change>0?'+'+l.change:l.latest||'—'}</span>
        </div>`;
      }).join('')}
    </div>
    <div style="background:#fff;border-radius:16px;margin:0 16px 10px;padding:14px 16px;box-shadow:0 1px 4px rgba(0,0,0,.06)">
      <p style="font-size:12px;font-weight:700;margin-bottom:10px">Consistency — last 4 weeks</p>
      <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">
        ${last28.map(d => `<div style="width:22px;height:22px;border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:8px;font-weight:700;background:${d.isScheduledRest?'#F0EDE8':d.done?'#EAF3DE':'#FCEBEB'};color:${d.isScheduledRest?'#AAA':d.done?'#276749':'#C53030'}">${d.type}</div>`).join('')}
      </div>
      <p style="font-size:9px;color:#AAA;font-weight:600">S = Strength · Z = Zone 2 · V = VO₂ · R = Rest</p>
    </div>
    <div style="background:#1a1a18;border-radius:16px;margin:0 16px 16px;padding:16px 18px">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span style="font-size:22px">🤖</span>
        <div>
          <p style="font-size:13px;font-weight:800;color:#fff">Weekly coach summary</p>
          <p style="font-size:11px;color:rgba(255,255,255,.5)">${latestCoach ? 'Generated '+new Date(latestCoach.created_at).toLocaleDateString() : 'No summary yet'}</p>
        </div>
      </div>
      ${latestCoach ? `<p style="font-size:12px;color:rgba(255,255,255,.75);line-height:1.7;margin-bottom:12px">${latestCoach.summary}</p>` : `<p style="font-size:12px;color:rgba(255,255,255,.5);margin-bottom:12px">Your AI coach analyzes your week and gives you a plain-English summary of what's working, what to focus on, and how your training load looks.</p>`}
      <button onclick="generateCoachSummary()" id="coach-btn"
        style="width:100%;padding:11px;background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.2);border-radius:12px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit">
        ${weeksSinceCoach >= 7 ? '✦ Generate this week\'s summary' : 'Refresh summary'}
      </button>
    </div>
    <div style="height:8px"></div>
  `;
}

// ─── AI COACH ────────────────────────────────────────────────
window.generateCoachSummary = async function () {
  const btn = document.getElementById('coach-btn');
  if (!btn) return;
  btn.textContent = 'Analyzing your week…'; btn.disabled = true;
  const { data: settings } = await sb.from('user_settings').select('anthropic_api_key').eq('user_id', state.user.id).single();
  if (!settings?.anthropic_api_key) { openApiKeySheet(); btn.textContent = '✦ Generate this week\'s summary'; btn.disabled = false; return; }
  const weekStart = getWeekSchedule()[0].date;
  const { data: sessions } = await sb.from('workout_sessions').select('*').eq('user_id', state.user.id).gte('date', weekStart);
  const { data: z2Logs } = await sb.from('zone2_logs').select('*').eq('user_id', state.user.id).gte('date', weekStart);
  const totalZ2 = (z2Logs||[]).reduce((s,z) => s + z.duration_minutes, 0);
  const completedSessions = (sessions||[]).filter(s => s.completed);
  const phase = getPhase(getWeekNumber());
  const metricsSnapshot = { weekStart, phase: phase.name, weekNumber: getWeekNumber(), zone2Minutes: totalZ2, workoutsCompleted: completedSessions.length, workoutTypes: completedSessions.map(s => s.workout_type), activities: [...new Set((z2Logs||[]).map(z=>z.activity))] };
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': settings.anthropic_api_key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 400,
        system: `You are a concise fitness coach giving a weekly summary to a 36-year-old focused on longevity. Their program: 2 strength sessions/week, 1 VO2 max session, 150-180 min Zone 2 cardio/week, rest Sunday. Tone: warm, direct. 2-3 short paragraphs. No bullet points.`,
        messages: [{ role: 'user', content: `Week ${metricsSnapshot.weekNumber} (${metricsSnapshot.phase}): Zone 2 ${metricsSnapshot.zone2Minutes} min, ${metricsSnapshot.workoutsCompleted} workouts completed (${metricsSnapshot.workoutTypes.join(', ')||'none'}). Activities: ${metricsSnapshot.activities.join(', ')||'not logged'}. Give me a coach summary.` }] }),
    });
    const data = await response.json();
    const summary = data.content?.[0]?.text || 'Unable to generate summary.';
    await sb.from('coach_summaries').upsert({ user_id: state.user.id, week_start: weekStart, summary, metrics_snapshot: metricsSnapshot }, { onConflict: 'user_id,week_start' });
    renderProgress();
  } catch (err) { console.error('Coach error:', err); btn.textContent = 'Error — check API key'; btn.disabled = false; }
};
window.openApiKeySheet = function () {
  document.getElementById('sheet-content').innerHTML = `
    <div style="padding:0 18px 20px">
      <p style="font-size:16px;font-weight:800;margin-bottom:4px">Add your Anthropic API key</p>
      <p style="font-size:12px;color:#888;line-height:1.6;margin-bottom:16px">Get yours at console.anthropic.com → API Keys.</p>
      <input id="api-key-input" type="password" placeholder="sk-ant-..." style="width:100%;border:1.5px solid #E0DDD8;border-radius:10px;padding:10px 12px;font-size:12px;font-family:inherit;margin-bottom:12px">
      <button onclick="saveApiKey()" style="width:100%;padding:13px;background:#1a1a18;color:#fff;border:none;border-radius:12px;font-size:13px;font-weight:800;cursor:pointer;font-family:inherit">Save key →</button>
    </div>`;
  openSheet();
};
window.saveApiKey = async function () {
  const key = document.getElementById('api-key-input')?.value?.trim();
  if (!key?.startsWith('sk-ant-')) { alert('Invalid key format'); return; }
  await sb.from('user_settings').upsert({ user_id: state.user.id, anthropic_api_key: key }, { onConflict: 'user_id' });
  state.settings = { ...state.settings, anthropic_api_key: key };
  closeSheet(); generateCoachSummary();
};

// ─── Sheet helpers ────────────────────────────────────────────
function openSheet() {
  document.getElementById('sheet').style.transform = 'translateY(0)';
  document.getElementById('sheet-overlay').style.display = 'block';
}
window.closeSheet = function () {
  document.getElementById('sheet').style.transform = 'translateY(100%)';
  document.getElementById('sheet-overlay').style.display = 'none';
};

boot();
