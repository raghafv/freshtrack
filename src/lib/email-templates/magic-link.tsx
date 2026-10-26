import * as React from 'react'

import { Heading, Text } from '@react-email/components'

import { CtaButton, EmailShell, FallbackLink, h1, note, text } from './_layout'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <EmailShell preview={`Your login link for ${siteName}`}>
    <Heading style={h1}>Your login link</Heading>
    <Text style={text}>
      Tap the button below to sign in to {siteName}. No password needed.
    </Text>
    <CtaButton href={confirmationUrl}>Log in to FreshTrack</CtaButton>
    <Text style={note}>
      This link expires shortly and works only once. If you didn&apos;t request
      it, you can safely ignore this email.
    </Text>
    <FallbackLink href={confirmationUrl} />
  </EmailShell>
)

export default MagicLinkEmail
