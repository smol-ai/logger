# smol logger

An extensible, fast logging tool that **uses the filesystem as Log UI**.

<img height="400" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/a862f61d-9459-42d2-bab7-572231c5c8e8">

## Features

- Logs to both the console and local json files for easy navigation/versioning
- Logs time elapsed, filepath/line number of log call
- Extensible
  - Extend the log store to a remote store, e.g. LogFlare
  - Customize everything from naming to terminal log color
- Zero dependency, <100 LOC
- MIT Open Source: https://github.com/smol-ai/logger
- (todo) tested thanks to [Codium AI](https://www.latent.space/p/codium-agents)

Non-goals:

- no log levels. too complicated - just add a descriptive log name, and either send all logs or none at all
- not going for running in the browser  - for now. open an issue to discuss

## Usage

install:

```bash
npm install @smol-ai/logger
```

use:

```js
import { SmolLogger } from './logger.mjs';

const logger = new SmolLogger(true)
const log = logger.log

log('name of log (required)', payload) // basic usage
```

All logs are sent to the console and file system by default, so you can easily navigate in your IDE:

<img width="1462" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/348a3f49-1022-4763-9b63-cf0e3080b85a">

The logs look like this!

<img width="1470" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/a862f61d-9459-42d2-bab7-572231c5c8e8">


The `log` function is a single arity "identity function" - returns the payload so you can modify in place.

```js
mySingleArityFunction({foo, bar, baz}) // oh no i need to log bar and baz
mySingleArityFunction({foo, ...log({bar, baz})) // done!
mySingleArityFunction(log({foo, bar, baz})) // log them all why not

myBadMultiArityFunction(foo, bar, baz) // oh no i need to log bar
myBadMultiArityFunction(foo, log(bar), baz) // done!
myBadMultiArityFunction(...log({foo, bar, baz}).values()) // log them all why not
```

We default to [single arity to encourage this in the JS ecosystem](https://www.freecodecamp.org/news/how-to-optimize-for-change-software-development/).

## Extend to Remote Storage

For production logging, Smol Logger's storage destination can be overwritten. We like [Logflare](https://logflare.app/)!

```js
// OPTIONAL: store the local file store for reuse
const oldStore = logger.store

// override the default local file store with your own remote filestore
// { logName: string, loggedLine: string | null, payload: any, secondsSinceStart: number, secondsSinceLastLog: number }
logger.store = ({ logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog }) => {
  fetch("https://api.logflare.app/logs/json?source=YOUR_SOURCE_ID", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-API-KEY": "YOUR_API_KEY_HERE"
    },
    body: JSON.stringify({ message: logName, metadata: {loggedLine, payload, secondsSinceStart, secondsSinceLastLog }})
  })
  // OPTIONAL: run the local file store as well
  oldStore({ logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog })
}
```

<img height="300" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/69b546ec-23d7-4099-9432-5fd37ca1436e">

If you expect high volumes of logs, you should batch them:

```js
const logMessages = []

function throttle(func, delay = 1000) {
  let timeout = null;
  return function(...args) {
    if (!timeout) {
      timeout = setTimeout(() => {
        func.call(this, ...args);
        timeout = null;
      }, delay);
    }
  };
}

const sendToLogFlare = ({ logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog }) => {
  fetch("https://api.logflare.app/logs/json?source=YOUR_SOURCE_ID", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-API-KEY": "YOUR_API_KEY"
    },
    body: JSON.stringify({"batch": logMessages})
  })
  .then(() => logMessages = [])
}

log.store = throttle(sendToLogFlare, 1000)
```

<details>
<summary>
<strong>Async/Blocking logging</strong>
</summary>

Logging is synchronous by default in smol logger.

Note that in the above example we are firing off an async fetch inside of a synchronous call. If your application crashes there is a smol chance that the log may not complete sending since it is running asynchronously. If you need to block for an async call, you can overwrite the `asyncLog` method:

```js
// OPTIONAL: store the local file store for reuse
const oldStore = logger.store

// override the default local file store with your own remote filestore
// { logName: string, loggedLine: string | null, payload: any, secondsSinceStart: number, secondsSinceLastLog: number }
logger.store = async ({ logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog }) => {
  const res = await fetch("https://api.logflare.app/logs/json?source=YOUR_SOURCE_ID", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-API-KEY": "YOUR_API_KEY_HERE"
    },
    body: JSON.stringify({ message: logName, metadata: {loggedLine, payload, secondsSinceStart, secondsSinceLastLog }})
  }).then(res => res.json())
  // just demonstrating that you can await inside this store
}

// now you can block execution in an async context
await logger.asyncLog('my message here', { foo: 'bar' })
```

**Note: this funcitonality is new and not tested, please try out and give fixes/feedback**

</details>

## Intercept input vs output

This logs BOTH input and output of a function that you want to monitor.

```js
const interceptedFn = logger.intercept(openai.createChatCompletion)
const response = await interceptedFn({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [/* etc */ ],
    });
```

## Customize everything else

General rule for customizing is just overwrite any of the variables and methods exposed in the class:

```ts
logger.logDirectory = '.smol-logs' // change default file store directory

logger.logToConsole = false // turn off logging to terminal
logger.logToStore = false // turn off logging to store

logger.logName = (name: string) => `My custom logName: ${name}` // change Log naming!

logger.LOGCOLOR = (logName: string) => "\x1b[35m" + logName + "\x1b[0m"; // set log colors to magenta instead of yellow
```

Other log colors to try:

```
\x1b[31m: Red
\x1b[32m: Green
\x1b[33m: Yellow
\x1b[34m: Blue
\x1b[35m: Magenta
\x1b[36m: Cyan
\x1b[37m: White
```

Get creative! For example you can stack logname functions...

```js
// for an advanced application, you can add log names in a stack
const logStack = [logger.logName] // store original logName fn at the bottom of the stack
logger.logName = (name) => logStack.reduce((prev, fn) => fn(prev), name)
let temp = 0
do {
  logStack.unshift(name => '   ' + name)
  // everything logged here is one indent in
  log('logname1 here ' + temp, temp)
    let temp2 = 0
    do {
      logStack.unshift(name => '   ' + name)
      // everything logged here is two indent in
      log('logname2 here ' + temp, temp)
      logStack.shift()
    } while (temp2++ < 5)
  logStack.shift()
} while (temp++ < 5)
```

<img height="400" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/2f15bf5a-a25b-4b69-b7e5-38524beeef70">




## Contributor notes

this repo was bootstrapped with https://github.com/alexjoverm/typescript-library-starter (must modify with https://github.com/alexjoverm/typescript-library-starter/issues/333)


#### Publishing

Follow the console instructions to install semantic release and run it (answer NO to "Do you want a `.travis.yml` file with semantic-release setup?").

_Note: make sure you've setup `repository.url` in your `package.json` file_

```bash
npm install -g semantic-release-cli
semantic-release-cli setup
# IMPORTANT!! Answer NO to "Do you want a `.travis.yml` file with semantic-release setup?" question. It is already prepared for you :P
```

From now on, you'll need to use `npm run commit`, which is a convenient way to create conventional commits.

Automatic releases are possible thanks to [semantic release](https://github.com/semantic-release/semantic-release), which publishes your code automatically on [github](https://github.com/) and [npm](https://www.npmjs.com/), plus generates automatically a changelog.

note from swyx - wasnt able to get the publishing to work, kept failing.

for now:

```bash
npm version patch
npm publish --access=public
```
