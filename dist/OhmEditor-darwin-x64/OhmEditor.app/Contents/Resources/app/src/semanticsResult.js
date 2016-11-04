/* eslint-env browser */

'use strict';

(function(root, initModule) {
  if (typeof exports === 'object') {
    module.exports = initModule;
  } else {
    initModule(root.ohm, root.ohmEditor, root.domUtil, root.es6);
  }
})(this, function(ohm, ohmEditor, domUtil, es6) {

  // Privates
  // --------
  var $ = domUtil.$;
  var $$ = domUtil.$$;

  // Generate a class name for the result block which used to identify the
  // semantic operation that generates the result.
  // Format: 'operationName_' <operation name> ('_' <arg#i>)*
  function generateResultBlockClassId(name, args) {
    var blockClassId = name;
    if (args) {
      var argValues = Object.keys(args).map(function(key) {
        return args[key];
      });
      blockClassId += '_' + argValues.join('_');
    }
    return 'operationName_' + blockClassId;
  }

  // Creates a single `resultBlock`, which contains,
  // `value`: the actual result container
  // `operation`: the semantic operation for the result
  function createResultBlock(opName, resultWrapper) {
    var block = domUtil.createElement('resultBlock');
    domUtil.toggleClasses(block, {
      error: resultWrapper.isError && !resultWrapper.missingSemanticsAction,
      forced: resultWrapper.forced,
      passThrough: resultWrapper.isPassThrough,
      optNextStep: !resultWrapper.forced && resultWrapper.isError
    });

    var blockClassId = generateResultBlockClassId(opName, resultWrapper.args);
    block.classList.add(blockClassId);

    // Return without putting actual result contents if the result is missing semantics action,
    // or it's an error, which not caused by the associated node.
    if (resultWrapper.missingSemanticsAction ||
        block.classList.contains('error') && !resultWrapper.isNextStep) {
      return block;
    }

    var result = resultWrapper.result;
    var valueContainer = block.appendChild(domUtil.createElement('value'));
    valueContainer.innerHTML = resultWrapper.isError ? result : JSON.stringify(result);

    var opSignature = opName;
    if (resultWrapper.args) {
      var argValues = Object.keys(resultWrapper.args).map(function(key) {
        return String(resultWrapper.args[key]);
      });
      opSignature += '(' + argValues.join(',') + ')';
    }
    var opNameContainer = block.appendChild(domUtil.createElement('operation'));
    var semanticOperations = ohmEditor.semantics.getSemantics();
    var operationCount = Object.keys(semanticOperations.operations).length +
        Object.keys(semanticOperations.attributes).length;
    if (!resultWrapper.args && operationCount === 1) {
      opNameContainer.hidden = true;
    }
    opNameContainer.innerHTML = opSignature;

    // If there are more than one operations, or the only opertaion has arguments, then hover
    // the block, and all the blocks that represent the results for the same operation signature
    // will be highlighted.
    if (operationCount > 1 || resultWrapper.args) {
      block.onmouseover = function(event) {
        $$('.self .result .' + blockClassId).forEach(function(b) {
          b.classList.add('highlight');
        });
      };
      block.onmouseout = function(event) {
        $$('.self .result .' + blockClassId).forEach(function(b) {
          b.classList.remove('highlight');
        });
      };
    }
    return block;
  }

  // Creates semantics editor result container and fills it the with `resultBlock`,
  // each of which reprensents a semantic result on this node.
  function createAndLoadResultContainer(traceNode, selfWrapper) {
    var resultContainer = domUtil.createElement('.result');
    var results = ohmEditor.semantics.getResults(traceNode);
    if (!results) {
      return resultContainer;
    }
    var idx = 0;
    Object.keys(results).forEach(function(opName) {
      var resultList = results[opName];
      resultList.forEach(function(resultWrapper) {
        var resultBlock = resultContainer.appendChild(createResultBlock(opName, resultWrapper));
        // If the result block is not the first one that contains a result, then add a left border
        // to it to seperate it from its former block
        if (resultBlock.textContent) {
          resultBlock.classList.toggle('leftBorder', idx++ > 0);
        }
        if (!resultWrapper.forced && resultWrapper.isNextStep) {
          selfWrapper.classList.add('nextStep');
        }
      });
    });

    // A `self` wrapper is marked as `passThrough` if all the results are passThrough.
    // Also, if a result is forced, then it could not be a missing semantics error.
    var passThroughContainers = resultContainer.querySelectorAll('.passThrough');
    if (passThroughContainers.length === resultContainer.children.length) {
      selfWrapper.classList.toggle('passThrough',
        Array.prototype.some.call(resultContainer.children, function(child) {
          return child.classList.contains('forced') ? !!child.textContent : true;
        }));
    }

    if (resultContainer.textContent.length === 0) {
      resultContainer.style.padding = '0';
      resultContainer.style.margin = '0';
    }
    return resultContainer;
  }

  function appendResultContainer(wrapper) {
    var selfWrapper = wrapper.querySelector('.self');
    var traceNode = wrapper._traceNode;

    var resultContainer = selfWrapper.appendChild(createAndLoadResultContainer(traceNode,
        selfWrapper));

    // If the node is collapsed, and its children is one of the next steps, then mark it as a
    // temperary next step
    if (selfWrapper.parentElement.classList.contains('collapsed')) {
      selfWrapper.classList.toggle('tmpNextStep', !!resultContainer.querySelector('.optNextStep'));
    }

    if (traceNode._lastEdited) {
      selfWrapper.classList.add('selected');
    }
  }

  ohmEditor.parseTree.addListener('create:traceElement', function(wrapper, traceNode) {
    var shouldHaveSemanticsEditor = $('#semantics div.opName.selected') &&
        !wrapper.classList.contains('hidden') &&
        !wrapper.classList.contains('failed');
    if (shouldHaveSemanticsEditor) {
      appendResultContainer(wrapper);
    }
  });
});