module.exports = {
  getTimestamp() {
    var currDate = new Date();
    var hours = currDate.getHours();
    var minutes =
      (currDate.getMinutes() < 10 ? '0' : '') + currDate.getMinutes();
    var seconds =
      (currDate.getSeconds() < 10 ? '0' : '') + currDate.getSeconds();

    return hours + ':' + minutes + ':' + seconds;
  }
};
