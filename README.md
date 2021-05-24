# HLS Playlist Generator

Gets accurate HLS segment lengths for a video file by using keyframes, then optionally generates an HLS .m3u8 playlist.

### Background
When direct streaming a video via HLS, the segment lengths are determined by the keyframes.

In order to generate an accurate playlist, hls-playlist-generator first extracts keyframes using `ffprobe`, `mp4box`, or `matroska` depending on the container, then selects correct segments lengths that `ffmpeg` would use based on target segment length.

.mp4 files will use `mp4box` to extract keyframes (takes < 1s)<br />
.mkv files will use `matroska` to extract keyframes (takes < 1s)<br />
all other containers will use `ffprobe` (takes 1 - 30s)

(Thanks to [Ivshti/retrieve-keyframes](https://github.com/Ivshti/retrieve-keyframes) for the fast .mp4 and .mkv keyframe extraction)

## Requirements

[ffprobe](https://ffmpeg.org/ffprobe.html)

## Installation

```bash
npm install hls-playlist-generator
```
or for CLI
```bash
npm install -g hls-playlist-generator
```
or use CLI without installing via NPX
```bash
npx hls-playlist-generator 'path-to/media-file.mkv'
```

## Usage

```es6
var hpg = require('hls-playlist-generator')

// Write the .m3u8 playlist to the output file - Returns number of segments
hpg('./path-to/media-file.mkv', './path-to/playlist.m3u8', 3)

// Return an array of segment lengths
hpg('./path-to/media-file.mkv', 3)

// or (target segment length defaults to 3)
hpg('./path-to/media-file.mkv')
```

<img src="https://raw.githubusercontent.com/mcoop320/hls-playlist-generator/master/m3u8_sample.png" />

## CLI Usage

```bash
# Write the .m3u8 playlist to the output file
hls-playlist-generator "C:/Path with spaces/movie.mkv" "./playlist.m3u8" 3

# Return an array of segment lengths
hls-playlist-generator "C:/Path with spaces/movie.mkv" 3

# or (target segment length defaults to 3)
hls-playlist-generator "C:/Path with spaces/movie.mkv"
```

<img src="https://raw.githubusercontent.com/mcoop320/hls-playlist-generator/master/cli_sample.png" />

## License
[MIT](https://choosealicense.com/licenses/mit/)