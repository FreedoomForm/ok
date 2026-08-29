import { test, expect } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'

// Addendum §3.2/§4: universal Trash and restore-plus must affect EVERY selected
// row, not only the first selection element. This regression multi-selects two
// ingredients, confirms universal Trash, then restores both through the
// universal Plus command in trash mode while the selection must survive.
test('universal trash and restore apply to every selected ingredient row', async ({ page }, testInfo) => {
  const db = new PrismaClient()
  const nonce = randomUUID().slice(0, 8)
  const nameA = `Browser multi trash A ${nonce}`
  const nameB = `Browser multi trash B ${nonce}`
  let idA: string | undefined
  let idB: string | undefined
  try {
    const itemA = await db.warehouseItem.create({ data: { name: nameA, amount: 5, unit: 'kg', kcalPerGram: 1, pricePerUnit: 100, priceUnit: 'kg', isActive: true } })
    const itemB = await db.warehouseItem.create({ data: { name: nameB, amount: 7, unit: 'kg', kcalPerGram: 2, pricePerUnit: 200, priceUnit: 'kg', isActive: true } })
    idA = itemA.id
    idB = itemB.id

    await page.goto('/login')
    await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
    await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
    await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
    await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)

    await page.locator('[data-reference-page="ingredients"]').click()
    await expect(page.locator('[data-reference-resource-row="ingredients"]').first()).toBeVisible()

    const rowA = page.locator(`[data-reference-resource-row="ingredients"][data-resource-id="${idA}"]`)
    const rowB = page.locator(`[data-reference-resource-row="ingredients"][data-resource-id="${idB}"]`)
    await rowA.getByRole('checkbox').check()
    await rowB.getByRole('checkbox').check()
    await expect(rowA.getByRole('checkbox')).toBeChecked()
    await expect(rowB.getByRole('checkbox')).toBeChecked()

    // Arm the key and enter trash mode, then confirm the universal Trash.
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="trash"]').click()
    const deleteA = page.waitForResponse((response) => response.request().method() === 'DELETE' && response.url().includes(`ingredients?id=${encodeURIComponent(idA!)}`) && response.ok())
    const deleteB = page.waitForResponse((response) => response.request().method() === 'DELETE' && response.url().includes(`ingredients?id=${encodeURIComponent(idB!)}`) && response.ok())
    await page.getByRole('button', { name: 'Подтвердить', exact: true }).click()
    await Promise.all([deleteA, deleteB])
    await expect(page.getByText(/Операция выполнена|Amal bajarildi/i).first()).toBeVisible()

    const trashedA = await db.warehouseItem.findUnique({ where: { id: idA! }, select: { deletedAt: true } })
    const trashedB = await db.warehouseItem.findUnique({ where: { id: idB! }, select: { deletedAt: true } })
    expect(trashedA?.deletedAt).not.toBeNull()
    expect(trashedB?.deletedAt).not.toBeNull()

    // Re-enter trash mode: soft-deleted rows must be visible and selectable.
    await page.locator('[data-reference-command="key"]').click()
    await page.locator('[data-reference-command="trash"]').click()
    const deletedRowA = page.locator(`[data-reference-resource-row="ingredients"][data-resource-id="${idA}"]`)
    const deletedRowB = page.locator(`[data-reference-resource-row="ingredients"][data-resource-id="${idB}"]`)
    await expect(deletedRowA).toBeVisible()
    await expect(deletedRowB).toBeVisible()
    await deletedRowA.getByRole('checkbox').check()
    await deletedRowB.getByRole('checkbox').check()

    // Universal Plus inside trash mode restores the whole selection and keeps it.
    const restoreA = page.waitForResponse((response) => response.request().method() === 'PATCH' && (response.request().postData() ?? '').includes(`"id":"${idA}"`) && response.ok())
    const restoreB = page.waitForResponse((response) => response.request().method() === 'PATCH' && (response.request().postData() ?? '').includes(`"id":"${idB}"`) && response.ok())
    await page.locator('[data-reference-command="create"]').click()
    const restoreBodies = await Promise.all([restoreA, restoreB])
    const restoredIds = await Promise.all(restoreBodies.map(async (response) => ((await response.json()) as { id: string }).id))
    expect(restoredIds).toContain(idA)
    expect(restoredIds).toContain(idB)
    await expect(page.getByText(/Операция выполнена|Amal bajarildi/i).first()).toBeVisible()

    const keptA = await db.warehouseItem.findUnique({ where: { id: idA! }, select: { deletedAt: true, isActive: true } })
    const keptB = await db.warehouseItem.findUnique({ where: { id: idB! }, select: { deletedAt: true, isActive: true } })
    expect(keptA?.deletedAt).toBeNull()
    expect(keptB?.deletedAt).toBeNull()
    expect(keptA?.isActive).toBe(true)
    expect(keptB?.isActive).toBe(true)

    // §3.2: Plus restores without clearing the selection — the Clear action must
    // still be offered because the workspace selection keeps both restored ids.
    await expect(page.getByRole('button', { name: 'Очистить', exact: true })).toBeEnabled()
  } finally {
    await db.warehouseItem.deleteMany({ where: { OR: [{ id: idA ?? '' }, { id: idB ?? '' }, { name: { in: [nameA, nameB] } }] } })
    await db.$disconnect()
    void testInfo
  }
})
