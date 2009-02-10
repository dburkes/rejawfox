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

const CLASS_ID = Components.ID("e8fe4da0-651d-11dd-ad8b-0800200c9a66");
const CLASS_NAME = "Rejawfox";
const CONTRACT_ID = "@dburkes/rejawfox;1";
const NETWORK_TIMEOUT_TIME = 120;
const ERROR_INTERVAL = 60;
const OBSERVE_INTERVAL = 30;

const REJAW_API_URL = "api.rejaw.com/v1/";
const APP_NAME = "RejawFox";
const REJAWFOX_API_KEY = "dsN8WRzrDg7";

var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

function toUTF8Octets(string) {
  return unescape(encodeURIComponent(string));
}

function btoa(input) {
  var output = "";
  var chr1, chr2, chr3;
  var enc1, enc2, enc3, enc4;
  var i = 0;

  do {
    chr1 = input.charCodeAt(i++);
    chr2 = input.charCodeAt(i++);
    chr3 = input.charCodeAt(i++);

    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;

    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }

    output = output + keyStr.charAt(enc1) + keyStr.charAt(enc2) +
      keyStr.charAt(enc3) + keyStr.charAt(enc4);
  } while (i < input.length);

  return output;
}

function HttpRequest() {
  this.responseText = "";
  this.status = 0;

  var observer = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
  observer.addObserver(this, "http-on-modify-request", false);
  observer.addObserver(this, "http-on-examine-response", false);
}

HttpRequest.prototype = {

  httpChannel: function() {
    return this.channel.QueryInterface(Components.interfaces.nsIHttpChannel);
  },

  setURI: function(url) {
    this.__url = url;
    var ioService = Components.classes["@mozilla.org/network/io-service;1"].getService(Components.interfaces.nsIIOService);
    var URI = ioService.newURI(url, null, null);

    this.channel = ioService.newChannelFromURI(URI);
  },

  setRedirectLimitation: function(num) {
    this.httpChannel().redirectionLimit = num;
  },

  asyncOpen: function() {
    this.channel.notificationCallbacks = this;
    this.channel.asyncOpen(this, null);
  },

  setPostData: function(data) {
    var upStream = Components.classes["@mozilla.org/io/string-input-stream;1"].createInstance(Components.interfaces.nsIStringInputStream);
    upStream.setData(data, data.length);
    var upChannel = this.channel.QueryInterface(Components.interfaces.nsIUploadChannel);
    upChannel.setUploadStream(upStream, "application/x-www-form-urlencoded", -1);

    this.httpChannel().requestMethod = "POST";
  },

  setRequestHeader: function(header, param) {
    this.httpChannel().setRequestHeader(header, param, true);
  },

  getResponseHeader: function(header) {
    this.httpChannel().getResponseHeader(header);
  },

  setAuthHeader: function(user, pass) {
    this.user = user;
    this.pass = pass;
  },

  abort: function() {
    if (this.timer) {
      this.timer.cancel();
    }
    this.channel.cancel(Components.results.NS_BINDING_ABORTED);
    this.cannnel = null;
  },

  onStartRequest: function(request, context) {
    this.responseText = "";
    try {
      this.status = this.httpChannel().responseStatus;
      this.date   = this.httpChannel().getResponseHeader("Date");
    }
    catch (e) {}
  },

  onDataAvailable: function(request, context, stream, offset, length) {
    var scriptableInputStream = 
      Components.classes["@mozilla.org/scriptableinputstream;1"]
        .createInstance(Components.interfaces.nsIScriptableInputStream);
    scriptableInputStream.init(stream);

    this.responseText += scriptableInputStream.read(length);
  },
  
  onStopRequest: function(request, context, status) {
    if (Components.isSuccessCode(status)) {
      if (this.onload) this.onload(this);
    }
    else if (status != Components.results.NS_BINDING_ABORTED) {
      if (this.onerror) this.onerror(this);
    }
    var observer = Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService);
    observer.removeObserver(this, "http-on-modify-request");
    observer.removeObserver(this, "http-on-examine-response");
  },

  onChannelRedirect: function(oldChannel, newChannel, flags) {
    if (this._onredirect) {
      this._onredirect(oldChannel, newChannel, flags);
    }
    else {
      this.channel = newChannel;
    }
  },

  observe: function(subject, topic, data) {
    // Do not use user cookies
    //
    if (subject == this.channel) {
      if (topic == "http-on-modify-request") {
        this.httpChannel().setRequestHeader("Cookie", "", false);
      }
      else if (topic == "http-on-examine-response") {
        this.httpChannel().setResponseHeader("Set-Cookie", "", false);
      }

      if (topic == "http-on-modify-request" && this.user) {
        this.httpChannel().setRequestHeader("Authorization", "Basic " + btoa(toUTF8Octets(this.user + ":" + this.pass)), false);
      }
    }
  },

  // nsIInterfaceRequestor
  getInterface: function(aIID) {
    try {
      return this.QueryInterface(aIID);
    }
    catch (e) {
      throw Components.results.NS_NOINTERFACE;
    }
  },

  // nsIProgressEventSink (to shut up annoying debug exceptions
  onProgress: function(request, context, progress, progressmax) {},
  onStatus: function(request, context, status, statusArg) {},
  
  // nsIHttpEventSink (to shut up annoying debug exceptions
  onRedirect: function(oldChannel, newChannel) {},

  // nsIAuthPromptProvider (to shut up annoying debug exceptions
  getAuthPrompt: function(reason) {},

  QueryInterface: function(aIID) {
    if (aIID.equals(Components.interfaces.nsISupports) ||
        aIID.equals(Components.interfaces.nsIObserver) ||
        aIID.equals(Components.interfaces.nsISupportsWeakReference) ||
        aIID.equals(Components.interfaces.nsIWebProgress) ||
        aIID.equals(Components.interfaces.nsIDocShell) ||
        aIID.equals(Components.interfaces.nsIDocShellTreeItem) ||
        aIID.equals(Components.interfaces.nsIPrompt) ||
        aIID.equals(Components.interfaces.nsIAuthPrompt) ||
        aIID.equals(Components.interfaces.nsIAuthPromptProvider) ||
        aIID.equals(Components.interfaces.nsIInterfaceRequestor) ||
        aIID.equals(Components.interfaces.nsIChannelEventSink) ||
        aIID.equals(Components.interfaces.nsIProgressEventSink) ||
        aIID.equals(Components.interfaces.nsIHttpEventSink) ||
        aIID.equals(Components.interfaces.nsIStreamListener))
      return this;

    throw Components.results.NS_NOINTERFACE;
  }
};

/////////////////////////////////////////////////////////////////////////
//
// Session manager.
//
function Session() {
  this._console = null;
  Components.utils.import("resource://gre/modules/JSON.jsm");
}

Session.prototype = {
  setDelayTask: function(delay, func, data, type) {
    var timer = Components.classes["@mozilla.org/timer;1"] 
      .createInstance(Components.interfaces.nsITimer); 

    var target = this;

    if (type == null) {
      type = Components.interfaces.nsITimer.TYPE_ONE_SHOT;
    }

    timer.initWithCallback({
      notify: function() {
          target[func](data);
        }
      },
      delay,
      type);
    return timer;
  },

  createRequest: function(func, param, isPost) {
    var ns = func.split(".");
    var requestURL = "";
    var requestParam = "";

    var request = new HttpRequest;

    if (ns.length > 1) {
      request.callback = ns[0] + "_" + ns[1];
      requestURL       = ns[0] + "/" + ns[1];
    }
    else {
      request.callback = func;
      requestURL       = func;
    }

    if (func == "event.observe") {
      requestURL = "http://" + Math.floor(Math.random() * 100) + "." + REJAW_API_URL + requestURL + ".json";
    }
    else {
      requestURL = "http://" + REJAW_API_URL + requestURL + ".json";
    }

    if (!param) param = {};

    if (this._session) {
      param.session = this._session;
    }

    for (var attr in param) {
      if (requestParam) requestParam += "&";
      requestParam += attr + "=" + encodeURIComponent(param[attr]);
    }

    if (isPost) {
      request.setURI(requestURL);
    }
    else {
      request.setURI(requestURL + '?' + requestParam);
    }

    var target = this;
    request.onload  = function(p) { target._onload(p)  };
    request.onerror = function(p) { target._onerror(p) };

    if (isPost) {
      request.setPostData(requestParam);
    }

    this.log(requestURL);

    // set timeout
    request.timer = this.setDelayTask(NETWORK_TIMEOUT_TIME * 1000, "_ontimeout", request);

    var pref = Components.classes['@mozilla.org/preferences-service;1']
      .getService(Components.interfaces.nsIPrefBranch);

    request.asyncOpen();
    return request;
  },

  post: function(func, params) {
    this.createRequest(func, params, true);
  },

  get: function(func, params) {
    this._req = this.createRequest(func, params, false);
  },

  notifyStatus: function(sts, obj) {

    var msg = {"state": sts, "data": obj};

    Components.classes["@mozilla.org/observer-service;1"]
        .getService(Components.interfaces.nsIObserverService)
    .notifyObservers(null, "rejawfox-status", JSON.toString(msg));
  },

  _onload: function(req) {
    if (req.timer) {
      req.timer.cancel();
    }

    this.log(req.__url + " / status: " + req.status);

    this.onLoad(req);
  },

  _onerror: function(req) {
    var msg = "Request error occurred";
    this.reportError(msg + " ("  + req.callback + ": " + req.status + ")");
    if (req.timer) {
      req.timer.cancel();
    }

    if (this.handleError) {
      this.handleError(req, msg)
    }
    else {
      this.onError(req);
    }

  },

  _ontimeout: function(req) {
    var msg = "Request timeout";
    this.reportError(msg + " (" + req.callback + ")");
    req.abort();

    if (this.handleError) {
      this.handleError(req, msg)
    }
    else {
      this.onTimeout(req);
    }

  },

  onLoad:    function(req) {},
  onError:   function(req) {},
  onTimeout: function(req) {},

  reportError: function(msg) {
    var pref = Components.classes['@mozilla.org/preferences-service;1']
      .getService(Components.interfaces.nsIPrefBranch);

    if (pref.getBoolPref("extensions.rejawfox.debug")) {
      Components.utils.reportError(msg);
    }
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

/////////////////////////////////////////////////////////////////////////
//
// Rejawfox main component.
//
function Rejawfox() {
  var obs = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);

  obs.addObserver(this, "xpcom-shutdown", false);
  obs.addObserver(this, "rejawfox-command", false);
}

// This is the implementation of your component.
var rejawfox_prototypes = {
  _timer: null,
  _session: "",
  _counter: 0,
  _lastUpdate: 0,

  // for nsISupports
  QueryInterface: function(aIID) {
    // add any other interfaces you support here
    if (!aIID.equals(Components.interfaces.nsISupports) && 
        !aIID.equals(Components.interfaces.nsIObserver) &&
        !aIID.equals(Components.interfaces.nsIRejawfox))
        throw Components.results.NS_ERROR_NO_INTERFACE;
    return this;
  },

  // for nsIObserver
  //
  observe: function(subject, topic, data) { 
    switch (topic) {

    case "rejawfox-command":
      this.handleCommand(data);
      break;

    case "xpcom-shutdown":
      this.destroy();
      break;
    }
  },

  handleCommand: function(data) {
    var msg = JSON.fromString(data);
    this[msg.command](msg);
  },

  //
  // commands and response handlers
  //
  initSession: function(user) {

    if (this._timer) {
      this._timer.cancel();
    }

    if (user) {
      this._loginId  = user.username;
      this._password = user.password;
    }

    this.updatePref();

    this._session = "";
    this._counter = 0;
    this.get("session.create", {api_key:REJAWFOX_API_KEY});
  },

  session_create: function(response, request) {
    this.log("session create:" + response.session);
    this._session = response.session;

    this.post("auth.signin", {username: this._loginId, password: this._password});
  },

  session_create_error: function(reason, request) {
    this._timer = this.setDelayTask(ERROR_INTERVAL * 1000,
                                    "initSession",
                                    {username:this._loginId, password:this._password});
  },

  auth_signin: function(response, request) {
    this._username = response.username;
    this.log("Signed in as:" + response.username);

    this.notifyStatus("signedIn", response.username);

    this.subscribeSubscription();
  },

  auth_signin_error: function(reason, request) {
    this.notifyStatus("authFail", this._loginId);
    this.logout();
  },

  subscribeSubscription: function() {
    this.get("subscription.subscribe", 
             {topic: "/user/" + this._username + "/conversations, " + 
                     "/user/" + this._username + "/conversation_messages"});
      
  },

  subscription_subscribe: function(response, request) {
    this._counter = response.counter;
    this._lastUpdate = new Date();
    this.observeEvent();
  },

  subscription_subscribe_error: function(reason, request) {
    this._timer = this.setDelayTask(ERROR_INTERVAL * 1000, "subscribeSubscription", null);
  },

  observeEvent: function() {
    this.get("event.observe", {counter:this._counter});
  },

  event_observe: function(response, request) {
    var count = 0;

    if (response.events) { 

      for (var i in response.events) {
        var event = response.events[i];
        if (event.closed) {
          continue;
        }
        var message = event.joined ? event.joined : event;
        if (message.serial_number > this._counter &&
            message.username != this._username) {
          this.notifyStatus("messageReceived", message);
          ++count;
          this._lastUpdate = new Date();
        }
      }
    }

    if (count == 0) {
      var now = new Date();
      var diff = Math.floor((now - this._lastUpdate) / (60 * 1000));
      this.notifyStatus("setIdle", diff);
    }

    if (response.counter) {
      this._counter = response.counter;
    }

    this.get("event.observe", {counter:this._counter});
  },

  event_observe_error: function(reason, request) {
    this._timer = this.setDelayTask(OBSERVE_INTERVAL * 1000, "observeEvent", null);
  },

  updatePref: function() {
      // do nothing so far
  },

  changeAccount: function(account) {

    // reset session
    this.logout();
    this.initSession(account);
  },

  logout: function() {
    if (this._timer) {
      this._timer.cancel();
    }

    if (this._req) {
      this._req.abort();
    }

    this._loginId  = null;
    this._password = null;
    this._counter  = 0;
    this._session  = 0;
  },

  destroy: function(e) {
    if (this._timer) {
      this._timer.cancel();
      this._timer = null;
    }
    if (this._req) {
      this._req.abort();
    }

    var obs = Components.classes["@mozilla.org/observer-service;1"]
      .getService(Components.interfaces.nsIObserverService);

    obs.removeObserver(this, "xpcom-shutdown");
    obs.removeObserver(this, "rejawfox-command");
 },

  // Network handler
  //
  onLoad: function(req) {
    switch (Number(req.status)) {
    case 400:
    case 403:
    case 404:
    case 500:
    case 502:
    case 503:
      this.handleError(req, "Rejaw server responded with an error (" + req.status + ")");
      break;
 
    case 200:
    case 304:
    default:
      var resp = null;
      if (!req.responseText.match(/^\s*$/)) {
        dump(req.responseText + "\n");
        try {
          var resp = JSON.fromString(req.responseText);
        }
        catch (e) {
          this.reportError("An error occurred while requesting " + req.__url);
          this.log("Response text: " + e.message);
          this.handleError(req, "Can't parse JSON. Rejaw server responded with an error.");
        }
      }

      if (resp == null || (resp && resp.error)) {
        if (resp && resp.error) {
          this.log(resp.error.code + ":" + resp.error.message);
          switch (resp.error.code) {
          case 102:
          case 106:
          case 111:
          case 113:
            this.initSession();
            break;

          default:
            this.handleError(req, resp.error.message);
            break;
          }
        }
        else {
          this.handleError(req, "Rejaw server responded with an error");
        }
      }
      else {
        this[req.callback](resp, req);
      }
      break;
    }
  },

  handleError: function(req, msg) {

    this.notifyStatus("internalError", msg + " (" + req.callback + ")");

    if (this[req.callback + "_error"]) {
      this[req.callback + "_error"]("error", req);
    }
  },

  onError: function(req) {

    this.notifyStatus("internalError", "Network error with " + req.callback);

    if (this._timer) {
      this._timer.cancel();
    }
  },

  onTimeout: function (req) {
    this.notifyStatus("internalError", "Request timeout with " + req.callback);

    if (this._timer) {
      this._timer.cancel();
    }
  },
}

Rejawfox.prototype = new Session;

for (var i in rejawfox_prototypes) {
  Rejawfox.prototype[i] = rejawfox_prototypes[i];
}

//=================================================
// Note: You probably don't want to edit anything
// below this unless you know what you're doing.
//
// Singleton
var gRejawfox = null;

// Factory
var RejawfoxFactory = {
  createInstance: function (aOuter, aIID)
  {
    if (aOuter != null)
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    if (gRejawfox === null) {
      gRejawfox = new Rejawfox().QueryInterface(aIID);
    }
    return gRejawfox;
  }
};

// Module
var RejawfoxModule = {
  registerSelf: function(aCompMgr, aFileSpec, aLocation, aType) {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);

    Components.classes["@mozilla.org/categorymanager;1"]
      .getService(Components.interfaces.nsICategoryManager)
        .addCategoryEntry("app-startup", 
                          CLASS_NAME,
                          "service," + CONTRACT_ID,
                          true, true);
  },

  unregisterSelf: function(aCompMgr, aLocation, aType)
  {
    aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
    aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);        

    Components.classes["@mozilla.org/categorymanager;1"]
      .getService(Components.interfaces.nsICategoryManager)
        .deleteCategoryEntry("app-startup", 
                             CLASS_NAME,
                             true);
  },
  
  getClassObject: function(aCompMgr, aCID, aIID)  {
    if (!aIID.equals(Components.interfaces.nsIFactory))
      throw Components.results.NS_ERROR_NOT_IMPLEMENTED;

    if (aCID.equals(CLASS_ID))
      return RejawfoxFactory;

    throw Components.results.NS_ERROR_NO_INTERFACE;
  },

  canUnload: function(aCompMgr) { return true; }
};

//module initialization
function NSGetModule(aCompMgr, aFileSpec) { return RejawfoxModule; }

