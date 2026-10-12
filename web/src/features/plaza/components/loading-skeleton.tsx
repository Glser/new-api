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
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function PlazaLoadingSkeleton() {
  return (
    <div aria-busy='true' className='flex flex-col gap-8'>
      <Skeleton className='mx-auto h-10 w-full max-w-2xl' />
      <div className='flex flex-col gap-3'>
        <Skeleton className='h-3 w-16' />
        <div className='flex gap-2'>
          <Skeleton className='h-8 w-24 rounded-full' />
          <Skeleton className='h-8 w-28 rounded-full' />
          <Skeleton className='h-8 w-20 rounded-full' />
          <Skeleton className='h-8 w-32 rounded-full' />
        </div>
      </div>
      <div className='flex flex-col gap-3'>
        <Skeleton className='h-3 w-16' />
        <div className='flex gap-2'>
          <Skeleton className='h-8 w-24 rounded-full' />
          <Skeleton className='h-8 w-20 rounded-full' />
        </div>
      </div>
      {Array.from({ length: 2 }, (_, section) => (
        <section key={section} className='flex flex-col gap-4'>
          <Skeleton className='h-7 w-24' />
          <div className='grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3'>
            {Array.from({ length: 3 }, (_, index) => (
              <Card key={index} className='gap-3'>
                <CardHeader className='flex flex-row gap-3'>
                  <Skeleton className='size-10 shrink-0' />
                  <div className='flex min-w-0 flex-1 flex-col gap-2'>
                    <Skeleton className='h-5 w-40 max-w-full' />
                    <Skeleton className='h-3 w-20' />
                  </div>
                </CardHeader>
                <CardContent className='flex flex-1 flex-col gap-3'>
                  <Skeleton className='h-3.5 w-full' />
                  <Skeleton className='h-3.5 w-4/5' />
                  <div className='mt-auto grid grid-cols-3 gap-3'>
                    <Skeleton className='h-10' />
                    <Skeleton className='h-10' />
                    <Skeleton className='h-10' />
                  </div>
                </CardContent>
                <CardFooter className='border-0 bg-transparent pt-0'>
                  <Skeleton className='h-8 w-full' />
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
