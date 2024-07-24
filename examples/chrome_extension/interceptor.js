chrome.webRequest.onBeforeRequest.addListener(
    function(details)
    {
        console.log("Request Sentinel Chrome Extension");
        console.log("URL:", details.url);
        console.log("Method:", details.method);
        if (details.requestBody) {
            let requestBody = '';
            if (details.requestBody.raw) {
                requestBody = String.fromCharCode.apply(null, new Uint8Array(details.requestBody.raw[0].bytes));
            }
            console.log("Request Body:", requestBody);
        }
    },
    {urls: ["<all_urls>"]},
    ['requestBody']
);