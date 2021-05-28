var { runChild } = require('../utils')
var Logger = require('../logger')
var Path = require('path')

async function getKeyFrames(filepath) {
  var path = Path.resolve(filepath)
  var probeargs = [
    '-v', 'error',
    '-skip_frame', 'nokey',
    '-show_entries', 'format=duration',
    '-show_entries', 'stream=duration',
    '-show_entries', 'packet=pts_time,dts_time,flags',
    '-select_streams', 'v',
    '-of', 'csv',
    path
  ]
  var ffprobeCmd = process.env.FFPROBE_PATH || 'ffprobe'
  Logger.debug('Ffprobe command', ffprobeCmd)
  var rawKeyframes = await runChild(probeargs, ffprobeCmd)
  if (!rawKeyframes) {
    return false
  }
  var keyframelines = rawKeyframes.split(/\r\n/).filter(l => l.length > 1)
  var formatline = keyframelines.pop()
  if (!formatline) {
    Logger.debug('Invalid format line', keyframelines)
    return false
  }
  var format_duration = Number(formatline.split(',')[1])
  var streamline = keyframelines.pop().split(',')
  var stream_duration = Number(streamline[1])

  keyframelines = keyframelines.filter(l => l.includes('K_'))
  var keyframes = keyframelines.map(l => {
    var lineparams = l.split(',')
    // Use pts_time first, fallback to dts_time
    if (!isNaN(lineparams[1])) return Number(lineparams[1])
    else if (!isNaN(lineparams[2])) return Number(lineparams[2])
    return null
  }).filter(l => l !== null)
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
