import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { useToast } from '../components/ui/toaster';
import { Gamepad2, Play, Plus, X, FolderOpen, Loader2, Search, Settings } from 'lucide-react';
import { api } from '../services/api';
import { getAssetUrl } from '../lib/assetHelper';

export default function Library({ user }) {
  const { toast } = useToast();
  const [library, setLibrary] = useState(user?.library || []);
  const [supportedGames, setSupportedGames] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [gameToDelete, setGameToDelete] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  useEffect(() => {
    loadInitialData();
    const interval = setInterval(checkCurrentGameSafe, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Keep local state aligned when parent user object changes.
    setLibrary(Array.isArray(user?.library) ? user.library : []);
  }, [user]);

  const getGameImage = (gameName) => {
    if (!gameName) return null;
    
    const dbGame = supportedGames.find(g => g.name === gameName);
    
    // GitHub URL conversion for stored DB images
    if (dbGame?.bannerImage) {
      let url = dbGame.bannerImage;
      if (url.includes('github.com') && !url.includes('raw.githubusercontent.com') && url.includes('/blob/')) {
        return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      }
      return url;
    }

    // Fallback to local asset
    const fileName = gameName.toLowerCase().replace(/\s+/g, '_');
    return getAssetUrl(`assets/games/${fileName}_banner.jpg`);
  };



  const getErrorMessage = (err, fallback) => {
    return err?.data?.error || err?.message || fallback;
  };

  const loadInitialData = async () => {
    try {
      await Promise.all([loadLibrary(), loadSupportedGames(), checkCurrentGameSafe()]);
    } finally {
      setLoadingLibrary(false);
    }
  };

  const loadLibrary = async () => {
    try {
      const currentUser = await api.getCurrentUser();
      setLibrary(Array.isArray(currentUser?.library) ? currentUser.library : []);
    } catch (err) {
      console.error('Kütüphane yüklenemedi:', err);
    }
  };

  const loadSupportedGames = async () => {
    try {
      const games = await api.getSupportedGames();
      setSupportedGames(Array.isArray(games) ? games : []);
    } catch (err) {
      console.error('Desteklenen oyunlar alınamadı:', err);
    }
  };


  const checkCurrentGameSafe = async () => {
    if (window.electronAPI) {
      try {
        const game = await window.electronAPI.getCurrentGame();
        setCurrentGame(game);
      } catch (err) {
        console.error('Aktif oyun alınamadı:', err);
      }
    }
  };

  const handleAddToLibrary = async (gameName) => {
    try {
      setLoading(true);
      const updatedLibrary = await api.addToLibrary(gameName);
      setLibrary(updatedLibrary);
      setShowAddModal(false);
      toast({ title: 'Başarılı', description: `${gameName} kütüphanene eklendi!` });
    } catch (err) {
      toast({ title: 'Hata', description: getErrorMessage(err, 'Oyun eklenemedi') });
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExe = async (gameName) => {
    if (!window.electronAPI) return;
    const path = await window.electronAPI.selectGameExe();
    if (path) {
      try {
        const updatedLibrary = await api.updateLibraryExe(gameName, path);
        setLibrary(updatedLibrary);
        toast({ title: 'Başarılı', description: 'Oyun dosyası kaydedildi.' });
      } catch (err) {
        toast({ title: 'Hata', description: getErrorMessage(err, 'Dosya yolu kaydedilemedi') });
      }
    }
  };

  const handleLaunch = async (exePath) => {
    if (!window.electronAPI) return;
    const res = await window.electronAPI.launchGame(exePath);
    if (!res.success) {
      toast({ 
        title: 'Başlatma Hatası!', 
        description: `Hata: ${res.error}\nİpucu: Eğer oyun korumalıysa (Valorant vb.), lütfen uygulamayı "Yönetici Olarak Çalıştır" diyerek tekrar açın.`,
        duration: 10000 
      });
    } else {
      toast({ title: 'Oyun Başlatılıyor', description: 'İyi oyunlar!' });
    }
  };

  const handleRemove = async (game) => {
    setGameToDelete(game);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!gameToDelete) return;
    
    try {
      const updatedLibrary = await api.removeFromLibrary(gameToDelete.gameName);
      setLibrary(updatedLibrary);
      toast({ title: 'Silindi', description: `${gameToDelete.gameName} kütüphaneden çıkarıldı.` });
    } catch (err) {
      toast({ title: 'Hata', description: getErrorMessage(err, 'Oyun silinemedi') });
    } finally {
      setShowDeleteModal(false);
      setGameToDelete(null);
    }
  };

  const filteredSupported = supportedGames.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase()) && 
    !library.find(lg => lg.gameName === g.name)
  );


  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-white uppercase italic">Kütüphane</h1>
          <p className="text-muted-foreground font-bold tracking-widest uppercase text-xs mt-1">Oyun Başlatma Merkezi</p>
        </div>
        
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-xl px-6 py-6 shadow-xl shadow-primary/20 group"
        >
          <Plus className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
          Kütüphaneye Ekle
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loadingLibrary ? (
          <div className="col-span-full py-20 bg-secondary/20 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
            <p className="text-muted-foreground font-bold uppercase tracking-widest">Kütüphane yükleniyor...</p>
          </div>
        ) : library.length === 0 ? (
          <div className="col-span-full py-20 bg-secondary/20 border-2 border-dashed border-white/5 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
            <div className="p-4 rounded-full bg-white/5 mb-4">
              <Gamepad2 className="w-12 h-12 text-muted-foreground/50" />
            </div>
            <p className="text-muted-foreground font-bold uppercase tracking-widest">Kütüphanen henüz boş</p>
            <Button 
              variant="link" 
              onClick={() => setShowAddModal(true)}
              className="mt-2 text-primary uppercase font-black"
            >
              Hemen Oyun Ekle
            </Button>
          </div>
        ) : (
          library.map((game) => {
            const isPlaying = currentGame?.gameName === game.gameName;
            const gameImage = getGameImage(game.gameName);
            
            return (
              <Card key={game.gameName} className="group relative bg-[#0d1117] border border-white/5 rounded-[2rem] overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-primary/10">
                <div className="relative aspect-[16/9] bg-secondary/30 overflow-hidden">
                  {gameImage && (
                    <img 
                      src={gameImage} 
                      alt={game.gameName}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'flex';
                      }}
                    />
                  )}
                  
                  <div className={`absolute inset-0 flex items-center justify-center opacity-20 group-hover:scale-110 transition-transform duration-500 ${gameImage ? 'hidden' : 'flex'}`}>
                    <Gamepad2 className="w-16 h-16" />
                  </div>
                  
                  {isPlaying && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 bg-green-500 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-green-500/50">
                      <div className="w-2 h-2 rounded-full bg-white" />
                      Oyun Çalışıyor 🎮
                    </div>
                  )}

                  <button 
                    onClick={() => handleRemove(game)}
                    className="absolute top-4 right-4 p-2 rounded-xl bg-black/50 text-white/50 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all duration-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <h3 className="text-lg font-black text-white truncate uppercase italic">{game.gameName}</h3>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5 truncate max-w-[200px]" title={game.exePath}>
                      {game.exePath ? game.exePath : 'Dosya Yolu Seçilmedi'}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {game.exePath ? (
                      <Button 
                        onClick={() => handleLaunch(game.exePath)}
                        disabled={isPlaying}
                        className={`flex-1 font-black uppercase tracking-widest rounded-xl py-5 shadow-lg transition-all duration-300 ${isPlaying ? 'bg-secondary text-muted-foreground' : 'bg-green-600 hover:bg-green-500 text-white shadow-green-500/20'}`}
                      >
                        <Play className="w-4 h-4 mr-2 fill-current" />
                        {isPlaying ? 'Çalışıyor' : 'Başlat'}
                      </Button>
                    ) : (
                      <Button 
                        onClick={() => handleSelectExe(game.gameName)}
                        className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 font-black uppercase tracking-widest rounded-xl py-5"
                      >
                        <FolderOpen className="w-4 h-4 mr-2" />
                        Dosya Seç
                      </Button>
                    )}
                    
                    {game.exePath && (
                      <Button 
                        variant="secondary"
                        onClick={() => handleSelectExe(game.gameName)}
                        className="p-3 bg-secondary/50 rounded-xl hover:bg-secondary border border-white/5"
                        title="Oyun dosyasını değiştir"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      {/* Add Game Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <Card className="w-full max-w-md bg-[#0d1117] border border-white/10 rounded-[2.5rem] shadow-3xl animate-in fade-in zoom-in duration-300 overflow-hidden">
            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Oyun Ekle</h2>
                <Button variant="ghost" size="icon" onClick={() => setShowAddModal(false)} className="rounded-full hover:bg-white/5">
                  <X className="w-6 h-6" />
                </Button>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="OYUN ARA..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-12 bg-white/5 border-white/10 rounded-xl font-bold uppercase tracking-widest focus:ring-primary/50"
                  autoFocus
                />
              </div>

              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {filteredSupported.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground font-bold uppercase italic text-xs">Aradığın oyun bulunamadı</p>
                ) : (
                  filteredSupported.map((game) => (
                    <button
                      key={game._id}
                      onClick={() => handleAddToLibrary(game.name)}
                      disabled={loading}
                      className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 hover:bg-primary/20 border border-white/5 hover:border-primary/30 transition-all duration-200 group"
                    >
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-white uppercase italic text-sm group-hover:translate-x-1 transition-transform">{game.name}</span>
                        {game.genre && <span className="text-[10px] text-muted-foreground font-bold">{game.genre}</span>}
                      </div>
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-primary" />}
                    </button>
                  ))
                )}

              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && gameToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <Card className="w-full max-w-md bg-[#0d1117] border border-red-500/20 rounded-[2rem] shadow-3xl animate-in zoom-in duration-300 overflow-hidden">
            <div className="p-8 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <X className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Oyunu Sil</h2>
                  <p className="text-sm text-muted-foreground font-medium mt-1">Bu işlem geri alınamaz</p>
                </div>
              </div>

              {/* Game Info */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                <p className="text-white/70 font-medium text-sm mb-2">Silmek istediğin oyun:</p>
                <p className="text-xl font-black text-white uppercase italic">{gameToDelete.gameName}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDeleteModal(false);
                    setGameToDelete(null);
                  }}
                  className="flex-1 h-12 rounded-xl border-white/10 hover:bg-white/5 font-black uppercase tracking-widest"
                >
                  İptal
                </Button>
                <Button 
                  onClick={confirmDelete}
                  className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600 text-white font-black uppercase tracking-widest shadow-lg shadow-red-500/20"
                >
                  Sil
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
