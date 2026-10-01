// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  kind?: string
  title?: string
  reason?: string
  details?: string
  reportId?: string
  reviewUrl?: string
}

const Email = ({ kind, title, reason, details, reportId, reviewUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New report on a {kind || 'post'} in Onlooker</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>New content report</Heading>
        <Text style={text}>Someone reported a {kind || 'post'}. It is waiting in the admin review queue.</Text>
        <Section style={box}>
          <Text style={row}><strong>Report ID:</strong> {reportId || '-'}</Text>
          <Text style={row}><strong>Type:</strong> {kind || '-'}</Text>
          <Text style={row}><strong>Title:</strong> {title || '-'}</Text>
          <Text style={row}><strong>Reason:</strong> {reason || '-'}</Text>
          <Hr style={hr} />
          <Text style={row}>{details || 'No extra details.'}</Text>
        </Section>
        <Text style={muted}>Review it at {reviewUrl || 'https://onlooker.io/admin'} — you can remove it or suspend the account.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `New report on a ${d['kind'] || 'post'} | Onlooker`,
  displayName: 'Content report alert',
  to: 'support@onlooker.io',
  previewData: {
    kind: 'clip',
    title: 'Crowd outside the Forum',
    reason: 'Harassment or hate',
    details: 'The caption targets a person in the clip.',
    reportId: '00000000-0000-0000-0000-000000000000',
    reviewUrl: 'https://onlooker.io/admin',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { color: '#0F0F0F', fontSize: '22px' }
const text = { color: '#333333', fontSize: '14px' }
const box = { backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '14px 16px' }
const row = { color: '#111111', fontSize: '13px', margin: '6px 0', wordBreak: 'break-word' as const }
const hr = { borderColor: '#dddddd', margin: '12px 0' }
const muted = { color: '#777777', fontSize: '12px', marginTop: '16px' }
