var { runChild } = require('../utils')
var Path = require('path')

function tryGrabBitRate(stream) {
  if (!isNaN(stream.bit_rate) && stream.bit_rate) {
    return Number(stream.bit_rate)
  }
  if (!stream.tags) {
    return null
  }

  // Attempt to get bitrate from bps tags
  var bps = stream.tags.BPS || stream.tags['BPS-eng'] || stream.tags['BPS_eng']
  if (bps && !isNaN(bps)) {
    return Number(bps)
  }

  var tagDuration = stream.tags.DURATION || stream.tags['DURATION-eng'] || stream.tags['DURATION_eng']
  var tagBytes = stream.tags.NUMBER_OF_BYTES || stream.tags['NUMBER_OF_BYTES-eng'] || stream.tags['NUMBER_OF_BYTES_eng']
  if (tagDuration && tagBytes) {
    var bps = Math.floor(Number(tagBytes) * 8 / Number(tagDuration))
    if (bps && !isNaN(bps)) {
      return bps
    }
  }
  return null
}

function tryGrabFrameRate(stream) {
  var avgFrameRate = stream.avg_frame_rate || stream.r_frame_rate
  if (!avgFrameRate) return null
  var parts = String(avgFrameRate).split('/')
  if (parts.length === 2) {
    avgFrameRate = Number(parts[0]) / Number(parts[1])
  } else {
    avgFrameRate = Number(parts[0])
  }
  if (!isNaN(avgFrameRate)) return avgFrameRate
  return null
}

function getResolutionText(width, height) {
  if (width && height) {
    if (width >= 3800 || height >= 2000) {
      return "4K"
    }
    if (width >= 2500) {
      return "1440p"
    }
    if (width >= 1900 || height >= 1000) {
      return "1080p"
    }
    if (width >= 1260 || height >= 700) {
      return "720p"
    }
    if (width >= 700 || height >= 440) {
      return "480p"
    }
    return "SD"
  }
  return 'NA'
}

async function ffprobeDetails(filepath) {
  var path = Path.resolve(filepath)
  var probeargs = [
    '-v', 'error',
    '-show_format',
    '-show_streams',
    '-select_streams', 'v',
    '-of', 'json',
    path
  ]
  var ffprobeResponse = await runChild(probeargs, 'ffprobe')
  if (!ffprobeResponse) {
    return false
  }
  ffprobeResponse = JSON.parse(ffprobeResponse)
  var { streams, format } = ffprobeResponse
  if (!streams.length) return false
  var videoStream = streams[0]
  var width = !isNaN(videoStream.width) ? Number(videoStream.width) : null
  var height = !isNaN(videoStream.height) ? Number(videoStream.height) : null
  var videoBitrate = tryGrabBitRate(videoStream)
  var totalBitrate = !isNaN(format.bit_rate) ? Number(format.bit_rate) : null
  return {
    width,
    height,
    bitrate: videoBitrate || totalBitrate,
    frame_rate: tryGrabFrameRate(videoStream),
    size: !isNaN(format.size) ? Number(format.size) : null,
    duration: !isNaN(format.duration) ? Number(format.duration) : null,
    format_name: format.format_name || null,
    total_bitrate: totalBitrate,
    resolution: getResolutionText(width, height),
    codec: videoStream.codec_name
  }
}

module.exports = ffprobeDetails

module.exports.getDuration = async (filepath) => {
  var path = Path.resolve(filepath)
  var probeargs = [
    '-v', 'error',
    '-show_format',
    '-of', 'json',
    path
  ]
  var ffprobeCmd = process.env.FFPROBE_PATH || 'ffprobe'
  var ffprobeResponse = await runChild(probeargs, ffprobeCmd)
  if (!ffprobeResponse) {
    return false
  }
  ffprobeResponse = JSON.parse(ffprobeResponse)
  if (!ffprobeResponse.format || !ffprobeResponse.format.duration) {
    return false
  }
  return Number(ffprobeResponse.format.duration)
}