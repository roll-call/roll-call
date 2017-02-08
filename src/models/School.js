import User from './User';

const schoolsRef = (id = '') => firebase.database().ref(`users/${User.getCurrentId()}/schools/${id}`);

export default {
  query: () => {
    const userId = User.getCurrentId();
    if(!userId) {
      console.log('No user!');
      return;
    }
    return new Promise((resolve, reject) => {
      schoolsRef().once('value', data => {
        const val = data.val();
        if(!val) return reject(`Couldn't find schools for user ${id}`);
        resolve(val);
      });
    });
  },

  create: schoolName => {
    const newSchool = schoolsRef().push();
    newSchool.set({ name: schoolName });
  },

  // TODO: Move App.jsx creating/initializing a new user into here create: => {}
  updateName: (id, schoolName) => {
    schoolsRef(id).update({ name: schoolName });
  },

  update: (id, hash) => {
    return schoolsRef(id).update(hash);
  },

  get: ({ id }) => {
    return new Promise((resolve, reject) => {
      schoolsRef(id).once('value', data => {
        const val = data.val();
        if(!val) return reject(`Couldn't find schools for user ${id}`);
        resolve(val);
      });
    });
  }
};
