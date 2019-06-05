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

let sheetId = config.prod.sheetId;
// let sheetId = config.test.sheetId;

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// Create the JWT client
const keyPath = path.resolve(appDir, 'Zolo-b45d3b3b2eb4.json');
const creds = require(keyPath);
const email = creds.client_email;
const authClient = new google.auth.JWT(creds.client_email, keyPath, null, SCOPES);
const sheetsApi = google.sheets('v4');

// function getSheets(sheetId, callback) {
//   let req = {
//     auth: authClient,
//     spreadsheetId: sheetId
//   };
//   sheetsApi.spreadsheets.get(req, (err, result) => {
//     if (err) throw err;
//     callback(null, result.data.sheets);
//   });
// }
//
// function addSummary(sheetId, sheetTitle, callback) {
//   let strRange = `'${sheetTitle}'!G1:H4`;
//   let req = {
//     auth: authClient,
//     spreadsheetId: sheetId,
//     range: strRange,
//     valueInputOption: 'USER_ENTERED',
//     resource: {
//       range: strRange,
//       values: [
//         ["Total listings",  '=COUNT(A:A)'],
//         ["Condos",          '=COUNTIF(F:F, "condo")'],
//         ["Townhouses",      '=COUNTIF(F:F, "townhouse")'],
//         ["Houses",          '=COUNTIF(F:F, "house")'],
//       ],
//       majorDimension: "ROWS"
//     }
//   };
//
//   sheetsApi.spreadsheets.values.update(req, callback);
// }
//
// /**
//   @param ts - a UNIX timestamp
//   @return a date formatted according to the string provided, or
// */
// function formatDate(ts) {
//   let d = new Date(ts);
//   return `${d.getMonth()+1}/${d.getDate()}/${d.getFullYear()}`;
//   // return "Boo."
// }
//
// function setAnalysis(sheetId, callback) {
//   getSheets(sheetId, (err, sheets) => {
//     if (err) throw err;
//     let first = sheets.shift(); // remove first row
//     let arr = _.map(sheets, (sheet) => {
//       return sheet.properties.title;
//     });
//
//     let table = _.map(sheets, (sheet) => {
//       let sheetTitle = sheet.properties.title;
//       let _r = _.map(_.range(1, 5), (r) => {
//         return `='${sheetTitle}'!H${r}`;
//       });
//       // insert column A as a date column.
//       let ts = parseInt(sheetTitle.split(' - ').shift());
//       _r.unshift(formatDate(ts));
//       return _r;
//     });
//
//     // set headers
//     table.unshift(["Date", "Total listings", "Condos", "Townhouses", "Houses"]);
//
//     let strRange = `${first.properties.title}!A1:E${table.length}`;
//
//     let req = {
//       auth: authClient,
//       spreadsheetId: sheetId,
//       range: strRange,
//       valueInputOption: "USER_ENTERED",
//       resource: {
//         majorDimension: "ROWS",
//         range: strRange,
//         values: table
//       }
//     };
//
//     sheetsApi.spreadsheets.values.update(req, callback);
//   });
// }
//
// function addSummaries(sheetId, callback) {
//   getSheets(sheetId, (err, sheets) => {
//     if (err) throw err;
//     let first = sheets.shift(); // remove first sheet
//     let functions = _.map(sheets, (sheet) => {
//       return (step) => {
//         addSummary(sheetId, sheet.properties.title, step);
//       };
//     });
//     async.series(functions, (err, result) => {
//       if (err) throw err;
//       callback(null, result);
//     });
//   });
// }
//
// if (require.main === module) {
//   async.series([
//     (step) => {
//       console.log('in addSummary.');
//       addSummaries(sheetId, step);
//     },
//     (step) => {
//       console.log('in setAnalysis.');
//       setAnalysis(sheetId, (err, result) => {
//         if (err) throw err;
//         step(null, `setAnalysis> ${result.status} - ${result.statusText}`);
//       });
//     }
//   ], (err, result) => {
//     if (err) throw err;
//     console.log('Done!');
//     console.log(result);
//   });
// }
