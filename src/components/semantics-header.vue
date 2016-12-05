<template>
  <h2>Semantics
    <button id="addSemanticButton" @click="onClick">+</button>
  </h2>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');
  
  module.exports = {
    methods: {
      onClick: function() {
        ohmEditor.semanticsContainer.emit('create:inputBox');
      }
    }
  };
</script>
