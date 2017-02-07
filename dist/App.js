(function () {
'use strict';

/*

Instance properties:

$n = DOM node
$s - spec (see below)
$x - Pool linked list next pointer

Spec properties:

c - create (or render)
u - update (or update)
r - keyed map of unmounted instanced that can be recycled

*/

var isDynamicEmpty = function isDynamicEmpty(v) {
  return v == null || v === true || v === false;
};
var EMPTY_PROPS = {};
var DEADPOOL = {
  push: function push() {},
  pop: function pop() {}
};

// Creates an empty object with no built in properties (ie. `constructor`).
function Hash() {}
Hash.prototype = Object.create(null);

// TODO: Benchmark whether this is slower than Function/Prototype
function Pool() {
  this.map = new Hash();
}

Pool.prototype.push = function (instance) {
  var key = instance.key;
  var map = this.map;

  instance.$x = map[key];
  map[key] = instance;
};

Pool.prototype.pop = function (key) {
  var head = this.map[key];
  if (!head) return;
  this.map[key] = head.$x;
  return head;
};

var recycle = function recycle(instance) {
  instance.$s.r.push(instance);
};
var createTextNode = function createTextNode(value) {
  return document.createTextNode(value);
};

var replaceNode = function replaceNode(oldNode, newNode) {
  var parentNode = oldNode.parentNode;
  if (parentNode) parentNode.replaceChild(newNode, oldNode);
};

function unmountInstance(inst, parentNode) {
  recycle(inst);
  parentNode.removeChild(inst.$n);
}

function removeArrayNodes(array, parentNode, i) {
  while (i < array.length) {
    unmountInstance(array[i++], parentNode);
  }
}

function removeArrayNodesOnlyChild(array, parentNode) {
  var i = 0;

  while (i < array.length) {
    recycle(array[i++]);
  }
  parentNode.textContent = '';
}

function internalRerenderInstance(prevInst, inst) {
  return prevInst.$s === inst.$s && (inst.$s.u(inst, prevInst), true);
}

function renderArrayToParentBefore(parentNode, array, i, markerNode) {
  if (markerNode === null) renderArrayToParent(parentNode, array, i);else renderArrayToParentBeforeNode(parentNode, array, i, markerNode);
}

function renderArrayToParentBeforeNode(parentNode, array, i, beforeNode) {
  while (i < array.length) {
    parentNode.insertBefore((array[i] = internalRender(array[i])).$n, beforeNode);
    ++i;
  }
}

function renderArrayToParent(parentNode, array, i) {
  while (i < array.length) {
    parentNode.appendChild((array[i] = internalRender(array[i])).$n);
    ++i;
  }
}

function rerenderDynamic(isOnlyChild, value, contextNode) {
  var frag = document.createDocumentFragment();
  var node = createDynamic(isOnlyChild, frag, value);
  replaceNode(contextNode, frag);
  return node;
}

function rerenderArrayReconcileWithMinLayout(parentNode, array, oldArray, markerNode) {
  var i = 0;
  for (; i < array.length && i < oldArray.length; i++) {
    array[i] = internalRerender(oldArray[i], array[i]);
  }

  if (i < array.length) {
    renderArrayToParentBefore(parentNode, array, i, markerNode);
  } else {
    removeArrayNodes(oldArray, parentNode, i);
  }
}

function rerenderArrayOnlyChild(parentNode, array, oldArray) {
  if (!oldArray.length) {
    renderArrayToParent(parentNode, array, 0);
  } else if (!array.length) {
    removeArrayNodesOnlyChild(oldArray, parentNode);
  } else {
    rerenderArrayReconcileWithMinLayout(parentNode, array, oldArray, null);
  }
}

function rerenderArray(array, parentOrMarkerNode, isOnlyChild, oldArray) {
  if (array instanceof Array) {
    return isOnlyChild ? rerenderArrayOnlyChild(parentOrMarkerNode, array, oldArray) : rerenderArrayReconcileWithMinLayout(parentOrMarkerNode.parentNode, array, oldArray, parentOrMarkerNode), parentOrMarkerNode;
  }

  if (isOnlyChild) {
    removeArrayNodesOnlyChild(oldArray, parentOrMarkerNode);
    return createDynamic(true, parentOrMarkerNode, array);
  }

  removeArrayNodes(oldArray, parentOrMarkerNode.parentNode, 0);
}

function rerenderText(value, contextNode, isOnlyChild) {
  if (!(value instanceof Object)) {

    contextNode.nodeValue = isDynamicEmpty(value) ? '' : value;
    return contextNode;
  }
}

function rerenderInstance(value, node, isOnlyChild, prevValue) {
  var prevRenderedInstance = void 0;
  if (value && internalRerenderInstance(prevRenderedInstance = prevValue.$r || prevValue, value)) {
    // TODO: What is $r? Is this trying to track the original rendered instnace?
    value.$r = prevRenderedInstance;
    return node;
  }
}

function StatefulComponent(render, props, instance, actions) {
  this._boundActions = new Hash();
  this._parentInst = instance;
  this.actions = actions;
  this.props = props;
  this.render = render;
  this.bindSend = this.bindSend.bind(this);
  this.state = actions.onInit(this);
  this.$n = internalRenderNoRecycle(this._instance = render(this));
}

StatefulComponent.prototype.updateProps = function (newProps) {
  var props = this.props;

  this.props = newProps;

  if (this.actions.onProps) this.send('onProps', props);else this.rerender();

  return this;
};

StatefulComponent.prototype.bindSend = function (action) {
  return this._boundActions[action] || (this._boundActions[action] = this.send.bind(this, action));
};

StatefulComponent.prototype.send = function (actionName, context) {
  var newState = void 0;
  var actionFn = this.actions[actionName];
  // TODO: process.ENV === 'development', console.error(`Action not found #{action}`);
  if (!actionFn || (newState = actionFn(this, context)) == this.state) return;

  this.state = newState;
  this.rerender();
};

StatefulComponent.prototype.rerender = function () {
  var instance = internalRerender(this._instance, this.render(this));
  this._instance = instance;
  instance.$n.xvdom = this._parentInst;
};

function createStatefulComponent(component, props, instance, actions) {
  return new StatefulComponent(component, props, instance, actions);
}

function createStatelessComponent(component, props) {
  var instance = component(props);
  internalRenderNoRecycle(instance);
  return instance;
}

function createComponent(component, actions, props, parentInstance) {
  var result = (actions ? createStatefulComponent : createStatelessComponent)(component, props || EMPTY_PROPS, parentInstance, actions);

  return result;
}

function updateComponent(component, actions, props, componentInstance) {
  var result = actions ? componentInstance.updateProps(props) : internalRerender(componentInstance, component(props));

  return result;
}

function internalRenderNoRecycle(instance) {
  var node = instance.$s.c(instance);
  instance.$n = node;
  node.xvdom = instance;
  return node;
}

function internalRender(instance) {
  var spec = instance.$s;
  var recycledInstance = spec.r.pop(instance.key);
  if (recycledInstance) {
    spec.u(instance, recycledInstance);
    return recycledInstance;
  }

  internalRenderNoRecycle(instance);
  return instance;
}

function createDynamic(isOnlyChild, parentNode, value) {
  return value instanceof Array ? (renderArrayToParent(parentNode, value, 0), isOnlyChild ? parentNode : parentNode.appendChild(createTextNode(''))) : parentNode.appendChild(value instanceof Object ? internalRenderNoRecycle(value) : createTextNode(isDynamicEmpty(value) ? '' : value));
}

function updateDynamic(isOnlyChild, oldValue, value, contextNode) {
  return (oldValue instanceof Object ? oldValue instanceof Array ? rerenderArray(value, contextNode, isOnlyChild, oldValue) : rerenderInstance(value, contextNode, isOnlyChild, oldValue) : rerenderText(value, contextNode, isOnlyChild)) || rerenderDynamic(isOnlyChild, value, contextNode);
}

function internalRerender(prevInstance, instance) {
  if (internalRerenderInstance(prevInstance, instance)) return prevInstance;

  replaceNode(prevInstance.$n, (instance = internalRender(instance)).$n);
  recycle(prevInstance);
  return instance;
}

var render = function render(instance) {
  return internalRender(instance).$n;
};
var rerender = function rerender(node, instance) {
  return internalRerender(node.xvdom, instance).$n;
};
var unmount = function unmount(node) {
  unmountInstance(node.xvdom, node.parentNode);
};

var xvdom = {
  createComponent: createComponent,
  createDynamic: createDynamic,
  el: function el(tag) {
    return document.createElement(tag);
  },
  render: render,
  rerender: rerender,
  unmount: unmount,
  updateComponent: updateComponent,
  updateDynamic: updateDynamic,
  Pool: Pool,
  DEADPOOL: DEADPOOL
};

// Internal API

var _xvdomEl$1 = xvdom.el;
var _xvdomSpec$1 = {
  c: function c(inst) {
    var _n = _xvdomEl$1('i');

    inst.b = _n;
    _n.className = inst.a;
    _n.onClickArg = inst.c;
    _n.onClickFn = inst.d;
    _n.onclick = inst.e;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.className = v;
      pInst.a = v;
    }

    v = inst.c;

    if (v !== pInst.c) {
      pInst.b.onClickArg = v;
      pInst.c = v;
    }

    v = inst.d;

    if (v !== pInst.d) {
      pInst.b.onClickFn = v;
      pInst.d = v;
    }

    v = inst.e;

    if (v !== pInst.e) {
      pInst.b.onclick = v;
      pInst.e = v;
    }
  },
  r: xvdom.DEADPOOL
};
var handleClick = function handleClick(_ref) {
  var t = _ref.currentTarget;
  t.onClickFn(t.onClickArg);
};

var Icon = (function (_ref2) {
  var className = _ref2.className,
      name = _ref2.name,
      onClick = _ref2.onClick,
      onClickArg = _ref2.onClickArg,
      _ref2$size = _ref2.size,
      size = _ref2$size === undefined ? 'med' : _ref2$size;
  return {
    $s: _xvdomSpec$1,
    a: 'Icon Icon--' + size + ' octicon octicon-' + name + ' ' + className + ' t-center',
    c: onClickArg,
    d: onClick,
    e: onClick && handleClick
  };
});

var _xvdomCreateDynamic$1 = xvdom.createDynamic;
var _xvdomEl$2 = xvdom.el;
var _xvdomUpdateDynamic$1 = xvdom.updateDynamic;
var _xvdomSpec2$1 = {
  c: function c(inst) {
    var _n = _xvdomEl$2('div');

    _n.className = 'Tabs layout horizontal end center-justified c-white l-height10 t-font-size-14 t-uppercase t-normal';
    inst.b = _xvdomCreateDynamic$1(true, _n, inst.a);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic$1(true, pInst.a, pInst.a = inst.a, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec$2 = {
  c: function c(inst) {
    var _n = _xvdomEl$2('a');

    inst.b = _n;
    _n.className = inst.a;
    if (inst.c != null) _n.href = inst.c;
    inst.e = _xvdomCreateDynamic$1(true, _n, inst.d);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.className = v;
      pInst.a = v;
    }

    v = inst.c;

    if (v !== pInst.c) {
      if (pInst.b.href !== v) {
        pInst.b.href = v;
      }

      pInst.c = v;
    }

    if (inst.d !== pInst.d) {
      pInst.e = _xvdomUpdateDynamic$1(true, pInst.d, pInst.d = inst.d, pInst.e);
    }
  },
  r: xvdom.DEADPOOL
};
function renderTab(tabId) {
  var tabs = this.tabs,
      selected = this.selected,
      hrefPrefix = this.hrefPrefix;
  var _tabs$tabId = tabs[tabId],
      href = _tabs$tabId.href,
      title = _tabs$tabId.title;

  return {
    $s: _xvdomSpec$2,
    a: 'Tabs-tab u-cursor-pointer l-padding-h4 l-padding-b2 ' + (selected === tabId ? 'is-selected' : ''),
    c: '' + hrefPrefix + (href || tabId),
    d: title || tabId,
    key: tabId
  };
}

var Tabs = (function (props) {
  return {
    $s: _xvdomSpec2$1,
    a: Object.keys(props.tabs).map(renderTab, props)
  };
});

/*

Cross-session, Key-Value, LRU expunging storage.

*/

var REGISTRY_KEY = 'ticker:storage';

// Map of storage key to last used timestamp.
var registry = void 0;
try {
  registry = JSON.parse(localStorage.getItem(REGISTRY_KEY));
} catch (e) {} // eslint-disable-line no-empty

if (!registry) localStorage.setItem(REGISTRY_KEY, JSON.stringify(registry = []));

var removeLRUItem = function removeLRUItem() {
  var lruKey = registry.pop();
  if (lruKey) {
    localStorage.removeItem(lruKey);
    updateRegistryKey(lruKey, false); // eslint-disable-line no-use-before-define
  }
};

var safeSetItem = function safeSetItem(key, value) {
  var remainingTries = registry.length;
  while (remainingTries--) {
    try {
      localStorage.setItem(key, value);
      return;
    } catch (e) {
      removeLRUItem();
    }
  }
  
};

var updateRegistryKey = function updateRegistryKey(key, isAdd) {
  var keyIndex = registry.indexOf(key);
  if (keyIndex >= 0) registry.splice(keyIndex, 1);
  if (isAdd) registry.unshift(key);

  safeSetItem(REGISTRY_KEY, JSON.stringify(registry));
};

var updateLRUItem = function updateLRUItem(key) {
  updateRegistryKey(key, true);
};

var storage = {
  getItem: function getItem(key) {
    var value = localStorage.getItem(key);
    if (value) updateLRUItem(key);
    return value;
  },
  setItem: function setItem(key, value) {
    safeSetItem(key, value);
    updateLRUItem(key);
    return value;
  },
  getItemObj: function getItemObj(key) {
    var valueString = this.getItem(key);

    var value = valueString && JSON.parse(valueString);

    return value;
  },
  setItemObj: function setItemObj(key, value) {
    this.setItem(key, JSON.stringify(value));

    return value;
  }
};

var asyncGenerator = function () {
  function AwaitValue(value) {
    this.value = value;
  }

  function AsyncGenerator(gen) {
    var front, back;

    function send(key, arg) {
      return new Promise(function (resolve, reject) {
        var request = {
          key: key,
          arg: arg,
          resolve: resolve,
          reject: reject,
          next: null
        };

        if (back) {
          back = back.next = request;
        } else {
          front = back = request;
          resume(key, arg);
        }
      });
    }

    function resume(key, arg) {
      try {
        var result = gen[key](arg);
        var value = result.value;

        if (value instanceof AwaitValue) {
          Promise.resolve(value.value).then(function (arg) {
            resume("next", arg);
          }, function (arg) {
            resume("throw", arg);
          });
        } else {
          settle(result.done ? "return" : "normal", result.value);
        }
      } catch (err) {
        settle("throw", err);
      }
    }

    function settle(type, value) {
      switch (type) {
        case "return":
          front.resolve({
            value: value,
            done: true
          });
          break;

        case "throw":
          front.reject(value);
          break;

        default:
          front.resolve({
            value: value,
            done: false
          });
          break;
      }

      front = front.next;

      if (front) {
        resume(front.key, front.arg);
      } else {
        back = null;
      }
    }

    this._invoke = send;

    if (typeof gen.return !== "function") {
      this.return = undefined;
    }
  }

  if (typeof Symbol === "function" && Symbol.asyncIterator) {
    AsyncGenerator.prototype[Symbol.asyncIterator] = function () {
      return this;
    };
  }

  AsyncGenerator.prototype.next = function (arg) {
    return this._invoke("next", arg);
  };

  AsyncGenerator.prototype.throw = function (arg) {
    return this._invoke("throw", arg);
  };

  AsyncGenerator.prototype.return = function (arg) {
    return this._invoke("return", arg);
  };

  return {
    wrap: function (fn) {
      return function () {
        return new AsyncGenerator(fn.apply(this, arguments));
      };
    },
    await: function (value) {
      return new AwaitValue(value);
    }
  };
}();















var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var get$1 = function get$1(object, property, receiver) {
  if (object === null) object = Function.prototype;
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent === null) {
      return undefined;
    } else {
      return get$1(parent, property, receiver);
    }
  } else if ("value" in desc) {
    return desc.value;
  } else {
    var getter = desc.get;

    if (getter === undefined) {
      return undefined;
    }

    return getter.call(receiver);
  }
};

















var set = function set(object, property, value, receiver) {
  var desc = Object.getOwnPropertyDescriptor(object, property);

  if (desc === undefined) {
    var parent = Object.getPrototypeOf(object);

    if (parent !== null) {
      set(parent, property, value, receiver);
    }
  } else if ("value" in desc && desc.writable) {
    desc.value = value;
  } else {
    var setter = desc.set;

    if (setter !== undefined) {
      setter.call(receiver, value);
    }
  }

  return value;
};

var slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();













var toConsumableArray = function (arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  } else {
    return Array.from(arr);
  }
};

var LAST_LOGIN_ID_STORAGE_KEY = 'rc:lastLoggedInUserId';
var fb = function fb(id) {
  return firebase.database().ref('users/' + id);
};
var store = function store(user) {
  return storage.setItemObj('rc:' + user.id, user);
};

var User = {
  current: function current() {
    var lastLoginId = storage.getItem(LAST_LOGIN_ID_STORAGE_KEY);
    if (!lastLoginId) return;
    return this.localGet(lastLoginId);
  },

  getCurrentId: function getCurrentId() {
    return storage.getItem(LAST_LOGIN_ID_STORAGE_KEY);
  },
  setCurrent: function setCurrent(id) {
    return storage.setItem(LAST_LOGIN_ID_STORAGE_KEY, id);
  },
  unsetCurrent: function unsetCurrent() {
    var user = this.current();
    if (!user) return;
    storage.setItemObj('rc:' + user.id, '');
    storage.setItem(LAST_LOGIN_ID_STORAGE_KEY, '');
  },

  localGet: function localGet(id) {
    return storage.getItemObj('rc:' + id);
  },
  // TODO: Move App.jsx creating/initializing a new user into here create: => {}
  save: function save(user) {
    return new Promise(function (resolve, reject) {
      fb(user.id).set(user, function (err) {
        if (err) return reject(err);
        resolve(store(_extends({}, user)));
      });
    });
  },
  get: function get(id) {
    return new Promise(function (resolve, reject) {
      fb(id).once('value', function (data) {
        var val = data.val();
        if (!val) return reject("Couldn't find User");
        resolve(store(val));
      });
    });
  }
};

var dataComponent = (function (modelOrGetter, type, Component) {
  var onInit = function onInit(_ref) {
    var props = _ref.props,
        bindSend = _ref.bindSend;

    var Model = typeof modelOrGetter === 'function' ? modelOrGetter(props) : modelOrGetter;
    Model[type](props).then(bindSend('onLoadModel'));
    return null;
  };
  Component.state = {
    onInit: onInit,
    onProps: function onProps(component) {
      onInit(component);
      return component.state;
    },
    onLoadModel: function onLoadModel(component, model) {
      return model;
    },
    refresh: function refresh(component) {
      onInit(component);
      return component.state;
    }
  };
  return Component;
});

var schoolsRef = function schoolsRef() {
  var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return firebase.database().ref('users/' + User.getCurrentId() + '/schools/' + id);
};

var SchoolModel = {
  query: function query() {
    var userId = User.getCurrentId;
    if (!userId) {
      console.log('No user!');
      return;
    }
    return new Promise(function (resolve, reject) {
      schoolsRef().once('value', function (data) {
        var val = data.val();
        if (!val) return reject('Couldn\'t find schools for user ' + id);
        resolve(val);
      });
    });
  },

  create: function create(schoolName) {
    var newSchool = schoolsRef().push();
    newSchool.set({ name: schoolName });
  },

  // TODO: Move App.jsx creating/initializing a new user into here create: => {}
  updateName: function updateName(id, schoolName) {
    schoolsRef(id).update({ name: schoolName });
  },

  update: function update(id, hash) {
    return schoolsRef(id).update(hash);
  },

  get: function get(_ref) {
    var id = _ref.id;

    return new Promise(function (resolve, reject) {
      schoolsRef(id).once('value', function (data) {
        var val = data.val();
        if (!val) return reject('Couldn\'t find schools for user ' + id);
        resolve(val);
      });
    });
  }
};

var _xvdomCreateComponent$2 = xvdom.createComponent;
var _xvdomCreateDynamic$3 = xvdom.createDynamic;
var _xvdomEl$4 = xvdom.el;
var _xvdomUpdateComponent$2 = xvdom.updateComponent;
var _xvdomUpdateDynamic$3 = xvdom.updateDynamic;
var _xvdomSpec$4 = {
  c: function c(inst) {
    var _n = _xvdomEl$4('div'),
        _n2,
        _n3,
        _n4;

    inst.b = _n;
    _n.className = inst.a;
    _n2 = _xvdomEl$4('div');
    inst.d = _n2;
    _n2.className = inst.c;
    _n3 = _xvdomEl$4('div');
    _n3.className = 'layout horizontal center-center l-height14';
    inst.f = _xvdomCreateDynamic$3(false, _n3, inst.e);
    _n4 = _xvdomEl$4('div');
    _n4.className = 'l-padding-r0 t-truncate t-font-size-20 flex';
    inst.h = _n4;
    _n4.textContent = inst.g;

    _n3.appendChild(_n4);

    _n4 = (inst.j = _xvdomCreateComponent$2(Icon, Icon.state, {
      className: 't-bold c-white l-padding-h4',
      onClick: inst.i,
      size: 'small'
    }, inst)).$n;

    _n3.appendChild(_n4);

    inst.l = _xvdomCreateDynamic$3(false, _n3, inst.k);

    _n2.appendChild(_n3);

    inst.n = _xvdomCreateDynamic$3(false, _n2, inst.m);

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.className = v;
      pInst.a = v;
    }

    v = inst.c;

    if (v !== pInst.c) {
      pInst.d.className = v;
      pInst.c = v;
    }

    if (inst.e !== pInst.e) {
      pInst.f = _xvdomUpdateDynamic$3(false, pInst.e, pInst.e = inst.e, pInst.f);
    }

    v = inst.g;

    if (v !== pInst.g) {
      pInst.h.textContent = v;
      pInst.g = v;
    }

    if (inst.i !== pInst.i) {
      pInst.j = _xvdomUpdateComponent$2(Icon, Icon.state, {
        className: 't-bold c-white l-padding-h4',
        onClick: pInst.i = inst.i,
        size: 'small'
      }, pInst.j);
    }

    if (inst.k !== pInst.k) {
      pInst.l = _xvdomUpdateDynamic$3(false, pInst.k, pInst.k = inst.k, pInst.l);
    }

    if (inst.m !== pInst.m) {
      pInst.n = _xvdomUpdateDynamic$3(false, pInst.m, pInst.m = inst.m, pInst.n);
    }
  },
  r: xvdom.DEADPOOL
};
// import App   from './App.jsx';
var showSearch = function showSearch() {/*App.showSearch()*/};

var AppToolbar = function AppToolbar(_ref) {
  var _ref$props = _ref.props,
      title = _ref$props.title,
      secondary = _ref$props.secondary,
      left = _ref$props.left,
      right = _ref$props.right,
      scrollClass = _ref.state.scrollClass;
  return {
    $s: _xvdomSpec$4,
    a: 'AppToolbar ' + (secondary ? 'AppToolbar--withSecondary' : ''),
    c: 'AppToolbar-bar fixed fixed--top c-white bg-purple ' + scrollClass,
    e: left,
    g: title,
    i: showSearch,
    k: right,
    m: secondary
  };
};

var getScrollState = function getScrollState(prevScrollTop) {
  var scrollTop = document.body ? document.body.scrollTop : 0;
  var isScrollingDown = scrollTop > 56 && scrollTop - prevScrollTop > 0;
  return {
    scrollTop: scrollTop,
    scrollClass: isScrollingDown ? ' is-scrolling-down' : ''
  };
};

AppToolbar.state = {
  onInit: function onInit(_ref2) {
    var bindSend = _ref2.bindSend;
    return requestAnimationFrame(function () {
      return document.body.onscroll = bindSend('onScroll');
    }), getScrollState(0);
  },

  onScroll: function onScroll(_ref3) {
    var scrollTop = _ref3.state.scrollTop;
    return getScrollState(scrollTop);
  }
};

var studentsRef = function studentsRef() {
  var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return firebase.database().ref('users/' + User.getCurrentId() + '/schools/' + id + '/students');
};

var Students = {
  query: function query(_ref) {
    var id = _ref.id;

    var userId = User.getCurrentId;
    if (!userId) {
      console.log('No user!');
      return Promise.resolve([]);
    }
    return new Promise(function (resolve) {
      studentsRef(id).once('value', function (data) {
        resolve(data.val() || []);
      });
    });
  },

  update: function update(id, students) {
    return studentsRef(id).set(students);
  }
};

var _xvdomCreateComponent$3 = xvdom.createComponent;
var _xvdomCreateDynamic$4 = xvdom.createDynamic;
var _xvdomEl$5 = xvdom.el;
var _xvdomUpdateComponent$3 = xvdom.updateComponent;
var _xvdomUpdateDynamic$4 = xvdom.updateDynamic;
var _xvdomSpec5$1 = {
  c: function c(inst) {
    var _n = _xvdomEl$5('div'),
        _n2,
        _n3;

    _n2 = _xvdomEl$5('div');
    _n2.className = 'Card';
    _n3 = _xvdomEl$5('div');
    _n3.className = 'Card-title';
    inst.b = _xvdomCreateDynamic$4(false, _n3, inst.a);
    inst.d = _xvdomCreateDynamic$4(false, _n3, inst.c);

    _n2.appendChild(_n3);

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic$4(false, pInst.a, pInst.a = inst.a, pInst.b);
    }

    if (inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateDynamic$4(false, pInst.c, pInst.c = inst.c, pInst.d);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec4$2 = {
  c: function c() {
    var _n = _xvdomEl$5('h1');

    _n.className = 'c-gray-dark t-center';

    _n.appendChild(document.createTextNode(('No students') || ''));

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec3$2 = {
  c: function c(inst) {
    var _n = _xvdomEl$5('div'),
        _n2;

    _n.className = 'List-item layout horizontal';
    _n2 = _xvdomEl$5('span');
    _n2.className = 'flex';
    inst.b = _xvdomCreateDynamic$4(true, _n2, inst.a);

    _n.appendChild(_n2);

    _n2 = _xvdomEl$5('a');
    inst.d = _n2;
    _n2.onclick = inst.c;

    _n2.appendChild(document.createTextNode(('remove') || ''));

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic$4(true, pInst.a, pInst.a = inst.a, pInst.b);
    }

    v = inst.c;

    if (v !== pInst.c) {
      pInst.d.onclick = v;
      pInst.c = v;
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec2$3 = {
  c: function c(inst) {
    var _n = (inst.d = _xvdomCreateComponent$3(EditNewStudent, EditNewStudent.state, {
      id: inst.a,
      students: inst.b,
      onAdd: inst.c
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.b !== pInst.b || inst.a !== pInst.a || inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateComponent$3(EditNewStudent, EditNewStudent.state, {
        id: pInst.a = inst.a,
        students: pInst.b = inst.b,
        onAdd: pInst.c = inst.c
      }, pInst.d);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec$5 = {
  c: function c(inst) {
    var _n = _xvdomEl$5('div'),
        _n2;

    _n.className = 'layout horizontal';
    _n2 = _xvdomEl$5('input');
    _n2.className = 'SchoolPage-input flex';
    inst.b = _n2;
    _n2.oninput = inst.a;
    if (inst.c != null) _n2.value = inst.c;
    _n2.placeholder = 'Student\'s Name';

    _n.appendChild(_n2);

    _n2 = _xvdomEl$5('a');
    inst.e = _n2;
    _n2.hidden = inst.d;
    _n2.className = 'self-center l-margin-l2';
    _n2.onclick = inst.f;

    _n2.appendChild(document.createTextNode(('Add') || ''));

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.oninput = v;
      pInst.a = v;
    }

    v = inst.c;

    if (v !== pInst.c) {
      if (pInst.b.value !== v) {
        pInst.b.value = v;
      }

      pInst.c = v;
    }

    v = inst.d;

    if (v !== pInst.d) {
      pInst.e.hidden = v;
      pInst.d = v;
    }

    v = inst.f;

    if (v !== pInst.f) {
      pInst.e.onclick = v;
      pInst.f = v;
    }
  },
  r: xvdom.DEADPOOL
};
var EditNewStudent = function EditNewStudent(_ref) {
  var state = _ref.state,
      bindSend = _ref.bindSend;
  return {
    $s: _xvdomSpec$5,
    a: bindSend('updateName'),
    c: state,
    d: !state,
    f: bindSend('addStudent')
  };
};

EditNewStudent.state = {
  onInit: function onInit() {
    return '';
  },
  onProps: function onProps() {
    return '';
  },
  updateName: function updateName(component, e) {
    return e.target.value;
  },
  addStudent: function addStudent(_ref2, e) {
    var _ref2$props = _ref2.props,
        id = _ref2$props.id,
        students = _ref2$props.students,
        onAdd = _ref2$props.onAdd,
        state = _ref2.state;

    if (state && students.indexOf(state) === -1) {
      Students.update(id, students.concat(state)).then(onAdd);
    }
    return '';
  }
};

var StudentsTab = dataComponent(Students, 'query', function (_ref3) {
  var id = _ref3.props.id,
      state = _ref3.state,
      bindSend = _ref3.bindSend;
  return {
    $s: _xvdomSpec5$1,
    a: state && {
      $s: _xvdomSpec2$3,
      a: id,
      b: state,
      c: bindSend('refresh')
    },
    c: state && !!state.length ? state.map(function (student, i) {
      return {
        $s: _xvdomSpec3$2,
        a: student,
        c: function c() {
          Students.update(id, state.filter(function (s) {
            return s !== student;
          })).then(bindSend('refresh'));
        },
        key: student
      };
    }) : [{
      $s: _xvdomSpec4$2,
      key: 'EMPTY'
    }]
  };
});

var SEATS_PER_ROW = 10;
var seatingRef = function seatingRef() {
  var id = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';
  return firebase.database().ref('users/' + User.getCurrentId() + '/schools/' + id + '/seating');
};
var defaultSeating = function defaultSeating(students) {
  var left = students.slice();
  var result = [];
  while (left.length > 0) {
    result.push(left.splice(0, SEATS_PER_ROW));
  }
  return result;
};

var Seating = {
  query: function query(_ref) {
    var id = _ref.id;

    var userId = User.getCurrentId;
    if (!userId) {
      console.log('No user!');
      return Promise.resolve([]);
    }
    return new Promise(function (resolve) {
      seatingRef(id).once('value', function (data) {
        var val = data.val();
        if (!val) {
          Students.query({ id: id }).then(function (students) {
            if (students && students.length) {
              var seating = defaultSeating(students);
              Seating.update(id, seating);
              resolve(seating);
            } else {
              resolve([]);
            }
          });
        } else {
          resolve(data.val());
        }
      });
    });
  },

  update: function update(id, seating) {
    return seatingRef(id).set(seating);
  }
};

var _xvdomCreateComponent$4 = xvdom.createComponent;
var _xvdomCreateDynamic$5 = xvdom.createDynamic;
var _xvdomEl$6 = xvdom.el;
var _xvdomUpdateComponent$4 = xvdom.updateComponent;
var _xvdomUpdateDynamic$5 = xvdom.updateDynamic;
var _xvdomSpec8$1 = {
  c: function c(inst) {
    var _n = _xvdomEl$6('div'),
        _n2,
        _n3;

    _n.className = 'l-padding-t4';
    inst.b = _xvdomCreateDynamic$5(false, _n, inst.a);
    _n2 = _xvdomEl$6('div');
    _n2.className = 'layout horizontal l-padding-t2';
    _n2.style.cssText = 'padding-left: 22px';
    _n3 = _xvdomEl$6('a');
    _n3.className = 'SeatingTab-addRow';
    inst.d = _n3;
    _n3.onclick = inst.c;

    _n3.appendChild(document.createTextNode(('Add row') || ''));

    _n2.appendChild(_n3);

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic$5(false, pInst.a, pInst.a = inst.a, pInst.b);
    }

    v = inst.c;

    if (v !== pInst.c) {
      pInst.d.onclick = v;
      pInst.c = v;
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec7$1 = {
  c: function c(inst) {
    var _n = (inst.g = _xvdomCreateComponent$4(SeatingRow, SeatingRow.state, {
      id: inst.a,
      row: inst.b,
      rowNum: inst.c,
      onAssign: inst.d,
      onAdd: inst.e,
      onRemove: inst.f
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.e !== pInst.e || inst.d !== pInst.d || inst.c !== pInst.c || inst.b !== pInst.b || inst.a !== pInst.a || inst.f !== pInst.f) {
      pInst.g = _xvdomUpdateComponent$4(SeatingRow, SeatingRow.state, {
        id: pInst.a = inst.a,
        row: pInst.b = inst.b,
        rowNum: pInst.c = inst.c,
        onAssign: pInst.d = inst.d,
        onAdd: pInst.e = inst.e,
        onRemove: pInst.f = inst.f
      }, pInst.g);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec6$1 = {
  c: function c(inst) {
    var _n = _xvdomEl$6('div'),
        _n2,
        _n3,
        _n4;

    inst.b = _xvdomCreateDynamic$5(false, _n, inst.a);
    _n2 = _xvdomEl$6('div');
    _n2.className = 'SeatingRow layout horizontal';
    _n3 = _xvdomEl$6('div');
    _n3.className = 'SeatingRow-controls layout vertical around-justified';
    _n4 = _xvdomEl$6('a');
    _n4.className = 'SeatingRow-controls-control';
    inst.d = _n4;
    _n4.onclick = inst.c;

    _n4.appendChild(document.createTextNode(('+') || ''));

    _n3.appendChild(_n4);

    _n4 = _xvdomEl$6('a');
    _n4.className = 'SeatingRow-controls-control';
    inst.f = _n4;
    _n4.onclick = inst.e;

    _n4.appendChild(document.createTextNode(('-') || ''));

    _n3.appendChild(_n4);

    _n2.appendChild(_n3);

    inst.h = _xvdomCreateDynamic$5(false, _n2, inst.g);

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic$5(false, pInst.a, pInst.a = inst.a, pInst.b);
    }

    v = inst.c;

    if (v !== pInst.c) {
      pInst.d.onclick = v;
      pInst.c = v;
    }

    v = inst.e;

    if (v !== pInst.e) {
      pInst.f.onclick = v;
      pInst.e = v;
    }

    if (inst.g !== pInst.g) {
      pInst.h = _xvdomUpdateDynamic$5(false, pInst.g, pInst.g = inst.g, pInst.h);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec5$2 = {
  c: function c(inst) {
    var _n = _xvdomEl$6('a');

    inst.b = _n;
    _n.className = inst.a;
    _n.seatindex = inst.c;
    _n.onclick = inst.d;
    inst.f = _xvdomCreateDynamic$5(true, _n, inst.e);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.className = v;
      pInst.a = v;
    }

    v = inst.c;

    if (v !== pInst.c) {
      pInst.b.seatindex = v;
      pInst.c = v;
    }

    v = inst.d;

    if (v !== pInst.d) {
      pInst.b.onclick = v;
      pInst.d = v;
    }

    if (inst.e !== pInst.e) {
      pInst.f = _xvdomUpdateDynamic$5(true, pInst.e, pInst.e = inst.e, pInst.f);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec4$3 = {
  c: function c(inst) {
    var _n = (inst.e = _xvdomCreateComponent$4(AssignSeat, AssignSeat.state, {
      id: inst.a,
      seatIndex: inst.b,
      onAssign: inst.c,
      onClose: inst.d
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.c !== pInst.c || inst.b !== pInst.b || inst.a !== pInst.a || inst.d !== pInst.d) {
      pInst.e = _xvdomUpdateComponent$4(AssignSeat, AssignSeat.state, {
        id: pInst.a = inst.a,
        seatIndex: pInst.b = inst.b,
        onAssign: pInst.c = inst.c,
        onClose: pInst.d = inst.d
      }, pInst.e);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec3$3 = {
  c: function c(inst) {
    var _n = _xvdomEl$6('div'),
        _n2;

    _n.className = 'AssignSeat';
    _n2 = _xvdomEl$6('div');
    _n2.className = 'AssignSeat-backdrop';
    inst.b = _n2;
    _n2.onclick = inst.a;

    _n.appendChild(_n2);

    inst.d = _xvdomCreateDynamic$5(false, _n, inst.c);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.onclick = v;
      pInst.a = v;
    }

    if (inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateDynamic$5(false, pInst.c, pInst.c = inst.c, pInst.d);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec2$4 = {
  c: function c(inst) {
    var _n = _xvdomEl$6('div');

    _n.className = 'AssignSeat-card Card';
    inst.b = _xvdomCreateDynamic$5(true, _n, inst.a);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic$5(true, pInst.a, pInst.a = inst.a, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec$6 = {
  c: function c(inst) {
    var _n = _xvdomEl$6('a');

    _n.className = 'List-item';
    inst.b = _n;
    _n.onclick = inst.a;
    inst.d = _xvdomCreateDynamic$5(true, _n, inst.c);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.onclick = v;
      pInst.a = v;
    }

    if (inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateDynamic$5(true, pInst.c, pInst.c = inst.c, pInst.d);
    }
  },
  r: xvdom.DEADPOOL
};
var AssignSeat = dataComponent(Students, 'query', function (_ref) {
  var _ref$props = _ref.props,
      seatIndex = _ref$props.seatIndex,
      onAssign = _ref$props.onAssign,
      onClose = _ref$props.onClose,
      state = _ref.state;
  return {
    $s: _xvdomSpec3$3,
    a: onClose,
    c: state && {
      $s: _xvdomSpec2$4,
      a: state.sort().map(function (student) {
        return {
          $s: _xvdomSpec$6,
          a: function a() {
            onAssign({ seatIndex: seatIndex, student: student });
          },
          c: student,
          key: student
        };
      })
    }
  };
});

var SeatingRow = function SeatingRow(_ref2) {
  var _ref2$props = _ref2.props,
      id = _ref2$props.id,
      row = _ref2$props.row,
      onAdd = _ref2$props.onAdd,
      onRemove = _ref2$props.onRemove,
      onAssign = _ref2$props.onAssign,
      seatIndex = _ref2.state.seatIndex,
      bindSend = _ref2.bindSend;
  return {
    $s: _xvdomSpec6$1,
    a: seatIndex != null && {
      $s: _xvdomSpec4$3,
      a: id,
      b: seatIndex,
      c: onAssign,
      d: bindSend('onClose')
    },
    c: onAdd,
    e: onRemove,
    g: row.map(function (seat, seatIndex) {
      return {
        $s: _xvdomSpec5$2,
        a: 'SeatingRow-seat ' + (seat === 'EMPTY' ? 'SeatingRow-seat--empty' : ''),
        c: seatIndex,
        d: bindSend('openAssignSeat'),
        e: seat,
        key: seatIndex
      };
    })
  };
};

SeatingRow.state = {
  onInit: function onInit() {
    return {};
  },
  onProps: function onProps() {
    return {};
  },
  onClose: function onClose() {
    return {};
  },
  openAssignSeat: function openAssignSeat(_ref3, event) {
    var state = _ref3.state;

    var target = event.currentTarget;
    if (target && target.seatindex != null) {
      return { seatIndex: target.seatindex };
    }
    return state;
  }
};

var SeatingTab = dataComponent(Seating, 'query', function (_ref4) {
  var id = _ref4.props.id,
      state = _ref4.state,
      bindSend = _ref4.bindSend;
  return {
    $s: _xvdomSpec8$1,
    a: !state ? [] : state.map(function (row, rowNum) {
      return {
        $s: _xvdomSpec7$1,
        a: id,
        b: row,
        c: rowNum,
        d: function d(_ref5) {
          var seatIndex = _ref5.seatIndex,
              student = _ref5.student;

          var curRow = state.find(function (row) {
            return row.indexOf(student) !== -1;
          });
          var curSeatIndex = curRow && curRow.indexOf(student);

          if (curRow === rowNum && curSeatIndex === seatIndex) return;

          var swapStudent = row[seatIndex];
          if (curRow) curRow[curSeatIndex] = swapStudent;
          row[seatIndex] = student;

          Seating.update(id, state).then(bindSend('refresh'));
        },
        e: function e() {
          state[rowNum] = row.concat('EMPTY');
          Seating.update(id, state).then(bindSend('refresh'));
        },
        f: function f() {
          var curRow = state[rowNum] = row.slice(0, -1);
          if (curRow.length === 0) {
            state.splice(rowNum, 1);
          }
          Seating.update(id, state).then(bindSend('refresh'));
        },
        key: row.join('--')
      };
    }),
    c: function c() {
      state.push(['EMPTY']);
      Seating.update(id, state).then(bindSend('refresh'));
    }
  };
});

var pad = function pad(num) {
  return '' + (num < 10 ? '0' : '') + num;
};
var dateString = function dateString(date) {
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate() + 1);
};
var rollcallRef = function rollcallRef(id, date) {
  return firebase.database().ref('users/' + User.getCurrentId() + '/schools/' + id + '/rollcall/' + dateString(date));
};

var RollcallModel = {
  query: function query(_ref) {
    var id = _ref.id,
        date = _ref.date;

    var userId = User.getCurrentId;
    if (!userId) {
      console.log('No user!');
      return Promise.resolve([]);
    }
    return new Promise(function (resolve) {
      rollcallRef(id, date).once('value', function (data) {
        resolve(data.val() || []);
      });
    });
  },

  update: function update(id, date, rollcall) {
    return rollcallRef(id, date).set(rollcall);
  }
};

var _xvdomCreateComponent$5 = xvdom.createComponent;
var _xvdomCreateDynamic$6 = xvdom.createDynamic;
var _xvdomEl$7 = xvdom.el;
var _xvdomUpdateComponent$5 = xvdom.updateComponent;
var _xvdomUpdateDynamic$6 = xvdom.updateDynamic;
var _xvdomSpec7$2 = {
  c: function c(inst) {
    var _n = _xvdomEl$7('div'),
        _n2,
        _n3,
        _n4;

    _n2 = _xvdomEl$7('div');
    _n2.className = 'layout horizontal center-center l-padding-t4';
    _n3 = _xvdomEl$7('div');
    _n3.className = 'Rollcall-date layout horizontal center-center';
    _n4 = _xvdomEl$7('a');
    _n4.className = 'Rollcall-dateInc';
    inst.b = _n4;
    _n4.onclick = inst.a;

    _n4.appendChild(document.createTextNode(('<') || ''));

    _n3.appendChild(_n4);

    _n4 = _xvdomEl$7('div');
    _n4.className = 'flex t-center';
    inst.d = _xvdomCreateDynamic$6(false, _n4, inst.c);

    _n4.appendChild(document.createTextNode((' - ') || ''));

    inst.f = _xvdomCreateDynamic$6(false, _n4, inst.e);

    _n4.appendChild(document.createTextNode((' - ') || ''));

    inst.h = _xvdomCreateDynamic$6(false, _n4, inst.g);

    _n3.appendChild(_n4);

    _n4 = _xvdomEl$7('a');
    _n4.className = 'Rollcall-dateInc';
    inst.j = _n4;
    _n4.onclick = inst.i;

    _n4.appendChild(document.createTextNode(('>') || ''));

    _n3.appendChild(_n4);

    _n2.appendChild(_n3);

    _n.appendChild(_n2);

    _n2 = (inst.m = _xvdomCreateComponent$5(Rollcall, Rollcall.state, {
      id: inst.k,
      date: inst.l
    }, inst)).$n;

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.onclick = v;
      pInst.a = v;
    }

    if (inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateDynamic$6(false, pInst.c, pInst.c = inst.c, pInst.d);
    }

    if (inst.e !== pInst.e) {
      pInst.f = _xvdomUpdateDynamic$6(false, pInst.e, pInst.e = inst.e, pInst.f);
    }

    if (inst.g !== pInst.g) {
      pInst.h = _xvdomUpdateDynamic$6(false, pInst.g, pInst.g = inst.g, pInst.h);
    }

    v = inst.i;

    if (v !== pInst.i) {
      pInst.j.onclick = v;
      pInst.i = v;
    }

    if (inst.k !== pInst.k || inst.l !== pInst.l) {
      pInst.m = _xvdomUpdateComponent$5(Rollcall, Rollcall.state, {
        id: pInst.k = inst.k,
        date: pInst.l = inst.l
      }, pInst.m);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec6$2 = {
  c: function c(inst) {
    var _n = _xvdomEl$7('div');

    inst.b = _xvdomCreateDynamic$6(true, _n, inst.a);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic$6(true, pInst.a, pInst.a = inst.a, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec5$3 = {
  c: function c(inst) {
    var _n = (inst.d = _xvdomCreateComponent$5(RollcallWithSeating, RollcallWithSeating.state, {
      id: inst.a,
      rollcall: inst.b,
      onToggleStatus: inst.c
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.b !== pInst.b || inst.a !== pInst.a || inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateComponent$5(RollcallWithSeating, RollcallWithSeating.state, {
        id: pInst.a = inst.a,
        rollcall: pInst.b = inst.b,
        onToggleStatus: pInst.c = inst.c
      }, pInst.d);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec4$4 = {
  c: function c(inst) {
    var _n = _xvdomEl$7('div');

    inst.b = _xvdomCreateDynamic$6(true, _n, inst.a);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic$6(true, pInst.a, pInst.a = inst.a, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec3$4 = {
  c: function c(inst) {
    var _n = (inst.f = _xvdomCreateComponent$5(SeatingRow$1, SeatingRow$1.state, {
      id: inst.a,
      row: inst.b,
      rowNum: inst.c,
      rollcall: inst.d,
      onToggleStatus: inst.e
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.d !== pInst.d || inst.c !== pInst.c || inst.b !== pInst.b || inst.a !== pInst.a || inst.e !== pInst.e) {
      pInst.f = _xvdomUpdateComponent$5(SeatingRow$1, SeatingRow$1.state, {
        id: pInst.a = inst.a,
        row: pInst.b = inst.b,
        rowNum: pInst.c = inst.c,
        rollcall: pInst.d = inst.d,
        onToggleStatus: pInst.e = inst.e
      }, pInst.f);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec2$5 = {
  c: function c(inst) {
    var _n = _xvdomEl$7('div'),
        _n2;

    _n.className = 'l-padding-l4';
    _n2 = _xvdomEl$7('div');
    _n2.className = 'SeatingRow layout horizontal';
    inst.b = _xvdomCreateDynamic$6(true, _n2, inst.a);

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic$6(true, pInst.a, pInst.a = inst.a, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec$7 = {
  c: function c(inst) {
    var _n = _xvdomEl$7('a'),
        _n2;

    inst.b = _n;
    _n.className = inst.a;
    _n.onclick = inst.c;
    _n2 = _xvdomEl$7('div');
    inst.e = _xvdomCreateDynamic$6(true, _n2, inst.d);

    _n.appendChild(_n2);

    _n2 = _xvdomEl$7('div');
    _n2.className = 'flex layout vertical center-center';
    inst.g = _xvdomCreateDynamic$6(true, _n2, inst.f);

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.className = v;
      pInst.a = v;
    }

    v = inst.c;

    if (v !== pInst.c) {
      pInst.b.onclick = v;
      pInst.c = v;
    }

    if (inst.d !== pInst.d) {
      pInst.e = _xvdomUpdateDynamic$6(true, pInst.d, pInst.d = inst.d, pInst.e);
    }

    if (inst.f !== pInst.f) {
      pInst.g = _xvdomUpdateDynamic$6(true, pInst.f, pInst.f = inst.f, pInst.g);
    }
  },
  r: xvdom.DEADPOOL
};
var STATUSES = ['Here', 'Absent', 'No Instrument'];

var getRecord = function getRecord(student, rollcall) {
  return rollcall.find(function (_ref) {
    var _ref2 = slicedToArray(_ref, 1),
        recordStudent = _ref2[0];

    return recordStudent === student;
  });
};

var getStudentStatus = function getStudentStatus(student, rollcall) {
  var record = getRecord(student, rollcall);
  return record ? record[1] : '';
};

var getStudentStatusClass = function getStudentStatusClass(student, rollcall) {
  var status = getStudentStatus(student, rollcall);
  return status === 'Here' ? 'is-here' : status === 'Absent' ? 'is-absent' : status === 'No Instrument' ? 'is-no-instrument' : '';
};

var SeatingRow$1 = function SeatingRow$1(_ref3) {
  var row = _ref3.row,
      rollcall = _ref3.rollcall,
      onToggleStatus = _ref3.onToggleStatus;
  return {
    $s: _xvdomSpec2$5,
    a: row.map(function (seat, seatIndex) {
      return {
        $s: _xvdomSpec$7,
        a: 'SeatingRow-seat layout vertical center-center ' + (seat === 'EMPTY' ? 'SeatingRow-seat--empty' : '') + ' ' + getStudentStatusClass(seat, rollcall),
        c: seat === 'EMPTY' ? null : function () {
          return onToggleStatus(seat);
        },
        d: seat === 'EMPTY' ? '' : seat,
        f: getStudentStatus(seat, rollcall),
        key: seatIndex
      };
    })
  };
};

var RollcallWithSeating = dataComponent(Seating, 'query', function (_ref4) {
  var _ref4$props = _ref4.props,
      id = _ref4$props.id,
      rollcall = _ref4$props.rollcall,
      onToggleStatus = _ref4$props.onToggleStatus,
      state = _ref4.state,
      bindSend = _ref4.bindSend;
  return {
    $s: _xvdomSpec4$4,
    a: !state ? [] : state.map(function (row, rowNum) {
      return {
        $s: _xvdomSpec3$4,
        a: id,
        b: row,
        c: rowNum,
        d: rollcall,
        e: onToggleStatus,
        key: row.join('--')
      };
    })
  };
});

var Rollcall = dataComponent(RollcallModel, 'query', function (_ref5) {
  var id = _ref5.props.id,
      state = _ref5.state,
      bindSend = _ref5.bindSend;
  return {
    $s: _xvdomSpec6$2,
    a: state && {
      $s: _xvdomSpec5$3,
      a: id,
      b: state,
      c: bindSend('onToggleStatus')
    }
  };
});

var nextStatus = function nextStatus(status) {
  return STATUSES[(STATUSES.indexOf(status) + 1) % STATUSES.length];
};

Rollcall.state.onToggleStatus = function (_ref6, student) {
  var _ref6$props = _ref6.props,
      id = _ref6$props.id,
      date = _ref6$props.date,
      state = _ref6.state;

  if (!student) return;
  var record = state.find(function (_ref7) {
    var _ref8 = slicedToArray(_ref7, 1),
        recordStudent = _ref8[0];

    return recordStudent === student;
  });
  if (!record) {
    record = [student, STATUSES[0]];
    state.push(record);
  } else {
    record[1] = nextStatus(record[1]);
  }
  RollcallModel.update(id, date, state);
  return [].concat(toConsumableArray(state));
};

var RollcallTab = function RollcallTab(_ref9) {
  var id = _ref9.props.id,
      state = _ref9.state,
      bindSend = _ref9.bindSend;
  return {
    $s: _xvdomSpec7$2,
    a: bindSend('decDate'),
    c: state.getMonth() + 1,
    e: state.getDate() + 1,
    g: state.getFullYear(),
    i: bindSend('incDate'),
    k: id,
    l: state
  };
};

var onInit$2 = function onInit$2() {
  return new Date();
};

var addDate = function addDate(date, numDays) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + numDays);
};

RollcallTab.state = {
  onInit: onInit$2,
  onProps: onInit$2,
  decDate: function decDate(_ref10) {
    var state = _ref10.state;
    return addDate(state, -1);
  },
  incDate: function incDate(_ref11) {
    var state = _ref11.state;
    return addDate(state, 1);
  }
};

var _xvdomCreateComponent$1 = xvdom.createComponent;
var _xvdomCreateDynamic$2 = xvdom.createDynamic;
var _xvdomEl$3 = xvdom.el;
var _xvdomUpdateComponent$1 = xvdom.updateComponent;
var _xvdomUpdateDynamic$2 = xvdom.updateDynamic;
var _xvdomSpec13 = {
  c: function c(inst) {
    var _n = (inst.e = _xvdomCreateComponent$1(School, School.state, {
      user: inst.a,
      page: inst.b,
      id: inst.c,
      tab: inst.d
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.c !== pInst.c || inst.b !== pInst.b || inst.a !== pInst.a || inst.d !== pInst.d) {
      pInst.e = _xvdomUpdateComponent$1(School, School.state, {
        user: pInst.a = inst.a,
        page: pInst.b = inst.b,
        id: pInst.c = inst.c,
        tab: pInst.d = inst.d
      }, pInst.e);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec12 = {
  c: function c(inst) {
    var _n = _xvdomCreateComponent$1(SchoolCreate, SchoolCreate.state, null, inst).$n;

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec11 = {
  c: function c(inst) {
    var _n = (inst.d = _xvdomCreateComponent$1(Tabs, Tabs.state, {
      hrefPrefix: inst.a,
      selected: inst.b,
      tabs: inst.c
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.b !== pInst.b || inst.a !== pInst.a || inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateComponent$1(Tabs, Tabs.state, {
        hrefPrefix: pInst.a = inst.a,
        selected: pInst.b = inst.b,
        tabs: pInst.c = inst.c
      }, pInst.d);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec10 = {
  c: function c(inst) {
    var _n = _xvdomCreateComponent$1(Icon, Icon.state, {
      className: 'c-white l-padding-h4',
      name: 'three-bars',
      size: 'small'
    }, inst).$n;

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec9 = {
  c: function c(inst) {
    var _n = _xvdomEl$3('div'),
        _n2;

    _n2 = (inst.d = _xvdomCreateComponent$1(AppToolbar, AppToolbar.state, {
      left: inst.a,
      secondary: inst.b,
      title: inst.c
    }, inst)).$n;

    _n.appendChild(_n2);

    inst.f = _xvdomCreateDynamic$2(false, _n, inst.e);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.b !== pInst.b || inst.a !== pInst.a || inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateComponent$1(AppToolbar, AppToolbar.state, {
        left: pInst.a = inst.a,
        secondary: pInst.b = inst.b,
        title: pInst.c = inst.c
      }, pInst.d);
    }

    if (inst.e !== pInst.e) {
      pInst.f = _xvdomUpdateDynamic$2(false, pInst.e, pInst.e = inst.e, pInst.f);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec8 = {
  c: function c(inst) {
    var _n = (inst.b = _xvdomCreateComponent$1(RollcallTab, RollcallTab.state, {
      id: inst.a
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateComponent$1(RollcallTab, RollcallTab.state, {
        id: pInst.a = inst.a
      }, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec7 = {
  c: function c(inst) {
    var _n = (inst.b = _xvdomCreateComponent$1(SeatingTab, SeatingTab.state, {
      id: inst.a
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateComponent$1(SeatingTab, SeatingTab.state, {
        id: pInst.a = inst.a
      }, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec6 = {
  c: function c(inst) {
    var _n = (inst.b = _xvdomCreateComponent$1(StudentsTab, StudentsTab.state, {
      id: inst.a
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateComponent$1(StudentsTab, StudentsTab.state, {
        id: pInst.a = inst.a
      }, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec5 = {
  c: function c(inst) {
    var _n = (inst.b = _xvdomCreateComponent$1(SchoolTab, SchoolTab.state, {
      id: inst.a
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateComponent$1(SchoolTab, SchoolTab.state, {
        id: pInst.a = inst.a
      }, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec4$1 = {
  c: function c(inst) {
    var _n = _xvdomEl$3('div'),
        _n2,
        _n3;

    _n.className = 'Card';
    _n2 = _xvdomEl$3('div');
    _n2.className = 'Card-title';
    _n3 = (inst.c = _xvdomCreateComponent$1(EditSchoolName, EditSchoolName.state, {
      id: inst.a,
      school: inst.b
    }, inst)).$n;

    _n2.appendChild(_n3);

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a || inst.b !== pInst.b) {
      pInst.c = _xvdomUpdateComponent$1(EditSchoolName, EditSchoolName.state, {
        id: pInst.a = inst.a,
        school: pInst.b = inst.b
      }, pInst.c);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec3$1 = {
  c: function c(inst) {
    var _n = _xvdomEl$3('input');

    _n.className = 'SchoolPage-input';
    inst.b = _n;
    if (inst.a != null) _n.value = inst.a;
    _n.oninput = inst.c;
    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      if (pInst.b.value !== v) {
        pInst.b.value = v;
      }

      pInst.a = v;
    }

    v = inst.c;

    if (v !== pInst.c) {
      pInst.b.oninput = v;
      pInst.c = v;
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec2$2 = {
  c: function c(inst) {
    var _n = _xvdomCreateComponent$1(Icon, Icon.state, {
      className: 'c-white l-padding-h4',
      name: 'three-bars',
      size: 'small'
    }, inst).$n;

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec$3 = {
  c: function c(inst) {
    var _n = _xvdomEl$3('div'),
        _n2;

    _n2 = (inst.b = _xvdomCreateComponent$1(AppToolbar, AppToolbar.state, {
      left: inst.a
    }, inst)).$n;

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateComponent$1(AppToolbar, AppToolbar.state, {
        left: pInst.a = inst.a
      }, pInst.b);
    }
  },
  r: xvdom.DEADPOOL
};
var TABS = {
  school: { title: 'School' },
  students: { title: 'Students' },
  seating: { title: 'Seating' },
  rollcall: { title: 'Roll Call' }
};

var SchoolCreate = function SchoolCreate(_ref) {
  var _ref$props = _ref.props,
      user = _ref$props.user,
      page = _ref$props.page,
      id = _ref$props.id,
      tab = _ref$props.tab;

  return {
    $s: _xvdomSpec$3,
    a: {
      $s: _xvdomSpec2$2
    }
  };
};

var EditSchoolName = function EditSchoolName(_ref2) {
  var id = _ref2.props.id,
      state = _ref2.state,
      bindSend = _ref2.bindSend;
  return {
    $s: _xvdomSpec3$1,
    a: state,
    c: bindSend('updateName')
  };
};

var onInit$1 = function onInit$1(_ref3) {
  var props = _ref3.props;
  return props.school && props.school.name;
};
EditSchoolName.state = {
  onInit: onInit$1,
  onProps: onInit$1,
  updateName: function updateName(_ref4, e) {
    var id = _ref4.props.id,
        state = _ref4.state;

    var newName = e.target.value;
    SchoolModel.updateName(id, newName);
    return newName;
  }
};

var SchoolTab = dataComponent(SchoolModel, 'get', function (_ref5) {
  var id = _ref5.props.id,
      state = _ref5.state;
  return {
    $s: _xvdomSpec4$1,
    a: id,
    b: state
  };
});

var renderTab$1 = function renderTab$1(id, tab) {
  return tab === 'school' ? {
    $s: _xvdomSpec5,
    a: id
  } : tab === 'students' ? {
    $s: _xvdomSpec6,
    a: id
  } : tab === 'seating' ? {
    $s: _xvdomSpec7,
    a: id
  } : tab === 'rollcall' ? {
    $s: _xvdomSpec8,
    a: id
  } : null;
};

var School = dataComponent(SchoolModel, 'get', function (_ref6) {
  var _ref6$props = _ref6.props,
      user = _ref6$props.user,
      page = _ref6$props.page,
      id = _ref6$props.id,
      tab = _ref6$props.tab,
      state = _ref6.state;

  var school = state || {};
  return {
    $s: _xvdomSpec9,
    a: {
      $s: _xvdomSpec10
    },
    b: {
      $s: _xvdomSpec11,
      a: '#schools/' + id + '/',
      b: tab,
      c: TABS
    },
    c: school.name,
    e: renderTab$1(id, tab)
  };
});

var SchoolPage = (function (_ref7) {
  var user = _ref7.user,
      page = _ref7.page,
      id = _ref7.id,
      tab = _ref7.tab;
  return id === 'new' ? {
    $s: _xvdomSpec12
  } : {
    $s: _xvdomSpec13,
    a: user,
    b: page,
    c: id,
    d: tab
  };
});

var _xvdomCreateComponent = xvdom.createComponent;
var _xvdomCreateDynamic = xvdom.createDynamic;
var _xvdomEl = xvdom.el;
var _xvdomUpdateComponent = xvdom.updateComponent;
var _xvdomUpdateDynamic = xvdom.updateDynamic;
var _xvdomSpec4 = {
  c: function c(inst) {
    var _n = _xvdomCreateComponent(App, App.state, null, inst).$n;

    return _n;
  },
  u: function u() {},
  r: xvdom.DEADPOOL
};
var _xvdomSpec3 = {
  c: function c(inst) {
    var _n = _xvdomEl('body');

    _n.className = 'App';
    inst.b = _xvdomCreateDynamic(false, _n, inst.a);
    inst.d = _xvdomCreateDynamic(false, _n, inst.c);
    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.a !== pInst.a) {
      pInst.b = _xvdomUpdateDynamic(false, pInst.a, pInst.a = inst.a, pInst.b);
    }

    if (inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateDynamic(false, pInst.c, pInst.c = inst.c, pInst.d);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec2 = {
  c: function c(inst) {
    var _n = (inst.e = _xvdomCreateComponent(SchoolPage, SchoolPage.state, {
      user: inst.a,
      page: inst.b,
      id: inst.c,
      tab: inst.d
    }, inst)).$n;

    return _n;
  },
  u: function u(inst, pInst) {
    var v;

    if (inst.c !== pInst.c || inst.b !== pInst.b || inst.a !== pInst.a || inst.d !== pInst.d) {
      pInst.e = _xvdomUpdateComponent(SchoolPage, SchoolPage.state, {
        user: pInst.a = inst.a,
        page: pInst.b = inst.b,
        id: pInst.c = inst.c,
        tab: pInst.d = inst.d
      }, pInst.e);
    }
  },
  r: xvdom.DEADPOOL
};
var _xvdomSpec = {
  c: function c(inst) {
    var _n = _xvdomEl('div'),
        _n2;

    _n.style.cssText = 'position: absolute; top: 0px; bottom: 0px; left: 0px; right: 0px;';
    _n.className = 'layout horizontal center-center';
    _n2 = _xvdomEl('a');
    inst.b = _n2;
    _n2.onclick = inst.a;
    _n2.className = 'l-padding-4';
    _n2.style.cssText = 'background: #CCC; border-radius: 6px;';
    inst.d = _xvdomCreateDynamic(true, _n2, inst.c);

    _n.appendChild(_n2);

    return _n;
  },
  u: function u(inst, pInst) {
    var v;
    v = inst.a;

    if (v !== pInst.a) {
      pInst.b.onclick = v;
      pInst.a = v;
    }

    if (inst.c !== pInst.c) {
      pInst.d = _xvdomUpdateDynamic(true, pInst.c, pInst.c = inst.c, pInst.d);
    }
  },
  r: xvdom.DEADPOOL
};
function toggleSignIn() {
  if (firebase.auth().currentUser) {
    User.unsetCurrent();
    return firebase.auth().signOut();
  }

  var provider = new firebase.auth.GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/plus.login');
  firebase.auth().signInWithPopup(provider).catch(function (error) {
    return console.error(error);
  });
}

var App = function App(_ref) {
  var _ref$state = _ref.state,
      user = _ref$state.user,
      page = _ref$state.page,
      id = _ref$state.id,
      tab = _ref$state.tab;
  return {
    $s: _xvdomSpec3,
    a: !user && {
      $s: _xvdomSpec,
      a: toggleSignIn,
      c: user ? 'Sign out' : 'Sign in'
    },
    c: user && !!page && !!id && {
      $s: _xvdomSpec2,
      a: user,
      b: page,
      c: id,
      d: tab
    }
  };
};

var stateFromHash = function stateFromHash(_ref2) {
  var state = _ref2.state;

  var hash = window.location.hash.slice(1);

  var _hash$split = hash.split('/'),
      _hash$split2 = slicedToArray(_hash$split, 3),
      page = _hash$split2[0],
      id = _hash$split2[1],
      tab = _hash$split2[2];

  return _extends({}, state, { page: page, id: id, tab: tab });
};

firebase.initializeApp({
  apiKey: "AIzaSyByU0ftUO7ECBLGGCb4awfe-u0ITxt0NVw",
  authDomain: "roll-call-1440c.firebaseapp.com",
  databaseURL: "https://roll-call-1440c.firebaseio.com",
  storageBucket: "roll-call-1440c.appspot.com",
  messagingSenderId: "115688293946"
});

App.state = {
  onInit: function onInit(_ref3) {
    var bindSend = _ref3.bindSend;

    firebase.auth().onAuthStateChanged(function (authUser) {
      if (!authUser) return bindSend('onUser')(authUser);

      // Get or create user information
      User.get(authUser.uid).catch(function () {
        return User.save({
          // Couldn't find existing user w/authId, so create a new User
          id: authUser.uid,
          displayName: authUser.displayName,
          schools: {
            _init: {
              name: 'School #1'
            }
          }
        });
      }).then(function (user) {
        User.setCurrent(user.id);
        var firstKey = Object.keys(user.schools)[0];
        var hash = window.location.hash;
        if (!hash || hash === '#') window.location.hash = '#schools/' + firstKey + '/school';
        bindSend('onUser')(user);
      });
    });

    window.onhashchange = bindSend('handleHashChange');
    return stateFromHash({ user: User.current() });
  },
  onUser: function onUser(_ref4, user) {
    var state = _ref4.state;

    return _extends({}, state, { user: user });
  },
  handleHashChange: stateFromHash
};

document.body = xvdom.render({
  $s: _xvdomSpec4
});

}());
