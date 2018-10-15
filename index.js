if (!module.parent) {
  console.log("running in script");

} else {
  console.log('required from some other script / module');
}
