const admin = require('firebase-admin');

var serviceAccount = require('./service-account-key.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://calendar-api-233312.firebaseio.com"
});

var db = admin.firestore();

var docRef = db.collection('users').doc('alovelace');

var setAda = docRef.set({
  first: 'Ada',
  last: 'Lovelace',
  born: 1815
});

function getProjects(owner) {
  return db.collection('projects').where('owner', '==', owner).get();
}
function getProject(projectId) {
  return db.collection('projects').doc(projectId).get();
}
function addProject(project) {
  return db.collection('projects').add(project);
}
function updateProject(projectId, project) {
  return db.collection('projects').doc(projectId).update(project);
}
function addSprintToProject(projectId, sprint) {
  return db.collection('projects').doc(projectId).update({
    sprints: admin.firestore.FieldValue.arrayUnion(sprint)
  });
}
function getUsersByRole(role) {
  return db.collection('users').where('role', '==', role).get();
}

function saveUserIfNotExists(user) {
  db.collection('users').doc(user.email).get()
  .then(doc => {
    if (!doc.exists) {
      db.collection('users').doc(user.email).set(user);
    }
  });
}

module.exports = {
  getProjects,
  getProject,
  addProject,
  updateProject,
  addSprintToProject,
  saveUserIfNotExists,
  getUsersByRole
}