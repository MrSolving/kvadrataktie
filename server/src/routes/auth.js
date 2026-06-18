import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { signToken, authRequired } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'E-post och lösenord krävs' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ error: 'Fel e-post eller lösenord' });
  }

  const ok = bcrypt.compareSync(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({ error: 'Fel e-post eller lösenord' });
  }

  const token = signToken(user);
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Användare hittades inte' });
  const { password_hash, ...safeUser } = user;
  res.json(safeUser);
});

export default router;
