<template>
  <div class="block">
    <div class="display" @click="toggleBlock">{{ display }}</div>
    <div class="real" contenteditable="true" v-show="showing">
      {{ real }}
    </div>
  </div>
</template>

<script>
  'use strict';

  module.exports = {
    props: ['display', 'real'],
    data: function() {
      return {
        showing: true
      };
    },
    created: function() {
      this.showing = this.display !== this.real;
    },
    methods: {
      toggleBlock: function() {
        this.showing = !this.showing;
      }
    }
  };
</script>