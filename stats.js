const _ = require('underscore');
const fs = require('fs');
const path = require('path');
const async = require('async');
const { google } = require('googleapis');
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
const keyPath = path.resolve(appDir, 'Zolo-b45d3b3b2eb4.json');
const creds = require(keyPath);
const email = creds.client_email;
const authClient = new google.auth.JWT(creds.client_email, keyPath, null, SCOPES);

const sheets = google.sheets('v4');


function dailyStats(data, callback) {

}

function pricing(data) {

  let types = _.unique(_.pluck(data, 'type'));
  let hoods = _.unique(_.pluck(data, 'hood'));

  // let typeResult = _.map(types, (type) => {
  //     return pricingByType(data, type, )
  // });
  return pricingByHoods(data);
}

const UP = (i) => { return Math.ceil(i); };

function pricingByType(data, type) {
  // get all the listings of this type
  let filtered = _.filter(data, (item) => {
    return (item.type === type);
  });

  // XXX we may not get any for a given type at the hood level
  if (filtered.length === 0) {
    return {};
  }

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

  return analysis;
}

/**
  @param Array data
  @param Function callback
*/
function pricingByHoods(data) {
  // data.length = 1600;
  // XXX reduce the data size for hacking
  data = _.rest(data, 1000);
  data.length = 500;
  let byHoods = _.groupBy(data, "hood");
  let types = _.unique(_.pluck(data, 'type'));
  console.log('types>', types);

  let pricingArr = _.map(byHoods, (hoodArr, hood) => {
    let hoodTypes = _.map(types, (type) => {
      let _typedRes = pricingByType(hoodArr, type);
      if (_.size(_typedRes) > 0) {
          let _t = {}; _t[type] = _typedRes;
          return _t;
      }
    });
    let _h = {}; _h[hood] = hoodTypes;
    return _h;
  });

  return pricingArr;
}

if (require.main === module) {
  let data = require(argv.f).data;
  // data.length = 20;
  // get typs of properties:
  console.log(JSON.stringify(pricing(data), null, '  '));

}
