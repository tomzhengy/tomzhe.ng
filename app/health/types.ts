export type DataState = "ok" | "loading" | "empty" | "error";

export interface CycleScore {
  strain: number;
  kilojoule: number;
  average_heart_rate: number;
  max_heart_rate: number;
}

export interface Cycle {
  id: number | string;
  start: string;
  end: string | null;
  score: CycleScore | null;
}

export interface RecoveryScore {
  recovery_score: number;
  resting_heart_rate: number;
  hrv_rmssd_milli: number;
  spo2_percentage: number;
  skin_temp_celsius: number;
  user_calibrating: boolean;
}

export interface Recovery {
  cycle_id: number | string;
  sleep_id: number | string;
  score: RecoveryScore | null;
}

export interface SleepStageSummary {
  total_in_bed_time_milli: number;
  total_awake_time_milli: number;
  total_no_data_time_milli: number;
  total_light_sleep_time_milli: number;
  total_slow_wave_sleep_time_milli: number;
  total_rem_sleep_time_milli: number;
  sleep_cycle_count: number;
  disturbance_count: number;
}

export interface SleepScore {
  stage_summary: SleepStageSummary;
  sleep_performance_percentage: number;
  sleep_efficiency_percentage: number;
  respiratory_rate: number;
}

export interface Sleep {
  id: number | string;
  start: string;
  end: string;
  nap: boolean;
  score: SleepScore | null;
}

export interface ZoneDurations {
  zone_zero_milli: number;
  zone_one_milli: number;
  zone_two_milli: number;
  zone_three_milli: number;
  zone_four_milli: number;
  zone_five_milli: number;
}

export interface WorkoutScore {
  strain: number;
  average_heart_rate: number;
  max_heart_rate: number;
  kilojoule: number;
  distance_meter: number | null;
  zone_durations: ZoneDurations;
}

export interface Workout {
  id: number | string;
  start: string;
  end: string;
  sport_name: string;
  score: WorkoutScore | null;
}

export interface TrendPoint {
  date: string;
  recovery: number | null;
  strain: number | null;
  sleep: number | null;
  hrv: number | null;
  rhr: number | null;
}

export interface Copy {
  headline: string;
  sub: string;
  strainCopy: string;
  sleepCopy: string;
  journal: {
    weekly: string;
    watch: string;
    checkIn: string;
  };
}

export interface HealthPayload {
  state: DataState;
  syncedAt: number;
  cycle: Cycle | null;
  recovery: Recovery | null;
  sleep: Sleep | null;
  workouts: Workout[];
  trend: TrendPoint[];
  copy: Copy | null;
  message?: string;
}
