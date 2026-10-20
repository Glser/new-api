/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { Link, useNavigate } from '@tanstack/react-router'
import { CheckIcon, CopyIcon, Loader2, Lock, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { useCountdown } from '@/hooks/use-countdown'
import { api } from '@/lib/api'
import { copyToClipboard } from '@/lib/copy-to-clipboard'
import { handleServerError } from '@/lib/handle-server-error'
import { AuthOperationError } from '@/lib/secure-verification'
import { createServerError } from '@/lib/server-error-message'

import { AuthCardHeading } from '../components/auth-card-heading'
import {
  AUTH_FIELD_INPUT,
  AuthIconField,
  AuthSubmitButton,
} from '../components/auth-field'

export type ResetPasswordSearchParams = {
  email?: string
  token?: string
}

type ResetPasswordConfirmProps = ResetPasswordSearchParams

export function ResetPasswordConfirm({
  email,
  token,
}: ResetPasswordConfirmProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const {
    secondsLeft,
    isActive,
    start: startCountdown,
  } = useCountdown({ initialSeconds: 30 })

  const isValidResetLink = Boolean(email && token)

  async function handleSubmit() {
    if (!isValidResetLink || !email || !token) {
      toast.error(t('Invalid reset link, please request a new password reset'))
      return
    }

    startCountdown()
    setLoading(true)
    try {
      const res = await api.post('/api/user/reset', { email, token }, {
        skipBusinessError: true,
      } as Record<string, unknown>)

      if (res?.data?.success) {
        const password = res.data.data
        setNewPassword(password)
        const copySuccess = await copyToClipboard(password)
        if (copySuccess) {
          toast.success(
            t('Password reset and copied to clipboard: {{password}}', {
              password,
            })
          )
        } else {
          toast.success(t('Password reset: {{password}}', { password }))
        }
      } else {
        handleServerError(createServerError(res.data, t('Request failed')))
      }
    } catch (error) {
      handleServerError(AuthOperationError.from(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!newPassword) return

    const copySuccess = await copyToClipboard(newPassword)
    if (copySuccess) {
      setCopied(true)
      toast.success(
        t('Password copied to clipboard: {{password}}', {
          password: newPassword,
        })
      )
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <>
      <AuthCardHeading title={t('Reset password')} />

      <div className='grid gap-4'>
        <p className='pl-2 text-xs leading-relaxed text-muted-foreground sm:text-sm'>
          {newPassword
            ? t('auth.resetPasswordConfirm.success')
            : t('auth.resetPasswordConfirm.description')}
        </p>

        {!isValidResetLink && (
          <Alert variant='destructive'>
            <AlertDescription>
              {t('Invalid reset link, please request a new password reset.')}
            </AlertDescription>
          </Alert>
        )}

        <AuthIconField icon={Mail}>
          <Input
            id='email'
            type='email'
            value={email || ''}
            disabled
            placeholder={t('Waiting for email...')}
            className={AUTH_FIELD_INPUT}
          />
        </AuthIconField>

        {newPassword && (
          <div className='space-y-1.5'>
            <AuthIconField icon={Lock}>
              <Input
                id='password'
                value={newPassword}
                disabled
                className={`${AUTH_FIELD_INPUT} pr-10 font-mono`}
              />
              <button
                type='button'
                className='absolute right-2.5 flex size-7 items-center justify-center rounded-lg text-muted-foreground/80 transition-colors hover:bg-muted/80 hover:text-foreground'
                onClick={handleCopy}
                aria-label={t('Copy')}
              >
                {copied ? (
                  <CheckIcon className='size-4' />
                ) : (
                  <CopyIcon className='size-4' />
                )}
              </button>
            </AuthIconField>
            <p className='text-xs text-muted-foreground'>
              {t('Password has been copied to clipboard')}
            </p>
          </div>
        )}

        {!newPassword && (
          <p className='pr-3 text-right text-xs text-muted-foreground'>
            <Link
              to='/sign-in'
              className='font-semibold text-foreground underline underline-offset-4 hover:text-foreground/70'
            >
              {t('Back to login')}
            </Link>
          </p>
        )}

        <AuthSubmitButton
          type='button'
          disabled={
            newPassword ? false : loading || isActive || !isValidResetLink
          }
          onClick={
            newPassword
              ? () => navigate({ to: '/sign-in', replace: true })
              : handleSubmit
          }
        >
          {loading ? <Loader2 className='size-4.5 animate-spin' /> : null}
          {newPassword && t('auth.resetPasswordConfirm.backToLogin')}
          {!newPassword &&
            isActive &&
            t('auth.resetPasswordConfirm.retry', {
              seconds: secondsLeft,
            })}
          {!newPassword &&
            !isActive &&
            t('auth.resetPasswordConfirm.confirm')}
        </AuthSubmitButton>
      </div>
    </>
  )
}
