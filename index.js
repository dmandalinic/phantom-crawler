"use strict";
var async = require('async');
var os = require('os');
var Master = require('./master.js');


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
    let master = new Master( process.argv[2], numCpus*2 );
    master.job( (url, callback) => {
        town.queue(url, (err, data) => {
            if (err == false) {               
                callback(false, url);
                async.each(data.urls, (url, asyncCb) => {
                    master.visit(url);
                    asyncCb();
                });
            } else { callback(true, url); }
        })
    });
    master.start();
} else {
    town.on('queue', (page, url, next) => {
        page.set('onLoadFinished', (success) => {
            console.log('page loaded - ' + url);
            //so something here - just make sure to call next at the right time
            page.evaluate(parseAllLinks, (result) => {
                next(false, {
                    justVisited: url,
                    urls: filterByDomain(getDomain(url), result)
                });
            });
        });
        page.open(url, (status) => {
            if (status !== 'success') {
                next(new Error('Page not loaded'), []);
                return;
            }
        });
    });
}



function getDomain(url) {
    //TODO ignore subdomain
    return url.split('/')[2];
}

function filterByDomain(domain, urls) {
    return urls.reduce(function (memo, current) {
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