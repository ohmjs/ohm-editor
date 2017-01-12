<template>
  <div id="promptScreen" v-show="showPrompt">
    <div id="loginBox" v-show="showLoginBox">
      <span class="close" v-on:click="hide">×</span>
      <h2>Log into GitHub</h2>
      <p id="loginBoxMessage">{{ dialogMessage }}</p>
      <form id="gitHubForm" v-on:submit.prevent="tryLogin">
        <label for="username">Username:</label>
        <input type="text" name="username" id="username" v-model="username"><br>
        <label for="password">Password:</label>
        <input type="password" name="password" id="password" v-model="password"><br>
        <input type="submit" value="Login">
      </form>
    </div>
    <div id="newGrammarBox" v-show="showNewGrammarBox">
      <span class="close" v-on:click="hide">×</span>
      <h2>Save Grammar As</h2>
      <p id="newGrammarBoxMessage">{{ dialogMessage }}</p>
      <form id="newGrammarForm" v-on:submit.prevent="createGrammar" v-on:reset="hide">
        <label for="newGrammarName" style="width: 110px">Grammar name:</label>
        <input type="text" name="newGrammarName" id="newGrammarName" v-model="newGrammarName" style="width: 290px"><br>
        <input type="submit" value="Save">
        <input type="reset" value="Cancel">
      </form>
    </div>
  </div>
</template>

<script>
  'use strict';

  module.exports = {
    name: 'promptScreen',
    props: ['onSaveGrammar', 'onLogin', 'dialogId', 'dialogMessage'],
    computed: {
      showPrompt: function() {
        return this.dialogId !== null;
      },
      showNewGrammarBox: function() {
        return this.dialogId === 'newGrammarBox';
      },
      showLoginBox: function() {
        return this.dialogId === 'loginBox';
      }
    },
    methods: {
      createGrammar: function() {
        this.hide();
        this.onSaveGrammar(this.newGrammarName);
        this.newGrammarName = '';
      },
      tryLogin: function() {
        this.hide();
        this.onLogin(this.username, this.password);
        this.username = '';
        this.password = '';
      },
      hide: function() {
        this.dialogId = null;
      }
    },
    data: function() {
      return {
        newGrammarName: '',
        username: '',
        password: ''
      };
    }
  };
</script>

<style>
#promptScreen {
  position: fixed;
  z-index: 15; /* z-index = 11 is .contexMenu */
  padding-top: 200px;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  overflow: auto;
  background-color: rgb(0,0,0);
  background-color: rgba(0,0,0,0.4);
}

#promptScreen > * {
  background-color: #fefefe;
  margin: auto;
  padding: 15px;
  border: 1px solid #888;
  width: 300px;
}

#promptScreen h2 {
  margin: 0;
}

#loginBoxMessage, #newGrammarBoxMessage {
  margin: 8px 8px 0;
  display: inline-block;
  font-size: 14px;
  font-style: italic;
  font-weight: bold;
}

#loginBoxMessage:empty, #newGrammarBoxMessage:empty {
  display: none;
}

#promptScreen label {
  display: inline-block;
  font-size: 14px;
  width: 85px;
}

#promptScreen label,
#promptScreen input[type="submit"],
#promptScreen input[type="reset"] {
  margin-top: 10px;
}

.close {
  color: #aaaaaa;
  float: right;
  margin: -10px -5px 0 0;
  font-size: 20px;
  font-weight: bold;
}

.close:hover, .close:focus {
  color: #e0a;
  text-decoration: none;
  cursor: pointer;
}
</style>