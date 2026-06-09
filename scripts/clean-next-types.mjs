import { rm } from 'node:fs/promises'

async function safeRm(path) {
  try {
    await rm(path, { recursive: true, force: true })
  } catch {
    // ignore
  }
}

await Promise.all([
  safeRm('.next/types'),
  safeRm('.next/dev/types'),
])

