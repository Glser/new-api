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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { formatNumber } from '@/lib/format'

import { formatCreemPrice } from '../lib/format'
import type { CreemProduct } from '../types'

interface CreemProductsSectionProps {
  products: CreemProduct[]
  onProductSelect: (product: CreemProduct) => void
  loading?: boolean
}

export function CreemProductsSection({
  products,
  onProductSelect,
  loading,
}: CreemProductsSectionProps) {
  const { t } = useTranslation()

  if (loading) {
    return (
      <div className='grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3'>
        {['first', 'second', 'third'].map((key) => (
          <Skeleton key={key} className='h-24 rounded-lg' />
        ))}
      </div>
    )
  }

  if (!Array.isArray(products) || products.length === 0) {
    return null
  }

  return (
    <div className='grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3'>
      {products.map((product) => (
        <Button
          key={product.productId}
          variant='outline'
          className='h-auto min-w-0 flex-col gap-2 rounded-xl p-4 whitespace-normal'
          onClick={() => onProductSelect(product)}
        >
          <span className='text-base font-medium break-words'>
            {product.name}
          </span>
          <span className='text-muted-foreground text-xs'>
            {t('Quota')}: {formatNumber(product.quota)}
          </span>
          <span className='text-lg font-semibold tabular-nums'>
            {formatCreemPrice(product.price, product.currency)}
          </span>
        </Button>
      ))}
    </div>
  )
}
