// Define the Options type
type RequestSentinelOptions = {
    overrideFetch?: boolean;
    overrideXMLHttpRequest?: boolean;
    overrideWebSocket?: boolean;

    ignoreBody?: boolean;
    debug?: boolean;
};

class RequestSentinel {
    // Private props
    static API_KEY: string;
    static appVersion: string;
    static appEnvironment: string;

    // Initialise options with default values
    static options: RequestSentinelOptions;

    // We use the singleton pattern for Request Sentinel
    private static _instance: RequestSentinel;

    static init(API_KEY: string, appVersion:string, appEnvironment: string, options: RequestSentinelOptions 
        = {overrideFetch: true, overrideXMLHttpRequest: true, overrideWebSocket: true, ignoreBody: true, debug: true}) {
        return this._instance || (this._instance = new this(API_KEY, appVersion, appEnvironment, options));
    }
    
    constructor(API_KEY: string, appVersion:string, appEnvironment: string, options: RequestSentinelOptions) {

        RequestSentinel.API_KEY = API_KEY
        RequestSentinel.appVersion = appVersion
        RequestSentinel.appEnvironment = appEnvironment

        RequestSentinel.options = options
        
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

        console.log('Request Sentinel | Initialised')
    }

    static postToAPI(endpoint: string, method: string) {
        // Ignore all requests to RequestSentinel to avoid infinite loop
        if (endpoint.indexOf('api.requestsentinel') !== -1) {
            return;
        }

        const url = "https://api.requestsentinel.com/processor/ingest/request/outgoing";
        const headers = {
            "Content-Type": "application/json",
            "API-KEY": RequestSentinel.API_KEY
        };
    
        const data = {
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
        .catch(error => console.error('Request Sentinel | Error:', error));
    }


    ////// Override Network Functions /////////

    _overrideXMLHttpRequest(callback: (url: string, method: string) => void) {
         const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async: boolean = true, user?: string | null, password?: string | null) {
            if (callback) {
                callback(url as string, method)
            }
            if (RequestSentinel.options.debug) {
                console.log(`Request Sentinel | [XMLHttpRequest] ${method} request to ${url}`);
            }
            return originalOpen.apply(this, arguments as any);
        }
        
        // const originalSend = XMLHttpRequest.prototype.send;
        // XMLHttpRequest.prototype.send = function (body) {
        //     console.log(`Request Sentinel | [XMLHttpRequest] Request body: ${body}`);
        //     return originalSend.apply(this, arguments as any);
        // };
    }

    _overrideFetch(callback: (url: string, method: string) => void) {
        const originalFetch = window.fetch;
        window.fetch = function (input, init) {
            let method = 'GET';
            let url: string;

            if (typeof input === 'string') {
                url = input;
            } else if (input instanceof Request) {
                url = input.url;
            } else {
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
                    console.log(`Request Sentinel | [fetch] ${method} request to ${url}`);
                }
                callback(url as string, method)
            }

            return originalFetch.apply(this, arguments as any);
        };
    }

    _interceptWebSocket(callback: (url: string, method: string) => void) {
        const OriginalWebSocket = window.WebSocket;
        // @ts-ignore: Overriding window.WebSocket
        window.WebSocket = new Proxy(OriginalWebSocket, {
            construct(target: typeof WebSocket, args: ConstructorParameters<typeof WebSocket>) {
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