<template>
  <div class="helper"> 
    <div class="name">{{ id }}</div>
    <div class="args">
      <div v-for="(block, index) in blocks">
        <input v-model="block.text" class="arg" :contenteditable="true"
             @keydown.enter.stop.prevent @keydown.space.stop.prevent
             @keyup.tab.prevent @keyup="addNew(index, $event)">
        </input>
        <span v-if="index !== blocks.length - 1">,<span>
      </div>
    </div>
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  module.exports = {
    props: ['id', 'operation'],
    data: function() {
      return {
        blocks: []
      };
    },
    created: function() {
      this.populateBlocks();
    },
    mounted: function() {
      var self = this;
      ohmEditor.semanticsContainer.addListener('save:helpers', function() {
        var args = self.blocks.map(function(block, idx) {
          return block.text;
        });
        if (!args[args.length - 1]) {
          args.pop();
        }
        self.$emit('setArgs', args);
      });
    },
    methods: {
      addNew: function(idx, event) {
        if (idx === this.blocks.length - 1 && event.code !== 'Tab') {
          this.blocks.push(Object.create(null));
        }
      },
      populateBlocks: function() {
        var helpers = ohmEditor.semantics.getHelpers(this.operation);
        if (!helpers) {
          this.blocks.push(Object.create(null));
          return;
        }

        var helper = helpers[this.id];
        if (!helper) {
          this.blocks.push(Object.create(null));
          return;
        }

        this.blocks = helper._args.map(function(arg) {
          return {text: arg};
        });
        this.blocks.push(Object.create(null));
      }
    }
  };
</script>