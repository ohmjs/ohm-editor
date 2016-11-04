/* eslint-env browser */

'use strict';

(function(root, initModule) {
  if (typeof exports === 'object') {
    module.exports = initModule;
  } else {
    initModule(root.ohmEditor, root.domUtil, root.CodeMirror);
  }
})(this, function(ohmEditor, domUtil, CodeMirror) {

  // Privates
  // --------
  var $ = domUtil.$;
  var $$ = domUtil.$$;

  var semanticsContainer = $('#semantics');
  var editorWrapper = $('#semanticsContainer .editorWrapper');

  // TODO: Create a container for function signature
  function createFuncContainer(funcName) {
    // TODO
  }

  // Get the list of arguments for action of the specified rule.
  function retrieveActionArgs(ruleKey) {
    var operation = $('#semantics div.opName.selected')._operation;
    var action = ohmEditor.semantics.getAction(operation, ruleKey);
    return action ? action._actionArguments :
      ohmEditor.grammar.rules[ruleKey].body.toArgumentNameList(1);
  }

  function copyWithoutDuplicates(array) {
    var noDuplicates = [];
    array.forEach(function(entry) {
      if (noDuplicates.indexOf(entry) < 0) {
        noDuplicates.push(entry);
      }
    });
    return noDuplicates;
  }


  // Get the list of arguments for action of the specified rule.
  function getArgDisplayList(ruleExpr) {
    var argDisplayList = [];

    var iterOp = '';
    var lookaheadOp = '';
    if (ruleExpr instanceof ohm.pexprs.Iter) {
      // Treat `Iter` expression as an iteration on each of its sub-expression,
      // i.e.  `("a" "b")+` shown as `"a"+ "b"+`
      iterOp = ruleExpr.operator;
      ruleExpr = ruleExpr.expr;
    } else if (ruleExpr instanceof ohm.pexprs.Lookahead) {
      // Treat `Lookahead` expression as a lookahead on each of its sub-expression,
      // i.e. `&("a" "b")` shown as `&"a" &"b"`
      lookaheadOp = '&';
      ruleExpr = ruleExpr.expr;
    }

    if (ruleExpr instanceof ohm.pexprs.Seq) {
      ruleExpr.factors.forEach(function(factor) {
        var factorDisplayList = getArgDisplayList(factor).map(function(display) {
          return lookaheadOp + display + iterOp;
        });
        argDisplayList = argDisplayList.concat(factorDisplayList);
      });
    } else if (ruleExpr instanceof ohm.pexprs.Alt) {
      // Handle the `Alt` expression the same way as the `toArgNameList`, i.e.
      // split each list into columns, and combine argument displays for the same column
      // as a single argument.
      var termArgDisplayLists = ruleExpr.terms.map(function(term) {
        return getArgDisplayList(term);
      });
      var numArgs = termArgDisplayLists[0].length;
      for (var colIdx = 0; colIdx < numArgs; colIdx++) {
        var col = [];
        for (var rowIdx = 0; rowIdx < ruleExpr.terms.length; rowIdx++) {
          col.push(termArgDisplayLists[rowIdx][colIdx]);
        }
        var uniqueNames = copyWithoutDuplicates(col).join('|');
        if (lookaheadOp || iterOp) {
          uniqueNames = lookaheadOp + '(' + uniqueNames + ')' + iterOp;
        }
        argDisplayList.push(uniqueNames);
      }
    } else if (!(ruleExpr instanceof ohm.pexprs.Not)) {
      // We skip `Not` as it won't be a semantics action function argument.
      argDisplayList.push(lookaheadOp + ruleExpr.toDisplayString() + iterOp);
    }
    return argDisplayList;
  }

  function createArgDisplayContainer(display) {
    var container = domUtil.createElement('div');
    container.appendChild(domUtil.createElement('.display', display));

    // Shows or hides the argument editor by clicking the argument.
    container.addEventListener('click', function(e) {
      var realArgContainer = container.parentElement.querySelector('real');
      var shouldBeVisible = realArgContainer.style.display === 'none';
      realArgContainer.style.display = shouldBeVisible ? 'inline-block' : 'none';
      if (shouldBeVisible) {
        realArgContainer.focus();
      }
      e.stopPropagation();
    });

    return container;
  }

  // Create the DOM node that contains real action argument name
  function createRealArgContainer(display, real) {
    var container = domUtil.createElement('real');

    // Make the argument editor element editable
    container.setAttribute('contenteditable', true);
    container.addEventListener('keydown', function(e) {
      var code = e.code;
      if (code === 'Enter' || code === 'Space') {
        e.preventDefault();
      }
    });

    // Don't show argument name is if it's the same as its display
    container.textContent = display === real ? '' : real;
    container.style.display = display === real ? 'none' : 'inline-block';
    return container;
  }

  // Create a contianer for the given rule, which allows users rename
  // arguments.
  function createRuleContainer(ruleKey) {
    var container = domUtil.createElement('rule');
    var nameContainer = container.appendChild(domUtil.createElement('cstNodeName', ruleKey));

    // Fill the container with `block`
    // Each `block` represent an argument, inside there are:
    // `.display`, which contains the argument display name
    // `real`, which is the argument rename editor that contains the real arg name
    var blocks = container.appendChild(domUtil.createElement('blocks'));
    var argList = retrieveActionArgs(ruleKey);
    var argDisplayList = getArgDisplayList(ohmEditor.grammar.rules[ruleKey].body);
    argDisplayList.forEach(function(argDisplay, idx) {
      // TODO: Real arg display, idx matching
      var block = blocks.appendChild(domUtil.createElement('block'));
      var displayContainer = block.appendChild(createArgDisplayContainer(argDisplay));
      block.appendChild(createRealArgContainer(argDisplay, argList[idx]));
    });
    return container;
  }

  // Top layer of the editor that includes a rule/function signature container, and a button
  // wrappers for moving, closing, 
  function createTopLayer(type, name) {
    var top = domUtil.createElement('top');
    top.appendChild(type === 'rule' ? createRuleContainer(name) : createFuncContainer(name));
    // TODO add buttons
    return top;
  }

  function retrieveArguments(ruleContainer) {
    var blocks = ruleContainer.querySelector('blocks');
    return Array.prototype.map.call(blocks.children, function(block) {
      return block.lastChild.textContent || block.querySelector('.display').textContent;
    });
  }

  function saveAction() {
    var operation = $('#semantics div.opName.selected')._operation;
    $$('editor.rule').forEach(function(editor) {
      var body = editor.querySelector('.body').firstChild.CodeMirror.getValue();
      var args = retrieveArguments(editor.querySelector('rule'));
      ohmEditor.semantics.emit('save:action', operation, editor.id, args, body);
    });
    ohmEditor.parseTree.refresh();
  }

  // Main body of the editor contains the CodeMirror for editing action/function body.
  function createMainBody(type, name) {
    var body = domUtil.createElement('.body');
    var cm = CodeMirror(body);

    var operation = $('#semantics div.opName.selected')._operation;
    var action = ohmEditor.semantics.getAction(operation, name);
    if (action) {
      cm.setValue(action._actionBody);
    }
    cm.setOption('extraKeys', {
      'Cmd-S': saveAction,
      'Ctrl-S': saveAction
    });
    return body;
  }

  // Create an editor for `name` with given type (either a helper, or a rule).
  function createEditor(type, name) {
    var editor = domUtil.createElement('editor.' + type);
    editor.id = name;
    editor.appendChild(createTopLayer(type, name));
    editor.appendChild(createMainBody(type, name));
    return editor;
  }

  ohmEditor.semantics.addListener('add:semanticEditor', function(type, name) {
    var editor = editorWrapper.appendChild(createEditor(type, name));
    var cm = editor.querySelector('.body').firstChild.CodeMirror;
    cm.setCursor({line: cm.lineCount()});
    cm.refresh();
    cm.focus();
  });

});
