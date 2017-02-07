import './SchoolPage.css';

import xvdom      from 'xvdom';
import dataComponent from '../helpers/dataComponent.js';
import SchoolModel from '../models/School.js';
import Icon       from './common/Icon.jsx';
import Tabs       from './common/Tabs.jsx';
import AppToolbar from './AppToolbar.jsx';
import StudentsTab from './StudentsTab.jsx';
import SeatingTab from './SeatingTab.jsx';
import RollcallTab from './RollcallTab.jsx';

const TABS = {
  school:   { title: 'School' },
  students: { title: 'Students' },
  seating:  { title: 'Seating' },
  rollcall: { title: 'Roll Call' }
};

const SchoolCreate =  ({props: { user, page, id, tab }}) => {
  return (
    <div>
      <AppToolbar
        left={
          <Icon
            className='c-white l-padding-h4'
            name='three-bars'
            size='small'
          />
        }
      />
    </div>
  );
};

const EditSchoolName = ({props: { id }, state, bindSend}) => (
  <input className='SchoolPage-input' value={state} oninput={bindSend('updateName')} />
)

const onInit = ({props}) => props.school && props.school.name
EditSchoolName.state = {
  onInit,
  onProps: onInit,
  updateName: ({props: {id}, state}, e) => {
    const newName = e.target.value;
    SchoolModel.updateName(id, newName);
    return newName;
  }
};

const SchoolTab = dataComponent(SchoolModel, 
  'get',
  ({ props: { id }, state }) => (
    <div className='Card'>
      <div className='Card-title'>
        <EditSchoolName id={id} school={state} />
      </div>
    </div>
  )
);

const renderTab = (id, tab) => (
  tab === 'school'   ? <SchoolTab id={id} />
: tab === 'students' ? <StudentsTab id={id} />
: tab === 'seating'  ? <SeatingTab id={id} />
: tab === 'rollcall' ? <RollcallTab id={id} />
: null
);

const School =  dataComponent(
  SchoolModel,
  'get',
  ({ props: { user, page, id, tab }, state }) => {
    const school = state || {};
    return (
      <div>
        <AppToolbar
          left={
            <Icon
              className='c-white l-padding-h4'
              name='three-bars'
              size='small'
            />
          }
          secondary={
            <Tabs hrefPrefix={`#schools/${id}/`} selected={tab} tabs={TABS} />
          }
          title={school.name}
        />
        {renderTab(id, tab)}
      </div>
    )
  }
);

export default ({ user, page, id, tab }) => (
  id === 'new'
    ? <SchoolCreate />
    : <School user={user} page={page} id={id} tab={tab} />
)