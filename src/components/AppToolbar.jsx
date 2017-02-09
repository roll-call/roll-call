import './AppToolbar.css';
import xvdom from 'xvdom/src/index';
import App   from './App.jsx';
import Icon  from './common/Icon.jsx';

const showDrawer = () => { App.showDrawer() };

const AppToolbar = ({props: {title, secondary, left, right}, state:{scrollClass}}) =>
  <div className={`AppToolbar ${secondary ? 'AppToolbar--withSecondary' : ''}`}>
    <div className={`AppToolbar-bar fixed fixed--top c-white bg-purple ${scrollClass}`}>
      <div className='layout horizontal center-center l-height14'>
        <Icon
          className='c-white l-padding-h4'
          name='three-bars'
          onClick={showDrawer}
          size='small'
        />
        <div className='l-padding-r0 t-truncate t-font-size-20 flex' textContent={title} />
        {right}
      </div>
      {secondary}
    </div>
  </div>;

const getScrollState = prevScrollTop => {
  const scrollTop       = document.body ? document.body.scrollTop : 0;
  const isScrollingDown = scrollTop > 56 && scrollTop - prevScrollTop > 0;
  return {
    scrollTop,
    scrollClass: isScrollingDown ? ' is-scrolling-down': ''
  };
}

AppToolbar.state = {
  onInit: ({bindSend}) => (
    requestAnimationFrame(() => document.body.onscroll = bindSend('onScroll')),
    getScrollState(0)
  ),

  onScroll: ({state:{scrollTop}}) => getScrollState(scrollTop)
};

export default AppToolbar;
