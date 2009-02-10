function naanExUtils(name) {
  this._exname = name;

  this._pref = Components.classes['@mozilla.org/preferences-service;1']
    .getService(Components.interfaces.nsIPrefService).getBranch("extensions." + name + ".");

  this._observer = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);

  this._login = Components.classes["@mozilla.org/login-manager;1"]
    .getService(Components.interfaces.nsILoginManager);

  Components.utils.import("resource://gre/modules/JSON.jsm");
}

naanExUtils.prototype = {

  $: function(id) {
    return document.getElementById(id);
  },

  getPanel: function() {

    panel = document.createElement("panel");
    panel.setAttribute("noautofocus", "true");
    panel.setAttribute("noautohide", "true");
    panel.id = "rejawfox-panel";
    var popupset = this.$("rejawfox-popupset");
    popupset.appendChild(panel);
    return panel;
  },

  pref: function () {
    return this._pref;
  },

  notify: function(command) {
    var p = {
      "command": command
    };
    
    if (arguments[1]) {
      for (var i in arguments[1]) {
        p[i] = arguments[1][i];
      }
    }

    this._observer.notifyObservers(null,
                                   this._exname + "-command",
                                   JSON.toString(p));
  },

  getPassword: function(path) {

    if (!path) path = "";

    var result = [];
    var n = 0;

    // for Firefox 3 Login Manager
    //
    try {
      var hostname = "chrome://" + this._exname;
      var logins = this._login.findLogins({}, hostname, "", null);
      n = logins.length;

      if (n == 0) {
        logins = this.migrateAccount();
      }

      // Return first password (not support multi account)
      return {username:logins[0].username, password:logins[0].password};
    }
    catch(e) {
      dump("Can't retrieve password by Login Manager\n");
    }
    return null;
  },

  removePassword: function(user) {
    try {
      // for Login Manager
      var host = "chrome://" + this._exname;
      var logins = this._login.findLogins({}, host, "", null);
      for (var i = 0; i < logins.length; ++i) {
        this._login.removeLogin(logins[i]);
      }
    }
    catch (e) {}
  },
  
  log: function(msg) {
    if (!this._console) {
      this._console = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    }
    this._console.logStringMessage(msg);
  },

  migrateAccount: function() {
    var logins = this._login.getAllLogins({});
    var host = "chrome://" + this._exname;

    for (var i = 0; i < logins.length; ++i) {
      if (logins[i].hostname == host + "/") {
        var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                                     Components.interfaces.nsILoginInfo,
                                                     "init");

        var loginInfo = new nsLoginInfo(host, 
                                        host + "/" + logins[i].username, 
                                        null,
                                        logins[i].username,
                                        logins[i].password,
                                        "username",
                                        "password");
        this._login.modifyLogin(logins[i], loginInfo);
      }
    }
  },

  savePassword: function(user, pass) {
    var host = "chrome://" + this._exname;

    this.removePassword(user);
    try {
      var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1",
                                                   Components.interfaces.nsILoginInfo,
                                                   "init");

      var loginInfo = new nsLoginInfo(host, host + "/" + user, null, user, pass, "username", "password");
      this._login.addLogin(loginInfo);
    }
    catch (e) {}

  },
};
