<template>
  <div class="editor" :class="[type]">
    <rule-arguments v-if="isRule"
                    :id="id" :operation="operation" @setArgs="setArgs" />
    <function-arguments v-if="!isRule"
                        :id="id" :operation="operation" @setArgs="setArgs"/>
    <div class="body" ref="body"></div>
  </div>
</template>

<script>
  /* global CodeMirror */
  'use strict';

  var ohmEditor = require('../ohmEditor');

  var ruleArgs = require('./rule-arguments.vue');
  var functionArgs = require('./function-arguments.vue');

  // TODO: focus on editor
  module.exports = {
    components: {
      'rule-arguments': ruleArgs,
      'function-arguments': functionArgs
    },
    props: ['type', 'id', 'operation', 'opArgs'],
    computed: {
      isRule: function() {
        return this.type === 'rule';
      },
      bodyContent: function() {
        var target = this.isRule ?
          ohmEditor.semantics.getAction(this.operation, this.id) :
          ohmEditor.semantics.getHelper(this.operation, this.id);
        return target ?
          (this.isRule ? target._actionBody : target._body) :
          '';
      }
    },
    data: function() {
      return {
        codemirror: undefined,
        args: []
      };
    },
    mounted: function() {
      var self = this;
      var saveAll = function() {
        ohmEditor.semanticsContainer.emit('save:helpers');
        ohmEditor.semanticsContainer.emit('save:semantics');
        ohmEditor.semantics.emit('update:results', self.operation, self.opArgs);
      };

      var cm = this.codemirror = CodeMirror(this.$refs.body, {
        value: this.bodyContent
      });
      cm.setOption('extraKeys', {
        'Cmd-S': function() {
          saveAll();
        },
        'Ctrl-S': function() {
          saveAll();
        }
      });

      ohmEditor.semanticsContainer.addListener('save:helpers', function() {
        if (self.type !== 'rule') {
          self.saveAction();
        }
      });

      ohmEditor.semanticsContainer.addListener('save:semantics', function() {
        if (self.type === 'rule') {
          self.saveAction();
        }
      });

      ohmEditor.semanticsContainer.addListener('focus:editor', function(type, id) {
        if (type === self.type && id === self.id) {
          cm.focus();
        }
      });
    },
    methods: {
      setArgs: function(args) {
        this.args = args;
      },
      saveAction: function() {
        var body = this.codemirror.getValue();
        if (this.isRule) {
          ohmEditor.semantics.emit('save:action', this.operation, this.id, this.args, body);
        } else {
          ohmEditor.semantics.emit('save:helper', this.operation, this.id, this.args, body);
        }
      }
    }
  };
</script>
