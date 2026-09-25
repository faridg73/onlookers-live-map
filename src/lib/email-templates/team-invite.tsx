// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  teamName?: string
  inviterName?: string
  memberType?: 'staff' | 'hunter'
  email?: string
  joinUrl?: string
}

const Email = ({ teamName, inviterName, memberType, email, joinUrl }: Props) => {
  const team = teamName || 'An agency'
  const staff = memberType !== 'hunter'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{`${team} added you to their Onlooker team.`}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Text style={brand}>ONLOOKER</Text>
          <Heading style={heading}>You've been added to {team}</Heading>
          <Text style={text}>
            {inviterName ? `${inviterName} added you` : 'You were added'} to <strong>{team}</strong> on Onlooker
            {staff ? ' as a team member.' : ' as a preferred Onlooker.'}
          </Text>
          <Text style={text}>
            {staff
              ? "Verified property visits you post are paid from the agency's shared wallet — no personal credits needed."
              : "You're on their go-to camera crew for verified property visits. Payouts still land in your own wallet."}
          </Text>
          <Text style={text}>
            To join, sign in or create your account with <strong>{email || 'this email address'}</strong> and confirm it. You'll be added automatically.
          </Text>
          {joinUrl ? <Button style={button} href={joinUrl}>Join the team</Button> : null}
          <Text style={footer}>Didn't expect this? You can ignore this email — nothing happens unless you sign in.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `${data?.['teamName'] || 'An agency'} added you to their Onlooker team`,
  displayName: 'Team invite',
  previewData: { teamName: 'Sunset Realty', inviterName: 'Maria', memberType: 'staff', email: 'alex@sunsetrealty.com', joinUrl: 'https://onlooker.io/pro-dashboard' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '28px 25px', maxWidth: '560px' }
const brand = { color: '#65a30d', fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '3px', margin: '0 0 16px' }
const heading = { color: '#111111', fontSize: '22px', margin: '0 0 12px' }
const text = { color: '#333333', fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const button = { backgroundColor: '#ccff00', color: '#111111', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 20px', fontSize: '15px', textDecoration: 'none', display: 'inline-block', margin: '4px 0 16px' }
const footer = { color: '#888888', fontSize: '13px', margin: '16px 0 0' }
