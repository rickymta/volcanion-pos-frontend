import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useEffect } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type {
  PricingPlanDto,
  PricingPropertyDefinitionDto,
  PricingPlanPropertyValueDto,
  PricingAddonDto,
} from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp, Settings2 } from 'lucide-react'

// ─── Value Type helpers ───────────────────────────────────────────────────────

const VALUE_TYPE_LABELS: Record<number, string> = { 0: 'Boolean', 1: 'Number', 2: 'Text' }

// ─── Plan Form ────────────────────────────────────────────────────────────────

const featureSchema = z.object({ text: z.string(), included: z.boolean() })
const planSchema = z.object({
  name: z.string().min(1, 'Bắt buộc'),
  nameEn: z.string().optional().nullable(),
  monthlyPrice: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).nullable()),
  yearlyPrice: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).nullable()),
  currency: z.string().default('VND'),
  description: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  badge: z.string().optional().nullable(),
  badgeEn: z.string().optional().nullable(),
  ctaText: z.string().min(1, 'Bắt buộc'),
  ctaTextEn: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
  features: z.array(featureSchema),
  featuresEn: z.array(featureSchema).optional().nullable(),
})
type PlanFormValues = z.infer<typeof planSchema>

function PlanForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
  isCreate = false,
}: {
  defaultValues: Partial<PlanFormValues>
  onSubmit: (d: PlanFormValues) => void
  isPending: boolean
  onCancel: () => void
  isCreate?: boolean
}) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<PlanFormValues>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      features: [],
      featuresEn: [],
      sortOrder: 0,
      isActive: true,
      currency: 'VND',
      monthlyPrice: null,
      yearlyPrice: null,
      ...defaultValues,
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'features' })
  const { fields: fieldsEn, append: appendEn, remove: removeEn } = useFieldArray({ control, name: 'featuresEn' as 'features' })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Tên gói (VI) *</Label>
          <Input {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5"><Label>Tên gói (EN)</Label><Input {...register('nameEn')} placeholder="English name" /></div>
        <div className="space-y-1.5"><Label>Currency</Label><Input {...register('currency')} /></div>
        <div className="space-y-1.5"><Label>Giá tháng</Label><Input type="number" {...register('monthlyPrice')} placeholder="Để trống nếu không có" /></div>
        <div className="space-y-1.5"><Label>Giá năm</Label><Input type="number" {...register('yearlyPrice')} placeholder="Để trống nếu không có" /></div>
        <div className="space-y-1.5"><Label>Badge (VI)</Label><Input {...register('badge')} placeholder="Phổ biến" /></div>
        <div className="space-y-1.5"><Label>Badge (EN)</Label><Input {...register('badgeEn')} placeholder="Popular" /></div>
        <div className="space-y-1.5"><Label>Thứ tự</Label><Input type="number" {...register('sortOrder')} /></div>
        <div className="space-y-1.5">
          <Label>CTA Text (VI) *</Label>
          <Input {...register('ctaText')} />
          {errors.ctaText && <p className="text-xs text-destructive">{errors.ctaText.message}</p>}
        </div>
        <div className="space-y-1.5"><Label>CTA Text (EN)</Label><Input {...register('ctaTextEn')} placeholder="English CTA" /></div>
        <div className="space-y-1.5"><Label>CTA URL</Label><Input {...register('ctaUrl')} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Mô tả (VI)</Label>
          <Textarea rows={2} {...register('description')} />
        </div>
        <div className="space-y-1.5">
          <Label>Mô tả (EN)</Label>
          <Textarea rows={2} {...register('descriptionEn')} placeholder="English description" />
        </div>
      </div>
      {!isCreate && (
        <label className="flex items-center gap-2 text-sm">
          <Controller name="isActive" control={control} render={({ field }) => (
            <input type="checkbox" className="h-4 w-4" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
          Kích hoạt
        </label>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tính năng VI (features)</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => append({ text: '', included: true })}>
            <Plus className="h-3.5 w-3.5 mr-1" />Thêm
          </Button>
        </div>
        {fields.map((field, idx) => (
          <div key={field.id} className="flex items-center gap-2">
            <Controller name={`features.${idx}.included`} control={control} render={({ field: f }) => (
              <input type="checkbox" className="h-4 w-4 shrink-0" checked={f.value} onChange={(e) => f.onChange(e.target.checked)} />
            )} />
            <Input className="flex-1" {...register(`features.${idx}.text`)} placeholder="Mô tả tính năng..." />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tính năng EN (featuresEn)</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => appendEn({ text: '', included: true })}>
            <Plus className="h-3.5 w-3.5 mr-1" />Thêm
          </Button>
        </div>
        {fieldsEn.map((field, idx) => (
          <div key={field.id} className="flex items-center gap-2">
            <Controller name={`featuresEn.${idx}.included` as `features.${number}.included`} control={control} render={({ field: f }) => (
              <input type="checkbox" className="h-4 w-4 shrink-0" checked={f.value} onChange={(e) => f.onChange(e.target.checked)} />
            )} />
            <Input className="flex-1" {...register(`featuresEn.${idx}.text` as `features.${number}.text`)} placeholder="Feature description..." />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeEn(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>
      </div>
    </form>
  )
}

// ─── Plan Property Values Editor ──────────────────────────────────────────────

type LocalPropValue = { boolValue: boolean | null; numberValue: number | null; textValue: string | null; textValueEn: string | null }

function PlanPropertiesEditor({ planId, onClose }: { planId: string; onClose: () => void }) {
  const qc = useQueryClient()
  const [localValues, setLocalValues] = useState<Record<string, LocalPropValue>>({})

  const { data: props = [], isLoading } = useQuery({
    queryKey: ['pricing-plan-properties', planId],
    queryFn: () => apiClient.get<PricingPlanPropertyValueDto[]>(`/pricing/${planId}/properties`).then((r) => r.data),
  })

  // Initialize local values when data loads (only once)
  useEffect(() => {
    if (props.length > 0 && Object.keys(localValues).length === 0) {
      const init: Record<string, LocalPropValue> = {}
      props.forEach((p) => {
        init[p.propertyId] = { boolValue: p.boolValue, numberValue: p.numberValue, textValue: p.textValue, textValueEn: p.textValueEn }
      })
      setLocalValues(init)
    }
  }, [props]) // eslint-disable-line react-hooks/exhaustive-deps

  const saveMutation = useMutation({
    mutationFn: () =>
      apiClient.put(`/pricing/${planId}/properties`, {
        values: Object.entries(localValues).map(([propertyId, v]) => ({ propertyId, ...v })),
      }),
    onSuccess: () => {
      toast.success('Đã lưu giá trị properties!')
      qc.invalidateQueries({ queryKey: ['pricing'] })
      qc.invalidateQueries({ queryKey: ['pricing-plan-properties', planId] })
      onClose()
    },
    onError: () => toast.error('Lưu thất bại.'),
  })

  if (isLoading) return <div className="py-6 text-center text-muted-foreground text-sm"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Đang tải properties...</div>

  if (props.length === 0) return <p className="py-4 text-sm text-muted-foreground">Chưa có property definition nào. Hãy tạo ở tab <strong>Property Definitions</strong>.</p>

  const groups = props.reduce<Record<string, PricingPlanPropertyValueDto[]>>((acc, p) => {
    const g = p.group ?? 'Khác'
    if (!acc[g]) acc[g] = []
    ;(acc[g] as PricingPlanPropertyValueDto[]).push(p)
    return acc
  }, {})

  function updateVal(propertyId: string, field: keyof LocalPropValue, value: boolean | number | string | null) {
    setLocalValues((prev) => ({
      ...prev,
      [propertyId]: { ...prev[propertyId], [field]: value } as LocalPropValue,
    }))
  }

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, groupProps]) => (
        <div key={group}>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">{group}</p>
          <div className="space-y-2">
            {groupProps.map((p) => {
              const current = localValues[p.propertyId] ?? { boolValue: null, numberValue: null, textValue: null, textValueEn: null }
              return (
                <div key={p.propertyId} className="flex items-center gap-3">
                  <span className="flex-1 text-sm">{p.displayName}{p.unit ? ` (${p.unit})` : ''}</span>
                  {p.valueType === 0 && (
                    <select
                      className="border rounded px-2 py-1 text-sm w-28"
                      value={current.boolValue === null ? '' : current.boolValue ? 'true' : 'false'}
                      onChange={(e) =>
                        updateVal(p.propertyId, 'boolValue', e.target.value === '' ? null : e.target.value === 'true')
                      }
                    >
                      <option value="">— chưa set —</option>
                      <option value="true">Có</option>
                      <option value="false">Không</option>
                    </select>
                  )}
                  {p.valueType === 1 && (
                    <Input
                      type="number"
                      className="w-28 h-8 text-sm"
                      placeholder="chưa set"
                      value={current.numberValue ?? ''}
                      onChange={(e) =>
                        updateVal(p.propertyId, 'numberValue', e.target.value === '' ? null : Number(e.target.value))
                      }
                    />
                  )}
                  {p.valueType === 2 && (
                    <div className="flex gap-2">
                      <Input
                        className="w-36 h-8 text-sm"
                        placeholder="VI"
                        value={current.textValue ?? ''}
                        onChange={(e) => updateVal(p.propertyId, 'textValue', e.target.value || null)}
                      />
                      <Input
                        className="w-36 h-8 text-sm"
                        placeholder="EN"
                        value={current.textValueEn ?? ''}
                        onChange={(e) => updateVal(p.propertyId, 'textValueEn', e.target.value || null)}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ))}
      <div className="flex gap-2 pt-2 border-t">
        <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Lưu
        </Button>
        <Button size="sm" variant="outline" onClick={onClose}>Đóng</Button>
      </div>
    </div>
  )
}

// ─── Property Definition Form ─────────────────────────────────────────────────

const defSchema = z.object({
  key: z.string().min(1, 'Bắt buộc').regex(/^[a-z0-9_]+$/, 'Chỉ dùng a-z, 0-9, _'),
  displayName: z.string().min(1, 'Bắt buộc'),
  displayNameEn: z.string().optional().nullable(),
  valueType: z.coerce.number().int().min(0).max(2) as z.ZodType<0 | 1 | 2>,
  unit: z.string().optional().nullable(),
  unitEn: z.string().optional().nullable(),
  group: z.string().optional().nullable(),
  groupEn: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean().optional(),
})
type DefFormValues = z.infer<typeof defSchema>

function DefinitionForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
  isEdit = false,
}: {
  defaultValues: Partial<DefFormValues>
  onSubmit: (d: DefFormValues) => void
  isPending: boolean
  onCancel: () => void
  isEdit?: boolean
}) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<DefFormValues>({
    resolver: zodResolver(defSchema),
    defaultValues: { valueType: 1, sortOrder: 0, isActive: true, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Key * <span className="text-muted-foreground text-xs">(snake_case)</span></Label>
          <Input {...register('key')} placeholder="max_users" disabled={isEdit} />
          {errors.key && <p className="text-xs text-destructive">{errors.key.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Display Name (VI) *</Label>
          <Input {...register('displayName')} />
          {errors.displayName && <p className="text-xs text-destructive">{errors.displayName.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Display Name (EN)</Label>
          <Input {...register('displayNameEn')} placeholder="English name" />
        </div>
        <div className="space-y-1.5">
          <Label>Value Type *</Label>
          <Controller name="valueType" control={control} render={({ field }) => (
            <select {...field} className="w-full border rounded px-3 py-2 text-sm">
              <option value={0}>Boolean (Có/Không)</option>
              <option value={1}>Number (Số)</option>
              <option value={2}>Text (Văn bản)</option>
            </select>
          )} />
        </div>
        <div className="space-y-1.5"><Label>Unit (VI)</Label><Input {...register('unit')} placeholder="GB, người, lượt..." /></div>
        <div className="space-y-1.5"><Label>Unit (EN)</Label><Input {...register('unitEn')} placeholder="GB, users, calls..." /></div>
        <div className="space-y-1.5"><Label>Group (VI)</Label><Input {...register('group')} placeholder="Giới hạn, Tính năng..." /></div>
        <div className="space-y-1.5"><Label>Group (EN)</Label><Input {...register('groupEn')} placeholder="Limits, Features..." /></div>
        <div className="space-y-1.5"><Label>Sort Order</Label><Input type="number" {...register('sortOrder')} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Mô tả nội bộ (VI)</Label>
          <Textarea rows={2} {...register('description')} />
        </div>
        <div className="space-y-1.5">
          <Label>Mô tả nội bộ (EN)</Label>
          <Textarea rows={2} {...register('descriptionEn')} placeholder="English description" />
        </div>
      </div>
      {isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <Controller name="isActive" control={control} render={({ field }) => (
            <input type="checkbox" className="h-4 w-4" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
          Kích hoạt
        </label>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />}Lưu</Button>
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>Hủy</Button>
      </div>
    </form>
  )
}

// ─── Add-on Form ──────────────────────────────────────────────────────────────

const addonSchema = z.object({
  key: z.string().min(1, 'Bắt buộc').regex(/^[a-z0-9_]+$/, 'Chỉ dùng a-z, 0-9, _'),
  name: z.string().min(1, 'Bắt buộc'),
  nameEn: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  categoryEn: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  descriptionEn: z.string().optional().nullable(),
  iconUrl: z.string().optional().nullable(),
  monthlyPrice: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).nullable()),
  yearlyPrice: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).nullable()),
  currency: z.string().default('VND'),
  features: z.array(featureSchema),
  featuresEn: z.array(featureSchema).optional().nullable(),
  badge: z.string().optional().nullable(),
  badgeEn: z.string().optional().nullable(),
  ctaText: z.string().min(1, 'Bắt buộc'),
  ctaTextEn: z.string().optional().nullable(),
  ctaUrl: z.string().optional().nullable(),
  sortOrder: z.coerce.number().int().min(0),
  isActive: z.boolean(),
})
type AddonFormValues = z.infer<typeof addonSchema>

function AddonForm({
  defaultValues,
  onSubmit,
  isPending,
  onCancel,
  isCreate = false,
}: {
  defaultValues: Partial<AddonFormValues>
  onSubmit: (d: AddonFormValues) => void
  isPending: boolean
  onCancel: () => void
  isCreate?: boolean
}) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<AddonFormValues>({
    resolver: zodResolver(addonSchema),
    defaultValues: {
      features: [],
      featuresEn: [],
      sortOrder: 0,
      isActive: true,
      currency: 'VND',
      monthlyPrice: null,
      yearlyPrice: null,
      ...defaultValues,
    },
  })
  const { fields, append, remove } = useFieldArray({ control, name: 'features' })
  const { fields: fieldsEn, append: appendEn, remove: removeEn } = useFieldArray({ control, name: 'featuresEn' as 'features' })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Key * <span className="text-muted-foreground text-xs">(snake_case)</span></Label>
          <Input {...register('key')} placeholder="accounting" disabled={!isCreate} />
          {errors.key && <p className="text-xs text-destructive">{errors.key.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label>Tên (VI) *</Label>
          <Input {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-1.5"><Label>Tên (EN)</Label><Input {...register('nameEn')} placeholder="English name" /></div>
        <div className="space-y-1.5"><Label>Category (VI)</Label><Input {...register('category')} placeholder="Tài chính" /></div>
        <div className="space-y-1.5"><Label>Category (EN)</Label><Input {...register('categoryEn')} placeholder="Finance" /></div>
        <div className="space-y-1.5"><Label>Icon URL</Label><Input {...register('iconUrl')} placeholder="https://..." /></div>
        <div className="space-y-1.5"><Label>Currency</Label><Input {...register('currency')} /></div>
        <div className="space-y-1.5"><Label>Giá tháng</Label><Input type="number" {...register('monthlyPrice')} placeholder="Để trống nếu không có" /></div>
        <div className="space-y-1.5"><Label>Giá năm</Label><Input type="number" {...register('yearlyPrice')} placeholder="Để trống nếu không có" /></div>
        <div className="space-y-1.5"><Label>Badge (VI)</Label><Input {...register('badge')} placeholder="Phổ biến" /></div>
        <div className="space-y-1.5"><Label>Badge (EN)</Label><Input {...register('badgeEn')} placeholder="Popular" /></div>
        <div className="space-y-1.5"><Label>Thứ tự</Label><Input type="number" {...register('sortOrder')} /></div>
        <div className="space-y-1.5">
          <Label>CTA Text (VI) *</Label>
          <Input {...register('ctaText')} />
          {errors.ctaText && <p className="text-xs text-destructive">{errors.ctaText.message}</p>}
        </div>
        <div className="space-y-1.5"><Label>CTA Text (EN)</Label><Input {...register('ctaTextEn')} placeholder="English CTA" /></div>
        <div className="space-y-1.5"><Label>CTA URL</Label><Input {...register('ctaUrl')} /></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Mô tả (VI)</Label>
          <Textarea rows={2} {...register('description')} />
        </div>
        <div className="space-y-1.5">
          <Label>Mô tả (EN)</Label>
          <Textarea rows={2} {...register('descriptionEn')} placeholder="English description" />
        </div>
      </div>
      {!isCreate && (
        <label className="flex items-center gap-2 text-sm">
          <Controller name="isActive" control={control} render={({ field }) => (
            <input type="checkbox" className="h-4 w-4" checked={!!field.value} onChange={(e) => field.onChange(e.target.checked)} />
          )} />
          Kích hoạt
        </label>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tính năng VI (features)</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => append({ text: '', included: true })}>
            <Plus className="h-3.5 w-3.5 mr-1" />Thêm
          </Button>
        </div>
        {fields.map((field, idx) => (
          <div key={field.id} className="flex items-center gap-2">
            <Controller name={`features.${idx}.included`} control={control} render={({ field: f }) => (
              <input type="checkbox" className="h-4 w-4 shrink-0" checked={f.value} onChange={(e) => f.onChange(e.target.checked)} />
            )} />
            <Input className="flex-1" {...register(`features.${idx}.text`)} placeholder="Mô tả tính năng..." />
            <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Tính năng EN (featuresEn)</Label>
          <Button type="button" size="sm" variant="outline" onClick={() => appendEn({ text: '', included: true })}>
            <Plus className="h-3.5 w-3.5 mr-1" />Thêm
          </Button>
        </div>
        {fieldsEn.map((field, idx) => (
          <div key={field.id} className="flex items-center gap-2">
            <Controller name={`featuresEn.${idx}.included` as `features.${number}.included`} control={control} render={({ field: f }) => (
              <input type="checkbox" className="h-4 w-4 shrink-0" checked={f.value} onChange={(e) => f.onChange(e.target.checked)} />
            )} />
            <Input className="flex-1" {...register(`featuresEn.${idx}.text` as `features.${number}.text`)} placeholder="Feature description..." />
            <Button type="button" variant="ghost" size="icon" onClick={() => removeEn(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>{isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Lưu</Button>
        <Button type="button" variant="outline" onClick={onCancel}>Hủy</Button>
      </div>
    </form>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type ActiveTab = 'plans' | 'definitions' | 'addons'

export function PricingPage() {
  const qc = useQueryClient()
  const [tab, setTab] = useState<ActiveTab>('plans')

  // Plans state
  const [editPlanId, setEditPlanId] = useState<string | null>(null)
  const [showCreatePlan, setShowCreatePlan] = useState(false)
  const [propsEditorPlanId, setPropsEditorPlanId] = useState<string | null>(null)

  // Definitions state
  const [editDefId, setEditDefId] = useState<string | null>(null)
  const [showCreateDef, setShowCreateDef] = useState(false)

  // Addons state
  const [editAddonId, setEditAddonId] = useState<string | null>(null)
  const [showCreateAddon, setShowCreateAddon] = useState(false)

  // ─── Plans queries/mutations ────────────────────────────────────────────────
  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['pricing'],
    queryFn: () => apiClient.get<PricingPlanDto[]>('/pricing').then((r) => r.data),
  })

  const createPlanMutation = useMutation({
    mutationFn: (d: PlanFormValues) => apiClient.post('/pricing', d).then((r) => r.data),
    onSuccess: () => { toast.success('Tạo gói thành công!'); qc.invalidateQueries({ queryKey: ['pricing'] }); setShowCreatePlan(false) },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: PlanFormValues }) => apiClient.put(`/pricing/${id}`, data).then((r) => r.data),
    onSuccess: () => { toast.success('Cập nhật thành công!'); qc.invalidateQueries({ queryKey: ['pricing'] }); setEditPlanId(null) },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const deletePlanMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pricing/${id}`),
    onSuccess: () => { toast.success('Đã xóa gói.'); qc.invalidateQueries({ queryKey: ['pricing'] }) },
    onError: () => toast.error('Không thể xóa.'),
  })

  // ─── Definitions queries/mutations ─────────────────────────────────────────
  const { data: definitions = [], isLoading: defsLoading } = useQuery({
    queryKey: ['pricing-definitions'],
    queryFn: () => apiClient.get<PricingPropertyDefinitionDto[]>('/pricing/property-definitions').then((r) => r.data),
  })

  const createDefMutation = useMutation({
    mutationFn: (d: DefFormValues) => apiClient.post('/pricing/property-definitions', d).then((r) => r.data),
    onSuccess: () => { toast.success('Tạo property thành công!'); qc.invalidateQueries({ queryKey: ['pricing-definitions'] }); setShowCreateDef(false) },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const updateDefMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: DefFormValues }) =>
      apiClient.put(`/pricing/property-definitions/${id}`, data).then((r) => r.data),
    onSuccess: () => { toast.success('Cập nhật thành công!'); qc.invalidateQueries({ queryKey: ['pricing-definitions'] }); setEditDefId(null) },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const deleteDefMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pricing/property-definitions/${id}`),
    onSuccess: () => { toast.success('Đã xóa property.'); qc.invalidateQueries({ queryKey: ['pricing-definitions'] }) },
    onError: () => toast.error('Không thể xóa.'),
  })

  // ─── Add-ons queries/mutations ──────────────────────────────────────────────
  const { data: addonsList = [], isLoading: addonsLoading } = useQuery({
    queryKey: ['pricing-addons'],
    queryFn: () => apiClient.get<PricingAddonDto[]>('/pricing/addons').then((r) => r.data),
  })

  const createAddonMutation = useMutation({
    mutationFn: (d: AddonFormValues) => apiClient.post('/pricing/addons', d).then((r) => r.data),
    onSuccess: () => { toast.success('Tạo add-on thành công!'); qc.invalidateQueries({ queryKey: ['pricing-addons'] }); setShowCreateAddon(false) },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const updateAddonMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: AddonFormValues }) => apiClient.put(`/pricing/addons/${id}`, data).then((r) => r.data),
    onSuccess: () => { toast.success('Cập nhật thành công!'); qc.invalidateQueries({ queryKey: ['pricing-addons'] }); setEditAddonId(null) },
    onError: () => toast.error('Có lỗi xảy ra.'),
  })

  const deleteAddonMutation = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/pricing/addons/${id}`),
    onSuccess: () => { toast.success('Đã xóa add-on.'); qc.invalidateQueries({ queryKey: ['pricing-addons'] }) },
    onError: () => toast.error('Không thể xóa.'),
  })

  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-4 max-w-4xl">
      <h1 className="text-2xl font-bold">Bảng giá</h1>

      {/* Tab bar */}
      <div className="flex border-b gap-1">
        {(['plans', 'definitions', 'addons'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              tab === t ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t === 'plans' ? 'Gói dịch vụ' : t === 'definitions' ? 'Property Definitions' : 'Add-ons'}
          </button>
        ))}
      </div>

      {/* ─── Plans tab ─────────────────────────────────────────────────────────── */}
      {tab === 'plans' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowCreatePlan(true); setEditPlanId(null) }} disabled={showCreatePlan}>
              <Plus className="h-4 w-4 mr-1" />Tạo gói mới
            </Button>
          </div>

          {showCreatePlan && (
            <div className="border rounded-lg p-5 bg-muted/10">
              <h3 className="font-semibold mb-4">Gói mới</h3>
              <PlanForm
                isCreate
                defaultValues={{}}
                onSubmit={(d) => createPlanMutation.mutate(d)}
                isPending={createPlanMutation.isPending}
                onCancel={() => setShowCreatePlan(false)}
              />
            </div>
          )}

          {plansLoading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Đang tải...</div>
          ) : sortedPlans.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Chưa có gói nào.</p>
          ) : (
            <div className="space-y-3">
              {sortedPlans.map((plan) => (
                <div key={plan.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{plan.name}</span>
                      {plan.badge && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{plan.badge}</span>}
                      {!plan.isActive && <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">Inactive</span>}
                      <span className="text-xs text-muted-foreground">
                        {plan.properties.length} properties · #{plan.sortOrder}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPropsEditorPlanId(propsEditorPlanId === plan.id ? null : plan.id)}
                      >
                        <Settings2 className="h-3.5 w-3.5 mr-1" />
                        Properties
                        {propsEditorPlanId === plan.id ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setEditPlanId(editPlanId === plan.id ? null : plan.id); setPropsEditorPlanId(null) }}
                      >
                        {editPlanId === plan.id ? 'Thu gọn' : 'Sửa'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { if (confirm(`Xóa gói "${plan.name}"?`)) deletePlanMutation.mutate(plan.id) }}
                        disabled={deletePlanMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>

                  {propsEditorPlanId === plan.id && (
                    <div className="p-5 border-t bg-muted/5">
                      <h4 className="font-medium text-sm mb-3">Giá trị Properties cho "{plan.name}"</h4>
                      <PlanPropertiesEditor planId={plan.id} onClose={() => setPropsEditorPlanId(null)} />
                    </div>
                  )}

                  {editPlanId === plan.id && (
                    <div className="p-5 border-t">
                      <PlanForm
                        defaultValues={{
                          ...plan,
                          features: (plan.features as { text: string; included: boolean }[]) ?? [],
                          featuresEn: (plan.featuresEn as { text: string; included: boolean }[] | null) ?? [],
                        }}
                        onSubmit={(d) => updatePlanMutation.mutate({ id: plan.id, data: d })}
                        isPending={updatePlanMutation.isPending}
                        onCancel={() => setEditPlanId(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── Property Definitions tab ───────────────────────────────────────────── */}
      {tab === 'definitions' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowCreateDef(true); setEditDefId(null) }} disabled={showCreateDef}>
              <Plus className="h-4 w-4 mr-1" />Thêm Property
            </Button>
          </div>

          {showCreateDef && (
            <div className="border rounded-lg p-5 bg-muted/10">
              <h3 className="font-semibold mb-4">Property mới</h3>
              <DefinitionForm
                defaultValues={{}}
                onSubmit={(d) => createDefMutation.mutate(d)}
                isPending={createDefMutation.isPending}
                onCancel={() => setShowCreateDef(false)}
              />
            </div>
          )}

          {defsLoading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Đang tải...</div>
          ) : definitions.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Chưa có property nào.</p>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium">Key</th>
                    <th className="text-left px-4 py-3 font-medium">Tên</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Group</th>
                    <th className="text-left px-4 py-3 font-medium">Unit</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {definitions.map((def) => (
                    <>
                      <tr key={def.id} className="hover:bg-muted/30">
                        <td className="px-4 py-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{def.key}</code></td>
                        <td className="px-4 py-3 font-medium">{def.displayName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{VALUE_TYPE_LABELS[def.valueType]}</td>
                        <td className="px-4 py-3 text-muted-foreground">{def.group ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{def.unit ?? '—'}</td>
                        <td className="px-4 py-3">
                          {def.isActive
                            ? <span className="text-xs text-green-600 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">Active</span>
                            : <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">Inactive</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="outline" onClick={() => setEditDefId(editDefId === def.id ? null : def.id)}>
                              {editDefId === def.id ? 'Thu gọn' : 'Sửa'}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { if (confirm(`Xóa property "${def.key}"? Sẽ xóa tất cả giá trị trên mọi plan.`)) deleteDefMutation.mutate(def.id) }}
                              disabled={deleteDefMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {editDefId === def.id && (
                        <tr key={`${def.id}-edit`}>
                          <td colSpan={7} className="px-4 py-4 bg-muted/10 border-t">
                            <DefinitionForm
                              isEdit
                              defaultValues={{ key: def.key, displayName: def.displayName, displayNameEn: def.displayNameEn, valueType: def.valueType, unit: def.unit, unitEn: def.unitEn, group: def.group, groupEn: def.groupEn, description: def.description, descriptionEn: def.descriptionEn, sortOrder: def.sortOrder, isActive: def.isActive }}
                              onSubmit={(d) => updateDefMutation.mutate({ id: def.id, data: d })}
                              isPending={updateDefMutation.isPending}
                              onCancel={() => setEditDefId(null)}
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─── Add-ons tab ───────────────────────────────────────────────────────── */}
      {tab === 'addons' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setShowCreateAddon(true); setEditAddonId(null) }} disabled={showCreateAddon}>
              <Plus className="h-4 w-4 mr-1" />Tạo Add-on
            </Button>
          </div>

          {showCreateAddon && (
            <div className="border rounded-lg p-5 bg-muted/10">
              <h3 className="font-semibold mb-4">Add-on mới</h3>
              <AddonForm
                isCreate
                defaultValues={{}}
                onSubmit={(d) => createAddonMutation.mutate(d)}
                isPending={createAddonMutation.isPending}
                onCancel={() => setShowCreateAddon(false)}
              />
            </div>
          )}

          {addonsLoading ? (
            <div className="py-10 text-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin inline mr-2" />Đang tải...</div>
          ) : addonsList.length === 0 ? (
            <p className="py-10 text-center text-muted-foreground">Chưa có add-on nào.</p>
          ) : (
            <div className="space-y-3">
              {[...addonsList].sort((a, b) => a.sortOrder - b.sortOrder).map((addon) => (
                <div key={addon.id} className="border rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-muted/20">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold">{addon.name}</span>
                      {addon.badge && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{addon.badge}</span>}
                      {addon.category && <span className="text-xs text-muted-foreground">{addon.category}</span>}
                      {!addon.isActive && <span className="text-xs text-muted-foreground border rounded px-1.5 py-0.5">Inactive</span>}
                      <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{addon.key}</code>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditAddonId(editAddonId === addon.id ? null : addon.id)}
                      >
                        {editAddonId === addon.id ? 'Thu gọn' : 'Sửa'}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => { if (confirm(`Xóa add-on "${addon.name}"?`)) deleteAddonMutation.mutate(addon.id) }}
                        disabled={deleteAddonMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </div>
                  {editAddonId === addon.id && (
                    <div className="p-5 border-t">
                      <AddonForm
                        defaultValues={{
                          ...addon,
                          features: (addon.features as { text: string; included: boolean }[]) ?? [],
                          featuresEn: (addon.featuresEn as { text: string; included: boolean }[] | null) ?? [],
                        }}
                        onSubmit={(d) => updateAddonMutation.mutate({ id: addon.id, data: d })}
                        isPending={updateAddonMutation.isPending}
                        onCancel={() => setEditAddonId(null)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
