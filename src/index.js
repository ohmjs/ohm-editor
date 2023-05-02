/* eslint-env browser */
/* global CodeMirror, ohm, ohmExtras */

import {$, $$, createElement} from './domUtil.js';
import ohmEditor from './ohmEditor.js';

// TODO: Ideally these modules wouldn't do all their work as side effects.
import './editorErrors.js';
import {mainLayout} from './mainLayout.js';
import './externalRules.js';
import './parseTree.js';
import './ruleHyperlinks.js';
import './searchBar.js';

let grammarChanged = true;
let inputChanged = true;

let showFailuresImplicitly = true;

let grammarMatcher = ohm.ohmGrammar.matcher();

const urlParams = new URLSearchParams(window.location.search);

const enableInlineExamples = urlParams.get('examples') === 'inline';

// Helpers
// -------

function parseGrammars() {
  let err;
  const grammars = {};
  const matchResult = grammarMatcher.match();
  let examples = [];
  if (matchResult.succeeded()) {
    try {
      ohm._buildGrammar(matchResult, grammars);
    } catch (ex) {
      err = ex;
    }
    if (enableInlineExamples) {
      examples = ohmExtras.extractExamples(
        ohmEditor.ui.grammarEditor.getValue()
      );
    }
  } else {
    err = {
      message: matchResult.message,
      shortMessage: matchResult.shortMessage,
      interval: matchResult.getInterval(),
    };
  }
  return {
    matchResult,
    grammars,
    examples,
    err,
  };
}

// Return the name of a valid start rule for grammar, or null if `optRuleName` is
// not valid and the grammar has no default starting rule.
function getValidStartRule(grammar, ruleName = '') {
  if (ruleName && ruleName in grammar.rules) {
    return ruleName;
  }
  if (grammar.defaultStartRule) {
    return grammar.defaultStartRule;
  }
  return null;
}

function refresh() {
  const {grammarEditor} = ohmEditor.ui;
  const {inputEditor} = ohmEditor.ui;

  const grammarSource = grammarEditor.getValue();
  const inputSource = inputEditor.getValue();
  ohmEditor.saveState(inputEditor, 'input');

  // Refresh the option values.
  for (let i = 0; i < checkboxes.length; ++i) {
    const checkbox = checkboxes[i];
    ohmEditor.options[checkbox.name] = checkbox.checked;
  }

  if (inputChanged || grammarChanged) {
    showFailuresImplicitly = true; // Reset to default.
  }

  if (inputChanged) {
    inputChanged = false;
    ohmEditor.emit('change:input', inputSource);
  }

  if (grammarChanged) {
    grammarChanged = false;
    ohmEditor.emit('change:grammars', grammarSource);

    const {matchResult, grammars, examples, err} = parseGrammars();
    ohmEditor.emit('parse:grammars', matchResult, grammars, examples, err);

    if (enableInlineExamples) {
      ohmEditor.examples.restoreExamples(
        examples.map(({example, grammar, rule, shouldMatch}) => {
          return {
            text: example,
            startRule: rule,
            selectedGrammar: grammar,
            shouldMatch,
          };
        })
      );
    }
  }
  const {currentGrammar} = ohmEditor;
  if (currentGrammar) {
    const startRule = getValidStartRule(currentGrammar, ohmEditor.startRule);
    if (startRule) {
      const trace = currentGrammar.trace(inputSource, startRule);

      // When the input fails to parse, turn on "show failures" automatically.
      if (showFailuresImplicitly) {
        const checked = ($('input[name=showFailures]').checked =
          trace.result.failed());
        ohmEditor.options.showFailures = checked;
      }

      ohmEditor.emit('parse:input', trace.result, trace);
    }
  }
}

ohmEditor.setGrammar = function (grammar) {
  if (grammar === null) {
    // load from local storage or default element
    grammar = localStorage.getItem('grammar');
    if (!grammar || grammar === '') {
      grammar = $('#sampleGrammar').textContent; // default element
    }
  }
  const doc = CodeMirror.Doc(grammar, 'ohm');
  ohmEditor.ui.grammarEditor.swapDoc(doc);
};

ohmEditor.saveState = function (editor, key) {
  localStorage.setItem(key, editor.getValue());
};

function initializeLayout() {
  const {body} = document;

  // When embedded:
  // - examples pane is closed by default
  // - don't enable persistence features.
  if (urlParams.get('embed') === 'true') {
    mainLayout.toggleExamplesCollapsed(true);
    body.classList.add('embedded');
  } else {
    const scriptEl = document.createElement('script');
    scriptEl.src = 'assets/persistence-bundle.js';
    body.appendChild(scriptEl);
  }

  // Allow the grammar to be specified in the URL.
  if (urlParams.has('jsGrammar')) {
    const {prefix, grammar, suffix} = extractJsGrammar(
      urlParams.get('jsGrammar')
    );

    ohmEditor.setGrammar(grammar);

    const {grammarEditor} = ohmEditor.ui;
    const topWidget = createElement('.fakeJsDecl');
    topWidget.appendChild(createElement('pre', prefix));
    grammarEditor.addLineWidget(0, topWidget, {above: true});

    const bottomWidget = createElement('.fakeJsDecl');
    bottomWidget.appendChild(createElement('pre', suffix));
    grammarEditor.addLineWidget(grammarEditor.doc.size - 1, bottomWidget, {
      insertAt: 0,
    });
  }

  if (urlParams.has('readOnly')) {
    let readOnly = urlParams.get('readOnly');
    if (readOnly === 'true') {
      readOnly = true; // Convert to boolean
    }
    ohmEditor.ui.grammarEditor.setOption('readOnly', readOnly);
  }

  if (urlParams.get('showExternalRules') === 'false') {
    body.classList.add('noExternalRules');
  }
}

// To support grammars that are directly embedded in JS code, this function
// can extract a grammar from a string literal. For example:
//
//   const g = String.raw`
//     G {
//       ...
//     }
//   `;
const extractJsGrammar = (() => {
  const g = ohm.grammar(
    String.raw`
    GrammarInStringLiteral <: Ohm {
      Declaration
        = LetOrConst ident "=" "String.raw"? backtickStringLiteral sc?

      LetOrConst = let | const

      backtickStringLiteral = openTick rawStringChar* closeTick
      openTick = "\x60" "\n"?
      closeTick = "\n"? "\x60"
      rawStringChar = ~closeTick any

      const = "const" &space
      let = "let" &space
      sc = ";"
    }
  `,
    {Ohm: ohm.ohmGrammar}
  );

  const semantics = g.createSemantics().addOperation('extract', {
    Declaration(letOrConst, ident, eq, raw, stringLiteral, sc) {
      return {
        grammar: stringLiteral.extract(),
        prefix:
          [letOrConst, ident, eq, raw].map(n => n.sourceString).join(' ') +
          '`',
        suffix: '`;',
      };
    },
    backtickStringLiteral(_open, rawStringCharIter, _close) {
      return rawStringCharIter.sourceString;
    },
  });

  return code => {
    const m = g.match(code, 'Declaration');
    if (!m.succeeded()) {
      throw new Error(m.message);
    }
    return semantics(m).extract();
  };
})();

// Main
// ----

let refreshTimeout;
function triggerRefresh(delay) {
  if (refreshTimeout) {
    clearTimeout(refreshTimeout);
  }
  refreshTimeout = setTimeout(refresh.bind(ohmEditor), delay || 0);
}

function resetGrammarMatcher() {
  grammarMatcher = ohm.ohmGrammar.matcher();
  grammarMatcher.setInput(ohmEditor.ui.grammarEditor.getValue());
}

const checkboxes = $$('#options input[type=checkbox]');
checkboxes.forEach(cb => {
  cb.addEventListener('click', e => {
    const optionName = cb.name;

    // Respect the user's wishes if they automatically enable/disable "show failures".
    if (optionName === 'showFailures') {
      showFailuresImplicitly = false;
    }
    ohmEditor.options[optionName] = cb.checked;
    ohmEditor.emit('change:option', e.target.name);
    triggerRefresh();
  });
});

if (!urlParams.has('jsGrammar')) {
  ohmEditor.setGrammar(null /* restore local storage */);
}

ohmEditor.ui.inputEditor.on('change', cm => {
  inputChanged = true;
  ohmEditor.emit('change:inputEditor', cm);
  triggerRefresh(250);
});

ohmEditor.ui.grammarEditor.on('beforeChange', (cm, change) => {
  grammarMatcher.replaceInputRange(
    cm.indexFromPos(change.from),
    cm.indexFromPos(change.to),
    change.text.join('\n')
  );
});

ohmEditor.ui.grammarEditor.on('swapDoc', resetGrammarMatcher);

ohmEditor.ui.grammarEditor.on('change', (cm, change) => {
  grammarChanged = true;
  ohmEditor.emit('change:grammarEditor', cm);
  triggerRefresh(250);
});
ohmEditor.ui.grammarEditor.on('swapDoc', cm => {
  grammarChanged = true;
  ohmEditor.emit('change:grammarEditor', cm);
  triggerRefresh(250);
});

ohmEditor.addListener('set:currentGrammar', grammar => {
  triggerRefresh();
});
ohmEditor.addListener('set:startRule', ruleName => {
  triggerRefresh();
});

window.ohmEditor = ohmEditor;

/* eslint-disable no-console */
console.log(
  '%cOhm visualizer',
  'color: #e0a; font-family: Avenir; font-size: 18px;'
);
console.log(
  [
    '- `ohm` is the Ohm library',
    '- `ohmEditor` is editor object with',
    '  `.grammar` as the current grammar object (if the source is valid)',
    '  `.ui` containing the `inputEditor` and `grammarEditor`',
    '',
    `Ohm version ${ohm.version}`,
  ].join('\n')
);
/* eslint-enable no-console */

initializeLayout();
resetGrammarMatcher();
refresh();
