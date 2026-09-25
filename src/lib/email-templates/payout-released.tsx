// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  hunterName?: string
  bountyTitle?: string
  place?: string
  credits?: number | string
  bountyUrl?: string
}

const Email = ({ hunterName, bountyTitle, place, credits, bountyUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your payout has been released — credits are in your wallet.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ONLOOKER</Text>
        <Heading style={heading}>Your payout is on its way 🎉</Heading>
        <Text style={text}>{hunterName ? `Hi ${hunterName},` : 'Hi there,'}</Text>
        <Text style={text}>
          Great news — the Poster approved your footage and released the payout
          {bountyTitle ? (
            <>
              {' '}for <strong>{bountyTitle}</strong>
            </>
          ) : null}
          {place ? <> at {place}</> : null}.
        </Text>
        <Section style={amountBox}>
          <Text style={amount}>{credits ?? ''} credits</Text>
          <Text style={amountNote}>Added to your Onlooker wallet</Text>
        </Section>
        <Text style={text}>
          You can cash out your credits any time from your wallet, or use them to post your own bounties.
        </Text>
        {bountyUrl ? (
          <Button style={button} href={bountyUrl}>
            View the bounty
          </Button>
        ) : null}
        <Text style={footer}>Thanks for being an Onlooker. Keep the footage coming.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Payout released${data?.['credits'] ? `: ${data['credits']} credits` : ''} — Onlooker`,
  displayName: 'Payout released',
  previewData: {
    hunterName: 'Alex',
    bountyTitle: 'Room-by-room walkthrough',
    place: '255 S Olive St, Los Angeles',
    credits: 235,
    bountyUrl: 'https://onlooker.io',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '28px 25px', maxWidth: '560px' }
const brand = { color: '#65a30d', fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '3px', margin: '0 0 16px' }
const heading = { color: '#111111', fontSize: '22px', margin: '0 0 12px' }
const text = { color: '#333333', fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const amountBox = { backgroundColor: '#f4f7e8', borderRadius: '10px', padding: '18px', textAlign: 'center' as const, margin: '8px 0 16px' }
const amount = { color: '#111111', fontSize: '26px', fontWeight: 'bold' as const, margin: '0' }
const amountNote = { color: '#5b6b3a', fontSize: '13px', margin: '4px 0 0' }
const button = { backgroundColor: '#ccff00', color: '#111111', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 20px', fontSize: '15px', textDecoration: 'none', display: 'inline-block', margin: '4px 0 16px' }
const footer = { color: '#888888', fontSize: '13px', margin: '16px 0 0' }
