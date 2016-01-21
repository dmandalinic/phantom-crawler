var validUrl = require('valid-url');
var async = require('async');
var os = require('os');
var numCpus = os.cpus().length;
var town_config = {
    pageCount: numCpus * 2,
    phantomFlags: {
        "ssl-protocol": 'any',
        "disk-cache": "yes",
        "max-disk-cache-size": "30000"
    },
    workerCount: numCpus * 2
};

var town = require("ghost-town")(town_config);


if (town.isMaster) {
    var concurrency = numCpus * 2;
    var url = process.argv[2];
    var visited = new Set();
    var visiting = new Set();
    var failed = new Set();

    if (!validUrl.isWebUri(url)) throw 'URL is not valid or present! Please pass it as argument to the script.';
    var masterQueue = async.queue(function (url, callback) {
        if (visited.has(url) || visiting.has(url)){
            callback();
            return;
        }
        visiting.add(url);
        town.queue(url, function (err, data) {
            if (err == false) {
                visited.add(data.justVisited);
                visiting.delete(data.justVisited);
                async.each(data.urls, function (url, asyncCb) {
                    masterQueue.push(url);
                    asyncCb();
                }, function(){
                    callback();
                });
            } else {
                visiting.delete(data.justVisited);
                failed.add(data.justVisited);
                callback(err);
            }

        })
    }, concurrency);
    masterQueue.push(url);
} else {
    town.on('queue', function (page, url, next) {
        page.set('onLoadFinished', function (success) {
            console.log('page loaded - ' + url);
            //so something here - just make sure to call next at the right time
            page.evaluate(parseAllLinks, function (result) {
                next(false, {
                    justVisited: url,
                    urls: filterByDomain(getDomain(url), result)
                });
            });
        });
        page.open(url, function (status) {
            if (status !== 'success') {
                next(new Error('Page not loaded'), []);
                return;
            }

        });
    });
}

function sayHi(town) {
    if (town.isMaster) {
        console.log('------------------MASTER-' + process.pid + '---------------');
    } else {
        console.log('------------------CHILD-' + process.pid + '------------------');
    }
}

function getDomain(url) {
    //TODO ignore subdomain
    return url.split('/')[2];
}
function filterByDomain(domain, urls) {
    return urls.reduce(function (memo, current) {
        //console.log(getDomain(current) + '   -    ' + domain);
        if (getDomain(current) == domain) memo.push(current);
        return memo;
    }, []);
}

// this function will be injected into the browser
function parseAllLinks() {
    var links = document.getElementsByTagName('a');

    var ret = [];
    for (var i = 0; i < links.length; i++) {
        ret.push(links[i].href.split('#')[0]);
    }
    return ret;
}