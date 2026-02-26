import { generateKeyPair, exportJWK } from 'jose';

const { publicKey, privateKey } = await generateKeyPair('RS256', { extractable: true });
const pubJWK = await exportJWK(publicKey);
const privJWK = await exportJWK(privateKey);
pubJWK.kid = 'notion-1'; pubJWK.alg = 'RS256'; pubJWK.use = 'sig';
privJWK.kid = 'notion-1'; privJWK.alg = 'RS256'; privJWK.use = 'sig';

console.log('JWT_PRIVATE_KEY=' + Buffer.from(JSON.stringify(privJWK)).toString('base64'));
console.log('JWT_PUBLIC_KEY=' + Buffer.from(JSON.stringify(pubJWK)).toString('base64'));
console.log('---JWKS---');
console.log(JSON.stringify({ keys: [pubJWK] }));
