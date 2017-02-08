import './RollcallTab.css';

import xvdom from 'xvdom';
import dataComponent from '../helpers/dataComponent.js';
import { STATUSES } from '../models/Rollcall';
import ReportModel from '../models/Report.js';

const DATE_RE = /(\d\d?)-(\d\d?)-(\d\d\d\d)/;

const Input = ({ state, bindSend }) =>
  <input className='SchoolPage-input t-center' oninput={bindSend('onInput')}  value={state} />

const isDateString = str => DATE_RE.test(str);

const InputonInit = ({props: { value }}) => value
Input.state = {
  onInit: InputonInit,
  onProps: InputonInit,
  onInput: ({props: { id, onChange }, state}, e) => {
    const { value } = e.target;
    if(state !== value && isDateString(value)){
      setTimeout(() => { onChange(value) }, 0);
    }
    return value;
  }
};

const Report = dataComponent(ReportModel, 'query',
  ({ props: { startDate, endDate }, state:report}) => (
    <div className='Card'>
      <div className='Card-title'>
        <div className='List-item layout horizontal justified c-gray-dark'>
          <div className='flex'>Name</div>
          {STATUSES.map(status =>
            <div key={status} className='flex t-center'>{status}</div>
          )}
        </div>
        {!report ? [] : report.map(([student, totals])=>
          <div key={student} className='List-item layout horizontal justified'>
            <div className='flex'>{student}</div>
            {STATUSES.map(status =>
              <div key={status} className='flex t-center'>{totals[status] || 0}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
);
const dateToString = date =>
  `${date.getMonth()+1}-${date.getDate()}-${date.getFullYear()}`;

const ReportsTab = ({ props: { id }, state: { startDate, endDate }, bindSend }) => (
  <div>
    <div className='Card'>
      <div className='Card-title layout horizontal center-center'>
        <Input value={dateToString(startDate)} onChange={bindSend('onStartDateChange')} />
        <div className='l-margin-h4'>to</div>
        <Input value={dateToString(endDate)} onChange={bindSend('onEndDateChange')} />
      </div>
    </div>
    <Report id={id} startDate={startDate} endDate={endDate} />
  </div>
);

const onInit = () => {
  const now = new Date();
  return {
    endDate:   new Date(now.getFullYear(), now.getMonth(), now.getDate()),
    startDate: new Date(now.getFullYear(), now.getMonth() - 3, now.getDate()),
  };
}

ReportsTab.state = {
  onInit,
  onProps: onInit,
  onStartDateChange: ({ state }, startDateString) => {
    const [ month, date, year ] = DATE_RE.exec(startDateString).slice(1);
    const startDate = new Date(+year, (+month)-1, +date);
    return { ...state, startDate };
  },
  onEndDateChange: ({ state }, endDateString) => {
    const [ month, date, year ] = DATE_RE.exec(endDateString).slice(1);
    const endDate = new Date(+year, (+month)-1, +date);
    return { ...state, endDate };
  }
};

export default ReportsTab;