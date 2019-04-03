const express = require('express');
const googlehelper = require('./google');

const app = express();
app.get('/', async (req, res) => {
  // res.send(req.query);
  if (req.query.error) {
    res.send('access denied :(');
  }
  res.send(await googlehelper.getGoogleAccountFromCode(req.query.code));
});
app.get('/login', (req, res) => {
  res.redirect(googlehelper.urlGoogle());
});
app.use('/static', express.static(__dirname + '/static'));
app.listen(process.env.PORT || 8080);
console.log('express server running');