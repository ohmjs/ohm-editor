'use strict';

// Private helpers
// ---------------

function countLeadingWhitespace(str) {
  return str.match(/^\s*/)[0].length;
}

function countTrailingWhitespace(str) {
  return str.match(/\s*$/)[0].length;
}

function indexToHeight(cm, index) {
  const pos = cm.posFromIndex(index);
  return cm.heightAtLine(pos.line, 'local');
}

function isBlockSelectable(cm, startPos, endPos) {
  const lastLine = cm.getLine(endPos.line);
  return (
    countLeadingWhitespace(cm.getLine(startPos.line)) === startPos.ch &&
    lastLine.length - countTrailingWhitespace(lastLine) === endPos.ch
  );
}

// Mark a block of text with `className` by marking entire lines.
function markBlock(cm, startLine, endLine, className) {
  for (let i = startLine; i <= endLine; ++i) {
    cm.addLineClass(i, 'wrap', className);
  }
  return {
    clear() {
      for (let i = startLine; i <= endLine; ++i) {
        cm.removeLineClass(i, 'wrap', className);
      }
    },
  };
}

// Exports
// -------

module.exports = {
  markInterval(cm, interval, className, canHighlightBlocks) {
    const startPos = cm.posFromIndex(interval.startIdx);
    const endPos = cm.posFromIndex(interval.endIdx);

    // See if the selection can be expanded to a block selection.
    if (canHighlightBlocks && isBlockSelectable(cm, startPos, endPos)) {
      return markBlock(cm, startPos.line, endPos.line, className);
    }
    return cm.markText(startPos, endPos, {className});
  },

  clearMark(mark) {
    if (mark) {
      mark.clear();
    }
  },

  scrollToInterval(cm, interval) {
    const startHeight = indexToHeight(cm, interval.startIdx);
    const endHeight = indexToHeight(cm, interval.endIdx);
    const scrollInfo = cm.getScrollInfo();
    const margin = scrollInfo.clientHeight - (endHeight - startHeight);
    if (
      startHeight < scrollInfo.top ||
      endHeight > scrollInfo.top + scrollInfo.clientHeight
    ) {
      cm.scrollIntoView(
        {left: 0, top: startHeight, right: 0, bottom: endHeight},
        margin > 0 ? margin / 2 : undefined
      );
    }
  },
};
