// source: https://medium.com/@jackrobertscott/how-to-use-google-auth-api-with-node-js-888304f7e3a0

const { google } = require('googleapis');
// const apis = google.getSupportedAPIs();
// console.log(apis);
// const google = apis.google;

/*******************/
/** CONFIGURATION **/
/*******************/

const googleConfig = {
  // clientId: process.env.GOOGLE_CLIENT_ID, // 831029033856-hbctj89ri5ictjecak6e4sbkv7sp0fas.apps.googleusercontent.com
  // clientSecret: process.env.GOOGLE_CLIENT_SECRET, // e.g. XtnE56ABwKyf1vC1Tw3ckPib
  // redirect: process.env.GOOGLE_REDIRECT_URL, // http://localhost:8080
  clientId: '831029033856-hbctj89ri5ictjecak6e4sbkv7sp0fas.apps.googleusercontent.com',
  clientSecret: 'XtnE56ABwKyf1vC1Tw3ckPib',
  redirect: process.env.HTTPS == 'true' ? 'https://localhost:8080/auth' : 'http://localhost:8080/auth'
};

const defaultScope = [
  'https://www.googleapis.com/auth/calendar',
  // 'https://www.googleapis.com/auth/gmail.readonly',
  'profile',
  'email',
  // 'https://www.googleapis.com/auth/plus.me',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

/*************/
/** HELPERS **/
/*************/

function createConnection() {
  return new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirect
  );
}

function getConnectionUrl(auth) {
  return auth.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: defaultScope
  });
}

function getGooglePlusApi() {
  return google.plus({ version: 'v1', auth });
}

function getGoogleCalendarApi() {
  auth.setCredentials(tokens);
  return google.calendar({ version: 'v3', auth});
}

function getGoogleOAuth2() {
  auth.setCredentials(tokens);
  return google.oauth2({ version: 'v2', auth});
}

/**********/
/** MAIN **/
/**********/
let tokens; // to store the oauth token
let auth = createConnection();
/**
 * Part 1: Create a Google URL and send to the client to log in the user.
 */
function urlGoogle() {
  // const auth = createConnection();
  const url = getConnectionUrl(auth);
  return url;
}

/**
 * Part 2: Take the "code" parameter which Google gives us once when the user logs in, then get the user's email and id.
 */
async function getGoogleAccountFromCode(code) {
  // const auth = createConnection();
  let data;
  try {
    data = await auth.getToken(code);
  } catch (e) {
    console.log(e);
    return e.response.data;
  }
  const tokens = data.tokens;
  // console.log('tokens', tokens);
  // const auth = createConnection();
  auth.setCredentials(tokens);
  const oauth2 = getGoogleOAuth2(auth);
  const calendar = getGoogleCalendarApi(auth);
  try {
    const me = await new Promise((resolve, reject) => calendar.calendarList.list((e, r) => {
      // console.log(e,r);
      if (e) {
        reject(e);
      }
      resolve(r);
    }));
    // console.log(me.data);
    return me.data;
  } catch (e) {
    console.log('errrr');
    return e;
  }
  // const plus = getGooglePlusApi(auth);
  // const me = await plus.people.get({ userId: 'me' });
  // const userGoogleId = me.data.id;
  // const userGoogleEmail = me.data.emails && me.data.emails.length && me.data.emails[0].value;
  // return {
  //   id: userGoogleId,
  //   email: userGoogleEmail,
  //   tokens: tokens,
  // };
}

async function getOAuthTokenFromCode(code) {
  // const auth = createConnection();
  let data;
  try {
    data = await auth.getToken(code);
  } catch (e) {
    console.log(e.response.data);
    return e.response.data;
  }
  tokens = data.tokens;
  return tokens;
}

function getFreebusy(calendarIds, startDate, endDate) {
  // auth.setCredentials(tokens);
  console.log(calendarIds.map(e => ({id: e})));
  const calendar = google.calendar({ version: 'v3', auth});
  return calendar.freebusy.query({
    auth: auth,
    resource: {
      timeMin: new Date(startDate).toISOString(), //'2019-04-01T00:00:00+08:00', //(new Date()).toISOString(),
      timeMax: new Date(endDate).toISOString(),
      items: calendarIds.map(e => ({id: e}))
      // items: [
      //   {
      //     id: 'johnnydolanplaceholder@gmail.com'
      //   }
      // ]
    }
  });
}


module.exports = {
  createConnection,
  getConnectionUrl,
  getGoogleCalendarApi,
  getGoogleOAuth2,
  urlGoogle,
  getGoogleAccountFromCode,
  getOAuthTokenFromCode,
  getFreebusy
}