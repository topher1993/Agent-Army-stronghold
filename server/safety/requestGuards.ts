export function requireJson(contentType = 'application/json') {
  if (!contentType.includes('application/json')) throw new Error('Only application/json requests are accepted');
}
export function assertLocalOrigin(origin?: string) {
  if (!origin) return;
  if (!/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin) && !/^https?:\/\/localhost(:\d+)?$/.test(origin)) throw new Error('Non-localhost origin denied');
}
