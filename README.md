# 🐤 smol logger

**A minimal viable logger for Prompt/LLM App Engineering.** 

Use your IDE as Logging UI - a fast, simple, extensible, zero dependency Node.js logging tool.

- In App Development: a fast logging tool that **uses the filesystem as Log UI**.
- In Prompt Engineering: wrap and transform async calls to OpenAI etc to cleanly **capture Prompt vs Response**.
  - CLI to export logs to `.tsv` for spreadsheet import. **Spreadsheets are all you need** for prompt engineering!
- In Production: easily extended to send logs to a log store [like Logflare](https://github.com/smol-ai/logger#extend-to-remote-storage)

<img width="1460" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/75b68625-2516-492e-8642-be316d57d5f4">

Short video demo: https://www.loom.com/share/ae818b7d058343c1ad6caf8deee2e430

## Features

- By default, logs to both the terminal and local json files for easy navigation/versioning
  - Automatically logs time elapsed, filepath, line number, order of log call
  - Clear logs by deleting the `.logs` folder (customizable)
  - CLI to compile json logs to a `.tsv` file for spreadsheet import (e.g. Google Sheets, Excel, Quadratic)
- Wrap & transform async calls to capture Prompt vs Response pairs
- Extensible
  - Persist the logs to a remote store, e.g. LogFlare
  - Customize everything from naming/indentation to terminal log color
- Zero dependency, <100 LOC core. It's faster than Winston and Bunyan (see benchmarks)
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

const logger = new SmolLogger({ logToConsole: true, logToStore: true }) // easy to turn off
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

## Clearing Logs

To clear your logs - delete the `.logs` folder! Simple as! It'll regenerate once you run the next log.

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
// this is untested sample code for now, pls send PR if you run and try it
const logMessages = []

function throttle(func, delay = 1000) {
  let timeout = null;
  return function(...args) {
    const { logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog } = args;
    logMessages.push(({ message: logName, metadata: {loggedLine, payload, secondsSinceStart, secondsSinceLastLog }}));
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
import OpenAI from 'openai'; // this is for openai v4 package! v3 instructions below
import {SmolLogger} from '@smol-ai/logger';

const openai = new OpenAI({
  apiKey: 'my api key', // defaults to process.env["OPENAI_API_KEY"]
});
const logger = new SmolLogger({logToConsole: true, logToStore: true}); // both args are optional, just spelling out defaults for you to easily turn off

const wrapped = logger.wrap(
  openai.chat.completions.create.bind(openai) // binding is impt bc of how OpenAI internally retrieves its config

async function main() {
  const completion = await wrapped({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "you are a helpful assistant",
      },
      {
        role: "user",
        content: "Choose a famous pop artist, and give me 3 songs by them",
      },
    ],
  });

  console.log(completion.choices);
}

main();
```

<details>
	<summary>
		Openai SDK V3 instructions
	</summary>

will be outdated soon so we hide it here

```js
import { Configuration, OpenAIApi } from 'openai';
const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY }));

const wrapped = logger.wrap(openai.createChatCompletion.bind(openai)) // binding is impt bc of how OpenAI internally retrieves its config
const response = await wrapped({
        model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
        messages: [/* etc */ ],
    });
```

</details>

Sometimes the output can be very verbose (as is the case with OpenAI chatCompletion). so we also allow you to expose a simple "log transformer" that is an arbitrary function to modify the intercepted output to a format of your choice that you like:

```js
// edit above code to add logTransformer
const wrapped = logger.wrap(
  openai.createChatCompletion.bind(openai),  // binding is impt bc of how OpenAI internally retrieves its config
  { 
    wrapLogName: 'chatGPT APIcall', // optional - customize the name that shows up on the log. defaults to "wrap(fn.name)"
    logTransformer: (args, result) => ({ // can be async
      // ...result, // optional - if you want the full raw result itself
      prompt: args[0].messages,
      response: result.choices[0].message, // this is v4 api; was result.data.choices[0].message for v3
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
<img height="400" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/75b68625-2516-492e-8642-be316d57d5f4">

## `log2tsv` CLI

Individual JSON log files are good for debugging individual runs. Good default for smol-logger.

For Prompt Engineering, you also need to compare prompts vs outputs easily across runs, and rate them/write evals. For this, no interface is more flexible or GOATed than spreadsheets. So we help you export your logs for spreadsheets.

You can run the `log2tsv` CLI which outputs a `logs.tsv` file in your `./logs` folder (will take a PR to customize this). You can import this `.tsv` file in Google Sheets/Excel/Quadratic/etc to do further prompt engine.

```bash
./node_modules/.bin/log2tsv # in a directory where @smol-ai/logger has been installed
```

You can also put this in an npm script and it will run:

```js
// package.json
{
  "scripts": {
    "tsv": "log2tsv" // and then npm run tsv
  }
}
```

<img width="1451" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/3f6500cd-9a42-43ec-8aba-c5930fb568a1">

Note the header is taken from the first log - and most likely will not fully match up to the body of all the logs especially if you have irregularly shaped logs. We trust that you'll be able to figure out how to retitle them yourself if they are impt enough in the spreadsheet.

> Will take a PR to make this programmatically runnable (and not just a CLI) if that is something you want.

## Customize everything else

General rule for customizing is just overwrite any of the variables and methods exposed in the class:

```ts
logger.logDirectory = '.smol-logs' // change default file store directory

logger.logToConsole = false // turn off logging to terminal
logger.logToStore = false // turn off logging to store
// more ideas for usage
logger.logToStore = Math.random() < 0.05 // only sample 5% of traffic
logger.logToStore = user.isVIPCustomer() // log based on feature flag

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


<details>
<summary>
Get creative! For example you can stack logName functions in a single reducer function...
</summary>

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
      log('logname2 here ' + temp2, temp2)
      logStack.shift()
    } while (temp2++ < 5)
  logStack.shift()
} while (temp++ < 5)
```

<img height="400" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/2f15bf5a-a25b-4b69-b7e5-38524beeef70">

> In future we might provide a more official API for nested logging:
> (this is in the code but is untested)
> ```js
> const sublog = logger.newSubLog('prefix') // a new instance of Logger, with indented log set
> let temp = 0
> do {
>   sublog('logname1 here ' + temp, temp) // everything logged here is one indent in
>   const sublog2 = sublog.sublog()
>     let temp2 = 0
>     do {
>       sublog2('logname2 here ' + temp2, temp2) // everything logged here is two indent in
>     } while (temp2++ < 5)
> } while (temp++ < 5)
> ```
> 
> open issue if of interest, lots to design here

</details>

## Benchmarks

We aren't really going for max speed anyway since we care more about DX in dev, but see `/benchmark`:

```bash
$ cd benchmark && npm install
$ node bench.js > bench.txt   
$ grep "^bench" bench.txt
benchWinston*100000: 1.690s
benchBunyan*100000: 1.820s
benchPino*100000: 892.089ms
benchSmol*100000: 1.290s
benchWinston*100000: 1.620s
benchBunyan*100000: 1.712s
benchPino*100000: 911.538ms
benchSmol*100000: 1.284s
```

This hopefully demonstrates we are faster than Winston/Bunyan and competitive to Pino with a better feature set.

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
