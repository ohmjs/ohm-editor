/* eslint-env browser */
/* global Vue */

'use strict';

(function(root, initModule) {
  if (typeof exports === 'object') {
    module.exports = initModule;
  } else {
    initModule(root.ohmEditor);
  }
})(this, function(ohmEditor) {

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

  var bus = new Vue();

  // <div id="semanticsContainer">
  //   <h2>Semantics
  //     <input id="addSemanticButton" type="button" value="+"></input>
  //   </h2>
  //   <div id="semantics" slot="buttons">
  //   </div>
  // </div>

  Vue.component('operation-button', {
    template: [
      '<div class="opName" v-bind:class="{selected: select}"',
      '     @click="toggleSelection">{{ title }}',
      '</div>'
    ].join(''),
    props: ['title', 'operation'],
    data: function() {
      return {
        select: false
      };
    },
    methods: {
      toggleSelection: function() {
        bus.$emit('toggleButtonSelection', !this.select ? this.$el : undefined);
        if (!this.select) {
          ohmEditor.semantics.operation = undefined;
          ohmEditor.semantics.emit('clear:semanticsEditorWrapper');
        }
      }
    },
    created: function() {
      var self = this;
      bus.$on('toggleButtonSelection', function(element) {
        self.select = (self.$el === element);
        if (self.select) {
          ohmEditor.semantics.operation = self.operation;
          ohmEditor.semantics.emit('select:operation', self.operation);
        }
      });
    }
  });

  Vue.component('semantics-buttons', {
    template: [
      '<div id="semantics">',
      ' <div is="operation-button" :title="child.title" :operation="child.operation"',
      '      v-for="child in children"></div>',
      ' <textarea class="opName" v-show="adding" ref="input" v-model="value"',
      '           v-bind:class="{selected: adding}"',
      '           @keydown.enter.prevent.stop="save" @focus="selectInput"></textarea>',
      '</div>'
    ].join(''),
    data: function() {
      return {
        children: [],
        adding: false,
        value: ''
      };
    },
    methods: {
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
          bus.$emit('toggleButtonSelection', elem);
          ohmEditor.semantics.operation = info.name;
          ohmEditor.parseTree.refresh(info.name);
        });
      },
      addSemantic: function(signature) {
        var semanticInfo = parseSemanticSignature(signature.trim());
        var type = semanticInfo.type;
        ohmEditor.semantics.emit('add:operation', type,
            {signature: signature, name: semanticInfo.name});
        return semanticInfo;
      },
      selectInput: function(event) {
        this.$refs.input.select();
      },
      showInputBox: function() {
        this.adding = true;
        var inputBox = this.$refs.input;
        this.$nextTick(function() {
          inputBox.focus();
          bus.$emit('toggleButtonSelection', inputBox);
          ohmEditor.semantics.emit('clear:semanticsEditorWrapper');
        });
      }
    },
    created: function() {
      var self = this;
      bus.$on('newInputBox', function() {
        self.showInputBox();
      });
    }
  });

  Vue.component('semantics-header', {
    template: [
      '<h2>Semantics',
      ' <button id="addSemanticButton" @click="onClick">+</button>',
      '</h2>'].join(''),
    methods: {
      onClick: function(event) {
        bus.$emit('newInputBox');
      }
    }
  });

  ohmEditor.semanticsContainer = new Vue({
    el: '#semanticsContainer',
    template: [
      '<div id="semanticsContainer" v-bind:style="styleObj">',
      ' <semantics-header></semantics-header>',
      ' <semantics-buttons></semantics-buttons>',
      ' <semantics-body></semantics-body>',
      '</div>'
    ].join(''),
    data: {
      styleObj: {flexGrow: '1'}
    }
  });
});
