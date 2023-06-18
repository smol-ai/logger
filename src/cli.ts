#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const logsDir = './.logs';
const tsvFile = 'logs.tsv';

const headers: string[] = [];
const rows: string[][] = [];

fs.readdir(logsDir, (err: any, dirs: string[]) => {

  // pick first directory, read first file in first directory
  const firstFile = fs.readdirSync(path.join(logsDir, dirs[0]))[0];
  if(!firstFile) return console.log('No files in directory',  dirs[0]);
  const headerData = fs.readFileSync(path.join(logsDir, dirs[0], firstFile));
  const headerObj = JSON.parse(headerData);
  headers.push('LogName')
  Object.keys(headerObj).forEach(function (topheader) {
      if (topheader === '$payload') headers.push('payloadType');
      // listing headers 1 layer deep
      Object.keys(headerObj[topheader]).forEach(function (subheader) { return headers.push(topheader + ':' + subheader); });
  });

  dirs.filter(
    // filter for directories using fs function
    dir => fs.statSync(path.join(logsDir, dir)).isDirectory()
  ).forEach(dir => {
    const dirPath = path.join(logsDir, dir);
    const dirFiles: string[] = fs.readdirSync(dirPath);
    dirFiles.forEach(file => {
      let row: string[] = [];
      row.push(file.replace('.json', '')); // logName
      const filePath = path.join(dirPath, file);
      const fileData = fs.readFileSync(filePath);
      const fileObj = JSON.parse(fileData);
      Object.keys(fileObj).forEach(key => {
        const payload = fileObj[key]
        if (Array.isArray(payload)) {
          if (key === '$payload') row.push('array:'+payload.length);
          payload.forEach(item => row.push(JSON.stringify(item)));
        } else if (typeof payload === 'object') {
          if (key === '$payload') row.push('object:' + Object.keys(payload).join(',')); // serves as a "payload type"
          Object.keys(fileObj[key]).forEach(
            payloadKey => row.push(JSON.stringify(fileObj[key][payloadKey]))
          );
        } else {
          // just a raw value
          if (key === '$payload') row.push('rawValue')
          row.push(JSON.stringify(payload))
        }
      });
      rows.push(row);
    })
  });

  const tsvContent = headers.join('\t') + '\n' + 
  rows.map(row => row.join('\t')).join('\n');
  fs.writeFileSync(path.join(logsDir, tsvFile), tsvContent);
});
