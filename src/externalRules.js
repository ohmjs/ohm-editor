/* eslint-env browser */
/* global ohm */

import {containsInterval} from './cmUtil';
import {$, $$} from './domUtil';
import ohmEditor from './ohmEditor';
import {isPrimitiveRule} from './traceUtil';

const ohmGrammar = ohm.ohmGrammar;
const builtInRules = ohm.grammar('G {}').superGrammar;

function extend(origin, add) {
  if (!add || typeof add !== 'object') {
    return origin;
  }

  const keys = Object.keys(add);
  let i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
}

function combineChildResults(attr) {
  return function (...children) {
    return children.reduce(function (acc, child) {
      return extend(acc, child[attr]);
    }, {});
  };
}

const semantics = ohmGrammar.createSemantics();

// An attribute for collecting all of the rule names referenced within a grammar.
// Returns an object whose own properties represent all the referenced rule names.
semantics.addAttribute('referencedRules', {
  Base_application(ident, args) {
    const ans = {};
    ans[ident.sourceString] = true;
    return extend(ans, args.referencedRules);
  },
  _iter: combineChildResults('referencedRules'),
  _nonterminal: combineChildResults('referencedRules'),
  _terminal() {
    return {};
  },
});

// An attribute for collecting all of the identifiers found in a (possibly invalid) grammar.
// Returns an object whose own properties represent all the identifiers found in the source.
semantics.addAttribute('identifiers', {
  ident(_) {
    const ans = {};
    ans[this.sourceString] = true;
    return ans;
  },
  _iter: combineChildResults('identifiers'),
  _nonterminal: combineChildResults('identifiers'),
  _terminal() {
    return {};
  },
});

function getBuiltInRuleDefinition(ruleName) {
  const ruleInfo = builtInRules.rules[ruleName];
  let ans = ruleName;

  if (ruleInfo.formals.length > 0) {
    ans += '<' + ruleInfo.formals.join(', ') + '>';
  }

  if (ruleInfo.description) {
    ans += ' (' + ruleInfo.description + ')';
  }
  ans += ' = ';

  if (isPrimitiveRule(builtInRules, ruleName)) {
    ans += '/* primitive rule */';
  } else {
    const body = ruleInfo.body;
    ans += body.source ? body.source.contents : body.toString();
  }

  return ans;
}

// Returns an object whose keys represent all externally-defined rules which
// are referenced in the Ohm grammar represented by `matchResult`.
function getExternalRules(rulesObj) {
  const ans = {};
  const ruleNames = Object.keys(rulesObj);

  // Always include `space` and `spaces` when the "Show spaces" option is enabled.
  if (ohmEditor.options.showSpaces) {
    ruleNames.push('space');
    ruleNames.push('spaces');
  }
  ruleNames.sort(); // Sort to ensure a stable order.

  ruleNames.forEach(function (name) {
    if (name in builtInRules.rules) {
      ans[name] = getBuiltInRuleDefinition(name);
    }
  });

  return ans;
}

// Implements a line widget that is always associated with the last line in
// the document, no matter what edits are made.
function LastLineWidget(editor) {
  this.editor = editor;
  this.node = $('#protos .externalRules').cloneNode(true);
  this.widget = null;

  // Create a bound version of `_placeWidget` for use with on() and off().
  this.placeWidget = this._placeWidget.bind(this);

  // Place the widget for the first time.
  this._placeWidget(null);
}

LastLineWidget.prototype._placeWidget = function () {
  if (this.widget) {
    this.clear();
  }
  const cm = this.editor;

  // Add the widget on the current last line.
  const lineHandle = (this.lineHandle = cm.getLineHandle(cm.lastLine()));
  this.widget = cm.addLineWidget(lineHandle, this.node);

  // Register for change/delete events on the line.
  // 'change' because the handle is associated with the beginning of the line, and if
  // the user inserts a newline somewhere after the beginning, the handle will no longer
  // refer to the last line in the document.
  lineHandle.on('change', this.placeWidget);
  lineHandle.on('delete', this.placeWidget);
};

LastLineWidget.prototype.clear = function () {
  this.widget.clear();
  this.lineHandle.off('change', this.placeWidget);
  this.lineHandle.off('delete', this.placeWidget);
};

LastLineWidget.prototype.update = function (cm, matchResult) {
  if (matchResult.succeeded()) {
    this._rules = getExternalRules(semantics(matchResult).referencedRules);
  } else {
    const lenientResult = ohmGrammar.match(cm.getValue(), 'tokens');
    this._rules = getExternalRules(semantics(lenientResult).identifiers);
  }

  const container = this.node.querySelector('.content');
  container.textContent = '';

  // eslint-disable-next-line guard-for-in
  for (const ruleName in this._rules) {
    const pre = document.createElement('pre');
    pre.id = 'externalRules-' + ruleName;
    pre.textContent = this._rules[ruleName] + '\n';
    container.appendChild(pre);
  }
};

const grammarEditor = ohmEditor.ui.grammarEditor;

// Singletons associated with the current grammar (ok since there's only one grammar editor).
let widget;
let grammarMatchResult;

function updateExternalRules() {
  widget.update(grammarEditor, grammarMatchResult);
}

grammarEditor.on('swapDoc', function (cm) {
  widget = new LastLineWidget(cm);
});

ohmEditor.addListener('parse:grammars', function (matchResult, grammars, err) {
  grammarMatchResult = matchResult;
  updateExternalRules();
});

ohmEditor.addListener('change:option', function (name) {
  if (name === 'showSpaces') {
    updateExternalRules();
  }
});

ohmEditor.addListener('peek:ruleDefinition', function (grammar, ruleName) {
  const cm = ohmEditor.ui.grammarEditor;
  const defInterval = grammar.rules[ruleName].source;
  if (defInterval && !containsInterval(cm, defInterval)) {
    const elem = $('#externalRules-' + ruleName);
    if (elem) {
      elem.classList.add('active-definition');
    }
  }
});

ohmEditor.addListener('unpeek:ruleDefinition', function () {
  $$('.externalRules pre').forEach(function (elem) {
    elem.classList.remove('active-definition');
  });
});
