import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import {
  Bold, Italic, Strikethrough, Code, List, ListOrdered,
  Heading2, Heading3, Link as LinkIcon, Image as ImageIcon,
  Undo, Redo, Quote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useEffect } from 'react'

interface RichEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

export function RichEditor({ value, onChange, placeholder = 'Viết nội dung tại đây...' }: RichEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
      Image,
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // Sync external value changes (e.g. initial load)
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  if (!editor) return null

  const toolbarBtn = (active: boolean, onClick: () => void, children: React.ReactNode, title: string) => (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn('h-8 w-8', active && 'bg-accent text-accent-foreground')}
      onClick={onClick}
      title={title}
    >
      {children}
    </Button>
  )

  return (
    <div className="border rounded-md overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b p-1.5 bg-muted/40">
        {toolbarBtn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), <Bold className="h-3.5 w-3.5" />, 'Bold')}
        {toolbarBtn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), <Italic className="h-3.5 w-3.5" />, 'Italic')}
        {toolbarBtn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), <Strikethrough className="h-3.5 w-3.5" />, 'Strike')}
        {toolbarBtn(editor.isActive('code'), () => editor.chain().focus().toggleCode().run(), <Code className="h-3.5 w-3.5" />, 'Code')}
        <div className="w-px h-5 bg-border mx-1" />
        {toolbarBtn(editor.isActive('heading', { level: 2 }), () => editor.chain().focus().toggleHeading({ level: 2 }).run(), <Heading2 className="h-3.5 w-3.5" />, 'H2')}
        {toolbarBtn(editor.isActive('heading', { level: 3 }), () => editor.chain().focus().toggleHeading({ level: 3 }).run(), <Heading3 className="h-3.5 w-3.5" />, 'H3')}
        {toolbarBtn(editor.isActive('blockquote'), () => editor.chain().focus().toggleBlockquote().run(), <Quote className="h-3.5 w-3.5" />, 'Blockquote')}
        <div className="w-px h-5 bg-border mx-1" />
        {toolbarBtn(editor.isActive('bulletList'), () => editor.chain().focus().toggleBulletList().run(), <List className="h-3.5 w-3.5" />, 'Bullet list')}
        {toolbarBtn(editor.isActive('orderedList'), () => editor.chain().focus().toggleOrderedList().run(), <ListOrdered className="h-3.5 w-3.5" />, 'Ordered list')}
        <div className="w-px h-5 bg-border mx-1" />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            const url = window.prompt('Nhập URL:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
          title="Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => {
            const url = window.prompt('Nhập URL ảnh:')
            if (url) editor.chain().focus().setImage({ src: url }).run()
          }}
          title="Image"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </Button>
        <div className="w-px h-5 bg-border mx-1" />
        {toolbarBtn(false, () => editor.chain().focus().undo().run(), <Undo className="h-3.5 w-3.5" />, 'Undo')}
        {toolbarBtn(false, () => editor.chain().focus().redo().run(), <Redo className="h-3.5 w-3.5" />, 'Redo')}
      </div>
      {/* Content */}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[300px] focus-visible:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  )
}
