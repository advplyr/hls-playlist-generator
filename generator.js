var spawn = require('child_process').spawn
var fs = require('fs').promises
var Path = require('path')
var logger = require('./logger')

function probe(args, cmd = 'ffprobe') {
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
  var start = Date.now()
  var rawKeyframes = await probe(probeargs, 'ffprobe')
  if (!rawKeyframes) {
    return false
  }
  var keyframelines = rawKeyframes.split(/\r\n/).filter(l => l.length > 1)
  var formatline = keyframelines.pop()

  var format_duration = Number(formatline.split(',')[1])
  var streamline = keyframelines.pop().split(',')
  var stream_duration = Number(streamline[1])

  logger.debug('Format Duration', format_duration, 'Stream Duration', stream_duration)
  var keyframes = keyframelines.filter(l => l.includes('K_')).map(l => Number(l.split(',')[1]))
  var dur = Date.now() - start
  logger.info(`${keyframes.length} Keyframes found in ${(dur / 1000).toFixed(2)}s`)
  logger.debug(keyframes)
  return {
    keyframes,
    duration: stream_duration || format_duration
  }
}

function keyframesToSegmentLengths(keyframes, duration, segment_length) {
  var last_segment = 0
  var segment_lengths = []
  var current_desired_time = segment_length

  for (let i = 0; i < keyframes.length; i++) {
    var desired_segment_length = current_desired_time - last_segment

    var kf = keyframes[i]
    var kf_next = i + 1 < keyframes.length ? keyframes[i + 1] : null

    var kf_distance = kf - last_segment
    var kf_next_distance = kf_next !== null ? kf_next - last_segment : null

    var kf_distance_from_desire = Math.abs(desired_segment_length - kf_distance)
    var kf_next_distance_from_desire = kf_next_distance !== null ? Math.abs(desired_segment_length - kf_next_distance) : null

    if (kf_next_distance_from_desire !== null && kf_next_distance_from_desire <= 1 && kf_next_distance_from_desire <= kf_distance_from_desire) {

    } else if (kf_distance >= desired_segment_length) {
      segment_lengths.push(Number(kf_distance.toFixed(3)))
      last_segment = kf
      current_desired_time += segment_length
    }
  }

  var remaining_segment_length = duration - last_segment
  segment_lengths.push(Number(remaining_segment_length.toFixed(3)))
  return segment_lengths
}

function buildPlaylistStr(segment_lengths) {
  var playlist_segments = []
  var seg_index = 0
  var largest_segment = 0
  segment_lengths.forEach((segl) => {
    if (segl > largest_segment) largest_segment = segl
    playlist_segments.push(`#EXTINF:${segl.toFixed(6)},\nindex${seg_index}.ts`)
    seg_index++
  })

  logger.debug('Segment lengths', segment_lengths)
  logger.debug('Total Segments', segment_lengths.length)

  var playlist = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-ALLOW-CACHE:NO\n#EXT-X-TARGETDURATION:${Math.ceil(largest_segment)}\n#EXT-X-MEDIA-SEQUENCE:0\n#EXT-X-PLAYLIST-TYPE:VOD\n`
  playlist += playlist_segments.join('\n')
  playlist += '\n#EXT-X-ENDLIST'
  return playlist
}

async function start(filepath, outputpath = null, segment_length = 3) {
  if (outputpath) {
    logger.info(`Generating playlist for "${Path.basename(filepath)}" to "${Path.basename(outputpath)}" with target segment length ${segment_length}..`)
  } else {
    logger.info(`Generating playlist for "${Path.basename(filepath)}" with target segment length ${segment_length}..`)
  }

  var keyframeProbeResponse = await getKeyFrames(filepath)
  if (!keyframeProbeResponse) {
    return false
  }
  var { duration, keyframes } = keyframeProbeResponse
  var segment_lengths = keyframesToSegmentLengths(keyframes, duration, segment_length)
  if (!outputpath) {
    return segment_lengths
  }
  var playlist = buildPlaylistStr(segment_lengths)
  try {
    await fs.writeFile(outputpath, playlist)
    logger.info(`Playlist written to ${outputpath} with ${segment_lengths.length} segments`)
    return true
  } catch (err) {
    logger.error('Failed to save playlist file', err)
    return false
  }
}
module.exports = start
