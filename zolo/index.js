// const browser = await puppeteer.launch();
// const page = await browser.newPage();
// await page.goto('https://www.zolo.ca/vancouver-real-estate/condos');
// await page.screenshot({path: 'example.png'});
// await browser.close();

function parseAddress(str) {
  var unitRx = /([\d]+?)\-([\d]+?)\ ([\S\s]+?)\, ([\S\ ]+?)\,\ (BC)/;
  var houseRx = /([\d]+?)\ ([\S\s]+?)\, ([\S\ ]+?)\,\ (BC)/;
  var parsed = unitRx.exec(str);
  if (!parsed) {
    parsed = houseRx.exec(str);
    if (!parsed) {
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
    return
  }
  else {
    console.log('failed parse: '+str);
    return {};
  }
}

function getSqFtPrice() {
  var out = [];
  var list = document.querySelectorAll('.card-listing--details');

  list.forEach((el) => {
    var price = parseInt(el.querySelector('.price').textContent.replace(/[\$\,]/g, ''));
    var sqft = parseInt(el.querySelector('ul.card-listing--values li:nth-child(4)').textContent);
    var address = parseAddress(el.querySelector('h3.card-listing--location').textContent);
    var sqftPrice = Math.round((price / sqft));
    var row = {
      address: address,
      price: price,
      sqft: sqft,
      sqftPrice: sqftPrice
    };

    var l = document.createElement('li');
    l.className = 'tile-data xs-inline';
    l.textContent = `${sqftPrice} $/sqft`;
    el.querySelector('ul.card-listing--values').appendChild(l);

    out.push(row);
  });
  return out;
}

function getNeighborhoodData() {
  var list = document.querySelectorAll('.all-neighborhoods > table:nth-child(2) > tbody > tr');
  return Array.map(list, (row) => {
    return {
      link: row.querySelector('a.xs-block').href,
      listed: row.querySelector('td.xs-hide').textContent
    };
  });
}

function fetchPages(rootUrl) {
  // 1. get pager urls
  // 2. get data on first page
  // 3. walk page urls and get additional data
}

// const puppeteer = require('puppeteer');
//
// (async () => {
//
//   const browser = await puppeteer.launch();
//   // Create a new incognito browser context.
//   const context = await browser.createIncognitoBrowserContext();
//   // Create a new page in a pristine context.
//   const page = await context.newPage();
//   // debugging messages
//   page.on('console', msg => {
//     for (let i = 0; i < msg.args().length; ++i)
//       console.log(`${i}: ${msg.args()[i]}`);
//   });
//   // page.evaluate(() => console.log('hello', 5, {foo: 'bar'}));
//
//
//   // Do stuff
//   await page.goto('https://www.zolo.ca/vancouver-real-estate/condos');
//
//   const results = await page.evaluate(getSqFtPrice);
//
//   console.log(JSON.stringify(results));
//
//   await browser.close();
//
// })();
