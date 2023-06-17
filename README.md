# smol logger

A zero dependency Node.js extensible logging tool.

## Features

- Logs to both the console and local json files for easy navigation/versioning
- Logs time elapsed, filepath/line number of log call
- Extend the log store to a remote store, e.g. LogFlare
- Customize everything from naming to terminal log color

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
mySuperAwesomeFunction(foo, bar, baz) // oh no i need to log bar
mySuperAwesomeFunction(foo, log(bar), baz) // done!
mySuperAwesomeFunction(...log({foo, bar, baz}).values()) // done!

mySingleArityFunction({foo, bar, baz}) // oh no i need to log bar and baz
mySingleArityFunction({foo, ...log({bar, baz})) // done!
mySingleArityFunction(log({foo, bar, baz}) // log them all why not
```

We default to [single arity to encourage this in the JS ecosystem](https://www.freecodecamp.org/news/how-to-optimize-for-change-software-development/).

## Extend to Remote Storage

We like [Logflare](https://logflare.app/)!

```js
// { logName: string, loggedLine: string | null, payload: any, secondsSinceStart: number, secondsSinceLastLog: number }
logger.store = ({ logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog }) => {
  fetch("https://api.logflare.app/logs/json?source=YOUR_SOURCE_ID", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "X-API-KEY": "YOUR_API_KEY_HERE"
    },
    body: JSON.stringify({ logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog })
  })
}
```

<img height="300" alt="image" src="https://github.com/smol-ai/logger/assets/6764957/69b546ec-23d7-4099-9432-5fd37ca1436e">


#### Publishing

Follow the console instructions to install semantic release and run it (answer NO to "Do you want a `.travis.yml` file with semantic-release setup?").

_Note: make sure you've setup `repository.url` in your `package.json` file_

```bash
npm install -g semantic-release-cli
semantic-release-cli setup
# IMPORTANT!! Answer NO to "Do you want a `.travis.yml` file with semantic-release setup?" question. It is already prepared for you :P
```

From now on, you'll need to use `npm run commit`, which is a convenient way to create conventional commits.

Automatic releases are possible thanks to [semantic release](https://github.com/semantic-release/semantic-release), which publishes your code automatically on [github](https://github.com/) and [npm](https://www.npmjs.com/), plus generates automatically a changelog. This setup is highly influenced by [Kent C. Dodds course on egghead.io](https://egghead.io/courses/how-to-write-an-open-source-javascript-library)

## acknowledgements

bootstrapped with https://github.com/alexjoverm/typescript-library-starter
