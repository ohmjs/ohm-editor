<template>
  <div class="flex-fix">
    <div class="editorWrapper" v-if="loaded">
      <action-addtion></action-addtion>
      <suggestion-list></suggestion-list>
      <semantic-editor v-for="child in children"
                       :type="child.type" :id="child.id" :operation="child.operation">
      </semantic-editor>
    </div>
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  var actionAddtion = require('./action-addtion.vue');
  var suggestionList = require('./suggestion-list.vue');
  var semanticEditor = require('./semantic-editor.vue');
  
  module.exports = {
    components: {
      'action-addtion': actionAddtion,
      'suggestion-list': suggestionList,
      'semantic-editor': semanticEditor
    },
    data: function() {
      return {
        loaded: false,
        operation: undefined,
        children: []
      };
    },
    mounted: function() {
      var self = this;

      ohmEditor.semantics.addListener('select:operation', function(operationName) {
        self.operation = operationName;
        self.populateChildren();
        self.loaded = true;
      });

      ohmEditor.semantics.addListener('clear:semanticsEditorWrapper', function() {
        self.loaded = false;
        self.operation = '';
      });

      ohmEditor.semanticsContainer.addListener('create:editor', function(type, id) {
        var hasEditor = self.children.filter(function(child) {
          return child.type === type && child.id === id;
        });
        if (hasEditor.length > 0) {
          // bus.$emit('focusEditor', type, id);
          return;
        }
        self.children.push({
          type: type,
          id: id,
          operation: self.operation
        });
        ohmEditor.semanticsContainer.emit('hide:suggestions');
      });
    },
    methods: {
      populateChildren: function() {
        var children = this.children = [];
        var operation = this.operation;
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
            operation: operation
          };
          children.push(child);
        });
      }
    }
  };
</script>
