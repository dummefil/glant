const log4js = require('log4js');
const koa = require('koa');
const Pug = require('koa-pug');
const morgan = require('koa-morgan');
const koaStatic = require('koa-static');
const koaRouter = require('@koa/router');

const packageJSON = require('./package.json');
const log4jsConfig = require('./log4js.config.json');

const { getEntityFromDict, regenerateDict } = require('./dict');

log4js.configure(log4jsConfig.config);
const logger = log4js.getLogger(log4jsConfig.name);

logger.info(`Starting ${packageJSON.name}`, 'v.' + packageJSON.version);

const port = process.env.PORT || 8080;
const app = new koa();
const pug = new Pug({
  viewPath: './views',
  basedir: './views',
  app,
});

const router = new koaRouter();

router.post('/dict/regenerate/:type', async ctx => {
  const { type } = ctx.params;
  regenerateDict(type);
  ctx.status = 200;
})

router.get('/', async (ctx) => {
  const dicts = ['plants']
  const data = getEntityFromDict(dicts);
  await ctx.render('index', data);
})

router.get('/generate', async ctx => {
  const dicts = ctx.query.types.split(',');
  const data = getEntityFromDict(dicts);
  ctx.body = await pug.render('plant-container', data);
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

