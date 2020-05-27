const fs = require('fs');
const path = require('path');
const querystring = require('querystring');

const puppeteer = require('puppeteer');
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
    this.currentDict.close();
  }
}

const writer = new Writer();

async function puppeteerInstance(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await changePage(page, url);
  return {page, browser};
}

async function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

async function changePage(page, url) {
  logger.info('Page is', querystring.unescape(url));
  await page.goto(url, {waitUntil: 'networkidle0'});
}

async function getNextPageUrl (page) {
  return page.evaluate(() => {
    const node = document.querySelector('#mw-pages').lastElementChild;
    if (node.textContent === 'Следующая страница') {
      return node.href;
    }
  })
}

async function parsePage(page, browser) {
  const nextPageUrl = await getNextPageUrl(page);
  await parseLinks(page);

  if (nextPageUrl) {
    await changePage(page, nextPageUrl);
    return parsePage(page, browser);
  }
  writer.close();
  browser.close();
  logger.info('Done');
}

async function getImage (page, url) {
  await changePage(page, url);
  return page.evaluate(() => {
    const image = document.querySelector('.infobox-image img');
    console.log(image);
    if (image) {
      return image.src;
    }
  });
}

async function parseLinks(page) {
  const links = await page.evaluate(() => {
    function mapFn (element) {
       return {
         text: element.textContent,
         url: element.href,
       }
    }
    const listElms = document.querySelectorAll('.mw-category li a');
    return Array.from(listElms, mapFn);
  });

  //why for in it's not working ?
  for (let index in links) {
    const link = links[index];
    const { text, url } = link;
    const image = await getImage(page, url);
    writer.push([text, url, image].join(';;'));
  }
}

async function startCrawler() {
  logger.info('Initializing puppeteer instance');
  const url = 'https://ru.wikipedia.org/w/index.php?title=%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D0%B8%D1%8F:%D0%A0%D0%B0%D1%81%D1%82%D0%B5%D0%BD%D0%B8%D1%8F_%D0%BF%D0%BE_%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83';
  const {page, browser} = await puppeteerInstance(url);

  await parsePage(page, browser);
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
