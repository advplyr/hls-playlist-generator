var fs = require('fs').promises
var logger = require('./logger')

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
module.exports.getSegmentLengths = keyframesToSegmentLengths

function getPlaylistString(segment_lengths) {
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

async function buildAndSavePlaylist(outputpath, segment_lengths) {
  var playlist = getPlaylistString(segment_lengths)
  try {
    await fs.writeFile(outputpath, playlist)
    logger.info(`Playlist written to ${outputpath} with ${segment_lengths.length} segments`)
    return segment_lengths.length
  } catch (err) {
    logger.error('Failed to save playlist file', err)
    return false
  }
}
module.exports.buildSavePlaylist = buildAndSavePlaylist
