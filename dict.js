const path = require('path');
const fs = require('fs');

const crawler = require('./crawler');
const config = require('./config');
const { cleanFolder, randomInteger, createFolder } = require('./utils');

createFolder(config.dictFolder);

const dicts = {
  'insects': {
    url: 'https://ru.wikipedia.org/wiki/%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D0%B8%D1%8F:%D0%96%D0%B8%D0%B2%D0%BE%D1%82%D0%BD%D1%8B%D0%B5_%D0%BF%D0%BE_%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83',
  },
  'minerals': {
    url: 'https://ru.wikipedia.org/wiki/%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D0%B8%D1%8F:%D0%9C%D0%B8%D0%BD%D0%B5%D1%80%D0%B0%D0%BB%D1%8B_%D0%BF%D0%BE_%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83',
  },
  'plants': {
    url: 'https://ru.wikipedia.org/w/index.php?title=%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D0%B8%D1%8F:%D0%A0%D0%B0%D1%81%D1%82%D0%B5%D0%BD%D0%B8%D1%8F_%D0%BF%D0%BE_%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83',
  },
  'mushrooms': {
    url: 'https://ru.wikipedia.org/wiki/%D0%9A%D0%B0%D1%82%D0%B5%D0%B3%D0%BE%D1%80%D0%B8%D1%8F:%D0%93%D1%80%D0%B8%D0%B1%D1%8B_%D0%BF%D0%BE_%D0%B0%D0%BB%D1%84%D0%B0%D0%B2%D0%B8%D1%82%D1%83',
  }
}

function getDicts() {
  return Object.keys(dicts);
}

async function regenerateDict(dictName) {
  const dictPath = path.resolve('./', config.dictFolder, dictName);
  const dict = dicts[dictName];
  if (!dict) {
    throw new Error(`${dictName} not found`);
  }

  createFolder(dictPath);
  cleanFolder(dictPath);
  await crawler(dictName, dict);
}

function getRandomIndex(array) {
  const listLength = array.length - 1;
  return randomInteger(0, listLength);
}
//todo rename this function
function getRandomDirectory(filePath) {
  const list = fs.readdirSync(path.resolve('./', filePath));
  if (!list.length) {
    throw new Error(`${filePath} is empty`);
  }

  return list[getRandomIndex(list)];
}

function getRandomDict(dicts = ['plants']) {
  const dictsPath = dicts[getRandomIndex(dicts)];

  const letterPath = getRandomDirectory(path.join(config.dictFolder, dictsPath));
  const dict = path.join(config.dictFolder, dictsPath, letterPath);
  return fs.readFileSync(dict);
}

function getEntityFromDict(dicts) {
  const dict = getRandomDict(dicts);
  const array = dict.toString().split('\n').filter((value) => (value));
  const max = array.length - 1;
  const index = randomInteger(0, max);
  const plant = array[index];
  const [plantTitle, plantUrl, plantImg] = plant.split(';;');

  return {
    plantTitle, plantImg, plantUrl
  };
}

module.exports = {
  getEntityFromDict,
  getRandomDict,
  regenerateDict,
  getDicts
}
