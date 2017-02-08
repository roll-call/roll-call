import User from './User';

const pad         = num  => `${num < 10 ? '0' : ''}${num}`;
const dateString  = date => `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const rollcallRef = id   => firebase.database().ref(`users/${User.getCurrentId()}/schools/${id}/rollcall/`);

const generateReport = rollcalls => {
  const studentToTotals = {};
  Object.keys(rollcalls).forEach(key => {
    const rollcall = rollcalls[key];
    rollcall.forEach(([student, status]) => {
      let totals = studentToTotals[student];
      if(!totals) studentToTotals[student] = totals = {};

      const total = totals[status];
      totals[status] = total ? total + 1 : 1;
    })
  });

  const report = [];
  Object.keys(studentToTotals).sort(student => {
   report.push([ student, studentToTotals[student] ]);
  })
  return report;
};

export default {
  query: ({ id, startDate, endDate }) => {
    const userId = User.getCurrentId();
    if(!userId) {
      console.log('No user!');
      return Promise.resolve([]);
    }
    return new Promise(resolve => {
      rollcallRef(id)
        .startAt(null, dateString(startDate))
        .endAt(null,   dateString(endDate))
        .once('value', data => {
          resolve(generateReport(data.val()));
        });
    });
  }
};
