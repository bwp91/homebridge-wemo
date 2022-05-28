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
  parseError,
  parseSerialNumber,
  sleep,
};
