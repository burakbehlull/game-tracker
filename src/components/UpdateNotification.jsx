import { useState, useEffect } from 'react';
import { Download, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react';

const UpdateNotification = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [status, setStatus] = useState('IDLE'); // IDLE, AVAILABLE, DOWNLOADING, DOWNLOADED, ERROR
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onUpdateMessage) {
      window.electronAPI.onUpdateMessage((data) => {
        const { status: mainStatus, data: payload } = data;
        
        switch (mainStatus) {
          case 'UPDATE_AVAILABLE':
            setUpdateInfo(payload);
            setStatus('AVAILABLE');
            setIsVisible(true);
            break;
          case 'DOWNLOAD_PROGRESS':
            setStatus('DOWNLOADING');
            setProgress(Math.round(payload.percent));
            break;
          case 'UPDATE_DOWNLOADED':
            setStatus('DOWNLOADED');
            setProgress(100);
            break;
          case 'UPDATE_ERROR':
            setStatus('ERROR');
            console.error('Update error:', payload);
            break;
          case 'UPDATE_NOT_AVAILABLE':
            setStatus('IDLE');
            setIsVisible(false);
            break;
          default:
            break;
        }
      });
    }
  }, []);

  const handleDownload = () => {
    if (window.electronAPI) {
      window.electronAPI.startUpdateDownload();
    }
  };

  const handleInstall = () => {
    if (window.electronAPI) {
      window.electronAPI.installUpdate();
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[9999] animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="w-80 overflow-hidden rounded-xl border border-white/10 bg-black/80 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-primary/20 px-4 py-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 text-primary ${status === 'DOWNLOADING' ? 'animate-spin' : ''}`} />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">Güncelleme</span>
          </div>
          <button 
            onClick={() => setIsVisible(false)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {status === 'AVAILABLE' && (
            <div className="space-y-3">
              <p className="text-sm text-foreground">
                Yeni bir versiyon mevcut! <span className="font-bold text-primary">v{updateInfo?.version}</span>
              </p>
              <button 
                onClick={handleDownload}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                <Download className="w-4 h-4" />
                Şimdi İndir
              </button>
            </div>
          )}

          {status === 'DOWNLOADING' && (
            <div className="space-y-3">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">İndiriliyor...</span>
                <span className="text-primary font-mono">{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 ease-out shadow-[0_0_8px_rgba(var(--primary),0.5)]" 
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {status === 'DOWNLOADED' && (
            <div className="space-y-3 text-center">
              <div className="flex justify-center">
                <div className="rounded-full bg-green-500/20 p-2">
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                </div>
              </div>
              <p className="text-sm text-foreground">
                Güncelleme hazır! Uygulamayı yeniden başlatarak kurabilirsiniz.
              </p>
              <button 
                onClick={handleInstall}
                className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 transition-all active:scale-95 shadow-lg shadow-green-900/20"
              >
                Şimdi Yeniden Başlat
              </button>
            </div>
          )}

          {status === 'ERROR' && (
            <div className="space-y-3 text-center">
              <div className="flex justify-center text-destructive">
                <AlertCircle className="w-8 h-8" />
              </div>
              <p className="text-sm text-destructive font-medium">
                Güncelleme sırasında bir hata oluştu.
              </p>
              <button 
                onClick={() => setIsVisible(false)}
                className="w-full rounded-lg bg-white/5 px-4 py-2 text-sm font-medium text-foreground hover:bg-white/10 transition-colors"
              >
                Kapat
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;
