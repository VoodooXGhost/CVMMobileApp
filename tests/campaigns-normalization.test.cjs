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

const {
  normalizeCampaignFeed,
  normalizeCampaignItem,
  normalizeCustomerOffers,
  performCampaignUssdHandoff,
} = campaignModule.exports;

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

test('recognizes lifecycle state leaked through the legacy category field', () => {
  const feed = normalizeCampaignFeed({
    campaigns: [{ id: 'legacy-scheduled', title: 'Future promo', category: 'scheduled' }],
  });

  assert.deepEqual(feed.campaigns, []);
});

test('does not treat a canonical active status as overriding a scheduled category', () => {
  const feed = normalizeCampaignFeed({
    campaigns: [{ id: 'conflicting-state', status: 'active', category: 'scheduled' }],
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

test('keeps deactivated money and loyalty rewards out of customer offers', () => {
  const offers = normalizeCustomerOffers([
    { id: 'bundle', title: 'Data bundle', status: 'active', category: 'data' },
    { id: 'momo', title: 'MoMo Cash Reward MZN 50', status: 'active', category: 'rewards' },
    { id: 'loyalty', title: 'Weekly Bonus', status: 'running', reward_type: 'YelloMola' },
  ]);

  assert.deepEqual(offers.map((offer) => offer.id), ['bundle']);
});

test('retains eligibility evidence instead of labeling every campaign available', () => {
  const feed = normalizeCampaignFeed({
    campaigns: [
      { id: 'eligible', status: 'active', is_eligible: true },
      { id: 'not-eligible', status: 'running', eligibility: 'Subscriber is not part of the target segment' },
      { id: 'unknown', status: 'live' },
    ],
  });

  assert.deepEqual(feed.campaigns.map((campaign) => campaign.customer_eligible), [true, null]);
});

test('filters CVM campaigns explicitly marked ineligible in a nested eligibility object', () => {
  const feed = normalizeCampaignFeed({
    campaigns: [
      {
        id: 'ineligible',
        status: 'running',
        category: 'retention',
        eligibility: {
          status: 'ineligible',
          is_eligible: false,
          message: 'Subscriber is not part of the target segment',
        },
      },
      { id: 'eligible', status: 'running', eligibility: { status: 'eligible', is_eligible: true, message: 'Eligible' } },
    ],
  });

  assert.deepEqual(feed.campaigns.map((campaign) => campaign.id), ['eligible']);
  assert.equal(feed.campaigns[0].customer_eligible, true);
});

test('fails closed on the current UAT feed records until CVM supplies active state', () => {
  const campaigns = normalizeCampaignFeed({
    campaigns: [
      { id: 'netgiro', title: 'NetGiro 100MT Unlimited Upsell', category: 'scheduled', eligibility: { status: 'unavailable' } },
      { id: 'audit', title: 'Data Protection Audit', category: 'retention', eligibility: { status: 'ineligible', is_eligible: false } },
    ],
  });
  const offers = normalizeCustomerOffers([
    { id: 'data', title: 'TMcel Super Data 10GB', category: 'lifestyle' },
    { id: 'momo', title: 'MoMo Cash Reward MZN 50', category: 'lifestyle' },
  ]);

  assert.deepEqual(campaigns.campaigns, []);
  assert.deepEqual(offers, []);
});

test('exposes a USSD CTA only when CVM explicitly marks it safe and eligible', () => {
  const safe = normalizeCampaignItem({
    id: 81,
    status: 'active',
    visible_to_mobile: true,
    eligibility: { status: 'eligible', is_eligible: true },
    customer_action_enabled: true,
    customer_action: {
      enabled: true,
      customer_safe: true,
      type: 'ussd',
      label: 'Continue via Tmcel',
      payload: { ussd_code: '*123#' },
    },
  });
  const inferred = normalizeCampaignItem({
    id: 82,
    status: 'active',
    primary_channel: 'ussd',
    action_type: 'ussd',
    action_payload: { ussd_code: '*456#' },
  });

  assert.equal(safe.customer_action_enabled, true);
  assert.equal(safe.action_type, 'ussd');
  assert.equal(inferred.customer_action_enabled, false);
});

test('does not surface legacy purchase metadata as an in-app payment CTA', () => {
  const item = normalizeCampaignItem({
    id: 83,
    status: 'active',
    customer_action_enabled: true,
    customer_action: {
      enabled: true,
      type: 'purchase',
      payload: { packageRef: 'DATA-1', amount: 20, allowedPaymentProviders: ['emola'] },
    },
  });

  assert.equal(item.customer_action_enabled, false);
  assert.equal(item.action_type, 'none');
  assert.equal(item.cta_label, 'View Details');
  assert.deepEqual(item.action_payload, {});
});

test('records confirmed attempt before opening USSD and then marks handoff requested', async () => {
  const item = normalizeCampaignItem({
    id: 81,
    status: 'active',
    visible_to_mobile: true,
    eligibility: { status: 'eligible', is_eligible: true },
    customer_action_enabled: true,
    customer_action: {
      enabled: true,
      customer_safe: true,
      type: 'ussd',
      payload: { ussd_code: '*123#' },
    },
  });
  const calls = [];
  const result = await performCampaignUssdHandoff(item, {
    createAttempt: async (body) => {
      calls.push(['record', body]);
      return { data: { attempt_id: 'attempt-1' } };
    },
    openURL: async (uri) => calls.push(['open', uri]),
    updateAttempt: async (_attemptId, body) => calls.push(['status', body]),
    idempotencyKey: 'test-action-key',
  });

  assert.deepEqual(calls.map(([name]) => name), ['record', 'open', 'status']);
  assert.equal(calls[0][1].campaign_id, 81);
  assert.equal(calls[1][1], 'tel:*123%23');
  assert.equal(calls[2][1].status, 'handoff_requested');
  assert.equal(result.outcome, 'unknown');
});

test('does not open USSD when the attempt record fails and records handoff failure', async () => {
  const item = normalizeCampaignItem({
    id: 81,
    status: 'active',
    visible_to_mobile: true,
    eligibility: { status: 'eligible', is_eligible: true },
    customer_action_enabled: true,
    customer_action: { enabled: true, customer_safe: true, type: 'ussd', payload: { ussd_code: '*123#' } },
  });
  const opened = [];

  await assert.rejects(
    performCampaignUssdHandoff(item, {
      createAttempt: async () => { throw new Error('CVM unavailable'); },
      openURL: async (uri) => opened.push(uri),
      updateAttempt: async () => {},
      idempotencyKey: 'test-action-key',
    }),
    /CVM unavailable/,
  );
  assert.deepEqual(opened, []);
});

test('records failed OS handoff without claiming purchase success', async () => {
  const item = normalizeCampaignItem({
    id: 81,
    status: 'active',
    visible_to_mobile: true,
    eligibility: { status: 'eligible', is_eligible: true },
    customer_action_enabled: true,
    customer_action: { enabled: true, customer_safe: true, type: 'ussd', payload: { ussd_code: '*123#' } },
  });
  const statuses = [];

  await assert.rejects(
    performCampaignUssdHandoff(item, {
      createAttempt: async () => ({ data: { attempt_id: 'attempt-2' } }),
      openURL: async () => { throw new Error('No phone app'); },
      updateAttempt: async (_attemptId, body) => statuses.push(body.status),
      idempotencyKey: 'test-action-key-2',
    }),
    /No phone app/,
  );
  assert.deepEqual(statuses, ['handoff_failed']);
});
