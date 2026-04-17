// Backend logic integrated into Electron process
require('dotenv').config();
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
const { setupWebSocket } = require('./services/wsGateway');
const dns = require('dns');

// Force IPv4 for local connections to prevent ERR_INTERNAL_ASSERTION
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const app = express();

// Render.com Load Balancers (Yük dengeleyici) ve Ters Proxy (Reverse Proxy) ayarı
// Bu kod olmazsa express-rate-limit sistemi IP bulamadığı için çöker.
app.set('trust proxy', 1);

const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://thegametracker.vercel.app'
];

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()).filter(Boolean)
  : defaultAllowedOrigins;

// Global rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per window
  message: { error: 'Too many requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
      callback(null, true);
    } else {
      callback(new Error('CORS Policy: Bu köken için erişim izni yok.'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(express.json());
app.use(globalLimiter);

// Connect to MongoDB
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/gametracker';
mongoose.connect(mongoUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => {
  console.error('MongoDB connection error:', err.message);
  // Fail gracefully if DB is missing
});

// Routes
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/games');
const userRoutes = require('./routes/users');
const friendRoutes = require('./routes/friends');
const presenceRoutes = require('./routes/presence');
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const statsRoutes = require('./routes/stats');

app.use('/api/auth', authRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[API Error]', err.stack);
  res.status(500).json({ 
    error: 'İşlem sırasında bir hata oluştu.', 
    message: process.env.NODE_ENV === 'development' ? err.message : undefined 
  });
});

const PORT = process.env.PORT || 3000;

function startServer() {
  const server = http.createServer(app);
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST']
    }
  });
  setupWebSocket(io);

  return server.listen(PORT, '0.0.0.0', () => {
    console.log(`Backend Server running on port ${PORT}`);
  });
}

// Render veya doğrudan node server.js ile çalıştırıldığında başlat
if (require.main === module) {
  startServer();
}

module.exports = startServer;
