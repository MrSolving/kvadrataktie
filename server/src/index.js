import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import orderRoutes from './routes/orders.js';
import tradeRoutes from './routes/trades.js';
import portfolioRoutes from './routes/portfolio.js';
import adminRoutes from './routes/admin.js';
import periodRoutes from './routes/periods.js';
import votingRoutes from './routes/voting.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/periods', periodRoutes);
app.use('/api/voting', votingRoutes);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internt serverfel' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Kvadrat Aktiehandel API igång på http://localhost:${PORT}`);
});
