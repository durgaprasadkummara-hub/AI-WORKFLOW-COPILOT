import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const definitions = [
    {
      key: "stripe.payment_received",
      name: "Stripe Payment Received",
      category: "Trigger",
      description: "Fires when Stripe receives a new successful payment.",
      inputs: { currency: "string", amount: "number", customerEmail: "string" },
      outputs: { paymentId: "string", amount: "number", currency: "string", customerEmail: "string" },
    },
    {
      key: "slack.send_message",
      name: "Slack Send Message",
      category: "Action",
      description: "Send a message to a Slack channel.",
      inputs: { channel: "string", text: "string" },
      outputs: { messageTs: "string", channel: "string" },
    },
    {
      key: "msteams.send_message",
      name: "Microsoft Teams Send Message",
      category: "Action",
      description: "Send a message to a Microsoft Teams channel.",
      inputs: { teamId: "string", channelId: "string", text: "string" },
      outputs: { messageId: "string", delivered: "boolean" },
    },
    {
      key: "filter.amount_greater_than",
      name: "Amount Filter",
      category: "Filter",
      description: "Allow workflow execution only when a numeric field exceeds a threshold.",
      inputs: { field: "string", operator: "string", value: "number" },
      outputs: { passed: "boolean" },
    },
  ];

  for (const definition of definitions) {
    await prisma.nodeDefinition.upsert({
      where: { key: definition.key },
      create: {
        ...definition,
        inputs: JSON.stringify(definition.inputs),
        outputs: JSON.stringify(definition.outputs),
      },
      update: {
        ...definition,
        inputs: JSON.stringify(definition.inputs),
        outputs: JSON.stringify(definition.outputs),
      },
    });
  }

  console.log(`Seeded ${definitions.length} node definitions.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
