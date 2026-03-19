'use client'

import { useState } from 'react'
import type { PricingAddonDto, PricingPlanDto, PricingPlanPropertyValueDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Check, X } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import Link from 'next/link'

function PropertyValue({ prop }: { prop: PricingPlanPropertyValueDto }) {
  if (prop.valueType === 0) {
    return prop.boolValue ? (
      <Check className="h-4 w-4 text-primary shrink-0" />
    ) : (
      <X className="h-4 w-4 text-muted-foreground shrink-0" />
    )
  }
  if (prop.valueType === 1) {
    return (
      <span className="text-sm font-medium">
        {prop.numberValue?.toLocaleString('vi-VN')}{prop.unit ? ` ${prop.unit}` : ''}
      </span>
    )
  }
  return <span className="text-sm font-medium">{prop.textValue}</span>
}

interface PricingCardsProps {
  plans: PricingPlanDto[]
  addons?: PricingAddonDto[]
}

export function PricingCards({ plans, addons = [] }: PricingCardsProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly')
  const activePlans = plans.filter((p) => p.isActive).sort((a, b) => a.sortOrder - b.sortOrder)

  if (activePlans.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-12">
        Chưa có gói dịch vụ nào.
      </p>
    )
  }

  return (
    <div className="space-y-8">
      {/* Billing toggle */}
      <div className="flex items-center justify-center gap-4">
        <span className={cn('text-sm', billingCycle === 'monthly' ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          Hàng tháng
        </span>
        <button
          onClick={() => setBillingCycle((c) => (c === 'monthly' ? 'yearly' : 'monthly'))}
          className={cn(
            'relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            billingCycle === 'yearly' ? 'bg-primary' : 'bg-input',
          )}
          role="switch"
          aria-checked={billingCycle === 'yearly'}
        >
          <span
            className={cn(
              'inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
              billingCycle === 'yearly' ? 'translate-x-6' : 'translate-x-1',
            )}
          />
        </button>
        <span className={cn('text-sm flex items-center gap-1.5', billingCycle === 'yearly' ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          Hàng năm
          <Badge variant="secondary" className="text-xs">Tiết kiệm 20%</Badge>
        </span>
      </div>

      {/* Plan cards */}
      <div className={cn(
        'grid gap-6',
        activePlans.length === 1 ? 'max-w-sm mx-auto' :
        activePlans.length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' :
        'sm:grid-cols-2 lg:grid-cols-3',
      )}>
        {activePlans.map((plan) => {
          const price = billingCycle === 'monthly' ? plan.monthlyPrice : plan.yearlyPrice
          const isPopular = plan.badge?.toLowerCase().includes('popular') || plan.badge?.toLowerCase().includes('phổ biến')

          return (
            <Card
              key={plan.id}
              className={cn(
                'relative flex flex-col',
                isPopular && 'border-primary shadow-lg',
              )}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="px-3 py-1">{plan.badge}</Badge>
                </div>
              )}

              <CardHeader className="pb-4">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                {plan.description && (
                  <CardDescription>{plan.description}</CardDescription>
                )}
                <div className="mt-4">
                  {price !== undefined && price !== null ? (
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-bold">
                        {formatCurrency(price, plan.currency)}
                      </span>
                      <span className="text-muted-foreground text-sm mb-1">
                        /{billingCycle === 'monthly' ? 'tháng' : 'năm'}
                      </span>
                    </div>
                  ) : (
                    <p className="text-2xl font-bold">Liên hệ</p>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1 space-y-3">
                {plan.features.map((feat, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    {feat.included ? (
                      <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    )}
                    <span className={cn('text-sm', !feat.included && 'text-muted-foreground line-through')}>
                      {feat.text}
                    </span>
                  </div>
                ))}

                {/* Grouped property values */}
                {plan.properties && plan.properties.length > 0 && (() => {
                  const groups = plan.properties.reduce<Record<string, typeof plan.properties>>((acc, p) => {
                    const g = p.group ?? 'Khác'
                    if (!acc[g]) acc[g] = []
                    ;(acc[g] as typeof plan.properties).push(p)
                    return acc
                  }, {})
                  return (
                    <div className="mt-4 space-y-3 border-t pt-4">
                      {Object.entries(groups).map(([group, props]) => (
                        <div key={group}>
                          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1.5">{group}</p>
                          <div className="space-y-1.5">
                            {props.map((p) => (
                              <div key={p.propertyId} className="flex items-center justify-between gap-2">
                                <span className="text-sm text-muted-foreground">{p.displayName}</span>
                                <PropertyValue prop={p} />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </CardContent>

              <CardFooter className="pt-6">
                <Button
                  className="w-full"
                  variant={isPopular ? 'default' : 'outline'}
                  asChild
                >
                  <Link href={plan.ctaUrl ?? '/contact'}>{plan.ctaText}</Link>
                </Button>
              </CardFooter>
            </Card>
          )
        })}
      </div>

      {/* Add-on cards */}
      {addons.filter((a) => a.isActive).length > 0 && (
        <div className="space-y-6 pt-8 border-t">
          <div className="text-center">
            <h2 className="text-2xl font-bold">Gói bổ sung</h2>
            <p className="mt-2 text-muted-foreground">Nâng cấp thêm tính năng cho hệ thống của bạn</p>
          </div>
          <div className={cn(
            'grid gap-6',
            addons.filter((a) => a.isActive).length === 1 ? 'max-w-sm mx-auto' :
            addons.filter((a) => a.isActive).length === 2 ? 'sm:grid-cols-2 max-w-2xl mx-auto' :
            'sm:grid-cols-2 lg:grid-cols-3',
          )}>
            {addons
              .filter((a) => a.isActive)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((addon) => {
                const price = billingCycle === 'monthly' ? addon.monthlyPrice : addon.yearlyPrice
                return (
                  <Card key={addon.id} className="relative flex flex-col">
                    {addon.badge && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <Badge className="px-3 py-1">{addon.badge}</Badge>
                      </div>
                    )}
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2">
                        {addon.iconUrl && (
                          <img src={addon.iconUrl} alt="" className="h-8 w-8" />
                        )}
                        <div>
                          <CardTitle className="text-lg">{addon.name}</CardTitle>
                          {addon.category && (
                            <span className="text-xs text-muted-foreground">{addon.category}</span>
                          )}
                        </div>
                      </div>
                      {addon.description && (
                        <CardDescription className="mt-2">{addon.description}</CardDescription>
                      )}
                      <div className="mt-3">
                        {price !== undefined && price !== null ? (
                          <div className="flex items-end gap-1">
                            <span className="text-3xl font-bold">
                              {formatCurrency(price, addon.currency)}
                            </span>
                            <span className="text-muted-foreground text-sm mb-1">
                              /{billingCycle === 'monthly' ? 'tháng' : 'năm'}
                            </span>
                          </div>
                        ) : (
                          <p className="text-xl font-bold">Liên hệ</p>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 space-y-2">
                      {addon.features.map((feat, i) => (
                        <div key={i} className="flex items-start gap-2.5">
                          {feat.included ? (
                            <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                          ) : (
                            <X className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          )}
                          <span className={cn('text-sm', !feat.included && 'text-muted-foreground line-through')}>
                            {feat.text}
                          </span>
                        </div>
                      ))}
                    </CardContent>
                    <CardFooter className="pt-6">
                      <Button className="w-full" variant="outline" asChild>
                        <Link href={addon.ctaUrl ?? '/contact'}>{addon.ctaText}</Link>
                      </Button>
                    </CardFooter>
                  </Card>
                )
              })}
          </div>
        </div>
      )}
    </div>
  )
}
