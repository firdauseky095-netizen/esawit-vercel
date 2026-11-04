const express = require('express');
const path = require('path');
const { router: apiRouter, getUser } = require('./api/routes');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Pastikan folder assets terbaca secara statis di Lokal maupun Vercel
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/api', apiRouter);

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get('/admin', (req, res) => {
  const user = getUser(req);
  if (!user || user.role !== 'ADMIN') return res.redirect('/');
  res.sendFile(path.join(__dirname, 'admin', 'dashboard.html'));
});

app.get('/mandor', (req, res) => {
  const user = getUser(req);
  if (!user || (user.role !== 'MANDOR' && user.role !== 'ADMIN')) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'mandor', 'dashboard.html'));
});

app.get('/operator', (req, res) => {
  const user = getUser(req);
  if (!user || (user.role !== 'OPERATOR' && user.role !== 'ADMIN')) return res.redirect('/');
  res.sendFile(path.join(__dirname, 'operator', 'dashboard.html'));
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log('[e-SAWIT CLOUD] Server berjalan di -> http://localhost:' + PORT);
  });
}

module.exports = app;