import React, { useState, useRef } from 'react';
import { 
  Upload, Mic, Activity, CheckCircle2, AlertCircle, 
  Settings2, Download, ChevronRight, Sparkles, 
  BarChart3, FileAudio
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis
} from 'recharts';
import { api } from './services/api';
import { Asset, DiagnosisResult, JobStatus, JobResult } from './types';
import { FakeAudioPlayer } from './components/FakeAudioPlayer';

type AppStep = 'home' | 'uploading' | 'diagnosing' | 'diagnosis_result' | 'processing' | 'result';

export default function App() {
  const [step, setStep] = useState<AppStep>('home');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResult | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [jobResult, setJobResult] = useState<JobResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // --- Actions ---

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    api.setFile(file);

    try {
      setStep('uploading');
      setError(null);
      const newAsset = await api.uploadAsset(file.name);
      setAsset(newAsset);

      // Automatically start diagnosis after upload
      setStep('diagnosing');
      const { diagnosis_id } = await api.createDiagnosis(newAsset.asset_id);
      const result = await api.getDiagnosis(diagnosis_id);
      setDiagnosis(result);
      setStep('diagnosis_result');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to process audio. Please try again.');
      setStep('home');
    }
  };

  const handleStartRestoration = async () => {
    if (!asset || !diagnosis) return;
    try {
      setStep('processing');
      const { job_id } = await api.createJob(asset.asset_id, diagnosis.diagnosis_id);

      // Poll for status
      let currentProgress = 0;
      let isCompleted = false;

      while (!isCompleted) {
        const status = await api.getJobStatus(job_id, currentProgress);
        setJobStatus(status);
        currentProgress = status.progress;

        if (status.status === 'completed') {
          isCompleted = true;
          const result = await api.getJobResult(job_id);
          setJobResult(result);
          setStep('result');
        } else if (status.status === 'failed') {
          throw new Error('Job failed');
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Restoration failed.');
      setStep('diagnosis_result');
    }
  };

  const resetApp = () => {
    setStep('home');
    setAsset(null);
    setDiagnosis(null);
    setJobStatus(null);
    setJobResult(null);
    setError(null);
  };

  // --- Render Helpers ---

  const renderHeader = () => (
    <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={resetApp}>
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center">
            <Activity className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">AudioRestore <span className="text-brand-400">AI</span></span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="hidden sm:flex items-center gap-2 text-gray-400 bg-gray-800/50 px-3 py-1.5 rounded-full border border-gray-700/50">
            <Sparkles size={14} className="text-yellow-500" />
            <span>Credits: <strong className="text-white">120</strong></span>
          </div>
          <button className="text-gray-400 hover:text-white transition-colors">API Docs</button>
        </div>
      </div>
    </header>
  );

  const renderHome = () => (
    <div className="max-w-4xl mx-auto mt-20 text-center space-y-12">
      <div className="space-y-6">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">
          Revive Your Audio with AI
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          Upload degraded recordings. Our AI Doctor diagnoses issues and automatically applies professional-grade restoration, noise reduction, and remastering.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto">
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={handleFileChange}
        />
        <button 
          onClick={handleFileSelect}
          className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-gray-900 border border-gray-800 hover:border-brand-500/50 hover:bg-gray-800/50 transition-all duration-300"
        >
          <div className="w-16 h-16 rounded-full bg-brand-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Upload className="text-brand-400" size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Upload Audio</h3>
            <p className="text-sm text-gray-400">WAV, MP3, FLAC up to 500MB</p>
          </div>
        </button>

        <button 
          onClick={() => alert('Recording feature is mocked in this demo.')}
          className="group relative flex flex-col items-center gap-4 p-8 rounded-2xl bg-gray-900 border border-gray-800 hover:border-purple-500/50 hover:bg-gray-800/50 transition-all duration-300"
        >
          <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <Mic className="text-purple-400" size={32} />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white mb-1">Record Now</h3>
            <p className="text-sm text-gray-400">Direct from browser or device</p>
          </div>
        </button>
      </div>

      <div className="pt-12 border-t border-gray-800/50">
        <p className="text-sm text-gray-500 mb-6">Powered by Advanced REST API Architecture</p>
        <div className="flex flex-wrap justify-center gap-4 text-xs font-mono text-gray-600">
          <span className="px-3 py-1 rounded-md bg-gray-900 border border-gray-800">POST /v1/diagnoses</span>
          <span className="px-3 py-1 rounded-md bg-gray-900 border border-gray-800">POST /v1/jobs</span>
          <span className="px-3 py-1 rounded-md bg-gray-900 border border-gray-800">GET /v1/previews</span>
        </div>
      </div>
    </div>
  );

  const renderLoadingState = (title: string, subtitle: string) => (
    <div className="max-w-md mx-auto mt-32 text-center space-y-6">
      <div className="relative w-24 h-24 mx-auto">
        <div className="absolute inset-0 rounded-full border-t-2 border-brand-500 animate-spin"></div>
        <div className="absolute inset-2 rounded-full border-r-2 border-purple-500 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <Activity className="text-brand-400 animate-pulse" size={32} />
        </div>
      </div>
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-gray-400">{subtitle}</p>
      </div>
    </div>
  );

  const renderDiagnosisResult = () => {
    if (!diagnosis) return null;

    const chartData = Object.entries(diagnosis.detected_issues)
      .filter(([, value]) => typeof value === 'object' && value !== null && 'severity' in value)
      .map(([key, value]) => ({
        name: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        severity: (value as any).severity * 100,
      }));

    return (
      <div className="max-w-5xl mx-auto mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white flex items-center gap-3">
              <Activity className="text-brand-400" />
              AI Diagnosis Complete
            </h2>
            <p className="text-gray-400 mt-1">Asset: {asset?.filename}</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">Confidence Score</div>
            <div className="text-2xl font-mono text-brand-400">{(diagnosis.confidence * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
          <p className="text-lg text-gray-300 leading-relaxed border-l-4 border-brand-500 pl-4">
            {diagnosis.summary}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Issues Chart */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <AlertCircle className="text-red-400" size={20} />
              Detected Issues
            </h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 0, left: 40, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#9CA3AF" fontSize={12} />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={12} width={120} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6' }}
                    itemStyle={{ color: '#38BDF8' }}
                  />
                  <Bar dataKey="severity" fill="#0EA5E9" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recommended Treatments */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Settings2 className="text-green-400" size={20} />
              AI Prescription
            </h3>
            <div className="space-y-4 flex-1 overflow-y-auto pr-2">
              {diagnosis.recommended_treatments.map((treatment, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-medium text-brand-300 capitalize">
                      {treatment.treatment.replace(/_/g, ' ')}
                    </span>
                    <span className="text-xs font-mono bg-gray-950 px-2 py-1 rounded text-gray-400">
                      Strength: {(treatment.strength * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">{treatment.reason}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button 
            onClick={handleStartRestoration}
            className="bg-brand-600 hover:bg-brand-500 text-white px-8 py-4 rounded-xl font-semibold text-lg flex items-center gap-3 transition-all shadow-lg shadow-brand-500/20 hover:shadow-brand-500/40"
          >
            <Sparkles size={20} />
            Start Restoration Job
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    );
  };

  const renderProcessing = () => {
    if (!jobStatus) return renderLoadingState("Initializing Job...", "Preparing DSP engines");

    return (
      <div className="max-w-2xl mx-auto mt-20 space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold text-white">Restoring Audio</h2>
          <p className="text-gray-400 font-mono text-sm">Job ID: {jobStatus.job_id}</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 space-y-8">
          {/* Main Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-brand-400 capitalize">{jobStatus.stage.replace(/_/g, ' ')}</span>
              <span className="text-white">{Math.round(jobStatus.progress * 100)}%</span>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 transition-all duration-500 ease-out"
                style={{ width: `${jobStatus.progress * 100}%` }}
              />
            </div>
          </div>

          {/* Stages List */}
          <div className="space-y-3">
            {jobStatus.stages.map((stage, idx) => (
              <div key={idx} className="flex items-center gap-4 text-sm">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                  stage.status === 'completed' ? 'bg-green-500/20 border-green-500/50 text-green-400' :
                  stage.status === 'processing' ? 'bg-brand-500/20 border-brand-500/50 text-brand-400 animate-pulse' :
                  'bg-gray-800 border-gray-700 text-gray-600'
                }`}>
                  {stage.status === 'completed' ? <CheckCircle2 size={14} /> : 
                   stage.status === 'processing' ? <Activity size={14} /> : 
                   <span className="w-1.5 h-1.5 rounded-full bg-current" />}
                </div>
                <span className={`capitalize ${
                  stage.status === 'completed' ? 'text-gray-300' :
                  stage.status === 'processing' ? 'text-white font-medium' :
                  'text-gray-600'
                }`}>
                  {stage.name.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderResult = () => {
    if (!jobResult) return null;

    const radarData = [
      { subject: 'Clarity', A: jobResult.metrics_before.clarity_score * 100, B: jobResult.metrics_after.clarity_score * 100, fullMark: 100 },
      { subject: 'Stereo Width', A: jobResult.metrics_before.stereo_width * 100, B: jobResult.metrics_after.stereo_width * 100, fullMark: 100 },
      { subject: 'Noise Free', A: (1 - jobResult.metrics_before.noise_score) * 100, B: (1 - jobResult.metrics_after.noise_score) * 100, fullMark: 100 },
      { subject: 'Loudness', A: (jobResult.metrics_before.loudness_lufs + 30) * 2, B: (jobResult.metrics_after.loudness_lufs + 30) * 2, fullMark: 100 }, // Normalized for chart
    ];

    return (
      <div className="max-w-5xl mx-auto mt-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 text-green-400 mb-4">
            <CheckCircle2 size={32} />
          </div>
          <h2 className="text-3xl font-bold text-white">Restoration Complete</h2>
          <p className="text-gray-400">Your audio has been successfully processed.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left Col: Players & Export */}
          <div className="space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileAudio size={20} className="text-brand-400" />
                Compare Audio
              </h3>
              
              <div className="space-y-4">
                <FakeAudioPlayer title="Original (Before)" variant="before" />
                <FakeAudioPlayer title="Restored (After)" variant="after" />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Export Options</h3>
              <div className="grid grid-cols-2 gap-4 mb-6">
                <button className="bg-brand-600 hover:bg-brand-500 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                  <Download size={18} /> WAV (24bit)
                </button>
                <button className="bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border border-gray-700">
                  <Download size={18} /> MP3 (320k)
                </button>
              </div>
              <p className="text-xs text-center text-gray-500">
                Exporting will consume <strong className="text-gray-300">3 credits</strong>.
              </p>
            </div>
          </div>

          {/* Right Col: Metrics */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-col">
            <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <BarChart3 size={20} className="text-purple-400" />
              Quality Metrics Improvement
            </h3>
            
            <div className="h-64 w-full mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#374151" />
                  <PolarAngleAxis dataKey="subject" tick={{ fill: '#9CA3AF', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={false} axisLine={false} />
                  <Radar name="Before" dataKey="A" stroke="#6B7280" fill="#6B7280" fillOpacity={0.3} />
                  <Radar name="After" dataKey="B" stroke="#0EA5E9" fill="#0EA5E9" fillOpacity={0.5} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#F3F4F6' }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-auto">
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="text-sm text-gray-400 mb-1">Loudness (LUFS)</div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-mono text-white">{jobResult.metrics_after.loudness_lufs.toFixed(1)}</span>
                  <span className="text-sm text-gray-500 line-through mb-1">{jobResult.metrics_before.loudness_lufs.toFixed(1)}</span>
                </div>
              </div>
              <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50">
                <div className="text-sm text-gray-400 mb-1">True Peak (dBTP)</div>
                <div className="flex items-end gap-2">
                  <span className="text-2xl font-mono text-white">{jobResult.metrics_after.true_peak_dbtp.toFixed(1)}</span>
                  <span className="text-sm text-gray-500 line-through mb-1">{jobResult.metrics_before.true_peak_dbtp.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      {renderHeader()}
      
      <main className="flex-1 px-4 py-8">
        {error && (
          <div className="max-w-md mx-auto mb-8 bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}

        {step === 'home' && renderHome()}
        {step === 'uploading' && renderLoadingState("Uploading Audio...", "Securely transferring to storage")}
        {step === 'diagnosing' && renderLoadingState("AI Doctor Diagnosing...", "Analyzing noise floor, frequency response, and phase")}
        {step === 'diagnosis_result' && renderDiagnosisResult()}
        {step === 'processing' && renderProcessing()}
        {step === 'result' && renderResult()}
      </main>
    </div>
  );
}
