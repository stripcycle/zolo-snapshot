const _ = require('lodash');
const fs = require('fs');
const path = require('path');

// const output = require('../data/output-1539965821662.json');
var argv = require('yargs').argv;

// console.log(`Current directory: ${process.cwd()}`);
const CWD = process.cwd();
const dataFile = path.resolve(CWD, argv._[0]);

if (!fs.existsSync(dataFile)) {
  console.log(`File ${dataFile} does not exist?`);
  process.exit();
}

const output = require(dataFile);

function rawCounts(data) {
  return _.countBy(data, (property) => {
    return property.type;
  });
}

function daysOnSite(data) {
  return _.countBy(data, (property) => {
    if (property.days <= 7) { // 1 week
      return "<= 1 week"
    } else if (property.days > 7 && property.days <= 30) {
      return "8 days to 30 days";
    } else {
      return "more than 30 days";
    }
  });
}

function daysOnSiteByType(data) {
  let groups = _.groupBy(data, 'type');
  let totals = _.map(groups, (group, type) => {
    return {
      type: type,
      count: daysOnSite(group)
    };
  });

  totals = _.groupBy(totals, 'type');
  totals = _.map(totals, (group) => {
    return group.shift();
  });

  totals.push({ type: 'all', count: daysOnSite(data) });

  return totals;
}

function summarize(data) {
  // console.log({
  //   counts: rawCounts(),
  //   days: daysOnSiteAll(),
  //   daysByType: daysOnSiteByType();
  // });

  console.log(daysOnSiteByType(data));
}

summarize(output.data);
