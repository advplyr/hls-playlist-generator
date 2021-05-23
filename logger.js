module.exports.debug = (...msg) => {
  if (process.env.LOG_LEVEL <= 0) return
  console.log(...msg)
}

module.exports.info = (...msg) => {
  console.log(...msg)
}

module.exports.error = (...msg) => {
  console.error(...msg)
}