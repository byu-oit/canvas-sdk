'use strict';
const { URL } = require('url');
const logger = require('./src/utils/logger');
const request = require('request-promise');
const accounts = require('./src/accounts');
const terms = require('./src/terms');
const courses = require('./src/courses');
const sections = require('./src/sections');
const users = require('./src/users');

const CANVAS_MAX_ITEMS_PER_PAGE = 100;
const STARTING_RATE_LIMIT_REMAINING = 700;
const DEFAULT_MAX_SIMULTANEOUS_REQUESTS = 10;

module.exports = function(config) {
    const canvas = {};

    canvas.maxSimultaneousRequests = config.maxSimultaneousRequests || DEFAULT_MAX_SIMULTANEOUS_REQUESTS;

    if(config.tokens) {
        canvas.tokens = [];
        let i = 0;
        for(let token of config.tokens) {
            canvas.tokens.push({
                id: i++,
                value: token,
                rateLimitRemaining: STARTING_RATE_LIMIT_REMAINING
            })
        }
        canvas.getToken = function() {
            shuffle(canvas.tokens);
            let largestLimitRemainingToken;
            for(const token of canvas.tokens) {
                if(!largestLimitRemainingToken) {
                    largestLimitRemainingToken = token;
                } else {
                    if(token.rateLimitRemaining > largestLimitRemainingToken.rateLimitRemaining) {
                        largestLimitRemainingToken = token;
                    }
                }
            }
            logger.debug(`Using token ${largestLimitRemainingToken.id}`);
            return largestLimitRemainingToken.value;
        };

        canvas.updateTokenRateLimit = function(usedToken, newRateLimitRemaining) {
            for(const token of canvas.tokens) {
                if(token.value === usedToken) {
                    token.rateLimitRemaining = newRateLimitRemaining
                }
            }
        }

    } else if(config.token) {
        canvas.getToken = function() {
            return config.token;
        }
    } else {
        logger.error("Must provide at least one valid access token");
        process.exit(1);
    }

    if(!config.subdomain) {
        logger.error("Must provide a valid subdomain");
        process.exit(1);
    } else {
        canvas.baseurl = `https://${config.subdomain}.instructure.com/api/v1`;
    }

    canvas.request = async function(method, path, data, formFlag) {
        return canvas.requestInternal(method, `${canvas.baseurl}/${path}`, data, formFlag);
    };

    /*
     * Recursively paginates through data.
     */
    canvas.requestAll = async function(path, internalArrayKey) {
        const url = new URL(`${canvas.baseurl}/${path}`);
        const items = [];

        url.searchParams.set('per_page', CANVAS_MAX_ITEMS_PER_PAGE);
        url.searchParams.set('page', 1);
        let res;
        let array;
        let page = 1;

        do {
            res = await canvas.requestInternal('GET', url.toString());
            array = [];
            if(internalArrayKey) {
                array = res[internalArrayKey];
            } else {
                array = res;
            }
            for(let item of array) {
                items.push(item);
            }
            url.searchParams.set('page', ++page);
        } while(array.length === CANVAS_MAX_ITEMS_PER_PAGE); // If response contains less than 100 items, it must be the last page.

        return items;
    };

    canvas.requestInternal = async function(method, uri, data, formFlag) {
        const startTime = Date.now();
        if(method === 'GET' && data) {
            logger.error("Cannot send data in GET request");
        } else {
            let options = {
                uri: uri,
                method: method,
                headers: {
                    'Accept': 'application/json'
                },
                json: true,
                resolveWithFullResponse: true
            };
            if(method === 'PUT' || method === 'POST') {
                options.headers['Content-Type'] = 'application/json'
            }

            if(formFlag) {
                options.formData = data;
            } else if(data) {
                options.body = data;
            }

            logger.debug(JSON.stringify(options));
            const token = canvas.getToken();
            options.headers["Authorization"] = `Bearer ${token}`;
            try {
                const res = await request(options);
                const rateLimitRemaining = res.headers['x-rate-limit-remaining'];
                logger.debug(`Current Token Rate Limit Remaining: ${rateLimitRemaining}`);
                if(canvas.updateTokenRateLimit) {
                    canvas.updateTokenRateLimit(token, rateLimitRemaining);
                }
                logger.debug(`Canvas Request Delay: ${(Date.now() - startTime) / 1000} seconds`);
                return res.body;
            } catch(e) {
                // Don't log access token
                if(e.options && e.options.headers && e.options.headers.Authorization) {
                    delete e.options.headers.Authorization;
                }
                if(e.response && e.response.request && e.response.request.headers && e.response.request.headers.Authorization) {
                    delete e.response.request.headers.Authorization;
                }

                logger.warn(`RequestFailed: ${JSON.stringify(e)}`);
                logger.debug(`Canvas Request Delay: ${(Date.now() - startTime) / 60000}`);
                return false;
            }
        }
    };

    canvas.accounts = accounts(canvas);
    canvas.terms = terms(canvas);
    canvas.courses = courses(canvas);
    canvas.sections = sections(canvas);
    canvas.users = users(canvas);

    return canvas;
};

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}