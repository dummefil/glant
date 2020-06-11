const path = require('path');
const fs = require('fs');

const log4js = require('log4js');
const koa = require('koa');
const Pug = require('koa-pug');
const morgan = require('koa-morgan');
const koaStatic = require('koa-static');
const koaRouter = require('@koa/router');
const greenlock = require('greenlock-express')

const packageJSON = require('./package.json');
const log4jsConfig = require('./log4js.config.json');
const crawler = require('./crawler');

log4js.configure(log4jsConfig.config);
const logger = log4js.getLogger(log4jsConfig.name);

logger.info(`Starting ${packageJSON.name}`, 'v.' + packageJSON.version);

function cleanFolder (folder) {
  const files = fs.readdirSync(folder);
  for (const file of files) {
    const filePath = path.join(folder, file);
    fs.unlinkSync(filePath);
  }
}

async function regenerateDict() {
  cleanFolder('dict');
  await crawler.run();
}

function getRandomDict() {
  const dict = fs.readdirSync('dict')
  if (!dict.length) {
    throw new Error('Dictionary is empty');
  }

  const dictLength = dict.length - 1;
  const dictIndex = randomInteger(0, dictLength);
  const dictName = dict[dictIndex];
  const fileDir = path.join('./dict', dictName);
  return fs.readFileSync(fileDir);
}

function getRandomPlant() {
  const dict = getRandomDict();
  const array = dict.toString().split('\n').filter((value) => (value));
  const max = array.length - 1;
  const index = randomInteger(0, max);
  const plant = array[index];
  const [plantTitle, plantUrl, plantImg] = plant.split(';;');

  //todo parse this links in crawler
  if (plantImg.indexOf('No_image_available') > -1) {
    return {
      plantTitle, plantImg: '', plantUrl,
    };
  }
  return {
    plantTitle, plantImg, plantUrl
  };
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const port = process.env.PORT || 8080;
const app = new koa();
const pug = new Pug({
  viewPath: './views',
  basedir: './views',
  app,
});

const router = new koaRouter();

router.get('/', async (ctx) => {
  const data = getRandomPlant();
  await ctx.render('index', data);
})

router.get('/generate', async ctx => {
  const data = getRandomPlant();
  ctx.body = await pug.render('plant-container', data);
})

router.post('/dict/regenerate', async ctx => {
  regenerateDict();
  ctx.status = 200;
})

router.get('*', (ctx) => {
  ctx.redirect('/');
})

app.use(koaStatic('static', {}));
app.use(morgan('combined'));
app.use(router.routes())
app.use(router.allowedMethods());

app.listen(port, () => {
  logger.info(`Started ${require('./package.json').name} at`, port);
});

