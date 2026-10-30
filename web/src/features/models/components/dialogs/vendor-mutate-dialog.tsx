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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Store } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useForm, type SubmitErrorHandler } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  SideDrawerSection,
  SideDrawerSectionHeader,
  sideDrawerContentClassName,
  sideDrawerFooterClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
} from '@/components/drawer-layout'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { LobeIconField } from '@/components/lobe-icon-field'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { IconBadge } from '@/components/ui/icon-badge'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { formatTimestampToDate } from '@/lib/format'
import { createServerError } from '@/lib/server-error-message'

import { createVendor, getVendor, updateVendor } from '../../api'
import { vendorsQueryKeys } from '../../lib'
import {
  vendorFormSchema,
  type Vendor,
  type VendorFormValues,
} from '../../types'
import { invalidateVendorData, vendorErrorMessage } from '../../vendor-api'
import { VendorLinkedModels } from '../vendor-linked-models'

const VENDOR_FORM_CLASS_NAME =
  'gap-5 px-5 py-5 [&_[data-slot=form-description]]:text-xs [&_[data-slot=form-description]]:leading-5 [&_[data-slot=form-label]]:text-xs [&_[data-slot=input]]:h-10 [&_[data-slot=input]]:rounded-xl [&_[data-slot=input]]:bg-muted/20 [&_[data-slot=input]]:px-3 [&_[data-slot=textarea]]:rounded-xl [&_[data-slot=textarea]]:bg-muted/20'

export function VendorMutateDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentVendor?: Vendor | null
}) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const id = props.currentVendor?.id
  const [section, setSection] = useState('details')
  const [confirmClose, setConfirmClose] = useState(false)
  const loadedKey = useRef('')
  const pendingNavigation = useRef<(() => void) | null>(null)
  const form = useForm({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: { name: '', description: '', icon: '', version: '' },
  })
  const query = useQuery({
    queryKey: vendorsQueryKeys.detail(id ?? 0),
    queryFn: async () => {
      if (!id) throw new Error(t('Select a saved vendor.'))
      const response = await getVendor(id)
      if (!response.success || !response.data) {
        throw createServerError(response, t('Failed to load vendor'))
      }
      return response.data
    },
    enabled: props.open && Boolean(id),
  })
  useEffect(() => {
    if (!props.open) {
      loadedKey.current = ''
      return
    }
    const key = String(id ?? 'new')
    if (loadedKey.current === key || (id && !query.data)) return
    const value = query.data
    form.reset({
      name: id ? (value?.name ?? '') : '',
      description: id ? (value?.description ?? '') : '',
      icon: id ? (value?.icon ?? '') : '',
      version: id ? (value?.version ?? '') : '',
    })
    loadedKey.current = key
    setSection('details')
  }, [props.open, id, query.data, form])
  const save = useMutation({
    mutationFn: async (values: VendorFormValues) => {
      const response = id
        ? await updateVendor({ ...values, id })
        : await createVendor(values)
      if (!response.success) {
        throw createServerError(response, t('Operation failed'))
      }
      return response.data
    },
    onSuccess: async () => {
      await invalidateVendorData(client)
      toast.success(
        id ? t('Vendor updated successfully') : t('Vendor created successfully')
      )
      form.reset(form.getValues())
      props.onOpenChange(false)
    },
  })
  const isDirty = form.formState.isDirty
  const close = (open: boolean) => {
    if (open || save.isPending) return false
    if (isDirty) {
      setConfirmClose(true)
      return false
    }
    props.onOpenChange(false)
    return true
  }
  const onInvalid: SubmitErrorHandler<VendorFormValues> = () => {
    toast.error(t('Please fix the highlighted fields before saving'))
  }
  const vendorName = query.data?.name ?? props.currentVendor?.name
  const showForm = (!id || !query.isPending) && !query.isError

  return (
    <>
      <Sheet open={props.open} onOpenChange={close}>
        <SheetContent
          className={sideDrawerContentClassName('max-w-none sm:!max-w-[640px]')}
        >
          <SheetHeader
            className={sideDrawerHeaderClassName(
              'flex-row items-start gap-3 bg-muted/30 px-5 py-5 backdrop-blur-none supports-[backdrop-filter]:bg-muted/30 sm:py-5'
            )}
          >
            <IconBadge
              size='lg'
              className='rounded-full bg-[#c4f82a] text-[#28350a]'
            >
              <Store />
            </IconBadge>
            <div className='min-w-0 flex-1 pr-6'>
              <SheetTitle className='text-lg font-semibold tracking-tight sm:text-xl'>
                {id ? t('Update Vendor') : t('Create Vendor')}
              </SheetTitle>
              <SheetDescription className='mt-1 text-xs leading-5'>
                {id && vendorName ? (
                  <>
                    <span className='text-foreground/80 font-medium'>
                      {vendorName}
                    </span>
                    <span className='mt-0.5 block'>
                      {t('Manage vendor details and linked model records.')}
                    </span>
                  </>
                ) : (
                  t('Manage vendor details and linked model records.')
                )}
              </SheetDescription>
            </div>
          </SheetHeader>
          <Tabs
            value={section}
            onValueChange={setSection}
            className='shrink-0 px-5 pt-4'
          >
            <TabsList className='grid h-auto w-full grid-cols-2'>
              <TabsTrigger
                value='details'
                className='h-auto min-w-0 whitespace-normal'
              >
                {t('Vendor details')}
              </TabsTrigger>
              <TabsTrigger
                value='models'
                disabled={!id}
                className='h-auto min-w-0 whitespace-normal'
              >
                {id
                  ? `${t('Linked models')} (${query.data?.model_count ?? 0})`
                  : t('Linked models')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
          {section === 'details' && (
            <>
              {query.isError ? (
                <ErrorState
                  description={vendorErrorMessage(query.error)}
                  onRetry={() => void query.refetch()}
                />
              ) : null}
              {id && query.isPending && <LoadingState />}
              {showForm && (
                <Form {...form}>
                  <form
                    id='vendor-mutate-form'
                    className={sideDrawerFormClassName(VENDOR_FORM_CLASS_NAME)}
                    onSubmit={form.handleSubmit(
                      (values) => save.mutate(values),
                      onInvalid
                    )}
                  >
                    <SideDrawerSection>
                      <SideDrawerSectionHeader title={t('Basic Information')} />
                      <FormField
                        control={form.control}
                        name='name'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel required className='pl-[3px]'>
                              {t('Vendor Name')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                maxLength={128}
                                placeholder={t('OpenAI, Anthropic, etc.')}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name='description'
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className='pl-[3px]'>
                              {t('Description')}
                            </FormLabel>
                            <FormControl>
                              <Textarea
                                rows={3}
                                placeholder={t('Describe this vendor...')}
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className='bg-muted/30 flex flex-col gap-4 rounded-2xl border p-3.5'>
                        <FormField
                          control={form.control}
                          name='icon'
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className='pl-[3px]'>
                                {t('Icon')}
                              </FormLabel>
                              <FormControl>
                                <LobeIconField
                                  key={`${id ?? 'new'}-${props.open}`}
                                  value={field.value ?? ''}
                                  onChange={field.onChange}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      {query.data && id && (
                        <div className='text-muted-foreground space-y-1 text-xs leading-5'>
                          <p>
                            {t('Created At')}:{' '}
                            {formatTimestampToDate(query.data.created_time)}
                          </p>
                          <p>
                            {t('Updated At')}:{' '}
                            {formatTimestampToDate(query.data.updated_time)}
                          </p>
                        </div>
                      )}
                    </SideDrawerSection>
                  </form>
                </Form>
              )}
              <SheetFooter className={sideDrawerFooterClassName('px-5')}>
                {save.isError && (
                  <Alert
                    variant='destructive'
                    className='col-span-2 basis-full'
                  >
                    <AlertDescription className='break-words'>
                      {vendorErrorMessage(save.error)}
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  variant='outline'
                  className='h-9 w-full sm:w-auto sm:min-w-24'
                  disabled={save.isPending}
                  onClick={() => close(false)}
                >
                  {t('Close')}
                </Button>
                <Button
                  shine
                  type='submit'
                  form='vendor-mutate-form'
                  disabled={
                    save.isPending ||
                    Boolean(id && (query.isPending || query.isError))
                  }
                  className='h-9 w-full sm:w-auto sm:min-w-28'
                >
                  <Check data-icon='inline-start' />
                  {save.isPending ? t('Saving...') : t('Save metadata')}
                </Button>
              </SheetFooter>
            </>
          )}
          {props.open && section === 'models' && query.data && (
            <VendorLinkedModels
              key={query.data.id}
              vendor={query.data}
              onNavigate={(navigate) => {
                pendingNavigation.current = navigate
                if (close(false)) {
                  pendingNavigation.current = null
                  navigate()
                }
              }}
            />
          )}
        </SheetContent>
      </Sheet>
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={(open) => {
          setConfirmClose(open)
          if (!open) pendingNavigation.current = null
        }}
        title={t('Discard unsaved changes?')}
        desc={t('Your changes have not been saved.')}
        confirmText={t('Discard changes')}
        handleConfirm={() => {
          setConfirmClose(false)
          props.onOpenChange(false)
          pendingNavigation.current?.()
          pendingNavigation.current = null
        }}
      />
    </>
  )
}
