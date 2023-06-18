
export type Store = ({ logName, loggedLine, payload, secondsSinceStart, secondsSinceLastLog }: {
  logName: string;
  loggedLine: string | null;
  payload: any;
  secondsSinceStart: number;
  secondsSinceLastLog: number;
}) => any


export function getCurrentFilePath() {
  const stack = new Error().stack;
  if (stack) {
    const stackLines = stack.split('\n').slice(1).filter(line => !line.includes('/node_modules/@smol-ai/logger'));
    const filePathLine = stackLines[0].trim();
    //   const filePath = filePathLine.substring(filePathLine.indexOf('(') + 1, filePathLine.indexOf(')') - 1);  // this one  works if in a direct file, but not in a library
    // this one works in a library where the trace is 'at async file:///Users/swyx/Documents/Work/gptapiexperiment/newtest.mjs:28:18'
    const filePath = filePathLine.slice(filePathLine.indexOf('file:///'), -1)
    return filePath;
  } else {
    console.error('unexpectedly short stack trace; not anticipated part of smol logger, please investigate')
    console.error(stack)
    throw new Error('unexpectedly short stack trace; not anticipated part of smol logger, please investigate')
  }
}

// left pad numbers with 0
export function pad(num: number, size = 2) {
  let s = num + "";
  while (s.length < size) s = "0" + s;
  return s;
}


export function getCircularReplacer() {
  const seen = new WeakSet();
  return (key: any, value: any) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return;
      }
      seen.add(value);
    }
    return value;
  };
}