// Stands in for the CodeMirror constructor, returning a stub instance.
globalThis.CodeMirror = () => {
  return {
    focus() {},
    setOption() {},
    setValue(val) {},
  };
};
