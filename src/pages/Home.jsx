import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Zap, Target, Users, Search, ChevronRight, BarChart3, Shield, Download } from 'lucide-react';
import { Link } from 'react-router-dom';




export default function Home({ user }) {
  const isWeb = !window.electronAPI;
  const images = {
    hero: "/assets/hero_banner.png",
    card1: "/assets/card1.png",
    card2: "/assets/card2.png",
    card3: "/assets/card3.png"
  };

  return (
    <div className="flex flex-col gap-16 pb-20">
      {/* 1. PREMIUM HERO BANNER */}
      <section className="relative w-full h-[400px] md:h-[600px] flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src={images.hero} 
            alt="Hero Banner" 
            className="w-full h-full object-cover scale-105"
          />
          {/* Deep Cinematic Gradients */}
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent" />
        </div>
        
        <div className="relative z-10 container mx-auto px-6 max-w-6xl">
          <div className="max-w-3xl space-y-8 animate-in fade-in slide-in-from-left-12 duration-1000 ease-out">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 backdrop-blur-md text-primary text-sm font-bold uppercase tracking-widest">
              <span className="relative flex h-2 w-2 mr-1">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
               Live İstatistik Takibi
            </div>
            
            <div className="space-y-4">
              <h1 className="text-5xl md:text-8xl font-black tracking-tight text-white leading-[0.9]">
                OYUN <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-cyan-300 animate-gradient-x">DÜNYANI</span> <br />
                KONTROL ET
              </h1>
              <p className="text-xl text-white/70 max-w-xl leading-relaxed font-light">
                Her saniyeni ölç, her başarımını kaydet. Profesyonel oyuncular için tasarlanmış en kapsamlı veri takip platformu.
              </p>
            </div>

            <div className="flex flex-wrap gap-5 pt-4">
              {user ? (
                <div className="flex flex-wrap gap-4">
                  <Link to="/dashboard">
                    <Button size="lg" className="h-14 px-10 font-black text-xl rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all hover:scale-105 active:scale-95">
                      PANELİ AÇ <ChevronRight className="ml-2 w-6 h-6" />
                    </Button>
                  </Link>
                  
                </div>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="h-14 px-10 font-black text-xl rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all hover:scale-105 active:scale-95">
                      ÜCRETSİZ BAŞLA <ChevronRight className="ml-2 w-6 h-6" />
                    </Button>
                  </Link>
                  
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2. FORTNITE STYLE FEATURED CARDS */}
      <section className="container mx-auto px-6 max-w-6xl">
        <div className="flex flex-col gap-8">
          <div className="flex items-end justify-between">
            <div className="space-y-1">
              <h2 className="text-3xl font-bold text-white tracking-tight">Popüler Aktiviteler</h2>
              <p className="text-muted-foreground">Toplulukta şu an ne oluyor?</p>
            </div>
            <Link to="/discover" className="text-primary hover:text-primary/80 font-medium transition-colors flex items-center gap-1 group">
              Tümünü Gör <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <Card className="group border-none bg-transparent overflow-hidden cursor-pointer">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
                <img 
                  src={images.card1} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  alt="Game 1" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardContent className="px-0 pt-4 space-y-2">
                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Haftalık Rekabet</h3>
                <p className="text-muted-foreground text-sm line-clamp-2">
                  Bu haftanın en çok oynanan oyunlarında lider kim olacak? Hemen istatistiklerini kontrol et.
                </p>
                <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/5 rounded-lg mt-2">
                  Detayları Gör
                </Button>
              </CardContent>
            </Card>

            {/* Card 2 */}
            <Card className="group border-none bg-transparent overflow-hidden cursor-pointer">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
                <img 
                  src={images.card2} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  alt="Game 2" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardContent className="px-0 pt-4 space-y-2">
                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Yeni Rozetler</h3>
                <p className="text-muted-foreground text-sm line-clamp-2">
                  Profilini özelleştirmek için 1000+ saatlik oyun sürelerine ulaş ve özel rozetleri aç.
                </p>
                <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/5 rounded-lg mt-2 font-bold flex items-center gap-2">
                  Mağazada Gör <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>

            {/* Card 3 */}
            <Card className="group border-none bg-transparent overflow-hidden cursor-pointer">
              <div className="relative aspect-[16/9] overflow-hidden rounded-2xl">
                <img 
                  src={images.card3} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  alt="Game 3" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-100 transition-opacity" />
              </div>
              <CardContent className="px-0 pt-4 space-y-2">
                <h3 className="text-xl font-bold text-white group-hover:text-primary transition-colors">Global Sıralama</h3>
                <p className="text-muted-foreground text-sm line-clamp-2">
                  Dünya genelindeki oyuncularla karşılaştırılan oyun sürelerinle profilini parlat.
                </p>
                <Button variant="secondary" size="sm" className="bg-white/10 hover:bg-white/20 text-white border-white/5 rounded-lg mt-2 font-bold flex items-center gap-2">
                   Mağazada Gör <ChevronRight className="w-4 h-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. DISCORD/FEATURE LAYOUT */}
      <section className="bg-secondary/30 py-24 border-y border-white/5 backdrop-blur-sm">
        <div className="container mx-auto px-6 max-w-6xl">
          <div className="text-center space-y-4 mb-20">
            <h2 className="text-4xl font-black text-white">Güçlü Özellikler</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              MesDel ile oyun deneyiminizi bir üst seviyeye taşıyın. İhtiyacınız olan her şey tek bir platformda.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="group relative bg-[#0b0e14] border border-white/5 rounded-[2rem] p-8 transition-all hover:-translate-y-2 hover:bg-[#12161f] hover:border-primary/20">
              <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <BarChart3 className="w-8 h-8 text-primary" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Detaylı Analiz</h3>
              <p className="text-muted-foreground leading-relaxed">
                Hangi gün ne kadar oynadığını, en sevdiğin türlerin hangileri olduğunu grafiklerle analiz et.
              </p>
              <div className="mt-8 pt-8 border-t border-white/5">
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-primary w-[60%] rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                </div>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="group relative bg-[#0b0e14] border border-white/5 rounded-[2rem] p-8 transition-all hover:-translate-y-2 hover:bg-[#12161f] hover:border-primary/20">
              <div className="w-14 h-14 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Otomatik Takip</h3>
              <p className="text-muted-foreground leading-relaxed">
                Herhangi bir ayar gerektirmeden çalışan arka plan servisi ile hiçbir süreyi kaçırma.
              </p>
              <div className="mt-8 flex justify-center">
                 <div className="w-32 h-32 rounded-full border-4 border-white/5 flex items-center justify-center relative">
                    <div className="absolute inset-2 rounded-full border-2 border-dashed border-green-500/50 animate-[spin_10s_linear_infinite]" />
                    <Zap className="w-10 h-10 text-green-500 animate-pulse" />
                 </div>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="group relative bg-[#0b0e14] border border-white/5 rounded-[2rem] p-8 transition-all hover:-translate-y-2 hover:bg-[#12161f] hover:border-primary/20">
              <div className="w-14 h-14 bg-purple-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Users className="w-8 h-8 text-purple-500" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Kolay Kullanım</h3>
              <p className="text-muted-foreground leading-relaxed">
                Oyuncu dostu arayüz ile arkadaşlarınızın profilini saniyeler içinde görüntüleyin.
              </p>
              <div className="mt-8 space-y-3">
                 {[1, 2, 3].map(i => (
                   <div key={i} className="h-10 bg-white/5 rounded-xl border border-white/5 flex items-center px-4 gap-3">
                      <div className="w-4 h-4 rounded-full bg-purple-500" />
                      <div className="h-2 w-20 bg-white/10 rounded" />
                   </div>
                 ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
