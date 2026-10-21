import { withSqlSession } from './databricks-data.js';

const ALERT_TYPES = {
  Code: 'secret_scan',
  Compute: 'long_failing_jobs',
};

const TEAMS_TABLE = 'eng_data_platform.ani.miq_teams';
const TEAM_MEMBERS_TABLE = 'eng_data_platform.ani.miq_team_members';
const CODE_FINDINGS_TABLE = 'eng_data_platform.ani.accountability_code_findings';
const FAILING_JOBS_TABLE = 'eng_data_platform.ani.long_failing_jobs_inventory';

const SECRETS_DASHBOARD = 'https://miqdigital-eng-data-platform.cloud.databricks.com/dashboardsv3/01f1867c63011ed4846d6982e8c0f538/published?o=7474652344258407';

function hostOf(env) {
  return String(env.DATABRICKS_SERVER_HOSTNAME || env.DATABRICKS_HOST || '').replace(/^https?:\/\//, '');
}

function sqlString(value) {
  return `'${String(value ?? '').replaceAll("'", "''")}'`;
}

function sqlTable(name) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*(\.[A-Za-z_][A-Za-z0-9_]*){0,2}$/.test(name)) {
    throw new Error('Invalid alert source table');
  }
  return name;
}

function secretCount(row) {
  const parsed = Number(row?.secrets_count);
  return Number.isFinite(parsed) ? parsed : 0;
}

function verdict(rank, secrets, notebooks) {
  if (rank === 1) return 'Secrets Champion 👑 The crown is heavy — please evict them.';
  if (rank === 2) return 'The Archivist 📚 Classified library vibes.';
  if (rank === 3) return 'The Novelist 🙈 Too many notebooks, too many secrets.';
  if (secrets === 0 && notebooks === 0) return 'Clean slate ✨';
  return 'Review Needed 👀 Dashboard knows what you did.';
}

function mention(uid, email) {
  return uid ? `<@${uid}>` : `*${email}*`;
}

export function secretLeaderboardBlocks(entries, team) {
  const medal = { 1: '🥇', 2: '🥈', 3: '🥉' };
  const rows = ['*Rank* | *Member* | *Notebooks · Secrets* | *Verdict*', '---|---|---|---'];
  for (const entry of entries) {
    const rank = entry.rank;
    rows.push(`${medal[rank] || rank} ${rank} | ${mention(entry.slackUid, entry.owner)} | ${entry.notebooks} · ${entry.secrets} | ${verdict(rank, entry.secrets, entry.notebooks)}`);
  }
  return [
    { type: 'header', text: { type: 'plain_text', text: `🔐 Secret Scan · ${team}`, emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: `🚨 *The ${team} Hardcoded Secrets Leaderboard* 🔐\nRanking of *${entries.length}* flagged member(s). Who can drop off fastest?` } },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: rows.join('\n') } },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: `🛠️ *Action Items:*\n• 📊 <${SECRETS_DASHBOARD}|Secrets Dashboard> — find exact notebook locations\n• Scrub hardcoded credentials; use secret scopes\n• Rotate/revoke any exposed credentials\n\nDrop a ✅ when your workspace is clean.` } },
  ];
}

export function cleanTeamBlocks(team) {
  return [
    { type: 'header', text: { type: 'plain_text', text: `🚨 Secret Scan · ${team} — ZERO SECRETS FOUND`, emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: `🏆 *STOP SCROLLING. YES, YOU READ THAT RIGHT.* 🏆\n\nThe *${team}* team just pulled off a *flawless zero* on the secrets scan. Not a single hardcoded credential. Not one API key in a corner. Nothing. Nada. 🛡️\n\n_While other teams are nervously checking their leaderboard rankings, you're out here living your best secret-free life._ 😎` } },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: `🛡️ *Status:* Fort Knox called — they want tips.\n📊 *Secrets found:* 0 — yes, really.\n🧹 *Action required:* Absolutely nothing. Go grab a coffee. ☕\n\n_Keep it up, ${team}. The security team sleeps better because of you._ 😴` } },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: `📊 <${SECRETS_DASHBOARD}|Secrets Dashboard> — proof of your clean streak\nDrop a 🎉 to flex on the other teams.` } },
  ];
}

export function longFailingBlocks(rec, uid) {
  const job = rec.job_name || String(rec.job_id);
  const failures = Number(rec.failures_in_last_10_runs) || 0;
  const total = Number(rec.total_last_10_runs) || 10;
  const jobUrl = rec.job_url || '';
  const jobLabel = jobUrl ? `<${jobUrl}|${job}>` : job;
  const runAs = rec.run_as_email || 'N/A';
  let vibe = '🤔 The last 5 runs have all failed. Might want to take a look before it gets worse.';
  let severity = '🚨 FAILING';
  if (failures >= 10) {
    vibe = "🔥 This job has been failing *every single run*. It's not a job anymore — it's a donation to Databricks.";
    severity = '💸 MONEY FURNACE';
  } else if (failures >= 8) {
    vibe = "😬 This job fails more often than it succeeds. It's basically paying rent for compute it never uses.";
    severity = '💩 SERIAL OFFENDER';
  } else if (failures >= 6) {
    vibe = '👀 More than half the runs are failing. At this point the cluster spins up just to crash.';
    severity = '⚠️ NEEDS ATTENTION';
  }
  return [
    { type: 'header', text: { type: 'plain_text', text: '🚨 Your Job Is Burning Money', emoji: true } },
    { type: 'section', text: { type: 'mrkdwn', text: `Hey ${mention(uid, runAs)} — your scheduled job *${jobLabel}* has failed *${failures} out of ${total}* recent runs.\n\n${vibe}\n\n_Every failed run still burns compute. Fix it, pause it, or delete it — but please stop feeding the cloud bill._ 🙏` } },
    { type: 'section', fields: [
      { type: 'mrkdwn', text: `*📋 Job*\n${jobLabel}` },
      { type: 'mrkdwn', text: `*🏢 Workspace*\n${rec.workspace || ''}` },
      { type: 'mrkdwn', text: `*💥 Failures*\n${failures}/${total} runs` },
      { type: 'mrkdwn', text: `*🚨 Severity*\n${severity}` },
      { type: 'mrkdwn', text: `*👤 Owner*\n${rec.owner_email || 'N/A'}` },
      { type: 'mrkdwn', text: `*🎭 Run As*\n${runAs}` },
      { type: 'mrkdwn', text: `*⏰ Schedule*\n${rec.trigger_type || 'N/A'}` },
      { type: 'mrkdwn', text: `*📅 Last Failure*\n${String(rec.last_failure_time || 'N/A').slice(0, 19)}` },
    ] },
    { type: 'divider' },
    { type: 'section', text: { type: 'mrkdwn', text: `*What to do (pick one, any one):*\n• 🔧 ${jobUrl ? `<${jobUrl}|Open the job>` : 'Open the job'} — check the logs, find the bug, be the hero\n• ⏸️ *Pause the schedule* — if you're not ready to fix it yet, at least stop the bleeding\n• 🗑️ *Delete it* — if nobody needs this job anymore, let it go\n\n_💰 Remember: every failed run = wasted compute = wasted money. The finance team sends their regards._ 💸` } },
  ];
}

function rankSecretRows(rows) {
  const byOwner = new Map();
  for (const row of rows) {
    const owner = String(row.owner || '').trim();
    if (!owner) continue;
    const current = byOwner.get(owner) ?? { secrets: 0, notebooks: 0 };
    if (row.secret_count != null && row.nb_count != null) {
      current.secrets += secretCount({ secrets_count: row.secret_count });
      current.notebooks += Number(row.nb_count) || 0;
    } else {
      current.secrets += secretCount(row);
      current.notebooks += 1;
    }
    byOwner.set(owner, current);
  }
  return [...byOwner.entries()]
    .sort((a, b) => b[1].secrets - a[1].secrets || b[1].notebooks - a[1].notebooks || a[0].localeCompare(b[0]))
    .map(([owner, counts], index) => ({ owner, rank: index + 1, secrets: counts.secrets, notebooks: counts.notebooks }));
}

function alertTypeOf(input) {
  const alertType = ALERT_TYPES[input?.pillar];
  if (!alertType) throw new Error(`The notifier has no alert for the ${input?.pillar} pillar`);
  if (!input?.teamId) throw new Error('A team is required to send an alert');
  if (Array.isArray(input.channels) && !input.channels.some(channel => String(channel).toLowerCase() === 'slack')) {
    throw new Error('Choose Slack. This alert posts to the team Slack channel.');
  }
  return alertType;
}

async function servicePrincipalToken(env) {
  const host = hostOf(env);
  const response = await fetch(`https://${host}/oidc/v1/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${env.DATABRICKS_CLIENT_ID}:${env.DATABRICKS_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'all-apis' }),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error_description || 'Unable to authenticate the app');
  return body.access_token;
}

async function slackToken(env, accessToken) {
  if (env.SLACK_BOT_TOKEN) return env.SLACK_BOT_TOKEN;
  const host = hostOf(env);
  const scope = env.SLACK_SECRET_SCOPE || 'flexible_job';
  const key = env.SLACK_SECRET_KEY || 'slack_bot_token';
  const bearers = [];
  if (accessToken) bearers.push(accessToken);
  if (env.DATABRICKS_CLIENT_ID && env.DATABRICKS_CLIENT_SECRET) bearers.push(await servicePrincipalToken(env));
  if (!bearers.length) throw new Error('Slack bot token is not configured');
  let lastError = `Unable to read Slack secret ${scope}/${key}`;
  for (const bearer of bearers) {
    const response = await fetch(`https://${host}/api/2.0/secrets/get?scope=${encodeURIComponent(scope)}&key=${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${bearer}` },
    });
    const body = await response.json().catch(() => ({}));
    if (response.ok && body.value) return Buffer.from(body.value, 'base64').toString('utf8');
    lastError = body.message || `Unable to read Slack secret ${scope}/${key} (${response.status})`;
  }
  throw new Error(lastError);
}

async function slackApi(token, method, { json, params } = {}) {
  const headers = { Authorization: `Bearer ${token}` };
  const response = json
    ? await fetch(`https://slack.com/api/${method}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(json),
      signal: AbortSignal.timeout(15000),
    })
    : await fetch(`https://slack.com/api/${method}?${new URLSearchParams(params || {})}`, {
      headers,
      signal: AbortSignal.timeout(15000),
    });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(`Slack ${method}: ${data.error || response.status}`);
  return data;
}

async function slackUserId(call, email) {
  if (!email) return null;
  try {
    const data = await call('users.lookupByEmail', { params: { email } });
    return data.user?.id || null;
  } catch {
    return null;
  }
}

async function postMessage(call, channel, blocks, fallback) {
  await call('chat.postMessage', { json: { channel, blocks, text: fallback } });
}

async function deliverAlert(input, env, options = {}) {
  const alertType = alertTypeOf(input);
  const query = async sql => {
    if (options.query) return options.query(sql);
    return withSqlSession(env, run => run(sql), options.accessToken);
  };

  const teams = await query(`SELECT team_name, slack_channel_id, slack_channel_name FROM ${TEAMS_TABLE} WHERE team_id = ${sqlString(input.teamId)} AND is_active = true`);
  if (!teams.length) throw new Error(`No active team ${input.teamId} in ${TEAMS_TABLE}`);
  const team = teams[0];
  const teamName = String(team.team_name || input.teamId).trim();
  const channel = String(team.slack_channel_id || '').trim()
    || (team.slack_channel_name ? `#${String(team.slack_channel_name).replace(/^#/, '')}` : '');
  if (!channel) throw new Error(`Team ${input.teamId} has no Slack channel`);

  const members = await query(`SELECT member_email FROM ${TEAM_MEMBERS_TABLE} WHERE team_id = ${sqlString(input.teamId)} AND is_active = true`);
  const emails = members.map(row => String(row.member_email || '').trim()).filter(Boolean);
  if (!emails.length) throw new Error(`No active members for team ${input.teamId}`);

  const sourceTable = env[`ALERT_SOURCE_TABLE_${input.pillar.toUpperCase()}`];
  let messages;
  if (alertType === 'secret_scan') {
    const rows = sourceTable
      ? await query(`SELECT workspace_name, owner, COALESCE(secrets_count, size(COALESCE(secrets_details, array())), 0) AS secrets_count FROM ${sqlTable(sourceTable)} WHERE COALESCE(secrets_count, size(COALESCE(secrets_details, array())), 0) > 0 AND owner IN (${emails.map(sqlString).join(', ')})`)
      : await query(`SELECT owner, COUNT(DISTINCT COALESCE(NULLIF(notebook_path, ''), CAST(notebook_id AS STRING))) AS nb_count, COUNT(*) AS secret_count FROM ${CODE_FINDINGS_TABLE} WHERE team_id = ${sqlString(input.teamId)} AND owner IS NOT NULL AND TRIM(owner) <> '' GROUP BY owner`);
    const ranked = rankSecretRows(rows);
    messages = ranked.length
      ? [{ blocks: null, ranked, fallback: `🚨 ${teamName} Secrets Leaderboard — ${ranked.length} members` }]
      : [{ blocks: cleanTeamBlocks(teamName), fallback: `🎉 ${teamName} — Zero secrets! Your notebooks are squeaky clean.` }];
  } else {
    const table = sqlTable(sourceTable || FAILING_JOBS_TABLE);
    const rows = await query(`SELECT workspace, job_id, job_name, owner_email, run_as_email, failures_in_last_10_runs, total_last_10_runs, job_url, CAST(last_failure_time AS STRING) AS last_failure_time, trigger_type FROM ${table} WHERE status = 'failing' AND run_as_email IN (${emails.map(sqlString).join(', ')}) ORDER BY failures_in_last_10_runs DESC, workspace ASC`);
    if (!rows.length) throw new Error(`No failing jobs to notify for ${teamName}`);
    messages = rows.map(row => ({
      row,
      fallback: `Long failing job: ${row.job_name || row.job_id} (${row.workspace || ''})`,
    }));
  }

  return { channel, teamName, messages };
}

async function postAlert({ channel, teamName, messages }, env, options) {
  const token = options.slackCall ? null : await slackToken(env, options.accessToken);
  const call = options.slackCall || ((method, request) => slackApi(token, method, request));
  let sent = 0;
  const errors = [];
  for (const message of messages) {
    try {
      let blocks = message.blocks;
      if (message.ranked) {
        const entries = [];
        for (const entry of message.ranked) entries.push({ ...entry, slackUid: await slackUserId(call, entry.owner) });
        blocks = secretLeaderboardBlocks(entries, teamName);
      } else if (message.row) {
        const email = message.row.run_as_email || message.row.owner_email || '';
        blocks = longFailingBlocks(message.row, await slackUserId(call, email));
      }
      await postMessage(call, channel, blocks, message.fallback);
      sent += 1;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unable to post the Slack alert');
    }
  }
  if (!sent) throw new Error(errors[0] || 'Unable to post the Slack alert');
  return {
    sent,
    channel,
    summary: sent === 1 ? `Posted to ${teamName} on Slack` : `Posted ${sent} alerts to ${teamName} on Slack`,
  };
}

export async function triggerAlert(input, env = process.env, options = {}) {
  const loaded = options.query
    ? await deliverAlert(input, env, options)
    : await withSqlSession(env, query => deliverAlert(input, env, { ...options, query }), options.accessToken);
  return postAlert(loaded, env, options);
}
