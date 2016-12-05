<template>
  <div id="semantics">
    <operation-button v-for="child in children"
                      :title="child.title" :operation="child.operation">
    </operation-button>
    <textarea class="opName" ref="input" v-show="adding" v-model="value"
              v-bind:class="{selected: adding}" @keydown.enter.prevent.stop="save"
              @focus="selectInput">
    </textarea>
</template>

<script>
  /* global window */
  'use strict';

  var ohmEditor = require('../ohmEditor');

  var operationButton = require('./operation-button.vue');

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
          arg = arg.trim();
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

  module.exports = {
    components: {
      'operation-button': operationButton
    },
    data: function() {
      return {
        children: [],
        adding: false,
        value: ''
      };
    },
    mounted: function() {
      var self = this;
      ohmEditor.semanticsContainer.addListener('create:inputBox', function() {
        self.showInputBox();
      });
    },
    methods: {
      addSemantic: function(signature) {
        var semanticInfo = parseSemanticSignature(signature.trim());
        var type = semanticInfo.type;
        ohmEditor.semantics.emit('add:operation', type,
            {signature: signature, name: semanticInfo.name});
        return semanticInfo;
      },
      save: function(event) {
        var info;
        try {
          info = this.addSemantic(this.value);
        } catch (error) {
          window.alert(error);    // eslint-disable-line no-alert
          this.$refs.input.focus();
          return;
        }
        var child = {title: this.value, operation: info.name};
        this.children.push(child);
        this.adding = false;
        this.value = '';
        var self = this;
        this.$nextTick(function() {
          var elem = self.$el.children[self.children.length - 1];
          ohmEditor.semanticsContainer.emit('toggle:semanticsButton', elem);
          ohmEditor.semantics.operation = info.name;
        });
      },
      selectInput: function(event) {
        this.$refs.input.select();
      },
      showInputBox: function() {
        this.adding = true;
        var inputBox = this.$refs.input;
        this.$nextTick(function() {
          inputBox.focus();
          ohmEditor.semanticsContainer.emit('toggle:semanticsButton', inputBox);
          ohmEditor.semantics.emit('clear:semanticsEditorWrapper');
        });
      }
    }
  };
</script>