// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  email?: string
  subject?: string
  message?: string
  ticketId?: string
  userId?: string
}

const Email = ({ name, email, subject, message, ticketId, userId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New support message from the Onlooker contact form</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>New contact form message</Heading>
        <Text style={text}>Someone reached out through the Contact &amp; Support page.</Text>
        <Section style={box}>
          <Text style={row}><strong>Ticket ID:</strong> {ticketId || '-'}</Text>
          <Text style={row}><strong>Name:</strong> {name || '-'}</Text>
          <Text style={row}><strong>Email:</strong> {email || '-'}</Text>
          <Text style={row}><strong>Topic:</strong> {subject || '-'}</Text>
          <Text style={row}><strong>Account:</strong> {userId || 'not signed in'}</Text>
          <Hr style={hr} />
          <Text style={row}><strong>Message:</strong></Text>
          <Text style={row}>{message || '-'}</Text>
        </Section>
        <Text style={muted}>Reply directly to this email to answer the sender.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'New support message | Onlooker',
  displayName: 'Support ticket alert',
  to: 'support@onlooker.io',
  previewData: {
    name: 'Jane Onlooker',
    email: 'jane@example.com',
    subject: 'Bounty or payout issue',
    message: 'My payout has been pending for three days, can you take a look?',
    ticketId: '00000000-0000-0000-0000-000000000000',
    userId: 'not signed in',
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
