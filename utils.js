const fs = require('fs');
const path = require('path');

function createFolder(folder) {
  if (!fs.existsSync(folder)){
    fs.mkdirSync(folder);
  }
}

function cleanFolder(folder) {
  const files = fs.readdirSync(folder);
  for (const file of files) {
    const filePath = path.join(folder, file);
    fs.unlinkSync(filePath);
  }
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
  randomInteger,
  cleanFolder,
  createFolder,
}
