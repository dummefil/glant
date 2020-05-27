const fs = require('fs');
const querystring = require('querystring');
const axios = require('axios');
const cheerio = require('cheerio');
const log4js = require('log4js');

const log4jsConfig = require('./log4js.config.json');

log4js.configure(log4jsConfig.config);
const logger = log4js.getLogger(log4jsConfig.name);

function createFolder (folder) {
  if (!fs.existsSync(folder)){
    fs.mkdirSync(folder);
  }
}

function Writer () {
  const folder = 'dict';
  createFolder(folder);
  this.newDict = function newDict(letter) {
    return fs.createWriteStream(`./${folder}/${letter}.txt`);
  }

  this.changeDict = function changeDict(letter) {
    if (this.currentDict) {
      this.currentDict.close();
    }
    this.currentDict = this.newDict(letter);
    this.currentDictLetter = letter;
  }

  this.push = function push(string) {
    const chunk = string + '\n';
    const letter = string[0];
    if (this.currentDictLetter !== letter) {
      this.changeDict(letter);
    }
    this.currentDict.write(chunk, 'utf8');
  }

  this.close = function close() {
    if (this.currentDict) {
      this.currentDict.close();
    }
  }
}

const writer = new Writer();

async function changePage(url) {
  logger.info('Page is', querystring.unescape(url));
  return fetchHTML(url)
}

async function getNextPageUrl ($) {
  return baseUrl + $('#mw-pages a').last().attr('href');
}

async function fetchHTML(url) {
  const { data } = await axios.get(url)
  return cheerio.load(data)
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

async function getImage (url) {
  const $ = await changePage(url);
  return $('.infobox-image img').attr('src');
}

const baseUrl = 'https://ru.wikipedia.org';
async function parseLinks($) {
  function mapFn (element) {
    const $element = $(element);
    return {
      text: $element.text(),
      url: baseUrl + $element.attr('href'),
    }
  }
  const listElms = $('.mw-category li a');
  const links = Array.from(listElms, mapFn);

  //why for in it's not working ?
  for (let index in links) {
    const link = links[index];
    const { text, url } = link;
    const image = await getImage(url);
    writer.push([text, url, image].join(';;'));
  }
}

async function startCrawler() {
  const url = 'https://ru.wikipedia.org/w/index.php?title=%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D0%B8%D1%8F:%D0%A0%D0%B0%D1%81%D1%82%D0%B5%D0%BD%D0%B8%D1%8F_%D0%BF%D0%BE_%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83';
  await parsePage(url);
}

let running = false;
async function run() {
  try {
    if (!running) {
      running = true;
      logger.info('Crawler started');
      await startCrawler();
      running = false;
    } else {
      logger.info('Crawler already running')
    }
  } catch (e) {
    logger.error(e);
    running = false;
  }
}

module.exports = {
  run,
}
