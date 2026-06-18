import { db } from './index.js';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

function hash(pw) {
  return bcrypt.hashSync(pw, 10);
}

console.log('Rensar och seedar databasen...');

db.exec(`
  DELETE FROM official_holdings;
  DELETE FROM euroclear_imports;
  DELETE FROM euroclear_exports;
  DELETE FROM trades;
  DELETE FROM orders;
  DELETE FROM news;
  DELETE FROM trading_calendar;
  DELETE FROM trading_periods;
  DELETE FROM users;
`);

const insertUser = db.prepare(`
  INSERT INTO users (id, email, password_hash, role, name, personnummer_orgnr, vp_konto, bankkonto_forsaljning, shares_company, shares_private, in_hembudskrets)
  VALUES (@id, @email, @password_hash, @role, @name, @personnummer_orgnr, @vp_konto, @bankkonto_forsaljning, @shares_company, @shares_private, @in_hembudskrets)
`);

const adminId = uuid();
insertUser.run({
  id: adminId,
  email: 'admin@kvadrat.se',
  password_hash: hash('admin123'),
  role: 'admin',
  name: 'Admin Administratorsson',
  personnummer_orgnr: '556000-0000',
  vp_konto: null,
  bankkonto_forsaljning: null,
  shares_company: 0,
  shares_private: 0,
  in_hembudskrets: 0
});

const owners = [
  { name: 'Anna Andersson', email: 'anna@example.se', pnr: '19800101-1234', vp: 'VP-1001', bank: '1234-5678901', company: 500, priv: 200 },
  { name: 'Bertil Bengtsson', email: 'bertil@example.se', pnr: '19750505-5678', vp: 'VP-1002', bank: '2345-6789012', company: 0, priv: 1200 },
  { name: 'Cecilia Carlsson', email: 'cecilia@example.se', pnr: '19900909-9012', vp: 'VP-1003', bank: '3456-7890123', company: 300, priv: 0 },
  { name: 'David Dahlberg', email: 'david@example.se', pnr: '19651212-3456', vp: 'VP-1004', bank: '4567-8901234', company: 0, priv: 800 },
  { name: 'Extern Holding AB', email: 'extern@example.se', pnr: '559911-2233', vp: 'VP-2001', bank: '5678-9012345', company: 0, priv: 2000, hembud: 0 },
];

const ownerIds = {};
for (const o of owners) {
  const id = uuid();
  ownerIds[o.email] = id;
  insertUser.run({
    id,
    email: o.email,
    password_hash: hash('password123'),
    role: 'owner',
    name: o.name,
    personnummer_orgnr: o.pnr,
    vp_konto: o.vp,
    bankkonto_forsaljning: o.bank,
    shares_company: o.company,
    shares_private: o.priv,
    in_hembudskrets: o.hembud === 0 ? 0 : 1
  });
}

// Handelsperioder
const insertPeriod = db.prepare(`
  INSERT INTO trading_periods (id, name, start_date, end_date, price, lot_size, status)
  VALUES (@id, @name, @start_date, @end_date, @price, @lot_size, @status)
`);

const closedPeriodId = uuid();
insertPeriod.run({
  id: closedPeriodId,
  name: 'Handelsperiod Q1 2026',
  start_date: '2026-01-15',
  end_date: '2026-01-31',
  price: 145.0,
  lot_size: 100,
  status: 'closed'
});

const openPeriodId = uuid();
insertPeriod.run({
  id: openPeriodId,
  name: 'Handelsperiod Q3 2026',
  start_date: '2026-06-10',
  end_date: '2026-06-30',
  price: 150.0,
  lot_size: 100,
  status: 'open'
});

const upcomingPeriodId = uuid();
insertPeriod.run({
  id: upcomingPeriodId,
  name: 'Handelsperiod Q4 2026',
  start_date: '2026-10-01',
  end_date: '2026-10-15',
  price: null,
  lot_size: 100,
  status: 'upcoming'
});

// Några exempelordrar i den öppna perioden
const insertOrder = db.prepare(`
  INSERT INTO orders (id, user_id, trading_period_id, type, quantity, remaining_quantity, status)
  VALUES (@id, @user_id, @trading_period_id, @type, @quantity, @remaining_quantity, @status)
`);

insertOrder.run({
  id: uuid(),
  user_id: ownerIds['anna@example.se'],
  trading_period_id: openPeriodId,
  type: 'sell',
  quantity: 200,
  remaining_quantity: 200,
  status: 'initierad'
});

insertOrder.run({
  id: uuid(),
  user_id: ownerIds['bertil@example.se'],
  trading_period_id: openPeriodId,
  type: 'buy',
  quantity: 100,
  remaining_quantity: 100,
  status: 'initierad'
});

// Nyheter
const insertNews = db.prepare(`
  INSERT INTO news (id, title, body, author_id) VALUES (@id, @title, @body, @author_id)
`);
insertNews.run({
  id: uuid(),
  title: 'Välkommen till Kvadrat Aktiehandel',
  body: 'Den nya portalen för intern aktiehandel är nu öppen. Här kan du se ditt innehav, lägga order under handelsperioder och följa dina affärer.',
  author_id: adminId
});

// Omröstningar
const insertSession = db.prepare(`
  INSERT INTO voting_sessions (id, title, type, description, status, created_by)
  VALUES (@id, @title, @type, @description, @status, @created_by)
`);
const insertMotion = db.prepare(`
  INSERT INTO motions (id, session_id, title, description, sort_order)
  VALUES (@id, @session_id, @title, @description, @sort_order)
`);

const kongressId = uuid();
insertSession.run({
  id: kongressId,
  title: 'Kongress 2026',
  type: 'kongress',
  description: 'Ordinarie kongress för Kvadratare. Varje aktieägare har en röst oavsett aktieinnehav.',
  status: 'open',
  created_by: adminId
});
insertMotion.run({
  id: uuid(),
  session_id: kongressId,
  title: 'Ska Kvadrat utreda om dokusåpastjärnor ska kunna bli Kvadratare för deras gig på events mm?',
  description: 'Motionen föreslår att styrelsen tillsätter en utredning kring huruvida Kvadrat bör öppna upp för att anlita profiler från dokusåpor som konsulter vid kunduppdrag och events. Utredningen ska redovisas på nästa kongress.',
  sort_order: 1
});

const stammaId = uuid();
insertSession.run({
  id: stammaId,
  title: 'Bolagsstämma 2026',
  type: 'stamma',
  description: 'Extra bolagsstämma. Rösträtten beräknas per aktie — privata och företagsinnehav räknas samman.',
  status: 'open',
  created_by: adminId
});
insertMotion.run({
  id: uuid(),
  session_id: stammaId,
  title: 'Ska Kvadrat investera 10 MSEK för att starta Kvadrat New York och ändra koncernspråk till engelska?',
  description: 'Styrelsen föreslår att bolaget investerar 10 miljoner kronor i etableringen av ett New York-kontor samt att engelska införs som koncernspråk i all intern kommunikation och dokumentation. Investeringen finansieras via befintliga likvida medel.',
  sort_order: 1
});

// Handelskalender
const insertCal = db.prepare(`
  INSERT INTO trading_calendar (id, label, start_date, end_date, notes) VALUES (@id, @label, @start_date, @end_date, @notes)
`);
insertCal.run({ id: uuid(), label: 'Handelsperiod Q4 2026', start_date: '2026-10-01', end_date: '2026-10-15', notes: 'Pris fastställs av styrelsen inför periodens start.' });
insertCal.run({ id: uuid(), label: 'Handelsperiod Q1 2027', start_date: '2027-01-15', end_date: '2027-01-31', notes: null });

console.log('Seed klar!');
console.log('Admin: admin@kvadrat.se / admin123');
console.log('Ägare: anna@example.se / password123 (samt bertil/cecilia/david/extern@example.se)');
