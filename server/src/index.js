require('dotenv').config();

const cors = require('cors');
const express = require('express');
const authRoutes = require('./routes/auth.routes');
const bookRoutes = require('./routes/book.routes');
const meRoutes = require('./routes/me.routes');

const app = express();
const port = Number(process.env.PORT || 4000);
const clientOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

app.use(cors({ origin: clientOrigins }));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/auth', authRoutes);
app.use('/books', bookRoutes);
app.use('/me', meRoutes);

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ error: 'Something went wrong.' });
});

app.listen(port, () => {
  console.log(`BookClub API listening on http://localhost:${port}`);
});
