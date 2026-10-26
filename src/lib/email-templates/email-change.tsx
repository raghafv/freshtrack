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

interface EmailChangeEmailProps {
  siteName: string
  // oldEmail is the user's current address (HookData.OldEmail). For the
  // NEW-recipient half of a secure email_change fanout, `email` equals the
  // recipient (NEW), so the "from" line must render oldEmail to read
  // "from OLD to NEW" instead of "from NEW to NEW".
  oldEmail: string
  email: string
  newEmail: string
  confirmationUrl: string
}

export const EmailChangeEmail = ({
  siteName,
  oldEmail,
  newEmail,
  confirmationUrl,
}: EmailChangeEmailProps) => (
  <EmailShell preview={`Confirm your email change for ${siteName}`}>
    <Heading style={h1}>Confirm your email change</Heading>
    <Text style={text}>
      You asked to change the email address on your {siteName} account from{' '}
      <Link href={`mailto:${oldEmail}`} style={link}>
        {oldEmail}
      </Link>{' '}
      to{' '}
      <Link href={`mailto:${newEmail}`} style={link}>
        {newEmail}
      </Link>
      .
    </Text>
    <CtaButton href={confirmationUrl}>Confirm email change</CtaButton>
    <Text style={note}>
      If you didn&apos;t request this change, ignore this email and your address
      stays the same.
    </Text>
    <FallbackLink href={confirmationUrl} />
  </EmailShell>
)

export default EmailChangeEmail
