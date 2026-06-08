// workouts.js — Complete workout data for FitDay

// Day of week → workout type (0 = Sunday)
export const SCHEDULE = {
  0: 'rest', 1: 'strength_a', 2: 'zone2',
  3: 'vo2',  4: 'strength_b', 5: 'zone2', 6: 'zone2',
};

export const WORKOUTS = {
  strength_a: {
    label: 'Strength A', subtitle: 'Squat & Push Day',
    icon: '💪', gradient: 'linear-gradient(140deg,#1A3A5C,#2B6CB0)',
    accentColor: '#2B6CB0', duration: '55–60 min',
    warmup: [
      'Hip flexor stretch — 30 sec each side',
      'Thoracic rotation — 30 sec each side',
      "World's greatest lunge — 30 sec each side",
      'Band pull-apart — 15 reps',
      'Deep squat hold — 45 sec',
    ],
    exercises: [
      { id:'goblet_squat', name:'Goblet squat', category:'Squat',
        sets:3, repsMin:8, repsMax:12, load:'25lb DB',
        cue:'Hold DB at chest. Elbows inside knees. 3-sec descent.',
        progress:'Add 1 rep/week → hit 3×15 → slow eccentric → Bulgarian with weight' },
      { id:'split_squat', name:'Bulgarian split squat', category:'Squat',
        sets:3, repsMin:6, repsMax:10, load:'Bodyweight or DBs',
        cue:'Rear foot on couch. Front foot forward. Control the descent.',
        progress:'BW → add DBs → 4-sec eccentric' },
      { id:'pushup', name:'Push-up progression', category:'Horizontal Push',
        sets:3, repsMin:8, repsMax:15, load:'Bodyweight',
        cue:'Pick your level: standard → deficit → archer. Never mindless.',
        progress:'Standard → deficit → archer → single-arm' },
      { id:'floor_press', name:'DB floor press', category:'Horizontal Push',
        sets:3, repsMin:8, repsMax:12, load:'25lb DBs',
        cue:'Lying on back. Press up, pause, 3-sec descent. Floor = shoulder-safe.',
        progress:'25lb → heavier DBs' },
      { id:'lat_pulldown', name:'Band lat pulldown', category:'Vertical Pull',
        sets:3, repsMin:10, repsMax:15, load:'Band',
        cue:'Anchor overhead. Pull elbows to sides, squeeze lats.',
        progress:'Lighter → heavier band → single-arm' },
      { id:'pull_apart', name:'Band pull-apart', category:'Vertical Pull',
        sets:3, repsMin:12, repsMax:18, load:'Band',
        cue:'Arms forward. Pull to T. Squeeze at end range for posture.',
        progress:'Standard → pronated grip → 2-sec hold at end' },
      { id:'face_pull', name:'Band face pull', category:'Back',
        sets:3, repsMin:12, repsMax:18, load:'Band',
        cue:'Anchor at face height. Pull to forehead, elbows high and wide.',
        progress:'Heavier band → add external rotation → single-arm' },
      { id:'bicep_curl', name:'DB bicep curl', category:'Arms',
        sets:2, repsMin:10, repsMax:14, load:'25lb DBs',
        cue:'Full ROM. Supinate at top. Slow 3-sec down. No swinging.',
        progress:'Focus on eccentric → hammer curl variation' },
      { id:'dead_bug', name:'Dead bug', category:'Core',
        sets:3, repsMin:6, repsMax:10, load:'Bodyweight', perSide:true,
        cue:'Opposite arm/leg. Low back flat to floor throughout.',
        progress:'Full range → band resistance → hold DB' },
      { id:'plank_tap', name:'Plank shoulder tap', category:'Core',
        sets:3, repsMin:null, repsMax:null, duration:30, load:'Bodyweight',
        cue:'From plank, tap shoulders alternately. Minimize hip rotation.',
        progress:'Standard plank → shoulder taps → feet elevated' },
    ],
    cooldown: ["Child's pose 45 sec", 'Chest opener 30 sec', 'Hip flexor hold 30 sec each'],
    recovery: [
      { icon:'🧴', name:'Foam roll', timing:'Right after', detail:'Quads, glutes, chest, upper back — 60 sec each' },
      { icon:'🚿', name:'Cold shower', timing:'Within 1 hr', detail:'2–3 min cold finish' },
      { icon:'♨️', name:'Sauna', timing:'This evening', detail:'15–20 min, 2+ hrs after training' },
      { icon:'🤸', name:'Mobility', timing:'Cool-down', detail:"Child's pose, chest opener, hip flexor" },
    ],
  },

  strength_b: {
    label: 'Strength B', subtitle: 'Hinge & Pull Day',
    icon: '🏋️', gradient: 'linear-gradient(140deg,#1A3A5C,#2B6CB0)',
    accentColor: '#2B6CB0', duration: '55–60 min',
    warmup: [
      'Hamstring stretch — 30 sec each side',
      'Hip 90/90 — 30 sec each side',
      'Lat stretch — 30 sec each side',
      'Band shoulder opener — 30 sec',
      'Cat-cow and spinal rotation — 45 sec',
    ],
    exercises: [
      { id:'single_leg_rdl', name:'Single-leg RDL', category:'Hip Hinge',
        sets:3, repsMin:6, repsMax:10, load:'25lb DB(s)', perSide:true,
        cue:'Hinge at hip, flat back. Rear leg as counterbalance. Control all the way.',
        progress:'BW → 1 DB → 2 DBs → eyes closed' },
      { id:'glute_bridge', name:'Glute bridge', category:'Hip Hinge',
        sets:3, repsMin:8, repsMax:12, load:'BW / DB on hips',
        cue:'Drive hips up, squeeze glutes 1 sec at top. Keep ribs down.',
        progress:'BW → DB on hips → single-leg → single-leg + DB' },
      { id:'band_row', name:'Band bent-over row', category:'Horizontal Pull',
        sets:3, repsMin:10, repsMax:15, load:'Band',
        cue:'Hinge 45°. Pull to lower ribs. Squeeze shoulder blades at top.',
        progress:'Single → doubled → single-arm → 3-sec hold' },
      { id:'renegade_row', name:'Renegade row', category:'Horizontal Pull',
        sets:3, repsMin:4, repsMax:8, load:'25lb DBs', perSide:true,
        cue:'Push-up position on DBs. Row one DB. Hips square — no rotation.',
        progress:'Knees down → full plank → add push-up between rows' },
      { id:'shoulder_press', name:'DB shoulder press', category:'Vertical Push',
        sets:3, repsMin:8, repsMax:12, load:'25lb DBs',
        cue:'Elbows at 45°, not flared wide. Press straight up.',
        progress:'Seated → standing → single-arm → Arnold press' },
      { id:'pike_pushup', name:'Pike push-up', category:'Vertical Push',
        sets:2, repsMin:6, repsMax:10, load:'Bodyweight',
        cue:'Downward dog position. Lower head toward floor between hands.',
        progress:'Pike → elevated pike (feet on couch) → wall handstand hold' },
      { id:'superman', name:'Superman hold', category:'Back',
        sets:3, repsMin:8, repsMax:12, load:'Bodyweight',
        cue:'Face down. Lift arms and legs simultaneously. Hold 3 sec at top.',
        progress:'Standard → hold 5 sec → band pull-apart at top' },
      { id:'tricep_ext', name:'Overhead tricep extension', category:'Arms',
        sets:2, repsMin:10, repsMax:14, load:'25lb DB or Band',
        cue:'Both hands or single. Full stretch at bottom. Elbows close to head.',
        progress:'Two-hand → single-arm → slow 3-sec eccentric' },
      { id:'suitcase_carry', name:'Suitcase carry', category:'Carry + Core',
        sets:3, repsMin:null, repsMax:null, duration:30, load:'25lb DB', perSide:true,
        cue:'One hand. Walk slowly. Stand tall. Resist leaning into the weight.',
        progress:'25lb → add time → overhead carry → double carry' },
      { id:'pallof_press', name:'Band Pallof press', category:'Carry + Core',
        sets:3, repsMin:8, repsMax:12, load:'Band', perSide:true,
        cue:'Band at belly height. Stand sideways. Press out, hold 1 sec, return.',
        progress:'Kneeling → standing → staggered stance' },
    ],
    cooldown: ['Pigeon pose 45 sec each', 'Lat stretch 30 sec each', 'Downward dog 45 sec'],
    recovery: [
      { icon:'🧴', name:'Foam roll', timing:'Right after', detail:'Hamstrings, glutes, upper back, lats — 60 sec each' },
      { icon:'🚿', name:'Contrast shower', timing:'Within 1 hr', detail:'1 min hot / 30 sec cold × 3' },
      { icon:'♨️', name:'Sauna', timing:'This evening', detail:'15–20 min, 2+ hrs after training' },
      { icon:'🤸', name:'Mobility', timing:'Cool-down', detail:'Pigeon, lat stretch, downward dog' },
    ],
  },

  vo2: {
    label: 'VO₂ Max', subtitle: 'Interval Training',
    icon: '🔥', gradient: 'linear-gradient(140deg,#6B1111,#C53030)',
    accentColor: '#C53030', duration: '35–40 min',
    protocol: [
      { phase:'Warm-up',    mins:10, intensity:'easy',   detail:'Build gradually. Last 2 min at brisk tempo to prime the system.' },
      { phase:'Work × 3–4', mins:4,  intensity:'hard',   detail:'85–95% max HR. Can say 3–4 words only. Genuinely hard.' },
      { phase:'Recovery',   mins:3,  intensity:'easy',   detail:'Active rest between intervals. Keep moving, do not stop.' },
      { phase:'Cool-down',  mins:5,  intensity:'very easy', detail:'Walk until HR comes fully down before stopping.' },
    ],
    activities: ['Run / hill sprints', 'Stationary bike', 'Rowing machine', 'Jump rope', 'Hill repeats'],
    recovery: [
      { icon:'🧊', name:'Cold shower', timing:'Right after', detail:'3–5 min — best day for cold' },
      { icon:'😴', name:'Sleep tonight', timing:'Priority', detail:'Target 8 hrs — HRV will be suppressed' },
    ],
  },

  zone2: {
    label: 'Zone 2', subtitle: 'Aerobic Base',
    icon: '🏃', gradient: 'linear-gradient(140deg,#1A3A2A,#276749)',
    accentColor: '#276749', duration: '45–60 min',
    hrTarget: { min: 130, max: 145 },
    weeklyTarget: { min: 150, max: 180 },
    activities: [
      { id:'run',   icon:'🏃', name:'Run',   minMins:25, idealMins:45,
        note:'Most efficient. HR reaches Zone 2 fastest.' },
      { id:'cycle', icon:'🚴', name:'Cycle', minMins:40, idealMins:60,
        note:'Low impact. Needs longer to reach Zone 2 HR.' },
      { id:'swim',  icon:'🏊', name:'Swim',  minMins:20, idealMins:35,
        note:'HR runs ~10 bpm lower in water — normal.' },
      { id:'sport', icon:'🎾', name:'Sport', minMins:45, idealMins:75,
        note:'Counts! Intermittent — log 60-70% of session time.' },
      { id:'hike',  icon:'🥾', name:'Hike',  minMins:45, idealMins:75,
        note:'Add elevation to hit Zone 2 easily.' },
      { id:'walk',  icon:'🚶', name:'Walk',  minMins:50, idealMins:75,
        note:'Add incline (5–8%) to reach Zone 2 HR.' },
      { id:'row',   icon:'🚣', name:'Row',   minMins:20, idealMins:35,
        note:'Full body — HR reaches Zone 2 quickly.' },
      { id:'golf', icon:'⛳', name:'Golf', minMins:60, idealMins:90,
        note:'Walking 18 holes = 4–5 miles of Zone 2. Ride a cart and it doesn\'t count.' },
    ],
    recovery: [
      { icon:'🤸', name:'Light stretch', timing:'Post-workout', detail:'5–10 min. Calves, hamstrings, hip flexors.' },
      { icon:'💧', name:'Hydrate', timing:'All day', detail:'Extra 500ml around training' },
      { icon:'♨️', name:'Sauna', timing:'Optional', detail:'Great on Zone 2 days — stacks well aerobically' },
    ],
  },

  rest: {
    label: 'Rest Day', subtitle: 'Full Recovery',
    icon: '😴', gradient: 'linear-gradient(140deg,#2D3748,#4A5568)',
    accentColor: '#4A5568', duration: 'No training',
    recovery: [
      { icon:'♨️', name:'Sauna', timing:'Best day for it', detail:'15–20 min, 2–3 rounds if available' },
      { icon:'🧊', name:'Cold contrast', timing:'After sauna', detail:'2–3 min cold after each round' },
      { icon:'🤸', name:'Full mobility', timing:'Anytime', detail:'20 min — hip 90/90, pigeon, lat stretch, ankles' },
      { icon:'🫁', name:'Breathwork', timing:'Morning', detail:'10–15 min box breathing (4-4-4-4)' },
    ],
  },
};

// Training phases — cycles every 16 weeks
export function getPhase(weekNumber) {
  const cycle = ((weekNumber - 1) % 16) + 1;
  if (cycle % 6 === 0)  return { name:'Deload', color:'#888', description:'Lighter loads, same movements. Let the adaptation sink in.' };
  if (cycle <= 5)  return { name:'Foundation', color:'#276749', description:'Building the base. Nail the movement patterns.' };
  if (cycle <= 11) return { name:'Build', color:'#2B6CB0', description:'Adding volume and complexity. Progressive overload.' };
  return              { name:'Performance', color:'#C53030', description:'Peak intensity. Test your limits before next deload.' };
}

// Get today's workout type
export function getTodayWorkout() {
  return SCHEDULE[new Date().getDay()];
}

// Get workout for a specific date
export function getWorkoutForDate(date) {
  return SCHEDULE[new Date(date + 'T12:00:00').getDay()];
}

// Get the current week's schedule as an array (Mon–Sun)
export function getWeekSchedule(referenceDate = new Date()) {
  const day = referenceDate.getDay();
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return {
      date: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`,
      dayName: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],
      workoutType: SCHEDULE[d.getDay()],
      isToday: d.toDateString() === referenceDate.toDateString(),
    };
  });
}
