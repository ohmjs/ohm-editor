/* eslint-env browser */

'use strict';

(function(root, initModule) {
  if (typeof exports === 'object') {
    module.exports = initModule;
  } else {
    initModule(root.ohmEditor, root.domUtil);
  }
})(this, function(ohmEditor, domUtil) {

  // Privates
  // --------
  var $ = domUtil.$;
  var $$ = domUtil.$$;

  var editorWrapper = $('#semanticsContainer .editorWrapper');

  function showSemanticsEditor(type, name) {
    var editor = editorWrapper.querySelector('#' + name);
    if (editor && editor.classList.contains(type)) {
      var cm = editor.querySelector('.body').firstChild.CodeMirror;
      cm.setCursor({line: cm.lineCount()});
      cm.refresh();
      cm.focus();
    } else {
      ohmEditor.semantics.emit('add:semanticEditor', type, name);
    }
  }
  ohmEditor.parseTree.addListener('cmdOrCtrlClick:traceElement', function(wrapper) {
    var selfWrapper = wrapper.querySelector('.self');
    if (selfWrapper.parentElement !== wrapper) {
      return false;
    }
    selfWrapper.classList.add('selected');
    if ($('.self.selected')) {
      $('.self.selected').classList.remove('selected');
    }
    showSemanticsEditor('rule', wrapper._traceNode.bindings[0].ctorName);
  });

  // Suggestion List
  // ---------------

  // Get the list of rules that start with given prefix.
  function retrieveMatchedRules(prefix) {
    var ruleDict = ohmEditor.grammar.rules;
    return Object.keys(ruleDict).filter(function(rule) {
      return rule.startsWith(prefix);
    });
  }

  // Update the semantics `editorWrapper` base on selection on suggestion list.
  function handleEntrySelection() {
    var entry = $('#suggestions .selected');
    var name = entry._name;
    var type = entry.classList.contains('helper') ? 'helper' : 'rule';
    showSemanticsEditor(type, name);
  }

  // Display a list of suggested editor name base on the given prefix. The position of the list
  // is specified by the `pos` argument.
  function showSuggestions(prefix, pos) {
    hideSuggestions();

    var suggestionList = $('body').appendChild(domUtil.createElement('div'));
    suggestionList.onmouseover = function(event) {
      updateSuggestionHighlight(event.target);
    };
    suggestionList.onmousedown = function(event) {
      handleEntrySelection();
    };
    suggestionList.id = 'suggestions';
    suggestionList.style.left = pos.left + 'px';
    suggestionList.style.top = pos.top + 'px';

    // If the prefix is not empty, add an entry to the list that represent a helper function named
    // as the prefix.
    if (prefix) {
      var helperEntry = suggestionList.appendChild(domUtil.createElement('entry.helper', prefix));
      helperEntry.appendChild(domUtil.createElement('span.case', 'a helper function'));
      helperEntry._name = prefix;
    }

    // Add all the rules that started with the prefix to the suggestion list.
    var matchedRules = retrieveMatchedRules(prefix);
    matchedRules.forEach(function(ruleKey) {
      var ruleParts = ruleKey.split('_');
      var entry = suggestionList.appendChild(domUtil.createElement('entry.rule', ruleParts[0]));
      if (ruleParts.length > 1) {
        entry.appendChild(domUtil.createElement('span.case', ruleParts[1]));
      }
      entry._name = ruleKey;
    });

    // By default, the first entry of the list is selected.
    if (suggestionList.children.length > 0) {
      suggestionList.firstChild.classList.add('selected');
    }
  }

  // Remove the suggestion list.
  function hideSuggestions() {
    if ($('#suggestions')) {
      $('#suggestions').parentElement.removeChild($('#suggestions'));
    }
  }

  // Update the selected entry of the suggestion list to the given entry.
  // If the entry is a string, updated the entry selection to the previous,
  // or next of current selected entry accroding to the entry's contents.
  function updateSuggestionHighlight(entry) {
    var currentEntry = $('#suggestions .selected');
    var selectedEntry;
    if (entry === 'pre') {
      selectedEntry = currentEntry.previousElementSibling || currentEntry;
    } else if (entry === 'next') {
      selectedEntry = currentEntry.nextElementSibling || currentEntry;
    } else {
      selectedEntry = domUtil.closestElementMatching('entry', entry);
    }

    if (currentEntry) {
      currentEntry.classList.remove('selected');
    }
    if (selectedEntry) {
      selectedEntry.classList.add('selected');
      selectedEntry.scrollIntoView(false);
    }
  }

  // EditorWrapper Contents
  // ----------------------

  // Create a input box and a add button for adding new editor to semantics editorWrapper.
  function createAdditionEntry() {
    var entry = domUtil.createElement('.addition');
    var inputBox = entry.appendChild(domUtil.createElement('textarea'));
    var button = entry.appendChild(domUtil.createElement('button', 'add'));
    inputBox.onclick = function(event) { 
      var inputBoxRect = inputBox.getBoundingClientRect();
      var pos = {left: inputBoxRect.left, top: inputBoxRect.bottom};
      showSuggestions(inputBox.value, pos);
    };
    inputBox.onkeyup = function(event) {
      var code = event.code;
      var inputBoxRect = inputBox.getBoundingClientRect();
      var pos = {left: inputBoxRect.left, top: inputBoxRect.bottom};
      if (code !== 'Enter' && code !== 'Esc' && code !== 'ArrowUp' && code !== 'ArrowDown') {
        showSuggestions(inputBox.value, pos);
      }
    };
    inputBox.onkeydown = function(event) {
      var code = event.code;
      if (code === 'Enter' || code === 'Esc') {
        event.preventDefault();
        var entry = $('#suggestions entry.selected');
        handleEntrySelection();
        inputBox.value = '';
        hideSuggestions();
      } else if (code === 'ArrowUp') {
        updateSuggestionHighlight('pre');
      } else if (code === 'ArrowDown') {
        updateSuggestionHighlight('next');
      }
    };
    inputBox.onblur = function(event) {
      hideSuggestions();
    };

    return entry;
  }

  // Load all the actions that already implemented for the operation.
  function loadSemantic(operation) {
    var actionDict = ohmEditor.semantics.getActionDict(operation);
    if (!actionDict) {
      return;
    }

    Object.keys(actionDict).forEach(function(key) {
      var action = actionDict[key];
      if (!action || action._isDefault || key === '_default') {
        return;
      }
      ohmEditor.semantics.emit('add:semanticEditor', 'rule', key);
    });
  }

  // Fill the semantics editorWrapper with an input box, and editors for all the
  // implemented actions.
  function fillEditorWrapper(operation) {
    editorWrapper.innerHTML = '';
    editorWrapper.appendChild(createAdditionEntry());
    loadSemantic(operation);
  }

  ohmEditor.semantics.addListener('select:operation', function(operationName) {
    fillEditorWrapper(operationName);
  });
});