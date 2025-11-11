// Mock data for testing frontend design without backend

export const mockUser = {
  id: "user_123456",
  email: "demo@seelecloud.com",
  username: "演示用户",
  balance: 15.5,
  transfer_enable: 107374182400, // 100GB in bytes
  u: 32212254720, // 30GB uploaded
  d: 53687091200, // 50GB downloaded
  expired_at: "2025-12-31T23:59:59.000Z",
  invite_code: "DEMO2024",
}

export const mockAuthResponse = {
  token: "mock_jwt_token_123456789",
  user: mockUser,
}

export const mockDashboardStats = {
  upload: 32212254720, // 30GB
  download: 53687091200, // 50GB
  total_transfer: 107374182400, // 100GB
  used_transfer: 85899345920, // 80GB
  remaining_transfer: 21474836480, // 20GB
  subscription_expire: "2025-12-31T23:59:59.000Z",
  active_subscriptions: 2,
  invite_count: 8,
  commission_balance: 128.5,
}

export const mockPlans = [
  {
    id: "plan_1",
    name: "入门版",
    description: "适合轻度使用用户",
    price: 19.99,
    transfer: 107374182400, // 100GB
    speed_limit: 100, // Mbps
    device_limit: 2,
    features: ["100GB 月流量", "100Mbps 速度", "2台设备同时在线", "标准客服支持"],
    is_popular: false,
  },
  {
    id: "plan_2",
    name: "标准版",
    description: "最受欢迎的选择",
    price: 39.99,
    transfer: 322122547200, // 300GB
    speed_limit: 300,
    device_limit: 5,
    features: ["300GB 月流量", "300Mbps 速度", "5台设备同时在线", "优先客服支持", "Netflix解锁"],
    is_popular: true,
  },
  {
    id: "plan_3",
    name: "高级版",
    description: "无限制的畅享体验",
    price: 79.99,
    transfer: -1, // Unlimited
    speed_limit: 1000,
    device_limit: 10,
    features: ["不限流量", "1Gbps 速度", "10台设备同时在线", "24/7 VIP客服", "全部流媒体解锁", "IPLC专线"],
    is_popular: false,
  },
]

export const mockOrders = [
  {
    id: "order_001",
    plan_name: "标准版",
    amount: 39.99,
    status: "completed",
    created_at: "2024-12-01T10:30:00.000Z",
    paid_at: "2024-12-01T10:32:15.000Z",
  },
  {
    id: "order_002",
    plan_name: "入门版",
    amount: 19.99,
    status: "completed",
    created_at: "2024-11-01T14:20:00.000Z",
    paid_at: "2024-11-01T14:25:30.000Z",
  },
  {
    id: "order_003",
    plan_name: "标准版",
    amount: 39.99,
    status: "pending",
    created_at: "2025-01-10T09:15:00.000Z",
    paid_at: null,
  },
]

export const mockOrderDetail = {
  trade_no: "order_003",
  plan_id: 2,
  plan: {
    id: 2,
    name: "标准版",
    transfer_enable: 322122547200,
    speed_limit: 300,
    device_limit: 5,
    content: "300GB 月流量 · 极速专线 · Netflix 解锁",
  },
  total_amount: 3999,
  handling_amount: 0,
  balance_amount: 0,
  discount_amount: 0,
  period: "month_price",
  status: 0,
  created_at: "2025-01-10T09:15:00.000Z",
  paid_at: null,
}

export const mockPaymentMethods = [
  {
    id: 1,
    name: "测试收款",
    payment: "MockPay",
    icon: "",
    handling_fee_fixed: 0,
    handling_fee_percent: 0,
  },
  {
    id: 2,
    name: "二维码支付",
    payment: "MockQr",
    icon: "",
    handling_fee_fixed: 0,
    handling_fee_percent: 0,
  },
]

export const mockCheckoutResult = {
  type: 0,
  data: "https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=mock-payment",
}

export const mockNodes = [
  {
    id: "node_1",
    name: "香港 IPLC 01",
    location: "香港",
    region: "HK",
    status: "online",
    load: 25,
    latency: 15,
    type: "IPLC",
  },
  {
    id: "node_2",
    name: "日本 东京 01",
    location: "日本",
    region: "JP",
    status: "online",
    load: 45,
    latency: 28,
    type: "BGP",
  },
  {
    id: "node_3",
    name: "美国 洛杉矶 01",
    location: "美国",
    region: "US",
    status: "online",
    load: 60,
    latency: 180,
    type: "BGP",
  },
  {
    id: "node_4",
    name: "新加坡 01",
    location: "新加坡",
    region: "SG",
    status: "online",
    load: 35,
    latency: 42,
    type: "IPLC",
  },
  {
    id: "node_5",
    name: "台湾 01",
    location: "台湾",
    region: "TW",
    status: "online",
    load: 80,
    latency: 35,
    type: "BGP",
  },
  {
    id: "node_6",
    name: "韩国 首尔 01",
    location: "韩国",
    region: "KR",
    status: "maintenance",
    load: 0,
    latency: 0,
    type: "IPLC",
  },
]

export const mockInvites = {
  stat: [12, 128500, 2350, 20, 65800],
  codes: [
    {
      code: "DEMO2024",
      status: 0,
      created_at: "2024-11-15T10:20:00.000Z",
    },
    {
      code: "DEMO2025",
      status: 1,
      created_at: "2024-11-20T14:35:00.000Z",
    },
    {
      code: "DEMO2026",
      status: 0,
      created_at: "2024-12-01T09:10:00.000Z",
    },
    {
      code: "DEMO2027",
      status: 0,
      created_at: "2024-12-05T16:45:00.000Z",
    },
  ],
}

export const mockTickets = [
  {
    id: "ticket_001",
    subject: "无法连接到香港节点",
    status: "open",
    priority: "high",
    created_at: "2025-01-09T10:30:00.000Z",
    updated_at: "2025-01-09T14:20:00.000Z",
    unread_count: 1,
  },
  {
    id: "ticket_002",
    subject: "续费优惠咨询",
    status: "replied",
    priority: "normal",
    created_at: "2025-01-08T15:45:00.000Z",
    updated_at: "2025-01-08T16:30:00.000Z",
    unread_count: 0,
  },
  {
    id: "ticket_003",
    subject: "Netflix无法解锁",
    status: "closed",
    priority: "normal",
    created_at: "2025-01-05T09:15:00.000Z",
    updated_at: "2025-01-06T11:20:00.000Z",
    unread_count: 0,
  },
]

export const mockTicketDetail = {
  id: "ticket_001",
  subject: "无法连接到香港节点",
  status: "open",
  priority: "high",
  created_at: "2025-01-09T10:30:00.000Z",
  updated_at: "2025-01-09T14:20:00.000Z",
  messages: [
    {
      id: "msg_1",
      content: "您好，我在使用香港 IPLC 01节点时无法连接，显示连接超时。其他节点都正常。请帮忙查看一下，谢谢！",
      sender: "user",
      created_at: "2025-01-09T10:30:00.000Z",
    },
    {
      id: "msg_2",
      content:
        "您好，我们已经收到您的问题反馈。经过检查，香港 IPLC 01节点运行正常。请尝试以下操作：\n\n1. 重启您的客户端应用\n2. 更新订阅链接\n3. 检查本地防火墙设置\n\n如果问题依然存在，请提供您的客户端日志，我们将进一步协助您。",
      sender: "admin",
      created_at: "2025-01-09T11:15:00.000Z",
    },
    {
      id: "msg_3",
      content: "按照您的建议更新订阅后，问题已经解决了。非常感谢您的帮助！",
      sender: "user",
      created_at: "2025-01-09T14:20:00.000Z",
    },
  ],
}

export const mockTrafficLog = {
  summary: {
    today_upload: 1073741824, // 1GB
    today_download: 3221225472, // 3GB
    month_upload: 10737418240, // 10GB
    month_download: 32212254720, // 30GB
  },
  logs: [
    {
      id: "log_1",
      date: "2025-01-10",
      upload: 536870912, // 512MB
      download: 1610612736, // 1.5GB
      total: 2147483648, // 2GB
    },
    {
      id: "log_2",
      date: "2025-01-09",
      upload: 1073741824, // 1GB
      download: 3221225472, // 3GB
      total: 4294967296, // 4GB
    },
    {
      id: "log_3",
      date: "2025-01-08",
      upload: 805306368, // 768MB
      download: 2684354560, // 2.5GB
      total: 3489660928, // 3.25GB
    },
    {
      id: "log_4",
      date: "2025-01-07",
      upload: 1610612736, // 1.5GB
      download: 4294967296, // 4GB
      total: 5905580032, // 5.5GB
    },
    {
      id: "log_5",
      date: "2025-01-06",
      upload: 2147483648, // 2GB
      download: 5368709120, // 5GB
      total: 7516192768, // 7GB
    },
  ],
}

export const mockSubscriptionInfo = {
  token: "mock-token-123",
  subscribe_url: "https://panel.seelecloud.com/api/v1/client/subscribe?token=mock-token-123",
  plan: {
    id: "plan_2",
    name: "标准版",
    transfer_enable: 322122547200, // 300GB
    speed_limit: 300,
    device_limit: 5,
    features: ["Netflix 解锁", "支持 5 台设备", "高可用 IPLC 节点"],
  },
  u: 53687091200, // 50GB
  d: 32212254720, // 30GB
  transfer_enable: 322122547200,
  expired_at: "2025-12-31T23:59:59.000Z",
  reset_day: 1,
  next_reset_at: "2025-02-01T00:00:00.000Z",
  last_reset_at: "2025-01-01T00:00:00.000Z",
  remarks: "月底自动结算，请及时续费。",
}

export const mockSessions = [
  {
    id: "session_1",
    device: "MacBook Pro",
    ip: "103.21.45.11",
    location: "香港",
    user_agent: "Clash for macOS 0.20.30",
    last_active_at: "2025-01-10T12:30:00.000Z",
  },
  {
    id: "session_2",
    device: "iPhone 15 Pro",
    ip: "42.10.88.3",
    location: "上海",
    user_agent: "Shadowrocket iOS 2.2.27",
    last_active_at: "2025-01-10T08:12:00.000Z",
  },
  {
    id: "session_3",
    device: "Windows PC",
    ip: "8.8.8.8",
    location: "洛杉矶",
    user_agent: "Clash for Windows 0.20.39",
    last_active_at: "2025-01-09T19:05:00.000Z",
  },
]

export const mockNotices = [
  {
    id: "notice_001",
    title: "春节期间服务安排",
    content:
      "春节假期期间客服在线时间为 10:00-22:00，节点将保持 24 小时监控，如有问题请提交工单。",
    category: "公告",
    created_at: "2025-01-08T10:00:00.000Z",
    pinned: true,
  },
  {
    id: "notice_002",
    title: "香港 IPLC 节点扩容完成",
    content: "已新增两条独享链路，现已全面开放，请在节点列表中选择使用。",
    category: "网络",
    created_at: "2025-01-05T15:30:00.000Z",
    pinned: false,
  },
  {
    id: "notice_003",
    title: "客户端更新提醒",
    content: "建议 Windows 用户升级至最新 Clash for Windows 版本以获得更好的兼容性。",
    category: "更新",
    created_at: "2024-12-28T09:15:00.000Z",
    pinned: false,
  },
]

export const mockKnowledgeBase = [
  {
    category: "客户端配置",
    articles: [
      {
        id: "kb_1",
        title: "Windows - Clash for Windows 配置指南",
        summary: "下载、导入订阅链接、切换节点的详细步骤。",
        updated_at: "2025-01-02T11:00:00.000Z",
      },
      {
        id: "kb_2",
        title: "iOS - Shadowrocket 快速上手",
        summary: "如何在 App Store 下载、配置证书并启用分流。",
        updated_at: "2024-12-20T08:00:00.000Z",
      },
    ],
  },
  {
    category: "常见问题",
    articles: [
      {
        id: "kb_3",
        title: "节点延迟高的排查方法",
        summary: "从本地网络、设备负载、线路三方面定位问题。",
        updated_at: "2024-12-15T13:30:00.000Z",
      },
      {
        id: "kb_4",
        title: "如何绑定 Telegram Bot 获取推送",
        summary: "通过面板内的绑定操作获取验证码并完成绑定。",
        updated_at: "2024-11-30T07:45:00.000Z",
      },
    ],
  },
]

export const mockGiftCardHistory = {
  data: [
    {
      id: "gift_1",
      template_name: "元旦福利",
      template_type_name: "流量加赠",
      rewards_given: "额外 100GB 流量",
      created_at: "2025-01-01T10:00:00.000Z",
    },
    {
      id: "gift_2",
      template_name: "充值返现",
      template_type_name: "余额返利",
      rewards_given: "返现 ¥20.00",
      created_at: "2024-12-12T12:00:00.000Z",
    },
  ],
  pagination: {
    current_page: 1,
    last_page: 1,
    total: 2,
  },
}

export const mockGiftCardPreview = {
  code_info: {
    template_name: "新春限定礼包",
    expire_at: "2025-02-28T23:59:59.000Z",
    remaining: 128,
  },
  reward_preview: {
    traffic: "额外 200GB",
    balance: "¥20 余额",
    bonus_days: 7,
  },
  can_redeem: true,
  reason: null,
}

export const mockGiftCardRedeemResult = {
  message: "兑换成功！奖励已发放至您的账户",
  rewards: {
    balance: "¥20",
    traffic: "200GB",
    bonus_days: 7,
  },
  template_name: "新春限定礼包",
}
