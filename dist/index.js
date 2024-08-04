class RequestSentinel {
    static init(API_KEY, appVersion, appEnvironment, options = {}) {
        const defaultOptions = {
            overrideFetch: true,
            overrideXMLHttpRequest: true,
            overrideWebSocket: true,
            ignoreBody: true,
            debug: false
        };
        const mergedOptions = Object.assign(Object.assign({}, defaultOptions), options);
        return this._instance || (this._instance = new this(API_KEY, appVersion, appEnvironment, mergedOptions));
    }
    constructor(API_KEY, appVersion, appEnvironment, options) {
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
    static postToAPI(endpoint, method) {
        // Ignore all requests to RequestSentinel to avoid infinite loop
        if (endpoint.indexOf(RequestSentinel.REQUEST_SENTINEL_DOMAIN) !== -1) {
            return;
        }
        // Handle relative URLs and full paths
        let fullEndpoint;
        try {
            fullEndpoint = new URL(endpoint, window.location.origin);
        }
        catch (error) {
            // If URL constructor fails, it's likely an invalid URL
            console.error('Request Sentinel | Invalid URL:', endpoint);
            return;
        }
        // Extract the base domain
        const URLToSumbit = fullEndpoint.protocol + '//' + fullEndpoint.host;
        // Check if this domain has been seen before
        if (RequestSentinel.uniqueDomains.has(URLToSumbit)) {
            return; // We've already sent a request for this domain
        }
        // Add the new domain to our set
        RequestSentinel.uniqueDomains.add(URLToSumbit);
        // console.log('Request Sentinel | Saving outgoing request to', URLToSumbit);
        const url = "https://api.requestsentinel.com/processor/ingest/request/outgoing";
        const headers = {
            "Content-Type": "application/json",
            "API-KEY": RequestSentinel.API_KEY
        };
        const data = {
            appVersion: RequestSentinel.appVersion,
            appEnvironment: RequestSentinel.appEnvironment,
            sdk: "js",
            url: URLToSumbit,
            method: method,
            timestamp: new Date().toISOString(),
            // timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        };
        fetch(url, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(data)
        })
            .then(response => {
            if (response.status !== 201) {
                console.error('Request Sentinel | Error:', response);
            }
        }).catch(error => console.error('Request Sentinel | Error:', error));
    }
    ////// Override Network Functions /////////
    _overrideXMLHttpRequest(callback) {
        const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method, url, async = true, user, password) {
            if (callback) {
                callback(url, method);
            }
            if (RequestSentinel.options.debug) {
                // Even in debug we ignore requests to request_sentinel to keep the logs clean
                const urlString = url.toString();
                if (urlString.indexOf(RequestSentinel.REQUEST_SENTINEL_DOMAIN) == -1) {
                    console.log(`Request Sentinel | [XMLHttpRequest] ${method} request to ${url}`);
                }
            }
            return originalOpen.apply(this, arguments);
        };
        // const originalSend = XMLHttpRequest.prototype.send;
        // XMLHttpRequest.prototype.send = function (body) {
        //     console.log(`Request Sentinel | [XMLHttpRequest] Request body: ${body}`);
        //     return originalSend.apply(this, arguments as any);
        // };
    }
    _overrideFetch(callback) {
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
            let method = 'GET';
            let url;
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
                    const urlString = url.toString();
                    if (urlString.indexOf(RequestSentinel.REQUEST_SENTINEL_DOMAIN) == -1) {
                        console.log(`Request Sentinel | [fetch] ${method} request to ${url}`);
                    }
                }
                callback(url, method);
            }
            return originalFetch.apply(this, arguments);
        };
    }
    _interceptWebSocket(callback) {
        const OriginalWebSocket = window.WebSocket;
        // @ts-ignore: Overriding window.WebSocket
        window.WebSocket = new Proxy(OriginalWebSocket, {
            construct(target, args) {
                const [url, protocols] = args;
                if (RequestSentinel.options.debug) {
                    console.log(`Request Sentinel | [WebSocket] Connection to ${url}`);
                }
                if (callback) {
                    callback(url.toString(), 'WEBSOCKET');
                }
                return new target(url, protocols);
            }
        });
    }
}
RequestSentinel.REQUEST_SENTINEL_DOMAIN = 'api.requestsentinel.com';
// Keep track of request to unique domains we are making
RequestSentinel.uniqueDomains = new Set();
export default RequestSentinel;
