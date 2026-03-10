// const FIELD_ID = process.env.MANAGER_FIELD_ID;
// const TOKEN = process.env.SLACK_USER_TOKEN;

// const setField = async (uid, value) => {
//   const r = await fetch('https://slack.com/api/users.profile.set', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json; charset=utf-8',
//       'Authorization': `Bearer ${TOKEN}`,
//     },
//     body: JSON.stringify({
//       user: uid,
//       name: FIELD_ID,
//       value,
//     }),
//   });
//   const data = await r.json();
//   if (!data.ok) console.error('[manager] profile.set failed:', data);
//   return data;
// };

export default {
  name: 'manager',
  async execute({ respond }) {
    return respond({ response_type: 'ephemeral', text: ':dog_ded: This command still needs higher permission levels...' });
  },
};
