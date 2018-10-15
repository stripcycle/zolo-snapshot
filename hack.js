const _ = require('underscore');
const GoogleSpreadsheet = require('google-spreadsheet');
const async = require('async');
// const randomFullName = require('random-fullName');
var ProgressBar = require('progress');

// spreadsheet key is the long id in the sheets URL
const credentials = require('./Zolo-b45d3b3b2eb4.json');
// const credentials = require('./Zolo-f6eda074184c.json');


// 1vrCahojYUqgkssi8HTFpTm8nTdboHGXEyBfxWFIBq2M
const sheetId = '1lNSnMXov81JgFkyy0ac64uAvj1xgj10_NYvImH7doZw';
var doc = new GoogleSpreadsheet(sheetId);
var sheet, sheets, rows, headers;
var cols = data[0].length+1;

// get data file from command line


function setAuth(step) {
  console.log(`In setAuth`);
  doc.useServiceAccountAuth(credentials, step);
}

function getInfo(step) {
  doc.getInfo(function(err, info) {
    if (err) throw err;
    console.log('Loaded doc: '+info.title+' by '+info.author.email);
    console.log(`Got ${info.worksheets.length} worksheets.`);
    sheets = info.worksheets.slice(1); // retain one worksheet

    // console.log(typeof step);
    sheet = info.worksheets[0]; // root sheet
    console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
    step();
  });
}

function hack(step) {

  let _data = data;
  let headers = _.keys(_data[0]);
  // _data = _data.slice(1)

  // console.log(_data[267]);
  // console.log(_data[268]);
  // console.log(_data[269]);



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
  setAuth,
  getInfo,
  hack
], function(err){
    if( err ) {
      console.log('Error: '+err);
    }
});
