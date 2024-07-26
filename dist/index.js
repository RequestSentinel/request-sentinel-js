"use strict";
var RequestSentinel = /** @class */ (function () {
    function RequestSentinel(API_KEY, appVersion, appEnvironment, options) {
        // const { overrideFetch = true, overrideXMLHTTP = false } = options;
        RequestSentinel.API_KEY = API_KEY;
        RequestSentinel.appVersion = appVersion;
        RequestSentinel.appEnvironment = appEnvironment;
        RequestSentinel.options = options;
        // We add an interceptor for XMLHttpRequest
        if (options.overrideXMLHttpRequest) {
            this._overrideXMLHttpRequest(RequestSentinel.postToAPI);
        }
        // We add an interceptor for fetch
        if (options.overrideFetch) {
            this._overrideFetch(RequestSentinel.postToAPI);
        }
        if (options.overrideWebSocket) {
            this._interceptWebSocket(RequestSentinel.postToAPI);
        }
        console.log('Request Sentinel | Initialised');
    }
    RequestSentinel.init = function (API_KEY, appVersion, appEnvironment, options) {
        if (options === void 0) { options = { overrideFetch: true, overrideXMLHttpRequest: true, overrideWebSocket: true, ignoreBody: true, debug: true }; }
        return this._instance || (this._instance = new this(API_KEY, appVersion, appEnvironment, options));
    };
    RequestSentinel.postToAPI = function (endpoint, method) {
        // Ignore all requests to RequestSentinel to avoid infinite loop
        if (endpoint.indexOf('api.requestsentinel') !== -1) {
            return;
        }
        var url = "https://api.requestsentinel.com/processor/ingest/request/outgoing";
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
            .catch(function (error) { return console.error('Request Sentinel | Error:', error); });
    };
    ////// Override Network Functions /////////
    RequestSentinel.prototype._overrideXMLHttpRequest = function (callback) {
        var originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
            if (async === void 0) { async = true; }
            if (callback) {
                callback(url, method);
            }
            if (RequestSentinel.options.debug) {
                console.log("Request Sentinel | [XMLHttpRequest] ".concat(method, " request to ").concat(url));
            }
            return originalOpen.apply(this, arguments);
        };
        // const originalSend = XMLHttpRequest.prototype.send;
        // XMLHttpRequest.prototype.send = function (body) {
        //     console.log(`Request Sentinel | [XMLHttpRequest] Request body: ${body}`);
        //     return originalSend.apply(this, arguments as any);
        // };
    };
    RequestSentinel.prototype._overrideFetch = function (callback) {
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
            if (init && init.body) {
                // console.log(`Request Sentinel | [fetch] Request body: ${init.body}`);
            }
            if (callback) {
                if (RequestSentinel.options.debug) {
                    console.log("Request Sentinel | [fetch] ".concat(method, " request to ").concat(url));
                }
                callback(url, method);
            }
            return originalFetch.apply(this, arguments);
        };
    };
    RequestSentinel.prototype._interceptWebSocket = function (callback) {
        var OriginalWebSocket = window.WebSocket;
        // @ts-ignore: Overriding window.WebSocket
        window.WebSocket = new Proxy(OriginalWebSocket, {
            construct: function (target, args) {
                var url = args[0], protocols = args[1];
                if (RequestSentinel.options.debug) {
                    console.log("Request Sentinel | [WebSocket] Connection to ".concat(url));
                }
                if (callback) {
                    callback(url.toString(), 'WEBSOCKET');
                }
                return new target(url, protocols);
            }
        });
    };
    return RequestSentinel;
}());
