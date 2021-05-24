module.exports.debug = (...msg) => {
  if (!process.env.IS_DEBUG) return
  console.log(...msg)
}

module.exports.info = (...msg) => {
  console.log(...msg)
}

module.exports.error = (...msg) => {
  console.error(...msg)
}