import xvdom  from 'xvdom/src/index';
import Icon   from './Icon.jsx';

const identity = o => o;

function renderItem(el){
  const { item, context, itemClass } = this;
  const { href, key, icon, text } = item(el, context);
  return (
    <a className={`List-item layout horizontal center t-normal ${itemClass || ''}`} href={href} key={key}>
      {icon &&
        <Icon name={icon} />
      }
      <div className='l-margin-l3'>{text}</div>
    </a>
  );
}

export default props => {
  const { className, context, list, transform = identity } = props;
  const items = transform ? transform(list, context) : (list || []);
  return (
    <div className={className} hidden={!items.length}>
      {items.map(renderItem, props)}
    </div>
  )
}
