const template = `
  <div class="thumbsUpButton" :title="title">
    <span v-if="showThumbsUp">&#x1F44D;</span>
    <span v-else>&#x1F44E;</span>
  </div>
`;

import Vue from 'vue/dist/vue.esm.mjs';

export default Vue.component('thumbs-up-button', {
  name: 'thumbs-up-button',
  template,
  props: {
    showThumbsUp: {type: Boolean, required: true},
  },
  computed: {
    title() {
      return 'Example should ' + (this.showThumbsUp ? 'match' : 'NOT match');
    },
  },
});
