var spawn = require('child_process').spawn

// https://coderrocketfuel.com/article/how-to-convert-bytes-to-kb-mb-gb-or-tb-format-in-node-js
module.exports.prettyBytes = function (bytes) {
  if (!bytes || isNaN(bytes)) return '0 Bytes'
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)))
  if (i === 0) {
    return bytes + " " + sizes[i]
  }
  return (bytes / Math.pow(1024, i)).toFixed(1) + " " + sizes[i]
}

module.exports.prettyTimestamp = function (timestamp) {
  if (!timestamp || isNaN(timestamp)) return '00:00:00'
  var hours = Math.floor(timestamp / 60 / 60)
  var minutes = Math.floor(timestamp / 60) - (hours * 60)
  var seconds = Math.floor(timestamp % 60)
  return hours.toString().padStart(2, '0') + ':' + minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0')
}

module.exports.runChild = function (args, cmd = 'ffprobe') {
  return new Promise((resolve) => {
    var proc = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'inherit'] })
    var buff = ''
    proc.stdout.setEncoding("utf8")
    proc.stdout.on('data', function (data) {
      buff += data
    })
    proc.on('close', function () {
      resolve(buff)
    })
    proc.on('error', (err) => {
      logger.debug('Err', err)
      resolve(null)
    })
  })
}