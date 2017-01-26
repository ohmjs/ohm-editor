/* eslint-env browser */

'use strict';

// TODO: handle invalid grammar in textbox

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

    Array.prototype.forEach.call(inputList.children, function(childNode) {
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
