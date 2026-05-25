// healthkit.js — Apple Watch / HealthKit integration framework
// Currently returns null for all reads (no Watch connected)
// When user connects Apple Watch: these functions populate automatically
// from Apple Health via the Web HealthKit API (iOS PWA only)

// ─── Availability ────────────────────────────────────────────
export function isAvailable() {
  // HealthKit is only available in iOS Safari / PWA home screen
  return typeof window !== 'undefined' &&
    /iphone|ipad/i.test(navigator.userAgent) &&
    typeof window.HealthKit !== 'undefined';
}

export function isConnected() {
  return isAvailable() && localStorage.getItem('hk_connected') === 'true';
}

// ─── Permissions ─────────────────────────────────────────────
export async function requestPermissions() {
  if (!isAvailable()) {
    return { success: false, reason: 'HealthKit not available on this device' };
  }
  try {
    await window.HealthKit.requestAuthorization({
      read: [
        'HKQuantityTypeIdentifierHeartRate',
        'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
        'HKQuantityTypeIdentifierRestingHeartRate',
        'HKQuantityTypeIdentifierVO2Max',
        'HKQuantityTypeIdentifierOxygenSaturation',
        'HKCategoryTypeIdentifierSleepAnalysis',
        'HKQuantityTypeIdentifierActiveEnergyBurned',
        'HKWorkoutType',
      ],
    });
    localStorage.setItem('hk_connected', 'true');
    return { success: true };
  } catch (err) {
    return { success: false, reason: err.message };
  }
}

// ─── Workouts ─────────────────────────────────────────────────
// Returns Apple Watch workouts for a given date
export async function getWorkoutsForDate(dateStr) {
  if (!isConnected()) return null;
  try {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);

    const workouts = await window.HealthKit.queryWorkouts({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    // Map Apple workout types to our activity IDs
    const activityMap = {
      'HKWorkoutActivityTypeRunning': 'run',
      'HKWorkoutActivityTypeCycling': 'cycle',
      'HKWorkoutActivityTypeSwimming': 'swim',
      'HKWorkoutActivityTypeHiking': 'hike',
      'HKWorkoutActivityTypeWalking': 'walk',
      'HKWorkoutActivityTypeRowing': 'row',
      'HKWorkoutActivityTypeTennis': 'sport',
      'HKWorkoutActivityTypeBasketball': 'sport',
      'HKWorkoutActivityTypeSoccer': 'sport',
      'HKWorkoutActivityTypePickleball': 'sport',
      'HKWorkoutActivityTypeMixedCardio': 'sport',
    };

    return workouts.map(w => ({
      activity: activityMap[w.workoutActivityType] || 'sport',
      durationMinutes: Math.round(w.duration / 60),
      avgHr: w.averageHeartRate || null,
      maxHr: w.maximumHeartRate || null,
      calories: w.totalEnergyBurned || null,
      source: 'apple_watch',
      raw: w,
    }));
  } catch (err) {
    console.warn('HealthKit workout query failed:', err);
    return null;
  }
}

// ─── Heart Rate ───────────────────────────────────────────────
export async function getRestingHR(dateStr) {
  if (!isConnected()) return null;
  try {
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(23, 59, 59, 999);

    const samples = await window.HealthKit.querySamples({
      type: 'HKQuantityTypeIdentifierRestingHeartRate',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      unit: 'count/min',
    });

    if (!samples || samples.length === 0) return null;
    return Math.round(samples.reduce((sum, s) => sum + s.quantity, 0) / samples.length);
  } catch (err) {
    console.warn('HealthKit resting HR query failed:', err);
    return null;
  }
}

// ─── HRV ─────────────────────────────────────────────────────
export async function getHRV(dateStr) {
  if (!isConnected()) return null;
  try {
    // Apple Watch measures HRV overnight — query the morning of dateStr
    const start = new Date(dateStr);
    start.setHours(0, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(12, 0, 0, 0);

    const samples = await window.HealthKit.querySamples({
      type: 'HKQuantityTypeIdentifierHeartRateVariabilitySDNN',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      unit: 'ms',
    });

    if (!samples || samples.length === 0) return null;
    // Return the most recent reading
    return Math.round(samples[samples.length - 1].quantity);
  } catch (err) {
    console.warn('HealthKit HRV query failed:', err);
    return null;
  }
}

// ─── Sleep ───────────────────────────────────────────────────
export async function getSleep(dateStr) {
  if (!isConnected()) return null;
  try {
    // Sleep from night before (8pm) to morning (10am)
    const start = new Date(dateStr);
    start.setDate(start.getDate() - 1);
    start.setHours(20, 0, 0, 0);
    const end = new Date(dateStr);
    end.setHours(10, 0, 0, 0);

    const samples = await window.HealthKit.querySamples({
      type: 'HKCategoryTypeIdentifierSleepAnalysis',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    if (!samples || samples.length === 0) return null;

    // Sum up asleep stages
    const asleepStages = [
      'HKCategoryValueSleepAnalysisAsleepCore',
      'HKCategoryValueSleepAnalysisAsleepDeep',
      'HKCategoryValueSleepAnalysisAsleepREM',
    ];

    const totalMs = samples
      .filter(s => asleepStages.includes(s.value))
      .reduce((sum, s) => {
        const dur = new Date(s.endDate) - new Date(s.startDate);
        return sum + dur;
      }, 0);

    return Math.round((totalMs / 3600000) * 10) / 10; // hours, 1 decimal
  } catch (err) {
    console.warn('HealthKit sleep query failed:', err);
    return null;
  }
}

// ─── VO2 Max ─────────────────────────────────────────────────
export async function getVO2Max() {
  if (!isConnected()) return null;
  try {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30); // Last 30 days

    const samples = await window.HealthKit.querySamples({
      type: 'HKQuantityTypeIdentifierVO2Max',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      unit: 'ml/kg/min',
    });

    if (!samples || samples.length === 0) return null;
    return Math.round(samples[samples.length - 1].quantity * 10) / 10;
  } catch (err) {
    console.warn('HealthKit VO2 max query failed:', err);
    return null;
  }
}

// ─── Composite daily health snapshot ─────────────────────────
// Call this once per day to get all metrics in one go
export async function getDailyHealthSnapshot(dateStr) {
  if (!isConnected()) return null;

  const [workouts, restingHR, hrv, sleep, vo2max] = await Promise.allSettled([
    getWorkoutsForDate(dateStr),
    getRestingHR(dateStr),
    getHRV(dateStr),
    getSleep(dateStr),
    getVO2Max(),
  ]);

  return {
    workouts:  workouts.status  === 'fulfilled' ? workouts.value  : null,
    restingHR: restingHR.status === 'fulfilled' ? restingHR.value : null,
    hrv:       hrv.status       === 'fulfilled' ? hrv.value       : null,
    sleep:     sleep.status     === 'fulfilled' ? sleep.value     : null,
    vo2max:    vo2max.status    === 'fulfilled' ? vo2max.value    : null,
    source: 'apple_watch',
    date: dateStr,
  };
}

// ─── Recovery score (0–100) from HRV + sleep + resting HR ────
// Used by AI coach when Apple Watch is connected
export function computeRecoveryScore({ hrv, sleep, restingHR, hrvBaseline, restingHRBaseline }) {
  if (!hrv && !sleep && !restingHR) return null;

  let score = 50; // start neutral

  // HRV contribution (40 pts)
  if (hrv && hrvBaseline) {
    const ratio = hrv / hrvBaseline;
    score += Math.min(20, Math.max(-20, (ratio - 1) * 40));
  }

  // Sleep contribution (35 pts)
  if (sleep !== null) {
    if (sleep >= 8)   score += 20;
    else if (sleep >= 7) score += 10;
    else if (sleep >= 6) score += 0;
    else              score -= 15;
  }

  // Resting HR contribution (25 pts)
  if (restingHR && restingHRBaseline) {
    const delta = restingHR - restingHRBaseline;
    if (delta <= -2) score += 10;
    else if (delta <= 2)  score += 5;
    else if (delta <= 5)  score -= 5;
    else              score -= 15;
  }

  return Math.min(100, Math.max(0, Math.round(score)));
}
