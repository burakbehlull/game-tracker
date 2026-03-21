const User = require('../models/User');

const CHALLENGE_POOL = [
  {
    id: 'play_1_hour',
    type: 'play_time',
    title: 'Günün Maratonu',
    description: 'Bugün toplam 1 saat oyun oyna.',
    goal: 60, // dakika
    xpReward: 100
  },
  {
    id: 'open_3_games',
    type: 'different_games',
    title: 'Oyun Gurmesi',
    description: 'Bugün 3 farklı oyunu aç.',
    goal: 3,
    xpReward: 50
  },
  {
    id: 'night_owl',
    type: 'night_session',
    title: 'Gece Kuşu',
    description: 'Gece 23:00\'den sonra oyun oyna.',
    goal: 1, // 1 session yeterli
    xpReward: 75
  },
  {
    id: 'steady_30',
    type: 'steady_play',
    title: 'Odaklanmış Oyuncu',
    description: 'Bir oyunu aralıksız 30 dakika oyna.',
    goal: 30, // dakika
    xpReward: 60
  },
  {
    id: 'weekend_warrior',
    type: 'weekend_play',
    title: 'Hafta Sonu Savaşçısı',
    description: 'Hafta sonu bir oyun oyna.',
    goal: 1,
    xpReward: 40
  }
];

class ChallengeService {
  static async getOrResetChallenges(userId) {
    const user = await User.findById(userId);
    if (!user) return null;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (!user.lastChallengeReset || user.lastChallengeReset < today) {
      // Reset challenges
      const selected = this.getRandomChallenges(3);
      user.dailyChallenges = selected.map(c => ({
        ...c,
        current: 0,
        isCompleted: false
      }));
      user.lastChallengeReset = now;
      await user.save();
    }

    return user.dailyChallenges;
  }

  static getRandomChallenges(count) {
    const shuffled = [...CHALLENGE_POOL].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  static async updateProgress(userId, type, amount, data = {}) {
    const user = await User.findById(userId);
    if (!user) return;

    let updated = false;
    for (const challenge of user.dailyChallenges) {
      if (challenge.isCompleted) continue;

      let progressTriggered = false;

      switch (challenge.type) {
        case 'play_time':
          if (type === 'play_time') {
            challenge.current += amount;
            progressTriggered = true;
          }
          break;
        case 'different_games':
          if (type === 'open_game') {
            // requires data.gameName
            if (!challenge.requirements) challenge.requirements = { games: [] };
            if (!challenge.requirements.games.includes(data.gameName)) {
              challenge.requirements.games.push(data.gameName);
              challenge.current = challenge.requirements.games.length;
              progressTriggered = true;
              user.markModified('dailyChallenges');
            }
          }
          break;
        case 'night_session':
          if (type === 'session_start') {
            const hour = new Date().getHours();
            if (hour >= 23 || hour <= 5) {
              challenge.current = 1;
              progressTriggered = true;
            }
          }
          break;
        case 'steady_play':
          if (type === 'steady_play' && amount >= challenge.goal) {
            challenge.current = amount;
            progressTriggered = true;
          }
          break;
        case 'weekend_play':
          if (type === 'session_start') {
            const day = new Date().getDay();
            if (day === 0 || day === 6) { // Pazar or Cmt
              challenge.current = 1;
              progressTriggered = true;
            }
          }
          break;
      }

      if (progressTriggered) {
        if (challenge.current >= challenge.goal) {
          challenge.isCompleted = true;
          user.xp += challenge.xpReward;
          user.level = Math.floor(user.xp / 1000) + 1;
        }
        updated = true;
        user.markModified('dailyChallenges');
      }
    }

    if (updated) {
      await user.save();
    }
  }
}

module.exports = ChallengeService;
