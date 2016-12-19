/* eslint-env browser */
/* global es6, ohm */

'use strict';

var ohmEditor = require('./ohmEditor');

// Privates
// --------
// Semantics result that represents an error
// caused by missing semantics action
function Failure() { }
Failure.prototype.toString = function() {
  return undefined;
};
var failure = new Failure();
failure.isFailure = true;

// Semantics result that represents a runtime error
// except caused by missing semantics action
function ErrorWrapper(key, error) {
  this.nodeOpKey = key;
  this.error = error;
}
ErrorWrapper.prototype.causedBy = function(key) {
  return this.nodeOpKey === key;
};
ErrorWrapper.prototype.toString = function() {
  return this.error.message || this.error;
};
ErrorWrapper.prototype.isErrorWrapper = true;

var resultMap;
var forcing;
var todoList;
var errorList;
var passThroughList;
function initializeSemanticsLog() {
  resultMap = Object.create(null);
  todoList = undefined;
  errorList = undefined;
  passThroughList = undefined;
  forcing = false;
}

function nodeKey(cstNode, optSource) {
  var ctorName = cstNode.ctorName;
  var source = cstNode.source || optSource;
  return ctorName + '_from_' + source.startIdx + '_to_' + source.endIdx;
}

function nodeOpKey(nodeKey, operationName) {
  return nodeKey + '_at_' + operationName;
}

// Return the corresponding result that is already recorded (* this also be used for
// result existance checking).
function getResult(key, name, optArgs) {
  if (!(key in resultMap) || !(name in resultMap[key])) {
    return undefined;
  }

  var resultList = resultMap[key][name].filter(function(resultWrapper) {
    if (!resultWrapper.args ||
        JSON.stringify(resultWrapper.args) === JSON.stringify(optArgs)) {
      // Alternate the `forced` property, to make sure is result is only forced
      // when all the path that could get the result is forced.
      resultWrapper.forced = resultWrapper.forced && forcing;
      return true;
    }
    return false;
  });
  return resultList[0];
}

function addResult(result, key, name, optArgs) {
  // Return without adding duplicated results.
  if (getResult(key, name, optArgs)) {
    return;
  }

  // Initialize entry to prepare for the new result
  resultMap[key] = resultMap[key] || Object.create(null);
  resultMap[key][name] = resultMap[key][name] || [];

  // Check if the result is already recorded (* as `forceResults` is called without
  // checking duplications).
  var isDuplicated = false;
  resultMap[key][name].forEach(function(resultWrapper) {
    if (!resultWrapper.args ||
        JSON.stringify(resultWrapper.args) === JSON.stringify(optArgs)) {
      isDuplicated = true;
      // Alternate the `forced` property, to make sure is result is only forced
      // when all the path that could get the result is forced.
      resultWrapper.forced = resultWrapper.forced && forcing;
    }
  });
  // Return without adding duplicated results.
  if (isDuplicated) {
    return;
  }

  // Wrap actual result into an object, which may contain
  // arguments, and markers.
  var resultWrapper = {result: result};
  if (optArgs && Object.keys(optArgs).length > 0) {
    resultWrapper.args = optArgs;
  }

  var nOpKey = nodeOpKey(key, name);
  resultWrapper.forced = forcing;
  resultWrapper.forCallingSemantic = ohmEditor.semantics.operation === name;
  resultWrapper.missingSemanticsAction = result === failure;
  resultWrapper.isError = result && result.isErrorWrapper || result === failure;
  resultWrapper.isNextStep = ohmEditor.semantics.operation === name && result &&
    ((result.isErrorWrapper && result.causedBy(nOpKey)) ||
    (todoList && todoList.includes(nOpKey)));
  resultWrapper.isPassThrough = !!passThroughList && passThroughList.includes(nOpKey);
  resultMap[key][name].push(resultWrapper);
}

function toValueList(args) {
  return Object.keys(args).map(function(argName) {
    return args[argName];
  });
}

function initActionDict(type, operationName) {
  var name = operationName;
  var defaults = {
    _terminal: function() {
      var key = nodeKey(this);
      var result = failure;
      todoList = todoList || [];
      todoList.push(nodeOpKey(key, name));
      addResult(result, key, name, this.args);
      return result;
    },

    _iter: function(children) {
      var key = nodeKey(this);
      var argValues = toValueList(this.args);
      var result = children.map(function(child) {
        return type === 'Operation' ? child[name].apply(child, argValues) : child[name];
      });
      var aChildFailed = result.indexOf(failure) >= 0;
      var aChildError = result.some(function(childResult) {
        return childResult && childResult.isErrorWrapper;
      });
      result = aChildFailed ? failure : (aChildError ? errorList[0] : result);
      addResult(result, key, name, this.args);
      return result;
    },

    _nonterminal: function(children) {
      var key = nodeKey(this);
      var nOpKey = nodeOpKey(key, name);
      var argValues = toValueList(this.args);

      var result;
      var origTodoList = todoList;
      var origErrorList = errorList;
      todoList = errorList = undefined;
      try {
        if (children.length === 1) {
          passThroughList = passThroughList || [];
          passThroughList.push(nOpKey);

          var child = children[0];
          result = type === 'Operation' ? child[name].apply(child, argValues) : child[name];
        } else {
          todoList = [nOpKey];
        }
      } catch (error) {
        result = new ErrorWrapper(nOpKey, error);
        if (!errorList) {
          errorList = [result];
        }
      }
      result = todoList ? failure : (errorList ? errorList[0] : result);
      todoList = todoList ? todoList.concat(origTodoList) : origTodoList;
      errorList = errorList ? errorList.concat(origErrorList) : origErrorList;
      addResult(result, key, name, this.args);
      return result;
    }
  };
  Object.keys(defaults).forEach(function(k) { defaults[k]._isDefault = true; });
  return defaults;
}

ohmEditor.semantics.addListener('add:operation', function(type, operationInfo) {
  var semantics = ohmEditor.semantics.value;
  var signature = operationInfo.signature;
  var name = operationInfo.name;
  semantics['add' + type](signature, initActionDict(type, name));
});

function populateSemanticsResult(traceNode, operationName, optArgs) {
  var semantics = ohmEditor.semantics.value;
  try {
    var nodeWrapper = semantics._getSemantics().wrap(traceNode.bindings[0], traceNode.source);
    if (operationName in semantics._getSemantics().operations) {
      var argValues = optArgs ?
        toValueList(optArgs) :
        semantics._getSemantics().operations[operationName].formals.map(function() {
          return undefined;
        });
      nodeWrapper[operationName].apply(nodeWrapper, argValues);
    } else {
      nodeWrapper._forgetMemoizedResultFor(operationName);
      nodeWrapper[operationName];   // eslint-disable-line no-unused-expressions
    }
  } catch (error) {
    /* All the error will be an ErrorWrapper which already recorded in the resultMap */
  }
}
ohmEditor.semantics.addListener('render:semanticResult', function(traceNode, operation, optArgs) {
  initializeSemanticsLog();
  populateSemanticsResult(traceNode, operation, optArgs);
});

function forceResults(traceNode) {
  var semantics = ohmEditor.semantics.value;
  forcing = true;
  var semanticsNameList = semantics.getOperationNames().concat(semantics.getAttributeNames());
  semanticsNameList.forEach(function(name) {
    populateSemanticsResult(traceNode, name);
  });
  forcing = false;
}

function allForced(key) {
  var results = resultMap[key];
  var forced = Object.keys(results).every(function(operationName) {
    var resultList = results[operationName];
    return resultList.every(function(resultWrapper) {
      return resultWrapper.forced;
    });
  });
  return forced;
}

function getDefaultArgExpression(traceNode) {
  var pexpr = traceNode.expr;

  // Get rule body of the Apply expression.
  if (pexpr instanceof ohm.pexprs.Apply) {
    var succeedChild = traceNode.children[traceNode.children.length - 1];
    pexpr = succeedChild.expr;

    // If the rule body is an Alt expression, then get its succeed term.
    if (pexpr instanceof ohm.pexprs.Alt) {
      pexpr = succeedChild.children[succeedChild.children.length - 1].expr;
    }
  }

  return pexpr;
}

// Build the action that called from the wrapper, which includes renaming the
// operation arguments, and actual action body that user typed.
function buildAction(opArgs, actionArguments, actionBody) {  // eslint-disable-line no-unused-vars
  // Constructs the code that renames the operation arguments, so we could refer
  // them by name directly. i.e. `var <argument name> = this.args.<argument name>`
  var renameOpArgStr = opArgs && Object.keys(opArgs).map(function(argName) {
    return 'var ' + argName + ' = this.args.' + argName + ';';
  }).join('\n');

  actionBody = renameOpArgStr + '\n' + actionBody;
  var formals = actionArguments.join(',');
  return new Function(formals, actionBody);    // eslint-disable-line no-new-func
}

function wrapAction(operation, args, body) {
  if (!body.trim()) {
    return undefined;
  }

  var origActionBody = body;
  var enclosedActionArgStr = '(' + args.join(',') + ')';
  var realAction = 'function' + enclosedActionArgStr + '{\n' + body + '\n}';
  var isExpression = es6.match(body, 'AssignmentExpression<withIn>').succeeded();
  if (isExpression) {
    body = 'return ' + body + ';';
  }

  /* eslint-disable no-eval */
  var wrapper = eval('(function(' + args + ') {\n' +
  '  var key = nodeKey(this);\n' +
  '  var nOpKey = nodeOpKey(key, operation);\n' +
  '  var result;\n' +
  '  var action;\n' +
  '  try {\n' +
  '    action = buildAction(this.args, args, body);\n' +
  '  } catch (error) {\n' +
  '    result = new ErrorWrapper(nOpKey, error);\n' +
  '    errorList = errorList || [];\n' +
  '    errorList.push(result);\n' +
  '    addResult(result, key, operation, this.args);\n' +
  '    return result;\n' +
  '  }\n' +
  '  var origTodoList = todoList;\n' +
  '  var origErrorList = errorList;\n' +
  '  todoList = errorList = undefined;\n' +
  '  try {\n' +
  '    result = action.apply(this, arguments);\n' +
  '  } catch (error) {\n' +
  '    result = new ErrorWrapper(nOpKey, error);\n' +
  '    if (!errorList) {\n' +
  '      errorList = [result];\n' +
  '    }\n' +
  '  }\n' +
  '  result = todoList ? failure : (errorList ? errorList[0] : result);\n' +
  '  todoList = todoList ? todoList.concat(origTodoList) : origTodoList;\n' +
  '  errorList = errorList ? errorList.concat(origErrorList) : origErrorList;\n' +
  '  addResult(result, key, operation, this.args);\n' +
  '  return result;\n' +
  '})');
  /* eslint-enable no-eval */

  wrapper.toString = function() {
    return realAction;
  };
  wrapper._actionArguments = args;
  wrapper._actionBody = origActionBody;
  return wrapper;
}

ohmEditor.semantics.addListener('save:action', function(operationName, key, args, body) {
  var semantics = ohmEditor.semantics.value;
  var actionWrapper = wrapAction(operationName, args, body);
  semantics._getActionDict(operationName)[key] = actionWrapper;
});

// Exports
// -------
ohmEditor.semantics.forceResult = function(traceNode, name, optArgs) {
  var key = nodeKey(traceNode.bindings[0], traceNode.source);
  forcing = true;
  populateSemanticsResult(traceNode, name, optArgs);
  var resultWrapper = getResult(key, name, optArgs);
  forcing = false;
  return resultWrapper;
};

ohmEditor.semantics.getResults = function(traceNode) {
  var key = nodeKey(traceNode.bindings[0], traceNode.source);
  // If the node has not been evaluated yet, or all its existing semantic results are
  // forced, then we force the evaluation on it to make sure all the available operations
  // are evaluated at this node.
  if (!(key in resultMap) || allForced(key)) {
    forceResults(traceNode);
  }
  return resultMap[key];
};

// If there is no user added action for the rule, return default argument list,
// Otherwise, return the argument list that user renamed before
ohmEditor.semantics.getActionArgPairedList = function(traceNode, opName) {
  var semantics = ohmEditor.semantics.value;
  var actionKey = traceNode.bindings[0].ctorName;
  var defaultArgExpression = getDefaultArgExpression(traceNode);

  var argPairList = {argExpr: defaultArgExpression};
  var action = semantics._getActionDict(opName)[actionKey];
  if (!action || action._isDefault) {
    return argPairList;
  }

  var actionStr = action.toString();
  var realArgStr = actionStr.substring(actionStr.indexOf('(') + 1, actionStr.indexOf(')'));
  argPairList.real = realArgStr.split(',').map(function(argStr) {
    return argStr.trim();
  });
  return argPairList;
};

ohmEditor.semantics.getAction = function(operation, ruleKey) {
  var semantics = ohmEditor.semantics.value;
  var action = semantics._getActionDict(operation)[ruleKey];
  if (!action || action._isDefault || ruleKey === '_default') {
    return undefined;
  }

  return action;
};

ohmEditor.semantics.getSemantics = function() {
  var semantics = ohmEditor.semantics.value;
  var semanticOperations = {
    operations: semantics._getSemantics().operations,
    attributes: semantics._getSemantics().attributes
  };
  return semanticOperations;
};
