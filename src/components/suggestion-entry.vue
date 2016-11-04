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
          self.isSelected = self.id === prefix;
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
        ohmEditor.semanticsContainer.emit('create:editor', this.type, this.id);
      }
    }
  };
</script>
