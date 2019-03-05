const _ = require('underscore');
const util = require('util');
const fs = require('fs');
const path = require('path');
const GoogleSpreadsheet = require('google-spreadsheet');
const async = require('async');
const { execFile } = require('child_process');
const scriptFile = process.argv[1];
const appDir = path.dirname(scriptFile);
const dataDir = path.resolve(appDir, 'data');

process.chdir(appDir);

const CWD = process.cwd();
// console.log(CWD);
// console.log(path.resolve(appDir, dataFile));
// process.exit();

// if (!fs.existsSync(path.resolve(appDir, dataFile))) {
//   console.error(`Missing dataFile: ${dataFile}`);
//   process.exit(1);
// }

/*
 *  1. get raw json data files
 *  2. import each data file
 *  3. zip each file - move to other directory?
 */
function getDataFiles(dir) {
  return _.filter(fs.readdirSync(dir), (fileName) => {
    return /output-[\d]{13}\.json$/.test(fileName);
  });
}

function zipDataFiles(dir, cb) {
  let pExecFile = util.promisify(execFile);
  let dataFiles = getDataFiles(dir);

  let files = _.map(dataFiles, (file) => {
    return (cb) => {
      execFile('bzip2', [path.resolve(CWD, dir, file)], (err, stdout, stderr) => {
        if (err) throw err;
        cb();
      });
    }
  });

  async.series(files, (err, result) => {
    execFile('ls', ['-lha', './data'], (err, stdout, stderr) => {
      if (err) throw err;
      console.log(stdout);
    });
  });
}

const credentials = require('./Zolo-b45d3b3b2eb4.json');
const sheetId = '1vrCahojYUqgkssi8HTFpTm8nTdboHGXEyBfxWFIBq2M';
var doc = new GoogleSpreadsheet(sheetId);
var sheet, sheets;

// function newSheet(step) {
//
// }
//
// // ** add a new worksheet to the document and import the data into it
// function importData(step) {
//
// }

function getInfo(step) {
  doc.getInfo(function(err, info) {
    if (err) throw err;
    console.log('Loaded doc: '+info.title+' by '+info.author.email);
    console.log(`Got ${info.worksheets.length} worksheets.`);
    sheets = info.worksheets.slice(1); // retain one worksheet
    let _sheet = info.worksheets[0]; // root sheet
    console.log('sheet 1: '+_sheet.title+' '+_sheet.rowCount+'x'+_sheet.colCount);
    step();
  });
}

function importDataFromFile(file, callback) {
  console.log('Importing file: %s', file);
  let data = require(path.resolve(dataDir, file)).data;
  let headers = _.keys(data[0]);
  let d = new Date();
  let sheetTitle = `${Date.now()} - ${d.toDateString()}`;
  var options = {
    title: sheetTitle,
    rowCount: data.length+2,
    colCount: headers.length
  };
  doc.addWorksheet(options, (err, _sheet) => {
    if (err) throw err;
    sheet = _sheet; // set module global, hacky but it works.
    let _data = data;
    _data = _data.slice(1);
    sheet.setHeaderRow(headers, (err) => {
      if (err) throw err;
      let functions = _.map(_data, (row) => {
        return (cb) => {
          let _row = row;
          _row.address = _.values(_row.address).join(" ");
          sheet.addRow(_row, cb);
        }
      });

      async.parallelLimit(functions, 20, (err, result) => {
        if (err) throw err;
        console.log('Done');
        callback(result);
      });
    });
  });
}

function main(dataDir, callback) {
  let dataFiles = getDataFiles(dataDir);
  // dataFiles.length = 1;
  console.log('Found %d files to import.', dataFiles.length);
  console.log(dataFiles);

  // callback();
  let mainLoop = _.map(dataFiles, (file) => {
    return (cb) => {
      importDataFromFile(file, cb);
    };
  });

  async.series([
    (step) => {
      doc.useServiceAccountAuth(credentials, (err, r) => {
        if (err) throw err;
        step();
      });
    },
    getInfo,
    (step) => {
      async.series(mainLoop, (err, result) => {
        if (err) throw err;
        callback(null, result);
      });
    }
  ]);
}

if (require.main === module) {
  console.log("dataDir: %s", dataDir);
  main(dataDir, (err, result) => {
    if (err) throw err;
    // zipDataFiles(dataDir, () => {
    //   console.log('Finished: %s', result);
    // });
  });
}
