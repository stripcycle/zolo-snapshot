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

/*
TODO:

1. create new named sheet and import into that sheet
2. calculate some basic stats and insert them into the same sheet

*/
const argv = require('yargs')
  .usage("Usage: $0 -f <datafile.json>")
  .alias('f', 'file')
  .describe('f', 'JSON file to import into Google Sheets.')
  .demandOption(['f'])
  .argv;

if (!fs.existsSync(argv.f)) {
  console.error("Data file does not exist: %s.", argv.f);
}

// should be from config json file
const GOOGLE_SPREADSHEETID = '10hl-nQGdsABnj28RaqeMSvTQA3AXp6oOh4B1v1Ra8sg';

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];


// Create the JWT client
const keyPath = path.resolve(appDir, 'Zolo-b45d3b3b2eb4.json');
const creds = require(keyPath);
// console.log(creds.client_email);
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
  // sheet title unique key is the timestamp of the data file
  let d = new Date();
  let info = {
    title: `${Date.now()} - ${d.toDateString()}`
  };

  console.log('info>', info);

  let data = require(argv.f).data;

  // data.length = 20;
  let headers = _.keys(data[0]);

  data = _.map(data, (row) => {
    row.address = _.values(row.address).join(' ');
    return _.values(row);
  });

  data.unshift(headers);

  createSheet(GOOGLE_SPREADSHEETID, info, data, (err, result) => {
    if (err) throw err;
    console.log(result);

    process.exit();
  });
});
