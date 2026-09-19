// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  subject?: string
  message?: string
  ticketId?: string
}

const Email = ({ name, subject, message, ticketId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We received your message — Onlooker LLC support</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Thanks for reaching out</Heading>
        <Text style={text}>
          {name ? `Hi ${name},` : 'Hi there,'} our support team has your message and will reply to
          this email address as soon as we can.
        </Text>
        <Section style={box}>
          <Text style={row}><strong>Reference:</strong> {ticketId || '-'}</Text>
          <Text style={row}><strong>Topic:</strong> {subject || '-'}</Text>
          <Hr style={hr} />
          <Text style={row}><strong>Your message:</strong></Text>
          <Text style={row}>{message || '-'}</Text>
        </Section>
        <Text style={muted}>
          Need to add something? Just reply to this email and it will reach the same ticket.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'We received your message | Onlooker LLC',
  displayName: 'Support message received',
  previewData: {
    name: 'Jane',
    subject: 'Bounty or payout issue',
    message: 'My payout has been pending for three days, can you take a look?',
    ticketId: '00000000-0000-0000-0000-000000000000',
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
