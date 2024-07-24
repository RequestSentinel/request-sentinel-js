"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var RequestSentinel = /** @class */ (function () {
    function RequestSentinel(API_KEY, appVersion, appEnvironment, options) {
        // const { overrideFetch = true, overrideXMLHTTP = false } = options;
        console.log('Constructing with key', API_KEY);
        RequestSentinel.API_KEY = API_KEY;
        RequestSentinel.appVersion = appVersion;
        RequestSentinel.appEnvironment = appEnvironment;
        this.options = options;
        // We add an interceptor for XMLHttpRequest
        if (options.overrideXMLHttpRequest) {
            this._overrideXMLHttpRequest(RequestSentinel.postToAPI);
        }
        // We add an interceptor for fetch
        if (options.overrideFetch) {
            this._overrideFetch();
        }
        if (options.overrideWebSocket) {
            this._interceptWebSocket();
        }
    }
    RequestSentinel.init = function (API_KEY, appVersion, appEnvironment, options) {
        if (options === void 0) { options = { overrideFetch: true, overrideXMLHttpRequest: true, overrideWebSocket: true, ignoreBody: true }; }
        return this._instance || (this._instance = new this(API_KEY, appVersion, appEnvironment, options));
    };
    RequestSentinel.postToAPI = function (endpoint, method) {
        // Ignore all requests to RequestSentinel to avoid infinite loop
        if (endpoint.indexOf('localhost') !== -1) {
            return;
        }
        var url = "http://localhost:8080/processor/ingest/request/outgoing";
        var headers = {
            "Content-Type": "application/json",
            "API-KEY": RequestSentinel.API_KEY
        };
        var data = {
            appVersion: RequestSentinel.appVersion,
            appEnvironment: RequestSentinel.appEnvironment,
            sdk: "js",
            url: endpoint,
            method: method,
            timestamp: new Date().toISOString(),
            // timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(data)
        })
            .then(function (response) { return response.json(); })
            .then(function (data) { return console.log('Request Sentinel | Response:', data); })
            .catch(function (error) { return console.error('Request Sentinel | Error:', error); });
    };
    RequestSentinel.prototype.outgoingFetchRequest = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        console.log.apply(console, __spreadArray(['Request Sentinel | Outgoing Fetch request:'], args, false));
    };
    RequestSentinel.prototype.outgoingXHRRequest = function (method, url, async, username, password) {
        if (async === void 0) { async = true; }
        console.log('Request Sentinel | Outgoing XHR request:', { method: method, url: url, async: async, username: username, password: password });
    };
    RequestSentinel.prototype._overrideXMLHttpRequest = function (callback) {
        var originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
            if (async === void 0) { async = true; }
            callback(url, method);
            console.log("Request Sentinel | [XMLHttpRequest] ".concat(method, " request to ").concat(url));
            return originalOpen.apply(this, arguments);
        };
        var originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (body) {
            console.log("Request Sentinel | [XMLHttpRequest] Request body: ".concat(body));
            return originalSend.apply(this, arguments);
        };
    };
    RequestSentinel.prototype._overrideFetch = function () {
        var originalFetch = window.fetch;
        window.fetch = function (input, init) {
            var method = 'GET';
            var url;
            if (typeof input === 'string') {
                url = input;
            }
            else if (input instanceof Request) {
                url = input.url;
            }
            else {
                url = input.toString();
            }
            if (init && init.method) {
                method = init.method;
            }
            console.log("Request Sentinel | [fetch] ".concat(method, " request to ").concat(url));
            if (init && init.body) {
                console.log("Request Sentinel | [fetch] Request body: ".concat(init.body));
            }
            return originalFetch.apply(this, arguments);
        };
    };
    RequestSentinel.prototype._interceptWebSocket = function () {
        var originalWebSocket = window.WebSocket;
        window.WebSocket = /** @class */ (function (_super) {
            __extends(class_1, _super);
            function class_1(url, protocols) {
                console.log("Request Sentinel | [WebSocket] Connection to ".concat(url));
                return _super.call(this, url, protocols) || this;
            }
            return class_1;
        }(originalWebSocket));
    };
    return RequestSentinel;
}());
