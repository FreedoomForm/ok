import { expect, test } from '@playwright/test'

type VisualAudit = {
  heavyShadows: string[]
  glass: string[]
  threeD: string[]
  gradients: string[]
  h1Count: number
}

// §14 visual acceptance: main light theme keeps flat paper surfaces on the
// high-traffic resource screens — no heavy shadows, glass, 3D transforms,
// decorative gradients or duplicated headers. Overlay chrome (dialogs, menus,
// popovers, toasts) is transient feedback, not a resource surface, and stays
// out of the audit.
const auditWorkspaceSurfaces = (page: import('@playwright/test').Page): Promise<VisualAudit> =>
  page.evaluate(() => {
    const heavyShadows: string[] = []
    const glass: string[] = []
    const threeD: string[] = []
    const gradients: string[] = []
    const overlay = (element: Element) => Boolean(element.closest('[role="dialog"], [role="menu"], [role="listbox"], [role="tooltip"], [role="alert"], [data-radix-popper-content-wrapper], [data-sonner-toaster], [data-state="open"][role="region"]'))
    for (const element of Array.from(document.body.querySelectorAll('*'))) {
      if (overlay(element)) continue
      const style = getComputedStyle(element)
      if (style.position === 'fixed') continue
      const describe = `${element.tagName.toLowerCase()}${element.className && typeof element.className === 'string' ? `.${element.className.split(' ').slice(0, 2).join('.')}` : ''}`
      const shadow = style.boxShadow
      if (shadow !== 'none' && /\)\s+[\d.]+px\s+[\d.]+px\s+([\d.]+px)/.test(shadow)) {
        const blur = Number.parseFloat(shadow.match(/\)\s+[-\d.]+px\s+[-\d.]+px\s+([-\d.]+px)/)![1])
        if (blur >= 8) heavyShadows.push(`${describe} :: ${shadow.slice(0, 90)}`)
      }
      if (style.backdropFilter && style.backdropFilter !== 'none') glass.push(`${describe} :: ${style.backdropFilter}`)
      if (style.transformStyle === 'preserve-3d' || /matrix3d|perspective\(/.test(style.transform)) threeD.push(`${describe} :: ${style.transform.slice(0, 60)}`)
      if ((style.backgroundImage || '').includes('gradient(')) gradients.push(`${describe} :: ${style.backgroundImage.slice(0, 90)}`)
    }
    return { heavyShadows, glass, threeD, gradients, h1Count: document.body.querySelectorAll('h1').length }
  })

const expectFlatReferenceSurfaces = async (page: import('@playwright/test').Page, label: string) => {
  const audit = await auditWorkspaceSurfaces(page)
  const report = (rows: string[]) => rows.slice(0, 4).join(' | ')
  expect(report(audit.heavyShadows), `${label}: no heavy shadows`).toBe('')
  expect(report(audit.glass), `${label}: no glass surfaces`).toBe('')
  expect(report(audit.threeD), `${label}: no 3D transforms`).toBe('')
  expect(report(audit.gradients), `${label}: no decorative gradients`).toBe('')
  expect(audit.h1Count, `${label}: exactly one page header`).toBe(1)
}

test('high-traffic resource screens keep the flat reference visual grammar', async ({ page }) => {
  test.setTimeout(90_000)
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(process.env.E2E_MIDDLE_ADMIN_EMAIL || 'middle@example.com')
  await page.locator('#password').fill(process.env.E2E_ADMIN_PASSWORD || 'test-password')
  await page.getByRole('button', { name: /войти в систему|sign in/i }).click()
  await expect(page).toHaveURL(/\/middle-admin(?:\/|$)/)
  await expect(page.getByTestId('orders-tab-content')).toBeVisible()

  await expectFlatReferenceSurfaces(page, 'orders')
  for (const target of ['finance', 'ingredients', 'cooking', 'contracts', 'calculator']) {
    const entry = page.locator(`[data-reference-page="${target}"]`)
    await expect(entry).toBeVisible()
    await entry.click()
    await page.waitForTimeout(800)
    await expectFlatReferenceSurfaces(page, target)
  }
})
