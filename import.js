const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const GoogleSpreadsheet = require('google-spreadsheet');
const async = require('async');
// const randomFullName = require('random-fullName');
var ProgressBar = require('progress');

var argv = require('yargs').argv;
const CWD = process.cwd();
const dataFile = path.resolve(CWD, argv._[0]);

if (!fs.existsSync(dataFile)) {
  console.log(`File ${dataFile} does not exist?`);
  process.exit();
}

const data = require(dataFile).data;
const headers = _.keys(data[0]);

console.log(`Rows: ${data.length}`);

const credentials = require('./Zolo-b45d3b3b2eb4.json');
const sheetId = '1vrCahojYUqgkssi8HTFpTm8nTdboHGXEyBfxWFIBq2M';
var doc = new GoogleSpreadsheet(sheetId);
var sheet, sheets;

function newSheet(step) {
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
    step();
  });
}

function importData(step) {
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
      step();
    });
  });

}

async.series([
  function setAuth(step) {
    doc.useServiceAccountAuth(credentials, step);
  },
  function getInfo(step) {
    doc.getInfo(function(err, info) {
      if (err) throw err;
      console.log('Loaded doc: '+info.title+' by '+info.author.email);
      console.log(`Got ${info.worksheets.length} worksheets.`);
      sheets = info.worksheets.slice(1); // retain one worksheet

      // console.log(typeof step);
      let _sheet = info.worksheets[0]; // root sheet
      console.log('sheet 1: '+_sheet.title+' '+_sheet.rowCount+'x'+_sheet.colCount);
      step();
    });
  },
  newSheet,
  importData
], function(err){
    if( err ) {
      console.log('Error: '+err);
    }
});
