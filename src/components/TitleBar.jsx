import { cn } from '../lib/utils';
import { useState, useEffect } from 'react';

export default function TitleBar({ title = "Game Tracker" }) {
  if (!window.electronAPI) return null;
  const [isMaximized, setIsMaximized] = useState(false);

  const handleMinimize = () => {
    if (window.electronAPI) window.electronAPI.minimizeWindow();
  };

  const handleMaximize = () => {
    if (window.electronAPI) {
      window.electronAPI.maximizeWindow();
      setIsMaximized(!isMaximized); 
    }
  };

  const handleClose = () => {
    if (window.electronAPI) window.electronAPI.closeWindow();
  };

  return (
    <div className="h-10 flex items-center justify-between bg-black/20 backdrop-blur-xl border-b border-white/5 select-none relative z-50 drag-region">
      {/* Title / Logo Area */}
      <div className="flex items-center px-4 gap-2 no-drag">
        <div className="w-5 h-5 bg-gradient-to-br from-primary to-purple-600 rounded flex items-center justify-center font-bold text-white text-xs shadow-lg shadow-primary/20">
          G
        </div>
        <span className="text-sm font-medium text-white/80 tracking-wide">{title}</span>
      </div>

      {/* Center Grip/Decoration */}
      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 opacity-20 pointer-events-none">
        <div className="w-32 h-1 rounded-full bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
      </div>

      {/* Window Controls */}
      <div className="flex items-center h-full no-drag">
        <button 
          onClick={handleMinimize}
          className="h-full w-12 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors group"
          title="Simge Durumuna Küçült"
        >
          {/* Custom Minimize Icon */}
          <svg width="10" height="1" viewBox="0 0 10 1" className="fill-current group-hover:scale-110 transition-transform">
            <rect width="10" height="1" rx="0.5" />
          </svg>
        </button>
        
        <button 
          onClick={handleMaximize}
          className="h-full w-12 flex items-center justify-center text-gray-400 hover:bg-white/10 hover:text-white transition-colors group"
          title={isMaximized ? "Küçült" : "Tam Ekran Yap"}
        >
          {/* Custom Maximize/Restore Icon */}
          {isMaximized ? (
            <svg width="10" height="10" viewBox="0 0 10 10" className="group-hover:scale-110 transition-transform">
              <rect x="2.5" y="2.5" width="7.5" height="7.5" stroke="currentColor" strokeWidth="1" fill="none" />
              <path d="M0 7.5V1a1 1 0 0 1 1-1h6.5" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 10 10" className="group-hover:scale-110 transition-transform">
              <rect x="0.5" y="0.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1" fill="none" />
            </svg>
          )}
        </button>
        
        <button 
          onClick={handleClose}
          className="h-full w-12 flex items-center justify-center text-gray-400 hover:bg-red-500 hover:text-white transition-colors group"
          title="Kapat"
        >
          {/* Custom Close Icon */}
          <svg width="10" height="10" viewBox="0 0 10 10" className="group-hover:rotate-90 transition-transform duration-300">
            <path d="M1 1L9 9M9 1L1 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
