# Nia – Kenyan Dating App (Working MVP)

A complete, ready-to-run Kenyan dating website.

**Name**: Nia (meaning "purpose" / intention in Swahili)

## What works right now

- Phone + password registration & login (Kenya numbers supported: 07... or 254...)
- Profile with name, age, gender, location (Nairobi, Mombasa, Kisumu...), tribe, bio, interests
- Discover people with location filter
- Like / Pass system
- Automatic matching when both like each other
- Real chat between matches
- Profile editing
- 6 demo Kenyan users pre-loaded

Data is stored in simple JSON files (no database setup required).

---

## How to run (only 3 steps)

### 1. Install Node.js (if you don’t have it)
Download from: https://nodejs.org (LTS version)

### 2. Install dependencies
Open terminal in this folder and run:

```bash
cd kenya-dating-app
npm install
```

### 3. Start the app
```bash
npm start
```

Open your browser and go to:

**http://localhost:3000**

That’s it. The app is fully working.

---

## Demo accounts (password for all: `demo123`)

| Phone       | Name            | City     |
|-------------|-----------------|----------|
| 0712000001  | Amina Wanjiku   | Nairobi  |
| 0712000002  | Brian Otieno    | Kisumu   |
| 0712000003  | Faith Chebet    | Eldoret  |
| 0712000004  | David Mwangi    | Nairobi  |
| 0712000005  | Grace Achieng   | Mombasa  |
| 0712000006  | Kevin Kiprop    | Nakuru   |

You can also create your own account using the Register tab.

---

## How to use

1. Login with a demo account or register a new one.
2. Go to **Discover** → Like people.
3. Open another browser / phone / incognito window and login with a different account.
4. Like the first user back → you both get a Match.
5. Go to **Matches** → open the chat and talk.

---

## Deploy online (so others can use it)

### Option A – Railway (easiest free option)

1. Create account at https://railway.app
2. Click “New Project” → “Deploy from GitHub” (or upload the folder)
3. Railway will detect Node.js and run `npm start`
4. Add a public domain – done.

### Option B – Render

1. https://render.com → New Web Service
2. Connect the folder / GitHub repo
3. Build command: `npm install`
4. Start command: `npm start`
5. Deploy

### Option C – Any VPS (DigitalOcean, Contabo, etc.)

```bash
git clone your-repo
cd kenya-dating-app
npm install
npm start
```

Use PM2 to keep it running:

```bash
npm install -g pm2
pm2 start server.js --name nia
pm2 save
```

---

## Project structure

```
kenya-dating-app/
├── server.js          ← Backend (Express + all APIs)
├── package.json
├── public/
│   └── index.html     ← Complete frontend (beautiful mobile-first UI)
└── data/              ← JSON files created automatically
    ├── users.json
    ├── likes.json
    ├── matches.json
    └── messages.json
```

---

## Next upgrades you can add later

- Real photo upload (Cloudinary)
- Real OTP via Africa’s Talking or Twilio
- M-Pesa payments for premium
- Push notifications
- Better matching algorithm
- Admin panel
- Switch JSON storage to PostgreSQL / MongoDB

---

Built for Kenya 🇰🇪  
Enjoy and grow it!
