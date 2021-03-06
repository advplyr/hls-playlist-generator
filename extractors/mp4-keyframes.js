/*
  SOURCE: https://github.com/Ivshti/retrieve-keyframes
*/

var mp4box = require('mp4box')
var needle = require('needle')
var fs = require('fs')

function iterateCounts(counts, values, fn) {
  var idx = 0;
  counts.forEach(function (count, i) {
    for (var j = 0; j != count; j++) { fn(values[i], idx++) }
  })
}

function getFramesFromBox(box) {
  var track = box.moov.traks.filter(function (t) {
    return t.mdia.minf.stbl.stss
  })[0];
  var stts = track.mdia.minf.stbl.stts; // sample table time to sample map
  var ctts = track.mdia.minf.stbl.ctts; // Composition Time Offset  - used to convert DTS to PTS
  var mdhd = track.mdia.mdhd; // media header

  // from stts documentation at https://wiki.multimedia.cx/?title=QuickTime_container#stss
  //    duration = (sample_count1 * sample_time_delta1 + ... + sample_countN * sample_time_deltaN ) / timescale
  var allDts = [];
  iterateCounts(stts.sample_counts, stts.sample_deltas, function (delta, idx) { allDts.push(idx * delta) });

  // use ctts to build pts - https://wiki.multimedia.cx/?title=QuickTime_container#ctts
  var allPts = [];
  if (ctts) iterateCounts(ctts.sample_counts, ctts.sample_offsets, function (offset, idx) { allPts.push(allDts[idx] + offset) });

  // we need the stss box - moov.traks[<trackNum>].mdia.minf.stbl.stss - http://wiki.multimedia.cx/?title=QuickTime_container#stss
  // stss - "Sync samples are also known as keyframes or intra-coded frames."
  var frames = track.mdia.minf.stbl.stss.sample_numbers.map(function (x) {
    // WARNING: in the BBB video, to match ffmpeg we need x+1, in the other, we need x-1
    // samples[x].dts/mdhd.timescale
    var dts = allDts[x - 1] / mdhd.timescale * 1000;
    var pts = ctts ? allPts[x - 1] / mdhd.timescale * 1000 : dts;
    return { dts: dts, pts: pts, timestamp: pts, index: x }
  });
  // there's a keyframe at the beginning
  if (frames[0] && frames[0].index !== 1) frames.unshift({ timestamp: 0, dts: 0, index: 1 })
  return frames
}

function mp4Keyframes(url) {
  return new Promise((resolve, reject) => {

    var box = mp4box.createFile()
    var pos = 0
    var maxSeeks = 0

    function toArrayBuffer(buffer) {
      var ab = new ArrayBuffer(buffer.length);
      var view = new Uint8Array(ab);
      for (var i = 0; i < buffer.length; ++i) view[i] = buffer[i];
      return ab;
    }

    function onData(buf) {
      var b = toArrayBuffer(buf);
      b.fileStart = pos;
      pos += b.byteLength;
      box.appendBuffer(b);
      if (box.mdats.length && !box.moovStartFound) {
        var offset = box.boxes.map(function (x) { return x.size }).reduce(function (a, b) { return a + b }, 0);
        if (offset > lastOffset) {
          if (maxSeeks > 3) {
            stream.close ? stream.close() : stream.end();
            return reject(new Error('maxSeeks exceeded'));
          }
          maxSeeks++;

          startStream(url, offset);
        }
      }
    }

    var stream, lastOffset = 0;

    function closeStream() {
      if (!stream) return;

      // credit to mafintosh/pump
      if (stream instanceof fs.ReadStream && typeof (stream.close) === 'function') return stream.close() // use close for fs streams to avoid fd leaks
      if (stream.request && typeof (stream.request.abort) === 'function') return stream.request.abort() // request.destroy just do .end - .abort is what we want
      if (typeof (stream.destroy) === 'function') return stream.destroy()
    }

    function startStream(url, offset) {

      closeStream()

      lastOffset = offset;
      pos = offset;
      if (/^http(s?):\/\//.test(url)) {
        // TODO: WARNING: we should check if the source supports range headers
        // and if the returned range corresponds to the requested range
        // Otherwise, we will eventually end up with a maxSeeks exception (as we would read the beginning of the file over and over, thinking it's actually the next part)
        stream = needle.get(url, { headers: { range: "bytes=" + offset + "-" } })
          .on('error', box.onError)
          .on('end', function (e) { box.flush() })
          .on('data', onData)
      } else {
        stream = fs.createReadStream(url, { start: offset })
          .on('error', box.onError)
          .on('end', function () { box.flush() })
          .on('data', onData)
      }
    }

    box.onError = function (err) {
      closeStream()
      reject(err);
    };

    startStream(url, 0);

    box.onReady = function (info) {
      box.flush()
      closeStream()

      if (!info) return reject(new Error("no info returned"));
      if (!info.videoTracks[0]) return reject(new Error("no videoTracks[0]"))

      try {
        var frames = getFramesFromBox(box)
        // MP4 Using DTS frame timestamp needs testing
        frames = frames.map(f => Number((f.dts / 1000).toFixed(3)))
        resolve(frames)
      } catch (e) { reject(e) }
    }

  })
}

module.exports = mp4Keyframes
