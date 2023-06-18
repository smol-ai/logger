import fs from 'fs';
import path from 'path';
import { Store, getCircularReplacer, getCurrentFilePath, pad } from './utils';

export class SmolLogger {
  counter = 0;
  startTime = Date.now();
  lastLogTime = Date.now();
  logDirectory = '.logs';
  logToConsole = true
  logToStore = true
  currentRunDir = ''
  LOGCOLOR = (str: string) => "\x1b[33m" + str + "\x1b[0m";
  constructor({ logToConsole, logToStore }: { logToConsole: boolean, logToStore: boolean }) {
    this.logToConsole = logToConsole ?? true;
    this.logToStore = logToStore ?? true;
    if (!fs.existsSync(this.logDirectory)) fs.mkdirSync(this.logDirectory);
    this.currentRunDir = path.join(this.logDirectory, (new Date().toISOString()).slice(0,19).split('T').join(' '));
    if (this.logToConsole) {
      console.log(this.LOGCOLOR, 'logToConsole is set to true, we will be printing verbose logs');
      if (this.logToStore) console.log(this.LOGCOLOR('logToStore is set to true, we will be storing logs to ') + this.currentRunDir);
    }
    fs.mkdirSync(this.currentRunDir);
  }

  // default implementation of a namer function, overwrite to change how logs are named
  logName = (name: string) => {
    const currentCount = pad(this.counter++, 3)
    return `${currentCount}: ${name}`
  }

  // default implementation of store that just writes to a file. overwrite to log to somewhere else
  store: Store = ({ logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog, ...args }: 
    { logName: string, loggedLine: string | null, payload: any, secondsSinceStart: number, secondsSinceLastLog: number }
  ) => {
    const destination = path.join(this.currentRunDir, `${logName}.json`)
    if (this.logToConsole) console.log("Stored to", destination);
    const p = loggedLine ? loggedLine.split(':') : ['UNKNOWN', 'UNKNOWN', 'UNKNOWN']
    fs.writeFileSync(
      destination,
      JSON.stringify(
        { $path: p[0] + ':' + p[1], $location: p[2], $timeElapsed: { sinceStart: secondsSinceStart, sinceLast: secondsSinceLastLog }, $payload: payload, ...args 
      }, 
        getCircularReplacer(), 2)
    );
  }

  private _log = (name: string, args: any) => { // arrow fn or else this.* references wont work when called from other files
    const logName = this.logName(name)
    const loggedLine = getCurrentFilePath();
    const currentTime = Date.now();
    const secondsSinceStart = (currentTime - this.startTime) / 1000;
    const secondsSinceLastLog = (currentTime - this.lastLogTime) / 1000;
    this.lastLogTime = currentTime;
    if (this.logToConsole) {
      console.log(this.LOGCOLOR("============== Start: " + logName + "=============="));
      const originalWrite = process.stdout.write;
      process.stdout.write = (chunk, encoding: any, callback?: (err?: Error | undefined) => void): boolean => {
        chunk.toString().split('\n').forEach(line => {
            const modifiedChunk = this.LOGCOLOR(logName) + ' | ' + line + '\n';
            return originalWrite.call(process.stdout, modifiedChunk, encoding, callback);
        })
        return true
      };
      console.log(loggedLine, this.LOGCOLOR("with"), secondsSinceStart.toFixed(2), this.LOGCOLOR("seconds elapsed"));
      console.log(args);
      process.stdout.write = originalWrite;
      console.log(this.LOGCOLOR("============== End: " + logName + "=============="));
    }
    return { logName, loggedLine, secondsSinceStart, secondsSinceLastLog, payload: args }
  }
  log = (name: string, args: any) => {
    if (this.logToStore) this.store(this._log(name, args))
    return args
  }
  asyncLog = async (name: string, args: any) => {
    if (this.logToStore) await this.store(this._log(name, args))
    return args
  }

  wrap = (
    fnToWrap: Function, // todo: improve the typing on this, please help
    opts: { logTransformer: any}  // todo: improve the typing on this, please help
    ) => async (...args: any[]) => {
    let result = 'NO RESULT'
    opts.logTransformer = opts.logTransformer ?? ((_args: any, result: any) => result)
    try {
      result = await fnToWrap(...args)
      result = await opts.logTransformer(args, result)
    } catch (err) {
      console.error('error happened while wrapping and transforming ' + fnToWrap.name)
      throw err
    } finally {
      await this.asyncLog(fnToWrap.name, {
        args,
        result
      })
      return result 
    }
  }

}

export default SmolLogger;