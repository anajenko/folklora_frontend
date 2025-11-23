const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname, 'public')));

// --- Root route ---
app.get('/', (req, res) => {
  // Render views/index.ejs
  res.render('index');
});

app.listen(PORT, () => {
  console.log(`Frontend running on http://localhost:${PORT}`);
});