<style>
.main-grid {
  display: grid;
  flex: 1;
  grid-template-areas:
    'grammar vsplit viz'
    'hsplit vsplit viz'
    'examples vsplit viz';
}
.splitter {
  background-color: #ddd;
  grid-area: hsplit;
  height: 1px;
  min-height: 1px;
  overflow: visible;
  position: relative;
}
.vertical.splitter {
  grid-area: vsplit;
  height: auto;
  min-height: auto;
  min-width: 1px;
  width: 1px;
}
.splitter .handle {
  bottom: -2px;
  cursor: ns-resize;
  left: 0;
  position: absolute;
  right: 0;
  top: -2px;
  z-index: 10;
}
.vertical.splitter .handle {
  bottom: 0;
  cursor: ew-resize;
  left: -2px;
  right: -2px;
  top: 0;
}
</style>

<template>
  <div class="main-grid" :style="styleObj">
    <div id="grammarContainer">
      <div class="section-head flex-row">
        <h2>Grammar</h2>
        <div id="grammarControls" class="flex-row" hidden>
          <select id="grammarList" aria-label="Selected grammar" hidden>
            <option value="">[local storage]</option>
          </select>
          <button class="outline-btn" id="saveGrammar">Save</button>
          <div id="grammarDropdown">
            <!--
                See components/ellipsis-dropdown.js. This is initialized
                lazily because the dropdown isn't always enabled.
                -->
          </div>
        </div>
      </div>
      <div class="flex-fix">
        <div ref="editorWrapper" class="editorWrapper"></div>
      </div>
    </div>
    <div ref="vSplitter" class="splitter vertical"></div>
    <example-list ref="exampleList" @chevronClick="onChevronClick" />
    <div ref="hSplitter" class="splitter"></div>
    <div id="visualizerContainer"></div>
  </div>
</template>

<script>
import ExampleList from './example-list.js';
import {initGrammarEditor} from '../ohmEditor.js';
import {initializeSplitter} from '../splitters.js';

const DEFAULT_ROW_SIZES = ['2fr', '1fr'];

export default {
  components: {
    'example-list': ExampleList,
  },
  props: {},
  data: () => ({
    colSizes: ['1fr', '1fr'],
    rowSizes: DEFAULT_ROW_SIZES,
    savedRowSizes: undefined,
  }),
  computed: {
    styleObj() {
      return {
        gridTemplateColumns: `${this.colSizes[0]} 1px ${this.colSizes[1]}`,
        gridTemplateRows: `${this.rowSizes[0]} 1px ${this.rowSizes[1]}`,
      };
    },
  },
  mounted() {
    initializeSplitter(this.$refs.vSplitter, true, this.setColumnSplit);
    initializeSplitter(
      this.$refs.hSplitter,
      false,
      this.setRowSplit,
      this.rowAdjustmentDone
    );
    initGrammarEditor(this.$refs.editorWrapper);
  },
  methods: {
    onChevronClick(willCollapse) {
      if (willCollapse) {
        // Save the size so we can restore it when its uncollapsed.
        this.savedRowSizes = this.rowSizes;
        this.rowSizes = ['1fr', 'min-content'];
      } else if (this.savedRowSizes) {
        this.rowSizes = this.savedRowSizes;
        this.savedRowSizes = undefined;
      } else {
        this.rowSizes = DEFAULT_ROW_SIZES;
      }
    },
    setColumnSplit(a, b) {
      if (a === -1) {
        this.colSizes = ['1fr', '1fr'];
      } else {
        this.colSizes = ['1fr', `${b}px`];
      }
    },
    setRowSplit(a, b) {
      const {exampleList} = this.$refs;

      if (a === -1) {
        this.rowSizes = ['1fr', '1fr'];
      } else {
        this.rowSizes = ['1fr', `max(${b}px, ${exampleList.minHeight}px)`];
      }

      // Allow collapsing/uncollapsing via dragging.
      if (b < exampleList.minHeight) {
        exampleList.collapsed = true;
      } else {
        exampleList.collapsed = false;
      }
    },
  },
};
</script>
