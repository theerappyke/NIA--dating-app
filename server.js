const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'nia-kenya-dating-secret-key-2026';
const DATA_DIR = path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const LIKES_FILE = path.join(DATA_DIR, 'likes.json');
const MATCHES_FILE = path.join(DATA_DIR, 'matches.json');
const MESSAGES_FILE = path.join(DATA_DIR, 'messages.json');

function initFile(file, def = []) {
  if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(def, null, 2));
}
initFile(USERS_FILE);
initFile(LIKES_FILE);
initFile(MATCHES_FILE);
initFile(MESSAGES_FILE);

function readData(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return []; }
}
function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return crypto.randomBytes(16).toString("hex");
}

function hashPassword(password) {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex');
}

function createToken(userId) {
  const payload = Buffer.from(JSON.stringify({ id: userId, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const sig = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
  return payload + '.' + sig;
}

function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.');
    const expected = crypto.createHmac('sha256', JWT_SECRET).update(payload).digest('base64url');
    if (sig !== expected) return null;
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (data.exp < Date.now()) return null;
    return data.id;
  } catch { return null; }
}

function seedDemoUsers() {
  const users = readData(USERS_FILE);
  if (users.length > 0) return;
  const demos = [
    { name: 'Amina Wanjiku', phone: '254712000001', age: 26, gender: 'Female', lookingFor: 'Male', location: 'Nairobi', tribe: 'Kikuyu', bio: 'Love hiking Ngong Hills, chai and good conversations. Looking for someone genuine 😊', interests: ['Travel', 'Music', 'Hiking', 'Cooking'] },
    { name: 'Brian Otieno', phone: '254712000002', age: 29, gender: 'Male', lookingFor: 'Female', location: 'Kisumu', tribe: 'Luo', bio: 'Software engineer by day, football lover by weekend. Let’s explore Kenya together!', interests: ['Tech', 'Football', 'Travel', 'Photography'] },
    { name: 'Faith Chebet', phone: '254712000003', age: 24, gender: 'Female', lookingFor: 'Male', location: 'Eldoret', tribe: 'Kalenjin', bio: 'Athlete & student. I value honesty, family and late-night talks under the stars.', interests: ['Running', 'Reading', 'Music', 'Nature'] },
    { name: 'David Mwangi', phone: '254712000004', age: 31, gender: 'Male', lookingFor: 'Female', location: 'Nairobi', tribe: 'Kikuyu', bio: 'Entrepreneur. Coffee addict. Looking for my partner in crime and adventures.', interests: ['Business', 'Coffee', 'Travel', 'Gym'] },
    { name: 'Grace Achieng', phone: '254712000005', age: 27, gender: 'Female', lookingFor: 'Male', location: 'Mombasa', tribe: 'Luo', bio: 'Beach lover 🌊. I speak English, Swahili & a bit of Luo. Let’s make memories.', interests: ['Beach', 'Dancing', 'Food', 'Movies'] },
    { name: 'Kevin Kiprop', phone: '254712000006', age: 28, gender: 'Male', lookingFor: 'Female', location: 'Nakuru', tribe: 'Kalenjin', bio: 'Quiet but deep. Love nature, good food and meaningful connections.', interests: ['Nature', 'Cooking', 'Reading', 'Cycling'] }
  ];
  const hashed = hashPassword('demo123');
  const seeded = demos.map(d => ({
    id: uuid(),
    phone: d.phone,
    password: hashed,
    name: d.name,
    age: d.age,
    gender: d.gender,
    lookingFor: d.lookingFor,
    location: d.location,
    tribe: d.tribe,
    bio: d.bio,
    interests: d.interests,
    photos: [],
    createdAt: new Date().toISOString()
  }));
  writeData(USERS_FILE, seeded);
  console.log('✅ Seeded 6 demo Kenyan users (password: demo123)');
}
seedDemoUsers();

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch { resolve({}); }
    });
  });
}

function send(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
  });
  res.end(JSON.stringify(data));
}

function getAuthUserId(req) {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return verifyToken(auth.slice(7));
}

function cleanPhone(phone) {
  let p = String(phone || '').replace(/\s+/g, '').replace(/^\+/, '');
  if (p.startsWith('0')) p = '254' + p.slice(1);
  if (!p.startsWith('254')) p = '254' + p;
  return p;
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS'
    });
    return res.end();
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  if (pathname.startsWith('/api/')) {
    try {
      if (pathname === '/api/register' && req.method === 'POST') {
        const body = await parseBody(req);
        const { phone, password, name, age, gender, lookingFor, location, tribe, bio, interests } = body;
        if (!phone || !password || !name || !age || !gender || !lookingFor || !location) {
          return send(res, 400, { error: 'Missing required fields' });
        }
        const clean = cleanPhone(phone);
        const users = readData(USERS_FILE);
        if (users.find(u => u.phone === clean)) {
          return send(res, 400, { error: 'Phone number already registered' });
        }
        const newUser = {
          id: uuid(),
          phone: clean,
          password: hashPassword(password),
          name: String(name).trim(),
          age: parseInt(age),
          gender,
          lookingFor,
          location,
          tribe: tribe || '',
          bio: bio || '',
          interests: Array.isArray(interests) ? interests : (interests ? String(interests).split(',').map(i => i.trim()).filter(Boolean) : []),
          photos: [],
          createdAt: new Date().toISOString()
        };
        users.push(newUser);
        writeData(USERS_FILE, users);
        const token = createToken(newUser.id);
        const { password: _, ...safe } = newUser;
        return send(res, 200, { token, user: safe });
      }

      if (pathname === '/api/login' && req.method === 'POST') {
        const body = await parseBody(req);
        const clean = cleanPhone(body.phone);
        const users = readData(USERS_FILE);
        const user = users.find(u => u.phone === clean);
        if (!user || user.password !== hashPassword(body.password || '')) {
          return send(res, 401, { error: 'Invalid phone or password' });
        }
        const token = createToken(user.id);
        const { password: _, ...safe } = user;
        return send(res, 200, { token, user: safe });
      }

      if (pathname === '/api/me' && req.method === 'GET') {
        const userId = getAuthUserId(req);
        if (!userId) return send(res, 401, { error: 'Unauthorized' });
        const user = readData(USERS_FILE).find(u => u.id === userId);
        if (!user) return send(res, 404, { error: 'User not found' });
        const { password: _, ...safe } = user;
        return send(res, 200, safe);
      }

      if (pathname === '/api/profile' && req.method === 'PUT') {
        const userId = getAuthUserId(req);
        if (!userId) return send(res, 401, { error: 'Unauthorized' });
        const body = await parseBody(req);
        const users = readData(USERS_FILE);
        const idx = users.findIndex(u => u.id === userId);
        if (idx === -1) return send(res, 404, { error: 'User not found' });
        ['name', 'age', 'gender', 'lookingFor', 'location', 'tribe', 'bio', 'interests'].forEach(k => {
          if (body[k] !== undefined) users[idx][k] = body[k];
        });
        writeData(USERS_FILE, users);
        const { password: _, ...safe } = users[idx];
        return send(res, 200, safe);
      }

      if (pathname === '/api/discover' && req.method === 'GET') {
        const userId = getAuthUserId(req);
        if (!userId) return send(res, 401, { error: 'Unauthorized' });
        const users = readData(USERS_FILE);
        const likes = readData(LIKES_FILE);
        const matches = readData(MATCHES_FILE);
        const me = users.find(u => u.id === userId);
        if (!me) return send(res, 404, { error: 'User not found' });

        const likedIds = likes.filter(l => l.fromId === userId).map(l => l.toId);
        const matchedIds = matches.filter(m => m.user1Id === userId || m.user2Id === userId)
          .map(m => m.user1Id === userId ? m.user2Id : m.user1Id);
        const exclude = new Set([userId, ...likedIds, ...matchedIds]);

        let candidates = users.filter(u => {
          if (exclude.has(u.id)) return false;
          if (me.lookingFor && me.lookingFor !== 'Any' && u.gender !== me.lookingFor) return false;
          if (u.lookingFor && u.lookingFor !== 'Any' && u.lookingFor !== me.gender) return false;
          return true;
        });

        const loc = url.searchParams.get('location');
        if (loc && loc !== 'All') candidates = candidates.filter(u => u.location === loc);
        candidates = candidates.sort(() => Math.random() - 0.5).slice(0, 20);
        return send(res, 200, candidates.map(({ password, ...r }) => r));
      }

      if (pathname === '/api/like' && req.method === 'POST') {
        const userId = getAuthUserId(req);
        if (!userId) return send(res, 401, { error: 'Unauthorized' });
        const body = await parseBody(req);
        const toId = body.toId;
        if (!toId) return send(res, 400, { error: 'toId required' });
        const likes = readData(LIKES_FILE);
        if (likes.find(l => l.fromId === userId && l.toId === toId)) {
          return send(res, 200, { message: 'Already liked', matched: false });
        }
        likes.push({ id: uuid(), fromId: userId, toId, createdAt: new Date().toISOString() });
        writeData(LIKES_FILE, likes);

        const theyLiked = likes.find(l => l.fromId === toId && l.toId === userId);
        if (theyLiked) {
          const matches = readData(MATCHES_FILE);
          const exists = matches.find(m =>
            (m.user1Id === userId && m.user2Id === toId) || (m.user1Id === toId && m.user2Id === userId));
          if (!exists) {
            matches.push({ id: uuid(), user1Id: userId, user2Id: toId, createdAt: new Date().toISOString() });
            writeData(MATCHES_FILE, matches);
            return send(res, 200, { message: "It's a Match! 🎉", matched: true });
          }
        }
        return send(res, 200, { message: 'Liked!', matched: false });
      }

      if (pathname === '/api/matches' && req.method === 'GET') {
        const userId = getAuthUserId(req);
        if (!userId) return send(res, 401, { error: 'Unauthorized' });
        const matches = readData(MATCHES_FILE);
        const users = readData(USERS_FILE);
        const my = matches.filter(m => m.user1Id === userId || m.user2Id === userId);
        const result = my.map(m => {
          const otherId = m.user1Id === userId ? m.user2Id : m.user1Id;
          const other = users.find(u => u.id === otherId);
          if (!other) return null;
          const { password, ...safe } = other;
          return { matchId: m.id, matchedAt: m.createdAt, user: safe };
        }).filter(Boolean);
        return send(res, 200, result);
      }

      if (pathname.startsWith('/api/messages/') && req.method === 'GET') {
        const userId = getAuthUserId(req);
        if (!userId) return send(res, 401, { error: 'Unauthorized' });
        const matchId = pathname.split('/')[3];
        const matches = readData(MATCHES_FILE);
        const match = matches.find(m => m.id === matchId);
        if (!match) return send(res, 404, { error: 'Match not found' });
        if (match.user1Id !== userId && match.user2Id !== userId) return send(res, 403, { error: 'Not your match' });
        const messages = readData(MESSAGES_FILE).filter(m => m.matchId === matchId)
          .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        return send(res, 200, messages);
      }

      if (pathname === '/api/messages' && req.method === 'POST') {
        const userId = getAuthUserId(req);
        if (!userId) return send(res, 401, { error: 'Unauthorized' });
        const body = await parseBody(req);
        if (!body.matchId || !body.content || !String(body.content).trim()) {
          return send(res, 400, { error: 'matchId and content required' });
        }
        const matches = readData(MATCHES_FILE);
        const match = matches.find(m => m.id === body.matchId);
        if (!match) return send(res, 404, { error: 'Match not found' });
        if (match.user1Id !== userId && match.user2Id !== userId) return send(res, 403, { error: 'Not your match' });
        const messages = readData(MESSAGES_FILE);
        const msg = {
          id: uuid(),
          matchId: body.matchId,
          senderId: userId,
          content: String(body.content).trim(),
          createdAt: new Date().toISOString()
        };
        messages.push(msg);
        writeData(MESSAGES_FILE, messages);
        return send(res, 200, msg);
      }

      return send(res, 404, { error: 'Not found' });
    } catch (err) {
      console.error(err);
      return send(res, 500, { error: 'Server error' });
    }
  }

  let filePath = pathname === '/' ? '/index.html' : pathname;
  filePath = path.join(PUBLIC_DIR, filePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (e2, html) => {
        if (e2) {
          res.writeHead(404);
          return res.end('Not found');
        }
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(html);
      });
      return;
    }
    const ext = path.extname(filePath);
    const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml' };
    res.writeHead(200, { 'Content-Type': types[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`\n💚 Nia - Kenya Dating App running at http://localhost:${PORT}`);
  console.log(`📱 Demo accounts (password: demo123):`);
  console.log(`   0712000001 - Amina (Nairobi)`);
  console.log(`   0712000002 - Brian (Kisumu)`);
  console.log(`   0712000003 - Faith (Eldoret)`);
  console.log(`   0712000004 - David (Nairobi)`);
  console.log(`   0712000005 - Grace (Mombasa)`);
  console.log(`   0712000006 - Kevin (Nakuru)\n`);
});
