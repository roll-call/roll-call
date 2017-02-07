export default (modelOrGetter, type, Component) => {
  const onInit = ({props, bindSend}) => {
    const Model = typeof modelOrGetter === 'function' ? modelOrGetter(props) : modelOrGetter;
    Model[type](props).then(bindSend('onLoadModel'));
    return null;
  };
  Component.state = {
    onInit,
    onProps: component => {
      onInit(component);
      return component.state;
    },
    onLoadModel: (component, model) => model,
    refresh: component => {
      onInit(component);
      return component.state;
    }
  }
  return Component;
}
