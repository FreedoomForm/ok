import bcrypt from 'bcryptjs'

export interface SiteLoginCustomerRecord {
    id: string
    isActive: boolean
    password: string | null
}

export type SiteCustomerLoginOutcome = {
    status: 'OK' | 'MISSING_CREDENTIALS' | 'NO_PASSWORD_SET' | 'ACCOUNT_INACTIVE' | 'INVALID_CREDENTIALS'
    httpStatus: 200 | 400 | 401 | 403
    error: string | null
    customer: { id: string } | null
}

const GENERIC_SITE_LOGIN_ERROR = 'Invalid credentials'

/**
 * Authoritative password gate for the site customer login.
 * The addendum contract: the phone is the login and the normalized phone is
 * the initial password; only the hash is stored and never returned.
 * Pure credential-resolution seam: no database access, unit-testable.
 */
export async function resolveSiteCustomerLogin(input: {
    password: unknown
    customer: SiteLoginCustomerRecord
}): Promise<SiteCustomerLoginOutcome> {
    const password = typeof input.password === 'string' ? input.password : ''
    if (!password) {
        return { status: 'MISSING_CREDENTIALS', httpStatus: 400, error: 'Phone and password are required', customer: null }
    }

    if (!input.customer.isActive) {
        return { status: 'ACCOUNT_INACTIVE', httpStatus: 403, error: 'Customer account is inactive', customer: null }
    }

    if (!input.customer.password) {
        return { status: 'NO_PASSWORD_SET', httpStatus: 400, error: 'Password not set. Please contact support or set password.', customer: null }
    }

    const isValid = await bcrypt.compare(password, input.customer.password)
    if (!isValid) {
        return { status: 'INVALID_CREDENTIALS', httpStatus: 401, error: GENERIC_SITE_LOGIN_ERROR, customer: null }
    }

    return { status: 'OK', httpStatus: 200, error: null, customer: { id: input.customer.id } }
}

export type CustomerPasswordChangeOutcome = {
    status: 'OK' | 'INVALID_CREDENTIALS'
    httpStatus: 200 | 401
    error: string | null
}

/**
 * Pure verification seam for the customer password change flow. The current
 * password must verify against the stored (or synthesized initial-credential)
 * hash before a new hash may be persisted.
 */
export async function verifyCustomerPasswordChange(input: {
    currentPassword: string
    effectiveCurrentHash: string
}): Promise<CustomerPasswordChangeOutcome> {
    const isValid = await bcrypt.compare(input.currentPassword, input.effectiveCurrentHash)
    if (!isValid) {
        return { status: 'INVALID_CREDENTIALS', httpStatus: 401, error: 'Current password is incorrect' }
    }
    return { status: 'OK', httpStatus: 200, error: null }
}
