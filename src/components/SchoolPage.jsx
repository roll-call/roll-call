import './SchoolPage.css';

import xvdom         from 'xvdom';
import dataComponent from '../helpers/dataComponent.js';
import SchoolModel   from '../models/School.js';
import Icon          from './common/Icon.jsx';
import Tabs          from './common/Tabs.jsx';
import AppToolbar    from './AppToolbar.jsx';
import StudentsTab   from './StudentsTab.jsx';
import SeatingTab    from './SeatingTab.jsx';
import RollcallTab   from './RollcallTab.jsx';
import ReportsTab    from './ReportsTab.jsx';

const TABS = {
  school:   { title: 'School' },
  students: { title: 'Students' },
  seating:  { title: 'Seating' },
  rollcall: { title: 'Attendance' },
  reports:  { title: 'Reports' }
};

const SchoolCreate =  () => {
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
  <input className='SchoolPage-input' oninput={bindSend('updateName')}  value={state} />
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

const SchoolTab = dataComponent(SchoolModel, 'get',
  ({ props: { id }, state }) => (
    <div className='Card'>
      <div className='Card-title'>
        <EditSchoolName id={id} school={state} />
      </div>
    </div>
  )
);

const renderTab = (id, tab) => {
  switch(tab) {
  case 'school':   return <SchoolTab   id={id} />;
  case 'students': return <StudentsTab id={id} />;
  case 'seating':  return <SeatingTab  id={id} />;
  case 'rollcall': return <RollcallTab id={id} />;
  case 'reports':  return <ReportsTab  id={id} />;
  }
};

const School =  dataComponent(SchoolModel, 'get',
  ({ props: { id, tab }, state: school }) => (
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
        title={school ? school.name : ''}
      />
      {renderTab(id, tab)}
    </div>
  )
);

export default ({ user, page, id, tab }) => (
  id === 'new'
    ? <SchoolCreate />
    : <School id={id} page={page} tab={tab} user={user} />
)