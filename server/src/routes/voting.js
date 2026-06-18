import express from 'express';
import { v4 as uuid } from 'uuid';
import { db } from '../db/index.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();
router.use(authRequired);

// Lista alla omröstningssessioner med hur många motioner användaren röstat på
router.get('/', (req, res) => {
  const sessions = db.prepare(`
    SELECT vs.*,
      (SELECT COUNT(*) FROM motions WHERE session_id = vs.id) as motion_count,
      (SELECT COUNT(*) FROM votes v JOIN motions m ON m.id = v.motion_id
       WHERE m.session_id = vs.id AND v.user_id = ?) as voted_count
    FROM voting_sessions vs
    ORDER BY vs.created_at DESC
  `).all(req.user.id);
  res.json(sessions);
});

// Hämta en session med motioner och användarens egna röster
router.get('/:id', (req, res) => {
  const session = db.prepare('SELECT * FROM voting_sessions WHERE id = ?').get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Omröstning hittades inte' });

  const motions = db.prepare(`
    SELECT m.*,
      (SELECT vote FROM votes WHERE motion_id = m.id AND user_id = ?) as my_vote,
      (SELECT vote_weight FROM votes WHERE motion_id = m.id AND user_id = ?) as my_weight
    FROM motions m
    WHERE m.session_id = ?
    ORDER BY m.sort_order ASC, m.created_at ASC
  `).all(req.user.id, req.user.id, session.id);

  res.json({ ...session, motions });
});

// Rösta på en motion
router.post('/:sessionId/motions/:motionId/vote', (req, res) => {
  const { vote } = req.body;
  if (!['ja', 'nej', 'avstar'].includes(vote)) {
    return res.status(400).json({ error: 'vote måste vara ja, nej eller avstar' });
  }

  const session = db.prepare('SELECT * FROM voting_sessions WHERE id = ?').get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Omröstning hittades inte' });
  if (session.status !== 'open') {
    return res.status(400).json({ error: 'Omröstningen är inte öppen' });
  }

  const motion = db.prepare('SELECT * FROM motions WHERE id = ? AND session_id = ?').get(req.params.motionId, session.id);
  if (!motion) return res.status(404).json({ error: 'Motion hittades inte' });

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  const voteWeight = session.type === 'stamma'
    ? (user.shares_company + user.shares_private)
    : 1;

  if (session.type === 'stamma' && voteWeight === 0) {
    return res.status(400).json({ error: 'Du har inga aktier och kan inte rösta i en bolagsstämma' });
  }

  const existing = db.prepare('SELECT * FROM votes WHERE motion_id = ? AND user_id = ?').get(motion.id, req.user.id);
  if (existing) {
    db.prepare(`UPDATE votes SET vote = ?, vote_weight = ?, created_at = datetime('now', 'localtime') WHERE id = ?`)
      .run(vote, voteWeight, existing.id);
  } else {
    db.prepare(`INSERT INTO votes (id, motion_id, user_id, vote, vote_weight) VALUES (?, ?, ?, ?, ?)`)
      .run(uuid(), motion.id, req.user.id, vote, voteWeight);
  }

  res.json({ ok: true, vote, vote_weight: voteWeight });
});

export default router;
