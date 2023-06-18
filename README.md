# smol logger

**A minimal viable logger for Prompt/LLM App Engineering.** 

Use your IDE as Logging UI - a fast, simple, extensible, zero dependency Node.js logging tool.

- In App Development: a fast logging tool that **uses the filesystem as Log UI**.
- In Prompt Engineering: wrap and transform async calls to OpenAI etc to cleanly **capture Prompt vs Response**.
  - CLI to export logs to `.tsv` for spreadsheet import. **Spreadsheets are all you need** for prompt engineering!
- In Production: easily extended to send logs to a log store [like Logflare](https://github.com/smol-ai/logger#extend-to-remote-storage)

<img height="400" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/a862f61d-9459-42d2-bab7-572231c5c8e8">

## Features

- By default, logs to both the terminal and local json files for easy navigation/versioning
  - CLI to compile json logs to a `.tsv` file for spreadsheet import (e.g. Google Sheets, Excel, Quadratic)
- Logs time elapsed, filepath, line number of log call
- Wrap & transform async calls to capture Prompt vs Response pairs
- Extensible
  - Extend the log store to a remote store, e.g. LogFlare
  - Customize everything from naming to terminal log color
- Zero dependency, <100 LOC core
- Typescript, so hot right now
- MIT Open Source: https://github.com/smol-ai/logger
- (todo) tested thanks to [Codium AI](https://www.latent.space/p/codium-agents)

Non-goals:

- no log levels. too complicated - just add a descriptive log name, and either send all logs or none at all
- not going for running in the browser  - for now. open an issue to discuss please! not sure how complicated it would be to take out the file storage for something else.

## Usage

install:

```bash
npm install @smol-ai/logger
```

use:

```js
import { SmolLogger } from '@smol-ai/logger';

const logger = new SmolLogger(true)
const log = logger.log // optional convenient alias for less verbosity

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

## Production: Remote Storage

For production logging, Smol Logger's storage destination can be overwritten. We like [Logflare](https://logflare.app/)!

```js
// OPTIONAL: keep the default local file store for reuse
const localStore = logger.store

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
  // OPTIONAL: log to the local file store as well
  localStore({ logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog })
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

Note that in the above example we are firing off an async fetch inside of a synchronous call. If your application crashes there is a smol chance that the log may not complete sending since it is running asynchronously. If you need to block for an async call, you can use the `asyncLog` method with an async store:

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

## LLM Apps: Intercept input vs output

This logs BOTH input and output of an async function that you want to monitor. Mostly useful for prompt engineering where you really care about input vs output pairs being visible in the same log file.

```js
const wrapped = logger.wrap(openai.createChatCompletion.bind(openai)) // binding is impt bc of how OpenAI internally retrieves its config
const response = await wrapped({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [/* etc */ ],
    });
```

Sometimes the output can be very verbose (as is the case with OpenAI chatCompletion). so we also allow you to expose a simple "log transformer" that is an arbitrary function to modify the intercepted output to a format of your choice that you like:

```js
// custom 
const wrapped = logger.wrap(
  openai.createChatCompletion.bind(openai),  // binding is impt bc of how OpenAI internally retrieves its config
  {
    logTransformer: (args, result) => ({ // can be async
      // ...result, // optional - if you want the full raw result itself
      prompt: args[0].messages,
      response: result.data.choices[0].message,
    })
  }
)
const response = await wrapped({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [/* etc */ ],
    });

// now the logged response only has the specific fields of our interest, see screenshot below
```

<img height="400" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/0b15a508-db3b-4a52-8a8f-a94a7e0282a6">

## log2tsv CLI

Individual JSON log files are good for debugging individual runs. Good default for smol-logger.

For Prompt Engineering, you also need to compare prompts vs outputs easily across runs, and rate them/write evals. For this, no interface is more flexible or GOATed than spreadsheets. So we help you export your logs for spreadsheets.

You can run the `log2tsv` CLI which outputs a `logs.tsv` file in your `./logs` folder (will take a PR to customize this). You can import this `.tsv` file in Google Sheets/Excel/Quadratic/etc to do further prompt engine.

```bash
npm run log2tsv
```

> Will take a PR to make this programmatically runnable (and not just a CLI) if that is something you want.

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
npm run build
npm version patch
npm publish --access=public
```
