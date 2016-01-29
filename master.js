"use strict";
var validUrl = require('valid-url');
var async = require('async');
class Master{
    constructor(startUrl ,concurrency){
        this.concurrency = concurrency;
        this.url = this.checkUrlValidity(startUrl);
        this.visited = new Set();
        this.visiting = new Set();
        this.failed = new Set();
    }

    start(){ 
        this.masterQueue = async.queue((url, masterQueueFinish) => {
            this.justVisiting(url);
            this.masterQueueWork(url, masterQueueFinish);
        }, this.concurrency);
        this.visit(this.url);
    }

    checkUrlValidity(url){
        if(!validUrl.isWebUri(url)) throw 'URL is not valid or present! Please pass it as argument to the script';
        return url;
    }

    job(work){
        return this.masterQueueWork = work;
    }

    visitedOrVisiting(url){
        return this.visited.has(url) || this.visiting.has(url);
    }

    haveVisited(url){
        this.visited.add(url);
        this.visiting.delete(url);
    }

    failedVisiting(url){
        this.visiting.delete(url);
        this.failed.add(url);
    }

    justVisiting(url){
        this.visiting.add(url);
    }

    visit(url){
        this.masterQueue.push(url, (err, url) => {
            if(err) this.failedVisiting(url);
            else this.haveVisited(url);
        });
    }



    static injectableAnchorCollector(){}

    static injectableRequestOverride(){}

}

module.exports = Master;