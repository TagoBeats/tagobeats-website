// TagoClip Pro launch mail, variant for people who only have TagoPitch.
//
// Usage:
//   node scripts/broadcast.mjs scripts/broadcasts/pro-launch-tagopitch.mjs --env .vercel/.env.production.local --test you@example.com
//   node scripts/broadcast.mjs scripts/broadcasts/pro-launch-tagopitch.mjs --env .vercel/.env.production.local --segment tagopitch --exclude tagoclip --limit 50
//   node scripts/broadcast.mjs scripts/broadcasts/pro-launch-tagopitch.mjs --env .vercel/.env.production.local --segment tagopitch --exclude tagoclip

import { render } from './_pro-launch.mjs'

export default {
  id: 'pro-launch-tagopitch',
  subject: 'My first paid plugin is out',
  replyTo: 'info@tagobeats.com',
  render: (email, unsubUrl) => render({
    intro: ['you grabbed TagoPitch from me a while back. Today I\'m releasing my first paid plugin, TagoClip Pro: the FL Studio soft clip sound in every DAW, on a modern engine.'],
    staysFree: 'TagoPitch stays free, nothing changes there.',
    ps: 'P.S. Questions? Just hit reply.',
  }, unsubUrl),
}
