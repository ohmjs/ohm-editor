/* eslint-env browser */
/* global CodeMirror */

import CheckedEmitter from 'checked-emitter';

const ohmEditor = new CheckedEmitter();
export default ohmEditor;

ohmEditor.registerEvents({
  // Emitted when the CodeMirror instances for the input and grammar have been initialized.
  'init:inputEditor': ['codeMirror'],
  'init:grammarEditor': ['codeMirror'],

  // Emitted as soon as the user has made a change in the respective editor. Any listeners which
  // may be long running should use 'change:input' or 'change:grammars' instead.
  'change:inputEditor': ['codeMirror'],
  'change:grammarEditor': ['codeMirror'],

  // Emitted after a short delay when one or more editor change events have occurred.
  'change:grammars': ['grammarSource'],
  'change:input': ['inputSource'],

  // Emitted after attempting to parse the grammar(s) and the input, respectively.
  'parse:grammars': ['matchResult', 'grammars', 'err'],
  'parse:input': ['matchResult', 'trace'],

  // The "current" grammar is determined by (a) the contents of the grammar editor, and
  // (b) the currently-selected example. This is emitted if either one changes.
  'set:currentGrammar': ['grammar'],
  'set:startRule': ['startRule'],

  // Emitted when the user indicates they want to preview contextual information about a
  // Failure, e.g. when hovering over the failure message.
  'peek:failure': ['failure'],
  'unpeek:failure': [], // Ends the preview.

  // Emitted when the user indicates they want jump to a location relevant to a Failure.
  // Usually comes after a 'peek:failure' event, and if so, it implies that there will be
  // no matching 'unpeek:failure'.
  'goto:failure': ['failure'],

  // Emitted when the user indicates they want to preview a rule definition, e.g. when
  // hovering over a node in the visualizer.
  'peek:ruleDefinition': ['grammar', 'ruleName'],
  'unpeek:ruleDefinition': [], // Ends the preview.

  // Emitted when the user checks or unchecks one of the option checkboxes.
  'change:option': ['optionName'],
});

ohmEditor.grammars = null;
ohmEditor.options = {};

ohmEditor.currentGrammar = null;
ohmEditor.startRule = '';

ohmEditor.semantics = new CheckedEmitter();
ohmEditor.semantics.registerEvents({
  // Emitted after adding an new operation/attribute.
  'add:operation': ['type', 'name', 'optArguments'],

  // Emitted after selecting an operation button.
  'select:operation': ['operationName'],

  // Emitted after pressing cmd/ctrl-S in semantics editor
  'save:action': ['operation', 'key', 'args', 'body'],

  // Emitted when user want to add a new semantic editor
  'add:semanticEditor': ['type', 'name'],
});

ohmEditor.examples = new CheckedEmitter();
ohmEditor.examples.registerEvents({
  'add:example': ['id'],
  'set:example': ['id', 'oldValue', 'newValue'],
  'set:selected': ['id'],
  'remove:example': ['id'],
});

ohmEditor.ui = {
  inputEditor: null, // Initialized in example-list.vue.
  grammarEditor: CodeMirror(
    document.querySelector('#grammarContainer .editorWrapper')
  ),
};

ohmEditor.defaultGrammar = () => {
  if (ohmEditor.grammars) {
    // Return the last grammar that was defined.
    const grammarArray = Object.values(ohmEditor.grammars);
    return grammarArray[grammarArray.length - 1];
  }
};

function updateCurrentGrammarAndStartRule() {
  const {grammars} = ohmEditor;
  const example = ohmEditor.examples.getSelected();

  let currentGrammar = null;
  if (example && grammars && Object.values(grammars).length > 0) {
    const {selectedGrammar} = example;
    currentGrammar = selectedGrammar
      ? grammars[selectedGrammar]
      : ohmEditor.defaultGrammar();
  }

  if (ohmEditor.currentGrammar !== currentGrammar) {
    ohmEditor.currentGrammar = currentGrammar;
    ohmEditor.emit('set:currentGrammar', ohmEditor.currentGrammar);
  }

  if (example) {
    ohmEditor.startRule = example.startRule;
    ohmEditor.emit('set:startRule', ohmEditor.startRule);
  }
}

ohmEditor.examples.addListener('set:selected', (id) => {
  updateCurrentGrammarAndStartRule();
});
ohmEditor.examples.addListener('set:example', (id, oldValue, newValue) => {
  updateCurrentGrammarAndStartRule();
});

ohmEditor.addListener('parse:grammars', (result, grammars, err) => {
  ohmEditor.grammars = grammars;
  updateCurrentGrammarAndStartRule();
});

ohmEditor.emit('init:grammarEditor', ohmEditor.ui.grammarEditor);
