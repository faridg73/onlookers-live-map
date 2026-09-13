import React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  email?: string
  contentUrl?: string
  description?: string
  noticeId?: string
}

const Email = ({ name, email, contentUrl, description, noticeId }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>New DMCA / infringement report submitted on Onlooker Live</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>DMCA / Infringement Report</Heading>
        <Text style={text}>A copyright holder submitted a new report.</Text>
        <Section style={box}>
          <Text style={row}><strong>Notice ID:</strong> {noticeId || '—'}</Text>
          <Text style={row}><strong>Name:</strong> {name || '—'}</Text>
          <Text style={row}><strong>Email:</strong> {email || '—'}</Text>
          <Text style={row}><strong>Content URL:</strong> {contentUrl || '—'}</Text>
          <Hr style={hr} />
          <Text style={row}><strong>Description of infringing material:</strong></Text>
          <Text style={row}>{description || '—'}</Text>
        </Section>
        <Text style={muted}>
          Review this notice in the Onlooker Live admin panel and respond to the reporter promptly.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'New DMCA / infringement report — Onlooker Live',
  displayName: 'DMCA report alert',
  to: 'support@onlookerlive.com',
  previewData: {
    name: 'Jane Rights',
    email: 'jane@example.com',
    contentUrl: 'https://onlookerlive.com/b/abc123',
    description: 'This clip reproduces my copyrighted broadcast footage without permission.',
    noticeId: '00000000-0000-0000-0000-000000000000',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const heading = { color: '#0F0F0F', fontSize: '22px' }
const text = { color: '#333333', fontSize: '14px' }
const box = { backgroundColor: '#f5f5f5', borderRadius: '8px', padding: '14px 16px' }
const row = { color: '#111111', fontSize: '13px', margin: '6px 0', wordBreak: 'break-all' as const }
const hr = { borderColor: '#dddddd', margin: '12px 0' }
const muted = { color: '#777777', fontSize: '12px', marginTop: '16px' }
