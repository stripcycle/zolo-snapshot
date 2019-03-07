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

/*
TODO:

1. calculate some basic stats and insert them into the same sheet
*/

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
let sheetId = config.test.sheetId;
if (argv.m === "prod") {
  sheetId = config.prod.sheetId;
}

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];


// Create the JWT client
const keyPath = path.resolve(appDir, 'Zolo-b45d3b3b2eb4.json');
const creds = require(keyPath);
const email = creds.client_email;
const authClient = new google.auth.JWT(creds.client_email, keyPath, null, SCOPES);
const sheets = google.sheets('v4');

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
  sheets.spreadsheets.batchUpdate(req, (err, result) => {
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
    sheets.spreadsheets.values.update(req, callback);
  });
}

// Authorize it to produce an access token
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

  createSheet(GOOGLE_SPREADSHEETID, info, rows, (err, result) => {
    if (err) throw err;
    console.log(`${result.status} - ${result.statusText}`);

    process.exit();
  });
});
