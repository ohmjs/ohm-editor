/* eslint-env browser */
/* global CheckedEmitter */

'use strict';

var ohmEditor = require('./ohmEditor');
var domUtil = require('./domUtil');

var idCounter = 0;
var selectedId = -1;
var exampleValues = Object.create(null);

// Exports
// -------

ohmEditor.examples = Object.assign(new CheckedEmitter(), {
  addExample: addExample,
  getExample: getExample,
  getExamples: getExamples,
  setExample: setExample,
  setSelected: setSelected,
  getSelected: getSelected,
  saveExamples: saveExamples
});

// each of these events is emitted after the action they refer to
//   takes place. For example, 'add:example' is emitted after an
//   example is added to the list.
ohmEditor.examples.registerEvents({
  'add:example': ['id'],
  'set:example': ['id', 'oldValue', 'newValue'],
  'set:selected': ['id'],
  'remove:example': ['id']
});

module.exports = {
  restoreExamples: restoreExamples,
  getExamples: getExamples
};

// Helpers
// -------

function uniqueId() {
  return 'example-' + idCounter++;
}

function handleMouseDown(e) {
  var li = e.target.closest('li.example');
  setSelected(li.id);
}

function checkExample(id) {
  var example;
  try {
    example = getExample(id);
  } catch (e) {
    return; // FIXME
  }
  var text = example.text;
  var startRule = example.startRule;
  var el = getListEl(id);
  var succeeded;
  try {
    var matchResult = ohmEditor.grammar.match(text, startRule);
    succeeded = matchResult.succeeded();
  } catch (e) {
    succeeded = false;
  }
  el.classList.toggle('pass', succeeded === example.shouldMatch);
  el.classList.toggle('fail', !succeeded === example.shouldMatch);
}

function getListEl(exampleId) {
  return domUtil.$('#' + exampleId);
}

// Add a new example to the list, and return its ID.
function addExample() {
  var li = domUtil.createElement('li.example');
  var id = li.id = uniqueId();
  li.onmousedown = handleMouseDown;

  var codeEl = li.appendChild(domUtil.createElement('code'));
  var exampleTextEl = codeEl.appendChild(domUtil.createElement('span.code'));
  var startRuleEl = codeEl.appendChild(domUtil.createElement('span.startRule'));

  exampleTextEl.onmousedown = handleMouseDown;
  startRuleEl.onmousedown = handleMouseDown;

  exampleValues[id] = {
    text: '',
    startRule: null
  };

  var sign = li.appendChild(domUtil.createElement('div.sign'));
  sign.onmousedown = function(e) {
    e.stopPropagation();  // Prevent selection.
  };
  sign.onclick = function() { // flip orientation
    exampleValues[id].shouldMatch = !exampleValues[id].shouldMatch;
    setExample(id, exampleValues[id].text, exampleValues[id].startRule,
      exampleValues[id].shouldMatch);
    saveExamples();
  };
  exampleValues[id].shouldMatch = true;

  var del = li.appendChild(domUtil.createElement('div.delete'));
  del.innerHTML = '&#x2716;';
  del.onmousedown = function(e) {
    e.stopPropagation();  // Prevent selection.
  };
  del.onclick = function() {
    var elToSelect = li.previousSibling || li.nextSibling;
    li.remove();
    delete exampleValues[id];
    saveExamples();
    if (selectedId === id) {
      setSelected(elToSelect ? elToSelect.id : -1);
    }

    ohmEditor.examples.emit('remove:example', id);
  };

  domUtil.$('#exampleContainer ul').appendChild(li);
  ohmEditor.ui.inputEditor.focus();

  ohmEditor.examples.emit('add:example', id);

  return id;
}

// Return the contents of the example with the given id.
function getExample(id) {
  if (!(id in exampleValues)) {
    throw new Error(id + ' is not a valid example id');
  } else {
    return exampleValues[id];
  }
}

// Return the dicationary of all examples. Used in
//   'exampleGenerationRequests.js'
function getExamples() {
  return exampleValues;
}

// Set the contents of an example the given id to `value`.
function setExample(id, text, optStartRule, shouldMatch) {
  if (!(id in exampleValues)) {
    throw new Error(id + ' is not a valid example id');
  }

  var startRule = optStartRule || null;
  var oldValue = exampleValues[id];
  var value = exampleValues[id] = {
    text: text,
    startRule: startRule,
    shouldMatch: shouldMatch
  };

  var listItem = getListEl(id);
  var code = listItem.querySelector('code > span.code');
  var startRuleEl = listItem.querySelector('code > span.startRule');
  var sign = listItem.querySelector('div.sign');

  code.startRule = startRule;
  code.parentElement.classList.remove('pass', 'fail');
  setTimeout(checkExample.bind(null, id), 0);
  if (value.text.length > 0) {
    code.textContent = text;
  } else {
    code.innerHTML = '&nbsp;';
  }

  if (startRule !== null) {
    startRuleEl.textContent = startRule;
  } else {
    startRuleEl.textContent = '';
  }

  if (value.shouldMatch) {
    sign.innerHTML = '&#x1F44D;';
    sign.setAttribute('title', 'Example should pass');
  } else {
    sign.innerHTML = '&#x1F44E;';
    sign.setAttribute('title', 'Example should fail');
  }

  ohmEditor.examples.emit('set:example', id, oldValue, value);
}

function getSelected() {
  if (selectedId !== -1) {
    return exampleValues[selectedId];
  } else {
    return null;
  }
}

// Select the example with the given id.
function setSelected(id) {
  var el;
  var value = {
    text: '',
    startRule: null
  };
  var inputEditor = ohmEditor.ui.inputEditor;
  if (id !== -1) {
    value = getExample(id);
    el = getListEl(id);
  }
  selectedId = id;

  inputEditor.setValue(value.text);

  // Update the DOM.
  var current = domUtil.$('#exampleContainer .selected');
  if (current !== el) {
    if (current) {
      current.classList.remove('selected');
    }
    if (el) {
      el.classList.add('selected');
    }
  }

  inputEditor.getWrapperElement().hidden = !el;
  inputEditor.focus();

  ohmEditor.examples.emit('set:selected', id);
}

// Restore the examples from localStorage or the given object.
function restoreExamples(key /* orExamples */) {
  var examples = [];
  if (typeof key === 'string') {
    var value = localStorage.getItem(key);
    if (value) {
      examples = JSON.parse(value);
    } else {
      examples = domUtil.$$('#sampleExamples pre').map(function(elem) {
        return {
          text: elem.textContent,
          startRule: null
        };
      });
    }
  } else {
    examples = key;
  }

  // remove previous examples
  domUtil.$$('#exampleContainer ul li.example').forEach(function(li) {
    delete exampleValues[li.id];
    li.remove();
  });

  examples.forEach(function(ex) {
    if (!ex.hasOwnProperty('shouldMatch')) {
      ex.shouldMatch = true;
    }
    setExample(addExample(), ex.text, ex.startRule, ex.shouldMatch);
  });

  // Select the first example.
  var firstEl = domUtil.$('#exampleList li:first-child');
  var firstId = firstEl ? firstEl.id : -1;
  setSelected(firstId);
}

// Save the current contents of all examples to localStorage.
function saveExamples() {
  localStorage.setItem('examples', JSON.stringify(
    Object.keys(exampleValues).map(function(key) {
      return exampleValues[key];
    })
  ));
}

// Main
// ----

domUtil.$('#addExampleButton').onclick = function(e) {
  setSelected(addExample());
};

var uiSave = function(cm) {
  if (selectedId) {
    var selectEl = domUtil.$('#startRuleDropdown');
    var value = cm.getValue();
    var startRule = selectEl && selectEl.options[selectEl.selectedIndex].value;
    var shouldMatch = exampleValues[selectedId].shouldMatch;
    setExample(selectedId, value, startRule, shouldMatch);
    saveExamples();
  }
};

ohmEditor.ui.inputEditor.setOption('extraKeys', {
  'Cmd-S': uiSave,
  'Ctrl-S': uiSave
});

ohmEditor.addListener('parse:grammar', function(matchResult, grammar, err) {
  Object.keys(exampleValues).forEach(function(id) {
    var el = getListEl(id);
    if (err) {
      el.classList.remove('pass', 'fail');
    } else {
      checkExample(id);
    }
  });
});

// Hide the inputEditor by default, only showing it when there is a selected example.
ohmEditor.ui.inputEditor.getWrapperElement().hidden = true;

restoreExamples('examples');
