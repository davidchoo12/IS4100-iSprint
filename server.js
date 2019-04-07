require('dotenv').config(); // setup env vars
const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const https = require('https');
const fs = require('fs');
const tl = require('express-tl')

const googlehelper = require('./google');
const firestore = require('./firestore');

const app = express();
const port = process.env.PORT || 8080;

app.engine('html', tl)
app.set('views', './UI') // specify the views directory
app.set('view engine', 'html') // register the template engine

app.use(session({
  secret: 'iloveis4100', // key to encrypt session cookies
  resave: false,
  saveUninitialized: true,
  cookie: { secure: process.env.HTTPS == 'true' }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use((req, res, next) => {
  // console.log('req.body', req.body);
  // console.log('req.session', req.session);
  next();
});

function ensureLoggedIn(req, res, next) {
  if (!req.session.email) {
    res.redirect('/login');
  } else {
    next();
  }
}

app.get('/', (req, res) => { // todo add ensureLoggedIn
  firestore.getProjects('patrick.isprintdemo@gmail.com')
  .then(ss => {
    let data = [];
    ss.forEach(doc => data.push({...doc.data(), id: doc.id}));
    
    // res.send(JSON.stringify(data, null, 2));
    res.render('sprint_gantt', {projects: data});
  });
});
app.get('/project/new', (req, res) => {
  res.render('create_project');
});
app.get('/project/:id/sprint/new', (req, res) => {
  firestore.getProject(req.params.id)
  .then(doc => {
    res.render('create_sprint', {projectName: doc.data().name});
  });
});
app.get('/project/:id/sprint', (req, res) => {
  firestore.getProject(req.params.id)
  .then(doc => {
    let c = 1;
    const sprints = doc.data().sprints || [];
    let data = sprints.flatMap((s, i) => {
      sprintId = c++;
      console.log(s.start_date, s.end_date);
      let sprintJson = {
        pID: sprintId,
        pName: s.name,
        pStart: s.start_date.split('/')[2] + '-' + s.start_date.split('/')[1] + '-' + s.start_date.split('/')[0],
        pEnd: s.end_date.split('/')[2] + '-' + s.end_date.split('/')[1] + '-' + s.end_date.split('/')[0],
        pPlanStart: '', // required
        pPlanEnd: '', // required
        pClass: 'ggroupblack',
        pComp: 0, // required
        pGroup: 1, // 0 for task, 1 for sprint
        pParent: 0, // pid of parent
        pOpen: 1, // required
        pCost: s.budget, // budget
        pNotes: s.description || '', // descr
      }
      let tasksArr = s.tasks.map((t, j) => ({
        pID: c++,
        pName: t.name,
        pStart: t.start_date.split('/')[2] + '-' + t.start_date.split('/')[1] + '-' + t.start_date.split('/')[0],
        pEnd: t.end_date.split('/')[2] + '-' + t.end_date.split('/')[1] + '-' + t.end_date.split('/')[0],
        pPlanStart: '', // required
        pPlanEnd: '', // required
        pClass: 'ggroupblack',
        pRes: t.assignee || '', // person assigned only apply for task
        pComp: 0, // required
        pGroup: 0, // 0 for task, 1 for sprint
        pParent: sprintId, // pid of parent
        pOpen: 1, // required
        pCost: 0, // budget
        pNotes: t.desc || '', // descr
        role: t.role || '', // apply for tasks the role
      }));
      tasksArr.unshift(sprintJson);
      return tasksArr;
    });
    // data.flat(1);
    // res.render('sprint_gantt', {projects: data});
    res.send(JSON.stringify(data, null, 2));
  });
});
app.use('/', express.static(__dirname + '/UI'));

// google oauth redirect to here
app.get('/auth', async (req, res) => {
  // res.send(req.query);
  if (req.query.error) {
    res.send('access denied :(');
  } else if (req.query.code) {
    const tokens = await googlehelper.getOAuthTokenFromCode(req.query.code);
    req.session.tokens = tokens;
    req.session.cookie.expires = new Date(tokens.expiry_date);
    const oauth2 = googlehelper.getGoogleOAuth2();
    oauth2.userinfo.get((e, r) => {
      console.log('errors', e);
      console.log('response.data', r.data);
      firestore.saveUserIfNotExists({
        name: r.data.name,
        email: r.data.email
      });
      req.session.name = r.data.name;
      req.session.email = r.data.email;
      // res.send(r.data);
      res.redirect('/');
    });
    // res.send(tokens);
  } else if (req.session.tokens) {
    res.redirect('/');
  } else {
    res.redirect('/login');
  }
});
// login redirect to google oauth
app.get('/login', (req, res) => {
  res.redirect(googlehelper.urlGoogle());
});

app.get('/projects', (req, res) => {
  firestore.getProjects('davidchoo16@gmail.com')
  .then(ss => {
    let data = [];
    ss.forEach(doc => data.push(doc.data()));
    
    res.send(JSON.stringify(data, null, 2));
    // res.render('sprint_gantt', data);
  });
});
app.get('/members', async (req, res) => {
  let users = await firestore.getUsersByRole(req.query.role).then(ss => {
    let data = [];
    ss.forEach(doc => data.push(doc.data()));
    return data;
    // const calendar = googlehelper.getGoogleCalendarApi();
    // res.send(JSON.stringify(data, null, 2));
  });
  // res.send(data);
  const startDate = req.query.startdate.split('/').reverse().join('-'); // convert dd/mm/yyyy to yyyy-mm-dd
  const endDate = req.query.enddate.split('/').reverse().join('-');
  googlehelper.getFreebusy(users.map(e => e.email), startDate, endDate)
  .then(r => {
    let data = r.data;
    let result = [];
    for (email in data.calendars) {
      result.push({
        name: users.find(u => u.email == email).name,
        email,
        available: !data.calendars[email].busy.length
      })
    }
    res.send(result);
  }).catch(console.log);
  // calendar.
  // res.send([{
  //   name: 'name',
  //   email: 'email',
  //   available: false
  // },
  // {
  //   name: 'name2',
  //   email: 'email',
  //   available: true
  // }]);
  // res.send(users);
});

// new project form post to here
app.post('/project/new', ensureLoggedIn, (req, res) => {
  let { project_name, ...toSave } = req.body;
  toSave = {
    ...toSave,
    name: project_name,
    owner: req.session.email
  };
  firestore.addProject(toSave)
  .then(ref => res.redirect('/'))
  .catch(err => {
    console.log('aaaa');
    // res.send(err);
    res.redirect('/');
  });
});
app.post('/project/:id/sprint/new', (req, res) => {
  let tasks = [];
  if (req.body.task_name) {
    tasks = req.body.task_name.map((e, i) => ({
      name: e,
      start_date: req.body.task_start_date[i].split(' - ')[0],
      end_date: req.body.task_start_date[i].split(' - ')[1],
      description: req.body.task_desc[i] || null,
      role: req.body.task_role[i],
    }));
  }
  const toSave = {
    name: req.body.sprint_name,
    start_date: req.body.sprint_start_date,
    end_date: req.body.sprint_end_date,
    description: req.body.sprint_desc || null,
    budget: req.body.sprint_budget,
    tasks
  };
  // console.log(req.params.id);
  // res.send(JSON.stringify(toSave, null, 2));
  firestore.addSprintToProject(req.params.id, toSave)
  .then(ref => res.redirect('/'))
  .catch(err => {
    console.log('aaaa');
    res.send(err);
  });
});

app.get('/calendar', async (req, res) => {
  const calendar = googlehelper.getGoogleCalendarApi();
  // calendar.calendarList.list((e, r) => {
  //   console.log('errors', e);
  //   console.log('response.data', r.data);
  //   // firestore.saveUserIfNotExists({
  //   //   name: r.data.name,
  //   //   email: r.data.email
  //   // });
  //   res.send(r.data);
  //   // res.redirect('/');
  // });
  // calendar.freebusy.query({
  //   timeMin: '2019-04-01T00:00:00+08:00', //(new Date()).toISOString(),
  //   timeMax: '2019-04-30T00:00:00+08:00',
  //   items: [
  //     {
  //       id: 'johnnydolanplaceholder@gmail.com'
  //     }
  //   ]
  // }, (e, r) => {
  //   console.log('errors', e);
  //   console.log('response.data', r.data);
  //   res.send(r.data);
  // });
  // const a = await calendar.freebusy.query({
  //   timeMin: '2019-04-01T00:00:00+08:00', //(new Date()).toISOString(),
  //   timeMax: '2019-04-30T00:00:00+08:00',
  //   items: [
  //     {
  //       id: 'johnnydolanplaceholder@gmail.com'
  //     }
  //   ]
  // });
  // console.log(a.data);
  // googlehelper.getFreebusy().then(r => {
  //   res.send(r.data);
  // });
  // res.send(a.data);
});

// app.use('/static', express.static(__dirname + '/static'));

if (process.env.HTTPS == 'true') {
  const httpsOptions = {
    key: fs.readFileSync('./security/cert.key'),
    cert: fs.readFileSync('./security/cert.pem')
  }
  const server = https.createServer(httpsOptions, app)
    .listen(port, () => {
        console.log('express server running HTTPS');
        console.log('https://localhost:' + port + '/login');
    })
} else {
  app.listen(port);
  console.log('express server running');
  console.log('http://localhost:' + port + '/login');
}
// todo use https://github.com/Drulac/express-tl