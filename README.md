# Kvadrat Aktiehandel

En webportal med backend och databas för intern aktiehandel i bolag med hembudsaktier.

## Teknikstack

- **Backend:** Node.js + Express, SQLite via Node:s inbyggda `node:sqlite`-modul (kräver Node 22.5+, ingen native-kompilering behövs)
- **Frontend:** React (Vite), React Router
- **Auth:** JWT, e-post + lösenord (bcrypt-hashat)

## Funktioner

**Startsida:** titel "Kvadrat Aktiehandel", information om hembudsaktier, separat inloggning för aktieägare och administratörer.

**Aktieägare (inloggad):**
- Översikt: nästa handelsperiod, aktieinnehav, VP-konto, kontonummer vid försäljning, e-post, person-/organisationsnummer, värde enligt senaste handelspris, antal köp-/säljordrar
- Lägg order (köp/sälj) i jämna 100-tal under öppen handelsperiod till fastställt pris
- Se och ändra/avbryta egna ordrar som inte är genomförda
- Se affärer som köpare: säljarens namn, kontaktuppgifter och konto att betala till, samt checkbox "pengar skickade"
- Se affärer som säljare: köparens uppgifter, status på köparens betalning, samt checkbox "pengar mottagna"
- En köpare kan ha affärer mot flera säljare och vice versa (varje matchning blir en egen affär/trade)
- Handelskalender och nyheter

**Administratör:**
- Lista alla ägare med innehav (bolag/privat), filtrera på hembudskrets
- Skapa nya ägare med inloggning
- Skapa/redigera handelsperioder, sätta och ändra fastställt pris
- Köra matchning (FIFO till fastställt pris) för en period
- Se pågående aktiehändelser (öppna perioder, senaste ordrar/affärer)
- Publicera och ta bort nyheter
- Hantera handelskalender
- Ändra storlek på handelsposter (lot size) per period
- Generera CSV-fil till Euroclear för genomförda affärer
- Importera resultatfil från Euroclear och se avstämning mot aktieboken

## Orderstatus-flöde

`Initierad` → `Under behandling` (delvis matchad) → `Genomförd` (helt matchad/affär genomförd) → `Rapporterad till Euroclear` → `Slutförd`

## Matchningslogik

Vid matchning sorteras köp- och säljordrar i en period efter när de lades (FIFO). Ordrar matchas mot varandra i kvantitetsenheter ner till periodens poststorlek (normalt 100 aktier). Varje matchat par skapar en egen **affär (trade)** med eget pris, kvantitet och betalningsstatus — en order kan alltså generera flera affärer om den matchas mot flera motparter.

Endast jämna multiplar av poststorleken (standard 100) accepteras vid orderläggning; ojämna kvantiteter avvisas.

## Komma igång

Detta projekt har byggts i en sandlåda utan internetåtkomst, så `npm install` har **inte** körts. Du behöver Node.js **22.5 eller senare** installerat lokalt (kontrollera med `node --version`). Databasen använder Node:s inbyggda `node:sqlite`-modul istället för `better-sqlite3`, just för att undvika native-kompilering via node-gyp som annars ofta misslyckas på nya Node-versioner eller maskiner utan byggverktyg installerade. Du kan se en varning i terminalen om att "SQLite is an experimental feature" — det är normalt och påverkar inte funktionaliteten.

### 1. Backend

```bash
cd server
npm install
npm run seed     # skapar databasen och seedar testdata
npm run dev       # startar API på http://localhost:4000
```

Seed-data skapar bland annat:
- Admin: `admin@kvadrat.se` / `admin123`
- Ägare: `anna@example.se`, `bertil@example.se`, `cecilia@example.se`, `david@example.se`, `extern@example.se` — alla med lösenord `password123`

### 2. Frontend

I en ny terminal:

```bash
cd client
npm install
npm run dev       # startar appen på http://localhost:5173
```

Frontend proxar `/api`-anrop till backend på port 4000 (se `vite.config.js`).

Öppna `http://localhost:5173` i webbläsaren.

## Projektstruktur

```
kvadrat-aktiehandel/
├── server/
│   ├── src/
│   │   ├── db/            # schema.sql, db-anslutning, seed
│   │   ├── middleware/     # JWT-auth
│   │   ├── routes/         # auth, orders, trades, portfolio, admin, periods
│   │   ├── services/       # matchningsmotor, Euroclear export/import
│   │   └── index.js        # Express-app
│   ├── .env
│   └── package.json
└── client/
    ├── src/
    │   ├── api/             # fetch-wrapper
    │   ├── context/         # AuthContext
    │   ├── components/      # layouter, statusbadge
    │   ├── pages/            # ägarsidor
    │   └── pages/admin/      # adminsidor
    └── package.json
```

## Säkerhetsnoteringar inför skarp drift

Detta är en fungerande lokal applikation, inte driftsatt. Innan eventuell produktionssättning bör följande ses över:
- Byt `JWT_SECRET` i `server/.env` till ett starkt, hemligt värde
- Lägg till HTTPS, rate limiting och CSRF-skydd
- Inför BankID eller annan stark autentisering för aktieägarinloggning (nämndes som framtida behov)
- Granska Euroclear-filformat mot Euroclears faktiska tekniska specifikation (nuvarande format är en rimlig utgångspunkt, inte en verifierad standard)
- Lägg till loggning/revisionsspår för känsliga operationer (prissättning, ägarregistrering)
- Säkerhetsgranska hantering av personnummer/organisationsnummer enligt GDPR
