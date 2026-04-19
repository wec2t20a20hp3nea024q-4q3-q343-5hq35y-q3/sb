const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, maxAge: 86400000 }
}));

const USERS_FILE = path.join(__dirname, '..', 'users.json');

function readUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

// app.post('/api/register', (req, res) => {
//   const { username, email, password, confirmPassword } = req.body;
//   if (!username || !email || !password || !confirmPassword) {
//     return res.status(400).json({ error: 'All fields required' });
//   }
//   if (password !== confirmPassword) {
//     return res.status(400).json({ error: 'Passwords do not match' });
//   }
//   const users = readUsers();
//   if (users.find(u => u.username === username)) {
//     return res.status(400).json({ error: 'Username taken' });
//   }
//   if (users.find(u => u.email === email)) {
//     return res.status(400).json({ error: 'Email registered' });
//   }
//   const newUser = { id: Date.now(), username, email, password };
//   users.push(newUser);
//   writeUsers(users);
//   req.session.user = { id: newUser.id, username, email };
//   res.status(201).json({ success: true, redirect: '/index.html' });
// });
app.post('/api/register', (req, res) => {
  res.status(403).json({ error: 'Registration is disabled (read‑only mode)' });
});
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  req.session.user = { id: user.id, username: user.username, email: user.email };
  res.json({ success: true, redirect: '/index.html' });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.json({ success: true, redirect: '/login.html' });
  });
});

app.get('/api/me', (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

module.exports = app;