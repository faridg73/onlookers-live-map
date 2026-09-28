// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import React from "react";
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

type Props = { code?: string };

const SignupCodeEmail = ({ code = "000000" }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Onlooker verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Confirm your email</Heading>
        <Text style={text}>Enter this 6-digit code in Onlooker to finish creating your account.</Text>
        <Section style={codeBox}><Text style={codeText}>{code}</Text></Section>
        <Text style={muted}>This code expires in 10 minutes. If you did not request it, you can ignore this email.</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: SignupCodeEmail,
  subject: "Your Onlooker verification code",
  displayName: "Signup verification code",
  previewData: { code: "381204" },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "28px 24px" };
const heading = { color: "#0F0F0F", fontSize: "24px", margin: "0 0 16px" };
const text = { color: "#333333", fontSize: "15px", lineHeight: "1.6", margin: "0 0 20px" };
const codeBox = { backgroundColor: "#0F0F0F", borderRadius: "8px", padding: "18px", textAlign: "center" as const };
const codeText = { color: "#CCFF00", fontSize: "30px", fontWeight: "bold", letterSpacing: "8px", margin: "0" };
const muted = { color: "#777777", fontSize: "12px", lineHeight: "1.5", marginTop: "18px" };