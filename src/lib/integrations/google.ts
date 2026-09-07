import type { IntegrationProvider, IntegrationContext, IntegrationResult, ConfigField } from "./types";

const configSchema: ConfigField[] = [
  { key: "action", label: "Action", type: "select", required: true, options: [
    { value: "gmail_send", label: "Gmail: Gửi email" },
    { value: "calendar_create", label: "Calendar: Tạo event" },
    { value: "sheets_append", label: "Sheets: Thêm row" },
    { value: "drive_upload", label: "Drive: Upload file" },
  ] },
  { key: "clientId", label: "OAuth Client ID", type: "text", required: true },
  { key: "clientSecret", label: "OAuth Client Secret", type: "password", required: true },
  { key: "accessToken", label: "Access Token", type: "password", required: true, help: "Lấy từ OAuth flow hoặc service account" },
  { key: "to", label: "To (email)", type: "text", required: false },
  { key: "subject", label: "Subject", type: "text", required: false },
  { key: "body", label: "Body", type: "textarea", required: false },
  { key: "calendarId", label: "Calendar ID", type: "text", required: false, default: "primary" },
  { key: "eventTitle", label: "Event Title", type: "text", required: false },
  { key: "eventStart", label: "Event Start (ISO)", type: "text", required: false },
  { key: "eventEnd", label: "Event End (ISO)", type: "text", required: false },
  { key: "spreadsheetId", label: "Spreadsheet ID", type: "text", required: false },
  { key: "sheetName", label: "Sheet Name", type: "text", required: false, default: "Sheet1" },
  { key: "rowValues", label: "Row Values (comma-separated)", type: "text", required: false },
  { key: "driveParentId", label: "Drive Folder ID", type: "text", required: false },
  { key: "fileName", label: "File Name", type: "text", required: false },
  { key: "fileContent", label: "File Content", type: "textarea", required: false },
];

export const googleProvider: IntegrationProvider = {
  id: "google",
  name: "Google Workspace",
  icon: "📧",
  description: "Gmail, Calendar, Sheets, Drive",
  category: "productivity",
  authType: "oauth2",
  configSchema,

  async execute(ctx: IntegrationContext): Promise<IntegrationResult> {
    const cfg = ctx.config;
    const token = cfg.accessToken;
    const action = cfg.action;

    if (!token) return { success: false, error: "Thiếu Google Access Token", retryable: false };

    const auth = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    try {
      switch (action) {
        case "gmail_send": {
          if (!cfg.to) return { success: false, error: "Thiếu 'To' email", retryable: false };
          const payload = {
            to: cfg.to,
            subject: cfg.subject ?? "No subject",
            body: cfg.body ?? "",
          };
          // Gmail API v1: users.messages.send
          const b64 = Buffer.from(
            `To: ${cfg.to}\nSubject: ${payload.subject}\nContent-Type: text/plain; charset=utf-8\n\n${payload.body}`
          ).toString("base64");
          const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
            method: "POST",
            headers: auth,
            body: JSON.stringify({ raw: b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") }),
          });
          if (!res.ok) {
            const err = await res.text();
            return { success: false, error: `Gmail ${res.status}: ${err.slice(0, 200)}`, retryable: res.status >= 500 };
          }
          return { success: true, data: { sent: true, to: cfg.to } };
        }

        case "calendar_create": {
          if (!cfg.eventTitle) return { success: false, error: "Thiếu event title", retryable: false };
          const start = cfg.eventStart ?? new Date().toISOString();
          const end = cfg.eventEnd ?? new Date(Date.now() + 3600_000).toISOString();
          const calId = cfg.calendarId ?? "primary";
          const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${calId}/events`, {
            method: "POST",
            headers: auth,
            body: JSON.stringify({ summary: cfg.eventTitle, start: { dateTime: start }, end: { dateTime: end }, description: cfg.body }),
          });
          if (!res.ok) {
            const err = await res.text();
            return { success: false, error: `Calendar ${res.status}: ${err.slice(0, 200)}`, retryable: res.status >= 500 };
          }
          const data = await res.json();
          return { success: true, data: { eventId: data.id, sent: true } };
        }

        case "sheets_append": {
          if (!cfg.spreadsheetId) return { success: false, error: "Thiếu Spreadsheet ID", retryable: false };
          const sheet = cfg.sheetName ?? "Sheet1";
          const values = (cfg.rowValues ?? "").split(",").map((v: string) => v.trim());
          const range = `${sheet}!A1`;
          const res = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${cfg.spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
            { method: "POST", headers: auth, body: JSON.stringify({ values: [values] }) }
          );
          if (!res.ok) {
            const err = await res.text();
            return { success: false, error: `Sheets ${res.status}: ${err.slice(0, 200)}`, retryable: res.status >= 500 };
          }
          const data = await res.json();
          return { success: true, data: { updatedRange: data.updates?.updatedRange, sent: true } };
        }

        case "drive_upload": {
          if (!cfg.fileName || !cfg.fileContent) return { success: false, error: "Thiếu file name hoặc content", retryable: false };
          const parent = cfg.driveParentId ?? "root";
          const res = await fetch(
            `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&parents=${parent}`,
            {
              method: "POST",
              headers: { ...auth, "Content-Type": "multipart/related; boundary=d" },
              body: `--d\nContent-Type: application/json\n\n{"name":"${cfg.fileName}","mimeType":"text/plain"}\n--d\nContent-Type: text/plain\n\n${cfg.fileContent}\n--d--`,
            }
          );
          if (!res.ok) {
            const err = await res.text();
            return { success: false, error: `Drive ${res.status}: ${err.slice(0, 200)}`, retryable: res.status >= 500 };
          }
          const data = await res.json();
          return { success: true, data: { fileId: data.id, url: data.webContentLink, sent: true } };
        }

        default:
          return { success: false, error: `Action '${action}' chưa hỗ trợ`, retryable: false };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { success: false, error: msg, retryable: /timeout|ECONN|fetch|network/i.test(msg) };
    }
  },
};