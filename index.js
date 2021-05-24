var Path = require('path')
var generator = require('./generator')
var Logger = require('./logger')
var { prettyBytes, prettyTimestamp } = require('./utils')
var ffprobeDetails = require('./extractors/ffprobe-details')
var ffprobeKeyframes = require('./extractors/ffprobe-keyframes')
var mp4Keyframes = require('./extractors/mp4-keyframes')
var mkvKeyframes = require('./extractors/mkv-keyframes')

process.env.IS_DEBUG = process.env.IS_DEBUG || '0'

async function fetchKeyframes(keyframeFn, filepath) {
  try {
    var startTime = Date.now()
    var keyframes = await keyframeFn(filepath)
    var elapsed = ((Date.now() - startTime) / 1000)

    var sampleKeyframesString = process.env.IS_DEBUG === '1' ? ' | Sample keyframes: ' + keyframes.slice(0, 10).join(', ') + '...' : ''
    Logger.info('>', keyframeFn.name, 'extracted', keyframes.length, 'keyframes in', Number(elapsed.toFixed(2)), 'seconds', sampleKeyframesString)
    return keyframes
  } catch (err) {
    Logger.error('Failed to fetch keyframes', err)
    return false
  }
}

function getDetailsDescription(details) {
  var { duration, bitrate, size, codec, width, height, resolution } = details
  var durationString = prettyTimestamp(duration)
  var bitrateString = prettyBytes(bitrate)
  var sizeString = prettyBytes(size)
  return `File Size: ${sizeString} | Video: ${resolution} ${codec} | Video Bitrate: ${bitrateString} | Duration: ${durationString}`
}

async function extractKeyframes(filepath, details = null) {
  var filename = Path.basename(filepath)
  var extname = Path.extname(filepath)
  var isMp4 = extname === '.mp4'
  var isMkv = extname === '.mkv'
  Logger.debug('---------------------------------')
  Logger.info('Extracting keyframes for', filename)

  // For debugging .mkv and .mp4 files: additionally get keyframes from ffprobe for comparison
  if ((process.env.IS_DEBUG === '1') && (isMp4 || isMkv) && details) {
    Logger.debug(getDetailsDescription(details))
    await fetchKeyframes(ffprobeKeyframes, filepath)
  }

  var keyframes = null
  if (isMkv) {
    keyframes = await fetchKeyframes(mkvKeyframes, filepath)
  } else if (isMp4) {
    keyframes = await fetchKeyframes(mp4Keyframes, filepath)
  } else {
    keyframes = await fetchKeyframes(ffprobeKeyframes, filepath)
  }
  return keyframes
}


module.exports = async (filepath_input, outputpath_input = null, segment_length = 3, is_debug) => {
  if (is_debug !== undefined) {
    process.env.IS_DEBUG = is_debug
  }
  var filepath = Path.resolve(filepath_input)

  var outputpath = outputpath_input ? Path.resolve(outputpath_input) : null

  var details = await ffprobeDetails(filepath)
  var keyframes = await extractKeyframes(filepath, details)

  var segmentLengths = generator.getSegmentLengths(keyframes, details.duration, segment_length)

  if (!outputpath) {
    return segmentLengths
  }
  return generator.buildSavePlaylist(outputpath, segmentLengths)
}

// Returns array of keyframes
module.exports.extract = async (filepath_input) => {
  var filepath = Path.resolve(filepath_input)
  var keyframes = await extractKeyframes(filepath)
  return keyframes
}

// Returns array of segments
module.exports.segments = async (filepath_input, segment_length = 3, duration = null) => {
  var filepath = Path.resolve(filepath_input)
  var duration = duration || await ffprobeDetails.getDuration(filepath)
  var keyframes = await extractKeyframes(filepath)
  return generator.getSegmentLengths(keyframes, duration, segment_length)
}

// Returns boolean, builds and saves playlist given segments
module.exports.generate = async (segments, outputpath_input, segment_name = 'index') => {
  var outputpath = Path.resolve(outputpath_input)
  return generator.buildSavePlaylist(outputpath, segments, segment_name)
}