// Pin all server-side "today" / date-range math to Pacific Time (Bend, OR).
// Date objects stay UTC internally; this only changes how year/month/day are
// interpreted in local-time constructors like `new Date(y, m, d)`, so "today"
// in /orders/summary or /analytics starts at midnight Pacific, not midnight UTC.
// Railway runs in UTC by default; production should also set TZ=America/Los_Angeles
// as an env var for belt-and-suspenders.
//
// IMPORTANT: this file must be imported BEFORE anything that touches Date at
// module-load time. Keep it as the very first import in server/src/index.js.
process.env.TZ = process.env.TZ || 'America/Los_Angeles';
