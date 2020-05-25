const fs = require('fs');

const puppeteer = require('puppeteer');
const log4js = require('log4js');
const log4jsConfig = require('./log4js.config.json');

log4js.configure(log4jsConfig.config);
const logger = log4js.getLogger(log4jsConfig.name);

const writer = fs.createWriteStream('./dict.txt');

async function puppeteerInstance(url) {
  const browser = await puppeteer.launch({headless: false,});
  const page = await browser.newPage();
  logger.info('Opening page', url);
  await page.goto(url, {waitUntil: 'networkidle2'});
  return {page, browser};
}

async function wait(ms) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
}

async function parsePage(page, browser) {
  await parseLinks(page);
  const nextUrl = await page.evaluate(() => {
    const node = document.querySelector('#mw-pages').lastElementChild;
    if (node.textContent === 'Следующая страница') {
      return node.href;
    }
  });
  console.log(nextUrl);
  if (nextUrl) {
    await page.goto(nextUrl, {waitUntil: 'networkidle2'});
    return parsePage(page, browser);
  }
  writer.end();
  browser.close();
  logger.info('Done');
}

async function parseLinks(page) {
  const data = await page.evaluate(() => Array.from(document.querySelectorAll('.mw-category li'), element => element.textContent));
  data.forEach((chunk) => {
    writer.write(chunk + '\n', 'utf8');
  });
}

async function startCrawler() {
  logger.info('Initializing puppeteer instance');
  const url = 'https://ru.wikipedia.org/w/index.php?title=%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D0%B8%D1%8F:%D0%A0%D0%B0%D1%81%D1%82%D0%B5%D0%BD%D0%B8%D1%8F_%D0%BF%D0%BE_%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83';
  const {page, browser} = await puppeteerInstance(url);

  await parsePage(page, browser);
}


async function start() {
  try {
    await startCrawler();
  } catch (e) {
    logger.error(e);
  }
}

const packageJSON = require('./package.json');
logger.info(`Starting ${packageJSON.name}`, 'v.' + packageJSON.version);
start();
