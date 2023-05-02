/* global CodeMirror */

import ohmEditor from './ohmEditor.js';
import {$} from './domUtil.js';

// Returns the first ancestor node of `el` that has class `className`.
function ancestorWithClassName(el, className) {
  let node = el;
  while ((node = node.parentElement) != null) {
    if (node.classList.contains(className)) {
      return node;
    }
  }
}

function installEventHandlers(editor, footer, findCallback) {
  const input = footer.querySelector('input[type=search]');

  // Install a temporary keymap while the toolbar is open, which makes Cmd-F
  // refocus the search bar rather than starting a new search.
  const tempKeyMap = {fallthrough: 'default'};
  tempKeyMap['Cmd-F'] = tempKeyMap['Ctrl-F'] = function doFind(cm) {
    const selection = cm.getSelection();

    // If there's no selection or it's the same as the current search, refocus the search bar.
    // Otherwise, start a new search.
    if (selection.length === 0 || selection === input.value) {
      input.select();
    } else {
      cm.execCommand('findPersistent');
    }
  };
  editor.addKeyMap(tempKeyMap);

  // Handles find-related keys when the search bar has focus. `binding` is the result
  // of looking up the key in `tempKeyMap`. Returns `true` if the key was handled, and
  // `false` otherwise.
  const handleKey = function (binding) {
    if (typeof binding === 'function') {
      binding(editor);
      return true;
    } else if (typeof binding === 'string' && binding.indexOf('find') === 0) {
      editor.execCommand(binding);
      return true;
    }
    return false;
  };

  const closeFooter = function () {
    footer.parentNode.removeChild(footer);
    editor.execCommand('clearSearch');
    editor.removeKeyMap(tempKeyMap);
    editor.focus();
  };

  // Handler for keydown events in the search bar.
  footer.onkeydown = function (e) {
    const keyName = CodeMirror.keyName(e);
    if (keyName === 'Esc') {
      closeFooter();
      editor.focus();
    } else if (e.target === input && keyName === 'Enter') {
      findCallback(input.value, e);
    } else if (
      CodeMirror.lookupKey(keyName, tempKeyMap, handleKey) === 'handled'
    ) {
      e.preventDefault();
    }
  };

  const closeButton = footer.querySelector('.closeButton');
  closeButton.onclick = closeFooter;
}

// An implementation of CodeMirror's `openDialog` API, but specialized for use
// as the search box. As such, it might not be very well suited to other purposes.
CodeMirror.defineExtension('openDialog', function (template, callback, opts) {
  const editor = this; // eslint-disable-line no-invalid-this

  // Re-use the existing footer if it's visible, or create a new one.
  const container = ancestorWithClassName(
    editor.getWrapperElement(),
    'flex-fix'
  ).parentNode;
  let footer = container.querySelector('.footer');
  if (!footer) {
    footer = $('#protos .footer').cloneNode(true);
    container.appendChild(footer);
    footer.removeAttribute('hidden');
    installEventHandlers(editor, footer, callback);
  }

  const closeButton = footer.querySelector('.closeButton');
  const input = footer.querySelector('input[type=search]');

  if (opts.value) {
    input.value = opts.value;
  }
  input.select();
  return closeButton.onclick;
});

// A keymap which maps Ctrl-F/Cmd-F to 'findPersistent' (rather than 'find').
const editorKeyMap = {};
editorKeyMap['Ctrl-F'] = editorKeyMap['Cmd-F'] = 'findPersistent';

const handleEditorInit = function (cm) {
  cm.addKeyMap(editorKeyMap);
};
ohmEditor.addListener('init:inputEditor', handleEditorInit);
ohmEditor.addListener('init:grammarEditor', handleEditorInit);
