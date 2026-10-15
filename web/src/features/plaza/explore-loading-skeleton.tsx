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

/** 侧栏里一组筛选条件的骨架：标题一行 + 若干列表项 */
function FilterSectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className='flex flex-col gap-1.5'>
      <div className='flex items-center gap-2 px-1'>
        <Skeleton className='size-7 rounded-md' />
        <Skeleton className='h-3.5 w-16' />
      </div>
      <div className='flex flex-col gap-1'>
        {Array.from({ length: rows }, (_, row) => (
          <Skeleton key={row} className='h-9 w-full rounded-md' />
        ))}
      </div>
    </div>
  )
}

/**
 * 新版模型广场的加载骨架，和「侧栏筛选 + 内容流」的布局同构：
 * 页头三行 + 桌面侧栏（lg 以下不渲染，避免和内容抢宽度）+ 卡片网格。
 */
export function ExploreLoadingSkeleton() {
  return (
    <div aria-busy='true' className='flex flex-col'>
      <div className='flex flex-wrap items-end justify-between gap-x-6 gap-y-2'>
        <Skeleton className='h-7 w-40' />
        <Skeleton className='h-4 w-36' />
      </div>
      <Skeleton className='mt-3 h-4 w-full max-w-md' />
      <Skeleton className='mt-4 h-10 w-full max-w-xl rounded-lg' />

      <div className='mt-5 flex items-start gap-6 sm:mt-6 lg:gap-8'>
        <div className='hidden w-60 shrink-0 lg:block'>
          <div className='border-border/70 bg-muted/40 flex flex-col gap-4 rounded-xl border p-3'>
            <FilterSectionSkeleton rows={5} />
            <FilterSectionSkeleton rows={4} />
            <div className='border-border/60 flex items-center justify-between gap-2 border-t pt-3'>
              <Skeleton className='h-3 w-20' />
              <Skeleton className='h-7 w-20 rounded-md' />
            </div>
          </div>
        </div>
        <div className='min-w-0 flex-1'>
          <Skeleton className='mb-4 h-11 w-full rounded-lg lg:hidden' />
          <div className='flex flex-col gap-10 sm:gap-12'>
            {Array.from({ length: 2 }, (_, section) => (
              <section key={section} className='flex flex-col gap-4'>
                <div className='flex items-center gap-2.5 sm:gap-3'>
                  <Skeleton className='size-8 rounded-lg' />
                  <Skeleton className='h-5 w-20' />
                  <Skeleton className='h-px min-w-8 flex-1' />
                  <Skeleton className='h-4 w-16' />
                </div>
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
        </div>
      </div>
    </div>
  )
}
