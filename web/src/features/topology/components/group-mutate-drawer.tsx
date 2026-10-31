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
import { Check, Loader2, Users } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import {
  SideDrawerSection,
  sideDrawerContentClassName,
  sideDrawerFooterClassName,
  sideDrawerFormClassName,
  sideDrawerHeaderClassName,
  sideDrawerSwitchItemClassName,
} from '@/components/drawer-layout'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
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
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { safeNumberFieldProps } from '@/features/system-settings/utils/numeric-field'
import { handleServerError } from '@/lib/handle-server-error'

import {
  createTopologyGroup,
  getTopologyGroup,
  TopologyGroupExistsError,
  updateTopologyGroup,
} from '../group-api'
import {
  createGroupFormSchema,
  defaultGroupValues,
  type CreateGroupValues,
} from '../lib/group-form'

export function GroupMutateDrawer(props: {
  open: boolean
  groupName?: string
  onOpenChange: (open: boolean) => void
  onSaved: (name: string) => void
}) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const isEditing = props.groupName !== undefined
  const loadedName = useRef<string | undefined>(undefined)
  const groupQuery = useQuery({
    queryKey: ['topology-group', props.groupName],
    queryFn: () => getTopologyGroup(props.groupName ?? ''),
    enabled: props.open && isEditing,
    staleTime: 0,
    meta: { errorToast: false },
  })
  const form = useForm<CreateGroupValues>({
    resolver: zodResolver(createGroupFormSchema(t)),
    defaultValues: defaultGroupValues,
  })
  useEffect(() => {
    if (!props.open) {
      loadedName.current = undefined
      return
    }
    if (isEditing) {
      if (
        groupQuery.isFetching ||
        !groupQuery.data ||
        loadedName.current === props.groupName
      ) {
        return
      }
      form.reset(groupQuery.data)
      loadedName.current = props.groupName
    } else {
      form.reset(defaultGroupValues)
    }
  }, [
    props.open,
    props.groupName,
    isEditing,
    groupQuery.data,
    groupQuery.isFetching,
    form,
  ])
  const selectable = useWatch({ control: form.control, name: 'selectable' })
  const saveGroup = useMutation({
    mutationFn: (values: CreateGroupValues) =>
      props.groupName === undefined
        ? createTopologyGroup(values)
        : updateTopologyGroup(props.groupName, values),
    onSuccess: (values) => {
      toast.success(
        isEditing
          ? t('Group updated successfully')
          : t('Group created successfully')
      )
      props.onSaved(values.name)
      props.onOpenChange(false)
    },
    onError: (error: Error) => {
      if (error instanceof TopologyGroupExistsError) {
        form.setError('name', { message: error.message }, { shouldFocus: true })
        return
      }
      handleServerError(
        error,
        isEditing ? t('Failed to update group') : t('Failed to create group')
      )
    },
    onSettled: () =>
      Promise.all(
        [
          ['topology-graph'],
          ['topology-group'],
          ['system-options'],
          ['groups'],
          ['user-groups'],
          ['pricing'],
          ['playground-groups'],
        ].map((queryKey) => queryClient.invalidateQueries({ queryKey }))
      ),
  })
  const loadingGroup =
    isEditing && (groupQuery.isPending || groupQuery.isFetching)
  const formReady =
    !isEditing ||
    (Boolean(groupQuery.data) && !groupQuery.isError && !loadingGroup)
  let saveLabel = isEditing ? t('Save Changes') : t('Create Group')
  if (saveGroup.isPending) saveLabel = t('Saving...')

  return (
    <Sheet
      open={props.open}
      onOpenChange={(open) => {
        if (!saveGroup.isPending) props.onOpenChange(open)
      }}
    >
      <SheetContent
        className={sideDrawerContentClassName('max-w-none sm:!max-w-[640px]')}
        showCloseButton={!saveGroup.isPending}
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
            <Users />
          </IconBadge>
          <div className='min-w-0 flex-1 pr-6'>
            <SheetTitle className='text-lg font-semibold tracking-tight sm:text-xl'>
              {isEditing ? t('Edit Group') : t('Create Group')}
            </SheetTitle>
            <SheetDescription className='mt-1 text-xs leading-5'>
              {isEditing ? (
                <>
                  <span className='text-foreground/80 font-medium break-words'>
                    {props.groupName}
                  </span>
                  <span className='mt-0.5 block'>
                    {t('Update billing and user access for this group.')}
                  </span>
                </>
              ) : (
                t(
                  'Configure billing and user access, then connect this group to channels on the canvas.'
                )
              )}
            </SheetDescription>
          </div>
        </SheetHeader>
        {loadingGroup && <LoadingState />}
        {isEditing && groupQuery.isError && (
          <ErrorState
            description={groupQuery.error.message}
            onRetry={() => void groupQuery.refetch()}
          />
        )}
        {formReady && (
          <Form {...form}>
            <form
              id='topology-group-form'
              className={sideDrawerFormClassName(
                'gap-5 px-5 py-5 [&_[data-slot=form-description]]:text-xs [&_[data-slot=form-description]]:leading-5 [&_[data-slot=form-label]]:pl-[3px] [&_[data-slot=form-label]]:text-xs [&_[data-slot=input]]:h-10 [&_[data-slot=input]]:rounded-xl [&_[data-slot=input]]:bg-muted/20 [&_[data-slot=input]]:px-3 [&_[data-slot=textarea]]:rounded-xl [&_[data-slot=textarea]]:bg-muted/20'
              )}
              onSubmit={form.handleSubmit((values) => saveGroup.mutate(values))}
            >
              <SideDrawerSection>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>{t('Group name')}</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          autoComplete='off'
                          readOnly={isEditing}
                          disabled={saveGroup.isPending}
                        />
                      </FormControl>
                      {isEditing && (
                        <FormDescription>
                          {t(
                            'Group names are shared by channels, API keys, and users and cannot be changed here.'
                          )}
                        </FormDescription>
                      )}
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className='bg-muted/30 grid gap-4 rounded-2xl border p-3.5 sm:grid-cols-2'>
                  <FormField
                    control={form.control}
                    name='ratio'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Ratio')}</FormLabel>
                        <FormControl>
                          <Input
                            type='number'
                            min={0}
                            step='any'
                            {...safeNumberFieldProps(field)}
                            disabled={saveGroup.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='topupRatio'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Top-up ratio')}</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            type='number'
                            min={0}
                            step='any'
                            placeholder={t('Not set')}
                            disabled={saveGroup.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </SideDrawerSection>
              <SideDrawerSection>
                <FormField
                  control={form.control}
                  name='selectable'
                  render={({ field }) => (
                    <FormItem
                      className={sideDrawerSwitchItemClassName(
                        'bg-muted/30 min-h-20 rounded-2xl border p-4'
                      )}
                    >
                      <FormLabel className='text-sm!'>
                        {t('User selectable')}
                      </FormLabel>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className='data-checked:bg-foreground'
                          disabled={saveGroup.isPending}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                {selectable && (
                  <FormField
                    control={form.control}
                    name='description'
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t('Description')}</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={3}
                            placeholder={t('Group description')}
                            disabled={saveGroup.isPending}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </SideDrawerSection>
            </form>
          </Form>
        )}
        <SheetFooter className={sideDrawerFooterClassName('px-5')}>
          <Button
            variant='outline'
            className='h-9 w-full sm:w-auto sm:min-w-24'
            disabled={saveGroup.isPending}
            onClick={() => props.onOpenChange(false)}
          >
            {t('Cancel')}
          </Button>
          <Button
            shine
            type='submit'
            form='topology-group-form'
            disabled={saveGroup.isPending || !formReady}
            className='h-9 w-full sm:w-auto sm:min-w-28'
          >
            {saveGroup.isPending ? (
              <Loader2 className='size-4 animate-spin' aria-hidden='true' />
            ) : (
              <Check data-icon='inline-start' />
            )}
            {saveLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
