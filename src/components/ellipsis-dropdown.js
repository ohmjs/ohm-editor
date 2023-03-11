import Vue from 'vue/dist/vue.esm.mjs';

const template = `
  <div class="dropdown">
    <button
      class="outline-btn ellipsis-btn"
      @click="toggleHidden"
      @keydown.esc="hide"
      @blur="hide"
    >
      &#x22ee;
    </button>
    <ul class="dropdown-menu dropdown-menu-right" :hidden="hidden">
      <li
        v-for="(cb, label) in items"
        v-bind:key="label"
        :class="itemClass(label)"
      >
        <a
          href="#"
          @mousedown.prevent="/* Prevent blur of button */"
          @click="handleItemClick(label)"
          >{{ label }}</a
        >
      </li>
    </ul>
  </div>
`;

export default Vue.component('ellipsis-dropdown', {
  name: 'ellipsis-dropdown',
  template,
  props: {
    // Specifies the menu items. Format is {<label>: <callback>, ...}
    // If the callback is null, the item will be disabled.
    items: {type: Object, required: true},
  },
  data() {
    return {
      hidden: true,
    };
  },
  computed: {
    button() {
      return this.$el.querySelector('button');
    },
  },
  methods: {
    itemClass(label) {
      if (this.items[label] == null) {
        return 'disabled';
      }
    },
    handleMouseDown(e) {
      e.preventDefault();
    },
    toggleHidden(e) {
      this.hidden = !this.hidden;
    },
    handleItemClick(label) {
      const cb = this.items[label];
      if (cb) {
        cb();
      }
      this.button.blur();
      this.hide(); // Redundant, but blur() is flaky in tests.
    },
    hide() {
      this.hidden = true;
    },
  },
});
