/* ***** BEGIN LICENSE BLOCK *****
 *   Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is RejawFox.
 *
 * The Initial Developer of the Original Code is
 * Kazuho Okui.
 * Portions created by the Initial Developer are Copyright (C) 2006
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 * 
 * ***** END LICENSE BLOCK ***** */

const REJAW_TOP_URL = "http://rejaw.com/";

function Rejawfox() {
  this._prefWindow = null;
  this._showBalloon = true;
  this._balloonQueue = new Array();
  this._focusOnBallon = false;
  this._util = new naanExUtils("rejawfox");
}

Rejawfox.prototype = {

  $: function(name) {
    return document.getElementById(name);
  },

  load: function() {

    Components.utils.import("resource://gre/modules/ISO8601DateUtils.jsm");
    Components.utils.import("resource://gre/modules/JSON.jsm");
    //this.initKeyConfig();
    
    // Don't init RejawFox when the window is a popup.
    if (window.toolbar.visible == false) {
      var btn = this.$("rejawfox-statusbar-button");;
      var parent = btn.parentNode;
      parent.removeChild(btn);
      return;
    }

    this._strings = this.$("rejawfox-strings");

    var target = this;

    Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService)
        .addObserver(gRejawfox, "rejawfox-status", false);

    // Setup menuitem
    var menu = this.$("rejawfox-menuitem-togglepopup");
    this._showBalloon = this._util.pref().getBoolPref("popup");
    menu.setAttribute("checked", this._showBalloon);

    // Create panel
    this._panel = this._util.getPanel();

    // Init session
    if (this._util.pref().getBoolPref("login")) {
      this.login();
    }
    else {
      this.logout();
    }

    this._unescapeHTML = Components.classes["@mozilla.org/feed-unescapehtml;1"]
                           .getService(Components.interfaces.nsIScriptableUnescapeHTML);
  },

  unload: function() {
    if (window.toolbar.visible == false) return;

    Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService)
          .removeObserver(gRejawfox, "rejawfox-status");
  },

  observe: function(subject, topic, data) {
    if (topic != "rejawfox-status") return;

    var msg = JSON.fromString(data);
    if (this[msg.state]) {
      this[msg.state](msg.data);
    }
  },

  authFail: function(user) {
    if (!this._prefWindow) {
      var prompt = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
        .getService(Components.interfaces.nsIPromptService);
      var msg = this._strings.getFormattedString("AuthFail", [user]);
      prompt.alert(window, "RejawFox", msg);
      this.logout();
    }
    else {
      this._prefWindow.focus();
    }
    this.showErrorMessage(msg);
  },

  internalError: function(data) {
    this.showErrorMessage(data);
  },

  //
  // event handlers and observer receivers
  //
  signedIn: function(username) {
    this.showMessage();
    this.setButtonState("active");
  },

  messageReceived: function(message) {

    if (!this._showBalloon) return;

    try {
      message.permalink = REJAW_TOP_URL + (message.owner || message.username) + "/" + message.type.split(":")[0] + "/" + message.cid;
      if (message.permalink == content.document.location.toString()) {
        return;
      }
    }
    catch (e) {
    }

    this.showMessage();
    this.setButtonState("active");
    if (this.isActiveWindow()) {
      var elem = this.createMessageBalloon(message, false);
      this.popupBalloon(elem);
    }
  },

  setIdle: function(idleMinutes) {
    if (idleMinutes > 5) {
      this.setButtonState("idle");
      this.showMessage(this.distanceOfTimeInWords(idleMinutes) + " idle");
    }
    else {
      this.setButtonState("active");
      this.showMessage();
    }
  },

  onTimeoutBalloon: function(id) {

    if (this._focusOnBalloon) {
      this._balloonQueue.push(id);
      return;
    }

    var elem = this.$(id);
    if (elem) {
      this._panel.removeChild(elem);
    }
    if (this._panel.childNodes.length == 0) {
      this._panel.hidePopup();
    }
  },

  flushBalloonQueue: function() {
    for (var i = 0; i < this._balloonQueue.length; ++i) {
      var id = this._balloonQueue[i];
      this.onTimeoutBalloon(id);
    }
  },

  onMouseOverBalloon: function() {
    this._focusOnBalloon = true;
    if (this._timer) {
      clearTimeout(this._timer);
    }
  },

  onMouseOutBalloon: function() {
    this._focusOnBalloon = false;
    if (this._balloonQueue.length > 0) {
      this._timer = setTimeout("gRejawfox.flushBalloonQueue()", 1000);
    }
  },

  showMessage: function(message) {
    var elem = this.$("rejawfox-message-tooltip");
    if (message) {
      elem.setAttribute("value", message);
    }
    else {
      this.setButtonState("active");
      elem.setAttribute("value", "RejawFox");
    }
  },

  showErrorMessage: function(message) {
    var elem = this.$("rejawfox-message-tooltip");
    this.setButtonState("error");
    elem.setAttribute("value", message);
  },

  setButtonState: function(state) {
    var btn = this.$("rejawfox-statusbar-button");
    btn.setAttribute("state", state);
  },

  popupBalloon: function(elem) {

    this._panel.appendChild(elem);

    setTimeout(function() {gRejawfox.onTimeoutBalloon(elem.id);}, 5 * 1000);

    var button = document.getElementById("rejawfox-statusbar-button");
    var statusbar = this.$("status-bar");
    this._panel.openPopup(statusbar, "before_end", -16, 2, false, true);
  },

  removeAllBalloon: function() {
    try {
      while (this._panel.childNodes.length) {
        this._panel.removeChild(this._panel.firstChild);
      }
      this._panel.hidePopup();
    }
    catch (e) {}
  },

  createMessageBalloon: function(msg, highlight) {

    var elem = document.createElement("vbox");
    elem.className = "rejawfox-balloon";
    elem.id = "balloon-" + msg.serial_number;

    try {
      elem.setAttribute("userpage", REJAW_TOP_URL + msg.username);
      elem.setAttribute("permalink", msg.permalink);
      elem.setAttribute("fullname", msg.fullname ? this.decodeUTF8(msg.fullname) : msg.username);
      elem.setAttribute("username", msg.username);
      if (highlight) {
        elem.setAttribute("unread", !msg.unread);
      }

      var timestamp = ISO8601DateUtils.parse(msg.timestamp);
      var time_and_source = this.getLocalTimeForDate(timestamp);
      elem.setAttribute("time", time_and_source);

      var textnode = this.replaceLinkText(this.decodeUTF8(msg.text));

      textnode.setAttribute("tooltiptext", time_and_source);
      elem.appendChild(textnode);

      elem.setAttribute("image_url", msg.image_url);
    }
    catch (e) {
      this.log("Failed to create message balloon: " + e.message);
    }

    return elem;
  },

  onClickStatusbarIcon: function(e) {
  },

  onBalloonClick: function(e) {
    var node = e.target;
    var url = node.getAttribute('userpage');
    if (!url) {
      url = node.getAttribute('permalink');
      while (node) {
        node = node.parentNode;
        url = node.getAttribute('permalink');
        if (url) break;
      }
    }

    if (url) {
      this.showMessage();
      this.openURL(url);
      //this.closePopup(false);
    }
  },

  openURL: function(url) {
    var tabbrowser = gBrowser;
    var tabs = tabbrowser.tabContainer.childNodes;
    for (var i = 0; i < tabs.length; ++i) {
      var tab = tabs[i];
      try {
        var browser = tabbrowser.getBrowserForTab(tab);
        if (browser) {
          var doc = browser.contentDocument;
          var loc = doc.location.toString();
          if (loc == url) {
            gBrowser.selectedTab = tab;
            return;
          }
        }
      }
      catch (e) {
      }
    }
    
    // There is no tab. open new tab...
    var tab = gBrowser.addTab(url, null, null);
    gBrowser.selectedTab = tab;
  },

  onPreference: function(e) {
    if (this._prefWindow) {
      this._prefWindow.focus();
      return true;
    }

    this._prefWindow = window.openDialog("chrome://rejawfox/content/login.xul", 
                                         "_blank",
                                         "chrome,resizable=no,dependent=yes");
    return true;
  },

  onTogglePopup: function(e) {
    var menu = this.$("rejawfox-menuitem-togglepopup");
    this._showBalloon = !this._showBalloon;
    menu.setAttribute("checked", this._showBalloon);
    this._util.pref().setBoolPref("popup", this._showBalloon);
  },

  toggleLogin: function() {
    if (this._util.pref().getBoolPref("login")) {
      this.logout();
    }
    else {
      this.login();
    }
  },

  login: function() {
    var loginInfo = this._util.getPassword();
    if (loginInfo == null) {
      this.onPreference();
    }
    else {
      this._util.notify("initSession", loginInfo);
      this.$("rejawfox-menuitem-logout").setAttribute("label", this._strings.getString("SignOut"));
      this._util.pref().setBoolPref("login", true);
    }
  },

  logout: function() {
    this.setButtonState("");
    this.$("rejawfox-menuitem-logout").setAttribute("label", this._strings.getString("SignIn"));

    // Close balloon and popup window, reset window settings
    this.removeAllBalloon();
    this._util.pref().setBoolPref("login", false);
  },

  //
  // Private utilities
  //
  isActiveWindow: function() {

    var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"]
      .getService(Components.interfaces.nsIWindowMediator);

    var win = wm.getMostRecentWindow("");
    return (win == window) ? true : false;
  },

  replaceLinkText : function(text) {

    var elem = document.createElement("description");
    elem.className = "rejawfox-message-body";

    var pat = /((http(s?))\:\/\/)([0-9a-zA-Z\-]+\.)+[a-zA-Z]{2,6}(\:[0-9]+)?(\/([\w#!:.?+=&%@~*\';,\-\/\$])*)?/g;
    while (pat.exec(text) != null) {
      var left = RegExp.leftContext;
      var url = RegExp.lastMatch;
      text = RegExp.rightContext;

      elem.appendChild(document.createTextNode(left));

      var urltext = url;
      if (url.length > 27) {
        urltext = url.substr(0, 27) + "...";
      }
      var anchor = this.createAnchorText(url, urltext, true);
      elem.appendChild(anchor);
      pat.lastIndex = 0;
    }

    if (text) {
      elem.appendChild(document.createTextNode(text));
    }

    return elem;
  },

  createAnchorText: function(link, text, doTinyURL) {
      var anchor = document.createElement("a");
      anchor.className = "rejawfox-hyperlink";
      anchor.setAttribute("href", link);

      anchor.setAttribute("tooltiptext", link);

      anchor.appendChild(document.createTextNode(text));

      return anchor;
  },

  removeAllChild: function(obj) {
    while(obj.firstChild) obj.removeChild(obj.firstChild);
  },

  getLocalTimeForDate: function(time) {

    system_date = new Date(time);
    user_date = new Date();
    delta_minutes = Math.floor((user_date - system_date) / (60 * 1000));
    if (Math.abs(delta_minutes) <= (8 * 7 * 24 * 60)) { // eight weeks... I'm lazy to count days for longer than that
      distance = this.distanceOfTimeInWords(delta_minutes);
      if (delta_minutes < 0) {
        return this._strings.getFormattedString("DateTimeFromNow", [distance]);
      } else {
        return this._strings.getFormattedString("DateTimeAgo", [distance]);
      }
    } else {
      return this._strings.getFormattedString("OnDateTime", [system_date.toLocaleDateString()]);
    }
  },

  // a vague copy of rails' inbuilt function, 
  // but a bit more friendly with the hours.
  distanceOfTimeInWords: function(minutes) {
    if (minutes.isNaN) return "";

    var index;

    minutes = Math.abs(minutes);
    if (minutes < 1)         index = 'LessThanAMinute';
    else if (minutes < 50)   index = (minutes == 1 ? 'Minute' : 'Minutes');
    else if (minutes < 90)   index = 'AboutOneHour';
    else if (minutes < 1080) {
      minutes = Math.round(minutes / 60);
      index = 'Hours';
    }
    else if (minutes < 1440) index = 'OneDay';
    else if (minutes < 2880) index = 'AboutOneDay';
    else {
      minutes = Math.round(minutes / 1440);
      index = 'Days';
    }
    return this._strings.getFormattedString(index, [minutes]);
  },

  decodeUTF8: function(text) {
    return decodeURIComponent(escape(text));
  },

  log: function(msg) {
    var pref = Components.classes['@mozilla.org/preferences-service;1']
      .getService(Components.interfaces.nsIPrefBranch);

    if (pref.getBoolPref("extensions.rejawfox.debug")) {
      if (this._console == null) 
        this._console = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
      this._console.logStringMessage(msg);
      dump(msg + "\n");
    }
  }

};

var gRejawfox = new Rejawfox();

window.addEventListener("load", function(e) { gRejawfox.load(e); }, false);
window.addEventListener("unload", function(e) { gRejawfox.unload(e); }, false);
