// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import type { ComponentType } from 'react'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

/**
 * Template registry — maps template names to their React Email components.
 * Import and register new templates here after creating them in this directory.
 *
 * Example:
 *   import { template as welcomeTemplate } from './welcome'
 *   // then add to TEMPLATES: 'welcome': welcomeTemplate
 */
import { template as dmcaReport } from './dmca-report'
import { template as supportTicket } from './support-ticket'
import { template as supportReceived } from './support-received'
import { template as payoutReleased } from './payout-released'
import { template as teamInvite } from './team-invite'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'dmca-report': dmcaReport,
  'support-ticket': supportTicket,
  'support-received': supportReceived,
  'payout-released': payoutReleased,
  'team-invite': teamInvite,
}
