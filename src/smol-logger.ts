import fs from 'fs';
import path from 'path';


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
  store = ({ logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog }: 
    { logName: string, loggedLine: string | null, payload: any, secondsSinceStart: number, secondsSinceLastLog: number }
  ) => {
    const destination = path.join(this.currentRunDir, `${logName}.json`)
    if (this.logToConsole) console.log(this.LOGCOLOR(logName), "Stored to", destination);
    const p = loggedLine ? loggedLine.split(':') : ['UNKNOWN', 'UNKNOWN', 'UNKNOWN']
    fs.writeFileSync(
      destination,
      JSON.stringify({ path: p[0] + ':' + p[1], location: p[2], secondsSinceStart, secondsSinceLastLog, payload }, null, 2)
    );
  }

  log = (name: string, args: any) => { // arrow fn or else this.* references wont work when called from other files
    const logName = this.logName(name)
    const loggedLine = getCurrentFilePath();
    const currentTime = Date.now();
    const secondsSinceStart = (currentTime - this.startTime) / 1000;
    const secondsSinceLastLog = (currentTime - this.lastLogTime) / 1000;
    this.lastLogTime = currentTime;
    if (this.logToConsole) {
      console.log(this.LOGCOLOR(logName), loggedLine, this.LOGCOLOR("with"), secondsSinceStart.toFixed(2), this.LOGCOLOR("seconds elapsed"));
      console.log(this.LOGCOLOR(logName), args);
    }
    if (this.logToStore) {
      this.store({
        logName, 
        loggedLine,
        secondsSinceStart,
        secondsSinceLastLog,
        payload: args
      })
    }
    return args
  }
}

function getCurrentFilePath() {
  const stack = new Error().stack;
  if (stack) {
    // Extract the filepath from the call stack
    const stackLines = stack.split('\n');
    // The second line usually contains the filepath and line number of the current function
    if (stackLines.length >= 4) {
      const filePathLine = stackLines[3].trim();
      // Extract the filepath from the line
      const filePath = filePathLine.substring(filePathLine.indexOf('(') + 1, filePathLine.lastIndexOf(':'));
      return filePath;
    }
  }
  return null;
}

// pad numbers with 0
function pad(num: number, size = 2) {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}

export default SmolLogger;