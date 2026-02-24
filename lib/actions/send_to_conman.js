export default {
  actionId: 'send_to_conman',

  async execute({ ack, body, client, logger }) {
    await ack();

    const context = JSON.parse(body.actions[0].value);

    // todo: send context to conman API once it's ready
    console.log('Send to Conman context:', context);
  },
};
