const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const async = require('async');
const {google} = require('googleapis');
const { execFile } = require('child_process');
const scriptFile = process.argv[1];
const appDir = path.dirname(scriptFile);
const dataDir = path.resolve(appDir, 'data');
const {mean, median} = require('simple-statistics');
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
const keyPath = path.resolve(appDir, 'client_credentials.json');
const creds = require(keyPath);
// console.log(creds.client_email);
const email = creds.client_email;
const authClient = new google.auth.JWT(creds.client_email, keyPath, null, SCOPES);
const sheets = google.sheets('v4');


function dailyStats(data, callback) {

}

function pricing(data, callback) {

  let types = _.unique(_.pluck(data, 'type'));
  let hoods = _.unique(_.pluck(data, 'hood'));

  let typeFunctions = _.map(types, (type) => {
    return (step) => {
      pricingByType(data, type, (err, result) => {
        if (err) throw err;
        step(null, result);
      });
    }
  });

  async.series(typeFunctions, (err, result) => {
    // console.log(result);
    callback(null, result);
  });
}

const UP = (i) => { return Math.ceil(i); };

function pricingByType(data, type, callback) {

  // get all the listings of this type
  let filtered = _.filter(data, (item) => {
    return (item.type === type);
  });

  let priceArr = _.map(filtered, (item) => {
    let _t = _.values(_.pick(item, 'price', 'sqft'));
    let priceSqft = Math.round(_t[0] / _t[1]);
    if (parseInt(priceSqft) > 0) {
      _t.push(priceSqft);
    }
    else {
      _t.push(null);
    }
    return _t;
  });

  let unzipped = _.unzip(priceArr);

  // console.log(JSON.stringify(unzipped[2], null, '  '));

  // we may have "n/a" values in the sqft data
  let pricePerSqftArr = _.filter(unzipped[2], (item) => {
    return (parseInt(item) > 0);
  });

  let analysis = {
    type: type,
    total: filtered.length,
    averagePrice: UP(mean(unzipped[0])),
    medianPrice: UP(median(unzipped[0])),
    averagePricePerSqft: UP(mean(pricePerSqftArr)),
    medianPricePerSqft: UP(median(pricePerSqftArr)),
  }

  callback(null, analysis);
}

if (require.main === module) {
  let data = require(argv.f).data;
  // data.length = 20;
  // get typs of properties:
  pricing(data, (err, result) => {
    if (err) throw err;
    console.log(result);
  });

}
