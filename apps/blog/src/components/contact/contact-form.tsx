'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const contactSchema = z.object({
  fullName: z.string().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional(),
  type: z.enum(['General', 'Sales', 'Support', 'Partnership']),
  subject: z.string().optional(),
  message: z.string().min(10, 'Tin nhắn phải có ít nhất 10 ký tự'),
})

type ContactFormValues = z.infer<typeof contactSchema>

const CONTACT_TYPES = [
  { value: 'General', label: 'Câu hỏi chung' },
  { value: 'Sales', label: 'Tư vấn mua hàng' },
  { value: 'Support', label: 'Hỗ trợ kỹ thuật' },
  { value: 'Partnership', label: 'Hợp tác' },
] as const

export function ContactForm() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: { type: 'General' },
  })

  const selectedType = watch('type')

  async function onSubmit(data: ContactFormValues) {
    setStatus('loading')
    setErrorMessage('')
    try {
      const res = await fetch('/api/cms/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.title ?? `Lỗi ${res.status}`)
      }
      setStatus('success')
      reset()
    } catch (err) {
      setStatus('error')
      setErrorMessage(err instanceof Error ? err.message : 'Có lỗi xảy ra, vui lòng thử lại.')
    }
  }

  if (status === 'success') {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <h3 className="text-xl font-semibold">Gửi thành công!</h3>
        <p className="text-muted-foreground text-sm">
          Chúng tôi đã nhận được yêu cầu của bạn và sẽ phản hồi trong 24 giờ.
        </p>
        <Button variant="outline" onClick={() => setStatus('idle')}>
          Gửi yêu cầu khác
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Name & Email */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="fullName">Họ và tên *</Label>
          <Input
            id="fullName"
            placeholder="Nguyễn Văn A"
            {...register('fullName')}
            aria-invalid={!!errors.fullName}
          />
          {errors.fullName && (
            <p className="text-xs text-destructive">{errors.fullName.message}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            placeholder="example@email.com"
            {...register('email')}
            aria-invalid={!!errors.email}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      {/* Phone & Type */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="phone">Số điện thoại</Label>
          <Input id="phone" type="tel" placeholder="0901 234 567" {...register('phone')} />
        </div>
        <div className="space-y-1.5">
          <Label>Loại yêu cầu *</Label>
          <Select
            value={selectedType}
            onValueChange={(v) => setValue('type', v as ContactFormValues['type'])}
          >
            <SelectTrigger>
              <SelectValue placeholder="Chọn loại yêu cầu" />
            </SelectTrigger>
            <SelectContent>
              {CONTACT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Subject */}
      <div className="space-y-1.5">
        <Label htmlFor="subject">Tiêu đề</Label>
        <Input id="subject" placeholder="Tôi muốn hỏi về..." {...register('subject')} />
      </div>

      {/* Message */}
      <div className="space-y-1.5">
        <Label htmlFor="message">Nội dung *</Label>
        <Textarea
          id="message"
          rows={5}
          placeholder="Mô tả chi tiết yêu cầu của bạn..."
          {...register('message')}
          aria-invalid={!!errors.message}
        />
        {errors.message && (
          <p className="text-xs text-destructive">{errors.message.message}</p>
        )}
      </div>

      {/* Error */}
      {status === 'error' && (
        <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {errorMessage}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={status === 'loading'}>
        {status === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Gửi yêu cầu
      </Button>
    </form>
  )
}
