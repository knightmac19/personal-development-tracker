# Personal Development Tracker

A comprehensive personal development tracking application built with React, Vite, Tailwind CSS, and Firebase. Track your goals, journal entries, and progress across multiple life areas with offline support.

## Features

- 📊 **Dashboard** - Overview of all your goals, progress, and recent activities
- 📝 **Journal** - Rich text journal entries with tagging and goal linking
- 🎯 **Goal Management** - Create and track goals with action steps and progress tracking
- 📈 **Statistics** - Visualize your progress with charts and export data (CSV/PDF)
- 🌓 **Dark Mode** - Full dark mode support with theme persistence
- 📱 **PWA** - Works offline and installable as a mobile/desktop app
- 🔐 **Secure** - Email whitelist authentication to restrict access

## Life Areas

Track your progress across 8 key life areas:

- 💰 Finances
- 💪 Fitness
- 🥋 Jiu Jitsu
- 💑 Women
- ✨ Attractiveness
- 🥗 Nutrition
- 🧠 Philosophy
- 🌍 Languages

## Tech Stack

- **Frontend**: React 18 + Vite
- **Styling**: Tailwind CSS
- **Database**: Firebase Firestore
- **Authentication**: Firebase Auth
- **State Management**: React Context API
- **Charts**: Chart.js + react-chartjs-2
- **Rich Text Editor**: TipTap
- **Icons**: Lucide React
- **PWA**: Vite PWA Plugin

## Setup Instructions

### 1. Prerequisites

- Node.js 18+ and npm/yarn installed
- Firebase project created
- Git installed

### 2. Clone and Install

```bash
# Clone the repository (or copy the files)
git clone <your-repo-url>
cd personal-development-tracker

# Install dependencies
npm install
```

### 3. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project or select existing
3. Enable Authentication and Firestore
4. Go to Project Settings > General
5. Scroll down to "Your apps" and click "Add app" > Web
6. Copy your Firebase configuration

### 4. Environment Configuration

1. Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

2. Fill in your Firebase configuration in `.env`:

```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-auth-domain
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

### 5. Configure Email Whitelist

Edit `src/firebase.js` and update the `ALLOWED_EMAILS` array with your email:

```javascript
export const ALLOWED_EMAILS = ["your-email@example.com"];
```

### 6. Firebase Security Rules

Go to Firestore Database > Rules and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }

    // Goals, journal entries, etc - users can only access their own
    match /{collection}/{document} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
      allow create: if request.auth != null &&
        request.resource.data.userId == request.auth.uid;
    }
  }
}
```

### 7. Run Development Server

```bash
npm run dev
```

Visit `http://localhost:5173` to see the app.

### 8. Build for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Deployment

### Deploy to Firebase Hosting

1. Install Firebase CLI:

```bash
npm install -g firebase-tools
```

2. Initialize Firebase in your project:

```bash
firebase init
```

- Select Hosting
- Choose your Firebase project
- Set public directory to `dist`
- Configure as single-page app: Yes
- Don't overwrite index.html

3. Deploy:

```bash
npm run build
firebase deploy
```

### Deploy to Vercel

1. Install Vercel CLI:

```bash
npm install -g vercel
```

2. Deploy:

```bash
npm run build
vercel --prod
```

### Deploy to Netlify

1. Build the project:

```bash
npm run build
```

2. Drag and drop the `dist` folder to [Netlify](https://app.netlify.com/drop)

## Project Structure

```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── common/        # Reusable components
│   ├── goals/         # Goal-related components
│   ├── journal/       # Journal components
│   ├── layout/        # Layout components
│   └── stats/         # Statistics components
├── contexts/
│   ├── AuthContext.jsx     # Authentication state
│   └── ThemeContext.jsx    # Theme state
├── pages/
│   ├── Dashboard.jsx       # Main dashboard
│   ├── Journal.jsx         # Journal entries
│   ├── Goals.jsx          # Goals overview
│   ├── Stats.jsx          # Statistics page
│   ├── Settings.jsx       # User settings
│   └── LifeSubsection.jsx # Individual life area pages
├── services/          # Firebase and API services
├── utils/            # Utility functions
├── App.jsx           # Main app component
├── main.jsx          # App entry point
└── firebase.js       # Firebase configuration
```

## Key Features Implementation

### Goal System

- Goals can be weekly, monthly, yearly, or custom timeframe
- Each goal has action steps (quantifiable or binary)
- Progress automatically calculated from completed steps
- Goals linked to specific life subsections
- Hierarchical goals (yearly → monthly → action steps)

### Win States

- Define success criteria for each life area
- Multiple metrics per subsection
- Visual progress tracking
- Editable after initial setup

### Journal System

- Rich text editing with formatting
- Tag entries by life subsection
- Link entries to specific goals
- Filter by subsection and timeframe
- Mobile-responsive sidebar layout

### Offline Support

- PWA with service worker
- IndexedDB persistence for Firestore
- Works without internet connection
- Auto-sync when back online

## Usage Tips

1. **Start with Win States**: Define what success looks like in each life area
2. **Create Yearly Goals**: Set big-picture objectives for the year
3. **Break Down to Monthly**: Create monthly goals that support yearly objectives
4. **Add Action Steps**: Define specific, actionable steps for each goal
5. **Journal Regularly**: Document your progress and reflections
6. **Review Stats**: Track trends and export data for deeper analysis

## Troubleshooting

### Authentication Issues

- Verify your email is in the whitelist
- Check Firebase Auth is enabled
- Ensure environment variables are set correctly

### Database Issues

- Check Firestore security rules
- Verify Firebase project configuration
- Ensure offline persistence is working

### Build Issues

- Clear node_modules and reinstall: `rm -rf node_modules && npm install`
- Clear build cache: `rm -rf dist`
- Check for TypeScript errors in console

## Contributing

This is a personal project, but suggestions and improvements are welcome!

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
