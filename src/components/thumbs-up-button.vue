<template>
  <div class="thumbsUpButton" :title="title">
    <span v-if="showThumbsUp">&#x1F44D;</span>
    <span v-else>&#x1F44E;</span>
  </div>
</template>

<script>
'use strict';

module.exports = {
  name: 'thumbs-up-button',
  props: ['showThumbsUp'],
  computed: {
    title() {
      return 'Example should ' + (this.showThumbsUp ? 'match' : 'NOT match');
    },
  },
};
</script>
