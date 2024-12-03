const FOURHOURSMS       = 1000 * 60 * 60 * 4
const TWENTYFOURHOURSMS = 1000 * 60 * 60 * 24

const MONTHS =
  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

var BLDate = (function() {

  function toReadableDate( millisec, crunch=false ) {
    if (0 == millisec) return ""

    let ts = new Date( millisec )

    let mon = MONTHS[ts.getUTCMonth()]
    let day = ts.getUTCDate()
    if (day < 10) day = '0' + day
    let hr = ts.getUTCHours()
    if (hr < 10) hr = '0' + hr
    let min = ts.getUTCMinutes()
    if (min < 10) min = '0' + min

    return  '' + day +
            ((crunch) ? '' : ' ') +
            mon +
            ((crunch) ? '' : ' ') +
            ((crunch) ? ts.getUTCFullYear() % 100
                      : ts.getUTCFullYear()) +
            '-' +
            hr +
            ':' +
            min +
            ((crunch) ? 'z' : ' UTC')
  }

  function timestamp() {
    let now = new Date()
    let mon = now.getUTCMonth() + 1
    if (mon < 10) mon = '0' + mon
    let day = now.getUTCDate()
    if (day < 10) day = '0' + day
    let hr = now.getUTCHours()
    if (hr < 10) hr = '0' + hr
    let min = now.getUTCMinutes()
    if (min < 10) min = '0' + min
    return '' + now.getUTCFullYear() + mon + day + hr + min
  }

  function toHTMLInputDate( millisec ) {
    if (0 == millisec) return ""
    let ts = new Date( millisec )

    let yr = ts.getFullYear()
    let mon = ts.getMonth() + 1
    let day = ts.getDate()
    if (day < 10) day = '0' + day
    let hr = ts.getHours()
    if (hr < 10) hr = '0' + hr
    let min = ts.getMinutes()
    if (min < 10) min = '0' + min

    return  '' +
            yr + '-' +
            mon + '-' +
            day + 'T' +
            hr +
            ':' +
            min
  }

  function fromFormattedLocal( str ) { // yyyy-mm-ddTHHmm
    let dt = new Date( str )
    let diffms = dt.getTimezoneOffset() * 60 * 1000 // offset is in minutes
    return dt.getTime() + diffms
  }

  return {
    FOURHOURSMS : FOURHOURSMS,
    TWENTYFOURHOURSMS : TWENTYFOURHOURSMS,
    toReadableDate : toReadableDate,
    timestamp : timestamp,
    toHTMLInputDate : toHTMLInputDate,
    fromFormattedLocal : fromFormattedLocal
  }

})();
