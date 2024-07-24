// Define the Options type
type RequestSentinelOptions = {
    overrideFetch?: boolean;
    overrideXMLHttpRequest?: boolean;
    overrideWebSocket?: boolean;

    ignoreBody?: boolean;
};

class RequestSentinel {
    // Private props
    static API_KEY: string;
    static appVersion: string;
    static appEnvironment: string;

    // Initialise options with default values
    private options: RequestSentinelOptions;

    // We use the singleton pattern for Request Sentinel
    private static _instance: RequestSentinel;

    static init(API_KEY: string, appVersion:string, appEnvironment: string, options: RequestSentinelOptions 
        = {overrideFetch: true, overrideXMLHttpRequest: true, overrideWebSocket: true, ignoreBody: true}) {
        return this._instance || (this._instance = new this(API_KEY, appVersion, appEnvironment, options));
    }
    
    constructor(API_KEY: string, appVersion:string, appEnvironment: string, options: RequestSentinelOptions) {
        // const { overrideFetch = true, overrideXMLHTTP = false } = options;
        console.log('Constructing with key', API_KEY)

        RequestSentinel.API_KEY = API_KEY
        RequestSentinel.appVersion = appVersion
        RequestSentinel.appEnvironment = appEnvironment

        this.options = options
        
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

    static postToAPI(endpoint: string, method: string) {

        // Ignore all requests to RequestSentinel to avoid infinite loop
        if (endpoint.indexOf('localhost') !== -1) {
            return;
        }

        const url = "http://localhost:8080/processor/ingest/request/outgoing";
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
        .then(response => response.json())
        .then(data => console.log('Request Sentinel | Response:', data))
        .catch(error => console.error('Request Sentinel | Error:', error));
    }

    outgoingFetchRequest(...args: any[]) {
        console.log('Request Sentinel | Outgoing Fetch request:', ...args);
    }

    outgoingXHRRequest(method: string, url: string | URL, async: boolean = true, username?: string, password?: string) {
        console.log('Request Sentinel | Outgoing XHR request:', { method, url, async, username, password });
    }

    _overrideXMLHttpRequest(callback: (url: string, method: string) => void) {
         const originalOpen = XMLHttpRequest.prototype.open;
        XMLHttpRequest.prototype.open = function (method: string, url: string | URL, async: boolean = true, user?: string | null, password?: string | null) {
            callback(url as string, method)
            console.log(`Request Sentinel | [XMLHttpRequest] ${method} request to ${url}`);
            return originalOpen.apply(this, arguments as any);
        }
        
        const originalSend = XMLHttpRequest.prototype.send;
        XMLHttpRequest.prototype.send = function (body) {
            console.log(`Request Sentinel | [XMLHttpRequest] Request body: ${body}`);
            return originalSend.apply(this, arguments as any);
        };
    }

    _overrideFetch() {
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
            console.log(`Request Sentinel | [fetch] ${method} request to ${url}`);
            if (init && init.body) {
                console.log(`Request Sentinel | [fetch] Request body: ${init.body}`);
            }
            return originalFetch.apply(this, arguments as any);
        };
    }

    _interceptWebSocket() {
        const originalWebSocket = window.WebSocket;
        window.WebSocket = class extends originalWebSocket {
            constructor(url: string | URL, protocols?: string | string[]) {
                console.log(`Request Sentinel | [WebSocket] Connection to ${url}`);
                super(url, protocols);
            }
        };
    }
}