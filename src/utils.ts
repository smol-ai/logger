
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
    // Extract the filepath from the call stack
    const stackLines = stack.split('\n');
    // The second line usually contains the filepath and line number of the current function
    if (stackLines.length >= 4) {
      const filePathLine = stackLines[4].trim();
      // Extract the filepath from the line
      const filePath = filePathLine.substring(filePathLine.indexOf('(') + 1, filePathLine.lastIndexOf(':'));
      return filePath;
    } else {
      console.error('unexpectedly short stack trace; not anticipated part of smol logger, please investigate')
      console.error(stack)
      throw new Error('unexpectedly short stack trace; not anticipated part of smol logger, please investigate')
    }
  }
  return null;
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