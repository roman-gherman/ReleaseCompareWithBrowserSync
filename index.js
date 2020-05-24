const roundround = require('roundround');
const https = require('https');
const httpProxy = require('http-proxy');
const fs = require('fs');
const path = require('path');

const httpsOpts = {
    key: fs.readFileSync(path.join(__dirname, 'agent2-key.pem'), 'utf8'),
    cert: fs.readFileSync(path.join(__dirname, 'agent2-cert.pem'), 'utf8')
};

var config = JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8'));
var nextDestinationRoundRobin = roundround(config.platforms);

var proxy = httpProxy.createProxyServer({
    secure: false, // we ignore SSL certificates check
    autoRewrite: true,
    ssl: httpsOpts,
    protocolRewrite: "https",
    changeOrigin: true,
    selfHandleResponse : true
});

function getDestinatonFromCookie(req)
{
    var cookies = {};
    req.headers.cookie && req.headers.cookie.split(';').forEach(function( cookie ) {
        var parts = cookie.split('=');
        cookies[ parts[ 0 ].trim() ] = ( parts[ 1 ] || '' ).trim();
    });

    return cookies.proxyDestination;
}

function getRegexFromUrl(url)
{
    return new RegExp(getHostFromUrl(url),"g");
}

function getHostFromUrl(url)
{
    var strToSearch = url.replace('https://', '');
    if(strToSearch.endsWith('/'))
    {
        strToSearch = strToSearch.substring(0, strToSearch.length - 1);
    }
    return strToSearch;
}

https.createServer(httpsOpts, function (req, res) {
    var destination = getDestinatonFromCookie(req);
    if(!destination)
    {
        destination = nextDestinationRoundRobin();
        console.log(destination);
    }

    res.setHeader("proxy-destination", destination);
    req.headers['proxy-destination'] = destination;

    proxy.web(req, res, {
        target: destination
    });
}).listen(8000);

console.log("Application has started: https://localhost:8000");

// Listen for the `error` event on `proxy`.
proxy.on('error', function (err, req, res) {
    console.log(err)
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });
    res.end("Error");
});

proxy.on('proxyReq', function(proxyReq, req, res, options) {
    var proxyDestination = req.headers['proxy-destination'];
    var host = getHostFromUrl(proxyDestination);
    // save the host in header so that target site thinks request is done from the correct domain
    proxyReq.setHeader('Host', host);
});

// We need to modify the response to save a cookie - same browser - will always stay on the same RELEASE version
proxy.on('proxyRes', function(proxyRes, req, res) {
    const bodyChunks = [];
    proxyRes.on('data', (chunk) => {
        bodyChunks.push(chunk);
    });
    proxyRes.on('end', () => {
        const body = Buffer.concat(bodyChunks);

        // forwarding source status
        res.statusCode = proxyRes.statusCode;
        delete proxyRes.headers['content-length'];

        var cookiesWereSet = false;
        var proxyDestination = req.headers['proxy-destination'];

        // forwarding source headers
        Object.keys(proxyRes.headers).forEach((key) => {
            if(!cookiesWereSet && key.toLowerCase() == "set-cookie" && proxyDestination)
            {
                var val = proxyRes.headers[key];
                val.push("proxyDestination=" + proxyDestination + ';path=/')
                res.setHeader(key, val);
                cookiesWereSet = true;
            }
            else {
                res.setHeader(key, proxyRes.headers[key]);
            }
        });

        if(proxyDestination && !cookiesWereSet)
        {
            res.setHeader('set-cookie', "proxyDestination=" + proxyDestination + ';path=/');
        }

        // modifying html content
        if (proxyRes.headers['content-type'] && proxyRes.headers['content-type'].includes('text/html')) {
            let html = body.toString();
            html = html.replace(getRegexFromUrl(proxyDestination), 'localhost:8000');
            res.end(new Buffer.from(html));
        } else {
            res.end(body);
        }

        res.end();
    });
});
