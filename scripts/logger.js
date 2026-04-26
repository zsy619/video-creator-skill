const isDebug = process.argv.includes('--debug');

const logger = {
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args),
  debug: (...args) => { if (isDebug) console.log('[DEBUG]', ...args); },
  step: (num, msg) => console.log(`\n📋 Step ${num}: ${msg}`),
  done: () => console.log('✅'),
  fail: (msg) => console.warn(`⚠️  ${msg}`),
};

module.exports = logger;
