<template>
  <div class="editor" :class="[type]">
    <div class="rule">
      <div class="cstNodeName">{{ id }}</div>
      <div class="blocks">
        <div class="block" v-for="block in blocks">
          <div class="display" @click="block.showing != block.showing">{{ block.display }}</div>
          <div class="real" contenteditable="true" v-show="block.showing">
            {{ block.real }}
          </div>
        </div>
      </div>
    </div>
    <div class="body" ref="body"></div>
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  module.exports = {
    props: ['type', 'id', 'operation'],
    data: function() {
      return {
        codemirror: undefined,
        blocks: []
      };
    },
    methods: {
      saveAction: function() {
        var body = this.codemirror.getValue();
        var args = this.blocks.map(function(block) {
          return block.real;
        });
        ohmEditor.semantics.emit('save:action', this.operation, this.id, args, body);
      }
    },
    created: function() {
      // var self = this;
      // var ruleKey = this.id;
      // var action = ohmEditor.semantics.getAction(this.operation, ruleKey);
      // var bodyContent = action ? action._actionBody : '';

      // var argList = action ? action._actionArguments :
      //   ohmEditor.grammar.rules[ruleKey].body.toArgumentNameList(1);
      // var argDisplayList = getArgDisplayList(ohmEditor.grammar.rules[ruleKey].body);
      // argDisplayList.forEach(function(argDisplay, idx) {
      //   // TODO: Real arg display, idx matching
      //   var block = {
      //     display: argDisplay,
      //     real: argList[idx]
      //   };
      //   self.blocks.push(block);
      // });

      // this.$nextTick(function() {
      //   var cm = self.codemirror = CodeMirror(self.$refs.body, {
      //     value: bodyContent
      //   });
      //   cm.setOption('extraKeys', {
      //     'Cmd-S': function() {
      //       bus.$emit('saveAction');
      //       self.$nextTick(function() {
      //         ohmEditor.parseTree.refresh(self.operation);
      //       });
      //     },
      //     'Ctrl-S': function() {
      //       bus.$emit('saveAction');
      //       self.$nextTick(function() {
      //         ohmEditor.parseTree.refresh(self.operation);
      //       });
      //     }
      //   });
      //   cm.setCursor({line: cm.lineCount()});
      //   cm.refresh();
      //   cm.focus();
      // });

      // bus.$on('saveAction', this.saveAction);
      // bus.$on('focusEditor', function(type, id) {
      //   if (self.id === id && self.type === type) {
      //     self.$nextTick(function() {
      //       self.$el.focus();
      //       self.codemirror.setCursor({line: self.codemirror.lineCount()});
      //       self.codemirror.refresh();
      //       self.codemirror.focus();
      //     });
      //   }
      // });
    }
  };
</script>
