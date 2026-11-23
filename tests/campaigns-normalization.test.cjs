const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const typescript = require('typescript');

const campaignSource = fs.readFileSync(
  path.join(__dirname, '../src/services/campaigns.ts'),
  'utf8',
);
const compiled = typescript.transpileModule(campaignSource, {
  compilerOptions: {
    module: typescript.ModuleKind.CommonJS,
    target: typescript.ScriptTarget.ES2020,
  },
}).outputText;
const campaignModule = { exports: {} };
const mockRequire = (moduleName) => {
  if (moduleName === 'react-native') {
    return { Alert: { alert() {} }, Linking: {}, Platform: { OS: 'test' } };
  }
  if (moduleName === './storage') {
    return { platformStorage: {} };
  }
  return require(moduleName);
};
new Function('require', 'exports', 'module', compiled)(
  mockRequire,
  campaignModule.exports,
  campaignModule,
);

const { normalizeCampaignFeed, normalizeCustomerOffers } = campaignModule.exports;

test('does not treat a workflow type of scheduled as an active campaign', () => {
  const feed = normalizeCampaignFeed({
    campaigns: [{ id: 'scheduled-1', title: 'Future promo', type: 'scheduled' }],
  });

  assert.deepEqual(feed.campaigns, []);
});

test('does not show a campaign without an explicit active lifecycle state', () => {
  const feed = normalizeCampaignFeed({
    campaigns: [{ id: 'retention-1', title: 'Retention campaign', type: 'retention' }],
  });

  assert.deepEqual(feed.campaigns, []);
});

test('keeps active campaigns and does not expose lifecycle labels as categories', () => {
  const feed = normalizeCampaignFeed({
    campaigns: [
      { id: 'active-1', title: 'Current promo', status: 'active', type: 'active' },
      { id: 'running-1', title: 'Running promo', status: 'running', type: 'retention' },
    ],
  });

  assert.equal(feed.campaigns.length, 2);
  assert.equal(feed.campaigns[0].category, 'Campaign');
  assert.equal(feed.campaigns[1].category, 'retention');
});

test('filters non-live and expired offers before normalizing customer cards', () => {
  const offers = normalizeCustomerOffers([
    { id: 'live', title: 'Live data offer', status: 'running', category: 'data' },
    { id: 'scheduled', title: 'Upcoming offer', status: 'scheduled' },
    { id: 'hidden', title: 'Internal offer', visible_to_mobile: false },
    { id: 'expired', title: 'Expired offer', expires_at: '2020-01-01T00:00:00Z' },
  ]);

  assert.deepEqual(offers.map((offer) => offer.id), ['live']);
  assert.equal(offers[0].title, 'Live data offer');
});

test('retains eligibility evidence instead of labeling every campaign available', () => {
  const feed = normalizeCampaignFeed({
    campaigns: [
      { id: 'eligible', status: 'active', is_eligible: true },
      { id: 'not-eligible', status: 'running', eligibility: 'Subscriber is not part of the target segment' },
      { id: 'unknown', status: 'live' },
    ],
  });

  assert.deepEqual(feed.campaigns.map((campaign) => campaign.customer_eligible), [true, false, null]);
});
