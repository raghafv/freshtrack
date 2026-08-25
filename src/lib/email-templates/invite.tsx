import * as React from 'react'

import { Heading, Link, Text } from '@react-email/components'

import {
  CtaButton,
  EmailShell,
  FallbackLink,
  h1,
  link,
  note,
  text,
} from './_layout'

interface InviteEmailProps {
  siteName: string
  siteUrl: string
  confirmationUrl: string
}

export const InviteEmail = ({
  siteName,
  siteUrl,
  confirmationUrl,
}: InviteEmailProps) => (
  <EmailShell preview={`You've been invited to join ${siteName}`}>
    <Heading style={h1}>You&apos;ve been invited</Heading>
    <Text style={text}>
      You&apos;ve been invited to join{' '}
      <Link href={siteUrl} style={link}>
        {siteName}
      </Link>{' '}
      — track what&apos;s in your pantry, get expiry alerts, and waste less
      food. Accept the invite to set up your account.
    </Text>
    <CtaButton href={confirmationUrl}>Accept invitation</CtaButton>
    <Text style={note}>
      If you weren&apos;t expecting this invitation, you can safely ignore this
      email.
    </Text>
    <FallbackLink href={confirmationUrl} />
  </EmailShell>
)

export default InviteEmail
