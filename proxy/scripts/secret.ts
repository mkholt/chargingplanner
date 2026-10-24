/**
 * Prints a token secrets file with one new 256-bit key.
 * To rotate, merge the printed key into the existing file and point "current" at it.
 */
import { randomBytes } from 'node:crypto';

// Date for readability, random suffix so two rotations on the same day never collide
const kid = `k${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomBytes(3).toString('hex')}`;
const secrets = { current: kid, keys: { [kid]: randomBytes(32).toString('base64') } };

console.log(JSON.stringify(secrets, null, 2));
