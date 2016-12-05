<template>
  <div id="suggestions" v-show="showing">
    <suggestion-entry v-for="(suggestion, index) in suggestions"
                      :type="suggestion.type" :name="suggestion.name"
                      :extra="suggestion.extra" :id="suggestion.id" :index="index">
    </suggestion-entry>
</template>

<script>
  'use strict';

  var ohmEditor = require('../ohmEditor');

  var suggestionEntry = require('./suggestion-entry.vue');

  // Get the list of rules that start with given prefix.
  function retrieveMatchedRules(prefix) {
    var ruleDict = ohmEditor.grammar.rules;
    return Object.keys(ruleDict).filter(function(rule) {
      return rule.startsWith(prefix);
    });
  }

  module.exports = {
    components: {
      'suggestion-entry': suggestionEntry
    },
    computed: {
      suggestions: function() {
        var suggestions = [];

        if (!this.showing) {
          return suggestions;
        }

        var prefix = this.prefix;
        if (prefix) {
          suggestions.push({
            type: 'helper',
            name: prefix,
            extra: 'a helper function',
            id: prefix
          });
        }

        // Add all the rules that started with the prefix to the suggestion list.
        var matchedRules = retrieveMatchedRules(prefix);
        matchedRules.forEach(function(ruleKey) {
          var ruleParts = ruleKey.split('_');
          suggestions.push({
            type: 'rule',
            name: ruleParts[0],
            extra: ruleParts[1],
            id: ruleKey
          });
        });

        return suggestions;
      }
    },
    data: function() {
      return {
        showing: false,
        prefix: ''
      };
    },
    mounted: function() {
      var self = this;
      ohmEditor.semanticsContainer.addListener('show:suggestions', function(prefix) {
        self.showing = true;
        self.prefix = prefix;
      });

      ohmEditor.semanticsContainer.addListener('hide:suggestions', function() {
        self.showing = false;
      });

    }
  };
</script>