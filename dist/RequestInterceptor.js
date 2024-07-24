"use strict";
var RequestInterceptor = /** @class */ (function () {
    function RequestInterceptor() {
        this.interceptXMLHttpRequest();
        this.interceptFetch();
        this.interceptWebSocket();
    }
    RequestInterceptor.prototype.interceptXMLHttpRequest = function () {
        var originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, async, user, password) {
            console.log("[XMLHttpRequest] ".concat(method, " request to ").concat(url));
            return originalOpen.apply(this, arguments);
        };
        var originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (body) {
            console.log("[XMLHttpRequest] Request body: ".concat(body));
            return originalSend.apply(this, arguments);
        };
    };
    RequestInterceptor.prototype.interceptFetch = function () {
        var originalFetch = window.fetch;
        window.fetch = function (input, init) {
            var method = 'GET';
            var url = typeof input === 'string' ? input : input.url;
            if (init && init.method) {
                method = init.method;
            }
            console.log("[fetch] ".concat(method, " request to ").concat(url));
            if (init && init.body) {
                console.log("[fetch] Request body: ".concat(init.body));
            }
            return originalFetch.apply(this, arguments);
        };
    };
    RequestInterceptor.prototype.interceptWebSocket = function () {
        var originalWebSocket = window.WebSocket;
        window.WebSocket = function (url, protocols) {
            console.log("[WebSocket] Connection to ".concat(url));
            var ws = new originalWebSocket(url, protocols);
            var originalSend = ws.send;
            ws.send = function (data) {
                console.log("[WebSocket] Sent data: ".concat(data));
                return originalSend.apply(this, arguments);
            };
            return ws;
        };
    };
    return RequestInterceptor;
}());
// To use the interceptor
var interceptor = new RequestInterceptor();
