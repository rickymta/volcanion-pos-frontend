import type { FaqDto } from '@/types'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

interface FaqListProps {
  faqs: FaqDto[]
}

export function FaqList({ faqs }: FaqListProps) {
  const active = faqs.filter((f) => f.isActive).sort((a, b) => a.sortOrder - b.sortOrder)

  if (active.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">Chưa có câu hỏi nào.</p>
    )
  }

  // Group by category
  const groups = active.reduce<Record<string, FaqDto[]>>((acc, faq) => {
    const cat = faq.category ?? 'Chung'
    ;(acc[cat] ??= []).push(faq)
    return acc
  }, {})

  const categoryKeys = Object.keys(groups)

  return (
    <div className="space-y-8">
      {categoryKeys.map((category) => (
        <div key={category}>
          {categoryKeys.length > 1 && (
            <h3 className="text-lg font-semibold mb-4 text-primary">{category}</h3>
          )}
          <Accordion type="single" collapsible className="space-y-2">
            {groups[category].map((faq) => (
              <AccordionItem
                key={faq.id}
                value={faq.id}
                className="border rounded-lg px-4"
              >
                <AccordionTrigger className="text-left text-sm font-medium py-4 hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ))}
    </div>
  )
}
