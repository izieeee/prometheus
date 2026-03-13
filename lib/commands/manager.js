const FIELD_ID = process.env.MANAGER_FIELD_ID;
const TOKEN = process.env.SLACK_USER_TOKEN;

const slackApi = async (method, params, extraHeaders = {}) => {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    body.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  const r = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Bearer ${TOKEN}`,
      ...extraHeaders,
    },
    body,
  });
  const data = await r.json();
  const warnings = [];
  if (data.warning) warnings.push(data.warning);
  if (Array.isArray(data.warnings)) warnings.push(...data.warnings);
  else if (data.warnings) warnings.push(data.warnings);
  if (Array.isArray(data.response_metadata?.warnings)) warnings.push(...data.response_metadata.warnings);
  return { data, warnings };
};

const pull = async (uid) => {
  const { data, warnings } = await slackApi('users.profile.get', { user: uid });
  if (!data.ok) throw new Error(data.error || 'unknown_error');
  if (warnings.length) console.warn(`[manager] users.profile.get warnings: ${warnings.join(', ')}`);
  const value = data.profile?.fields?.[FIELD_ID]?.value || '';
  return value.split(',').map((v) => v.trim()).filter(Boolean);
};

const updateManagers = async (uid, managers) => {
  const profile = { fields: { [FIELD_ID]: { value: managers.join(','), alt: '' } } };
  return slackApi('users.profile.set', { user: uid, profile }, { 'X-Slack-User': uid });
};

const sameSet = (a, b) => {
  const na = [...new Set(a)].sort();
  const nb = [...new Set(b)].sort();
  return na.length === nb.length && na.every((v, i) => v === nb[i]);
};

export default {
  name: 'manager',
  async execute({ command: cmd, args, respond }) {
    const err = (t) => respond({ response_type: 'ephemeral', text: t });
    if (!FIELD_ID) return err(':red-x: MANAGER_FIELD_ID is not set.');
    if (!TOKEN) return err(':red-x: SLACK_USER_TOKEN is not set.');
    const [action, target] = args;

    switch (action) {
      case 'add': {
        if (!target) return err(':red-x: Usage: `/pro manager add @manager`');
        const mid = target.replace(/[<@>]/g, '').split('|')[0];
        let current;
        try { current = await pull(cmd.user_id); }
        catch (e) { return err(`:red-x: Slack error: ${e.message}`); }
        if (current.includes(mid)) return err(`:red-x: <@${mid}> is already your manager?`);
        const next = [...current, mid];
        const { data, warnings } = await updateManagers(cmd.user_id, next);
        if (!data.ok) return err(`:red-x: Slack error: ${data.error}`);
        if (warnings.length) return err(`:dead: Slack warning: ${warnings.join(', ')}`);
        try {
          const after = await pull(cmd.user_id);
          if (!sameSet(after, next)) {
            return err(':dead: Slack accepted the update but the field did not change for some stupid reason. Working on it!');
          }
        } catch (e) { return err(`:red-x: Slack error: ${e.message}`); }
        return respond({ response_type: 'ephemeral', text: `:okay-1: Added <@${mid}> as your manager.` });
      }
      case 'remove': {
        if (!target) return err(':red-x: Usage: `/pro manager remove @manager`');
        const mid = target.replace(/[<@>]/g, '').split('|')[0];
        let current;
        try { current = await pull(cmd.user_id); }
        catch (e) { return err(`:red-x: Slack error: ${e.message}`); }
        if (!current.includes(mid)) return err(`:red-x: <@${mid}> is not your manager.`);
        const updated = current.filter((m) => m !== mid);
        const { data, warnings } = await updateManagers(cmd.user_id, updated);
        if (!data.ok) return err(`:red-x: Slack error: ${data.error}`);
        if (warnings.length) return err(`:dead: Slack warning: ${warnings.join(', ')}`);
        try {
          const after = await pull(cmd.user_id);
          if (!sameSet(after, updated)) {
            return err(':dead: Slack accepted the update but the field did not change for some stupid reason. Working on it!');
          }
        } catch (e) { return err(`:red-x: Slack error: ${e.message}`); }
        return respond({ response_type: 'ephemeral', text: `:okay-1: Removed <@${mid}> as your manager.` });
      }
      default:
        return err(':red-x: Usage: `/pro manager [add|remove] [@manager]`');
    }
  },
};
