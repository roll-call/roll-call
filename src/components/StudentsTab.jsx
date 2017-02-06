import './SchoolPage.css';
import './common/List.css';

import xvdom      from 'xvdom';
import dataComponent from '../helpers/dataComponent.js';
import StudentsModel from '../models/Students.js';

const EditNewStudent = ({state, bindSend}) => (
  <div className='layout horizontal'>
    <input
      className='SchoolPage-input flex'
      oninput={bindSend('updateName')}
      value={state}
      placeholder="Student's Name"
    />
    <a hidden={!state} className='self-center l-margin-l2' onclick={bindSend('addStudent')}>Add</a>
  </div>
);

EditNewStudent.state = {
  onInit: () => '',
  onProps: () => '',
  updateName: (component, e) => e.target.value,
  addStudent: ({props: {id, students, onAdd}, state}, e) => {
    if(state && students.indexOf(state) === -1){
      StudentsModel.update(id, students.concat(state)).then(onAdd);
    }
    return '';
  }
};

export default dataComponent(
  StudentsModel,
  'query',
  ({ props: { id }, state, bindSend }) =>
    <div>
      <div className='Card'>
        <div className='Card-title'>
          {state && 
            <EditNewStudent id={id} students={state} onAdd={bindSend('refresh')}/>
          }
          {(state && !!state.length)
            ? state.map((student, i) =>
                <div key={student} className="List-item layout horizontal">
                  <span className='flex'>{student}</span>
                  <a onclick={() => {
                    StudentsModel.update(id, state.filter(s => s !== student))
                      .then(bindSend('refresh'));
                  }}>
                    remove
                  </a>
                </div>
              )
            : [<h1 key="EMPTY" className='c-gray-dark t-center'>No students</h1>]
          }
        </div>
      </div>
    </div>
);
