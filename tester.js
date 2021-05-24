/*
  Generate and compare keyframe duration for all files in directory
  e.g. node tester ./path-to-scan/
*/

var Path = require('path')
var fs = require('fs').promises
var kpg = require('./index')

const args = process.argv.slice(2)
var input = Path.resolve(args[0])
var extname = Path.extname(input)

function getFilesInDir(directory) {
  return fs.readdir(directory).then((filepaths) => {
    return filepaths.map(path => Path.join(directory, path))
  }).catch((error) => {
    console.error('Failed to read files in dir', error)
    return []
  })
}

async function run() {
  if (extname) {
    var segments = await kpg.segments(input)
    console.log('Extracted segments', segments)
  } else {
    var files = await getFilesInDir(input)

    for (let i = 0; i < files.length; i++) {
      var filepath = files[i]
      await kpg(filepath, null, 3, '1')
    }
  }
}
run()