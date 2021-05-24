#!/usr/bin/env node
const generate = require('./index')

const args = process.argv.slice(2)

if (args.length === 0) {
  console.log('Invalid args must specify video file path')
  return
}

var fileinput = args[0]
var segment_length = 3
var output_path_relative = null

// If second argument is a number use it as the target segment length
if (args[1] && !isNaN(args[1])) {
  segment_length = Number(args[1])
} else if (args[1] && args[1].length) {
  output_path_relative = args[1]

  if (args[2] && !isNaN(args[2])) {
    segment_length = Number(args[2])
  }
}

generate(fileinput, output_path_relative, segment_length).then((response) => {
  if (response === true || response === false) return
  console.log(response)
})