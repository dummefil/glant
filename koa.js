const koa = require('koa');
const koaRouter = require('@koa/router');
const koaStatic = require('koa-static');
const Pug = require('koa-pug');
const morgan = require('koa-morgan');

const app = new koa();
const fs = require('fs');
const readline = require('readline');
const pug = new Pug({
  viewPath: './views',
  basedir: './views',
  app: app //Equivalent to app.use(pug)
});

const router = new koaRouter();

router.get('/', (ctx) => {
  ctx.redirect('/generate');
})

router.get('/generate', async (ctx) => {
  const plant = getRandomPlant();
  const data = {
    plantTitle: `This is title of ${plant}`,
    plantImage: `This is image of ${plant}`,
    plantUrl: `This is url of ${plant}`,
  }
  await ctx.render('index', data);
});

app.use(morgan('combined'));

app
  .use(router.routes())
  .use(router.allowedMethods());

const port = 8080;
app.listen(port, () => {
  console.log(`Started ${require('./package.json').name} at`, port);
});

function getRandomPlant() {
  const array = fs.readFileSync('dict.txt').toString().split('\n');
  const max = array.length;
  const index = randomInteger(0, max);
  return array[index];
}

function randomInteger(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
