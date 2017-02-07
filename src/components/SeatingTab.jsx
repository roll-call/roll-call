import './SeatingTab.css';

import xvdom from 'xvdom';
import dataComponent from '../helpers/dataComponent.js';
import SeatingModel from '../models/Seating.js';
import StudentsModel from '../models/Students.js';

const AssignSeat = dataComponent(
  StudentsModel,
  'query',
  ({ props: { seatIndex, onAssign, onClose }, state }) =>
    <div className="AssignSeat">
      <div className="AssignSeat-backdrop" onclick={onClose} />
      {state &&
        <div className="AssignSeat-card Card">
          {state.sort().map(student =>
            <a key={student} className="List-item" onclick={() => { onAssign({ seatIndex, student }) }} >
              {student}
            </a>
          )}
        </div>
      }
    </div>
);


const SeatingRow = ({ props: { id, row, onAdd, onRemove, onAssign }, state: {seatIndex}, bindSend }) => (
  <div>
    {seatIndex != null && <AssignSeat id={id} seatIndex={seatIndex} onAssign={onAssign} onClose={bindSend('onClose')} />}
    <div className='SeatingRow layout horizontal'>
      <div className='SeatingRow-controls layout vertical around-justified'>
        <a className='SeatingRow-controls-control' onclick={onAdd}>+</a>
        <a className='SeatingRow-controls-control' onclick={onRemove}>-</a>
      </div>
      {row.map((seat, seatIndex) => (
        <a
          key={seatIndex}
          className={`SeatingRow-seat ${seat === 'EMPTY' ? 'SeatingRow-seat--empty' : ''}`}
          seatindex={seatIndex}
          onclick={bindSend('openAssignSeat')}
        >
          {seat}
        </a>
      ))}
    </div>
  </div>
);

SeatingRow.state = {
  onInit: () => ({}),
  onProps: () => ({}),
  onClose: () => ({}),
  openAssignSeat: ({ state }, event) => {
    const target = event.currentTarget;
    if(target && target.seatindex != null){
      return {seatIndex: target.seatindex};
    }
    return state;
  }
}

export default dataComponent(
  SeatingModel,
  'query',
  ({ props: { id }, state, bindSend }) =>
    <div className='l-padding-t4'>
      {!state ? [] : state.map((row, rowNum) => (
        <SeatingRow
          key={row.join('--')}
          id={id}
          row={row}
          rowNum={rowNum}
          onAssign={({seatIndex, student}) => {
            const curRow = state.find(row => row.indexOf(student) !== -1);
            const curSeatIndex = curRow && curRow.indexOf(student);

            if(curRow === rowNum && curSeatIndex === seatIndex) return;

            const swapStudent = row[seatIndex];
            if(curRow) curRow[curSeatIndex] = swapStudent;
            row[seatIndex] = student;

            SeatingModel.update(id, state).then(bindSend('refresh'));
          }}
          onAdd={() => {
            state[rowNum] = row.concat('EMPTY');
            SeatingModel.update(id, state).then(bindSend('refresh'));
          }}
          onRemove={() => {
            const curRow = state[rowNum] = row.slice(0, -1);
            if(curRow.length === 0) {
              state.splice(rowNum, 1);
            }
            SeatingModel.update(id, state).then(bindSend('refresh'));
          }}
        />
      ))}
      <div className="layout horizontal l-padding-t2" style="padding-left: 22px">
        <a
          className='SeatingTab-addRow'
          onclick={() => {
            state.push(['EMPTY']);
            SeatingModel.update(id, state).then(bindSend('refresh'));
          }}
        >
          Add row
        </a>
      </div>
    </div>
);
