const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const async = require('async');
const {google} = require('googleapis');
const { execFile } = require('child_process');
const scriptFile = process.argv[1];
const appDir = path.dirname(scriptFile);
const dataDir = path.resolve(appDir, 'data');
process.chdir(appDir); // change to CWD

const config = require('./config.json');

const argv = require('yargs')
  .usage("Usage: $0 -m <test or prod> -f <datafile.json>")
  .alias('f', 'file')
  .describe('f', 'JSON file to import into Google Sheets.')
  .describe('m', 'Use the test or production configuration - default is test.')
  .demandOption(['f'])
  .argv;

if (!fs.existsSync(argv.f)) {
  console.error("Data file does not exist: %s.", argv.f);
}

// which google sheet document are we importing into. Default is the test doc.

var sheetId = config.test.sheetId;
if (argv.m === "prod") {
  sheetId = config.prod.sheetId;
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];


// Create the JWT client
const keyPath = path.resolve(appDir, 'Zolo-b45d3b3b2eb4.json');
const creds = require(keyPath);
const email = creds.client_email;
const authClient = new google.auth.JWT(creds.client_email, keyPath, null, SCOPES);
const sheetsApi = google.sheets('v4');

/**
  @param ts - a UNIX timestamp
  @return a date formatted according to the string provided, or
*/
function formatDate(ts) {
  let d = new Date(ts);
  return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
}

// get an array of sheet objects
function getSheets(sheetId, callback) {
  let req = {
    auth: authClient,
    spreadsheetId: sheetId
  };
  sheetsApi.spreadsheets.get(req, (err, result) => {
    if (err) throw err;
    callback(null, result.data.sheets);
  });
}

// ceate a new sheet and import data into it.
function createSheet(sheetId, info, data, callback) {
  info.gridProperties = {
    rowCount: data.length,
    columnCount: 12
  };

  let req = {
    auth: authClient,
    spreadsheetId: sheetId,
    resource: {
      requests: [
        {
          addSheet: {
            properties: info
          }
        }
      ]
    }
  };
  sheetsApi.spreadsheets.batchUpdate(req, (err, result) => {
    if (err) throw err;

    let range = info.title;
    let req = {
      auth: authClient,
      spreadsheetId: sheetId,
      range: range,
      valueInputOption: 'RAW',
      resource: {
        values: data
      }
    };
    sheetsApi.spreadsheets.values.update(req, callback);
  });
}

// create a table of data in the first sheet with forumulae referring to
// summary data from all subsequent sheets
// use case is to feed a timeline chart showing summary fields change over time
function setAnalysis(sheetId, callback) {
  getSheets(sheetId, (err, sheets) => {
    if (err) throw err;
    let first = sheets.shift(); // remove first row
    let arr = _.map(sheets, (sheet) => {
      return sheet.properties.title;
    });

    let table = _.map(sheets, (sheet) => {
      let sheetTitle = sheet.properties.title;
      let _r = _.map(_.range(1, 6), (r) => {
        return `='${sheetTitle}'!H${r}`;
      });
      // insert column A as a date column.
      let ts = parseInt(sheetTitle.split(' - ').shift());
      _r.unshift(formatDate(ts));
      return _r;
    });

    // set headers
    table.unshift(["Date", "Total listings", "Condos", "Townhouses", "Houses", "Unknown/Other"]);

    let strRange = `${first.properties.title}!A1:F${table.length}`;

    let req = {
      auth: authClient,
      spreadsheetId: sheetId,
      range: strRange,
      valueInputOption: "USER_ENTERED",
      resource: {
        majorDimension: "ROWS",
        range: strRange,
        values: table
      }
    };

    sheetsApi.spreadsheets.values.update(req, callback);
  });
}

function addSummary(sheetId, sheetTitle, callback) {
  let strRange = `'${sheetTitle}'!G1:H5`;
  let req = {
    auth: authClient,
    spreadsheetId: sheetId,
    range: strRange,
    valueInputOption: 'USER_ENTERED',
    resource: {
      range: strRange,
      values: [
        ["Total listings",    '=COUNT(A:A)'],
        ["Condos",            '=COUNTIF(F:F, "condo")'],
        ["Townhouses",        '=COUNTIF(F:F, "townhouse")'],
        ["Houses",            '=COUNTIF(F:F, "house")'],
        ["Unknown/Other",     '=COUNTIF(F:F, "unknown")'],
      ],
      majorDimension: "ROWS"
    }
  };
  sheetsApi.spreadsheets.values.update(req, callback);
}

authClient.authorize(function(err, tokens) {
  if(err) throw err;

  let data = require(argv.f);
  // sheet title unique key is the timestamp of the data file
  let ts = data.meta.timestamp;
  let strDate = new Date(ts).toDateString();
  let info = {
    title: `${ts} - ${strDate}`
  };

  let rows = data.data;

  // data.length = 20;
  let headers = _.keys(rows[0]);

  rows = _.map(rows, (row) => {
    row.address = _.values(row.address).join(' ');
    return _.values(row);
  });

  rows.unshift(headers);

  let functions = [
    (step) => { // create the new sheet and add data
      createSheet(sheetId, info, rows, (err, result) => {
        if (err) throw err;
        step(null, result);
      });
    },
    (step) => { // insert some summary fields with forumulae
      addSummary(sheetId, info.title, (err, result) => {
        if (err) throw err;
        step(null, result);
      });
    },
    (step) => {
      setAnalysis(sheetId, step);
    }
  ];

  async.series(functions, (err, result) => {
    if (err) throw err;
    console.log(result);
  });

});
