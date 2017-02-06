import User from './User';
import Students from './Students';

const SEATS_PER_ROW = 10;
const seatingRef = (id = '') => firebase.database().ref(`users/${User.getCurrentId()}/schools/${id}/seating`);
const defaultSeating = students => {
  const left = students.slice();
  const result = [];
  while(left.length > 0){
    result.push(left.splice(0, SEATS_PER_ROW));
  }
  return result;
}

const Seating = {
  query: ({ id }) => {
    const userId = User.getCurrentId;
    if(!userId) {
      console.log('No user!');
      return Promise.resolve([]);
    }
    return new Promise(resolve => {
      seatingRef(id).once('value', data => {
        const val = data.val();
        if(!val){
          Students.query({ id }).then(students => {
            if(students && students.length){
              const seating = defaultSeating(students);
              Seating.update(id, seating);
              resolve(seating);
            }
            else {
              resolve([]);
            }
          });
        }
        else{
          resolve(data.val());
        }
      });
    });
  },

  update: (id, seating) => seatingRef(id).set(seating)
};

export default Seating;