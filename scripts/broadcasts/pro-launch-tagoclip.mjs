// TagoClip Pro launch mail, variant for the TagoClip segment.
//
// Usage:
//   node scripts/broadcast.mjs scripts/broadcasts/pro-launch-tagoclip.mjs --env .vercel/.env.production.local --test you@example.com
//   node scripts/broadcast.mjs scripts/broadcasts/pro-launch-tagoclip.mjs --env .vercel/.env.production.local --segment tagoclip --limit 50
//   node scripts/broadcast.mjs scripts/broadcasts/pro-launch-tagoclip.mjs --env .vercel/.env.production.local --segment tagoclip

import { render } from './_pro-launch.mjs'

export default {
  id: 'pro-launch-tagoclip',
  subject: 'TagoClip Pro is out',
  replyTo: 'info@tagobeats.com',
  from: 'Robin from TagoBeats <plugins@robinbusse.dev>',
  render: (email, unsubUrl) => render({
    variant: 'tagoclip',
    intro: ['you\'re using TagoClip, so you\'re the first to hear this: TagoClip Pro is out. Everything you like about TagoClip, on a new engine.'],
    staysFree: 'TagoClip itself stays free, nothing changes there.',
    ps: 'P.S. Questions about the upgrade? Just hit reply.',
  }, unsubUrl),
}
