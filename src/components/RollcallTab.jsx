import './RollcallTab.css';

import xvdom from 'xvdom';
import dataComponent from '../helpers/dataComponent.js';
import SeatingModel from '../models/Seating.js';
import RollcallModel, { STATUSES } from '../models/Rollcall.js';

const EMPTY = 'EMPTY';

const getRecord = (student, rollcall) =>
  rollcall.find(([recordStudent]) => recordStudent === student);

const getStudentStatus = (student, rollcall) => {
  const record = getRecord(student, rollcall);
  return record ? record[1] : '';
};

const getStudentStatusClass = (student, rollcall) => {
  const status = getStudentStatus(student, rollcall);
  return (
      status === 'Here' ? 'is-here'
    : status === 'Absent' ? 'is-absent'
    : status === 'No Instrument' ? 'is-no-instrument'
    : ''
  )
}

const SeatingRow = ({ row, rollcall, onToggleStatus }) => (
  <div className='l-padding-l4'>
    <div className='SeatingRow layout horizontal'>
      {row.map((seat, seatIndex) => (
        <a
          className={`
            SeatingRow-seat layout vertical center-center
            ${seat === EMPTY ? 'SeatingRow-seat--empty' : ''}
            ${getStudentStatusClass(seat, rollcall)}
          `}
          key={seatIndex}
          onclick={seat === EMPTY ? null : () => onToggleStatus(seat)}
        >
          <div>{seat === EMPTY ? '' : seat}</div>
          <div className='flex layout vertical center-center'>
            {getStudentStatus(seat, rollcall)}
          </div>
        </a>
      ))}
    </div>
  </div>
);

const RollcallWithSeating = dataComponent(SeatingModel, 'query',
  ({ props: { id, rollcall, onToggleStatus }, state }) =>
    <div>
      {!state ? [] : state.map((row, rowNum) => (
        <SeatingRow
          id={id}
          key={row.join('--')}
          onToggleStatus={onToggleStatus}
          rollcall={rollcall}
          row={row}
          rowNum={rowNum}
        />
      ))}
    </div>
);

const Rollcall = dataComponent(RollcallModel, 'query',
  ({ props: { id }, state, bindSend }) =>
    <div>
      {state &&
        <RollcallWithSeating
          id={id}
          onToggleStatus={bindSend('onToggleStatus')}
          rollcall={state}
        />
      }
    </div>
);

const nextStatus = status => STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length];

Rollcall.state.onToggleStatus = ({ props: { id, date }, state }, student) => {
  if(!student) return;

  let record = getRecord(student, state);
  if(!record){
    record = [student, STATUSES[0]];
    state.push(record);
  }
  else {
    record[1] = nextStatus(record[1]);
  }
  RollcallModel.update(id, date, state);
  return [...state];
};

const RollcallTab = ({ props: { id }, state:date, bindSend }) => (
  <div>
    <div className='layout horizontal center-center l-padding-t4'>
      <div className='Rollcall-date layout horizontal center-center'>
        <a className='Rollcall-dateInc' onclick={bindSend('decDate')}>
          &lt;
        </a>
        <div className='flex t-center'>
          {date.getMonth()+1} - {date.getDate()} - {date.getFullYear()}
        </div>
        <a className='Rollcall-dateInc' onclick={bindSend('incDate')}>
          &gt;
        </a>
      </div>
    </div>
    <Rollcall date={date} id={id} />
  </div>
)

const onInit = () => new Date();
const addDate = (date, numDays) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + numDays);

RollcallTab.state = {
  onInit,
  onProps: onInit,
  decDate: ({ state }) =>  addDate(state, -1),
  incDate: ({ state }) =>  addDate(state,  1)
};

export default RollcallTab;