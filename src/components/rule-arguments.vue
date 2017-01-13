<template>
  <div class="rule">
    <div class="cstNodeName">{{ id }}</div>
    <div class="blocks">
      <argument-block v-for="block in blocks" @setArg="setArg"
                      :display="block.display" :real="block.real">
      </argument-block>
    </div>
  </div>
</template>

<script>
  /* global ohm */
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

  module.exports = {
    components: {
      'argument-block': argumentBlock
    },
    props: ['id', 'operation'],
    computed: {
      blocks: function() {
        var blocks = this.initialBlocks;
        var ruleKey = this.id;
        if (ruleKey.charAt(0) === '_') {
          return blocks;
        }
        var action = ohmEditor.semantics.getAction(this.operation, this.id);

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
        initialBlocks: []
      };
    },
    watch: {
      operation: function() {
        // This triggers the `blocks` updating.
        this.initialBlocks = [];
      }
    },
    mounted: function() {
      var self = this;
      ohmEditor.semanticsContainer.addListener('save:semantics', function() {
        var args = self.blocks.map(function(block) {
          return block.real;
        });
        self.$emit('setArgs', args);
      });
    },
    methods: {
      setArg: function(display, real) {
        this.blocks.find(function(block) {
          return block.display === display;
        }).real = real;
      }
    }
  };
</script>