<template>
  <div id="expandedInputWrapper">
    <div id="sizer">&nbsp;</div>
    <canvas id="expandedInput" width="1" height="1"></canvas>
  </div>
</template>

<script>
import {$} from '../domUtil.js';

// Helpers
// -------

function isRectInViewport(rect) {
  return rect.right > 0 && rect.left < window.innerWidth;
}

// Exports
// -------

export default {
  name: 'expanded-input',
  computed: {
    canvasEl() {
      return this.$el.querySelector('canvas');
    },
    inputCtx() {
      return this.canvasEl.getContext('2d');
    },
  },
  mounted() {
    this.update();
  },
  methods: {
    getPixelRatio() {
      return window.devicePixelRatio || 1;
    },

    // Updates the size of the canvas to exactly cover the #sizer element.
    // As a side effect, the contents of the canvas are cleared.
    updateCanvasSize() {
      const el = this.canvasEl;
      const sizer = this.$el.querySelector('#sizer');
      const pixelRatio = this.getPixelRatio();

      el.width = sizer.offsetWidth * pixelRatio;
      el.height = sizer.offsetHeight * pixelRatio;
      el.style.width = sizer.offsetWidth + 'px';
      el.style.height = sizer.offsetHeight + 'px';

      // Fill with white to ensure good antialiasing on the text.
      this.inputCtx.fillStyle = 'white';
      this.inputCtx.fillRect(0, 0, el.width, el.height);
    },
    update(optAnimatingEl, isCollapsing, t) {
      this.updateCanvasSize();

      // If a parse tree node is currently being hovered, highlight it. If not, highlight
      // the node that has .zoomBorder, if one exists.
      const hovered = $('.pexpr > .self:hover');
      const highlightEl = hovered ? hovered.parentNode : $('.zoomBorder');

      // If there is an animating element, crossfade its input with the input of its
      // descendents -- fade in when collapsing, fade out when expanding.
      let animatingElAlpha = 0;
      if (optAnimatingEl) {
        animatingElAlpha = isCollapsing ? t : 1 - t;
      }

      const root = $('.pexpr');
      const firstFailedEl = $(
        '#parseResults > .pexpr > .children > .pexpr.failed'
      );

      const self = this;
      (function renderInput(el, isAncestorAnimating) {
        const rect = el.getBoundingClientRect();

        // Skip anything that falls outside the viewport, and any failed nodes apart
        // from the first top-level failure.
        if (
          !isRectInViewport(rect) ||
          (el.classList.contains('failed') &&
            el !== root &&
            el !== firstFailedEl)
        ) {
          return;
        }

        if (el === highlightEl) {
          self.renderHighlight(el);
        }

        if (
          el.classList.contains('leaf') ||
          el.classList.contains('collapsed')
        ) {
          if (el === firstFailedEl) {
            self.renderFailedInputText(el, rect);
          } else {
            const alpha = isAncestorAnimating ? 1 - animatingElAlpha : 1;
            self.renderInputText(self.getConsumedInput(el), rect, alpha);
          }
        } else {
          // Is `el` currently animating?
          const isAnimating = el === optAnimatingEl;

          // Render the input of the animating element, even though it's not a leaf.
          if (isAnimating) {
            self.renderInputText(
              self.getConsumedInput(el),
              rect,
              animatingElAlpha
            );
          }

          // Ask the subtrees to render.
          Array.from(el.lastChild.childNodes).forEach(childEl => {
            renderInput(childEl, isAnimating || isAncestorAnimating);
          });
        }
      })(root, false);
    },

    measureText(text) {
      // Always update the font before measuring -- devicePixelRatio may have changed.
      this.inputCtx.font =
        16 * this.getPixelRatio() + 'px Menlo, Monaco, monospace';
      return this.inputCtx.measureText(text).width / this.getPixelRatio();
    },

    renderInputText(text, rect, optAlpha) {
      const textWidth = this.measureText(text);
      const letterPadding =
        (rect.right - rect.left - textWidth) / text.length / 2;
      const charWidth = textWidth / text.length;

      this.inputCtx.fillStyle =
        'rgba(51, 51, 51, ' + (optAlpha == null ? 1 : optAlpha) + ')';
      this.inputCtx.textBaseline = 'top';

      const baseRect = $('#expandedInputWrapper').getBoundingClientRect();
      let x = rect.left - baseRect.left;
      const y = 5; // Hack to make the text vertically centered (on macOS at least).
      for (let i = 0; i < text.length; i++) {
        x += letterPadding;
        this.inputCtx.fillText(text[i], x * this.getPixelRatio(), y);
        x += charWidth + letterPadding;
      }
      return x <= window.innerWidth;
    },

    renderFailedInputText(el, rect) {
      const text = el._traceNode.input.substring(el._traceNode.pos);
      const baseRect = $('#expandedInputWrapper').getBoundingClientRect();
      const renderRect = {
        bottom: rect.bottom,
        left: rect.left - baseRect.left,
        right: rect.left - baseRect.left + this.measureText(text),
        top: rect.top,
      };
      this.renderInputText(text, renderRect, 0.5);
    },

    renderHighlight(el) {
      const elBounds = el.getBoundingClientRect();
      const pixelRatio = this.getPixelRatio();
      const baseRect = $('#expandedInputWrapper').getBoundingClientRect();
      const rect = {
        x: (elBounds.left - baseRect.left) * pixelRatio,
        y: 0,
        width: (elBounds.right - elBounds.left) * pixelRatio,
        height: $('#expandedInput').height,
      };
      this.inputCtx.fillStyle = '#B5D5FF';
      this.inputCtx.fillRect(rect.x, rect.y, rect.width, rect.height);
    },

    getConsumedInput(el) {
      if (el._traceNode) {
        return el._traceNode.source.contents;
      }
    },
  },
};
</script>
