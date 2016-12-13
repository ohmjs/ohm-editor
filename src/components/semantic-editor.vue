<template>
  <div class="editor" :class="[type]">
    <div class="rule">
      <div class="cstNodeName">{{ id }}</div>
      <div class="blocks">
        <argument-block v-for="block in blocks" :display="block.display" :real="block.real">
        </argument-block>
      </div>
    </div>
    <div class="body" ref="body"></div>
  </div>
</template>

<script>
  /* global ohm, CodeMirror */
  'use strict';

  var ohmEditor = require('../ohmEditor');

  var argumentBlock = require('./argument-block.vue');

  function copyWithoutDuplicates(array) {
    var noDuplicates = [];
    array.forEach(function(entry) {
      if (noDuplicates.indexOf(entry) < 0) {
        noDuplicates.push(entry);
      }
    });
    return noDuplicates;
  }

  // TODO: clean up.
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

  // TODO: focus on editor
  module.exports = {
    components: {
      'argument-block': argumentBlock
    },
    props: ['type', 'id', 'operation'],
    computed: {
      blocks: function() {
        var blocks = [];
        var ruleKey = this.id;
        var action = ohmEditor.semantics.getAction(this.operation, ruleKey);
        if (action) {
          this.bodyContent = action._actionBody;
        }

        var argList = action ? action._actionArguments :
          ohmEditor.grammar.rules[ruleKey].body.toArgumentNameList(1);
        var argDisplayList = getArgDisplayList(ohmEditor.grammar.rules[ruleKey].body);
        argDisplayList.forEach(function(argDisplay, idx) {
          // TODO: Real arg display, idx matching
          var block = {
            display: argDisplay,
            real: argList[idx]
          };
          blocks.push(block);
        });
        return blocks;
      }
    },
    data: function() {
      return {
        codemirror: undefined,
        bodyContent: ''
      };
    },
    mounted: function() {
      var cm = this.codemirror = CodeMirror(this.$refs.body, {
        value: this.bodyContent
      });
      cm.setOption('extraKeys', {
        'Cmd-S': function() {
          ohmEditor.semanticsContainer.emit('save:semantics');
        },
        'Ctrl-S': function() {
          ohmEditor.semanticsContainer.emit('save:semantics');
        }
      });

      var self = this;
      ohmEditor.semanticsContainer.addListener('save:semantics', function() {
        self.saveAction();
      });

      ohmEditor.semanticsContainer.addListener('focus:editor', function(type, id) {
        if (type === self.type && id === self.id) {
          cm.focus();
        }
      });
    },
    methods: {
      saveAction: function() {
        var body = this.codemirror.getValue();
        var args = this.blocks.map(function(block) {
          return block.real;
        });
        ohmEditor.semantics.emit('save:action', this.operation, this.id, args, body);
        ohmEditor.semantics.emit('update:results', this.operation);
      }
    }
  };
</script>
