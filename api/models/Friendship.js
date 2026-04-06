const mongoose = require('mongoose');

const friendshipSchema = new mongoose.Schema(
  {
    users: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length === 2,
        message: 'Friendship must contain exactly two users'
      }
    },
    userA: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    userB: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    deletedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

friendshipSchema.index({ userA: 1, userB: 1 }, { unique: true });

friendshipSchema.pre('validate', function(next) {
  if (Array.isArray(this.users) && this.users.length === 2) {
    const [a, b] = this.users.map((id) => String(id)).sort();
    this.userA = a;
    this.userB = b;
    this.users = [a, b];
  }
  next();
});

module.exports = mongoose.model('Friendship', friendshipSchema);
