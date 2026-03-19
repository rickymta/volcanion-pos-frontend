import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import apiClient from '@/lib/api-client'
import type { SiteSettingDto, UpdateSettingDto } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Loader2, Save } from 'lucide-react'

type DraftMap = Record<string, string>

export function SettingsPage() {
  const qc = useQueryClient()
  const [drafts, setDrafts] = useState<DraftMap>({})

  const { data: settings, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get<SiteSettingDto[]>('/settings').then((r) => r.data),
  })

  useEffect(() => {
    if (settings) {
      const initial: DraftMap = {}
      settings.forEach((s) => { initial[s.key] = s.valueJson })
      setDrafts(initial)
    }
  }, [settings])

  const saveMutation = useMutation({
    mutationFn: (updates: UpdateSettingDto[]) => apiClient.put('/settings/batch', { settings: updates }).then((r) => r.data),
    onSuccess: () => {
      toast.success('Lưu cài đặt thành công!')
      qc.invalidateQueries({ queryKey: ['settings'] })
    },
    onError: () => toast.error('Có lỗi khi lưu.'),
  })

  function handleSaveGroup(groupSettings: SiteSettingDto[]) {
    const updates: UpdateSettingDto[] = groupSettings.map((s) => ({ key: s.key, valueJson: drafts[s.key] ?? s.valueJson }))
    saveMutation.mutate(updates)
  }

  function renderInput(setting: SiteSettingDto) {
    const value = drafts[setting.key] ?? setting.valueJson
    const onChange = (val: string) => setDrafts((prev) => ({ ...prev, [setting.key]: val }))

    // Long text: textarea
    if (value.length > 80 || setting.key.toLowerCase().includes('description') || setting.key.toLowerCase().includes('address')) {
      return <Textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-xs" />
    }

    return <Input value={value} onChange={(e) => onChange(e.target.value)} className="font-mono text-sm" />
  }

  if (isLoading) return <div className="py-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>

  // Group by setting.group
  const groups = settings?.reduce<Record<string, SiteSettingDto[]>>((acc, s) => {
    const key = s.group ?? 'General'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {}) ?? {}

  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="text-2xl font-bold">Cài đặt trang web</h1>

      {Object.entries(groups).map(([group, groupSettings]) => (
        <div key={group} className="border rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3 bg-muted/20 border-b">
            <h3 className="font-semibold capitalize">{group}</h3>
            <Button
              size="sm"
              disabled={saveMutation.isPending}
              onClick={() => handleSaveGroup(groupSettings)}
            >
              {saveMutation.isPending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-2 h-3.5 w-3.5" />}
              Lưu nhóm
            </Button>
          </div>
          <div className="p-5 space-y-4">
            {groupSettings.map((setting) => (
              <div key={setting.key} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <Label className="font-medium">{setting.key}</Label>
                  {setting.key && <span className="text-xs text-muted-foreground font-mono">{setting.valueJson.substring(0, 40)}</span>}
                </div>
                {renderInput(setting)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
