const fetch = require('node-fetch');
const async = require('async');
const lodash = require('lodash');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const _ = lodash;

const scriptFile = process.argv[1];
const appDir = path.dirname(scriptFile);
const dataDir = path.resolve(appDir, 'data');
const DATETIME = Date.now();
const OUTFILE = path.resolve(dataDir, `output-${DATETIME}.json`);
const DEBUG = true;

/**

TODO:
* abstract out so that city is an argument, we'll just do a whitelist of cities for now.
* weird thing: no neighbourhoods in Calgary listings?
* neither does PG: https://www.zolo.ca/prince-george-real-estate

*/


process.chdir(appDir);

function getCities(callback) {

}

function getHoods(callback) {
  let rootUrl = 'https://www.zolo.ca/vancouver-real-estate/neighbourhoods';
  var rootReq = fetch(rootUrl);

  rootReq.then((result) => {
    result.text().then((text) => {
      let $ = cheerio.load(text);
      var list = $('.all-neighborhoods > table:nth-child(2) > tbody > tr');
      let data = list.map((i, row) => {
        return {
          url: $(row).children().find('a.xs-block').attr('href'),
          listed: parseInt($(row).find('td.xs-hide').html()),
          name: $(row).children().find('a.xs-block').text()
        };
      });

      callback(null, data);
    });
  })
  .catch((err) => {
    callback(err);
  });
}

function parseAddress(str) {
  var unitRx = /([\d]+?)\-([\d]+?)\ ([\S\s]+?)\, ([\S\ ]+?)\,\ (BC)/;
  var houseRx = /([\d]+?)\ ([\S\s]+?)\, ([\S\ ]+?)\,\ (BC)/;
  var parsed = unitRx.exec(str);
  if (!parsed) {
    parsed = houseRx.exec(str);
    if (parsed) {
      var ret = {
        sNum: parsed[1],
        sName: parsed[2],
        city: parsed[3],
        prov: parsed[4]
      };
    }
  }
  else {
    var ret = {
      unit: parsed[1],
      sNum: parsed[2],
      sName: parsed[3],
      city: parsed[4],
      prov: parsed[5]
    };
  }
  if (parsed && parsed.length > 0) {
    return ret;
  }
  else {
    // console.error('failed parse: '+str);
    return null;
  }
}

function getListingsForHood(hood, callback) {
  var pages = Math.ceil( hood.listed / 24); // XXX page size could change at any time
  // console.log('getListings: pages>', pages);
  var urls = _.map(_.range(pages), (i) => {
    return `${hood.url}/page-${i+1}`;
  });

  var _name = hood.name.toLowerCase();
  var funcs = _.map(urls, (url) => {
    return function(cb) {
      fetch(url).then((result) => {
        var context = "";
        result.text().then((text) => {
          let $ = cheerio.load(text);

          let data = $('article.card-listing').map(function(i, el) {
            let values = $(this).find('ul.card-listing--values');
            let price =  $(values).find('li.price > span:nth-child(2)').html();
            let sqft = $(this).find('ul.card-listing--values li:nth-child(4)').text().slice(1);
            let days = $(this).find('span.xs-mr1').html();
            let address = parseAddress($(this).find('h3.card-listing--location').text());

            // handle property type by looking for the type-* classes
            let type;
            let img = $('div.card-listing--image');
            if (img.hasClass('type-condo')) {
              type = 'condo'
            } else if (img.hasClass('type-townhouse')) {
              type = 'townhouse';
            } else if (img.hasClass('type-house')) {
              type = 'house';
            } else {
              type = 'unknown';
            }

            if (address) {
              return {
                price: parseInt(price.replace(/\$/g, '').replace(/\,/g, '')),
                sqft: parseInt(sqft.split(' ').shift()) || "n/a",
                days: parseInt(days.split(' ').shift()) || "n/a",
                address: address,
                hood: _name,
                type: type
              };
            } else {
              return null;
            }
          });

          cb(null, data.get());

        }).catch((err) => {
            console.error('rejected result.text()>', url, context, err);
        });
      }).catch((err) => {
        console.error('rejected fetch>', err);
      });
    }
  });

  async.parallel(funcs, (err, results) => {
    if (err) throw err;
    results = _.flatten(results);
    // console.log('getListingsForHood>', `${_name} complete: ${results.length} listings.`);
    callback(null, results);
  });
}

function getAllListings(hoods, cb) {
  var funcs = _.map(hoods, (hood) => {
    return (callback) => {
      getListingsForHood(hood, (e, listings) => {
        if (e) throw e;
        callback(null, listings);
      });
    }
  });

  async.parallel(funcs, (err, allListings) => {
    if (err) throw err;
    cb(null, allListings);
  });
}

function summarize(results) {
  let stats = {
    house: 0,
    condo: 0,
    townhouse: 0
  }

  results.forEach((property) => {
    stats[property.type]++;
  });

  return stats;
}

getHoods((e, hoods) => {
  if (e) throw e;
  getAllListings(hoods, (err, listings) => {
    if (err) throw err;
    listings = _.flatten(listings);

    // console.log('getAllListings>', `${listings.length} total listings found in ${hoods.length} neighborhoods.`);

    let quickstats = summarize(listings);

    let output = {
      meta: {
        timestamp: DATETIME,
        total: listings.length,
        quickstats: quickstats
      },
      data: listings
    }

    let data;
    if (DEBUG) {
      data = JSON.stringify(output, null, 2)
    } else {
      data = JSON.stringify(output);
    }

    fs.writeFile(OUTFILE, data, 'utf8', (err) => {
      if (err) throw err;
      console.log(OUTFILE);
    });
  });
});
