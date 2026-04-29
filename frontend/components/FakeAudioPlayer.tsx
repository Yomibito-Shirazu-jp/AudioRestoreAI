import React, { useState, useEffect } from 'react';
import { Play, Pause, Volume2 } from 'lucide-react';

interface FakeAudioPlayerProps {
  title: string;
  variant?: 'before' | 'after';
}

export const FakeAudioPlayer: React.FC<FakeAudioPlayerProps> = ({ title, variant = 'after' }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let interval: number;
    if (isPlaying) {
      interval = window.setInterval(() => {
        setProgress((p) => {
          if (p >= 100) {
            setIsPlaying(false);
            return 0;
          }
          return p + 1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const togglePlay = () => {
    if (progress >= 100) setProgress(0);
    setIsPlaying(!isPlaying);
  };

  const colorClass = variant === 'after' ? 'bg-brand-500' : 'bg-gray-500';
  const textClass = variant === 'after' ? 'text-brand-400' : 'text-gray-400';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
      <button 
        onClick={togglePlay}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
          variant === 'after' ? 'bg-brand-500 hover:bg-brand-400 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'
        }`}
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
      </button>
      
      <div className="flex-1">
        <div className="flex justify-between items-center mb-2">
          <span className={`text-sm font-medium ${textClass}`}>{title}</span>
          <span className="text-xs text-gray-500">
            00:{Math.floor((progress / 100) * 30).toString().padStart(2, '0')} / 00:30
          </span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden relative cursor-pointer">
          {/* Fake waveform background */}
          <div className="absolute inset-0 opacity-20 flex items-end gap-[2px] px-1">
             {Array.from({ length: 40 }).map((_, i) => (
               <div key={i} className={`w-full ${colorClass}`} style={{ height: `${Math.random() * 100}%` }}></div>
             ))}
          </div>
          {/* Progress bar */}
          <div 
            className={`h-full ${colorClass} relative z-10 transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      
      <div className="hidden sm:flex items-center gap-2 text-gray-500">
        <Volume2 size={18} />
        <div className="w-16 h-1 bg-gray-800 rounded-full">
          <div className="w-3/4 h-full bg-gray-500 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};
