const winston = require('winston');
const bunyan = require('bunyan');
const pino = require('pino');
const { SmolLogger } = require('@smol-ai/logger');

const bench = require('fastbench');

const winstonLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
  ],
});

const bunyanLogger = bunyan.createLogger({
  name: 'myapp',
  streams: [
    {
      level: 'info',
      stream: process.stdout,
    },
  ],
});

const pinoLogger = pino({
  level: 'info',
});

const smolLogger = new SmolLogger({ logToConsole: false, logToStore: false })


const run = bench([
  function benchWinston(cb) {
    winstonLogger.info('hello world');
    setImmediate(cb);
  },
  function benchBunyan(cb) {
    bunyanLogger.info('hello world');
    setImmediate(cb);
  },
  function benchPino(cb) {
    pinoLogger.info('hello world');
    setImmediate(cb);
  },
  function benchSmol(cb) {
    smolLogger.log('hello world');
    setImmediate(cb);
  },
], 100000);

run(run);
// node bench.js > bench.txt
// grep "^bench" bench.txt