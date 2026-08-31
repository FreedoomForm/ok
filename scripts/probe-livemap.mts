import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const owner = await db.admin.findUniqueOrThrow({ where: { email: 'middle@example.com' }, select: { id: true } })
const target = new Date(Date.now() + 3 * 86400000)
target.setUTCHours(12, 0, 0, 0)
const targetDate = target.toISOString().slice(0, 10)
const customer = await db.customer.create({ data: { name: `Probe Map ${Date.now()}`, phone: `+1777${String(Date.now()).slice(-7)}`, address: 'probe', createdBy: owner.id, isActive: true, autoOrdersEnabled: false, latitude: 41.31, longitude: 69.27 } })
const contract = await db.contract.create({ data: { customerId: customer.id, ownerAdminId: owner.id, status: 'ENABLED', periods: { create: { startDate: new Date(Date.now() + 86400000), endDate: new Date(Date.now() + 10 * 86400000), status: 'ENABLED', enabledWeekdays: ['SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY'], disabledDates: [] } } }, select: { id: true } })
const order = await db.order.create({ data: { orderNumber: 891000000 + Math.floor(Math.random() * 100000), customerId: customer.id, adminId: owner.id, orderStatus: 'NEW', deliveryAddress: 'probe 41.31 69.27', deliveryDate: target, latitude: 41.31, longitude: 69.27 } })
console.log('fixture:', { customerId: customer.id, contractId: contract.id, orderId: order.id, targetDate })

// login via credentials to get a session cookie
const login = await fetch('http://localhost:3000/api/auth/callback/credentials', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ email: 'middle@example.com', password: 'test-password' }),
  redirect: 'manual',
})
const cookies = login.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ')
console.log('login status:', login.status)

const getOrders = async () => {
  const r = await fetch(`http://localhost:3000/api/admin/live-map?date=${targetDate}`, { headers: { cookie: cookies } })
  const body = await r.json()
  return (body.orders ?? []).filter((row: { id: string }) => row.id === order.id).length
}
console.log('before override:', await getOrders())
const override = await db.resourceAvailability.create({ data: { resourceType: 'CONTRACT', resourceId: contract.id, date: target, state: 'DISABLED', reason: 'probe' } })
console.log('after override:', await getOrders())
await db.resourceAvailability.delete({ where: { id: override.id } })
console.log('after restore:', await getOrders())

// inspect what the route's helper would see
const rows = await db.resourceAvailability.findMany({ where: { resourceType: 'CONTRACT', resourceId: contract.id, state: 'DISABLED' } })
console.log('override rows visible in db:', rows.length, rows.map((r) => r.date.toISOString()))
await db.order.delete({ where: { id: order.id } })
await db.contract.delete({ where: { id: contract.id } })
await db.customer.delete({ where: { id: customer.id } })
await db.$disconnect()
