const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const axios = require('axios');
const cheerio = require('cheerio');
const log4js = require('log4js');
const moment = require('moment');
const { URL } = require('url');

const log4jsConfig = require('./log4js.config.json');

const { createFolder } = require('./utils');
const config = require('./config');

log4js.configure(log4jsConfig.config);
const logger = log4js.getLogger(log4jsConfig.name);

function Writer (dictName) {
  const folder = path.join(config.dictFolder, dictName);
  createFolder(folder);
  this.newDict = function newDict(letter) {
    const dictFile = `${letter}.txt`;
    const dictPath = path.resolve('./', folder, dictFile)
    const stream = fs.createWriteStream(dictPath, { flags : 'a'});
    stream.on('end', () => {
      logger.debug('No data for stream:', dictPath);
    })
    stream.on('close', () => {
      logger.debug('Closing stream', dictPath);
    })
    return stream;
  }

  this.changeDict = function changeDict(letter) {
    if (this.currentDict) {
      this.currentDict.close();
    }
    this.currentDict = this.newDict(letter);
    this.currentDictLetter = letter;
    logger.debug('Changing current dict to', letter);
  }

  this.push = function push(string) {
    const chunk = string + '\n';
    const letter = string[0];
    if (this.currentDictLetter !== letter) {
      this.changeDict(letter);
    }

    logger.debug('Writing to', this.currentDict.path);
    logger.debug('Writing data', chunk);
    this.currentDict.write(chunk, 'utf8');
  }

  this.close = function close() {
    if (this.currentDict) {
      this.currentDict.close();
    }
  }
}

async function startCrawler(dictName, dict, writer) {
  const baseUrl = new URL(dict.url).origin;
  logger.info('Base url for', dictName, 'is', dict.url);
  let requestedPages = 0;

  await parsePage(dict.url);
  return requestedPages;
  async function changePage(url) {
    logger.info('Page is', querystring.unescape(url));
    requestedPages += 1;
    return fetchHTML(url);
  }

  async function getNextPageUrl ($) {
    const node = $('#mw-pages a').last();
    if (node.text() === 'Следующая страница') {
      return baseUrl + node.attr('href');
    }
  }

  async function timeoutPromise(timeout) {
    return new Promise((resolve) => {
      setTimeout(resolve, timeout)
    })
  }

  async function makeRequest(url) {
    try {

      const response = await axios.get(url);
      if (response.status === 429) {
        logger.error(response.status);
      }
      return response;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        const timeout = 2000;
        logger.info('Error 429, retrying after', timeout/1000, 'second(s)');
        await timeoutPromise(timeout);
        return makeRequest(url);
      }
      else {
        process.exit(0);
      }
    }
  }

  async function fetchHTML(url) {
    const { data } = await makeRequest(url);
    return cheerio.load(data);
  }

  async function parsePage(url) {
    const $ = await changePage(url)

    const nextPageUrl = await getNextPageUrl($);
    await parseLinks($);

    if (nextPageUrl) {
      return parsePage(nextPageUrl);
    }
    writer.close();
    logger.info('Done');
  }

  async function getMeta(link) {
    const { text, url } = link;
    const $ = await changePage(url);

    //todo change to custom filter;
    if (dictName === 'insects') {
      const metaString = $('.infobox').text();
      if (metaString.indexOf('Класс:Насекомые') === -1) {
        return;
      }
      logger.info('Insect found!', text);
    }

    let image = $('.infobox-image img').attr('src');
    if (!image || image.indexOf('No_image_available') > -1) {
      image = '';
    }
    return {
      image, text, url,
    };
  }

  async function parseLinks($) {
    function mapTransform (element) {
      const $element = $(element);
      return {
        text: $element.text(),
        url: baseUrl + $element.attr('href'),
      }
    }
    const listElms = $('.mw-category li a');
    const links = Array.from(listElms, mapTransform);

    async function mapGetMeta(link) {
      const meta = await getMeta(link);

      if (!meta) {
        return;
      }
      writer.push([meta.text, meta.url, meta.image].join(';;'));
    }

    let maxRequest = 10;

    const length = links.length/maxRequest;
    for (let i = 0; i < length; i += 1) {
      let deleteCount;
      if (links.length - 1 > maxRequest) {
        deleteCount = maxRequest;
      } else {
        deleteCount = links.length;
      }

      const array = links.splice(0, deleteCount);
      logger.info('Getting batch of', array.length);
      await Promise.all(array.map(mapGetMeta));
    }
  }
}

async function crawler(dictName, dict) {
  try {
    if (!dict.isUpdating) {
      dict.isUpdating = true;
      logger.info('Crawler started');
      const timestamp = moment();
      logger.info('Started at', timestamp.format());
      const writer = new Writer(dictName);
      const requestedPages = await startCrawler(dictName, dict, writer);
      dict.isUpdating = false;
      const diff = timestamp.diff(moment(), 'seconds') * -1;
      logger.info('Requested urls', requestedPages);
      logger.info('Time elampsed', diff, 'second(s)');
      logger.info('RPS RATE', requestedPages/diff);
    } else {
      logger.info('Crawler already running')
    }
  } catch (e) {
    logger.error(e);
    dict.isUpdating = false;
  }
}

module.exports = crawler
