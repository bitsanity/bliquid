module.exports.FOURHOURSMS = 1000 * 60 * 60 * 4
module.exports.TWENTYFOURHOURSMS = 1000 * 60 * 60 * 24

module.exports.MONTHS =
  ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

module.exports.toReadableDate = function( millisec, crunch=false ) {
  if (0 == millisec) return "null"

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

module.exports.timestamp = function() {
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

