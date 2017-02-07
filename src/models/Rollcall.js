import User from './User';

const pad = num => `${num < 10 ? '0' : ''}${num}`;
const dateString = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate()+1)}`
const rollcallRef = (id, date) => firebase.database().ref(`users/${User.getCurrentId()}/schools/${id}/rollcall/${dateString(date)}`);

export default {
  query: ({ id, date }) => {
    const userId = User.getCurrentId;
    if(!userId) {
      console.log('No user!');
      return Promise.resolve([]);
    }
    return new Promise(resolve => {
      rollcallRef(id, date).once('value', data => {
        resolve(data.val() || []);
      });
    });
  },

  update: (id, date, rollcall) => rollcallRef(id, date).set(rollcall)
};
