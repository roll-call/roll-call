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

const App = ({ state: { user, page, id, tab, checkedLogin } }) => (
  <body className='App'>
    {!user && checkedLogin &&
      <div style='position: absolute; top: 0px; bottom: 0px; left: 0px; right: 0px;' className='layout horizontal center-center'>
        <a onclick={toggleSignIn} className='l-padding-4' style='background: #CCC; border-radius: 6px;'>
          {user ? 'Sign out' : 'Sign in'}
        </a>
      </div>
    }
    {user && page && id &&
      <SchoolPage user={user} page={page} id={id} tab={tab} />
    }
  </body>
);

const stateFromHash = ({ state }) => {
  const hash = window.location.hash.slice(1);
  const [page, id, tab] = hash.split('/');
  return {...state, page, id, tab};
};

firebase.initializeApp({
  apiKey: "AIzaSyByU0ftUO7ECBLGGCb4awfe-u0ITxt0NVw",
  authDomain: "roll-call-1440c.firebaseapp.com",
  databaseURL: "https://roll-call-1440c.firebaseio.com",
  storageBucket: "roll-call-1440c.appspot.com",
  messagingSenderId: "115688293946"
});

App.state = {
  onInit: ({ bindSend }) => {
    firebase.auth().onAuthStateChanged(authUser => {
      if(!authUser) return bindSend('onUser')(authUser);

      // Get or create user information
      User.get(authUser.uid)
        .catch(() =>
          User.save({
            // Couldn't find existing user w/authId, so create a new User
            id: authUser.uid,
            displayName: authUser.displayName,
            schools: { 
              _init: {
                name: 'School #1'
              }
            }
          })
        )
        .then(user => {
          User.setCurrent(user.id);
          const firstKey = Object.keys(user.schools)[0];
          const hash = window.location.hash;
          if(!hash || hash === '#') window.location.hash = `#schools/${firstKey}/school`;
          bindSend('onUser')(user);
        })
    });
    
    window.onhashchange = bindSend('handleHashChange');
    return stateFromHash({ user: User.current() });
  },
  onUser: ({ state }, user) => {
    return { ...state, user, checkedLogin: true };
  },
  handleHashChange: stateFromHash
}

document.body = xvdom.render(<App />);
