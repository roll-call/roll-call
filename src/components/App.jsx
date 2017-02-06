import '../../vendor/octicons/octicons.css';
import '../css/colors.css';
import '../css/flex.css';
import '../css/icons.css';
import '../css/layout.css';
import '../css/link.css';
import '../css/reset.css';
import '../css/text.css';
import './common/Card.css';

import './App.css';

import xvdom      from 'xvdom';
import Icon       from './common/Icon.jsx';
import Tabs       from './common/Tabs.jsx';
import User       from '../models/User';
import SchoolPage from './SchoolPage.jsx';
import AppToolbar from './AppToolbar.jsx';

import '../helpers/globalLogger';

function toggleSignIn() {
  if (firebase.auth().currentUser) {
    User.unsetCurrent();
    return firebase.auth().signOut();
  }

  const provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/plus.login');
  firebase.auth()
    .signInWithPopup(provider)
    .catch(error => console.error(error));
}

const App = ({ props: { user }, state: { page, id, tab } }) => (
  <body>
    {!user &&
      <button onclick={toggleSignIn}>{user ? 'Sign out' : 'Sign in'}</button>
    }
    {!!page && !!id &&
      <SchoolPage user={user} page={page} id={id} tab={tab} />
    }
  </body>
);

const stateFromHash = ({ state }) => {
  const hash = window.location.hash.slice(1);
  const [page, id, tab] = hash.split('/');
  return {page, id, tab};
};

App.state = {
  onInit: ({ bindSend }) => {
    window.onhashchange = bindSend('handleHashChange');
    return stateFromHash({});
  },
  onProps: stateFromHash,
  handleHashChange: stateFromHash
}

const renderApp = user => <App user={user} />;

firebase.initializeApp({
  apiKey: "AIzaSyByU0ftUO7ECBLGGCb4awfe-u0ITxt0NVw",
  authDomain: "roll-call-1440c.firebaseapp.com",
  databaseURL: "https://roll-call-1440c.firebaseio.com",
  storageBucket: "roll-call-1440c.appspot.com",
  messagingSenderId: "115688293946"
});

document.body = xvdom.render(renderApp(User.current()));

firebase.auth().onAuthStateChanged(authUser => {
  if(!authUser) return xvdom.rerender(document.body, renderApp(null, null));

  // Get or create user information
  User.get(authUser.uid)
    .catch(() =>
      User.save({
        // Couldn't find existing user w/authId, so create a new User
        id: authUser.uid,
        displayName: authUser.displayName,
        schools: { 
          _init: {
            name: 'School #1',
            terms: [
              '08-01-2016,11-31-2016',
              '11-31-2016,01-31-2017',
              '02-01-2017,05-31-2017'
            ]
          }
        },
      })
    )
    .then(user => {
      User.setCurrent(user.id);
      const firstKey = Object.keys(user.schools)[0];
      const hash = window.location.hash;
      if(!hash || hash === '#') window.location.hash = `#schools/${firstKey}/school`
    })
});