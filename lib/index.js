import { createRequire } from 'module';
import wemoPlatform from './platform.js';

const require = createRequire(import.meta.url);
const plugin = require('../package.json');

export default (hb) => hb.registerPlatform(plugin.alias, wemoPlatform);
