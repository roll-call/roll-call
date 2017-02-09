import './AppDrawer.css';
import './common/List.css';
import xvdom         from 'xvdom/src/index';
import List          from './common/List.jsx';
import dataComponent from '../helpers/dataComponent.js';
import SchoolModel   from '../models/School.js';

const item = ([ id, {name} ])=> ({
  href: `#schools/${id}/school`,
  key:  name,
  text: <div>{name}</div>,
  icon: 'bookmark'
});

const strcmp = (a, b)=> {
  const at = a.toLowerCase();
  const bt = b.toLowerCase();
  return (
      at < bt ? -1
    : at > bt ?  1
    : 0
  );
}

const transform = schoolsObj => (
  Object.keys(schoolsObj)
    .sort((a, b) => strcmp(schoolsObj[a].name, schoolsObj[b].name))
    .map(id => [id, schoolsObj[id]])
)
const Schools = dataComponent(SchoolModel, 'query',
  ({ state }) => (
    <List
      item={item}
      itemClass='List-item--noDivider'
      list={state ? state : []}
      transform={transform}
    />
  )
)

// Lazily render drawer contents the first time the drawer is enabled.
// Prevent un-rendering contents when disabled.
let lazyRenderContents = false;
export default ({user, enabled, onNewSchool}) => {
  lazyRenderContents  = enabled || lazyRenderContents;
  const enabledClass  = enabled            ? 'is-enabled'  : '';
  const renderedClass = lazyRenderContents ? 'is-rendered' : '';
  return (
    <div className={`AppDrawer fixed scroll ${enabledClass} ${renderedClass}`}>
      {enabled && user && (
        <div>
          <a className='List-item layout horizontal center' onclick={onNewSchool}>
            <span className='t-center' textContent='Add a School' />
          </a>
          <Schools />
        </div>
      )}
    </div>
  )
};
