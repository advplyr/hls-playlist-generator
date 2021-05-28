#!/usr/bin/env node
const { program } = require('commander')
const generate = require('./index')

program.arguments('<input_path> [output_path]')
  .option('-s, --segment-length <length>', 'Specify a segment length', '3')
  .option('-d, --debug', 'Show debug logs')
  .option('-k, --keyframes', 'Print keyframes')
  .option('-p, --ffprobe-path <path>', 'Set a path for FFprobe')
  .option('-n, --segment-name <name>', 'Segment name in m3u8 playlist, i.e. <name>-14.ts', 'index')
  .parse()

const options = program.opts()

if (!options.segmentLength || isNaN(options.segmentLength)) {
  return console.log('Invalid segment length')
}
options.segmentLength = Number(options.segmentLength)

const args = program.args

var fileinput = args[0]
var output_path_relative = args[1] || null

generate(fileinput, output_path_relative, options).then((response) => {
  if (response === true || response === false) return
  console.log(response)
})