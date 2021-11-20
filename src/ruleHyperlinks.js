/* global window */

'use strict';

const cmUtil = require('./cmUtil');
const ohmEditor = require('./ohmEditor');

let grammar;
let grammarEditor;
let grammarMemoTable;
let mouseCoords;
let mark;
let markWordInfo;

let isMouseDown;

function isPlatformMac() {
  return /Mac/.test(window.navigator.platform);
}

function areLinksEnabled(e) {
  const modifierKey = isPlatformMac() ? e.metaKey : e.ctrlKey;
  return modifierKey && !e.shiftKey && !e.altKey && !e.ctrlKey;
}

function updateLinks(cm, e) {
  cmUtil.clearMark(mark);
  markWordInfo = null;

  if (mouseCoords && grammarMemoTable && areLinksEnabled(e)) {
    const wordInfo = getWordUnderPoint(cm, mouseCoords.x, mouseCoords.y);
    if (isRuleApplication(wordInfo)) {
      mark = cm.markText(wordInfo.startPos, wordInfo.endPos, {
        css: 'text-decoration: underline; color: #268BD2; cursor: pointer;',
      });
      markWordInfo = wordInfo;
    }
  }
}

function handleMouseMove(cm, e) {
  mouseCoords = {x: e.clientX, y: e.clientY};
  if (!isMouseDown) {
    updateLinks(cm, e);
  }
}

function getWordUnderPoint(cm, x, y) {
  const pos = cm.coordsChar({left: x, top: y});
  const wordPos = cm.findWordAt(pos);
  return {
    startIdx: cm.indexFromPos(wordPos.anchor),
    startPos: wordPos.anchor,
    endPos: wordPos.head,
    value: cm.getRange(wordPos.anchor, wordPos.head).trim(),
  };
}

function isRuleApplication(wordInfo) {
  if (
    wordInfo.value.length > 0 &&
    grammarMemoTable &&
    grammarMemoTable[wordInfo.startIdx]
  ) {
    const memo = grammarMemoTable[wordInfo.startIdx].memo;
    if (memo && memo.Base_application && memo.Base_application.value) {
      return true;
    }
  }
  return false;
}

function goToRuleDefinition(ruleName) {
  const interval = grammar.rules[ruleName].source;
  if (interval) {
    const defMark = cmUtil.markInterval(
      grammarEditor,
      interval,
      'active-definition',
      true
    );
    setTimeout(defMark.clear.bind(defMark), 1000);
    cmUtil.scrollToInterval(grammarEditor, interval);
  }
}

function isSameWord(cm, a, b) {
  return (
    cm.indexFromPos(a.startPos) === cm.indexFromPos(b.startPos) &&
    cm.indexFromPos(a.endPos) === cm.indexFromPos(b.endPos)
  );
}

function registerListeners(editor) {
  editor
    .getWrapperElement()
    .addEventListener('mousemove', handleMouseMove.bind(null, editor));
  window.addEventListener('keydown', updateLinks.bind(null, editor));
  window.addEventListener('keyup', updateLinks.bind(null, editor));

  // Prevent CodeMirror's default behaviour for Cmd-click, which is to place an additional
  // cursor at the clicked location. This must be done during the capture phase.
  editor.on(
    'mousedown',
    function (cm, e) {
      isMouseDown = true;
      if (areLinksEnabled(e)) {
        e.preventDefault();
      }
    },
    true
  );

  // It's not possible to capture `click` events inside the editor window, so do link
  // navigation on mouseup.
  editor.getWrapperElement().addEventListener('mouseup', function (e) {
    isMouseDown = false;
    if (markWordInfo) {
      const wordInfo = getWordUnderPoint(editor, e.clientX, e.clientY);
      if (isSameWord(editor, wordInfo, markWordInfo)) {
        goToRuleDefinition(markWordInfo.value);
      }
    }
  });
}

ohmEditor.addListener('parse:grammars', function (matchResult, grammars, err) {
  if (!grammarEditor) {
    grammarEditor = ohmEditor.ui.grammarEditor;
    registerListeners(grammarEditor);
  }
  grammar = grammars ? Object.values(grammars)[0] : undefined;
  grammarMemoTable = matchResult.succeeded()
    ? matchResult.matcher.memoTable
    : null;
});
