<template>
  <div class="block">
    <div class="display" @click="toggleBlock">{{ display }}</div>
    <input class="real" :style="styleObj" v-model="realValue" v-show="showing" />
  </div>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  module.exports = {
    props: ['display', 'real'],
    data: function() {
      return {
        // Hide/show real argument
        showing: this.display !== this.real,

        realValue: this.real
      };
    },
    computed: {
      styleObj: function() {
        return {
          width: this.realValue ?
            10 * this.realValue.length + 'px' :
            '10px'
        };
      }
    },
    watch: {
      real: function(newValue) {
        this.realValue = newValue;
        this.showing = this.display !== this.real;
      }
    },
    mounted: function() {
      var self = this;
      ohmEditor.semanticsContainer.addListener('save:semantics', function() {
        self.$emit('setArg', self.display, self.realValue);
      });
    },
    methods: {
      toggleBlock: function() {
        this.showing = !this.showing;
      }
    }
  };
</script>