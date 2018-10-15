/**

Flow:

* node script gets some data:
  * header row
  * data rows
* node script connects to GSheet
  * add a worksheet
  * add a header row
  * add data rows
  * post analysis trigger?

*/

const GoogleSpreadsheet = require('google-spreadsheet');

const async = require('async');
const _ = require('underscore');
const credentials = require('./Zolo-b45d3b3b2eb4.json');
const sheetId = '1vrCahojYUqgkssi8HTFpTm8nTdboHGXEyBfxWFIBq2M';

// // spreadsheet key is the long id in the sheets URL
// var doc = new GoogleSpreadsheet('1vrCahojYUqgkssi8HTFpTm8nTdboHGXEyBfxWFIBq2M');
// var sheet;

class GoogleSheetUtils {
  _auth = false;
  _sheets = [];

  constructor(sheetId, credentials) {
    this.info;
    this.sheetId = sheetId;
    this.credentials = credentials;
    this.doc = new GoogleSpreadsheet(this.sheetId);
  }

  getSheets(callback) {
    var that = this;
    async.series([
      function (step) {
        that.doc.useServiceAccountAuth(credentials, step);
      },
      function getWorkSheets(step) {
        that.doc.getInfo((err, info) => {
          if (err) throw err;
          that.info = info;
          step()
        });
      }
    ],
    function(err) {
      if (err) throw err;
      callback(null, that.info.worksheets);
    });
  }

  addJSONData(data, callback) {
    var that = this;
    /*
    steps:
      0. auth
      1. add new sheet
      2. bulkUpdate data into sheet
      3. verify
      4. next step? stats?
    */

    // fake data

    console.log('data.data', data.data);

    async.series([
      function (step) {
        that.doc.useServiceAccountAuth(credentials, step);
      },
      function addWorkSheetAndData(step) {
        // console.log('addWorkSheetAndData>');


        that.doc.addWorksheet({ title: `${data.title} - ${Date.now()}` }, (err, sheet) => {
          if (err) throw err;

          let options = {
                "min-row": 1, // fucking 1-indexed range, what is this VBScript!!!
                "max-row": (data.data.length + 1),
                "min-col": 1,
                "max-col": (data.data[0].length + 1),
                "return-empty": true
          };
          sheet.getCells(options, (err, cells) => {
            if (err) throw err;
            let _cells = _.flatten(_.map(data.data, (row, r) => {
              return _.map(row, (col, c) => {
                let opts = {
                  value: col,
                  col: c,
                  row: r
                };
                return opts;
              });
            }));

            console.log(JSON.stringify(_cells, null, ' '));
            _.each(cells, (cell) => {
              let _cell = _.findWhere(_cells, {row: cell.row, col: cell.col});
              console.log(_cell, cell);
              cell.value = _cell.value; // it's just data, no need to worry about formulas
            });

            sheet.bulkUpdateCells(cells, (err, result) => {
              if (err) throw err;
              console.log('bulkUpdateCells>', err, result);
              step();
            });

          });
        });
      }
    ],
    callback);
  }
}

console.log('got here');

let Utils = new GoogleSheetUtils(sheetId, credentials);

// Utils.getSheets((err, sheets) => {
//   if (err) throw err;
//   console.log(`Got ${sheets.length} back.`);
// });

var fakeData = {
  title: 'mysheet',
  data: [
    ['one', 'two'],
    [1, 2],
    [3, 4]
  ]
};

console.log('got here 2');

Utils.addJSONData(fakeData, (err, result) => {
  if (err) throw err;
  console.log('got here 3');
  console.log('result>', result);
});



// async.series([
//   function setAuth(step) {
//     // see notes below for authentication instructions!
//     doc.useServiceAccountAuth(credentials, step);
//   },
//   function getInfoAndWorksheets(step) {
//     doc.getInfo(function(err, info) {
//       if (err) throw err;
//       console.log('Loaded doc: '+info.title+' by '+info.author.email);
//       console.log(`Doc has ${info.worksheets.length} worksheet(s).`);
//       sheet = info.worksheets[0];
//       console.log('sheet 1: '+sheet.title+' '+sheet.rowCount+'x'+sheet.colCount);
//       step();
//     });
//   },
//   function workingWithCells(step) {
//     sheet.getCells({
//       'min-row': 1,
//       'max-row': 2,
//       'min-col': 1,
//       'max-col': 2,
//       'return-empty': true
//     }, function(err, cells) {
//       if (err) throw err;
//       console.log(`cells length: ${cells.length}`);
//
//       let vals = _.map(cells, (c) => {
//         return {
//           r: c.row,
//           c: c.col,
//           val: c.value
//         }
//       });
//       console.log(vals);
//     });
//   }
// ],
// function (err) {
//   if (err) throw err;
//   // console.log(result);
//
// });

/* take json data and import into a new sheet:

1. setAuth
2. add new sheet, set name properly with metadata
3. convert raw JSON data
3. bulkUpdateCells(cells)

*/
