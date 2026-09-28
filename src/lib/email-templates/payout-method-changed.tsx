// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  when?: string
  securityUrl?: string
}

const Email = ({ name, when, securityUrl }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Onlooker payout details were changed.</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>ONLOOKER</Text>
        <Heading style={heading}>Your payout details changed</Heading>
        <Text style={text}>
          {name ? `Hi ${name}, the` : 'The'} bank account that receives your Onlooker cash-outs was changed{when ? ` on ${when}` : ''}.
          For your safety, cash-outs are paused for 24 hours.
        </Text>
        <Text style={text}>
          <strong>Wasn't you?</strong> Freeze your account right away. This stops all cash-outs until you pass an ID check.
        </Text>
        {securityUrl ? <Button style={button} href={securityUrl}>Review account security</Button> : null}
        <Text style={footer}>If you made this change, you don't need to do anything.</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your Onlooker payout details were changed',
  displayName: 'Payout method changed',
  previewData: { name: 'Alex', when: 'Sep 28, 1:05 PM', securityUrl: 'https://onlooker.io/balance' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '28px 25px', maxWidth: '560px' }
const brand = { color: '#65a30d', fontSize: '13px', fontWeight: 'bold' as const, letterSpacing: '3px', margin: '0 0 16px' }
const heading = { color: '#111111', fontSize: '22px', margin: '0 0 12px' }
const text = { color: '#333333', fontSize: '15px', lineHeight: '22px', margin: '0 0 12px' }
const button = { backgroundColor: '#ccff00', color: '#111111', fontWeight: 'bold' as const, borderRadius: '8px', padding: '12px 20px', fontSize: '15px', textDecoration: 'none', display: 'inline-block', margin: '4px 0 16px' }
const footer = { color: '#888888', fontSize: '13px', margin: '16px 0 0' }
