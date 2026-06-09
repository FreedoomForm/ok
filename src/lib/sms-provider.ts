export type SmsSendResult = {
  ok: boolean
  provider: string
  messageId?: string
  error?: string
}

function normalizePhone(phone: string) {
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) {
    return `+${trimmed.slice(1).replace(/\D/g, '')}`
  }
  return `+${trimmed.replace(/\D/g, '')}`
}

async function sendWithTextbelt(phone: string, message: string): Promise<SmsSendResult> {
  const key = process.env.TEXTBELT_API_KEY || 'textbelt'
  const payload = new URLSearchParams({
    phone,
    message,
    key,
  })

  const response = await fetch('https://textbelt.com/text', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
    },
    body: payload.toString(),
  })

  const data = (await response.json().catch(() => null)) as
    | { success?: boolean; textId?: string; error?: string }
    | null

  if (!response.ok || !data?.success) {
    return {
      ok: false,
      provider: 'textbelt',
      error: data?.error || 'Textbelt request failed',
    }
  }

  return {
    ok: true,
    provider: 'textbelt',
    messageId: data.textId,
  }
}

async function sendWithCustomApi(phone: string, message: string): Promise<SmsSendResult> {
  const url = process.env.SMS_API_URL
  if (!url) {
    return {
      ok: false,
      provider: 'custom',
      error: 'SMS_API_URL is not set',
    }
  }

  const token = process.env.SMS_API_TOKEN

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ phone, message }),
  })

  const data = (await response.json().catch(() => null)) as
    | { success?: boolean; id?: string; error?: string }
    | null

  if (!response.ok || data?.success === false) {
    return {
      ok: false,
      provider: 'custom',
      error: data?.error || 'Custom SMS API request failed',
    }
  }

  return {
    ok: true,
    provider: 'custom',
    messageId: data?.id,
  }
}

async function sendWithInfobip(phone: string, message: string): Promise<SmsSendResult> {
  const baseUrl = process.env.INFOBIP_BASE_URL
  const apiKey = process.env.INFOBIP_API_KEY
  const sender = process.env.INFOBIP_SENDER || 'InfoSMS'

  if (!baseUrl || !apiKey) {
    return {
      ok: false,
      provider: 'infobip',
      error: 'INFOBIP_BASE_URL or INFOBIP_API_KEY is not set',
    }
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, '')}/sms/3/messages`, {
    method: 'POST',
    headers: {
      Authorization: `App ${apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      messages: [
        {
          destinations: [{ to: phone }],
          from: sender,
          text: message,
        },
      ],
    }),
  })

  const data = (await response.json().catch(() => null)) as
    | { messages?: Array<{ messageId?: string }>; requestError?: { serviceException?: { text?: string } } }
    | null

  if (!response.ok) {
    return {
      ok: false,
      provider: 'infobip',
      error: data?.requestError?.serviceException?.text || 'Infobip request failed',
    }
  }

  return {
    ok: true,
    provider: 'infobip',
    messageId: data?.messages?.[0]?.messageId,
  }
}

export async function sendOtpSms(phoneInput: string, code: string): Promise<SmsSendResult> {
  const phone = normalizePhone(phoneInput)
  const message = `AutoFood OTP: ${code}. Valid for 5 minutes.`
  const provider = (process.env.SMS_PROVIDER || 'console').toLowerCase()

  if (provider === 'textbelt') {
    return sendWithTextbelt(phone, message)
  }

  if (provider === 'custom') {
    return sendWithCustomApi(phone, message)
  }

  if (provider === 'infobip') {
    return sendWithInfobip(phone, message)
  }

  console.info(`[SMS:console] ${phone} <- ${message}`)
  return {
    ok: true,
    provider: 'console',
    messageId: `console-${Date.now()}`,
  }
}
