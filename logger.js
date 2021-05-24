module.exports.debug = (...msg) => {
  if (process.env.IS_DEBUG !== '1') return
  console.log(...msg)
}

module.exports.info = (...msg) => {
  console.log(...msg)
}

module.exports.error = (...msg) => {
  console.error(...msg)
}