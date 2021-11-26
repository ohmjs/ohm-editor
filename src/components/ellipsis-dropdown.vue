<style src="../../public/third_party/css/bootstrap-dropdown-3.3.7.css"></style>

<style>
button.ellipsis-btn {
  border: none;
  font-size: 18px;
  font-weight: 900;
  margin-top: 1px;
  padding: 0 4px;
}
button.ellipsis-btn:hover {
  background-color: #eee;
  border: none;
}
.dropdown-menu {
  margin-top: 4px;
}
</style>

<template>
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
</template>

<script>
export default {
  name: 'ellipsis-dropdown',
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
};
</script>
