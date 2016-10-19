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

  var addButton = $('#addSemanticButton');
  var semanticsContainer = $('#semantics');

  // Check if a name is a restrict JS identifier
  // TODO: it less restrictive in the future
  function isNameValid(name) {
    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
  }

  // Parse the operation signature to an object that specifies its type, name, and
  // possible arguments.
  function parseSemanticSignature(signature) {
    var info = Object.create(null);
    var leftParentIdx = signature.indexOf('(');
    var rightParentIdx = signature.lastIndexOf(')');
    if (leftParentIdx === -1 ||
      rightParentIdx === -1 ||
      leftParentIdx > rightParentIdx ||
      rightParentIdx !== signature.length - 1) {
      // If the signature doesn't contain parentheses, or the parentheses it contains is not
      // in valid position, set its type as `Attribute`.
      info.type = 'Attribute';
      info.name = signature;
    } else {
      info.type = 'Operation';
      info.name = signature.substring(0, leftParentIdx);
      info.arguments = Object.create(null);
      var args = signature.substring(leftParentIdx + 1, rightParentIdx).split(',');
      if (args.length > 1) {
        args.forEach(function(arg) {
          if (!isNameValid(arg)) {
            throw new Error('"' + arg + '" is not a valid argument name.');
          }
          info.arguments[arg] = undefined;
        });
      }
    }
    if (!isNameValid(info.name)) {
      throw new Error('"' + info.name + '" is not a valid' + info.type + ' name.');
    }
    return info;
  }

  // Update the semantics panel base on the operation that been selected.
  function selectSemantic(container) {
    var preSelected = semanticsContainer.querySelector('.selected');
    if (preSelected) {
      preSelected.classList.remove('selected');
    }
    container.classList.add('selected');
    ohmEditor.semantics.emit('select:operation', container._operation);
  }

  // Create a button for the given semantic operation.
  function createSemanticContainer(signature, name) {
    var container = domUtil.createElement('.opName', signature);
    container._operation = name;
    container.onclick = function(event) {
      $('#semanticsContainer .editorWrapper').innerHTML = '';
      if (container.classList.contains('selected')) {
        container.classList.remove('selected');
      } else {
        selectSemantic(container);
      }

      ohmEditor.parseTree.refresh();
    };
    return container;
  }

  // Add a semantic button to replace the input box that generated for creating new operation.
  function addSemantic(semanticsInputBox) {
    var value = semanticsInputBox.value;

    var semanticInfo = parseSemanticSignature(value);
    var type = semanticInfo.type;
    var name = semanticInfo.name;
    var args = semanticInfo.arguments;
    ohmEditor.semantics.emit('add:operation', type, name, args);

    var sContainer = createSemanticContainer(value, name);
    selectSemantic(sContainer);
    semanticsContainer.replaceChild(sContainer, semanticsInputBox);
  }

  // When click on the add button, create an input box for adding new operation.
  addButton.onclick = function(event) {
    // Return directly if there is an input box already.
    if (semanticsContainer.querySelector('textarea.opName')) {
      semanticsContainer.querySelector('textarea.opName').focus();
      return;
    }

    var semanticsInputBox = domUtil.createElement('textarea.opName');
    semanticsInputBox.cols = 15;
    semanticsInputBox.addEventListener('keydown', function(e) {
      var key = e.code;
      if (key === 'Enter' || key === 'Space' || key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
      } else {
        semanticsInputBox.cols = Math.max(semanticsInputBox.value.length, 15);
      }

      if (key === 'Enter') {
        try {
          addSemantic(semanticsInputBox);
        } catch (error) {
          semanticsInputBox.select();
          window.alert(error);    // eslint-disable-line no-alert
          return;
        }
      }
    });

    semanticsInputBox.addEventListener('click', function(event) {
      semanticsInputBox.classList.add('selected');
    });

    semanticsContainer.appendChild(semanticsInputBox);
    semanticsInputBox.focus();
  };
});
