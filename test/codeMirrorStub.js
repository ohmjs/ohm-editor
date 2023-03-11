/* eslint-env node */

// Stands in for the CodeMirror constructor, returning a stub instance.
global.CodeMirror = () => {
  return {
    focus() {},
    setOption() {},
    setValue(val) {},
  };
};
