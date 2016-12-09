/* eslint-env browser */
/* global saveAs, GitHub */

'use strict';

var ohmEditor = require('./ohmEditor');
var domUtil = require('./domUtil');
var restoreExamples = require('./examples').restoreExamples;
var getExamples = require('./examples').getExamples;

function initLocal() {
  var $ = domUtil.$;

  $('#grammars').hidden = false;
  $('#saveGrammarAs').hidden = true;

  var loadedGrammar = 'unnamed.ohm';
  var grammarName = $('#grammarName');

  var loadButton = $('#loadGrammar');
  var grammarFile = $('#grammarFile');
  loadButton.addEventListener('click', function(e) {
    grammarFile.click();
  });
  grammarFile.addEventListener('change', function(e) {
    var file = e.target.files[0];
    if (!file) {
      return;
    }
    var reader = new FileReader();
    var filename = file.name;
    reader.onload = function(e) {
      var src = e.target.result;
      loadedGrammar = filename;
      grammarName.textContent = filename;
      grammarName.classList.remove('unnamed');

      ohmEditor.ui.grammarEditor.setValue(src);
    };
    reader.readAsText(file);
  }, false);

  var saveButton = $('#saveGrammar');
  saveButton.addEventListener('click', function(e) {
    var src = ohmEditor.ui.grammarEditor.getValue();
    // var url = 'data:application/stream;base64,' + btoa(src);
    // window.location = url;

    // use application/octet-stream to force download (not text/ohm-js;charset=utf-8)
    var blob = new Blob([src], {type: 'application/octet-stream'});
    saveAs(blob, loadedGrammar);
  });

  // local storage
  ohmEditor.addListener('change:grammar', function(source) {
    ohmEditor.saveState(ohmEditor.ui.grammarEditor, 'grammar');
  });
}

function initServer(officialGrammars) {
  var $ = domUtil.$;
  var $$ = domUtil.$$;

  $('#grammars').hidden = false;
  $('#grammarName').hidden = true;
  $('#saveIndicator').hidden = false;
  $('#loadGrammar').hidden = true;

  var saveButton = $('#saveGrammar');
  var saveAsButton = $('#saveGrammarAs');

  saveButton.textContent = 'Save';
  saveButton.disabled = true;

  // -------------------------------------------------------
  // PROMPT STUFF
  // -------------------------------------------------------

  function showPrompt(dialogId, optMessage) {
    $('#promptScreen').style.display = 'block';
    Array.prototype.slice.apply($$('#promptScreen > *')).forEach(function(dialog) {
      dialog.hidden = true;
    });
    var messageField = $('#' + dialogId + 'Message');
    if (messageField) {
      messageField.textContent = optMessage || '';
    }
    var dialog = $('#' + dialogId);
    dialog.hidden = false;
    dialog.querySelector('input').focus();
  }
  function hidePrompt() {
    $('#promptScreen').style.display = 'none';
    Array.prototype.slice.apply($$('#promptScreen > *')).forEach(function(dialog) {
      dialog.hidden = true;
    });
  }
  Array.prototype.slice.apply($$('#promptScreen .close')).forEach(function(close) {
    close.addEventListener('click', hidePrompt);
  });

  // -------------------------------------------------------
  // GITHUB LOAD GRAMMARS (GISTS)
  // -------------------------------------------------------

  var grammarList = $('#grammarList');
  grammarList.hidden = false;

  var gitHub = new GitHub();

  function loadFromGist(gistHash, cb) {
    var gist = gitHub.getGist(gistHash);
    gist.read(function(err, res, req) {
      if (err) {
        if (grammarList.selectedOptions[0].classList.contains('shared')) {
          // delete option and select local storage
          grammarList.selectedOptions[0].remove();
          location.hash = '#';
          return;
        }
      }

      var grammarFilename = Object.getOwnPropertyNames(res.files).find(function(filename) {
        return filename.slice(-4) === '.ohm';
      });
      var exampleFilename = Object.getOwnPropertyNames(res.files).find(function(filename) {
        return filename.slice(-5) === '.json';
      });

      var grammarFile = res.files[grammarFilename];
      var exampleFile = res.files[exampleFilename];
      cb(res.description, grammarFile && grammarFile.content, exampleFile && JSON.parse(exampleFile.content));
    });
  }

  function addGrammarGroup(list, label, grammars, beforeElem) {
    var group = list.querySelector('#myGrammars');
    if (group) {
      group.remove();
    }
    group = document.createElement('optgroup');
    group.setAttribute('label', label);
    list.add(group);

    if (!(grammars instanceof Array)) {
      grammars = [];
    }

    grammars.forEach(function(grammarHash) {
      var option = list.querySelector('.shared[value="' + grammarHash + '"]');
      if (!option) {
        option = document.createElement('option');
      }
      option.value = grammarHash;
      var gist = gitHub.getGist(grammarHash);
      gist.read(function(err, res) {
        if (err) {
          console.warn('Could not load Gist ' + grammarHash); // eslint-disable-line no-console
          return;
        }
        option.text = res.description;
        if (beforeElem) {
          group.insertBefore(option, beforeElem);
        } else {
          group.appendChild(option);
        }
      });
    });

    return group;
  }

  function loadUserGrammars(ghUser) {
    ghUser.listGists(function(err, res) {
      if (err) {
        console.log('Error loading Gists: ' + err.message + '(' + err.status + ')'); // eslint-disable-line no-console
        return;
      }
      var grammars = res
        .filter(function(gist) {
          var filenames = Object.getOwnPropertyNames(gist.files);
          var hasJSON = filenames.find(function(filename) { return filename.toLowerCase().slice(-5) === '.json'; });
          var hasOhm = filenames.find(function(filename) { return filename.toLowerCase().slice(-4) === '.ohm'; });
          return hasJSON && hasOhm;
        })
        .sort(function(a, b) { return a.description < b.description; })
        .map(function(gist) { return gist.id; });

      localStorage.setItem('gitHubAuth', btoa(JSON.stringify(ghUser.__auth)));

      var option = document.createElement('option');
      option.value = '!logout';
      option.text = '[Logout]';

      var group = addGrammarGroup(grammarList, 'My Grammars', grammars, option);
      group.id = 'myGrammars';

      group.appendChild(option);
    });
  }

  addGrammarGroup(grammarList, 'Official Ohm Grammars', officialGrammars);

  var gitHubAuth = localStorage.getItem('gitHubAuth');
  if (gitHubAuth) {
    gitHub = new GitHub(JSON.parse(atob(gitHubAuth)));
    loadUserGrammars(gitHub.getUser());
  } else {
    var group = addGrammarGroup(grammarList, 'My Grammars');
    group.id = 'myGrammars';
    var option = document.createElement('option');
    option.value = '!login';
    option.text = '[Log into GitHub...]';
    group.appendChild(option);
  }

  $('#gitHubForm').addEventListener('submit', function(e) {
    hidePrompt();

    var username = $('#username').value;
    $('#username').value = '';
    var password = $('#password').value;
    $('#password').value = '';
    if (username !== '' && password !== '') {
      gitHub = new GitHub({username: username, password: password});
      loadUserGrammars(gitHub.getUser());
    }
    localStorage.removeItem('gitHubAuth');

    e.preventDefault();
    return false;
  });

  // -------------------------------------------------------
  // GITHUB ADD GRAMMARS (GISTS)
  // -------------------------------------------------------

  function saveToGist(description, grammarName, grammarText, examples, gistIdOrNull) {
    var gist = gitHub.getGist(gistIdOrNull);
    var gistData = {
      description: description,
      public: false,
      files: {}
    };
    gistData.files[grammarName + '.ohm'] = {
      content: grammarText,
      type: 'text/ohm-js'
    };
    gistData.files[grammarName + '.json'] = {
      content: JSON.stringify(
        Object.keys(examples).map(function(key) {
          return examples[key];
        }), null, 2
      ),
      type: 'application/json'
    };

    gist[gistIdOrNull ? 'update' : 'create'](gistData, function(err, res) {
      if (!gistIdOrNull) {
        var gistId = res.id;
        var group = grammarList.querySelector('#myGrammars');
        var option = document.createElement('option');
        option.value = gistId;
        option.text = description;
        group.insertBefore(option, group.lastChild);
        grammarList.value = gistId;
        saveButton.disabled = false;
      }

      $('#saveIndicator').classList.remove('edited');
    });
  }

  function save() {
    // FIXME: can only be checked if changes to examples are also noted
    // var active = $('#saveIndicator').classList.contains('edited');
    // if (!active) {
    //   return;
    // }

    var option = grammarList.options[grammarList.selectedIndex];
    var grammarHash = option.value;

    var description = option.label;
    var grammarName = (ohmEditor.grammar && ohmEditor.grammar.name) || 'grammar';
    var grammarText = ohmEditor.ui.grammarEditor.getValue();
    var examples = getExamples();

    saveToGist(description, grammarName, grammarText, examples, grammarHash);
  }
  saveButton.addEventListener('click', save);

  function saveAs() {
    // TODO: check for GitHub user

    showPrompt('newGrammarBox');
  }
  saveAsButton.addEventListener('click', saveAs);

  $('#newGrammarForm').addEventListener('submit', function(e) {
    hidePrompt();

    var description = $('#newGrammarName').value;
    var grammarName = (ohmEditor.grammar && ohmEditor.grammar.name) || 'grammar';
    var grammarText = ohmEditor.ui.grammarEditor.getValue();
    var examples = getExamples();

    saveToGist(description, grammarName, grammarText, examples);

    e.preventDefault();
    return false;
  });
  $('#newGrammarForm').addEventListener('reset', function(e) {
    hidePrompt();
  });

  // -------------------------------------------------------
  // GRAMMAR SELECTION
  // -------------------------------------------------------

  var prevSelection;
  grammarList.addEventListener('click', function(e) {
    prevSelection = grammarList.selectedIndex;
  });

  function setGrammarAndExamples(description, grammar, examples) {
    if (description) {
      document.title = 'Ohm - ' + description;
      grammarList.selectedOptions[0].text = description;
    } else {
      document.title = 'Ohm';
    }

    ohmEditor.once('change:grammar', function(_) {
      $('#saveIndicator').classList.remove('edited');
    });
    if (examples) {
      ohmEditor.once('parse:grammar', function(matchResult, grammar, err) {
        restoreExamples(examples);
      });
    }

    restoreExamples([]); // clear examples
    ohmEditor.setGrammar(grammar);
  }

  grammarList.addEventListener('change', function(e) {
    var grammarHash = grammarList.options[grammarList.selectedIndex].value;

    if (grammarHash === '!login') {
      showPrompt('loginBox');
      grammarList.selectedIndex = prevSelection;
      return;
    } else if (grammarHash === '!logout') {
      localStorage.removeItem('gitHubAuth');
      gitHub = new GitHub();

      var group = addGrammarGroup(grammarList, 'My Grammars');
      group.id = 'myGrammars';
      var option = document.createElement('option');
      option.value = '!login';
      option.text = '[Log into GitHub...]';
      group.appendChild(option);

      if ((grammarList.options.length - 1) > prevSelection) {
        grammarList.selectedIndex = prevSelection;
      } else {
        location.hash = '#';
      }
      return;
    }

    location.hash = '#' + grammarHash;
    loadFromHash();
  });

  function loadFromHash() {
    var grammarHash = location.hash.slice(1);

    var options = Array.prototype.slice.apply(grammarList.options);
    options.reverse(); // to match my grammars first
    var option = options.find(function(option) {
      return option.value === grammarHash;
    });
    if (!option) { // shared grammar or not yet loaded
      option = document.createElement('option');
      option.value = grammarHash;
      option.text = '[shared grammar]';
      option.classList.add('shared');
      grammarList.insertBefore(option, grammarList.querySelector('optgroup'));
    }
    options = Array.prototype.slice.apply(grammarList.options);
    grammarList.selectedIndex = options.indexOf(option);

    if (grammarHash === '') { // local storage
      setGrammarAndExamples(null, null, 'examples' /* local storage key */);
      saveButton.disabled = true;
      return false;
    }

    var optGroup = grammarList[grammarList.selectedIndex].parentElement;
    if (optGroup.id === 'myGrammars') {
      saveButton.disabled = false;
    } else {
      saveButton.disabled = true;
    }
    loadFromGist(grammarHash, setGrammarAndExamples);
  }
  window.loadFromHash = loadFromHash;

  ohmEditor.ui.grammarEditor.setOption('extraKeys', {
    'Cmd-S': function(cm) {
      if (saveButton.disabled) {
        saveAs();
      } else {
        save();
      }
    }
  });

  ohmEditor.addListener('change:grammar', function(source) {
    var grammar = grammarList.options[grammarList.selectedIndex].value;
    if (grammar === '') { // local storage
      ohmEditor.saveState(ohmEditor.ui.grammarEditor, 'grammar');
    } else {
      $('#saveIndicator').classList.add('edited');
    }
  });

  window.addEventListener('hashchange', loadFromHash);
  if (location.hash !== '') {
    loadFromHash();
  }
}

// Main
// -------

if (window.location.protocol !== 'file:') {
  var officialGrammars = [
    '7f62adb8df879a5eb8288dbbddcc663f' // Arithmetic
  ];
  initServer(officialGrammars);
} else {
  initLocal();
}

// Exports
// -------

module.exports = {
  local: initLocal,
  server: initServer
};
