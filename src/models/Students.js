import User from './User';

const studentsRef = (id = '') => firebase.database().ref(`users/${User.getCurrentId()}/schools/${id}/students`);

export default {
  query: ({ id }) => {
    const userId = User.getCurrentId;
    if(!userId) {
      console.log('No user!');
      return Promise.resolve([]);
    }
    return new Promise(resolve => {
      studentsRef(id).once('value', data => {
        resolve(data.val() || []);
      });
    });
  },

  update: (id, students) => studentsRef(id).set(students)
};
