var { runChild } = require('../utils')
var Path = require('path')

async function getKeyFrames(filepath) {
  var path = Path.resolve(filepath)
  var probeargs = [
    '-v', 'error',
    '-skip_frame', 'nokey',
    '-show_entries', 'format=duration',
    '-show_entries', 'stream=duration',
    '-show_entries', 'packet=pts_time,flags',
    '-select_streams', 'v',
    '-of', 'csv',
    path
  ]
  var rawKeyframes = await runChild(probeargs, 'ffprobe')
  if (!rawKeyframes) {
    return false
  }
  var keyframelines = rawKeyframes.split(/\r\n/).filter(l => l.length > 1)
  var formatline = keyframelines.pop()

  var format_duration = Number(formatline.split(',')[1])
  var streamline = keyframelines.pop().split(',')
  var stream_duration = Number(streamline[1])

  var keyframes = keyframelines.filter(l => l.includes('K_')).map(l => Number(l.split(',')[1])).filter(l => !isNaN(l))
  return {
    keyframes,
    duration: stream_duration || format_duration
  }
}

async function ffprobeKeyframes(filepath) {
  var keyframeProbeResponse = await getKeyFrames(filepath)
  if (!keyframeProbeResponse) return false
  return keyframeProbeResponse.keyframes.map(kf => Number(kf.toFixed(3)))
}
module.exports = ffprobeKeyframes