export interface IndustryPreset {
  id: string;
  name: string;
  nameEn: string;
  icon: string;
  description: string;
  keywords: string[];
  workflow: {
    name: string;
    description: string;
    nodes: Array<{ id: string; type: string; label: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
    edges: Array<{ id: string; source: string; target: string; label?: "true" | "false" }>;
  };
}

export const industryPresets: IndustryPreset[] = [
  {
    id: "ecommerce-order",
    name: "Xử lý đơn hàng",
    nameEn: "E-commerce Order Processing",
    icon: "📦",
    description: "Khi nhận đơn hàng mới: thông báo kho, tạo task đóng gói, nếu đơn lớn thì báo manager",
    keywords: ["don hang", "order", "shopee", "lazada", "tiki", "thuong mai", "ban hang", "ecommerce", "cong ty thuc pham", "cong ty time"],
    workflow: {
      name: "Xu ly don hang moi",
      description: "Webhook don hang → thong bao kho → condition don lon → thong bao manager",
      nodes: [
        { id: "webhook-1", type: "webhook", label: "Nhan don hang moi", position: { x: 0, y: 0 }, data: { method: "POST", url: "https://flowly.vn/api/webhooks/{{token}}" } },
        { id: "slack-1", type: "slack", label: "Thong bao kho", position: { x: 250, y: 0 }, data: { text: "Don hang moi: {{webhook-1.orderId}} - {{webhook-1.customerName}}" } },
        { id: "condition-1", type: "condition", label: "Don lon (> 5 trieu)", position: { x: 500, y: 0 }, data: { expression: "{{webhook-1.total}} > 5000000" } },
        { id: "zalo-1", type: "zalo", label: "Thong bao manager", position: { x: 750, y: -75 }, data: { to: "{{managerUserId}}", content: "Don lon: {{webhook-1.orderId}} - {{webhook-1.total}} VND" } },
        { id: "trello-1", type: "trello", label: "Tao task dong goi", position: { x: 750, y: 75 }, data: { boardId: "", listId: "", action: "create_card", cardTitle: "Dong goi: {{webhook-1.orderId}}" } },
      ],
      edges: [
        { id: "e-1", source: "webhook-1", target: "slack-1" },
        { id: "e-2", source: "slack-1", target: "condition-1" },
        { id: "e-3", source: "condition-1", target: "zalo-1", label: "true" },
        { id: "e-4", source: "condition-1", target: "trello-1", label: "false" },
      ],
    },
  },
  {
    id: "crm-lead",
    name: "Chăm sóc khách hàng",
    nameEn: "CRM Lead Notification",
    icon: "👤",
    description: "Khi có lead mới từ form: gửi email welcome, tạo task sales follow-up, thêm vào Airtable",
    keywords: ["lead", "khach hang", "crm", "form", "dang ky", "signup", "sales", "kinh doanh", "follow up"],
    workflow: {
      name: "Xu ly lead moi",
      description: "Lead moi → email welcome → tao task sales → luu Airtable",
      nodes: [
        { id: "webhook-1", type: "webhook", label: "Nhan lead moi", position: { x: 0, y: 0 }, data: { method: "POST", url: "https://flowly.vn/api/webhooks/{{token}}" } },
        { id: "email-1", type: "email", label: "Email welcome", position: { x: 250, y: 0 }, data: { to: "{{webhook-1.email}}", subject: "Chao muc {{webhook-1.companyName}}", body: "Chao {{webhook-1.name}}, cam on da quan tam..." } },
        { id: "trello-1", type: "trello", label: "Task sales follow-up", position: { x: 500, y: 0 }, data: { boardId: "", listId: "", action: "create_card", cardTitle: "Follow-up: {{webhook-1.name}} ({{webhook-1.companyName}})" } },
        { id: "airtable-1", type: "airtable", label: "Luu vao CRM", position: { x: 750, y: 0 }, data: { baseId: "", tableId: "", action: "create", fields: { Name: "{{webhook-1.name}}", Email: "{{webhook-1.email}}", Company: "{{webhook-1.companyName}}" } } },
      ],
      edges: [
        { id: "e-1", source: "webhook-1", target: "email-1" },
        { id: "e-2", source: "email-1", target: "trello-1" },
        { id: "e-3", source: "trello-1", target: "airtable-1" },
      ],
    },
  },
  {
    id: "logistics-shipment",
    name: "Vận chuyển / Logistics",
    nameEn: "Logistics & Shipment Tracking",
    icon: "🚚",
    description: "Khi hàng đi: gửi SMS tracking cho khách, tạo task kho kiểm tra, cảnh báo nếu trễ",
    keywords: ["van chuyen", "logistics", "shipping", "giao hang", "tracking", "kho", "giao vuon", "giao nhanh", "giao hang"],
    workflow: {
      name: "Theo doi van chuyen",
      description: "Hang di → SMS tracking → task kho → delay → kiem tra giai",
      nodes: [
        { id: "webhook-1", type: "webhook", label: "Hang di", position: { x: 0, y: 0 }, data: { method: "POST", url: "https://flowly.vn/api/webhooks/{{token}}" } },
        { id: "sms-1", type: "sms", label: "SMS tracking", position: { x: 250, y: 0 }, data: { provider: "vnpt", apiKey: "", to: "{{webhook-1.customerPhone}}", content: "Hang {{webhook-1.shippingCode}} da di. Ma tracking: {{webhook-1.trackingNumber}}" } },
        { id: "trello-1", type: "trello", label: "Task kho kiem tra", position: { x: 500, y: 0 }, data: { boardId: "", listId: "", action: "create_card", cardTitle: "Kiem tra hang: {{webhook-1.shippingCode}}" } },
        { id: "delay-1", type: "delay", label: "Choi 24h", position: { x: 750, y: 0 }, data: { seconds: 86400 } },
        { id: "condition-1", type: "condition", label: "Da giao chua?", position: { x: 1000, y: 0 }, data: { expression: "{{webhook-1.status}} === 'delivered'" } },
        { id: "slack-1", type: "slack", label: "Canh bao tre", position: { x: 1250, y: 75 }, data: { text: "⚠️ Hanh {{webhook-1.shippingCode}} tre sau 24h" } },
      ],
      edges: [
        { id: "e-1", source: "webhook-1", target: "sms-1" },
        { id: "e-2", source: "sms-1", target: "trello-1" },
        { id: "e-3", source: "trello-1", target: "delay-1" },
        { id: "e-4", source: "delay-1", target: "condition-1" },
        { id: "e-5", source: "condition-1", target: "slack-1", label: "false" },
      ],
    },
  },
  {
    id: "hr-onboarding",
    name: "Onboarding nhân viên",
    nameEn: "HR Employee Onboarding",
    icon: "🏢",
    description: "Khi có nhân viên mới: gửi email giới thiệu, tạo task IT cấp thiết bị, thêm vào Notion",
    keywords: ["nhan vien", "onboarding", "hr", "tuyen dung", "nhu chuyen", "nhu chuyen", "nhan su", "nhan vien moi"],
    workflow: {
      name: "Onboarding nhan vien moi",
      description: "NV moi → email gioi thieu → task IT → Notion → Slack team",
      nodes: [
        { id: "webhook-1", type: "webhook", label: "NV moi nhap hang", position: { x: 0, y: 0 }, data: { method: "POST", url: "https://flowly.vn/api/webhooks/{{token}}" } },
        { id: "email-1", type: "email", label: "Email gioi thieu", position: { x: 250, y: 0 }, data: { to: "{{webhook-1.email}}", subject: "Chao muc cong ty!", body: "Chao {{webhook-1.name}}, chuc mung gia nhap..." } },
        { id: "trello-1", type: "trello", label: "Task IT cap thiet bi", position: { x: 500, y: 0 }, data: { boardId: "", listId: "", action: "create_card", cardTitle: "Cap thiet bi: {{webhook-1.name}} ({{webhook-1.department}})" } },
        { id: "notion-1", type: "notion", label: "Them vao Notion", position: { x: 750, y: 0 }, data: { action: "create_page", content: "## {{webhook-1.name}}\nBo phan: {{webhook-1.department}}\nNgay vao: {{webhook-1.startDate}}" } },
        { id: "slack-1", type: "slack", label: "Thong bao team", position: { x: 1000, y: 0 }, data: { text: "🎉 {{webhook-1.name}} da gia nhap {{webhook-1.department}}!" } },
      ],
      edges: [
        { id: "e-1", source: "webhook-1", target: "email-1" },
        { id: "e-2", source: "email-1", target: "trello-1" },
        { id: "e-3", source: "trello-1", target: "notion-1" },
        { id: "e-4", source: "notion-1", target: "slack-1" },
      ],
    },
  },
  {
    id: "marketing-campaign",
    name: "Marketing Campaign",
    nameEn: "Marketing Campaign Automation",
    icon: "📣",
    description: "Chạy campaign: gửi email → delay → gửi SMS reminder → track kết quả",
    keywords: ["marketing", "campaign", "khuyen mai", "promotion", "email marketing", "chiến dịch", "chuan bi", "gioi thieu"],
    workflow: {
      name: "Marketing campaign",
      description: "Bắt đầu → email campaign → delay 2h → SMS reminder → Airtable track",
      nodes: [
        { id: "trigger-1", type: "trigger", label: "Bat dau campaign", position: { x: 0, y: 0 }, data: { triggerType: "manual" } },
        { id: "loop-1", type: "loop", label: "Loop qua danh sach", position: { x: 250, y: 0 }, data: { sourceNode: "trigger-1", arrayField: "recipients", maxIterations: 100 } },
        { id: "email-1", type: "email", label: "Goi email", position: { x: 500, y: 0 }, data: { to: "{{loop-1.email}}", subject: "{{campaign.subject}}", body: "{{campaign.body}}" } },
        { id: "delay-1", type: "delay", label: "Choi 2h", position: { x: 750, y: 0 }, data: { seconds: 7200 } },
        { id: "sms-1", type: "sms", label: "SMS reminder", position: { x: 1000, y: 0 }, data: { provider: "vnpt", apiKey: "", to: "{{loop-1.phone}}", content: "Nhac nhô: {{campaign.smsText}}" } },
      ],
      edges: [
        { id: "e-1", source: "trigger-1", target: "loop-1" },
        { id: "e-2", source: "loop-1", target: "email-1" },
        { id: "e-3", source: "email-1", target: "delay-1" },
        { id: "e-4", source: "delay-1", target: "sms-1" },
      ],
    },
  },
  {
    id: "finance-invoice",
    name: "Tài chính / Hóa đơn",
    nameEn: "Finance & Invoice Processing",
    icon: "💰",
    description: "Khi có invoice mới: tạo task kế toán, gửi email cho khách, lưu vào Google Sheets",
    keywords: ["hoa don", "invoice", "tai chinh", "ke toan", "thanh toan", "payment", "thanh toan", "giai chuyen", "giai chuyen"],
    workflow: {
      name: "Xu ly hoa don",
      description: "Invoice moi → task ke toan → email khach → Google Sheets",
      nodes: [
        { id: "webhook-1", type: "webhook", label: "Invoice moi", position: { x: 0, y: 0 }, data: { method: "POST", url: "https://flowly.vn/api/webhooks/{{token}}" } },
        { id: "trello-1", type: "trello", label: "Task ke toan", position: { x: 250, y: 0 }, data: { boardId: "", listId: "", action: "create_card", cardTitle: "Hoa don #{{webhook-1.invoiceNumber}}: {{webhook-1.amount}} VND" } },
        { id: "email-1", type: "email", label: "Email khach hang", position: { x: 500, y: 0 }, data: { to: "{{webhook-1.customerEmail}}", subject: "Hoa don #{{webhook-1.invoiceNumber}}", body: "Kiem tra hoa don {{webhook-1.invoiceNumber}} so tien {{webhook-1.amount}} VND" } },
        { id: "google-1", type: "google", label: "Luu vao Sheets", position: { x: 750, y: 0 }, data: { action: "sheets_append", spreadsheetId: "", range: "Sheet1", values: ["{{webhook-1.invoiceNumber}}", "{{webhook-1.amount}}", "{{webhook-1.date}}"] } },
      ],
      edges: [
        { id: "e-1", source: "webhook-1", target: "trello-1" },
        { id: "e-2", source: "trello-1", target: "email-1" },
        { id: "e-3", source: "email-1", target: "google-1" },
      ],
    },
  },
];

export function findPreset(message: string): IndustryPreset | null {
  const lower = message.toLowerCase();
  for (const preset of industryPresets) {
    if (preset.keywords.some((k) => lower.includes(k))) {
      return preset;
    }
  }
  return null;
}

export function listPresets(): Array<{ id: string; name: string; icon: string; description: string }> {
  return industryPresets.map((p) => ({ id: p.id, name: p.name, icon: p.icon, description: p.description }));
}
