export interface Asset {
  asset_id: string;
  status: 'ready' | 'processing' | 'failed';
  filename: string;
  duration_sec: number;
  sample_rate: number;
  channels: number;
  format: string;
}

export interface DiagnosisIssue {
  severity: number;
  label: 'low' | 'medium' | 'high';
}

export interface DiagnosisResult {
  diagnosis_id: string;
  status: 'queued' | 'processing' | 'completed';
  asset_id: string;
  summary: string;
  detected_issues: {
    hiss_noise?: DiagnosisIssue;
    hum_noise?: DiagnosisIssue;
    click_pop?: DiagnosisIssue;
    clipping?: DiagnosisIssue;
    muddiness?: DiagnosisIssue;
    high_frequency_loss?: DiagnosisIssue;
    mono_detected?: boolean;
    stereo_width?: number;
    phase_risk?: number;
    loudness_lufs?: number;
    true_peak_dbtp?: number;
  };
  recommended_treatments: Array<{
    treatment: string;
    strength: number;
    reason: string;
  }>;
  confidence: number;
}

export interface JobStatus {
  job_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  stage: string;
  stages: Array<{
    name: string;
    status: 'pending' | 'processing' | 'completed';
  }>;
}

export interface JobResult {
  job_id: string;
  status: 'completed';
  output_asset_id: string;
  preview_url: string;
  metrics_before: {
    loudness_lufs: number;
    true_peak_dbtp: number;
    stereo_width: number;
    noise_score: number;
    clarity_score: number;
  };
  metrics_after: {
    loudness_lufs: number;
    true_peak_dbtp: number;
    stereo_width: number;
    noise_score: number;
    clarity_score: number;
  };
  applied_treatments: string[];
}
