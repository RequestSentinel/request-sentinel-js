"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var RequestSentinel = /** @class */ (function () {
    function RequestSentinel(API_KEY, appVersion, appEnvironment, options) {
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
        if (options === void 0) { options = {}; }
        var defaultOptions = {
            overrideFetch: true,
            overrideXMLHttpRequest: true,
            overrideWebSocket: true,
            ignoreBody: true,
            debug: false
        };
        var mergedOptions = __assign(__assign({}, defaultOptions), options);
        return this._instance || (this._instance = new this(API_KEY, appVersion, appEnvironment, mergedOptions));
    };
    RequestSentinel.postToAPI = function (endpoint, method) {
        // Ignore all requests to RequestSentinel to avoid infinite loop
        if (endpoint.indexOf(RequestSentinel.REQUEST_SENTINEL_DOMAIN) !== -1) {
            return;
        }
        // Handle relative URLs
        var fullEndpoint = new URL(endpoint, window.location.origin).toString();
        // console.log('Request Sentinel | Intercepted outgoing request to', endpoint, 'with method', method)
        var url = "https://api.requestsentinel.com/processor/ingest/request/outgoing";
        var headers = {
            "Content-Type": "application/json",
            "API-KEY": RequestSentinel.API_KEY
        };
        var data = {
            appVersion: RequestSentinel.appVersion,
            appEnvironment: RequestSentinel.appEnvironment,
            sdk: "js",
            url: fullEndpoint,
            method: method,
            timestamp: new Date().toISOString(),
            // timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(data)
        })
            .then(function (response) {
            if (response.status !== 201) {
                console.error('Request Sentinel | Error:', response);
            }
        }).catch(function (error) { return console.error('Request Sentinel | Error:', error); });
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
                // Even in debug we ignore requests to request_sentinel to keep the logs clean
                var urlString = url.toString();
                if (urlString.indexOf(RequestSentinel.REQUEST_SENTINEL_DOMAIN) == -1) {
                    console.log("Request Sentinel | [XMLHttpRequest] ".concat(method, " request to ").concat(url));
                }
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
                    // Even in debug we ignore requests to request_sentinel to keep the logs clean
                    var urlString = url.toString();
                    if (urlString.indexOf(RequestSentinel.REQUEST_SENTINEL_DOMAIN) == -1) {
                        console.log("Request Sentinel | [fetch] ".concat(method, " request to ").concat(url));
                    }
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
    RequestSentinel.REQUEST_SENTINEL_DOMAIN = 'api.requestsentinel.com';
    return RequestSentinel;
}());
