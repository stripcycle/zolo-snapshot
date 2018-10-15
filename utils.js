function delSheets(step) {
  let functions = _.map(sheets, (sheet) => {
    return function(callback) {
      var id = sheet.id;
      sheet.del((e, r) => {
        if (e) throw e;
        callback(null, id);
      });
    }
  });
  async.parallel(functions, (err, result) => {
    if (err) throw err;
    console.log(`Deleted ${result.length} sheets`);
    step();
  });
}
