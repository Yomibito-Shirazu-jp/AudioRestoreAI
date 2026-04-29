import { Asset, DiagnosisResult, JobStatus, JobResult } from '../types';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const apiMock = {
  // 5. Assets API
  uploadAsset: async (filename: string): Promise<Asset> => {
    await delay(1500);
    return {
      asset_id: `ast_${Math.random().toString(36).substring(7)}`,
      status: 'ready',
      filename,
      duration_sec: 213.4,
      sample_rate: 44100,
      channels: 1,
      format: 'wav'
    };
  },

  // 7. Diagnosis API
  createDiagnosis: async (_assetId: string): Promise<{ diagnosis_id: string }> => {
    await delay(800);
    return { diagnosis_id: `dia_${Math.random().toString(36).substring(7)}` };
  },

  getDiagnosis: async (diagnosisId: string): Promise<DiagnosisResult> => {
    await delay(2000);
    return {
      diagnosis_id: diagnosisId,
      status: 'completed',
      asset_id: 'ast_mock',
      summary: 'ヒスノイズと高域欠損があり、モノラル録音です。ノイズ除去、EQ補正、ステレオ復元、軽いリマスタリングを推奨します。',
      detected_issues: {
        hiss_noise: { severity: 0.82, label: 'high' },
        hum_noise: { severity: 0.24, label: 'low' },
        click_pop: { severity: 0.35, label: 'medium' },
        clipping: { severity: 0.12, label: 'low' },
        muddiness: { severity: 0.64, label: 'medium' },
        high_frequency_loss: { severity: 0.78, label: 'high' },
        mono_detected: true,
        stereo_width: 0.04,
        phase_risk: 0.11,
        loudness_lufs: -23.7,
        true_peak_dbtp: -5.8
      },
      recommended_treatments: [
        { treatment: 'de_hiss', strength: 0.75, reason: 'テープ由来と思われる持続的なヒスノイズを検出しました。' },
        { treatment: 'eq_recovery', strength: 0.68, reason: '高域の欠損と中低域のこもりを検出しました。' },
        { treatment: 'stereo_restoration', strength: 0.55, reason: 'モノラル音源のため、自然なステレオ音場への復元が可能です。' },
        { treatment: 'loudness_remaster', strength: 0.6, reason: '現代的な再生環境に対して音量が小さいです。' }
      ],
      confidence: 0.89
    };
  },

  // 8. Restoration Job API
  createJob: async (_assetId: string, _diagnosisId: string): Promise<{ job_id: string }> => {
    await delay(1000);
    return { job_id: `job_${Math.random().toString(36).substring(7)}` };
  },

  getJobStatus: async (jobId: string, progress: number): Promise<JobStatus> => {
    await delay(1000);
    const newProgress = Math.min(progress + 0.25, 1.0);
    
    let stage = 'audio_analysis';
    if (newProgress > 0.2) stage = 'noise_reduction';
    if (newProgress > 0.5) stage = 'eq_recovery';
    if (newProgress > 0.7) stage = 'stereo_restoration';
    if (newProgress >= 1.0) stage = 'final_remastering';

    return {
      job_id: jobId,
      status: newProgress >= 1.0 ? 'completed' : 'processing',
      progress: newProgress,
      stage,
      stages: [
        { name: 'audio_analysis', status: newProgress > 0.2 ? 'completed' : 'processing' },
        { name: 'noise_reduction', status: newProgress > 0.5 ? 'completed' : newProgress > 0.2 ? 'processing' : 'pending' },
        { name: 'eq_recovery', status: newProgress > 0.7 ? 'completed' : newProgress > 0.5 ? 'processing' : 'pending' },
        { name: 'stereo_restoration', status: newProgress >= 1.0 ? 'completed' : newProgress > 0.7 ? 'processing' : 'pending' },
        { name: 'final_remastering', status: newProgress >= 1.0 ? 'completed' : 'pending' }
      ]
    };
  },

  getJobResult: async (jobId: string): Promise<JobResult> => {
    await delay(500);
    return {
      job_id: jobId,
      status: 'completed',
      output_asset_id: `ast_restored_${Math.random().toString(36).substring(7)}`,
      preview_url: 'https://example.com/preview.mp3',
      metrics_before: {
        loudness_lufs: -23.7,
        true_peak_dbtp: -5.8,
        stereo_width: 0.04,
        noise_score: 0.81,
        clarity_score: 0.38
      },
      metrics_after: {
        loudness_lufs: -14.2,
        true_peak_dbtp: -1.0,
        stereo_width: 0.72,
        noise_score: 0.19,
        clarity_score: 0.81
      },
      applied_treatments: [
        'de_hiss',
        'de_click',
        'eq_recovery',
        'stereo_restoration',
        'loudness_remaster'
      ]
    };
  }
};
