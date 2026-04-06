const User = require('../models/User');
const GameSession = require('../models/GameSession');

const BADGE_DEFINITIONS = {
  'collector': {
    id: 'collector',
    title: 'Koleksiyoncu',
    description: 'Kütüphaneye 50 oyun ekle.',
    icon: 'LibraryBig',
    color: 'from-blue-500 to-cyan-500'
  },
  'archive_master': {
    id: 'archive_master',
    title: 'Arşiv Ustası',
    description: 'Kütüphaneye 100 oyun ekle.',
    icon: 'Archive',
    color: 'from-purple-600 to-indigo-700'
  },
  'loyal_player': {
    id: 'loyal_player',
    title: 'Sadık Oyuncu',
    description: 'Tek bir oyunda 24 saat geçir.',
    icon: 'Heart',
    color: 'from-red-500 to-pink-600'
  },
  'obsessed': {
    id: 'obsessed',
    title: 'Takıntılı',
    description: 'Tek bir oyunda 50 saat geçir.',
    icon: 'Flame',
    color: 'from-orange-600 to-red-700'
  },
  'diversity_master': {
    id: 'diversity_master',
    title: 'Çeşitlilik Ustası',
    description: '10 farklı oyunu en az bir kez aç.',
    icon: 'Gamepad2',
    color: 'from-green-500 to-emerald-600'
  },
  'challenge_beast': {
    id: 'challenge_beast',
    title: 'Görev Canavarı',
    description: '30 günlük görev tamamla.',
    icon: 'Swords',
    color: 'from-yellow-600 to-orange-700'
  },
  'xp_hunter': {
    id: 'xp_hunter',
    title: 'XP Avcısı',
    description: '1000 XP\'ye ulaş.',
    icon: 'Zap',
    color: 'from-amber-400 to-yellow-600'
  },
  'rising_player': {
    id: 'rising_player',
    title: 'Yükselen Oyuncu',
    description: 'Level 50 ol.',
    icon: 'TrendingUp',
    color: 'from-blue-400 to-indigo-500'
  },
  'elite_player': {
    id: 'elite_player',
    title: 'Elit Oyuncu',
    description: 'Level 100 ol.',
    icon: 'Crown',
    color: 'from-slate-700 to-slate-900'
  },
  'game_ruler': {
    id: 'game_ruler',
    title: 'Oyun Hükümdarı',
    description: 'Toplam 1000 saat oyun süresine ulaş.',
    icon: 'Trophy',
    color: 'from-yellow-500 via-amber-600 to-yellow-700'
  },
  'iron_will': {
    id: 'iron_will',
    title: 'Demir İrade',
    description: '7 gün boyunca en az 1 oturum aç.',
    icon: 'ShieldCheck',
    color: 'from-slate-500 to-slate-700'
  }
};

class BadgeService {
  static async checkBadges(userId) {
    const user = await User.findById(userId);
    if (!user) return [];

    const newBadges = [];
    const currentBadges = user.badges || [];

    // 1. Koleksiyoncu (50 oyun)
    if (!currentBadges.includes('collector') && user.library.length >= 50) {
      newBadges.push('collector');
    }

    // 2. Arşiv Ustası (100 oyun)
    if (!currentBadges.includes('archive_master') && user.library.length >= 100) {
      newBadges.push('archive_master');
    }

    // 3 & 4. Sadık Oyuncu & Takıntılı (Tek oyunda süre)
    const sessions = await GameSession.find({ userId });
    const timePerGame = sessions.reduce((acc, session) => {
      acc[session.gameName] = (acc[session.gameName] || 0) + (session.duration / 60); // dakikaya çevir
      return acc;
    }, {});

    const maxGameTime = Math.max(...Object.values(timePerGame), 0);
    if (!currentBadges.includes('loyal_player') && maxGameTime >= 1440) { // 24 saat
      newBadges.push('loyal_player');
    }
    if (!currentBadges.includes('obsessed') && maxGameTime >= 3000) { // 50 saat
      newBadges.push('obsessed');
    }

    // 5. Çeşitlilik Ustası (10 farklı oyun aç)
    const differentGamesCount = user.stats?.differentGamesPlayed?.length || 0;
    if (!currentBadges.includes('diversity_master') && differentGamesCount >= 10) {
      newBadges.push('diversity_master');
    }

    // 6. Görev Canavarı (30 günlük görev)
    if (!currentBadges.includes('challenge_beast') && (user.stats?.totalChallengesCompleted || 0) >= 30) {
      newBadges.push('challenge_beast');
    }

    // 7. XP Avcısı (1000 XP)
    if (!currentBadges.includes('xp_hunter') && (user.xp || 0) >= 1000) {
      newBadges.push('xp_hunter');
    }

    // 8. Yükselen Oyuncu (Level 50)
    if (!currentBadges.includes('rising_player') && (user.level || 1) >= 50) {
      newBadges.push('rising_player');
    }

    // 9. Elit Oyuncu (Level 100)
    if (!currentBadges.includes('elite_player') && (user.level || 1) >= 100) {
      newBadges.push('elite_player');
    }

    // 10. Oyun Hükümdarı (1000 saat)
    const totalPlayTimeHours = (user.stats?.totalPlayTimeMinutes || 0) / 60;
    if (!currentBadges.includes('game_ruler') && totalPlayTimeHours >= 1000) {
      newBadges.push('game_ruler');
    }

    // 11. Demir İrade (7 gün üst üste)
    if (!currentBadges.includes('iron_will') && (user.stats?.consecutiveLoginDays || 0) >= 7) {
      newBadges.push('iron_will');
    }

    if (newBadges.length > 0) {
      user.badges = [...currentBadges, ...newBadges];
      await user.save();
    }

    return newBadges;
  }

  static getBadgeInfo(badgeId) {
    return BADGE_DEFINITIONS[badgeId];
  }

  static getAllBadges() {
    return Object.values(BADGE_DEFINITIONS);
  }
}

module.exports = BadgeService;
