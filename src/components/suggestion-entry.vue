<template>
  <div class="entry" :class="[type, {selected: isSelected}]" :id="id"
       @mouseover="highlight" @click="select">
    {{ name }}
    <span class="case" v-if="extra && extra.length > 0">{{ extra }}</span>
  </div>
</template>

<script>
  /* global window */
  'use strict';

  // Hack to let both mouseover and up&down arrow both work for suggestion list
  var mousePos = {x: 0, y: 0};
  var isScrolled = false;
  window.onmousemove = function(event) {
    var preMousePos = mousePos;
    var currMousePos = {x: event.screenX, y: event.screenY};
    isScrolled = currMousePos.x === preMousePos.x && currMousePos.y === preMousePos.y;
    mousePos = currMousePos;
  };

  // Check if a name is a restrict JS identifier
  // TODO: it less restrictive in the future
  function isNameValid(name) {
    return /^[a-zA-Z_$][0-9a-zA-Z_$]*$/.test(name);
  }

  var ohmEditor = require('../ohmEditor');

  module.exports = {
    props: ['type', 'name', 'extra', 'id', 'index'],
    data: function() {
      return {
        isSelected: this.index === 0
      };
    },
    mounted: function() {
      var self = this;
      ohmEditor.semanticsContainer.addListener('select:suggestion', function(key) {
        if (!self.isSelected) {
          return;
        }

        if (key === 'current') {
          self.select();
        } else if (key === 'previous') {
          self.$nextTick(function() {
            ohmEditor.semanticsContainer.emit('highlight:suggestion',
              self.$el.previousSibling || self.$el);
          });
        } else if (key === 'next') {
          self.$nextTick(function() {
            ohmEditor.semanticsContainer.emit('highlight:suggestion',
              self.$el.nextSibling || self.$el);
          });
        }
      });

      ohmEditor.semanticsContainer.addListener('highlight:suggestion', function(elem) {
        self.isSelected = elem === self.$el;
        if (self.isSelected) {
          self.$el.scrollIntoView(false);
        }
      });

      ohmEditor.semanticsContainer.addListener('show:suggestions', function(prefix) {
        self.$nextTick(function() {
          self.isSelected = self.index === 0;
        });
      });
    },
    methods: {
      highlight: function() {
        if (isScrolled) {
          return;
        }
        ohmEditor.semanticsContainer.emit('highlight:suggestion', this.$el);
      },
      select: function() {
        if (!isNameValid(this.id)) {
          return;
        }
        ohmEditor.semanticsContainer.emit('create:editor', this.type, this.id);
      }
    }
  };
</script>
