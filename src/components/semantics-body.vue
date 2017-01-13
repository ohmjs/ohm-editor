<template>
  <div class="flex-fix">
    <div class="editorWrapper" v-if="loaded">
      <semantic-editor v-for="child in children"
                       :type="child.type" :id="child.id" :operation="child.operation"
                       :opArgs="child.opArgs">
      </semantic-editor>
    </div>
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  var semanticEditor = require('./semantic-editor.vue');
  
  module.exports = {
    components: {
      'semantic-editor': semanticEditor
    },
    data: function() {
      return {
        loaded: false,
        operation: undefined,
        args: undefined,
        children: []
      };
    },
    mounted: function() {
      var self = this;

      ohmEditor.semantics.addListener('select:operation', function(operationName, optArgs) {
        // TODO: handle arguments
        self.operation = operationName;
        self.args = optArgs;
        self.populateChildren();
        self.loaded = true;
      });

      ohmEditor.semantics.addListener('clear:semanticsEditorWrapper', function() {
        self.loaded = false;
        self.operation = '';
        self.args = undefined;
      });

      ohmEditor.semanticsContainer.addListener('create:editor', function(type, id) {
        var child = self.children.filter(function(child) {
          return child.type === type && child.id === id;
        })[0];
        if (!child) {
          self.children.push({
            type: type,
            id: id,
            operation: self.operation,
            opArgs: self.args
          });
        }

        // TODO: focusing on the editor.
        self.$nextTick(function() {
          ohmEditor.semanticsContainer.emit('focus:editor', type, id);
        });
      });
    },
    methods: {
      populateChildren: function() {
        var children = this.children = [];
        var operation = this.operation;
        var args = this.args;
        var actionDict = ohmEditor.semantics.value._getActionDict(this.operation);
        if (!actionDict) {
          return;
        }

        Object.keys(actionDict).forEach(function(key) {
          var action = actionDict[key];
          if (!action || action._isDefault || key === '_default') {
            return;
          }
          var child = {
            type: 'rule',
            id: key,
            operation: operation,
            opArgs: args
          };
          children.push(child);
        });

        var helperDict = ohmEditor.semantics.getHelpers(operation);
        if (!helperDict) {
          return;
        }

        Object.keys(helperDict).forEach(function(key) {
          var child = {
            type: 'helper',
            id: key,
            operation: operation,
            opArgs: args
          };
          children.push(child);
        });
      }
    }
  };
</script>
