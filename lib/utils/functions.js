import platformLang from './lang-en.js';

const decodeXML = (input) => input
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#039;/g, '\'')
  .replace(/&amp;/g, '&');

const generateRandomString = (length) => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let nonce = '';
  while (nonce.length < length) {
    nonce += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return nonce;
};

const hasProperty = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

const logDefault = (k, def) => {
  this.log.warn('%s [%s] %s %s.', platformLang.cfgItem, k, platformLang.cfgDef, def);
};

const logDuplicate = (k) => {
  this.log.warn('%s [%s] %s.', platformLang.cfgItem, k, platformLang.cfgDup);
};

const logIgnore = (k) => {
  this.log.warn('%s [%s] %s.', platformLang.cfgItem, k, platformLang.cfgIgn);
};

const logIgnoreItem = (k) => {
  this.log.warn('%s [%s] %s.', platformLang.cfgItem, k, platformLang.cfgIgnItem);
};

const logIncrease = (k, min) => {
  this.log.warn('%s [%s] %s %s.', platformLang.cfgItem, k, platformLang.cfgLow, min);
};

const logQuotes = (k) => {
  this.log.warn('%s [%s] %s.', platformLang.cfgItem, k, platformLang.cfgQts);
};

const logRemove = (k) => {
  this.log.warn('%s [%s] %s.', platformLang.cfgItem, k, platformLang.cfgRmv);
};

const parseError = (err, hideStack = []) => {
  let toReturn = err.message;
  if (err?.stack.length > 0 && !hideStack.includes(err.message)) {
    const stack = err.stack.split('\n');
    if (stack[1]) {
      toReturn += stack[1].replace('   ', '');
    }
  }
  return toReturn;
};

const parseSerialNumber = (input) => input
  .toString()
  .replace(/[\s'"]+/g, '')
  .toUpperCase();

const sleep = (ms) => new Promise((resolve) => {
  setTimeout(resolve, ms);
});

export {
  decodeXML,
  generateRandomString,
  hasProperty,
  logDefault,
  logDuplicate,
  logIgnore,
  logIgnoreItem,
  logIncrease,
  logQuotes,
  logRemove,
  parseError,
  parseSerialNumber,
  sleep,
};
