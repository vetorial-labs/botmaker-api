#!/usr/bin/env node
/**
 * Probe ao vivo da API Botmaker v2.
 * Token: BOTMAKER_ACCESS_TOKEN (nunca logar / nunca commitar).
 *
 *   BOTMAKER_ACCESS_TOKEN=... node scripts/live-probe.mjs
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createBotmakerClient, BotmakerApiError } from "../dist/index.js";
import { createChats } from "../dist/chats/index.js";
import { createNotifications } from "../dist/notifications/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportDir = resolve(root, "reports");

const VALID_PHONES = (process.env.LIVE_PHONES ?? "5511999999999,5511888888888")
  .split(",")
  .map((s) => s.replace(/\D/g, ""))
  .filter(Boolean);
const INVALID_PHONE = (process.env.LIVE_INVALID_PHONE ?? "5511900000000").replace(
  /\D/g,
  "",
);

function maskPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "(curto)";
  return `***${digits.slice(-4)}`;
}

function summarize(value, depth = 0) {
  if (value == null) return value;
  if (typeof value !== "object") return value;
  if (Array.isArray(value)) {
    return {
      length: value.length,
      sample: value.slice(0, 3).map((item) => summarize(item, depth + 1)),
    };
  }
  if (depth > 2) return Object.keys(value);
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (/(token|authorization|secret)/i.test(key)) continue;
    if (/(phone|contact|number|msisdn)/i.test(key) && typeof item === "string") {
      out[key] = maskPhone(item);
    } else {
      out[key] = summarize(item, depth + 1);
    }
  }
  return out;
}

async function step(name, fn) {
  const started = Date.now();
  try {
    const data = await fn();
    return { name, ok: true, ms: Date.now() - started, data };
  } catch (err) {
    const payload = {
      name,
      ok: false,
      ms: Date.now() - started,
      error:
        err instanceof BotmakerApiError
          ? { status: err.status, url: err.url.replace(/access-token=[^&]+/g, "access-token=***"), body: err.body.slice(0, 800) }
          : { message: err instanceof Error ? err.message : String(err) },
    };
    return payload;
  }
}

function pickWhatsappChannel(channels) {
  const items = Array.isArray(channels) ? channels : (channels?.items ?? []);
  const wa = items.find((ch) => {
    const platform = String(ch.platform ?? ch.channelPlatform ?? "").toLowerCase();
    const id = String(ch.id ?? ch.channelId ?? "");
    return platform.includes("whatsapp") || id.toLowerCase().includes("whatsapp");
  });
  return wa ?? items[0] ?? null;
}

function pickApprovedTemplate(templates) {
  const items = templates?.items ?? (Array.isArray(templates) ? templates : []);
  const approved = items.filter((t) => t.state === "APPROVED");
  const scored = approved
    .map((t) => {
      const body = t.body?.text ?? "";
      const vars = body.match(/\{\{[^}]+\}\}/g) ?? [];
      return { t, vars: vars.length };
    })
    .sort((a, b) => a.vars - b.vars);
  return scored[0]?.t ?? approved[0] ?? items[0] ?? null;
}

async function followPages(request, first, { maxPages = 3, itemsKey = "items", query } = {}) {
  const pages = [];
  const collected = [];
  let url = first;
  let page = 0;
  while (url && page < maxPages) {
    const payload = page === 0 && query
      ? await request("GET", first, { query })
      : await request("GET", url);
    pages.push({
      page: page + 1,
      keys: payload && typeof payload === "object" ? Object.keys(payload) : [],
      itemCount: Array.isArray(payload?.[itemsKey]) ? payload[itemsKey].length : 0,
      hasNext: Boolean(payload?.nextPage),
    });
    if (Array.isArray(payload?.[itemsKey])) collected.push(...payload[itemsKey]);
    url = payload?.nextPage || null;
    page += 1;
  }
  return { pages, count: collected.length, items: collected, stoppedBecauseMaxPages: Boolean(url) };
}

const api = createBotmakerClient({
  accessToken: process.env.BOTMAKER_ACCESS_TOKEN,
  sleep: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 3000))),
});
const chats = createChats({ api });
const notifications = createNotifications({
  api: {
    ...api,
    sleep: (ms) => new Promise((r) => setTimeout(r, Math.min(ms, 2500))),
  },
});

const report = {
  startedAt: new Date().toISOString(),
  phones: VALID_PHONES.map(maskPhone),
  invalid: maskPhone(INVALID_PHONE),
  steps: [],
};

async function main() {
  if (!process.env.BOTMAKER_ACCESS_TOKEN) {
    throw new Error("BOTMAKER_ACCESS_TOKEN ausente");
  }

  const channelsStep = await step("GET /channels?platform=whatsapp", () =>
    api.request("GET", "/channels", { query: { platform: "whatsapp", active: true } }),
  );
  report.steps.push({ ...channelsStep, data: summarize(channelsStep.data) });
  const channel = pickWhatsappChannel(channelsStep.data);
  const channelId = channel?.id ?? channel?.channelId ?? channel?.number ?? null;
  report.channel = summarize(channel);

  const accountsStep = await step("GET /whatsapp/accounts", () =>
    api.request("GET", "/whatsapp/accounts"),
  );
  report.steps.push({ ...accountsStep, data: summarize(accountsStep.data) });
  const wabaNumber =
    accountsStep.data?.items?.[0]?.number ??
    channel?.number ??
    (typeof channelId === "string" && /^\d+$/.test(channelId) ? channelId : null);

  const templatesStep = await step("GET /whatsapp/templates APPROVED", () =>
    api.request("GET", "/whatsapp/templates", { query: { state: "APPROVED" } }),
  );
  const template = pickApprovedTemplate(templatesStep.data);
  report.steps.push({
    ...templatesStep,
    data: {
      count: templatesStep.data?.items?.length ?? 0,
      picked: template
        ? { name: template.name, state: template.state, body: template.body?.text?.slice(0, 180) }
        : null,
    },
  });

  if (wabaNumber) {
    report.steps.push(
      await step(`GET /whatsapp/accounts/${maskPhone(wabaNumber)}/status`, () =>
        api.request("GET", `/whatsapp/accounts/${encodeURIComponent(wabaNumber)}/status`),
      ).then((s) => ({ ...s, data: summarize(s.data) })),
    );
  }

  report.steps.push(
    await step(`GET /whatsapp/accounts/${maskPhone(INVALID_PHONE)}/status (invalido)`, () =>
      api.request("GET", `/whatsapp/accounts/${encodeURIComponent(INVALID_PHONE)}/status`),
    ).then((s) => ({ ...s, data: s.data ?? s.error })),
  );

  for (const phone of VALID_PHONES) {
    report.steps.push(
      await step(`GET /chats contact ${maskPhone(phone)}`, async () => {
        const rows = await chats.listChats({
          channelId: String(channelId ?? ""),
          contactId: phone,
        });
        return { count: rows.length, sample: summarize(rows[0]) };
      }),
    );

    report.steps.push(
      await step(`GET /messages paginado ${maskPhone(phone)}`, async () => {
        const from = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
        const page = await followPages(api.request.bind(api), "/messages", {
          maxPages: 3,
          query: {
            "channel-id": channelId,
            "contact-id": phone,
            from,
            limit: 50,
          },
        });
        return {
          pages: page.pages,
          count: page.count,
          sample: summarize(page.items[0]),
        };
      }),
    );
  }

  const fromSessions = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
  report.steps.push(
    await step("GET /sessions paginado + eventos", async () => {
      const page = await followPages(api.request.bind(api), "/sessions", {
        maxPages: 2,
        query: {
          from: fromSessions,
          "include-open-sessions": true,
          "include-events": true,
        },
      });
      const withEvents = page.items.filter((s) => Array.isArray(s.events) && s.events.length > 0);
      return {
        pages: page.pages,
        count: page.count,
        sessionsWithEvents: withEvents.length,
        eventSample: summarize(withEvents[0]?.events?.[0] ?? page.items[0]?.events?.[0]),
        sessionSample: {
          id: page.items[0]?.id,
          creationTime: page.items[0]?.creationTime,
          eventCount: page.items[0]?.events?.length ?? 0,
        },
      };
    }),
  );

  for (const phone of VALID_PHONES) {
    report.steps.push(
      await step(`POST send-messages ${maskPhone(phone)}`, () =>
        chats.sendMessages({
          chat: { channelId: String(channelId), contactId: phone },
          messages: [
            {
              text: `probe ${new Date().toISOString()}`,
            },
          ],
        }),
      ).then((s) => ({ ...s, data: summarize(s.data) ?? s.error })),
    );
  }

  const campaignName = `labs-live-${stamp.slice(0, 19)}`;
  const notificationName = `labs-notif-${stamp.slice(0, 19)}`;
  report.campaignName = campaignName;
  report.notificationName = notificationName;
  report.templateName = template?.name ?? null;

  report.steps.push(
    await step("POST /notifications/campaigns", () =>
      notifications.createCampaign({
        name: campaignName,
        goal: "live probe",
      }),
    ).then((s) => ({ ...s, data: s.data ?? null })),
  );

  const contacts = [
    ...VALID_PHONES.map((contactId) => ({
      contactId,
      variables: { nome: "Test" },
      webhookPayload: JSON.stringify({ probe: "valid", contactId: maskPhone(contactId) }),
    })),
    {
      contactId: INVALID_PHONE,
      variables: { nome: "Invalido" },
      webhookPayload: JSON.stringify({ probe: "invalid" }),
    },
  ];

  if (!channelId || !template?.name) {
    report.steps.push({
      name: "POST /notifications",
      ok: false,
      error: { message: `faltou channelId=${channelId} ou template=${template?.name}` },
    });
  } else {
    report.steps.push(
      await step("POST /notifications (2 validos + 1 invalido)", () =>
        notifications.sendNotification({
          campaign: campaignName,
          channelId: String(channelId),
          name: notificationName,
          intentIdOrName: template.name,
          contacts,
        }),
      ).then((s) => ({ ...s, data: s.data ?? s.error })),
    );
  }

  const waits = [8000, 15000, 20000];
  for (const wait of waits) {
    await new Promise((r) => setTimeout(r, wait === waits[0] ? wait : 5000));
    const listed = await step(`GET sent-results name=${notificationName}`, () =>
      notifications.listSentResults({ notificationName }),
    );
    report.steps.push({
      ...listed,
      data: {
        count: listed.data?.length ?? 0,
        items: (listed.data ?? []).slice(0, 3).map((row) => ({
          notificationInstanceId: row.notificationInstanceId,
          notificationName: row.notificationName,
          status: row.status,
          details: row.details,
          start: row.start,
          end: row.end,
        })),
      },
    });

    const instanceId =
      listed.data?.[0]?.notificationInstanceId ?? notificationName;
    const detail = await step(`GET sent-results/${instanceId} individual`, () =>
      notifications.getSentResult(instanceId),
    );
    report.steps.push({
      ...detail,
      data: {
        notification: summarize(detail.data?.notification),
        customerCount: detail.data?.customers?.length ?? 0,
        customers: (detail.data?.customers ?? []).map((c) => ({
          contact: maskPhone(c.contactId ?? c.customerId),
          customerId: c.customerId,
          status: c.status ?? c.notificationStatus ?? c.state,
          keys: Object.keys(c),
          raw: summarize(c),
        })),
      },
    });

    const statuses = (detail.data?.customers ?? []).map(
      (c) => c.status ?? c.notificationStatus ?? c.state,
    );
    if (statuses.length >= 3 || (listed.data?.[0]?.details && wait !== waits[0])) {
      break;
    }
  }

  report.finishedAt = new Date().toISOString();
  mkdirSync(reportDir, { recursive: true });
  const outFile = resolve(reportDir, `live-probe-${stamp}.json`);
  writeFileSync(outFile, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ outFile, ok: report.steps.filter((s) => s.ok).length, fail: report.steps.filter((s) => !s.ok).length, steps: report.steps.map((s) => ({ name: s.name, ok: s.ok, ms: s.ms, error: s.error, data: s.data })) }, null, 2));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
