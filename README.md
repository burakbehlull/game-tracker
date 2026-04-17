# The Game Tracker

Game Tracker is an application that allows you to record the playtime of your original or cracked games, communicate with other users, and create your profile.

The application is not for downloading games; it allows you to take screenshots of even your cracked games, track playtime, and obtain _achievements_.

## Upcoming Features
> Also: Badges, community, messaging, and screenshot sharing features will be added soon.

## Dashoard Page
The Dashboard Page allows you to access statistics for the games you've played. The "_Playing_" section is also displayed on this page.

<img src="assets/images/dashboard_page_1.png" alt="Dashoard Page" width="600"/>
<img src="assets/images/dashboard_page_2.png" alt="Dashoard Page" width="600"/>

## Discover Page
You can explore and search other players' profiles.

<img src="assets/images/discover_page.png" alt="Dashoard Page" width="600"/>

## Profile Page
Personalized game profile page: You can add custom avatars and banners. Other users can see your game time, and you can share which games you're playing with other users.

<img src="assets/images/profile_page.png" alt="Dashoard Page" width="600"/>

## Timer Page
Game timer helps you enter time while playing a game and turn off your game when that time is up. At the end of the time, it warns you to close the game and then closes the game directly.


<img src="assets/images/timer_page.png" alt="Timer Page" width="600"/>

## Library Page
The game library detects the game, or you can add and launch it from a single location. It also offers the opportunity to customize games.

<img src="assets/images/library_page.png" alt="Library Page" width="600"/>

## Game Detail Page
It provides a detailed page for the games, listing who plays them the most and which games are being played.

<img src="assets/images/game_detail_page.png" alt="Library Page" width="600"/>

## Friends Page

<img src="assets/images/friends_page.png" alt="Library Page" width="600"/>

## Chat Page

<img src="assets/images/chat_page.png" alt="Library Page" width="600"/>

## Admin Panel

The Game Tracker includes a powerful admin panel for managing users, monitoring game sessions, and viewing system statistics.

### Admin Panel Features

- **Dashboard Overview**: View total users, admins, game sessions, and popular games
- **User Management**: Search, view, edit roles, and delete users
- **Session Monitoring**: Track all game sessions across the platform
- **Security**: 5 failed login attempts lock the account for 10 minutes
- **Role Management**: Promote users to admin or demote admins to regular users

### Creating an Admin User

To create an admin user, run the following command:

```bash
node api/scripts/createAdmin.js <username> <password> <email>
```

Example:
```bash
node api/scripts/createAdmin.js admin admin123 admin@gametracker.com
```

### Accessing the Admin Panel

Once you have created an admin user, you can access the admin panel at:

```
http://localhost:5173/#/admin
```

Login with your admin credentials to access the dashboard.

### Admin Panel Security

- Failed login attempts are tracked per username
- After 5 failed attempts, the account is locked for 10 minutes
- All login attempts (successful and failed) are logged with IP addresses
- Admin-only routes are protected with role-based authentication middleware

## Security & Environment Variables

### ⚠️ Important: .env File Security

The `.env` file is **NOT included** in production builds for security reasons. This prevents sensitive information (JWT secrets, database credentials, API keys) from being exposed to end users.

### Development Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the values in `.env` with your configuration:
```env
MONGO_URI=mongodb://localhost:27017/gametracker
JWT_SECRET=your-super-secret-jwt-key-change-this
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### Production Deployment

For production builds, environment variables must be set via:
- System environment variables
- Application config file in user's AppData
- Installer configuration

See `docs/production-deployment.md` for detailed instructions.

### Build Security Check

After building, verify that `.env` is not included:

```bash
npm run build:desktop
npm run build:check
```

This will scan the build output and ensure no sensitive files are included.