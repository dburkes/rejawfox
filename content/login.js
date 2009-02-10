const RejawfoxLogin = {

  util: new naanExUtils("rejawfox"),
  keyconfig: ["togglePopup", "insertURL"],
  vkNames: [],
  platformKeys: {},
  localKeys: {},
 
  onLoad: function() {

    var $ = this.util.$;
    this.strings = document.getElementById("rejawfox-strings");

    var logins = this.util.getPassword();

    if (logins) {
      this.util.$("username").value = logins.username;
      this.util.$("password").value = logins.password;
    }

    this.accountChanged = false;
  },

  onUnload: function() {
    try {
      window.opener.gRejawfox._prefWindow = null;
    }
    catch (e) {}
  },

  showMessage: function(msg) {
    this.util.$("message").value = msg;
  },

  onChangeAccount: function() {
    this.accountChanged = true;
  },

  onSubmit: function() {
    var $ = this.util.$;

    this.util.savePassword($("username").value, $("password").value);

    this.util.notify("updatePref");
    if (this.accountChanged) {
      this.util.notify("changeAccount", {username:$("username").value, password:$("password").value});
      this.util.pref().setBoolPref("login", true);
    }

    return true;
  },

  onCancel: function() {
    try {
      window.opener.gRejawfox._prefWindow = null;
    }
    catch (e) {}
  }
};

