/* eslint-env browser */

'use strict';

// TODO: handle invalid grammar in textbox

var ohmEditor = require('./ohmEditor');
var domUtil = require('./domUtil');
var exampleWorkerManager = require('./exampleWorkerManager');

var neededExamples = [];

var focusedElement = null;
var focusedRuleName = '';

var timeout = null;
exampleWorkerManager.addListener('received:neededExamples', function(updatedNeededExamples) {
  if (timeout) {
    clearTimeout(timeout);
  }

  timeout = setTimeout(function() {
    // var neededExampleList = domUtil.$('#exampleRequests ul');
    var inputList = domUtil.$('#neededExamples > ul');

    neededExamples = updatedNeededExamples;

    Array.prototype.slice.call(inputList.children)
      .forEach(function(childNode) {
        if (childNode.firstChild !== focusedElement) {
          inputList.removeChild(childNode);
        }
      });

    neededExamples.filter(function(ruleName) {
      return ruleName !== focusedRuleName;
    }).forEach(function(ruleName) {
      inputList.appendChild(domUtil.createElement('li', ruleName));
    });
  }, 200);
});

exampleWorkerManager.addListener('received:neededExamples', function(updatedNeededExamples) {
  var inputList = domUtil.$('#neededExamples > ul');
  var startRuleDropdown = domUtil.$('#startRuleDropdown');

  var startRule = ohmEditor.examples.getSelected().startRule;

  if (startRuleDropdown) {
    startRuleDropdown.parentElement.removeChild(startRuleDropdown);
  }
  inputList.parentElement.insertBefore(
    makeStartRuleDropdown(ohmEditor.grammar, neededExamples, startRule), inputList
  );
});

ohmEditor.examples.addListener('set:selected', function(id) {
  try {
    var value = ohmEditor.examples.getExample(id);
  } catch (e) {
    return;
  }
  var inputList = domUtil.$('#neededExamples > ul');
  var startRuleDropdown = domUtil.$('#startRuleDropdown');
  var startRule = value.startRule;

  if (startRuleDropdown) {
    startRuleDropdown.parentElement.removeChild(startRuleDropdown);
  }
  inputList.parentElement.insertBefore(
    makeStartRuleDropdown(ohmEditor.grammar, neededExamples, startRule), inputList
  );

  ohmEditor.startRule = value.startRule;
});

function makeStartRuleDropdown(grammar, neededExamples, optStartRule) {
  var startRule = optStartRule || null;
  var dropdown = domUtil.createElement('select');
  dropdown.id = 'startRuleDropdown';

  Object.keys(grammar.rules).forEach(function(ruleName) {
    var item = domUtil.createElement('option', ruleName);
    item.value = ruleName;

    if (neededExamples.includes(ruleName)) {
      item.classList.add('needed');
    }

    dropdown.appendChild(item);
  });

  if (startRule !== null) {
    var option = Array.prototype.find.call(
      dropdown.options,
      function(option) { return option.value === startRule; }
    );
    if (option) {
      option.selected = true;
    }
  }

  return dropdown;
}
