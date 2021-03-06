'use strict';
const { URL } = require('url');
const logger = require('./src/utils/logger');
const utils = require('./src/utils');
const Util = require('./src/utils');
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
  canvas.requestAll = async function(path, internalArrayKey)
  {
    const items = []

    let array
    let dup = 0
    let page = 0
    let res
    let objKey
    let objIdx = {}

    do
    {
      page++
      const flgCN = page > 1 && !!canvas.next
      //const url = new URL( `${canvas.baseurl}/${path}` )
      const url = new URL( flgCN ? canvas.next : `${canvas.baseurl}/${path}` )
      if(!flgCN)
      {
        url.searchParams.set('page', page)
        url.searchParams.set('per_page', CANVAS_MAX_ITEMS_PER_PAGE)
      }

      res = await canvas.requestInternal('GET', url.toString())
      array = []
      if(internalArrayKey&&res[internalArrayKey])
      {
        array = res[internalArrayKey]
      }
      else if(internalArrayKey==undefined&&Array.isArray(res))
      {
        array = res
      }
      else
      {
        logger.error(`Unexpected canvas response "${internalArrayKey}":\n${res}`)
        logger.error(`Unexpected canvas response "${internalArrayKey}":\n${JSON.stringify(res,null,2)}`)
        throw new Error(`Canvas error in call to ${url.toString()}`)
      }
      dup=0
      for(let item of array)
      {
        objKey=`${item.id}.${item.user_id}.${item.course_id}.${item.type}.${(item.user||{}).id}`
        objIdx[objKey]=(objIdx[objKey]||0)+1
        if(objIdx[objKey]===1)items.push(item)
        else dup++
      }
    }
    while(array.length === CANVAS_MAX_ITEMS_PER_PAGE && dup!==array.length) // If response contains less than 100 items, it must be the last page.

    return items
  }

  canvas.requestInternal = async function(method, uri, data, formFlag, tryingAgain)
  {
    const startTime = Date.now();
    delete canvas.error
    if(method === 'GET' && data)
    {
      logger.error("Cannot send data in GET request");
      return false;
    } else {
      let options =
      {
        uri: uri,
        method: method,
        headers: {
          'Accept': 'application/json'
        },
        json: true,
        resolveWithFullResponse: true
      };
      if(method === 'PUT' || method === 'POST')
      {
        options.headers['Content-Type'] = 'application/json'
      }

      if(formFlag)
      {
        options.formData = data;
      } else if(data) {
        options.body = data;
      }

      logger.debug(JSON.stringify(options));
      const token = canvas.getToken();
      options.headers["Authorization"] = `Bearer ${token}`;
      try
      {
        const res = await request(options);
        canvas.next = false
        if(res.headers['link'])
        {
          for(const link of res.headers['link'].split(','))
          {
            const part = link.split('; ')
            if(part[1]!=='rel="next"') continue
            canvas.next = part[0].replace(/^<(.*)>$/,'$1')
          }
        }
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

        canvas.error=e
        logger.warn(`RequestFailed: ${JSON.stringify(e)}`);
        logger.debug(`Canvas Request Delay: ${(Date.now() - startTime) / 60000}`);

        if(!tryingAgain && e.error && ( e.error.code === "ENOTFOUND" || e.error.code === "ETIMEDOUT" ) ) {
          logger.info("Waiting 8 seconds, then retrying");
          await utils.sleep(8000);
          return canvas.requestInternal(method, uri, data, formFlag, true);
        }
        return false;
      }
    }
  };

  canvas.accounts = accounts(canvas);
  canvas.terms = terms(canvas);
  canvas.courses = courses(canvas);
  canvas.sections = sections(canvas);
  canvas.users = users(canvas);
  canvas.next = false

  return canvas;
};



function shuffle(a)
{
  for (let i = a.length - 1; i > 0; i--)
  {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

