export default {
  hasProperty: (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop),

  sleep: (ms) => new Promise((resolve) => {
    setTimeout(resolve, ms);
  }),

  decodeXML: (input) => input
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, '\'')
    .replace(/&amp;/g, '&'),

  parseError: (err, hideStack = []) => {
    let toReturn = err.message;
    if (err.stack && err.stack.length > 0 && !hideStack.includes(err.message)) {
      const stack = err.stack.split('\n');
      if (stack[1]) {
        toReturn += stack[1].replace('   ', '');
      }
    }
    return toReturn;
  },

  parseSerialNumber: (input) => input
    .toString()
    .replace(/[\s'"]+/g, '')
    .toUpperCase(),

  generateRandomString: (length) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let nonce = '';
    while (nonce.length < length) {
      nonce += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return nonce;
  },
};
