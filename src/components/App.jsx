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
import SchoolModel from '../models/School';
import SchoolPage from './SchoolPage.jsx';
import AppToolbar from './AppToolbar.jsx';
import AppDrawer from './AppDrawer.jsx';

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

const NewSchool = ({ props: { onCancel },  state: { name, canAdd }, bindSend }) => (
  <div>
    <div className="AssignSeat layout horizontal center-center">
      <div className="NewSchool-dialog Card l-padding-4">
        <input
          className='SchoolPage-input'
          oninput={bindSend('updateName')}
          placeholder="School's Name"
          value={name}
        />
        <div className='l-margin-t4 l-padding-t4 t-right'>
          {canAdd &&
            <a
              className='l-margin-h4'
              onclick={() => {
                SchoolModel.create(name).then(schoolId => {
                  window.location.hash = `#schools/${schoolId}/school`;
                })
              }}
            >
              Add
            </a>
          }
          <a className='l-margin-h4' onclick={onCancel} >Cancel</a>
        </div>
      </div>
    </div>
  </div>
)

NewSchool.state = {
  onInit: () => ({ name: '' }),
  updateName: (component, e) => {
    const name = e.target.value;
    return { name, canAdd: !!name };
  }
}

const App = ({ state: { drawerEnabled, user, page, id, tab, checkedLogin, showAddSchool }, bindSend }) => (
  <body className='App'>
    {!user && checkedLogin &&
      <div style='position: absolute; top: 0px; bottom: 0px; left: 0px; right: 0px;' className='layout horizontal center-center'>
        <a onclick={toggleSignIn} className='l-padding-4' style='background: #CCC; border-radius: 6px;'>
          {user ? 'Sign out' : 'Sign in'}
        </a>
      </div>
    }
    {user && page && id && (
      <SchoolPage user={user} page={page} id={id} tab={tab} />
    )}
    <div
      className={`App-backdrop fixed ${(drawerEnabled || showAddSchool) ? 'is-enabled' : ''}`}
      onclick={bindSend('disableDrawer')}
    />
    <AppDrawer user={user} enabled={drawerEnabled} onNewSchool={bindSend('onNewSchool')} />
    {user && showAddSchool &&
      <NewSchool onCancel={bindSend('closeNewSchool')} />
    }
  </body>
);

const stateFromHash = ({ state }) => {
  const hash = window.location.hash.slice(1);
  if(!hash) {
    User.get(User.getCurrentId()).then(user => {
      const firstKey = Object.keys(user.schools)[0];
      const hash = window.location.hash;
      
      window.location.hash = `#schools/${firstKey}/school`;
    })
    return state || {};
  }
  else {
    const [page, id, tab] = hash.split('/');
    return {
      ...state,
      showAddSchool: false,
      drawerEnabled: false,
      page, id, tab
    };
  }
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
    App.showDrawer = bindSend('enableDrawer');

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
  enableDrawer: ({ state }) => ({ ...state, drawerEnabled: true }),
  disableDrawer: ({ state }) => ({ ...state, drawerEnabled: false }),
  onNewSchool: ({ state }) => ({ ...state, showAddSchool: true, drawerEnabled: false }),
  closeNewSchool: ({ state }) => ({ ...state, showAddSchool: false }),
  onUser: ({ state }, user) => {
    return { ...state, user, checkedLogin: true };
  },
  handleHashChange: stateFromHash
}

document.body = xvdom.render(<App />);

export default App;
